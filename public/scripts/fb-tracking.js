/**
 * Facebook tracking pre-checkout bridge — pixel + CAPI deduplication.
 *
 * Why this exists
 * ----------------
 * Facebook recommends sending Purchase events from BOTH the browser pixel
 * AND the server-side Conversions API (CAPI), then deduplicating them via
 * a shared `event_id`. Browser pixel gives the freshest match signals
 * (fbp cookie just set, exact click context), CAPI gives reliability
 * (immune to ad blockers and iOS Safari ITP). Together, deduplicated, FB
 * gets the best of both → Event Match Quality (EMQ) maxes out → algo
 * targets better, CPM goes down.
 *
 * The challenge with Explodely is that the order ID is only known
 * AFTER the user pays, on the redirect URL — and Explodely doesn't
 * inject it into the redirect by default. So we can't easily share
 * Explodely's order ID between the pixel (browser) and the CAPI (server).
 *
 * Solution: WE generate a UUID ourselves when the user clicks the Buy
 * CTA, store it on both sides (localStorage for the pixel, MongoDB user
 * record for the CAPI), and reuse it as `event_id` everywhere.
 *
 * What this script does
 * ----------------------
 * On every click that targets explodely.com:
 *   1. Generate `pendingEventId` (UUID-ish) for this purchase intent.
 *   2. Save it locally (localStorage) keyed both as a generic
 *      `fbPendingEventId` AND as `fbPendingEventId_<host>` for safety.
 *   3. POST `{ email, fbp, fbc, pendingEventId }` to
 *      /api/store-fb-tracking via navigator.sendBeacon (non-blocking,
 *      reliable even as the page is unloading).
 *
 * The backend persists `pendingEventId` on the user; the Explodely
 * webhook later uses it as the `event_id` of the server-side Purchase
 * event sent to Facebook. The confirmation pages read the same
 * `fbPendingEventId` from localStorage and pass it as `eventID` to
 * `fbq('track', 'Purchase', ...)`. Same value on both sides → FB
 * deduplicates → one conversion counted, both signals merged.
 */
(function () {
  function readFbp() {
    try {
      const fromLS = localStorage.getItem("fbp");
      if (fromLS) return fromLS;
    } catch (_) {}
    try {
      const cookies = document.cookie.split("; ");
      for (let i = 0; i < cookies.length; i++) {
        if (cookies[i].startsWith("_fbp=")) return cookies[i].substring(5);
      }
    } catch (_) {}
    return null;
  }

  function readFbc() {
    try {
      const fromLS = localStorage.getItem("fbc");
      if (fromLS) return fromLS;
    } catch (_) {}
    try {
      const cookies = document.cookie.split("; ");
      for (let i = 0; i < cookies.length; i++) {
        if (cookies[i].startsWith("_fbc=")) return cookies[i].substring(5);
      }
    } catch (_) {}
    try {
      const params = new URLSearchParams(window.location.search);
      const fbclid = params.get("fbclid");
      if (fbclid) return "fb." + Math.floor(Date.now() / 1000) + "." + fbclid;
    } catch (_) {}
    return null;
  }

  function readUserEmail() {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.email ? String(parsed.email).trim().toLowerCase() : null;
    } catch (_) {
      return null;
    }
  }

  function generateEventId() {
    // RFC4122-ish v4 UUID. Prefer crypto.randomUUID when available; fall
    // back to a Math.random version on old browsers. Either way it's
    // unique enough for a single purchase intent.
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return "evt_" + window.crypto.randomUUID();
      }
    } catch (_) {}
    const rand = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return "evt_" + rand;
  }

  function sendTracking(payload) {
    const body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/store-fb-tracking", blob);
        return;
      }
    } catch (_) {}
    try {
      fetch("/api/store-fb-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true,
      }).catch(function () {});
    } catch (_) {}
  }

  function isExplodelyHref(href) {
    if (!href) return false;
    return /(^|\/\/)([a-z0-9-]+\.)?explodely\.com\//i.test(href);
  }

  function handleClickCapture(ev) {
    let el = ev.target;
    while (el && el !== document.body) {
      if (el.tagName === "A" && isExplodelyHref(el.getAttribute("href") || el.href || "")) {
        const email = readUserEmail();
        const fbp = readFbp();
        const fbc = readFbc();
        const pendingEventId = generateEventId();

        try {
          localStorage.setItem("fbPendingEventId", pendingEventId);
          localStorage.setItem("fbPendingEventAt", String(Date.now()));
        } catch (_) {}

        if (email) {
          sendTracking({
            email: email,
            fbp: fbp,
            fbc: fbc,
            pendingEventId: pendingEventId,
          });
        }
        // If email is unknown (anonymous visitor), we still keep the
        // pendingEventId in localStorage. The confirmation page will read
        // it and pass it to the pixel; the server-side CAPI side will
        // fall back to orderId as event_id (still better than nothing).
        return;
      }
      el = el.parentNode;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      document.addEventListener("click", handleClickCapture, true);
    });
  } else {
    document.addEventListener("click", handleClickCapture, true);
  }

  // Expose helper so the confirmation pages can read it without
  // duplicating localStorage parsing.
  window.__myaicrushFbTracking = {
    getPendingEventId: function () {
      try {
        return localStorage.getItem("fbPendingEventId");
      } catch (_) {
        return null;
      }
    },
  };
})();
