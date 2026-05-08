// One-shot announcement: video creator was broken in production for ~24h, now fixed.
// Tells users they can again turn their own photos into personalized AI videos.
//
// Usage:
//   node tools/send_video_creator_announcement.cjs                  → BAT (sends all 5 langs to ADMIN_EMAIL)
//   node tools/send_video_creator_announcement.cjs --bat-lang fr    → BAT (only FR to ADMIN_EMAIL)
//   node tools/send_video_creator_announcement.cjs --send           → real blast to all eligible users
//   node tools/send_video_creator_announcement.cjs --send --limit 50  → safe soft-launch
//
// Reads RESEND_API_KEY, RESEND_FROM_EMAIL, MONGO_URI, ADMIN_EMAIL from .env.

require("dotenv").config();
const { Resend } = require("resend");
const { MongoClient } = require("mongodb");

const FROM = process.env.RESEND_FROM_EMAIL || "MyAiCrush <contact@myaicrush.ai>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "sflueckiger.pro@gmail.com";
const VIDEO_URL = "https://myaicrush.ai/video-creator.html";

const args = process.argv.slice(2);
const argFlag = (name) => args.includes(name);
const argValue = (name) => {
    const i = args.indexOf(name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};

const SEND_REAL = argFlag("--send");
const BAT_LANG_ONLY = argValue("--bat-lang");
const LIMIT = parseInt(argValue("--limit") || "0", 10) || null;

// Per-language copy
const COPY = {
    en: {
        subject: "🎬 The video creator is back online",
        preheader: "Quick heads up — your personalized videos are ready to generate.",
        greeting: "Hey,",
        p1: "Quick heads up: the video creator on MyAiCrush had a temporary glitch over the past day. It's now fully fixed.",
        p2: "You can again turn <strong>your own photos</strong> into short personalized AI videos in just a few clicks.",
        p3: "Thanks for your patience — and have fun creating.",
        cta: "Create my video",
        signature: "The MyAiCrush team",
        footer: "MyAiCrush · AI companions",
        unsub: "Unsubscribe"
    },
    fr: {
        subject: "🎬 Le créateur de vidéos est de nouveau en ligne",
        preheader: "Petit message rapide — tes vidéos personnalisées sont à nouveau dispo.",
        greeting: "Hey,",
        p1: "Petit message rapide : le créateur de vidéos de MyAiCrush a eu un bug ces dernières heures. Tout est rentré dans l'ordre.",
        p2: "Tu peux à nouveau transformer <strong>tes propres photos</strong> en courtes vidéos personnalisées en quelques clics.",
        p3: "Merci pour ta patience — et amuse-toi bien.",
        cta: "Créer ma vidéo",
        signature: "L'équipe MyAiCrush",
        footer: "MyAiCrush · Compagnes IA",
        unsub: "Se désabonner"
    },
    de: {
        subject: "🎬 Der Video-Creator ist wieder online",
        preheader: "Kurze Info — deine personalisierten Videos sind wieder verfügbar.",
        greeting: "Hey,",
        p1: "Kurze Info: Der Video-Creator auf MyAiCrush hatte in den letzten Stunden einen Fehler. Alles ist jetzt behoben.",
        p2: "Du kannst wieder <strong>deine eigenen Fotos</strong> in kurze personalisierte KI-Videos verwandeln, mit nur wenigen Klicks.",
        p3: "Danke für deine Geduld — und viel Spaß beim Erstellen.",
        cta: "Mein Video erstellen",
        signature: "Das MyAiCrush-Team",
        footer: "MyAiCrush · KI-Begleiterinnen",
        unsub: "Abmelden"
    },
    es: {
        subject: "🎬 El creador de vídeos vuelve a estar online",
        preheader: "Aviso rápido — tus vídeos personalizados ya están disponibles otra vez.",
        greeting: "Hola,",
        p1: "Aviso rápido: el creador de vídeos de MyAiCrush tuvo un fallo en las últimas horas. Ya está totalmente solucionado.",
        p2: "Vuelves a poder convertir <strong>tus propias fotos</strong> en vídeos personalizados cortos con solo unos clics.",
        p3: "Gracias por tu paciencia — y diviértete creando.",
        cta: "Crear mi vídeo",
        signature: "El equipo de MyAiCrush",
        footer: "MyAiCrush · Compañeras IA",
        unsub: "Cancelar suscripción"
    },
    pt: {
        subject: "🎬 O criador de vídeos voltou a funcionar",
        preheader: "Aviso rápido — os teus vídeos personalizados já estão disponíveis novamente.",
        greeting: "Olá,",
        p1: "Aviso rápido: o criador de vídeos da MyAiCrush teve um bug nas últimas horas. Está tudo resolvido.",
        p2: "Voltas a poder transformar <strong>as tuas próprias fotos</strong> em vídeos personalizados curtos com apenas alguns cliques.",
        p3: "Obrigado pela tua paciência — e diverte-te a criar.",
        cta: "Criar o meu vídeo",
        signature: "A equipa MyAiCrush",
        footer: "MyAiCrush · Companheiras IA",
        unsub: "Cancelar inscrição"
    }
};

const SUPPORTED_LANGS = Object.keys(COPY);

function buildHtml(lang, recipientEmail) {
    const c = COPY[lang] || COPY.en;
    const unsubUrl = `https://myaicrush.ai/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;
    return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${c.subject}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${c.preheader}</span>
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:24px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);padding:28px 24px;text-align:center;">
      <div style="font-size:2rem;line-height:1;">🎬</div>
      <div style="font-size:0.75rem;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:2px;margin-top:10px;">MyAiCrush · Video Creator</div>
    </div>
    <div style="padding:28px 26px 22px;">
      <h1 style="margin:0 0 14px;font-size:1.2rem;line-height:1.35;color:#1a1a1a;">${c.subject}</h1>
      <p style="margin:0 0 14px;font-size:1rem;line-height:1.6;color:#1a1a1a;">${c.greeting}</p>
      <p style="margin:0 0 12px;font-size:0.97rem;line-height:1.65;color:#1a1a1a;">${c.p1}</p>
      <p style="margin:0 0 12px;font-size:0.97rem;line-height:1.65;color:#1a1a1a;">${c.p2}</p>
      <p style="margin:0 0 22px;font-size:0.97rem;line-height:1.65;color:#1a1a1a;">${c.p3}</p>
      <div style="text-align:center;margin:0 0 8px;">
        <a href="${VIDEO_URL}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;font-weight:600;font-size:0.95rem;padding:13px 30px;border-radius:999px;text-decoration:none;">${c.cta}</a>
      </div>
      <p style="margin:24px 0 4px;font-size:0.88rem;color:#6b7280;line-height:1.5;">${c.signature}</p>
    </div>
    <div style="padding:0 26px 18px;">
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 12px;" />
      <p style="font-size:0.7rem;color:#9ca3af;margin:0;">${c.footer}</p>
    </div>
  </div>
  <div style="text-align:center;padding:14px 20px 28px;">
    <a href="${unsubUrl}" style="font-size:0.7rem;color:#9ca3af;text-decoration:underline;">${c.unsub}</a>
  </div>
</body></html>`;
}

function isValidEmailFormat(email) {
    if (!email || email.length < 5 || email.length > 254) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!re.test(email)) return false;
    const disposable = ["mailinator.com","guerrillamail.com","tempmail.com","throwaway.email","yopmail.com","10minutemail.com","trashmail.com","fakeinbox.com","sharklasers.com","guerrillamailblock.com","grr.la","dispostable.com","maildrop.cc"];
    const domain = email.split("@")[1].toLowerCase();
    if (disposable.includes(domain)) return false;
    return true;
}

function normalizeLang(raw) {
    const l = (raw || "en").substring(0, 2).toLowerCase();
    return SUPPORTED_LANGS.includes(l) ? l : "en";
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Reusable real-send function. Can be invoked from app.js scheduled job.
// Returns { sent, errors, total }. Caller controls Resend / Mongo lifecycle if
// passing them in; otherwise the function creates its own clients.
async function sendRealBlast({ resend, mongo, limit = null, log = console.log } = {}) {
    if (!resend) {
        if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
        resend = new Resend(process.env.RESEND_API_KEY);
    }
    let createdMongo = false;
    if (!mongo) {
        if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI");
        mongo = new MongoClient(process.env.MONGO_URI);
        await mongo.connect();
        createdMongo = true;
    }
    const users = mongo.db("MyAICrush").collection("users");
    const eligible = await users.find({
        dailyEmailEligible: true,
        unsubscribedEmail: { $ne: true },
        email: { $exists: true, $ne: "" }
    }, { projection: { email: 1, lang: 1 } }).toArray();
    const valid = eligible.filter(u => isValidEmailFormat(u.email));
    const target = limit ? valid.slice(0, limit) : valid;

    const byLang = {};
    for (const u of target) { const l = normalizeLang(u.lang); byLang[l] = (byLang[l] || 0) + 1; }
    log(`[ANNOUNCEMENT] eligible=${eligible.length} valid=${valid.length} target=${target.length} byLang=${JSON.stringify(byLang)}`);

    let sent = 0, errors = 0;
    const t0 = Date.now();
    for (const u of target) {
        const lang = normalizeLang(u.lang);
        const c = COPY[lang];
        try {
            await resend.emails.send({ from: FROM, to: u.email, subject: c.subject, html: buildHtml(lang, u.email) });
            sent++;
            if (sent % 50 === 0) log(`[ANNOUNCEMENT] ${sent}/${target.length} sent (${errors} errors)`);
        } catch (e) {
            errors++;
            if (errors <= 5) log(`[ANNOUNCEMENT] error for ${u.email}: ${e.message}`);
        }
        await sleep(150);
    }
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    log(`[ANNOUNCEMENT] done in ${dt}s — sent=${sent} errors=${errors}`);
    if (createdMongo) await mongo.close();
    return { sent, errors, total: target.length };
}

module.exports = { sendRealBlast, COPY, buildHtml, isValidEmailFormat, normalizeLang };

// CLI entrypoint — only runs when this file is executed directly
if (require.main === module) (async () => {
    if (!process.env.RESEND_API_KEY) { console.error("Missing RESEND_API_KEY in .env"); process.exit(1); }
    const resend = new Resend(process.env.RESEND_API_KEY);

    // BAT mode
    if (!SEND_REAL) {
        const langs = BAT_LANG_ONLY ? [BAT_LANG_ONLY.toLowerCase()] : SUPPORTED_LANGS;
        console.log(`📨 BAT mode → sending ${langs.length} email(s) to ${ADMIN_EMAIL}`);
        for (const lang of langs) {
            if (!COPY[lang]) { console.warn(`  ⚠ unknown lang: ${lang}, skipping`); continue; }
            const c = COPY[lang];
            const html = buildHtml(lang, ADMIN_EMAIL);
            const r = await resend.emails.send({
                from: FROM,
                to: ADMIN_EMAIL,
                subject: `[BAT ${lang.toUpperCase()}] ${c.subject}`,
                html
            });
            console.log(`  ✅ [${lang.toUpperCase()}] sent (id: ${r.data?.id || "?"})`);
            await sleep(300);
        }
        console.log("\n👉 Review your inbox, then run with --send to blast to the eligible base.");
        return;
    }

    // Real send (delegated to the reusable sendRealBlast)
    await sendRealBlast({ resend, limit: LIMIT });
})().catch(e => { console.error("❌", e); process.exit(1); });
