/**
 * Facebook tracking pre-checkout bridge.
 *
 * The pixel is initialized at page load (handled in index.html and the
 * confirmation pages), which sets the _fbp cookie automatically. The
 * fbclid -> fbc value is captured on landing (index.html). Both are kept
 * in localStorage so any subsequent page can re-read them.
 *
 * When the user clicks a CTA pointing to explodely.com, we POST those
 * values + their email to /api/store-fb-tracking BEFORE the redirect
 * happens. The Explodely webhook later reads them off the user record to
 * fire a server-side Purchase event with proper user_data, so Facebook can
 * attribute the conversion to the ad even when ad blockers / iOS ITP
 * would have killed a browser-side pixel.
 *
 * Uses navigator.sendBeacon when available so the request fires
 * reliably even as the page navigates away (no race with the redirect).
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

  function sendTracking(email) {
    const fbp = readFbp();
    const fbc = readFbc();
    if (!email) return;
    const body = JSON.stringify({ email: email, fbp: fbp, fbc: fbc });
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
        if (email) {
          sendTracking(email);
        }
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
})();
