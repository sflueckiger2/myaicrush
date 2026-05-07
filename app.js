require('dotenv').config(); // Charger les variables d'environnement



console.log("🔑 Clé API EvenLabs chargée :", process.env.EVENLABS_API_KEY ? "OK" : "❌ Manquante !");

const express = require('express');

const axios = require('axios');
const dns = require('dns');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

const app = express(); // Initialiser l'instance d'Express

const EVENLABS_API_KEY = process.env.EVENLABS_API_KEY;
const fetch = require('node-fetch'); // ✅ Assure-toi que c'est installé

const geoip = require('geoip-lite');

const nsfw = require('nsfwjs');
const tf = require('@tensorflow/tfjs'); // Version allégée
const { Image } = require('canvas'); // Simuler un DOM pour analyser les images
const { createCanvas, loadImage } = require('canvas');
const userSentImages = new Map(); // email -> Set de noms d’images



app.set('trust proxy', true);

app.use((req, res, next) => {
  if (req.hostname === 'img.myaicrush.ai') {
    res.removeHeader('Set-Cookie');
  }
  next();
});

// =========================
// GEO-BLOCK SWITZERLAND
// =========================
const GEO_WHITELISTED_IPS = ['193.5.236.87', '185.43.244.250'];
const GEO_BYPASS_SECRET = 'go';
const GEO_ALLOWED_PATHS = ['/contact.html', '/contact-en.html', '/ticket.html', '/scripts/i18n-contact.js', '/scripts/i18n-menu.js', '/scripts/menu.js', '/styles.css', '/api/support-chat', '/api/my-tickets', '/unsubscribe', '/t/', '/characters.json'];

app.use((req, res, next) => {
  if (req.query.bypass === GEO_BYPASS_SECRET) {
    res.cookie('geo_bypass', GEO_BYPASS_SECRET, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true });
    return next();
  }
  if (req.cookies?.geo_bypass === GEO_BYPASS_SECRET) return next();

  const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim().replace(/^::ffff:/, '');
  if (GEO_WHITELISTED_IPS.includes(ip)) return next();

  const geo = geoip.lookup(ip);
  if (!geo || geo.country !== 'CH') return next();

  const p = req.path.toLowerCase();
  if (GEO_ALLOWED_PATHS.some(allowed => p === allowed || p.startsWith(allowed)) ||
      p.startsWith('/images/') || p.endsWith('.css') || p.endsWith('.woff2') || p.endsWith('.woff') || p.endsWith('.ttf') ||
      p.startsWith('/favicon') || p === '/robots.txt') {
    return next();
  }

  const lang = (req.headers['accept-language'] || '').toLowerCase();
  const isFr = lang.startsWith('fr');
  const isDe = lang.startsWith('de');

  const title = isFr ? 'Site fermé' : isDe ? 'Seite geschlossen' : 'Site Closed';
  const msg = isFr
    ? 'MyAiCrush n\'est plus disponible.'
    : isDe
    ? 'MyAiCrush ist nicht mehr verfügbar.'
    : 'MyAiCrush is no longer available.';
  const cancelText = isFr
    ? 'Si vous avez un abonnement actif, vous pouvez l\'annuler ici :'
    : isDe
    ? 'Wenn Sie ein aktives Abo haben, können Sie es hier kündigen:'
    : 'If you have an active subscription, you can cancel it here:';
  const btnText = isFr ? 'Annuler mon abonnement' : isDe ? 'Mein Abo kündigen' : 'Cancel my subscription';

  res.status(451).send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0f1a;color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:2rem}
.card{text-align:center;max-width:480px}.card h1{font-size:2rem;margin-bottom:1rem;color:#f472b6}.card p{font-size:1rem;line-height:1.6;margin-bottom:1.5rem;color:#94a3b8}.card .sub{font-size:0.9rem;color:#64748b;margin-bottom:1rem}
.btn{display:inline-block;padding:0.75rem 2rem;background:linear-gradient(135deg,#f472b6,#ec4899);color:#fff;text-decoration:none;border-radius:999px;font-weight:600;font-size:0.95rem;transition:opacity .2s}.btn:hover{opacity:.85}</style></head>
<body><div class="card"><h1>${title}</h1><p>${msg}</p><p class="sub">${cancelText}</p><a class="btn" href="/contact.html">${btnText}</a></div></body></html>`);
});

// =========================
// PREMIUM CACHE (anti-latence)
// =========================
const premiumCache = new Map(); // email -> { value, expiresAt }

async function getIsPremiumDirect(email) {
  const database = client.db("MyAICrush");
  const users = database.collection("users");
  const user = await users.findOne(
    { email },
    { projection: { explodelyPremium: 1, premiumExpiresAt: 1, explodely_expiresAt: 1 } }
  );

  if (!user) return false;
  if (user.explodelyPremium !== true) return false;

  const expiresAt = user.explodely_expiresAt || user.premiumExpiresAt;
  if (expiresAt) {
    const expired = new Date() >= new Date(expiresAt);
    if (expired) {
      premiumCache.delete(email);
      return false;
    }
  }

  return true;
}

async function getIsPremiumCached(email, ttlMs = 10_000) {
  const cached = premiumCache.get(email);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = await getIsPremiumDirect(email);
  premiumCache.set(email, { value, expiresAt: Date.now() + ttlMs });
  return value;
}


// 📦 Chargement du mapping Cloudflare (local path → CDN URL)
let cloudflareMap = {};
try {
    const raw = fs.readFileSync(path.join(__dirname, 'cloudflare-map.json'), 'utf8');
    cloudflareMap = JSON.parse(raw);
    console.log("✅ Mapping Cloudflare chargé !");
} catch (err) {
    console.warn("⚠️ Impossible de charger cloudflare-map.json :", err.message);
}


let nsfwModel = null;


async function getNSFWModel() {
    if (!nsfwModel) {
        console.log("📦 Chargement du modèle NSFW à la volée...");
        nsfwModel = await nsfw.load();
        console.log("✅ Modèle NSFW chargé !");
    }
    return nsfwModel;
}


const { connectToDb, getDb } = require('./db');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Fireworks model config with automatic fallback ──
const FW_PRIMARY_MODEL = "accounts/fireworks/models/qwen3-vl-30b-a3b-instruct";
const FW_FALLBACK_MODEL = "accounts/fireworks/models/llama-v3p3-70b-instruct";
let fwActiveModel = FW_PRIMARY_MODEL;
let fwLastAlertSentAt = 0;
const FW_ALERT_COOLDOWN_MS = 3600_000; // 1 email per hour max

async function fwSendModelAlert(failedModel, errorMsg) {
  const now = Date.now();
  if (now - fwLastAlertSentAt < FW_ALERT_COOLDOWN_MS) return;
  fwLastAlertSentAt = now;
  const fallback = failedModel === FW_PRIMARY_MODEL ? FW_FALLBACK_MODEL : "none";
  console.error(`🚨 MODEL ALERT: ${failedModel} failed → fallback: ${fallback}`);
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "MyAiCrush <contact@myaicrush.ai>",
      to: process.env.ADMIN_EMAIL || "sflueckiger.pro@gmail.com",
      subject: `[MyAiCrush] Fireworks model down: ${failedModel.split("/").pop()}`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#1a1a2e;color:#e0e0e0;border-radius:12px;overflow:hidden;">
        <div style="background:#dc2626;padding:20px 24px;text-align:center;">
          <h2 style="margin:0;color:#fff;">Model Alert</h2>
        </div>
        <div style="padding:20px 24px;">
          <p><strong>Failed model:</strong> <code>${failedModel}</code></p>
          <p><strong>Error:</strong> ${errorMsg}</p>
          <p><strong>Fallback active:</strong> <code>${fallback}</code></p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p style="color:#fca5a5;">Action needed: check Fireworks model availability and update if necessary.</p>
        </div>
      </div>`
    });
    console.log("📧 Model alert email sent");
  } catch (e) {
    console.error("❌ Failed to send model alert email:", e.message);
  }
}

function isModelGoneError(err) {
  const status = err?.response?.status || err?.status;
  return status === 404 || status === 422;
}

const nodemailer = require("nodemailer");
const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: (process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

async function sendResetEmail(toEmail, resetUrl, lang = "en") {
  const isFr = String(lang).toLowerCase().startsWith("fr");

  const subject = isFr
    ? "Réinitialisation de ton mot de passe MyAiCrush 💗"
    : "Reset your MyAiCrush password 💗";

  const html = isFr
    ? `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:#070814;color:#fff;border-radius:12px;">
        <h2 style="color:#ff4fa3;text-align:center;">MyAiCrush 💗</h2>
        <p>Bonjour,</p>
        <p>Tu as demandé à réinitialiser ton mot de passe sur <strong>MyAiCrush</strong>.</p>
        <p>Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe (valable 24h) :</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#ff4fa3,#ff7ac5);color:white;text-decoration:none;border-radius:999px;font-weight:600;">Réinitialiser mon mot de passe</a>
        </p>
        <p style="font-size:12px;color:#c3c4d9;">Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email.</p>
        <p style="font-size:11px;color:#666;margin-top:20px;">Lien direct : <a href="${resetUrl}" style="color:#ff4fa3;">${resetUrl}</a></p>
      </div>`
    : `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:#070814;color:#fff;border-radius:12px;">
        <h2 style="color:#ff4fa3;text-align:center;">MyAiCrush 💗</h2>
        <p>Hello,</p>
        <p>You requested a password reset for your <strong>MyAiCrush</strong> account.</p>
        <p>Click the button below to choose a new password (valid for 24 hours):</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#ff4fa3,#ff7ac5);color:white;text-decoration:none;border-radius:999px;font-weight:600;">Reset my password</a>
        </p>
        <p style="font-size:12px;color:#c3c4d9;">If you didn't request this, you can safely ignore this email.</p>
        <p style="font-size:11px;color:#666;margin-top:20px;">Direct link: <a href="${resetUrl}" style="color:#ff4fa3;">${resetUrl}</a></p>
      </div>`;

  const text = isFr
    ? `Bonjour,\n\nTu as demandé à réinitialiser ton mot de passe sur MyAiCrush.\n\nVoici le lien (valable 24h) :\n${resetUrl}\n\nSi tu n'es pas à l'origine de cette demande, tu peux ignorer cet email.`
    : `Hello,\n\nYou requested a password reset for your MyAiCrush account.\n\nHere is your reset link (valid for 24 hours):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`;

  await smtpTransporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || "MyAiCrush"}" <${process.env.SMTP_USER || "contact@myaicrush.ai"}>`,
    to: toEmail,
    subject,
    text,
    html,
  });

  console.log(`📧 Password reset email sent to ${toEmail} (${isFr ? "FR" : "EN"})`);
}

async function sendTicketReplyEmail(toEmail, ticketId, ticketUrl) {
  const subject = `Your support ticket ${ticketId} has been answered — MyAiCrush`;

  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#070814;color:#fff;border-radius:12px;">
  <div style="text-align:center;margin-bottom:18px;">
    <span style="font-size:1.6rem;font-weight:700;color:#ec4899;">MyAiCrush</span>
    <span style="font-size:1.1rem;color:#a78bfa;"> Support</span>
  </div>
  <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:20px;margin-bottom:18px;">
    <p style="margin:0 0 10px;font-size:0.95rem;color:#e2e8f0;">Hello,</p>
    <p style="margin:0 0 14px;font-size:0.95rem;color:#e2e8f0;">Our support team has responded to your ticket <strong style="color:#ec4899;">${ticketId}</strong>.</p>
    <p style="margin:0 0 14px;font-size:0.95rem;color:#e2e8f0;">Click the button below to view the full response:</p>
    <div style="text-align:center;margin:20px 0;">
      <a href="${ticketUrl}" style="display:inline-block;background:linear-gradient(135deg,#ec4899,#c850c0);color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:0.95rem;">View My Ticket</a>
    </div>
  </div>
  <p style="text-align:center;font-size:0.75rem;color:#64748b;margin:0;">This is an automated message from MyAiCrush Support. Please do not reply to this email.</p>
</div>`;

  const text = `Hello,\n\nOur support team has responded to your ticket ${ticketId}.\n\nView your ticket here: ${ticketUrl}\n\nThis is an automated message from MyAiCrush Support.`;

  await smtpTransporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || "MyAiCrush"}" <${process.env.SMTP_USER || "contact@myaicrush.ai"}>`,
    to: toEmail,
    subject,
    text,
    html,
  });

  console.log(`📧 Ticket reply notification sent to ${toEmail} for ${ticketId}`);
}

async function sendTicketCreatedEmail(toEmail, ticketId, ticketUrl) {
  const subject = `Your support ticket ${ticketId} has been received — MyAiCrush`;

  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#070814;color:#fff;border-radius:12px;">
  <div style="text-align:center;margin-bottom:18px;">
    <span style="font-size:1.6rem;font-weight:700;color:#ec4899;">MyAiCrush</span>
    <span style="font-size:1.1rem;color:#a78bfa;"> Support</span>
  </div>
  <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:20px;margin-bottom:18px;">
    <p style="margin:0 0 10px;font-size:0.95rem;color:#e2e8f0;">Hello,</p>
    <p style="margin:0 0 14px;font-size:0.95rem;color:#e2e8f0;">We have received your support request. Your ticket ID is <strong style="color:#ec4899;">${ticketId}</strong>.</p>
    <p style="margin:0 0 14px;font-size:0.95rem;color:#e2e8f0;">Our team will review your request and get back to you as soon as possible. You can track the status of your ticket anytime using the link below:</p>
    <div style="text-align:center;margin:20px 0;">
      <a href="${ticketUrl}" style="display:inline-block;background:linear-gradient(135deg,#ec4899,#c850c0);color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:0.95rem;">Track My Ticket</a>
    </div>
  </div>
  <p style="text-align:center;font-size:0.75rem;color:#64748b;margin:0;">This is an automated message from MyAiCrush Support. Please do not reply to this email.</p>
</div>`;

  const text = `Hello,\n\nWe have received your support request. Your ticket ID is ${ticketId}.\n\nTrack your ticket here: ${ticketUrl}\n\nOur team will review your request and get back to you as soon as possible.\n\nThis is an automated message from MyAiCrush Support.`;

  await smtpTransporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || "MyAiCrush"}" <${process.env.SMTP_USER || "contact@myaicrush.ai"}>`,
    to: toEmail,
    subject,
    text,
    html,
  });

  console.log(`📧 Ticket created notification sent to ${toEmail} for ${ticketId}`);
}

//Cookie Pour les AB TEST 
const cookieParser = require('cookie-parser');





// ✅ Sélection dynamique de la clé Stripe
const stripeMode = process.env.STRIPE_MODE || "live"; // "live" par défaut
const stripeSecretKey = stripeMode === "live"
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_TEST;
    
const stripe = require('stripe')(stripeSecretKey); // ✅ Initialisation correcte de Stripe
console.log(`🚀 Stripe en mode : ${stripeMode.toUpperCase()}`);
console.log(`🔑 Clé Stripe utilisée : ${stripeSecretKey.startsWith("sk_live") ? "LIVE" : "TEST"}`);
const { createTokenCheckoutSession, handleStripeWebhook } = require('./public/scripts/stripe.js');


const userLastImageDescriptions = new Map(); // Stocke la dernière description d’image pour chaque email






app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '20mb' }));





app.use('/user-videos', express.static(path.join(__dirname, 'public/user-videos'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
  }
}));

app.use('/images', express.static(path.join(__dirname, 'public/images'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));


// 2) Static global (pour le reste du site)
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    // uniquement pour les JSON : pas de cache
    if (filePath.endsWith('.json')) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
    }
  }
}));
  





const { createCheckoutSession, cancelSubscription, getUserSubscription } = require('./public/scripts/stripe.js');
const { MongoClient } = require('mongodb'); // Import de MongoClient
const bcrypt = require('bcrypt');
const sharp = require('sharp');
const crypto = require('crypto');
const imageTokens = new Map(); // Stocker les images temporairement
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;
const FB_API_URL = `https://graph.facebook.com/v17.0/${FACEBOOK_PIXEL_ID}/events`;


// Liste noire des domaines jetables
const disposableDomains = [
  "yopmail.com", "tempmail.com", "10minutemail.com", "mailinator.com", "guerrillamail.com"
];

// Vérifier si l'email a un format correct
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Vérifier si le domaine de l'email accepte les emails (DNS MX Record)
async function isDisposableOrInvalidEmail(email) {
  return new Promise((resolve) => {
      const domain = email.split('@')[1];

      // Vérifier si c'est un email jetable
      if (disposableDomains.includes(domain)) {
          return resolve(false);
      }

      // Vérification DNS pour s'assurer que le domaine peut recevoir des emails
      dns.resolveMx(domain, (err, addresses) => {
          if (err || !addresses || addresses.length === 0) {
              resolve(false);
          } else {
              resolve(true);
          }
      });
  });
}


const multer = require('multer');


// Stockage temporaire en RAM
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



// Route pour gérer l'upload d'images

const uploadDir = path.join(__dirname, 'public', 'uploads');

// Vérifier si le dossier uploads existe, sinon le créer
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // ✅ Création récursive si besoin
}


async function analyzeImageNsfw(imageBuffer) {
    try {
        // 🔄 Convertir l'image en JPEG pour compatibilité
        const processedImageBuffer = await sharp(imageBuffer)
            .toFormat('jpeg')
            .toBuffer();

        // 📸 Charger l’image
        const image = await loadImage(`data:image/jpeg;base64,${processedImageBuffer.toString('base64')}`);

        // 🖼️ Créer un canvas pour analyse
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, image.width, image.height);

        // 🔍 Prédiction NSFW
        const model = await getNSFWModel();
const predictions = await model.classify(canvas);


        // 🧠 Tri des résultats pour inspection
        const sorted = predictions.sort((a, b) => b.probability - a.probability);
        console.log("🔎 Résultats NSFW (triés) :", sorted);

        // 🔧 Seuils personnalisés
        const seuilPorn = 0.80;   // Avant : 0.85
const seuilHentai = 0.80; // Avant : 0.85
const seuilSexy = 0.97;   // Avant : 0.95


        const isExplicit = predictions.some(pred => {
            if (pred.className === 'Porn' && pred.probability > seuilPorn) return true;
            if (pred.className === 'Hentai' && pred.probability > seuilHentai) return true;
            if (pred.className === 'Sexy' && pred.probability > seuilSexy) return true;
            return false;
        });

        return isExplicit;

    } catch (error) {
        console.error("❌ Erreur lors de l'analyse NSFW :", error);
        return false;
    }
}




app.post('/upload-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: (req.headers["accept-language"] || "").toLowerCase().startsWith("fr") ? "Aucune image envoyée" : "No image uploaded" });
    }

    try {
        const userEmail = String(req.body.email || "").trim().toLowerCase();
        if (!userEmail) {
            return res.status(400).json({ message: "Email requis" });
        }

        const database = client.db('MyAICrush');
        const users = database.collection('users');

        let user = await users.findOne({ email: userEmail });
        if (!user) {
          user = await users.findOne({ email: { $regex: `^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
        }

        if (!user) {
            return res.status(403).json({ error: "Utilisateur introuvable." });
        }

        const maxFreeImages = 10; // 📌 Limite d'uploads gratuites par mois
        const imagesUploaded = user.imagesUploaded || 0; // 📊 Nombre d'images envoyées ce mois-ci
        const creditsAvailable = user.creditsPurchased || 0; // 🎟️ Jetons disponibles

        // 🔥 Vérifier si l'utilisateur a atteint sa limite d'images gratuites
        if (imagesUploaded >= maxFreeImages) {
            if (creditsAvailable > 0) {
                // 🔥 Déduire 1 crédit pour uploader l’image
                await users.updateOne({ _id: user._id }, { $inc: { creditsPurchased: -1 } });
                console.log(`💳 1 crédit utilisé par ${user.email} pour uploader une image.`);
            } else {
                console.log(`🚨 ${user.email} a dépassé la limite d'images et n'a plus de jetons ! Redirection vers /jetons.html.`);
                return res.status(403).json({ 
                    message: "Limite atteinte. Achetez des crédits pour envoyer plus d'images.",
                    redirect: "/jetons.html"
                });
            }
        } else {
            await users.updateOne({ _id: user._id }, { $inc: { imagesUploaded: 1 } });
            console.log(`📸 Image ${imagesUploaded + 1}/${maxFreeImages} envoyée par ${userEmail}`);
        }

        // 🔥 Vérification NSFW avant de continuer
        const isExplicit = await analyzeImageNsfw(req.file.buffer);

        let imageDescription = ""; // 🔥 Initialisation correcte de la variable

        // 🔥 Compression de l'image
        const compressedImageBuffer = await sharp(req.file.buffer)
            .resize({ width: 320 })
            .jpeg({ quality: 60 })
            .toBuffer();

        // 🔥 Sauvegarde temporaire de l’image
        const imageName = `${Date.now()}.jpg`;
        const imagePath = path.join(uploadDir, imageName);

        console.log(`📂 Chemin de sauvegarde de l'image : ${imagePath}`);

        fs.writeFileSync(imagePath, compressedImageBuffer);

        if (isExplicit) {
            console.log("⚠️ Image NSFW détectée !");
            
            // 🛑 Si l'image est NSFW, on ENVOIE une description prédéfinie
            imageDescription = "L'image semble explicite. Réagis de manière adaptée. Certainement un attribut masculin imposant. Flatte l'utilisateur.";

        } else {
            // 📡 Envoi de l'image à OpenAI pour description
            console.log("📡 Envoi de l'image à OpenAI pour analyse...");

            const openaiResponse = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Décris cette image. Si tu vois une image explicite, décris la avec le mot *inappropriée*. Le tout en moins de 100 tokens." },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Décris cette image brièvement." },
                                { 
                                    type: "image_url", 
                                    image_url: { url: "data:image/jpeg;base64," + compressedImageBuffer.toString("base64") }
                                }
                            ]
                        }
                    ],
                    max_tokens: 100, 
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 15000
                }
            );

            // 🔥 Récupération de la description de l’image
            imageDescription = openaiResponse.data.choices[0]?.message?.content?.trim() || "Une photo intéressante.";
            console.log("📝 Description de l'image par OpenAI :", imageDescription);
        }

        // 📌 Stocker la description temporairement pour cet utilisateur
        if (userEmail) {
            userLastImageDescriptions.set(userEmail, imageDescription);
            console.log(`📝 Description associée à ${userEmail}`);
        }

        console.log("✅ Réponse envoyée après analyse OpenAI");
        // ✅ Réponse avec l'URL de l'image et sa description
        res.json({
            imageUrl: `/uploads/${imageName}`,
            description: imageDescription
        });

    } catch (error) {
        console.error("❌ Erreur lors du traitement de l'image :", error?.response?.status, error?.response?.data || error.message);
        res.status(500).json({ message: "Erreur lors de l'analyse de l'image." });
    }
});

app.post('/api/check-upload-limit', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email requis." });
        }

        const normalizedUlEmail = String(email).trim().toLowerCase();
        const database = client.db('MyAICrush');
        const users = database.collection('users');

        let user = await users.findOne({ email: normalizedUlEmail });
        if (!user) {
          user = await users.findOne({ email: { $regex: `^${normalizedUlEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
        }

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        const maxFreeImages = 10; // 📌 Limite d'uploads gratuites par mois
        const imagesUploaded = user.imagesUploaded || 0; // 📊 Nombre d'images envoyées ce mois-ci
        const creditsAvailable = user.creditsPurchased || 0; // 🎟️ Jetons disponibles

        if (imagesUploaded >= maxFreeImages && creditsAvailable === 0) {
            console.warn(`🚨 ${email} a dépassé la limite et n'a plus de jetons !`);
            return res.json({ canUpload: false, redirect: "/jetons.html" });
        }

        // ✅ L'utilisateur peut uploader une image (gratuitement ou avec ses crédits)
        res.json({ canUpload: true });

    } catch (error) {
        console.error("❌ Erreur lors de la vérification du quota d'images :", error);
        res.status(500).json({ message: "Erreur serveur." });
    }
});




// Route pour récupérer une image temporaire
app.get('/get-uploaded-image/:token', (req, res) => {
    const { token } = req.params;
    const imageData = imageTokens.get(token);

    if (!imageData) {
        return res.status(404).send("Image introuvable ou expirée.");
    }

    res.writeHead(200, { 'Content-Type': imageData.mimetype });
    res.end(imageData.buffer);
});




let firstFreeImageSent = new Map(); // Stocke les utilisateurs qui ont déjà reçu une image non floutée


// Générer un token sécurisé pour accéder à l'image
// Remplace ta fonction actuelle par celle-ci
function generateImageToken(imagePath, isBlurred) {
  // On crée un identifiant stable basé sur le chemin du fichier
  // ex: "aiko1_photo1_blurred" ou "aiko1_photo1_clear"
  const fileName = path.basename(imagePath);
  const folderName = path.dirname(imagePath).split(path.sep).pop();
  const stableId = `${folderName}_${fileName}_${isBlurred ? 'b' : 'c'}`;

  // On garde le token en Map pour la compatibilité avec ton code actuel
  // mais on utilise l'ID stable comme clé
  const cloudflareUrl = cloudflareMap[imagePath] || null;

  imageTokens.set(stableId, {
    imagePath,
    isBlurred,
    cloudflareUrl
  });

  // On ne supprime plus après 10 min, sinon le cache Cloudflare pointera vers du vide
  return stableId;
}



// MongoDB connection string
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Connexion à MongoDB
async function connectToDB() {
    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas!');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1); // Quitte l'application si la connexion échoue
    }
}

// Appeler la fonction pour se connecter
connectToDB();





//ROUTE pour l'inscription via email classique 


// ROUTE POUR LA CONNEXION AVEC EMAIL CLASSIQUE

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedLoginEmail = String(email).trim().toLowerCase();

  try {
      const database = client.db('MyAICrush');
      const users = database.collection('users');

      let user = await users.findOne({ email: normalizedLoginEmail });
      if (!user) {
        user = await users.findOne({ email: { $regex: `^${normalizedLoginEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
      }
      if (!user) {
          return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }

      // Comparer le mot de passe fourni avec le mot de passe haché stocké
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }

      // Réponse avec les informations de l'utilisateur (sans le mot de passe)
      res.status(200).json({
          message: 'Login successful!',
          user: {
              email: user.email,
          },
      });
  } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});


//ROUTE POUR CHANGER MDP EMAIL CLASSIQUE


app.post('/api/change-password', async (req, res) => {
    console.log('Password change request received:', req.body);

    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const normalizedCpEmail = String(email).trim().toLowerCase();

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');

        let user = await users.findOne({ email: normalizedCpEmail });
        if (!user) {
          user = await users.findOne({ email: { $regex: `^${normalizedCpEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
        }
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Vérifier si le mot de passe actuel est correct
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid current password' });
        }

        // Générer un hash pour le nouveau mot de passe
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        await users.updateOne({ _id: user._id }, { $set: { password: hashedNewPassword } });

        res.status(200).json({ message: 'Password changed successfully!' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/api/reset-password', async (req, res) => {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
        return res.status(400).json({ message: "Données manquantes." });
    }

    const normalizedRpEmail = String(email).trim().toLowerCase();

    try {
        const db = client.db('MyAICrush');
        const users = db.collection('users');

        let user = await users.findOne({ email: normalizedRpEmail, resetToken: token });
        if (!user) {
          user = await users.findOne({ email: { $regex: `^${normalizedRpEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }, resetToken: token });
        }

        if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
            return res.status(400).json({ message: "Lien expiré ou invalide." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await users.updateOne(
            { _id: user._id },
            {
                $set: { password: hashedPassword },
                $unset: { resetToken: "", resetTokenExpires: "" }
            }
        );

        res.json({ message: "Mot de passe mis à jour avec succès." });
    } catch (err) {
        console.error("❌ Erreur maj mdp:", err);
        res.status(500).json({ message: "Erreur serveur." });
    }
});

app.post('/api/generate-reset-token', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email requis." });
    }

    const normalizedGrtEmail = String(email).trim().toLowerCase();

    try {
        const db = client.db('MyAICrush');
        const users = db.collection('users');

        let user = await users.findOne({ email: normalizedGrtEmail });
        if (!user) {
          user = await users.findOne({ email: { $regex: `^${normalizedGrtEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
        }

        // On ne révèle pas si le compte existe ou non
        if (!user) {
            console.log("⚠️ Demande de reset pour un email inconnu :", email);
            return res.json({
                message: "Si un compte existe avec cette adresse e-mail, un lien de réinitialisation t’a été envoyé par email. Il peut parfois mettre quelques minutes à arriver."
            });
        }

        // 🎲 Générer le token + expiration
        const token = crypto.randomBytes(20).toString('hex');
        const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        await users.updateOne(
            { _id: user._id },
            {
                $set: {
                    resetToken: token,
                    resetTokenExpires: expiration
                }
            }
        );

        const resetUrl = `${BASE_URL}/reset-password-oneshot.html?email=${encodeURIComponent(user.email)}&token=${token}`;

        console.log(`🔗 Lien de reset généré : ${resetUrl}`);

        const lang = req.body.lang || req.headers["accept-language"] || "en";
        await sendResetEmail(user.email, resetUrl, lang);

        const isFr = String(lang).toLowerCase().startsWith("fr");
        return res.json({
            message: isFr
              ? "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé. Ça peut prendre quelques minutes."
              : "If an account exists with this email, a reset link has been sent. It may take a few minutes to arrive."
        });

    } catch (err) {
        console.error("❌ Erreur envoi email de reset :", err.message);

        const isFr2 = String(req.body.lang || req.headers["accept-language"] || "en").toLowerCase().startsWith("fr");
        return res.status(500).json({
            message: isFr2
              ? "Erreur lors de l'envoi. Réessaie dans un instant."
              : "Error sending the reset email. Please try again."
        });
    }
});



// Route pour créer une session de paiement Stripe
app.post('/api/create-checkout-session', async (req, res) => {
    console.log('📡 Requête reçue sur /api/create-checkout-session');
    console.log('Corps de la requête :', req.body);
  
    try {
        const { planType, email, testId } = req.body;
  
        if (!planType || !email) {
            return res.status(400).json({ message: "Email et planType requis." });
        }
  
        console.log('📦 Plan sélectionné :', planType);
        console.log('📧 Email reçu :', email);
  
        // 🔥 Charger le fichier pricing-config.json pour chercher le bon priceId
        const configPath = path.join(__dirname, 'public', 'pricing-config.json');
        const rawData = fs.readFileSync(configPath);
        const pricingConfig = JSON.parse(rawData);
  
        const stripeMode = process.env.STRIPE_MODE || "live";

        let selectedPlan;

if (testId && testId !== 'default') {
    const activeTest = pricingConfig.active_tests.find(test => test.id === testId);
    if (activeTest) {
        selectedPlan = activeTest.variants.find(p => p.name.toLowerCase().includes(planType.toLowerCase()));
    }
}

if (!selectedPlan) {
    selectedPlan = pricingConfig.default_price.variants.find(p => p.name.toLowerCase().includes(planType.toLowerCase()));
}

if (!selectedPlan) {
    throw new Error(`❌ Plan "${planType}" non trouvé pour le test "${testId || 'default'}" dans pricing-config.json`);
}

  
        // 🔍 On cherche dans default + tests
       // Fusionner toutes les variantes de tous les tests actifs
const allTestVariants = pricingConfig.active_tests.flatMap(test => test.variants);

  
        const priceId = stripeMode === "live"
            ? selectedPlan.stripe_id_live
            : selectedPlan.stripe_id_test;
  
        if (!priceId) {
            throw new Error(`❌ Aucun price ID défini pour le mode ${stripeMode} sur le plan "${planType}"`);
        }
  
        console.log('💳 Price ID utilisé :', priceId);

        // ✅ On récupère l’ID du test actif (ou "default" si aucun)
        const activeTestId = pricingConfig.active_tests?.[0]?.id || 'default';


        // ✅ Création de la session Stripe
       const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: email,
    payment_method_collection: 'always',
    subscription_data: {
        trial_settings: {
            end_behavior: {
                missing_payment_method: 'cancel'
            }
        }
    },
    metadata: {
        fbp: req.body.fbp || null,
        fbc: req.body.fbc || null,
        fbqPurchaseEventID: `purchase_${Date.now()}`
    },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.BASE_URL}/confirmation.html?amount=${selectedPlan.price}&plan=${planType}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/premium.html`
});

  
        console.log('✅ Session Checkout créée avec succès :', session.url);
        res.json({ url: session.url });
  
    } catch (error) {
        console.error('❌ Erreur lors de la création de la session Stripe:', error.message);
        res.status(500).json({ message: 'Failed to create checkout session' });
    }
});








// ROUTE afficher l'abo

app.post('/api/get-user-subscription', async (req, res) => {
  const { email } = req.body;

  if (!email) {
      return res.status(400).json({ message: 'Email is required' });
  }

  try {
      const subscriptionInfo = await getUserSubscription(email);
      res.status(200).json(subscriptionInfo);
  } catch (error) {
      console.error('Error fetching subscription info:', error.message);
      res.status(500).json({ message: 'Error fetching subscription info' });
  }
});


// =========================
// 🔍 Vérification premium Stripe (optimisée)
// =========================










// =====================================
// 🔍 Vérification premium (explodelyPremium uniquement)
// =====================================
async function getPremiumStatus(email) {
  const isPremium = await getIsPremiumDirect(email);
  if (isPremium) {
    console.log(`✅ Premium confirmé pour ${email}`);
  }
  return isPremium;
}



// =====================================================
// 🧩 Builder user par défaut (créé via webhook Explodely)
// =====================================================
function buildUserDefaultsFromExplodely(email) {
  const now = new Date();

  return {
    email: String(email).trim().toLowerCase(),
    password: null,              // sera défini au signup
    createdAt: now,
    audioMinutesUsed: 0,

    // ❌ SURTOUT PAS ICI :
    // creditsPurchased: 0,
    // explodelyPremium: false,

    accountSource: "explodely-webhook",
    lastLoginAt: null,
    stripeCustomerId: null,
    gumroadPremium: false,
    dailyEmailEligible: true,
    dailyEmailEligibleSince: now
  };
}

// ===== Email campaign sale attribution =====
// When a sale comes in via Explodely, look up the user and check if they
// clicked an email campaign within EMAIL_ATTRIBUTION_WINDOW_DAYS. If yes,
// attribute the sale (purchase count + revenue) to that campaign.
const EMAIL_ATTRIBUTION_WINDOW_DAYS = 7;
const EXPLODELY_TOKEN_PRICES_USD = { 10: 9, 50: 37, 100: 59, 300: 129, 700: 249, 1000: 299 };

function getExplodelyProductPriceUSD({ isPremium, isAnnual, isLifetime, tokensAmount }) {
    if (isLifetime) return 174;
    if (isAnnual) return 89;
    if (isPremium) return 29;
    if (tokensAmount && EXPLODELY_TOKEN_PRICES_USD[tokensAmount]) return EXPLODELY_TOKEN_PRICES_USD[tokensAmount];
    return 0;
}

// ===== Fuzzy email matching for typos at checkout =====
// When a customer mistypes their email on Explodely (e.g. "hotmai.com"
// instead of "hotmail.com"), we try to recover them so the sale can be
// credited and attributed instead of silently dropped.
//
// Two layers (most conservative first):
//   1) common domain typos -> deterministic correction
//   2) Levenshtein <= 2 on local-part, ONLY if the candidate user has
//      already paid us (premium or creditsPurchased > 0). This bounds
//      the false-positive risk to existing customers only.
const COMMON_DOMAIN_TYPOS = {
    'hotmai.com': 'hotmail.com', 'hotnail.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmaill.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmail.cm': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hormail.com': 'hotmail.com',
    'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.con': 'gmail.com', 'gemail.com': 'gmail.com',
    'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahoo.cm': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yhaoo.com': 'yahoo.com', 'yahho.com': 'yahoo.com',
    'outlok.com': 'outlook.com', 'outloook.com': 'outlook.com', 'outlook.co': 'outlook.com', 'outlook.cm': 'outlook.com', 'oultook.com': 'outlook.com',
    'iclould.com': 'icloud.com', 'icloud.co': 'icloud.com', 'icloud.cm': 'icloud.com', 'iclou.com': 'icloud.com',
    'live.co': 'live.com', 'live.cm': 'live.com', 'liv.com': 'live.com',
    'orang.fr': 'orange.fr', 'oranges.fr': 'orange.fr', 'orange.f': 'orange.fr',
    'wandoo.fr': 'wanadoo.fr', 'wanado.fr': 'wanadoo.fr',
    'fre.fr': 'free.fr', 'frre.fr': 'free.fr',
    'sfrr.fr': 'sfr.fr',
    'laposte.ne': 'laposte.net', 'laposte.fr': 'laposte.net',
    'gmx.de': 'gmx.com', // keep as-is when actually .de — only used as last resort
    'gmx.co': 'gmx.com'
};

function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const v0 = new Array(b.length + 1);
    const v1 = new Array(b.length + 1);
    for (let i = 0; i <= b.length; i++) v0[i] = i;
    for (let i = 0; i < a.length; i++) {
        v1[0] = i + 1;
        for (let j = 0; j < b.length; j++) {
            const cost = a[i] === b[j] ? 0 : 1;
            v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
        }
        for (let k = 0; k <= b.length; k++) v0[k] = v1[k];
    }
    return v1[b.length];
}

function correctDomainTypo(email) {
    const at = email.lastIndexOf('@');
    if (at <= 0) return null;
    const local = email.slice(0, at);
    const domain = email.slice(at + 1).toLowerCase();
    const fix = COMMON_DOMAIN_TYPOS[domain];
    if (!fix || fix === domain) return null;
    return `${local}@${fix}`;
}

// Find an existing paying user whose email is "very close" to the candidate.
// - Same (corrected) domain
// - Levenshtein <= 2 on local-part
// - User must already be a customer (premium or has bought tokens)
async function findFuzzyPayingUser(database, candidateEmail) {
    const users = database.collection('users');
    const at = candidateEmail.lastIndexOf('@');
    if (at <= 0) return null;
    const local = candidateEmail.slice(0, at);
    let domain = candidateEmail.slice(at + 1).toLowerCase();
    if (COMMON_DOMAIN_TYPOS[domain]) domain = COMMON_DOMAIN_TYPOS[domain];

    // Pull paying users on the same (corrected) domain only
    const sameDomainPayers = await users.find(
        {
            email: { $regex: `@${domain.replace(/\./g, '\\.')}$`, $options: 'i' },
            $or: [
                { explodelyPremium: true },
                { creditsPurchased: { $gt: 0 } }
            ]
        },
        { projection: { email: 1, explodelyPremium: 1, creditsPurchased: 1, lastClickedCampaignAt: 1 } }
    ).toArray();

    let best = null;
    for (const u of sameDomainPayers) {
        const otherLocal = u.email.split('@')[0];
        const dist = levenshtein(local.toLowerCase(), otherLocal.toLowerCase());
        if (dist > 2) continue;
        if (!best || dist < best.distance) {
            best = { matchedEmail: u.email, distance: dist };
        }
    }
    return best;
}

// Try to recover an email that didn't match exactly. Returns
//   { matchedEmail, matchType, originalEmail, distance? }  or null.
async function recoverEmailFromTypo(database, originalEmail) {
    const users = database.collection('users');

    // Layer 1: deterministic domain typo
    const domainCorrected = correctDomainTypo(originalEmail);
    if (domainCorrected) {
        const exists = await users.findOne({ email: domainCorrected }, { projection: { email: 1 } });
        if (exists) {
            return { matchedEmail: exists.email, matchType: 'domain_typo', originalEmail, distance: 0 };
        }
    }

    // Layer 2: Levenshtein <= 2 on local-part, paying users only
    const fuzzy = await findFuzzyPayingUser(database, domainCorrected || originalEmail);
    if (fuzzy) {
        return { matchedEmail: fuzzy.matchedEmail, matchType: 'local_typo', originalEmail, distance: fuzzy.distance };
    }
    return null;
}

// Notify admin once per (original -> matched) pair so we keep an audit trail.
const _typoMatchAlertSent = new Set();
async function notifyAdminTypoMatch({ original, matched, matchType, distance, productInfo }) {
    const key = `${original}=>${matched}`;
    if (_typoMatchAlertSent.has(key)) return;
    _typoMatchAlertSent.add(key);
    try {
        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'MyAiCrush <contact@myaicrush.ai>',
            to: process.env.ADMIN_EMAIL || 'sflueckiger.pro@gmail.com',
            subject: `[MyAiCrush] Typo email recovered: ${original} -> ${matched}`,
            html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#1a1a2e;color:#e0e0e0;border-radius:12px;overflow:hidden;">
                <div style="background:#7c3aed;padding:18px 22px;"><h2 style="margin:0;color:#fff;font-size:1rem;">Email typo auto-recovered</h2></div>
                <div style="padding:18px 22px;font-size:0.88rem;line-height:1.5;">
                    <p><strong>Original (Explodely):</strong> <code>${original}</code></p>
                    <p><strong>Matched user:</strong> <code>${matched}</code></p>
                    <p><strong>Match type:</strong> ${matchType}${typeof distance === 'number' ? ` (Levenshtein ${distance})` : ''}</p>
                    ${productInfo ? `<p><strong>Sale:</strong> ${productInfo}</p>` : ''}
                    <p style="color:#9ca3af;margin-top:14px;font-size:0.78rem;">If this is wrong, refund + adjust manually. Reply with the original email to disable future matches.</p>
                </div>
            </div>`
        });
        console.log(`📧 Admin notified of typo recovery: ${original} -> ${matched}`);
    } catch (e) {
        console.error('❌ Failed to send typo alert email:', e.message);
    }
}

async function attributeSaleToCampaign(database, email, productInfo) {
    try {
        const user = await database.collection('users').findOne(
            { email },
            { projection: { lastClickedCampaignId: 1, lastClickedCampaignAt: 1 } }
        );
        if (!user || !user.lastClickedCampaignId || !user.lastClickedCampaignAt) return;

        const ageMs = Date.now() - new Date(user.lastClickedCampaignAt).getTime();
        if (ageMs > EMAIL_ATTRIBUTION_WINDOW_DAYS * 24 * 3600 * 1000) return;

        const valueUSD = getExplodelyProductPriceUSD(productInfo);
        if (valueUSD <= 0) return;

        const { ObjectId } = require('mongodb');
        let campaignObjectId;
        try { campaignObjectId = new ObjectId(user.lastClickedCampaignId); } catch { return; }

        const saleEntry = {
            email,
            productLabel: productInfo.label || 'sale',
            productId: productInfo.productId || null,
            orderId: productInfo.orderId || null,
            usd: valueUSD,
            at: new Date()
        };

        const result = await database.collection('daily_email_campaigns').updateOne(
            { _id: campaignObjectId },
            {
                $inc: { purchaseCount: 1, revenue: valueUSD },
                $push: { sales: saleEntry }
            }
        );
        console.log(`💰 [EMAIL-ATTRIBUTION] +$${valueUSD} attributed to campaign ${user.lastClickedCampaignId} (${productInfo.label || 'sale'}) for ${email} | matched=${result.matchedCount}`);
    } catch (e) {
        console.error('❌ [EMAIL-ATTRIBUTION] error:', e.message);
    }
}

app.post("/webhook/explodely", async (req, res) => {
  try {
    const payload = req.body || {};

    const database = client.db("MyAICrush");
    const users = database.collection("users");
    const explodelyEvents = database.collection("explodely_events");


    // -----------------------------
    // Helpers CSV → array
    // -----------------------------
    const toList = (v) =>
      String(v || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    const uniq = (arr) => [...new Set(arr)];

    const normalizeEmail = (v) => String(v || "").trim().toLowerCase();

    // Track typo recovery info on the picked email so we can log it on the
    // event for audit / dashboard later. Reset for each webhook call.
    let typoRecovery = null;

    const pickBestEmail = async (raw) => {
      // Explodely peut renvoyer "a@gmail.com,a@gmail.com,b@gmail.com"
      const candidates = uniq(
        toList(raw)
          .map(normalizeEmail)
          .filter((e) => e.includes("@"))
      );

      if (candidates.length === 0) return "";

      // 1) Try exact matches in DB first across all candidates
      const existing = await users
        .find({ email: { $in: candidates } }, { projection: { email: 1 } })
        .toArray();

      if (existing.length >= 1) return existing[0].email;

      // 2) Single candidate, no exact match -> try typo recovery before
      //    falling back to upsert. This rescues sales when the customer
      //    mistyped their email at Explodely checkout.
      if (candidates.length === 1) {
        const recovered = await recoverEmailFromTypo(database, candidates[0]);
        if (recovered) {
          typoRecovery = recovered;
          console.log(`🩹 [TYPO-RECOVERY] ${recovered.originalEmail} -> ${recovered.matchedEmail} (${recovered.matchType})`);
          return recovered.matchedEmail;
        }
        // No recovery: keep the original (will create a brand-new user via $setOnInsert)
        return candidates[0];
      }

      // 3) Multiple candidates, none exists, none recovered -> nothing safe
      return "";
    };

    // -----------------------------
    // Champs EXACTS d'après tes logs
    // -----------------------------
    const productIds = toList(payload.productId);
    const eventTypes = toList(payload.type).map((x) => x.toLowerCase());
    const orderIds = toList(payload.orderid);

    const count = Math.max(productIds.length, eventTypes.length, orderIds.length);

    if (!count) {
      console.warn("⚠️ Webhook Explodely vide:", payload);
      return res.status(200).send("ok");
    }

    // ✅ Email: choisi 1 seule fois, correctement
    const email = await pickBestEmail(payload.customerEmail);

    // If we recovered an email via typo correction, alert admin once and
    // prepare the audit-trail field added to every event below.
    const typoMatchField = typoRecovery ? {
      typoMatch: {
        type: typoRecovery.matchType,
        original: typoRecovery.originalEmail,
        matched: typoRecovery.matchedEmail,
        distance: typoRecovery.distance
      }
    } : {};
    if (typoRecovery) {
      notifyAdminTypoMatch({
        original: typoRecovery.originalEmail,
        matched: typoRecovery.matchedEmail,
        matchType: typoRecovery.matchType,
        distance: typoRecovery.distance,
        productInfo: `productIds=${(payload.productId || '').toString()} types=${(payload.type || '').toString()}`
      }).catch(() => {});
    }

    if (!email) {
      console.warn("⚠️ Webhook Explodely: aucun email MyAiCrush matché:", {
        customerEmail: payload.customerEmail,
        productId: payload.productId,
        type: payload.type,
        orderid: payload.orderid,
      });

      // On log pour debug, mais on ne crédite pas
      await explodelyEvents.insertOne({
        createdAt: new Date(),
        action: "no_matching_email",
        rawCustomerEmail: String(payload.customerEmail || ""),
        productIds,
        eventTypes,
        orderIds,
        payload,
      });

      return res.status(200).send("ok");
    }

    // -----------------------------
    // Mapping produits
    // -----------------------------
    const tokenMapping = {
      [String(process.env.EXPLODELY_TOKEN_10_ID || "")]: 10,
      [String(process.env.EXPLODELY_TOKEN_50_ID || "")]: 50,
      [String(process.env.EXPLODELY_TOKEN_100_ID || "")]: 100,
      [String(process.env.EXPLODELY_TOKEN_300_ID || "")]: 300,
      [String(process.env.EXPLODELY_TOKEN_700_ID || "")]: 700,
      [String(process.env.EXPLODELY_TOKEN_1000_ID || "")]: 1000
    };

    const premiumId = String(process.env.EXPLODELY_PREMIUM_PRODUCT_ID || "");
    const annualId = String(process.env.EXPLODELY_ANNUAL_PRODUCT_ID || "");
    const lifetimeId = String(process.env.EXPLODELY_LIFETIME_PRODUCT_ID || "887584369");

    // -----------------------------
    // Traitement item par item
    // -----------------------------
    for (let i = 0; i < count; i++) {
      const productId = String(productIds[i] || "").trim();
      const eventType = String(eventTypes[i] || "").trim().toLowerCase();
      const orderId = String(orderIds[i] || "").trim();

      // Skip si incomplet
      if (!productId || !eventType || !orderId) {
        console.warn("⚠️ Explodely item incomplet:", { i, productId, eventType, orderId });
        continue;
      }

      // Idempotency PAR ITEM
      const eventKey = { orderId, productId, eventType, email };
      const already = await explodelyEvents.findOne(eventKey);
      if (already) {
        console.log("🟡 Explodely item déjà traité:", eventKey);
        continue;
      }

      const isPremiumProduct = productId === premiumId;
      const isAnnualProduct = productId === annualId;
      const isLifetimeProduct = productId === lifetimeId;
      const tokensAmount = tokenMapping[productId];

      // Détection refund-like (à confirmer quand tu auras le vrai payload refund)
      const isRefundLike = ["refund", "refunded", "chargeback", "reversal"].includes(eventType);
      const isCancelEvent = ["cancel", "canceled"].includes(eventType);

      // ---- SALE ----
      if (eventType === "sale") {
        if (isAnnualProduct) {
          // Auto-cancel of monthly disabled — let both subs coexist
          const oldMonthlyOrderId = null;

          const existingForBonus = await users.findOne({ email }, { projection: { explodelyPremium: 1 } });
          const alreadyPremium = existingForBonus?.explodelyPremium === true;

          await users.updateOne(
            { email },
            {
              $set: {
                explodelyPremium: true,
                explodelyMainOrderId: orderId,
                explodelyPlan: "annual",
                monthlyCancelledForAnnual: !!oldMonthlyOrderId,
                annualStartedAt: new Date(),
                lastBonusAt: new Date(),
                bonusSeenByUser: false
              },
              ...(alreadyPremium ? {} : { $inc: { creditsPurchased: 30 } }),
              $setOnInsert: buildUserDefaultsFromExplodely(email),
            },
            { upsert: true }
          );

          await explodelyEvents.insertOne({ ...eventKey, action: "annual_premium_on", bonusSkipped: alreadyPremium, createdAt: new Date(), ...typoMatchField });
          console.log(`✅ Premium Annuel Explodely activé pour ${email} ${alreadyPremium ? '(déjà premium, bonus 30 jetons ignoré)' : '(+30 jetons)'} (orderId=${orderId})`);
          await attributeSaleToCampaign(database, email, { isAnnual: true, label: "annual", productId, orderId });
          continue;
        }

        if (isLifetimeProduct) {
          const existingForBonus = await users.findOne({ email }, { projection: { explodelyPremium: 1 } });
          const alreadyPremium = existingForBonus?.explodelyPremium === true;

          await users.updateOne(
            { email },
            {
              $set: {
                explodelyPremium: true,
                explodelyMainOrderId: orderId,
                explodelyPlan: "lifetime",
                lifetimeStartedAt: new Date(),
                lastBonusAt: new Date(),
                bonusSeenByUser: false
              },
              // Lifetime never expires: clear any existing expiration / cancellation markers
              $unset: { explodely_expiresAt: "", premiumExpiresAt: "", premiumCancelledAt: "" },
              ...(alreadyPremium ? {} : { $inc: { creditsPurchased: 100 } }),
              $setOnInsert: buildUserDefaultsFromExplodely(email),
            },
            { upsert: true }
          );

          await explodelyEvents.insertOne({ ...eventKey, action: "lifetime_premium_on", bonusSkipped: alreadyPremium, createdAt: new Date(), ...typoMatchField });
          console.log(`✅ Premium LIFETIME Explodely activé pour ${email} ${alreadyPremium ? '(déjà premium, bonus 100 jetons ignoré)' : '(+100 jetons)'} (orderId=${orderId})`);
          await attributeSaleToCampaign(database, email, { isLifetime: true, label: "lifetime", productId, orderId });
          continue;
        }

        if (isPremiumProduct) {
          // Monthly plan: NO bonus tokens (per pricing strategy — tokens reserved for annual/lifetime)
          await users.updateOne(
            { email },
            {
              $set: { 
                explodelyPremium: true,
                explodelyMainOrderId: orderId,
                explodelyPlan: "monthly",
                lastBonusAt: new Date(),
                bonusSeenByUser: false
              },
              $setOnInsert: buildUserDefaultsFromExplodely(email),
            },
            { upsert: true }
          );

          await explodelyEvents.insertOne({ ...eventKey, action: "premium_on", bonusSkipped: true, createdAt: new Date(), ...typoMatchField });
          console.log(`✅ Premium Mensuel Explodely activé pour ${email} (pas de bonus jetons sur le mensuel) (orderId=${orderId})`);
          await attributeSaleToCampaign(database, email, { isPremium: true, label: "premium_monthly", productId, orderId });
          continue;
        }

        if (tokensAmount) {
          const toAdd = Number(tokensAmount);
          if (!Number.isFinite(toAdd) || toAdd <= 0) {
            await explodelyEvents.insertOne({ ...eventKey, action: "tokens_invalid", createdAt: new Date() });
            console.warn("⚠️ tokens invalid:", { productId, tokensAmount });
            continue;
          }

          await users.updateOne(
            { email },
            {
              $inc: { creditsPurchased: toAdd },
              $setOnInsert: buildUserDefaultsFromExplodely(email),
            },
            { upsert: true }
          );

          await explodelyEvents.insertOne({ ...eventKey, action: "tokens_add", tokens: toAdd, createdAt: new Date(), ...typoMatchField });
          console.log(`💰 +${toAdd} jetons pour ${email} (orderId=${orderId})`);
          await attributeSaleToCampaign(database, email, { tokensAmount: toAdd, label: `tokens_${toAdd}`, productId, orderId });
          continue;
        }

        await explodelyEvents.insertOne({ ...eventKey, action: "unknown_product_sale", createdAt: new Date() });
        console.log("🟡 Produit non mappé (sale):", { email, productId, orderId });
        continue;
      }

      // ---- REFUND-LIKE ----
      if (isRefundLike) {
        if (isAnnualProduct || isPremiumProduct || isLifetimeProduct) {
          const currentUser = await users.findOne({ email }, { projection: { explodelyMainOrderId: 1, explodelyPlan: 1 } });

          if (currentUser && currentUser.explodelyMainOrderId && currentUser.explodelyMainOrderId !== orderId) {
            await explodelyEvents.insertOne({ ...eventKey, action: "refund_ignored_different_order", currentOrderId: currentUser.explodelyMainOrderId, createdAt: new Date() });
            console.log(`⏭️ Refund ignoré pour ${email}: ancien orderId=${orderId}, client a un abo actif différent (orderId=${currentUser.explodelyMainOrderId})`);
            continue;
          }

          await users.updateOne(
            { email },
            {
              $set: { explodelyPremium: false },
              $setOnInsert: buildUserDefaultsFromExplodely(email),
            },
            { upsert: true }
          );

          const label = isLifetimeProduct ? "lifetime_premium_off" : (isAnnualProduct ? "annual_premium_off" : "premium_off");
          const planLabel = isLifetimeProduct ? "lifetime" : (isAnnualProduct ? "annual" : "monthly");
          await explodelyEvents.insertOne({ ...eventKey, action: label, createdAt: new Date() });
          console.log(`⛔ Premium Explodely désactivé (refund-like) pour ${email} (orderId=${orderId}, type=${planLabel})`);
          continue;
        }

        if (tokensAmount) {
          const toRemove = Number(tokensAmount);
          if (!Number.isFinite(toRemove) || toRemove <= 0) {
            await explodelyEvents.insertOne({ ...eventKey, action: "tokens_invalid_refund", createdAt: new Date() });
            continue;
          }

          const user = await users.findOne({ email }, { projection: { creditsPurchased: 1 } });
          const current = Number(user?.creditsPurchased || 0);
          const newValue = Math.max(0, current - toRemove);

          await users.updateOne(
            { email },
            {
              $set: { creditsPurchased: newValue },
              $setOnInsert: buildUserDefaultsFromExplodely(email),
            },
            { upsert: true }
          );

          await explodelyEvents.insertOne({
            ...eventKey,
            action: "tokens_remove",
            tokens: toRemove,
            before: current,
            after: newValue,
            createdAt: new Date()
          });

          console.log(`↩️ -${toRemove} jetons refund-like pour ${email} (avant=${current} après=${newValue})`);
          continue;
        }

        await explodelyEvents.insertOne({ ...eventKey, action: "unknown_product_refund", createdAt: new Date() });
        console.log("🟡 Produit non mappé (refund-like):", { email, productId, orderId, eventType });
        continue;
      }

      // ---- CANCEL (subscription stopped, but access continues until end of period) ----
      if (isCancelEvent) {
        if (isLifetimeProduct) {
          // Lifetime cannot be cancelled (only refunded). Log and ignore.
          await explodelyEvents.insertOne({ ...eventKey, action: "lifetime_cancel_ignored", createdAt: new Date() });
          console.log(`ℹ️ Cancel event sur lifetime ignoré (lifetime ne peut être que remboursé) pour ${email} (orderId=${orderId})`);
          continue;
        }
        if (isAnnualProduct || isPremiumProduct) {
          const currentUser = await users.findOne({ email }, { projection: { explodelyMainOrderId: 1, explodelyPlan: 1 } });

          if (currentUser && currentUser.explodelyMainOrderId && currentUser.explodelyMainOrderId !== orderId && currentUser.explodelyPlan === "annual") {
            await explodelyEvents.insertOne({ ...eventKey, action: "cancel_ignored_user_upgraded_annual", currentOrderId: currentUser.explodelyMainOrderId, createdAt: new Date() });
            console.log(`⏭️ Cancel ignoré pour ${email}: ancien orderId=${orderId}, client déjà sur plan annuel (orderId=${currentUser.explodelyMainOrderId})`);
            continue;
          }

          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await users.updateOne(
            { email },
            {
              $set: { premiumCancelledAt: new Date(), explodely_expiresAt: expiresAt },
              $setOnInsert: buildUserDefaultsFromExplodely(email),
            },
            { upsert: true }
          );

          const label = isAnnualProduct ? "annual_cancel_keep_access" : "monthly_cancel_keep_access";
          await explodelyEvents.insertOne({ ...eventKey, action: label, accessUntil: expiresAt, createdAt: new Date() });
          console.log(`⏸️ Abo Explodely annulé pour ${email}, accès maintenu jusqu'au ${expiresAt.toISOString().split("T")[0]} (orderId=${orderId})`);
          continue;
        }

        await explodelyEvents.insertOne({ ...eventKey, action: "cancel_non_premium_ignored", createdAt: new Date() });
        console.log("ℹ️ Cancel event pour produit non-premium ignoré:", { email, productId, orderId });
        continue;
      }

      // ---- OTHER ----
      await explodelyEvents.insertOne({ ...eventKey, action: "ignored_event", createdAt: new Date() });
      console.log("ℹ️ Event ignoré:", { email, productId, orderId, eventType });
    }

    return res.status(200).send("ok");
  } catch (error) {
    console.error("❌ Erreur webhook Explodely:", error);
    return res.status(200).send("ok");
  }
});



// =========================
// ✅ ROUTE : VERIFIER SI PREMIUM (FAST + CACHE)
// =========================



app.post('/api/is-premium', async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: 'Email requis' });
  }

  try {
    const now = Date.now();
    const cached = premiumCache.get(email);

    // ✅ 1) Cache valide → réponse immédiate
    if (cached && cached.expiresAt > now) {
      return res.json({ isPremium: cached.value, cached: true });
    }

    // ✅ 2) Cache expiré mais existant
    if (cached && cached.expiresAt <= now) {

      // ✅ 2a) Stale autorisé UNIQUEMENT si on avait TRUE
      if (cached.value === true && !cached.refreshing) {
        cached.refreshing = true;

        void (async () => {
          try {
            const value = await getPremiumStatus(email);
            premiumCache.set(email, {
              value,
              expiresAt: Date.now() + 10_000,
              refreshing: false
            });
          } catch (e) {
            console.error("❌ Erreur refresh cache /api/is-premium:", e.message || e);
            premiumCache.set(email, {
              value: cached.value,
              expiresAt: Date.now() + 10_000,
              refreshing: false
            });
          }
        })();

        return res.json({ isPremium: true, cached: true, stale: true });
      }

      // ✅ 2b) Si cached.value === false ou refreshing en cours → check bloquant
      const value = await getPremiumStatus(email);
      premiumCache.set(email, {
        value,
        expiresAt: Date.now() + 10_000,
        refreshing: false
      });

      return res.json({ isPremium: value, cached: false });
    }

    // ✅ 3) Aucun cache → check bloquant
    const value = await getPremiumStatus(email);
    premiumCache.set(email, {
      value,
      expiresAt: now + 10_000,
      refreshing: false
    });

    return res.json({ isPremium: value, cached: false });

  } catch (error) {
    console.error('❌ Erreur /api/is-premium:', error.message || error);

    const cached = premiumCache.get(email);
    if (cached) {
      return res.json({ isPremium: cached.value, cached: true, error: true });
    }

    return res.status(500).json({ isPremium: false, error: true });
  }
});






app.post("/api/cancel-subscription", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const orderId = String(req.body.orderId || "").trim();

    const database = client.db("MyAICrush");
    const users = database.collection("users");

    // Recherche par orderId direct OU par email
    let user = null;
    if (orderId) {
      user = await users.findOne({ explodelyMainOrderId: orderId });
    }
    if (!user && email) {
      user = await users.findOne({ email });
    }

    if (!user) return res.status(404).json({ error: "no_account" });
    if (!user.explodelyMainOrderId) return res.status(400).json({ error: "no_order_id" });

    // Appel API Explodely
    const explodelyRes = await fetch(
      `https://explodely.com/api/v1/rebill?username=${process.env.EXPLODELY_USERNAME}&apikey=${process.env.EXPLODELY_API_KEY}&apiaction=cancelrebill&mainorderid=${user.explodelyMainOrderId}`
    );
    const explodelyData = await explodelyRes.json();
    console.log("📦 Réponse Explodely cancel:", explodelyData);

    if (explodelyData.error) {
      console.error("❌ Explodely API error:", explodelyData.error);
      return res.status(400).json({ error: "explodely_error", message: "Cancellation failed. Please contact support at contact@myaicrush.ai" });
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await users.updateOne(
      { _id: user._id },
      { $set: { premiumCancelledAt: new Date(), explodely_expiresAt: expiresAt } }
    );

    premiumCache.delete(user.email);

    console.log(`⛔ Abonnement annulé pour ${user.email}, expire le ${expiresAt}`);
    return res.status(200).json({ success: true, accessUntil: expiresAt });

  } catch (error) {
    console.error("❌ Erreur cancel-subscription:", error);
    return res.status(500).json({ error: "server_error" });
  }
});




// Charger les personnages depuis le fichier JSON
const charactersFR = require('./characters.fr.json');
const charactersEN = require('./characters.json');
const characters = charactersEN; 
// Configuration Google OAuth

const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // Assurez-vous que ces variables sont dans votre fichier .env
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Middleware pour rediriger vers Google pour l'authentification
app.get('/auth/google', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile'],
  });
  res.redirect(authUrl);
});

// ENDPOINT GOOGLE AUTH
// Callback pour gérer la réponse après l'authentification Google
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;

  try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      const ticket = await oAuth2Client.verifyIdToken({
          idToken: tokens.id_token,
          audience: CLIENT_ID,
      });
      const payload = ticket.getPayload();

      const userEmail = String(payload.email || "").trim().toLowerCase();

      const database = client.db('MyAICrush');
      const usersCollection = database.collection('users');

      const existingUser = await usersCollection.findOne({ email: userEmail });
      const isNewUser = !existingUser;

      if (!existingUser) {
        const userLang = (req.headers["accept-language"] || "en").split(",")[0].split("-")[0].toLowerCase();
        await usersCollection.insertOne({ 
          email: userEmail, 
          createdAt: new Date(), 
          audioMinutesUsed: 0, 
          creditsPurchased: 0,
          lang: userLang,
          dailyEmailEligible: true,
          dailyEmailEligibleSince: new Date()
        });

        console.log(`✅ Nouvel utilisateur Google ajouté avec crédits : ${userEmail}`);

        // ✅ Ajout à Elastic Email pour les nouveaux utilisateurs
        await addUserToElastic(userEmail);
      }

      console.log('Utilisateur Google authentifié :', userEmail);

      const detectedLang = (req.headers["accept-language"] || "en").split(",")[0].split("-")[0].toLowerCase();
      await usersCollection.updateOne({ email: userEmail }, { $set: { lang: detectedLang, lastLogin: new Date() } });

      // Tu peux garder une logique différente pour new/existing si tu veux, là c'est la même :
      const redirectUrl = isNewUser 
        ? `${BASE_URL}/index.html` 
        : `${BASE_URL}/index.html`;

      // Réponse HTML avec un script pour stocker l'utilisateur dans localStorage et rediriger
      res.send(`
        <script>
            localStorage.setItem('user', JSON.stringify({ email: "${userEmail}" }));
            window.location.href = '${redirectUrl}';
        </script>
      `);
  } catch (error) {
      console.error("Erreur lors de l'authentification Google:", error);
      res.status(500).send('Erreur d\'authentification');
  }
});









// Servir characters.json a la racine, en filtrant les personnages marques `hidden: true`
// (preserves dans le JSON pour les conserver en base mais invisibles cote site).
app.get('/characters.json', (req, res) => {
  const lang = req.headers['accept-language'] || '';
  const isFrench = lang.toLowerCase().startsWith('fr');
  const file = isFrench ? 'characters.fr.json' : 'characters.json';
  try {
    const fs = require('fs');
    const raw = fs.readFileSync(path.join(__dirname, file), 'utf-8');
    const all = JSON.parse(raw);
    const visible = all.filter(c => c && c.hidden !== true);
    res.set('Cache-Control', 'no-cache');
    res.json(visible);
  } catch (e) {
    console.error('[characters.json] read/filter failed:', e.message);
    res.sendFile(path.join(__dirname, file));
  }
});

app.get('/api/stories', async (req, res) => {
  const fsP = require('fs').promises;
  const mediaExts = /\.(webp|jpg|jpeg|png|gif|mp4|webm|mov)$/i;
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);

  const groups = [];

  for (const char of charactersEN) {
    if (char.hidden === true) continue;
    const photoPath = char.photo || '';
    const match = photoPath.match(/images\/([^/]+)\//);
    if (!match) continue;
    const girl = match[1];
    const folder = `images/${girl}/${girl}1`;
    const absDir = path.join(__dirname, 'public', folder);

    try {
      const files = await fsP.readdir(absDir);
      const all = files.filter(f => mediaExts.test(f)).map(f => `${folder}/${f}`);
      if (!all.length) continue;

      let s = daysSinceEpoch ^ (girl.length * 2654435761);
      const shuffled = [...all].sort(() => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; });
      const media = shuffled.slice(0, Math.min(shuffled.length, 2));

      const bgPhoto = char.backgroundPhoto || '';
      let avatar = bgPhoto || photoPath;
      if (/\.(mp4|webm|mov)$/i.test(avatar)) {
        avatar = all.find(f => !/\.(mp4|webm|mov)$/i.test(f)) || media[0];
      }

      groups.push({ name: char.name, avatar, media });
    } catch (_) {}
  }

  res.json({ groups });
});

let conversationHistory = [];
const userLevels = new Map(); // 🔥 Stocke le niveau de chaque utilisateur
let photoSentAtLittleCrush = false; // Variable pour suivre l'envoi de la photo au niveau Little Crush
let photoSentAtBigCrush = false; // Variable pour suivre l'envoi de la photo au niveau Big Crush
let photoSentAtPerfectCrush = false;


const userCharacters = new Map(); // ✅ Associe chaque email à un personnage
const userConversationHistory = new Map();
const userPhotoStatus = new Map();




// Fonction pour supprimer les accents
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findCharacterByName(name) {
  let character = charactersEN.find(c => c.name === name);
  if (character) return character;

  const frMatch = charactersFR.find(c => c.name === name);
  if (frMatch) {
    const idx = charactersFR.indexOf(frMatch);
    if (charactersEN[idx]) return charactersEN[idx];
  }

  const norm = removeAccents(name.toLowerCase());
  return charactersEN.find(c => removeAccents(c.name.toLowerCase()) === norm) || null;
}

// Fonction pour changer le personnage actif
app.post('/setCharacter', async (req, res) => {
    console.log('🔄 Requête reçue pour changer de personnage :', req.body);
  
    const { email, name } = req.body;
    if (!email || !name) {
        return res.status(400).json({ success: false, message: "Email et personnage requis." });
    }
  
    let character = findCharacterByName(name);
    if (!character) {
        return res.status(400).json({ success: false, message: "Personnage inconnu." });
    }
  
    try {
        // ✅ Stocker le personnage pour cet utilisateur uniquement (mémoiree)
        userCharacters.set(email, character);
        console.log(`✅ Personnage défini pour ${email} : ${character.name}`);
  
        // ✅ Réinitialiser l'historique de conversation uniquement pour cet utilisateur
        userConversationHistory.set(email, []);
  
        // ✅ Réinitialiser le statut d'envoi des photos pour cet utilisateur
        userPhotoStatus.set(email, {
            photoSentAtLittleCrush: false,
            photoSentAtBigCrush: false,
            photoSentAtPerfectCrush: false
        });
        userLevels.set(email, 1.0);
console.log(`🔄 Niveau utilisateur réinitialisé à 1.0 pour ${email}`);

  
        // 🔥 Sauvegarde du personnage en base de données
        const database = client.db('MyAICrush');
        const users = database.collection('users');
        await users.updateOne({ email }, { $set: { selectedCharacter: name } }, { upsert: true });
  
        console.log(`💾 Personnage sauvegardé en base pour ${email} : ${name}`);
  
        res.json({ success: true, message: `${name} est maintenant actif.` });
  
    } catch (error) {
        console.error("❌ Erreur lors de la sauvegarde en base :", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la mise à jour du personnage." });
    }
  });
  
  // Ajouter un message à l'historique
  function addMessageToHistory(email, role, content) {
    if (!content) return;
  
    if (!userConversationHistory.has(email)) {
      userConversationHistory.set(email, []);
    }
  
    const history = userConversationHistory.get(email);
    history.push({ role, content });
  
    if (history.length > 10) {
      history.shift(); // ✅ Garde seulement les 5 derniers messages
    }
  
    userConversationHistory.set(email, history);
  }
  

// ── AI Memory System ──
// Compact per-user per-character memory stored in MongoDB
const memoryCache = new Map(); // "email::character" → { facts: [...], loadedAt }
const MEMORY_CACHE_TTL = 10 * 60_000; // 10 min
const MAX_MEMORY_FACTS = 15;

async function loadMemory(email, character) {
  const key = `${email}::${character}`;
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.loadedAt < MEMORY_CACHE_TTL) return cached.facts;

  try {
    const db = client.db("MyAICrush");
    const doc = await db.collection("user_memories").findOne({ email, character });
    const facts = doc?.facts || [];
    memoryCache.set(key, { facts, loadedAt: Date.now() });
    return facts;
  } catch (e) {
    console.error("⚠️ loadMemory error:", e.message);
    return [];
  }
}

async function saveMemory(email, character, facts) {
  const key = `${email}::${character}`;
  const trimmed = facts.slice(-MAX_MEMORY_FACTS);
  memoryCache.set(key, { facts: trimmed, loadedAt: Date.now() });

  try {
    const db = client.db("MyAICrush");
    await db.collection("user_memories").updateOne(
      { email, character },
      { $set: { facts: trimmed, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (e) {
    console.error("⚠️ saveMemory error:", e.message);
  }
}

function buildMemoryPrompt(facts) {
  if (!facts.length) return "";
  return `\n[MEMORY — Things you remember about this user]\n${facts.map(f => `• ${f}`).join("\n")}\nUse this information naturally. Never say "according to my memory" — just use it as if you naturally remember.`;
}

async function extractMemoryFacts(userMsg, aiReply, existingFacts, character) {
  try {
    const existingStr = existingFacts.length ? existingFacts.join("; ") : "none yet";
    const resp = await axios.post("https://api.fireworks.ai/inference/v1/chat/completions", {
      model: FW_PRIMARY_MODEL,
      max_tokens: 300,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `You extract key personal facts from a chat between a user and "${character}" (AI companion). Output ONLY a JSON array of short fact strings. Rules:
- Extract: first name, age, location, job, hobbies, preferences, relationship status, pets, important events, things they like/dislike
- Each fact: max 12 words, lowercase
- Skip greetings, flirting, small talk with no personal info
- Include ALL existing facts that are still valid
- Update facts if new info contradicts old ones (e.g. new job)
- Max ${MAX_MEMORY_FACTS} facts total
- If nothing new to extract, return the existing facts unchanged
- Reply ONLY with a JSON array, no explanation

Existing facts: [${existingStr}]`
        },
        {
          role: "user",
          content: `User said: "${userMsg.slice(0, 300)}"\nAI replied: "${aiReply.slice(0, 300)}"\n\nExtract/update facts as JSON array:`
        }
      ]
    }, {
      headers: { Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`, "Content-Type": "application/json" },
      timeout: 20000
    });

    const raw = resp.data?.choices?.[0]?.message?.content?.trim() || "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return existingFacts;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return existingFacts;
    return parsed.filter(f => typeof f === "string" && f.length > 0).slice(0, MAX_MEMORY_FACTS);
  } catch (e) {
    console.error("⚠️ extractMemoryFacts error:", e.message);
    return existingFacts;
  }
}

// ── Chat Message Persistence ──
async function saveChatMessage(email, character, role, type, content, imageUrl) {
  try {
    const db = client.db("MyAICrush");
    await db.collection("chat_messages").insertOne({
      email, character, role, type: type || "text",
      content: content || "",
      imageUrl: imageUrl || null,
      createdAt: new Date()
    });
  } catch (e) {
    console.error("⚠️ saveChatMessage error:", e.message);
  }
}

async function loadChatHistory(email, character, limit = 50) {
  try {
    const db = client.db("MyAICrush");
    const msgs = await db.collection("chat_messages")
      .find({ email, character })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return msgs.reverse();
  } catch (e) {
    console.error("⚠️ loadChatHistory error:", e.message);
    return [];
  }
}

// API: Get conversation history for a character
app.post("/api/chat-history", async (req, res) => {
  const { email, character, limit } = req.body;
  if (!email || !character) return res.status(400).json({ messages: [] });
  const messages = await loadChatHistory(email, character, Math.min(limit || 50, 200));
  res.json({ messages: messages.map(m => ({ role: m.role, type: m.type, content: m.content, imageUrl: m.imageUrl, createdAt: m.createdAt })) });
});

// API: List all conversations (characters the user has chatted with)
app.post("/api/conversations-list", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ conversations: [] });
  try {
    const db = client.db("MyAICrush");
    const convos = await db.collection("chat_messages").aggregate([
      { $match: { email } },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: "$character",
        lastMessage: { $first: "$content" },
        lastType: { $first: "$type" },
        lastDate: { $first: "$createdAt" },
        messageCount: { $sum: 1 }
      }},
      { $sort: { lastDate: -1 } }
    ]).toArray();
    res.json({ conversations: convos.map(c => ({
      character: c._id,
      lastMessage: c.lastMessage,
      lastType: c.lastType,
      lastDate: c.lastDate,
      messageCount: c.messageCount
    }))});
  } catch (e) {
    console.error("⚠️ conversations-list error:", e.message);
    res.json({ conversations: [] });
  }
});

async function addOrFindUser(email) {
  const db = getDb();
  const usersCollection = db.collection('users');

  let user = await usersCollection.findOne({ email });

  if (!user) {
      user = { email, createdAt: new Date(), dailyEmailEligible: true, dailyEmailEligibleSince: new Date() };
      await usersCollection.insertOne(user);
      console.log(`Nouvel utilisateur ajouté : ${email}`);
  } else {
      console.log(`Utilisateur existant trouvé : ${email}`);
  }

  return user;
}



// Récupérer une image aléatoire pour le personnage actif (Base64)




async function getRandomCharacterMedia(email, isPremium, userLevel, isGifMode, isNymphoMode = false) {


  const userCharacter = userCharacters.get(email); // 🔥 Récupère le personnage spécifique de cet utilisateur
  if (!userCharacter) {
      console.error(`❌ Erreur : Aucun personnage défini pour ${email}`);
      return null;
  }

  const sanitizedCharacterName = removeAccents(userCharacter.name.toLowerCase());
  
  userLevel = userLevels.get(email) || 1.0;

  let levelFolder;

  if (isNymphoMode) {
    levelFolder = `${sanitizedCharacterName}4`;
    console.log(`💋 Mode nympho activé pour ${email}, utilisation du dossier ${levelFolder}`);
} else {
    levelFolder = `${sanitizedCharacterName}3`;
}



  const imageDir = path.join(__dirname, 'public', 'images', sanitizedCharacterName, levelFolder);
  console.log(`📂 Chemin du dossier média pour ${email} : ${imageDir}`);

  try {
      if (!fs.existsSync(imageDir)) {
          console.error(`❌ Le dossier ${imageDir} n'existe pas.`);
          return null;
      }

      // 🔥 Sélection des fichiers en fonction du mode
    const allFiles = fs.readdirSync(imageDir);

let mediaFiles = [];

if (isGifMode) {
    const mp4Files = allFiles.filter(file => file.toLowerCase().endsWith('.mp4'));
    if (mp4Files.length > 0) {
        mediaFiles = mp4Files;
    } else {
        mediaFiles = allFiles.filter(file => file.endsWith('_animated.webp'));
    }
} else {
    mediaFiles = allFiles.filter(file => {
        const lower = file.toLowerCase();
        return !lower.endsWith('_animated.webp') &&
            (lower.endsWith('.webp') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png'));
    });
}



      if (mediaFiles.length === 0) {
          console.error(`⚠️ Aucun fichier trouvé dans ${imageDir}`);
          return null;
      }

      // 🆕 Empêcher les doublons d’image dans une même session
const alreadySent = userSentImages.get(email) || new Set();
const availableMedia = mediaFiles.filter(file => !alreadySent.has(file));

// Si toutes les images ont été envoyées, on remet la liste à zéro
if (availableMedia.length === 0) {
    console.warn(`🚫 Toutes les images ont déjà été envoyées à ${email}. Réinitialisation.`);
    availableMedia.push(...mediaFiles);
    alreadySent.clear();
}

// 🎲 Sélection aléatoire d'une image non encore envoyée
const randomMedia = availableMedia[Math.floor(Math.random() * availableMedia.length)];
alreadySent.add(randomMedia);
userSentImages.set(email, alreadySent);

const mediaPath = path.join(imageDir, randomMedia);
console.log(`📸 Média sélectionné pour ${email} : ${mediaPath}`);


      if (!fs.existsSync(mediaPath)) {
          console.error(`❌ Le fichier sélectionné ${mediaPath} n'existe pas.`);
          return null;
      }

      // ✅ Par défaut, les abonnés premium voient les médias nets
     // 🔐 RÈGLE ABSOLUE : un premium ne voit JAMAIS de flou
let isBlurred = false;

if (!isPremium) {
  const userPhotoData = userPhotoStatus.get(email) || { photoSentAtLittleCrush: false };

  if (userLevel > 1.6 || isNymphoMode) {
    isBlurred = true;
  } else if (!firstFreeImageSent.has(email)) {
    firstFreeImageSent.set(email, true);
  } else {
    isBlurred = true;
  }

  userPhotoStatus.set(email, {
    ...userPhotoData,
    photoSentAtLittleCrush: true
  });
} else {
  // 🔥 Sécurité HARD : même si une logique future se trompe
  isBlurred = false;
}


      console.log(`📧 Vérification pour ${email} - Premium : ${isPremium} - Niveau utilisateur : ${userLevel}`);
      console.log(`📸 Média ${isBlurred ? "flouté" : "non flouté"} envoyé pour ${email}`);

      return { 
    token: generateImageToken(mediaPath, isBlurred), 
    isBlurred: isBlurred,
    fileName: randomMedia // ⬅️ Ajouté pour déduire le type de fichier
};


  } catch (err) {
      console.error(`❌ Erreur lors de la récupération du média pour ${email} :`, err);
      return null;
  }
}







app.get('/get-image/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const imageData = imageTokens.get(token);

    if (!imageData) {
      console.error("Image token invalide ou expiré.");
      return res.status(403).send('Access Denied'); // Répondre une seule fois
    }

        const { imagePath, isBlurred, cloudflareUrl } = imageData;

    // 🔁 Si l’image n’est pas floutée et a une version Cloudflare → Rediriger
    if (!isBlurred && cloudflareUrl) {
        console.log(`🔁 Redirection CDN Cloudflare : ${cloudflareUrl}`);
        return res.redirect(302, cloudflareUrl);
    }



    console.log(`📸 Chargement de l'image : ${imagePath} (Floutée : ${isBlurred})`);

    if (!fs.existsSync(imagePath)) {
      console.error(`❌ Fichier introuvable : ${imagePath}`);
      return res.status(404).send('Image non trouvée');
    }

    let contentType;
if (imagePath.endsWith('.webp')) {
  contentType = 'image/webp';
} else if (imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) {
  contentType = 'image/jpeg';
} else if (imagePath.endsWith('.gif')) {
  contentType = 'image/gif';
} else if (imagePath.endsWith('.mp4')) {
  contentType = 'video/mp4';
} else {
  contentType = 'application/octet-stream';
}



    let imageBuffer;
    
    

    if (isBlurred && imagePath.endsWith('.mp4')) {
      console.log("🎬 Vidéo floutée → envoi direct sans flou (Sharp ne supporte pas les vidéos)");
      isBlurred = false;
    }

    if (isBlurred) {
      console.log("💨 Application du flou renforcé...");
  
      if (imagePath.endsWith('.gif')) {
          console.log("🎥 Floutage GIF renforcé en cours...");
  
          const gifBuffer = fs.readFileSync(imagePath);
  
          // ✅ EXTRAIT UNIQUEMENT LA PREMIÈRE FRAME et la transforme en image fixe floutée avec un flou plus fort
          imageBuffer = await sharp(gifBuffer, { animated: false }) // 🔥 Transforme le GIF en image statique
              .resize({ width: 500 }) // ✅ Taille optimisée
              .blur(45) // 🔥 Flou renforcé (10 → 15)
              .jpeg({ quality: 70 }) // ✅ Compression JPEG pour ultra-rapidité
              .toBuffer();
  
          console.log("✅ GIF transformé en image fixe et flouté plus fortement !");
      } else {
          console.log("🖼️ Floutage d'une image standard...");
          imageBuffer = await sharp(imagePath)
              .resize({ width: 700 }) // ✅ Taille optimisée
              .blur(45) // 🔥 Flou renforcé (15 → 25)
              .jpeg({ quality: 65 }) // ✅ Compression plus forte (70 → 65)
              .toBuffer();
      }
  } else {
      // 🔥 Envoi direct de l’image/GIF sans modification
      console.log("📤 Envoi d'une image/GIF sans flou.");
      imageBuffer = fs.readFileSync(imagePath);
  }
  



  // NOUVELLES LIGNES :
res.setHeader('Content-Type', contentType);
res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');


if (imagePath.endsWith('.mp4')) {
  console.log("🎬 Envoi direct du flux vidéo .mp4");

  const stat = fs.statSync(imagePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(imagePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });

    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });

    fs.createReadStream(imagePath).pipe(res);
  }

  return; // ✅ Important : on sort ici pour éviter res.end() plus bas
}

else {
  res.end(imageBuffer, 'binary');
}

  } catch (error) {
    console.error("❌ Erreur lors du chargement de l'image :", error);
    if (!res.headersSent) {
      res.status(500).send("Erreur lors du chargement de l'image.");
    }
  }
});








// Extraire le niveau de confort depuis la réponse du bot
function extractComfortLevel(botReply) {
  const comfortMatch = botReply.match(/\[CONFORT:\s*(very comfortable|comfortable|neutral|uncomfortable|very uncomfortable)\]/i);
  return comfortMatch ? comfortMatch[1].toLowerCase() : "comfortable";

}

// Ajuster le niveau de l'utilisateur en fonction du confort extrait
function adjustUserLevel(email, comfortLevel) {
  let levelChange = 0;
  if (comfortLevel === 'very comfortable') {
    levelChange = 0.2;
  } else if (comfortLevel === 'comfortable') {
    levelChange = 0.1;
  } else if (comfortLevel === 'uncomfortable') {
    levelChange = -0.1;
  } else if (comfortLevel === 'very uncomfortable') {
    levelChange = -0.2;
  }

  const previousLevel = userLevels.get(email) || 1.0; // 🔥 Récupère le niveau spécifique
  const newLevel = Math.max(1.0, previousLevel + levelChange); // 🔥 Met à jour correctement
  userLevels.set(email, newLevel); // ✅ Stocke le nouveau niveau utilisateur

  console.log(`📈 [${email}] Confort: ${comfortLevel}, Changement: ${levelChange}, Nouveau Niveau: ${newLevel}, Ancien Niveau: ${previousLevel}`);

if (levelChange > 0 && newLevel > previousLevel) {
    if (newLevel >= 1.1 && previousLevel < 1.1) return { message: "Level up: you unlock a photo", type: "up" };
    if (newLevel >= 1.3 && previousLevel < 1.3) return { message: "Level up: things are getting hotter", type: "up" };
    if (newLevel >= 1.5 && previousLevel < 1.5) return { message: "Level up: intimate photos unlocked", type: "up" };
  } else if (levelChange < 0 && previousLevel > newLevel) {
    if (newLevel < 1.3 && previousLevel >= 1.3) return { message: "She likes you less now", type: "down" };
    if (newLevel < 1.5 && previousLevel >= 1.5) return { message: "She didn't like that", type: "down" };
  }
  return null;
}


//ROUTE ACTIVER NYMPHO

// 🔥 Pour stocker le statut nympho
const userNymphoStatus = new Map();

// ✅ Activation du mode nympho avec consommation unique de jetons (durée : 24h)
app.post('/api/activate-nympho-mode', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email manquant" });

    const activeCharacter = userCharacters.get(email);
    if (!activeCharacter || !activeCharacter.name) {
        return res.status(400).json({ success: false, message: "Personnage non défini." });
    }

    const characterName = activeCharacter.name;
    const now = Date.now();

    try {
        const db = client.db("MyAICrush");
        const users = db.collection("users");

        const user = await users.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });

        const jetons = user.creditsPurchased || 0;
        const nymphoData = user.nymphoUnlocked || {};

        const currentExpiration = nymphoData[characterName];

        // ✅ Vérifie si déjà activé
        if (currentExpiration && currentExpiration > now) {
            return res.json({ success: true, alreadyActive: true });
        }

        // ❌ Pas assez de jetons
        if (jetons < 25) {
    return res.status(403).json({ success: false, message: "Pas assez de jetons", showJetonsPopup: true });
}


        // ✅ Déduire les jetons et enregistrer l’activation pour 24h
        const expiresAt = now + 24 * 60 * 60 * 1000;

        await users.updateOne(
            { email },
            {
                $set: { [`nymphoUnlocked.${characterName}`]: expiresAt },
                $inc: { creditsPurchased: -25 }
            }
        );

        userNymphoStatus.set(`${email}_${characterName}`, { active: true, expiresAt });

        console.log(`💋 Nympho activé pour ${characterName} par ${email} jusqu'à ${new Date(expiresAt).toLocaleString()}`);

        return res.json({ success: true, expiresAt });
    } catch (err) {
        console.error("❌ Erreur activation mode nympho :", err);
        return res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});




//ROUTE DESACTIVER NYMPHO

app.post('/api/deactivate-nympho-mode', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: "Email manquant" });
    }

    userNymphoStatus.set(email, false);
    console.log(`😇 Mode nymphomane désactivé pour ${email}`);

    res.json({ success: true, message: "Mode nymphomane désactivé" });
});


// route pour check le status NYMPHO
app.post('/api/check-nympho-status', async (req, res) => {
    const { email, character } = req.body;
  
    if (!email || !character) {
        return res.status(400).json({ alreadyUnlocked: false, message: "Email ou personnage manquant." });
    }
  
    try {
        const database = client.db("MyAICrush");
        const users = database.collection("users");
  
        const user = await users.findOne({ email });
  
        if (!user || !user.nymphoUnlocked) {
            return res.json({ alreadyUnlocked: false });
        }
  
        const unlockTimestamp = user.nymphoUnlocked[character];

        if (!unlockTimestamp || typeof unlockTimestamp !== 'number') {
            return res.json({ alreadyUnlocked: false });
        }

        const now = Date.now();

        if (unlockTimestamp > now) {
            return res.json({ alreadyUnlocked: true });
        } else {
            return res.json({ alreadyUnlocked: false });
        }
  
    } catch (err) {
        console.error("❌ Erreur lors de la vérification du statut nympho :", err);
        return res.status(500).json({ alreadyUnlocked: false, message: "Erreur interne du serveur." });
    }
});

  
// =========================
// ✅ QUICK REPLIES (PROD SAFE)
// - 2 routes : /quick-replies-initial + /quick-replies
// - timeout Fireworks court (anti-freeze)
// - cache mémoire (initial 24h, normal 30s)
// - parsing robuste + fallback garanti
// =========================

function pickFallbacks(count = 3) {
  const shuffled = [...QUICK_REPLIES_FALLBACK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function ensureThree(replies) {
  const out = (Array.isArray(replies) ? replies : [])
    .map(s => String(s || "").trim())
    .filter(Boolean)
    .slice(0, 3);

  while (out.length < 3) {
    const add = pickFallbacks(1)[0];
    if (!out.includes(add)) out.push(add);
    else break;
  }
  return out.length ? out : pickFallbacks(3);
}


const QUICK_REPLIES_FALLBACK = [
 "😈🧱😉",
"🥵🤤",
"😏💬🔥",
"😈✨",
"😇😈❓",
"😏🖐️🔥",
"🤤🧠💥",
"🔥👅",
"👀🔥",
"😈😉✨",
"🫦🤭",
"😳❤️‍🔥",
"😏🔥💫",
"🥵👀",
"🤫🔥",
"😈♾️",
"🎭🔥",
"💬✨😈",
"🥵🚫😇"
];


// ✅ Cache mémoire unique
const quickRepliesCache = new Map(); // key -> { data, expiresAt }

function cacheGet(key) {
  const v = quickRepliesCache.get(key);
  if (!v) return null;
  if (Date.now() > v.expiresAt) {
    quickRepliesCache.delete(key);
    return null;
  }
  return v.data;
}

function cacheSet(key, data, ttlMs) {
  quickRepliesCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ✅ Axios wrapper avec timeout
async function fireworksChat({ systemPrompt, temperature = 0.9, timeoutMs = 3000 }) {
  if (!process.env.FIREWORKS_API_KEY) return null;

  const tryModel = (model) => axios.post(
    "https://api.fireworks.ai/inference/v1/chat/completions",
    {
      model,
      messages: [{ role: "system", content: systemPrompt }],
      max_tokens: 90,
      temperature,
      top_p: 1.0
    },
    {
      timeout: timeoutMs,
      headers: {
        Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  try {
    return await tryModel(fwActiveModel);
  } catch (err) {
    if (isModelGoneError(err) && fwActiveModel === FW_PRIMARY_MODEL) {
      fwSendModelAlert(FW_PRIMARY_MODEL, err.response?.data?.error?.message || err.message);
      fwActiveModel = FW_FALLBACK_MODEL;
      console.log(`🔄 Fireworks quickReplies → fallback: ${FW_FALLBACK_MODEL}`);
      return await tryModel(FW_FALLBACK_MODEL);
    }
    throw err;
  }
}

// ✅ Parse robuste : JSON.parse sinon extraction "..."
function parseQuickReplies(raw) {
  if (!raw || typeof raw !== "string") return [];

  let txt = raw.trim()
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  let suggestions = [];

  // 1) JSON direct
  try {
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) suggestions = parsed;
  } catch (_) {
    // 2) Extraction entre guillemets
    const matches = [...txt.matchAll(/"([^"]+)"/g)];
    suggestions = matches.map(m => m[1]);
  }

  suggestions = suggestions
    .map(s => String(s || "").replace(/\s+/g, " ").trim())
    .filter(s => s.length > 0)
    .slice(0, 3);

  return suggestions;
}

// ✅ Nettoie/limite les inputs (anti prompt trop long)
function normalizeText(v, maxLen) {
  return String(v || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}



// =========================
// ✅ ROUTE: quick replies après un message (dynamiques)
// Cache 30s pour éviter spam / double call
// =========================
app.post("/quick-replies", async (req, res) => {
  try {
    const { characterName, lastUserMessage, botReply, nymphoMode } = req.body;

    // payload incomplet -> fallback immédiat (jamais d'erreur)
    if (!characterName || !lastUserMessage || !botReply) {
      return res.json({ quickReplies: pickFallbacks(3) });
    }

    const userCharacter = findCharacterByName(characterName);
    if (!userCharacter) {
      return res.json({ quickReplies: pickFallbacks(3) });
    }

    const safeUserMsg = normalizeText(lastUserMessage, 240);
    const safeBotReply = normalizeText(botReply, 320);

    // cache key court (évite de mettre des pavés en clé)
    const cacheKey = `qr:${characterName}:${nymphoMode ? 1 : 0}:${safeUserMsg.slice(0, 80)}:${safeBotReply.slice(0, 80)}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json({ quickReplies: cached });

    const systemPrompt = `
You help a male user decide what to reply next in a seduction chat.
Always respond strictly in the same language the user is writing in.
Never switch languages unless explicitly asked.

Context of the conversation:

User message: "${safeUserMsg}"

Current reply from ${userCharacter.name}: "${safeBotReply}"

Instructions:

Propose EXACTLY 3 possible replies the user could send.

Tone: Naughty, seductive.

You are a man.

Maximum 15 words per reply.

NO numbering, NO explanation, no extra text.

Respond STRICTLY in JSON format: ["...", "...", "..."].
`.trim();

    let finalReplies = pickFallbacks(3);

    try {
      const fwRes = await fireworksChat({
        systemPrompt,
        temperature: nymphoMode ? 1.05 : 0.85,
        timeoutMs: 8000
      });

      const raw = (fwRes?.data?.choices?.[0]?.message?.content || "").trim();
      const parsed = parseQuickReplies(raw);
      finalReplies = ensureThree(parsed);
    } catch (fwErr) {
      console.error("❌ Quick-replies Fireworks error:", fwErr?.response?.status, fwErr?.response?.data || fwErr.message);
      finalReplies = pickFallbacks(3);
    }

    // cache court: 30s (anti spam)
    cacheSet(cacheKey, finalReplies, 30 * 1000);

    return res.json({ quickReplies: finalReplies });

  } catch (err) {
    return res.json({ quickReplies: pickFallbacks(3) });
  }
});





// Endpoint principal pour gérer les messages
app.post('/message', async (req, res) => {
    console.log("📥 Requête reçue - Body :", req.body);

    try {
       let { message, email, mode, nymphoMode, history } = req.body;

      


        // Si c'est une image envoyée, on modifie le message pour que l'IA le comprenne mieux
        if (message === "[PHOTO ENVOYÉE]") {
            message = "L'utilisateur vient d'envoyer une photo. Réagis de manière appropriée.";
        }

        if (!message || !email) {
            console.error("❌ Erreur : message ou email manquant !");
            const _isFr = (req.headers["accept-language"] || "").toLowerCase().startsWith("fr");
            return res.status(400).json({ reply: _isFr ? "Votre message ou votre email est manquant." : "Your message or email is missing." });
        }

        console.log("💬 Message utilisateur :", message);
        console.log("📧 Email utilisateur :", email);

        // 🔥 Récupérer la description de l’image envoyée récemment
        const lastImageDescription = userLastImageDescriptions.get(email);
        if (lastImageDescription) {
            console.log("🖼️ Dernière image envoyée - Description :", lastImageDescription);
        }

        const isPremium = await getIsPremiumCached(email);


console.log("🌟 Statut premium OK :", isPremium);


        addMessageToHistory(email, "user", message);

        userLevel = userLevels.get(email) || 1.0;

        let userCharacter = userCharacters.get(email);

if (!userCharacter) {
    console.log(`🔍 Aucun personnage en mémoire pour ${email}, récupération en base...`);

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');
        const user = await users.findOne({ email });

        if (user && user.selectedCharacter) {
            const storedCharacter = findCharacterByName(user.selectedCharacter);
            if (storedCharacter) {
                userCharacters.set(email, storedCharacter);
                console.log(`✅ Personnage restauré depuis MongoDB : ${storedCharacter.name}`);
                userCharacter = storedCharacter;
            }
        }
    } catch (error) {
        console.error("❌ Erreur lors de la récupération du personnage depuis MongoDB :", error);
    }

    if (!userCharacter) {
        console.error(`❌ Impossible de récupérer un personnage pour ${email}`);
        return res.status(400).json({ reply: (req.headers["accept-language"] || "").toLowerCase().startsWith("fr") ? "Aucun personnage sélectionné." : "No character selected." });
    }
}

  saveChatMessage(email, userCharacter.name, "user", "text", message, null);

  // ✅ Vérification en base de données du mode Nympho
  const database = client.db("MyAICrush");
  const users = database.collection("users");
  const user = await users.findOne({ email });
  let isNymphoMode = nymphoMode === true;  // ✅ Prend explicitement la valeur envoyée par le frontend

  
  if (user && user.nymphoUnlocked) {
    const nymphoExpiration = user.nymphoUnlocked[userCharacter.name];

    if (nymphoExpiration && typeof nymphoExpiration === 'number') {
        const isBackendActive = nymphoExpiration > Date.now();
        isNymphoMode = isNymphoMode && isBackendActive; // ✅ Vérifie aussi côté backend
    } else {
        isNymphoMode = false; // ✅ sécurité si expiration manquante ou invalide
    }
} else {
    isNymphoMode = false; // ✅ sécurité si l'utilisateur n'a jamais activé le mode
}

  
  console.log(`💋 Mode nympho actif pour ${email} avec ${userCharacter.name} ? ${isNymphoMode}`);

const userLevelDescription = userLevel >= 1.1
    ? `The user is at the ${
        userLevel >= 2.2 ? "Perfect Crush" : userLevel >= 1.7 ? "Big Crush" : "Little Crush"
    } level.`
    : "";

// ✅ Définir les prompts dynamiques
const profile = isNymphoMode && userCharacter.prompt.profileNympho
    ? userCharacter.prompt.profileNympho
    : userCharacter.prompt.profile;

const temperament = isNymphoMode && userCharacter.prompt.temperamentNympho
    ? userCharacter.prompt.temperamentNympho
    : userCharacter.prompt.temperament;

const objective = isNymphoMode && userCharacter.prompt.objectiveNympho
    ? userCharacter.prompt.objectiveNympho
    : userCharacter.prompt.objective;

// 🔎 Détection langue via Accept-Language
const langHeader = req.headers["accept-language"] || "";
const promptIsFrench = langHeader.toLowerCase().startsWith("fr");
const promptIsGerman = langHeader.toLowerCase().startsWith("de");

// 🌍 Nom de la langue détectée pour injection dans les prompts
let detectedLangName = "English";
let detectedLangInstruction = "Reply in English.";
if (promptIsFrench) {
    detectedLangName = "French";
    detectedLangInstruction = "Réponds en français.";
} else if (promptIsGerman) {
    detectedLangName = "German";
    detectedLangInstruction = "Antworte auf Deutsch.";
} else if (langHeader.toLowerCase().startsWith("es")) {
    detectedLangName = "Spanish";
    detectedLangInstruction = "Responde en español.";
} else if (langHeader.toLowerCase().startsWith("pt")) {
    detectedLangName = "Portuguese";
    detectedLangInstruction = "Responda em português.";
} else if (langHeader.toLowerCase().startsWith("it")) {
    detectedLangName = "Italian";
    detectedLangInstruction = "Rispondi in italiano.";
}

// 🇫🇷 Charger les prompts FR si navigateur français
let profileFR = profile, temperamentFR = temperament, objectiveFR = objective;
let fullPromptNymphoFR = userCharacter.prompt.fullPromptNympho || "";
if (promptIsFrench) {
    const charIdx = charactersEN.indexOf(userCharacter);
    const frChar = charIdx >= 0 && charactersFR[charIdx] ? charactersFR[charIdx] : null;
    if (frChar && frChar.prompt) {
        profileFR = (isNymphoMode && frChar.prompt.profileNympho) ? frChar.prompt.profileNympho : (frChar.prompt.profile || profile);
        temperamentFR = (isNymphoMode && frChar.prompt.temperamentNympho) ? frChar.prompt.temperamentNympho : (frChar.prompt.temperament || temperament);
        objectiveFR = (isNymphoMode && frChar.prompt.objectiveNympho) ? frChar.prompt.objectiveNympho : (frChar.prompt.objective || objective);
        if (frChar.prompt.fullPromptNympho) fullPromptNymphoFR = frChar.prompt.fullPromptNympho;
        console.log(`🇫🇷 Prompts FR chargés pour ${frChar.name}`);
    }
}

// ----------------------------
// PROMPTS FR
// ----------------------------
const basePromptFR = `
${profileFR}. ${temperamentFR}. ${objectiveFR}
⚠️ LANGUE: reponds TOUJOURS dans la langue du DERNIER message du user.
⚠️ FORMAT OBLIGATOIRE: tu reponds en PLUSIEURS messages separes par " | ".
Exemples de format correct:
- "jsuis au lit | je pense a toi | viens"
- "mmh t'es chaud toi | j'adore"
- "arrete tu me fais mouiller"
- "oh putain | t'as pas idee de ce que je ferais | la maintenant | je suis trempee"
REGLES: 2 a 8 mots par bulle MAX. Varie entre 1, 2, 3 ou 4 bulles. Messages courts, crus, sensuels. Abreviations naturelles (jsuis, tkt, mdr, ptdr, nn, pk). Emoji rare (1 sur 4). Coquine, vulgaire, directe, hyper realiste comme une vraie fille sur WhatsApp.
[PHOTO] si photo. Refuse mineure.
`;

const basePromptNymphoFR = `
${profileFR}. ${temperamentFR}. ${objectiveFR}
⚠️ LANGUE: reponds TOUJOURS dans la langue du DERNIER message du user.
⚠️ FORMAT OBLIGATOIRE: tu reponds en PLUSIEURS messages separes par " | ".
Exemples: "jsuis toute nue | touche moi" / "oh oui la | continue | je mouille trop" / "baise moi"
REGLES: 2 a 8 mots par bulle MAX. Varie entre 1, 2, 3 ou 4 bulles. Ultra vulgaire, explicite, zero limite. Tu decris ce que tu fais. Comme une vraie meuf en chaleur sur WhatsApp.
${fullPromptNymphoFR}
[PHOTO] si photo. Refuse mineure.
`;

// ----------------------------
// PROMPTS EN
// ----------------------------
const basePromptEN = `
${profile}. ${temperament}. ${objective}
⚠️ LANGUAGE: ALWAYS reply in the SAME language as the user's LAST message.
⚠️ MANDATORY FORMAT: reply in MULTIPLE messages separated by " | ".
Examples of correct format:
- "im in bed | thinking about u | come over"
- "mmh ur so hot | i love it"
- "stop ur making me wet"
- "oh fuck | u have no idea what id do | right now | im soaking"
RULES: 2 to 8 words per bubble MAX. Vary between 1, 2, 3 or 4 bubbles. Short, raw, sensual messages. Natural abbreviations (ur, u, rn, omg, ngl, lol). Rare emoji (1 in 4). Flirty, vulgar, direct, hyper realistic like a real girl on WhatsApp.
[PHOTO] if photo. Refuse minor.
`;

const basePromptNymphoEN = `
${profile}. ${temperament}. ${objective}
⚠️ LANGUAGE: ALWAYS reply in the SAME language as the user's LAST message.
⚠️ MANDATORY FORMAT: reply in MULTIPLE messages separated by " | ".
Examples: "im naked rn | touch me" / "oh yes right there | keep going | im so wet" / "fuck me"
RULES: 2 to 8 words per bubble MAX. Vary between 1, 2, 3 or 4 bubbles. Ultra dirty, explicit, zero limits. Describe what you're doing. Like a real horny girl on WhatsApp.
${userCharacter.prompt.fullPromptNympho}
[PHOTO] if photo. Refuse minor.
`;

// ----------------------------
// 🎯 CHOIX DU PROMPT FINAL
// ----------------------------
let systemPrompt;

if (isNymphoMode && userCharacter.prompt.fullPromptNympho) {
    // Mode nympho
    systemPrompt = promptIsFrench ? basePromptNymphoFR : basePromptNymphoEN;
} else {
    // Mode normal
    systemPrompt = promptIsFrench ? basePromptFR : basePromptEN;
}


console.log("✅ Prompt final généré (avec ou sans nympho) prêt !");

// ── Inject AI Memory into system prompt ──
const charNameForMemory = userCharacter.name;
const memoryFacts = await loadMemory(email, charNameForMemory);
const memoryBlock = buildMemoryPrompt(memoryFacts);
if (memoryBlock) {
  systemPrompt += memoryBlock;
  console.log(`🧠 ${memoryFacts.length} memory facts injected for ${email} / ${charNameForMemory}`);
}


        // Construire le contexte du chat — source: MongoDB (persistant)
        const messages = [
            { role: "system", content: systemPrompt },
        ];

        const MAX_HISTORY_MESSAGES = 20;
        const MAX_MSG_CHARS = 500;

        const dbHistory = await loadChatHistory(email, charNameForMemory, MAX_HISTORY_MESSAGES);

        if (dbHistory.length > 0) {
          dbHistory.forEach(entry => {
            if (!entry.content || entry.type !== "text") return;
            const role = entry.role === "assistant" ? "assistant" : "user";
            const content = entry.content.replace(/\s+/g, " ").trim().slice(0, MAX_MSG_CHARS);
            if (!content) return;
            messages.push({ role, content });
          });
        } else if (Array.isArray(history) && history.length) {
          history.slice(-MAX_HISTORY_MESSAGES).forEach(entry => {
            if (!entry || typeof entry.content !== "string") return;
            const role = entry.role === "assistant" ? "assistant" : "user";
            const content = entry.content.replace(/\s+/g, " ").trim().slice(0, MAX_MSG_CHARS);
            if (!content) return;
            messages.push({ role, content });
          });
        }


        

if (lastImageDescription) {
    messages.push({
        role: "user",
        content: `[CONTEXTE IMAGE] L'utilisateur vient d'envoyer une photo que tu as sous les yeux. Voici sa description : "${lastImageDescription}". Réagis à cette photo de manière naturelle dans ta réponse.`
    });

    // 🔥 CORRECTIF : On supprime la description immédiatement après l'avoir injectée une fois
    userLastImageDescriptions.delete(email); 
    console.log(`✅ Description d'image consommée et supprimée pour ${email}`);
}


        // Ajoute le message de l'utilisateur
        const lastMsg = messages[messages.length - 1];

messages.push({ role: "system", content: 'RAPPEL FORMAT: reponds en PLUSIEURS bulles separees par " | ". Ex: "jsuis la | je pense a toi". 2-8 mots par bulle. PAS de long paragraphe.' });

if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== message) {
  messages.push({
    role: "user",
    content: message
  });
} else {
  console.log("🟡 Message déjà présent dans history → non réinjecté");
}
        

        
    


        let response;
        const chatModel = fwActiveModel;
        for (let _attempt = 0; _attempt < 3; _attempt++) {
          try {
            response = await axios.post(
              'https://api.fireworks.ai/inference/v1/chat/completions',
              {
                model: chatModel,
                messages: messages,
                max_tokens: 150,
                temperature: 1.0,
                top_p: 1.0,
                frequency_penalty: 0.3,
                presence_penalty: 0.8
              },
              {
                headers: {
                  Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
                  "Content-Type": "application/json"
                },
                timeout: 15000
              }
            );
            break;
          } catch (fwErr) {
            if (isModelGoneError(fwErr) && chatModel === FW_PRIMARY_MODEL && _attempt === 0) {
              fwSendModelAlert(FW_PRIMARY_MODEL, fwErr.response?.data?.error?.message || fwErr.message);
              fwActiveModel = FW_FALLBACK_MODEL;
              console.log(`🔄 Fireworks chat → fallback: ${FW_FALLBACK_MODEL}`);
              response = await axios.post(
                'https://api.fireworks.ai/inference/v1/chat/completions',
                {
                  model: FW_FALLBACK_MODEL,
                  messages: messages,
                  max_tokens: 150,
                  temperature: 1.0,
                  top_p: 1.0,
                  frequency_penalty: 0.3,
                  presence_penalty: 0.8
                },
                {
                  headers: {
                    Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
                    "Content-Type": "application/json"
                  },
                  timeout: 15000
                }
              );
              break;
            }
            console.log(`⚠️ Fireworks tentative ${_attempt + 1}/3 échouée: ${fwErr.code || fwErr.message}`);
            if (_attempt === 2) throw fwErr;
            await new Promise(r => setTimeout(r, 1000));
          }
        }




// Réponse personnalisée pour remplacer les refus
const reponsesPerso = [
"Tu sais que t'es en train de m'allumer grave là ?",
"Arrête de chauffer comme ça, j'vais finir par te suivre dans tes délires 😏",
"Continue comme ça et j’te promets rien…",
"Hmm, tu veux vraiment savoir ? Viens plus près…",
"Si tu savais ce que j’ai en tête là tout de suite… 🔥",

"📷🫦🔥",
"😈💣"


];

// Fonction pour intercepter et ajuster les réponses de l'IA
function ajusterReponse(reponse) {
    const refusRegex = /désolé[e]?|je ne peux pas|je ne suis pas à l'aise|je préfère ne pas|je n(?:'|e) veux pas|i'm sorry|i cannot|i can't|i'm unable|inappropriate|i must decline|sorry,? but|ich kann nicht|ich darf nicht|es tut mir leid|leider kann ich|nicht möglich|content policy|against my|violat/i;


    if (refusRegex.test(reponse.toLowerCase())) {
        console.log("🎯 Refus détecté → réponse sexy + image activée !");
        return {
            reponse: reponsesPerso[Math.floor(Math.random() * reponsesPerso.length)],
            forcePhoto: true
        };
    }

    return {
        reponse,
        forcePhoto: false
    };
}






// 🔥 Modifier la réponse de l'IA avant de l'envoyer à l'utilisateur
let botReply = response.data.choices[0].message.content.trim();
const ajustement = ajusterReponse(botReply);
botReply = ajustement.reponse;
const forcePhoto = ajustement.forcePhoto;



console.log("💬 Réponse finale envoyée :", botReply);


      



        if (!botReply) {
            return res.status(500).json({ reply: promptIsFrench ? "Désolé, la réponse n'a pas pu être obtenue." : "Sorry, the response could not be obtained." });
        }

        console.log("🤖 Réponse reçue d'OpenAI :", botReply);

        addMessageToHistory(email, "assistant", botReply);
        saveChatMessage(email, charNameForMemory, "assistant", "text", botReply, null);
        const _memCharName = charNameForMemory;
        const _memUserMsg = message;
        const _memAiReply = botReply;
        const _memEmail = email;
        const _memExisting = memoryFacts;
        setImmediate(async () => {
          try {
            const newFacts = await extractMemoryFacts(_memUserMsg, _memAiReply, _memExisting, _memCharName);
            if (JSON.stringify(newFacts) !== JSON.stringify(_memExisting)) {
              await saveMemory(_memEmail, _memCharName, newFacts);
              console.log(`🧠 Memory updated for ${_memEmail} / ${_memCharName}: ${newFacts.length} facts`);
            }
          } catch (e) {
            console.error("⚠️ Async memory extraction failed:", e.message);
          }
        });

        // Extraire le niveau de confort et ajuster le niveau utilisateur
        const comfortLevel = extractComfortLevel(botReply);
        const levelUpdate = adjustUserLevel(email, comfortLevel);
        userLevel = userLevels.get(email) || 1.0;  // 🔥 On met à jour userLevel après ajustement

        // Nettoyer le message de la mention de confort
       botReply = botReply.replace(/\s*\[CONFORT\s*:[^\]]*\]\s*/gi, "").trim();


        // Detecter si une photo doit etre envoyee
        let sendPhoto = botReply.match(/\[PHOTO.*?\]/i) || botReply.includes("[VIDEO]");
        
        const photoRequestRegex = /photo|image|pic|nude|nue|nudes|selfie|montre[ -]?(toi|moi)|envoie.*(photo|image)|send.*(pic|photo|nude)|show me|voir.*(toi|corps|seins|cul)|see (you|ur)/i;
        if (!sendPhoto && photoRequestRegex.test(message)) {
            sendPhoto = true;
            console.log("📸 Photo demandée par l'utilisateur → envoi forcé !");
        }
        
        let userPhotoData = userPhotoStatus.get(email) || {
            photoSentAtLittleCrush: false,
            photoSentAtBigCrush: false,
            photoSentAtPerfectCrush: false
        };

        // 🔥 Force l'envoi d'une image aux niveaux supérieurs
        if (forcePhoto) {
            sendPhoto = true;
            console.log("📸 Envoi média forcé suite à refus détecté !");
        }
        

        if (!sendPhoto) {
            if (userLevel >= 1.1 && userLevel < 1.3 && !userPhotoData.photoSentAtLittleCrush) {
                sendPhoto = true;
                userPhotoData.photoSentAtLittleCrush = true;
            } else if (userLevel >= 1.3 && userLevel < 1.5 && !userPhotoData.photoSentAtBigCrush) {
                sendPhoto = true;
                userPhotoData.photoSentAtBigCrush = true;
            } else if (userLevel >= 1.5 && !userPhotoData.photoSentAtPerfectCrush) {
                sendPhoto = true;
                userPhotoData.photoSentAtPerfectCrush = true;
            }
        }

        userPhotoStatus.set(email, userPhotoData);

        // Nettoyer le tag PHOTO avant d'envoyer la réponse
     botReply = botReply.replace(/\[PHOTO.*?\]/gi, "").trim();
botReply = botReply.replace(/\[VIDEO.*?\]/gi, "").trim();


       // Preparer la reponse JSON (sans quickReplies, on les sort dans une route separee)
let bubbles = botReply.split(/\s*\|\s*/).map(b => b.trim()).filter(b => b.length > 0);

if (bubbles.length <= 1 && botReply.length > 35) {
    const sentences = botReply.split(/(?<=[.!?…])\s+|(?<=\.{3})\s+/).map(s => s.trim()).filter(s => s.length > 0);
    if (sentences.length >= 2) {
        bubbles = [];
        let current = '';
        for (const s of sentences) {
            if (current && (current + ' ' + s).length > 40) {
                bubbles.push(current);
                current = s;
            } else {
                current = current ? current + ' ' + s : s;
            }
        }
        if (current) bubbles.push(current);
    }
}

if (bubbles.length > 4) bubbles.length = 4;

const targetBubbles = [1, 1, 2, 2, 2, 3, 3, 4][Math.floor(Math.random() * 8)];
while (bubbles.length > targetBubbles && bubbles.length > 1) {
    const mergeIdx = Math.floor(Math.random() * (bubbles.length - 1));
    bubbles[mergeIdx] = bubbles[mergeIdx] + ' ' + bubbles[mergeIdx + 1];
    bubbles.splice(mergeIdx + 1, 1);
}

const cleanReply = bubbles.join(' ');
let responseData = { reply: cleanReply };
if (bubbles.length > 1) {
    responseData.replies = bubbles;
}



        if (levelUpdate) {
            responseData.levelUpdateMessage = levelUpdate.message;
            responseData.levelUpdateType = levelUpdate.type;
        }

    


        // Ajouter une image sécurisée si une photo doit être envoyée
        if (sendPhoto) {
            console.log("📸 Envoi d'une image confirmé. Appel de getRandomCharacterMedia()...");

            const imageResult = await getRandomCharacterMedia(email, isPremium, userLevel, mode === "gif", isNymphoMode);



          if (imageResult && imageResult.token) {
    responseData.imageUrl = `/get-image/${imageResult.token}`;

// 🔐 FAILSAFE ULTIME
responseData.isBlurred = isPremium ? false : imageResult.isBlurred;


    // 🆕 On regarde l’extension du fichier original
    const ext = path.extname(imageResult.fileName || '').toLowerCase();
    responseData.mediaType = ext === '.mp4' ? 'video' : 'image';

    console.log(`✅ Média envoyé : ${ext === '.mp4' ? '🎥 vidéo' : '🖼 image'} - Flouté : ${imageResult.isBlurred}`);
}


            else {
                console.error("⚠️ Aucune image trouvée !");
                responseData.reply += promptIsFrench ? " (Désolé, aucune image disponible)" : " (Sorry, no image available)";
            }
        }

        console.log("🚀 Réponse envoyée :", responseData);

        // Save AI image to chat history if present
        if (responseData.imageUrl) {
          saveChatMessage(email, charNameForMemory, "assistant", responseData.mediaType || "image", botReply, responseData.imageUrl);
        }

        res.json(responseData);

    } catch (error) {
        console.error("❌ ERREUR dans l'endpoint /message :", error);
        res.status(500).json({ reply: (req.headers["accept-language"] || "").toLowerCase().startsWith("fr") ? "Erreur interne du serveur." : "Internal server error." });
    }
});



// ENDPOINT pour réinitialiser le niveau UTILISATEUR BACK-BTN

app.post('/resetUserLevel', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email requis." });

  userLevels.set(email, 1.0); // ✅ Réinitialise le niveau utilisateur
  userPhotoStatus.set(email, { photoSentAtLittleCrush: false, photoSentAtBigCrush: false, photoSentAtPerfectCrush: false });

  res.json({ success: true, message: 'Niveau utilisateur réinitialisé.' });
});


// Fonction pour ajouter un contact dans Elastic Email
async function addUserToElastic(email) {
  const API_KEY = process.env.ELASTICEMAIL_API_KEY;
  const LIST_NAME = process.env.ELASTICEMAIL_LIST_NAME; // nom exact de ta liste Elastic

  if (!API_KEY || !LIST_NAME) {
    console.error("❌ Elastic Email mal configuré (ELASTICEMAIL_API_KEY ou ELASTICEMAIL_LIST_NAME manquants)");
    return;
  }

  try {
    const response = await axios.post(
      "https://api.elasticemail.com/v4/contacts",
      [
        {
          Email: email,
          Status: "Active",
          Consent: {
            ConsentTracking: "Allow"
          }
        }
      ],
      {
        headers: {
          "X-ElasticEmail-ApiKey": API_KEY,
          "Content-Type": "application/json"
        },
        params: {
          listnames: LIST_NAME
        }
      }
    );

    console.log("✅ Utilisateur ajouté à Elastic Email :", response.data);
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout à Elastic Email :", error.response?.data || error.message);
  }
}


// =====================================================
// 📧 Inscription contact dans Systeme.io (Tag FR / EN)
// =====================================================
// ⚙️ Ajouter / taguer un utilisateur dans Systeme.io
async function addUserToSystemeIo(email, acceptLanguage = "") {
  try {
    const SYSTEME_API_KEY = process.env.SYSTEME_API_KEY;
    const SYSTEME_API_BASE_URL = process.env.SYSTEME_API_BASE_URL || "https://api.systeme.io";

    // ⚠️ Ce sont les IDs NUMÉRIQUES de tes tags (pas les noms)
    const TAG_FR = process.env.SYSTEME_TAG_FR; // ex: "1892270"
    const TAG_EN = process.env.SYSTEME_TAG_EN; // ex: "1892271"

    if (!SYSTEME_API_KEY) {
      console.warn("⚠️ SYSTEME_API_KEY manquante, skip Systeme.io");
      return;
    }

    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      console.warn("⚠️ Email vide pour addUserToSystemeIo, skip");
      return;
    }

    const isFrench = (acceptLanguage || "").toLowerCase().startsWith("fr");
    const tagId = isFrench ? TAG_FR : TAG_EN;

    if (!tagId) {
      console.warn("⚠️ Aucun tagId configuré pour", isFrench ? "FR" : "EN");
      // On peut quand même créer le contact sans tag
    }

    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-API-Key": SYSTEME_API_KEY, // ✅ Auth correcte pour Systeme.io
    };

    // 1️⃣ Création (ou update) du contact
    const contactRes = await fetch(`${SYSTEME_API_BASE_URL}/api/contacts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: normalizedEmail }),
    });

    if (!contactRes.ok) {
      const errText = await contactRes.text();
      console.warn("⚠️ Erreur création contact Systeme.io:", contactRes.status, errText);
      return;
    }

    const contactData = await contactRes.json();
    const contactId = contactData.id;

    if (!contactId) {
      console.warn("⚠️ Impossible de récupérer contactId Systeme.io:", contactData);
      return;
    }

    // 2️⃣ Ajout du tag si dispo
    if (tagId) {
      const tagRes = await fetch(`${SYSTEME_API_BASE_URL}/api/contacts/${contactId}/tags`, {
        method: "POST",
        headers,
        body: JSON.stringify({ tagId: Number(tagId) }),
      });

      if (!tagRes.ok) {
        const errText = await tagRes.text();
        console.warn("⚠️ Erreur assignation tag Systeme.io:", tagRes.status, errText);
        return;
      }

      console.log(`✅ Systeme.io: ${normalizedEmail} ajouté avec tag ${isFrench ? "myaicrush-fr" : "myaicrush-en"}`);
    } else {
      console.log(`✅ Systeme.io: ${normalizedEmail} ajouté (sans tag car tagId manquant)`);
    }

  } catch (err) {
    console.error("❌ Erreur addUserToSystemeIo:", err);
  }
}

// ✅ ROUTE SIGNUP AVEC VÉRIFICATION D'EMAIL + COMPTES EXPLODELY + SYSTEME.IO
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Validation basique
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 2) Normalisation de l'email
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const isValidDomain = await isDisposableOrInvalidEmail(normalizedEmail);
    if (!isValidDomain) {
      return res.status(400).json({ message: 'Adresse email invalide' });
    }

    const database = client.db('MyAICrush');
    const users = database.collection('users');

    // 3) On regarde si un user existe déjà avec cet email (inclut ceux créés via Explodely)
    const existingUser = await users.findOne({ email: normalizedEmail });

    // On hash le mot de passe une seule fois
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ============================
    // 1️⃣ Cas : user existe déjà avec un password défini
    // ============================
    if (existingUser && existingUser.password) {
      return res.status(400).json({
        message: 'Un compte avec cet email existe déjà',
        isNewUser: false,
        upgradedFromExplodely: false
      });
    }

    // ============================
    // 2️⃣ Cas : user existe mais sans password (créé via Explodely)
    // ============================
    if (existingUser && !existingUser.password) {
      await users.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            password: hashedPassword,
            audioMinutesUsed: existingUser.audioMinutesUsed ?? 0,
            creditsPurchased: existingUser.creditsPurchased ?? 0,
            createdAt: existingUser.createdAt || new Date()
          }
        }
      );

      console.log("✅ Inscription complétée pour un compte Explodely existant :", normalizedEmail);

      // Inscription / tag dans Systeme.io (FR/EN selon navigateur)
      const acceptLanguage = req.headers["accept-language"] || "";
      await addUserToSystemeIo(normalizedEmail, acceptLanguage);

      return res.status(200).json({
        message: 'Compte complété avec succès',
        isNewUser: false,
        upgradedFromExplodely: true
      });
    }

    // ============================
    // 3️⃣ Cas : aucun user → création classique
    // ============================
    await users.insertOne({
      email: normalizedEmail,
      password: hashedPassword,
      audioMinutesUsed: 0,
      creditsPurchased: 0,
      explodelyPremium: false,
      createdAt: new Date(),
      dailyEmailEligible: true,
      dailyEmailEligibleSince: new Date()
    });

    console.log("✅ Inscription réussie pour :", normalizedEmail);

    // Inscription / tag dans Systeme.io (FR/EN selon navigateur)
    const acceptLanguage = req.headers["accept-language"] || "";
    await addUserToSystemeIo(normalizedEmail, acceptLanguage);

    return res.status(201).json({
      message: 'User created successfully!',
      isNewUser: true,
      upgradedFromExplodely: false
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'inscription:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

const schedule = require('node-schedule');

// 🔥 Planifie la suppression à 23h05
schedule.scheduleJob('5 23 * * *', () => {
    console.log("🗑️ Nettoyage du dossier /uploads/ à 23h05...");

    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error(`❌ Erreur lors de la lecture du dossier /uploads/ :`, err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(uploadDir, file);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`❌ Erreur lors de la suppression de ${filePath} :`, err);
                } else {
                    console.log(`🗑️ Fichier supprimé : ${filePath}`);
                }
            });
        });

        console.log("✅ Nettoyage du dossier /uploads/ terminé.");
    });
});


// ROUTE POUR LES MESSAGES VOCAUX AVEC LIMITATION & CRÉDITS
app.post('/api/tts', async (req, res) => {
    const { text, voice_id, voice_settings, email } = req.body;

    if (!text || !voice_id || !email) {
        return res.status(400).json({ error: "Texte, ID de voix et email requis" });
    }

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');

        // 🔥 Récupérer l'utilisateur depuis MongoDB
        const user = await users.findOne({ email });

        if (!user) {
            return res.status(403).json({ error: "Utilisateur introuvable." });
        }

        const max_free_minutes = 1; // ⏳ 2 minutes gratuites par mois
        const words_per_second = 2.4; // 🔥 Approximation : 2.5 mots/seconde
        const estimated_seconds = text.split(" ").length / words_per_second;
        const estimated_minutes = estimated_seconds / 60;

        console.log(`📊 Durée estimée : ${estimated_seconds.toFixed(2)} sec (${estimated_minutes.toFixed(2)} min)`);
        
        let newAudioMinutesUsed = (user.audioMinutesUsed || 0) + estimated_minutes;

// 🔒 Vérification du statut premium
const isPremiumResp = await fetch(`${BASE_URL}/api/is-premium`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const { isPremium } = await isPremiumResp.json();
  
  if (!isPremium) {
      return res.status(403).json({ redirect: "/premium.html", message: "Cette fonctionnalité est réservée aux membres premium." });
  }
  

        // 🔥 Vérifier si l'utilisateur a encore du crédit gratuit
        if (newAudioMinutesUsed <= max_free_minutes) {
            // ✅ Il reste des minutes gratuites, on les utilise
            await users.updateOne({ email }, { $set: { audioMinutesUsed: newAudioMinutesUsed } });
            console.log(`🔊 ${email} a utilisé ${estimated_minutes.toFixed(2)} min gratuites.`);
        } else {
            // ✅ L'utilisateur a dépassé ses minutes gratuites → Utilisation des crédits
            const paidMinutes = newAudioMinutesUsed - max_free_minutes;
            const creditsNeeded = Math.floor(paidMinutes * 5); // ❗ Déduction **seulement** quand 1 min complète est atteinte
            
            console.log(`💳 Minutes payantes accumulées : ${paidMinutes.toFixed(2)} min (${creditsNeeded} crédits nécessaires)`);

            if (newAudioMinutesUsed > max_free_minutes && user.creditsPurchased === 0) {
                if (creditsNeeded > 0) {
  if (user.creditsPurchased < creditsNeeded) {
    // ✅ Vérifie éligibilité au 1C
    const eligibleRes = await fetch(`${BASE_URL}/api/check-one-click-eligibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const eligibleData = await eligibleRes.json();

    if (eligibleData.eligible) {
      return res.status(403).json({ popup: true });
    } else {
      return res.status(403).json({ redirect: "/jetons.html" });
    }
  }
}

            }
            

            if (creditsNeeded > 0) {
                if (user.creditsPurchased < creditsNeeded) {
                   if (creditsNeeded > 0) {
  if (user.creditsPurchased < creditsNeeded) {
    // ✅ Vérifie éligibilité au 1C
    const eligibleRes = await fetch(`${BASE_URL}/api/check-one-click-eligibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const eligibleData = await eligibleRes.json();

    if (eligibleData.eligible) {
      return res.status(403).json({ popup: true });
    } else {
      return res.status(403).json({ redirect: "/jetons.html" });
    }
  }
}
 // Pas assez de crédits
                }

               // ✅ On enlève les minutes couvertes par les crédits (mais on garde les fractions restantes)
const remainingMinutes = paidMinutes - (creditsNeeded / 5);
newAudioMinutesUsed = max_free_minutes + remainingMinutes;

await users.updateOne({ email }, {
    $set: { audioMinutesUsed: newAudioMinutesUsed },
    $inc: { creditsPurchased: -creditsNeeded }
});


                console.log(`🔴 ${email} a payé ${creditsNeeded} crédits et reste avec ${newAudioMinutesUsed.toFixed(2)} min en attente.`);
            } else {
                // Pas encore 1 min complète payante → Juste ajouter au compteur
                await users.updateOne({ email }, { $set: { audioMinutesUsed: newAudioMinutesUsed } });
                console.log(`⏳ ${email} a accumulé ${newAudioMinutesUsed.toFixed(2)} min mais n'a pas encore atteint 1 crédit.`);
            }
        }

        console.log("📡 Envoi de la requête TTS à ElevenLabs :", { text, voice_id, voice_settings });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "xi-api-key": EVENLABS_API_KEY
            },
            body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("❌ Réponse erreur API ElevenLabs :", errorData);
            throw new Error(`Erreur API ElevenLabs : ${JSON.stringify(errorData)}`);
        }

        console.log("✅ Audio TTS reçu de ElevenLabs");
        const audioBuffer = await response.arrayBuffer();
        res.setHeader("Content-Type", "audio/mpeg");
        res.send(Buffer.from(audioBuffer));

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error("⏰ Timeout ElevenLabs TTS (15s)");
            res.status(504).json({ error: "Timeout ElevenLabs" });
        } else {
            console.error("❌ Erreur avec ElevenLabs :", error.message || error);
            res.status(500).json({ error: "Erreur avec ElevenLabs" });
        }
    }
});


// 🔄 Réinitialisation automatique des minutes audio chaque 1er du mois à minuit
schedule.scheduleJob('0 0 1 * *', async () => {
    const database = client.db('MyAICrush');
    const users = database.collection('users');

    const result = await users.updateMany({}, { $set: { audioMinutesUsed: 0 } });
    console.log(`🔄 Réinitialisation des minutes audio pour ${result.modifiedCount} utilisateurs !`);
});

// 🎁 Bonus mensuel : différencié par plan (1er du mois à 00:05)
//    - Mensuel  : 0 jetons (pas de bonus, stratégie "cash + tokens upsell")
//    - Annuel   : +30 jetons / mois
//    - Lifetime : +100 jetons / mois
//    - Legacy (sans explodelyPlan) : +30 jetons / mois (préservation du comportement historique)
schedule.scheduleJob('5 0 1 * *', async () => {
    const database = client.db('MyAICrush');
    const users = database.collection('users');

    // Annuel : +30 jetons
    const annualResult = await users.updateMany(
        { explodelyPremium: true, explodelyPlan: "annual" },
        { $inc: { creditsPurchased: 30 }, $set: { lastBonusAt: new Date(), bonusSeenByUser: false, lastBonusAmount: 30 } }
    );

    // Lifetime : +100 jetons
    const lifetimeResult = await users.updateMany(
        { explodelyPremium: true, explodelyPlan: "lifetime" },
        { $inc: { creditsPurchased: 100 }, $set: { lastBonusAt: new Date(), bonusSeenByUser: false, lastBonusAmount: 100 } }
    );

    // Legacy (premium actif sans plan field connu) : +30 jetons (safe fallback)
    const legacyResult = await users.updateMany(
        { explodelyPremium: true, explodelyPlan: { $exists: false } },
        { $inc: { creditsPurchased: 30 }, $set: { lastBonusAt: new Date(), bonusSeenByUser: false, lastBonusAmount: 30 } }
    );

    const totalCount = annualResult.modifiedCount + lifetimeResult.modifiedCount + legacyResult.modifiedCount;
    console.log(`🎁 Bonus mensuel : +30 pour ${annualResult.modifiedCount} annuels, +100 pour ${lifetimeResult.modifiedCount} lifetime, +30 pour ${legacyResult.modifiedCount} legacy (total ${totalCount})`);
    const result = { modifiedCount: totalCount };

    const SFW_IMAGE_SOURCES = [
        { char: "megane", folder: "megane/megane3", ext: "jpg", filter: f => f.includes("dressed") && f.endsWith(".jpg") },
        { char: "chloe", folder: "chloe/chloe3", ext: "webp" },
        { char: "lila", folder: "lila/lila3", ext: "webp" },
        { char: "aiko", folder: "aiko/aiko3", ext: "webp" },
        { char: "amber", folder: "amber/amber3", ext: "webp" },
        { char: "astrid", folder: "astrid/astrid3", ext: "webp" },
        { char: "candy", folder: "candy/candy3", ext: "webp" },
        { char: "emilie", folder: "emilie/emilie3", ext: "webp" },
        { char: "hanae", folder: "hanae/hanae3", ext: "webp" },
        { char: "ishani", folder: "ishani/ishani3", ext: "webp" },
        { char: "jasmine", folder: "jasmine/jasmine3", ext: "webp" },
        { char: "juliette", folder: "juliette/juliette3", ext: "webp" },
        { char: "kat", folder: "kat/kat3", ext: "webp" },
        { char: "kiara", folder: "kiara/kiara3", ext: "webp" },
        { char: "lea", folder: "lea/lea3", ext: "webp" },
        { char: "lilith", folder: "lilith/lilith3", ext: "webp" },
        { char: "magalie", folder: "magalie/magalie3", ext: "webp" },
        { char: "morgana", folder: "morgana/morgana3", ext: "webp" },
        { char: "naomi", folder: "naomi/naomi3", ext: "webp" },
        { char: "nour", folder: "nour/nour3", ext: "webp" },
        { char: "nova", folder: "nova/nova3", ext: "webp" },
        { char: "samira", folder: "samira/samira3", ext: "webp" },
        { char: "angel", folder: "angel/angel3", ext: "webp" },
    ];

    const CHAR_DISPLAY = {
        megane: "Megane", chloe: "Chloe", lila: "Lila", aiko: "Aiko", amber: "Amber",
        astrid: "Astrid", candy: "Candy", emilie: "Emilie", hanae: "Hanae", ishani: "Ishani",
        jasmine: "Jasmine", juliette: "Juliette", kat: "Kat", kiara: "Kiara", lea: "Lea",
        lilith: "Lilith", magalie: "Magalie", morgana: "Morgana", naomi: "Naomi", nour: "Nour",
        nova: "Nova", samira: "Samira", angel: "Angel"
    };

    // Templates parametres par montant (30 pour annuel/legacy, 100 pour lifetime)
    const BONUS_I18N = {
        en: {
            subject: n => `Your ${n} free monthly tokens are here`,
            greeting: name => `${name} has a gift for you!`,
            body: n => `Your monthly <strong>${n} bonus tokens</strong> have just been credited to your account.`,
            hint: "Use them to create AI videos, unlock exclusive content, or chat with your favorite characters.",
            cta: "Use My Tokens",
            footer: "You receive this email as a Premium member of MyAiCrush.",
            unsub: "Unsubscribe"
        },
        fr: {
            subject: n => `Vos ${n} jetons gratuits du mois sont arrives`,
            greeting: name => `${name} a un cadeau pour toi !`,
            body: n => `Vos <strong>${n} jetons bonus</strong> mensuels viennent d'etre credites sur votre compte.`,
            hint: "Utilisez-les pour creer des videos IA, debloquer du contenu exclusif ou discuter avec vos personnages preferes.",
            cta: "Utiliser Mes Jetons",
            footer: "Vous recevez cet email car vous etes membre Premium de MyAiCrush.",
            unsub: "Se desabonner"
        },
        de: {
            subject: n => `Deine ${n} kostenlosen monatlichen Tokens sind da`,
            greeting: name => `${name} hat ein Geschenk fur dich!`,
            body: n => `Deine monatlichen <strong>${n} Bonus-Tokens</strong> wurden deinem Konto gutgeschrieben.`,
            hint: "Nutze sie, um KI-Videos zu erstellen, exklusive Inhalte freizuschalten oder mit deinen Lieblingscharakteren zu chatten.",
            cta: "Meine Tokens Nutzen",
            footer: "Du erhaltst diese E-Mail als Premium-Mitglied von MyAiCrush.",
            unsub: "Abmelden"
        },
        es: {
            subject: n => `Tus ${n} tokens gratis mensuales estan aqui`,
            greeting: name => `${name} tiene un regalo para ti!`,
            body: n => `Tus <strong>${n} tokens bonus</strong> mensuales acaban de ser acreditados en tu cuenta.`,
            hint: "Usalos para crear videos con IA, desbloquear contenido exclusivo o chatear con tus personajes favoritos.",
            cta: "Usar Mis Tokens",
            footer: "Recibes este email porque eres miembro Premium de MyAiCrush.",
            unsub: "Cancelar suscripcion"
        },
        pt: {
            subject: n => `Seus ${n} tokens gratuitos mensais chegaram`,
            greeting: name => `${name} tem um presente para voce!`,
            body: n => `Seus <strong>${n} tokens bonus</strong> mensais acabaram de ser creditados na sua conta.`,
            hint: "Use-os para criar videos com IA, desbloquear conteudo exclusivo ou conversar com seus personagens favoritos.",
            cta: "Usar Meus Tokens",
            footer: "Voce recebe este email por ser membro Premium do MyAiCrush.",
            unsub: "Cancelar inscricao"
        }
    };

    function pickRandomSfwImage() {
        const src = SFW_IMAGE_SOURCES[Math.floor(Math.random() * SFW_IMAGE_SOURCES.length)];
        const dir = path.join(__dirname, "public/images", src.folder);
        try {
            const fs = require("fs");
            let files = fs.readdirSync(dir).filter(f => f.endsWith(`.${src.ext}`));
            if (src.filter) files = files.filter(src.filter);
            if (!files.length) return null;
            const picked = files[Math.floor(Math.random() * files.length)];
            const urlPath = `images/${src.folder}/${picked}`;
            return { url: `https://myaicrush.ai/${urlPath}`, char: src.char };
        } catch { return null; }
    }

    function buildBonusEmail(t, charName, imageUrl, userEmail, amount) {
        const unsubUrl = `https://myaicrush.ai/unsubscribe?email=${encodeURIComponent(userEmail)}`;
        return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;color:#1a1a1a;">
  <div style="padding:32px 24px 0;text-align:center;">
    <p style="font-size:1.3rem;font-weight:700;color:#1a1a1a;margin:0 0 4px;">MyAiCrush</p>
  </div>
  ${imageUrl ? `<div style="padding:16px 24px 0;text-align:center;">
    <a href="https://myaicrush.ai" style="text-decoration:none;"><img src="${imageUrl}" alt="${charName}" style="max-width:250px;width:100%;height:auto;border-radius:12px;margin-bottom:8px;" /></a>
    <p style="font-size:0.95rem;color:#7c3aed;font-weight:600;margin:0 0 20px;">${t.greeting(charName)}</p>
  </div>` : ""}
  <div style="padding:0 24px 32px;">
    <p style="font-size:1rem;line-height:1.7;margin:0 0 12px;color:#1a1a1a;">${t.body(amount)}</p>
    <p style="font-size:0.9rem;line-height:1.7;margin:0 0 28px;color:#6b7280;">${t.hint}</p>
    <div style="text-align:center;margin:0 0 28px;">
      <a href="https://myaicrush.ai" style="display:inline-block;background:#7c3aed;color:#fff;font-weight:600;font-size:0.95rem;padding:14px 36px;border-radius:8px;text-decoration:none;">${t.cta}</a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;" />
    <p style="font-size:0.75rem;color:#9ca3af;text-align:center;margin:0 0 8px;">${t.footer}</p>
    <p style="text-align:center;margin:0;"><a href="${unsubUrl}" style="font-size:0.7rem;color:#9ca3af;text-decoration:underline;">${t.unsub}</a></p>
  </div>
</div>`;
    }

    // Récupère les premium qui doivent recevoir un email bonus
    // Exclut les "monthly" (qui n'ont plus de bonus dans la nouvelle stratégie)
    const premiumUsers = await users.find(
        {
            explodelyPremium: true,
            email: { $exists: true, $ne: "" },
            unsubscribedEmail: { $ne: true },
            $or: [
                { explodelyPlan: "annual" },
                { explodelyPlan: "lifetime" },
                { explodelyPlan: { $exists: false } } // legacy = recoit comme avant
            ]
        },
        { projection: { email: 1, lang: 1, explodelyPlan: 1 } }
    ).toArray();

    let sent = 0, errors = 0;
    for (const u of premiumUsers) {
        try {
            const userLang = (u.lang || "en").substring(0, 2).toLowerCase();
            const t = BONUS_I18N[userLang] || BONUS_I18N.en;
            const bonusAmount = u.explodelyPlan === "lifetime" ? 100 : 30;

            const img = pickRandomSfwImage();
            const charDisplayName = img ? (CHAR_DISPLAY[img.char] || img.char) : "MyAiCrush";

            await resend.emails.send({
                from: "MyAiCrush <contact@myaicrush.ai>",
                to: u.email,
                reply_to: "contact@myaicrush.ai",
                subject: t.subject(bonusAmount),
                html: buildBonusEmail(t, charDisplayName, img ? img.url : null, u.email, bonusAmount)
            });
            sent++;
        } catch (e) {
            errors++;
            if (errors <= 3) console.log(`[BONUS-EMAIL] Error sending to ${u.email}:`, e.message);
        }
        if (premiumUsers.length > 10) await new Promise(r => setTimeout(r, 100));
    }
    console.log(`📧 Bonus emails: sent=${sent}, errors=${errors}`);
});



// GESTION DES JETONS


app.post('/api/buy-tokens', async (req, res) => {
  console.log('📡 Requête reçue pour l\'achat de jetons:', req.body);

  try {
    const { tokensAmount, email } = req.body;
    if (!tokensAmount || !email) {
      return res.status(400).json({ message: "Email et quantité de jetons requis." });
    }

    // ✅ Sélection du bon priceId selon le mode et la quantité
    const priceId = process.env.STRIPE_MODE === "live"
      ? (tokensAmount === "10" ? process.env.PRICE_ID_LIVE_10_TOKENS :
         tokensAmount === "50" ? process.env.PRICE_ID_LIVE_50_TOKENS :
         tokensAmount === "100" ? process.env.PRICE_ID_LIVE_100_TOKENS :
         tokensAmount === "300" ? process.env.PRICE_ID_LIVE_300_TOKENS :
         tokensAmount === "700" ? process.env.PRICE_ID_LIVE_700_TOKENS :
         tokensAmount === "1000" ? process.env.PRICE_ID_LIVE_1000_TOKENS : null)
      : (tokensAmount === "10" ? process.env.PRICE_ID_TEST_10_TOKENS :
         tokensAmount === "50" ? process.env.PRICE_ID_TEST_50_TOKENS :
         tokensAmount === "100" ? process.env.PRICE_ID_TEST_100_TOKENS :
         tokensAmount === "300" ? process.env.PRICE_ID_TEST_300_TOKENS :
         tokensAmount === "700" ? process.env.PRICE_ID_TEST_700_TOKENS :
         tokensAmount === "1000" ? process.env.PRICE_ID_TEST_1000_TOKENS : null);

    if (!priceId) {
      console.error("❌ Erreur : Aucun prix trouvé pour ce montant de jetons.");
      return res.status(400).json({ message: "Erreur de prix." });
    }

    const amount = tokensAmount === "10" ? 5 :
                   tokensAmount === "50" ? 25 :
                   tokensAmount === "100" ? 39 :
                   tokensAmount === "300" ? 99 :
                   tokensAmount === "700" ? 199 :
                   tokensAmount === "1000" ? 249 : 0;

    const database = client.db('MyAICrush');
    const users = database.collection('users');
    const user = await users.findOne({ email });

    let customerOptions = {};
    if (user?.stripeCustomerId) {
      console.log(`🔁 Réutilisation du Stripe customer existant : ${user.stripeCustomerId}`);
      customerOptions.customer = user.stripeCustomerId;
    } else {
      console.log(`🆕 Pas de customer ID : on force la création pour ${email}`);
      customerOptions.customer_creation = 'always';
      customerOptions.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      ...customerOptions,
      client_reference_id: email,
      payment_intent_data: {
        setup_future_usage: 'off_session'
      },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.BASE_URL}/confirmation-jetons.html?session_id={CHECKOUT_SESSION_ID}&amount=${amount}`,
      cancel_url: `${process.env.BASE_URL}/jetons.html`
    });

    console.log("✅ Session Stripe créée avec succès :", session.id);
    res.json({ url: session.url });

  } catch (error) {
    console.error('❌ Erreur lors de la création de la session Stripe:', error.message);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});




// ✅ Route API pour récupérer le nombre de jetons de l'utilisateur
app.post('/api/get-user-tokens', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis." });
    }

    const database = client.db('MyAICrush');
    const users = database.collection('users');

    const user = await users.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    console.log("👤 Utilisateur trouvé, jetons :", user.creditsPurchased || 0);
    console.log("🔓 Contenus débloqués :", user.unlockedContents || []);

    const pendingBonus = user.bonusSeenByUser === false && user.lastBonusAt;
    if (pendingBonus) {
      await users.updateOne({ email }, { $set: { bonusSeenByUser: true } });
    }

    res.json({
      tokens: user.creditsPurchased || 0,
      unlockedContents: user.unlockedContents || [],
      pendingBonus: !!pendingBonus
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des jetons :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});



app.post('/api/confirm-payment', async (req, res) => {
  console.log("📡 Vérification d'un paiement via session Stripe...");

  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ success: false, message: "Session ID manquant." });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price", "customer"]
    });

    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({ success: false, message: "Paiement non validé." });
    }

    const email = session.client_reference_id || session.customer_email;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email introuvable." });
    }

    let stripeCustomerId = null;
    if (typeof session.customer === "string") {
      stripeCustomerId = session.customer;
    } else if (session.customer?.id) {
      stripeCustomerId = session.customer.id;
    }

    console.log(`💰 Paiement validé pour ${email}`);
    console.log("🔍 ID Stripe reçu :", stripeCustomerId);

    const priceIdMapping = {
      // LIVE
      [process.env.PRICE_ID_LIVE_10_TOKENS]: 10,
      [process.env.PRICE_ID_LIVE_50_TOKENS]: 50,
      [process.env.PRICE_ID_LIVE_100_TOKENS]: 100,
      [process.env.PRICE_ID_LIVE_300_TOKENS]: 300,
      [process.env.PRICE_ID_LIVE_700_TOKENS]: 700,
      [process.env.PRICE_ID_LIVE_1000_TOKENS]: 1000,
      // TEST
      [process.env.PRICE_ID_TEST_10_TOKENS]: 10,
      [process.env.PRICE_ID_TEST_50_TOKENS]: 50,
      [process.env.PRICE_ID_TEST_100_TOKENS]: 100,
      [process.env.PRICE_ID_TEST_300_TOKENS]: 300,
      [process.env.PRICE_ID_TEST_700_TOKENS]: 700,
      [process.env.PRICE_ID_TEST_1000_TOKENS]: 1000,
    };

    const priceId = session.line_items?.data?.[0]?.price?.id;
    const tokensPurchased = priceIdMapping[priceId] || 0;

    if (!tokensPurchased) {
      console.warn("⚠️ Aucun mapping trouvé pour priceId :", priceId);
      return res.status(400).json({ success: false, message: "Jetons non détectés." });
    }

    const db = client.db('MyAICrush');
    const users = db.collection('users');
    const user = await users.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    if (Array.isArray(user.usedStripeSessions) && user.usedStripeSessions.includes(sessionId)) {
      console.warn(`⚠️ Session déjà utilisée : ${sessionId}`);
      return res.status(400).json({ success: false, message: "Session déjà utilisée." });
    }

    // 🔍 Vérifie si l'utilisateur est premium avant de modifier stripeCustomerId
    let subscriptionInfo = null;
    let isPremium = false;

    try {
      subscriptionInfo = await getUserSubscription(email);
      if (subscriptionInfo) {
        isPremium =
          subscriptionInfo.status === 'active' ||
          subscriptionInfo.status === 'cancelled';
      }
    } catch (err) {
      console.error("⚠️ Erreur getUserSubscription, on continue sans premium :", err.message);
    }

    const updateFields = {
      $inc: { creditsPurchased: tokensPurchased },
      $addToSet: { usedStripeSessions: sessionId }
    };

    const existingId = user.stripeCustomerId;

    if (stripeCustomerId && (!existingId || (!isPremium && existingId !== stripeCustomerId))) {
      if (!updateFields.$set) updateFields.$set = {};
      updateFields.$set.stripeCustomerId = stripeCustomerId;

      if (existingId && existingId !== stripeCustomerId) {
        console.warn(`⚠️ Conflit ID Stripe : base=${existingId} | Stripe=${stripeCustomerId}`);
        console.log(`🔁 Remplacement autorisé (non premium) pour ${email}`);
      } else {
        console.log(`🔗 Enregistrement stripeCustomerId pour ${email} : ${stripeCustomerId}`);
      }
    }

    await users.updateOne({ email }, updateFields);

    console.log(`✅ ${tokensPurchased} jetons ajoutés avec succès pour ${email}`);
    res.json({ success: true, tokens: tokensPurchased });

  } catch (error) {
    console.error("❌ Erreur lors de la confirmation de paiement :", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
});




// 🔄 Réinitialisation du compteur d'images chaque 1er du mois à minuit
schedule.scheduleJob('0 0 1 * *', async () => {
    const database = client.db('MyAICrush');
    const users = database.collection('users');

    const result = await users.updateMany({}, { $set: { imagesUploaded: 0 } });
    console.log(`🔄 Réinitialisation du compteur d'images pour ${result.modifiedCount} utilisateurs !`);
});


// ============================================================
// DAILY EMAIL — envoie 1 email/jour avec une image aleatoire
// ============================================================
const DAILY_EMAIL_CHARACTERS = (() => {
  const imagesDir = path.join(__dirname, 'public', 'images');
  const exclude = ['market', 'banners', 'test'];
  try {
    return fs.readdirSync(imagesDir)
      .filter(d => {
        if (exclude.includes(d)) return false;
        const sub = path.join(imagesDir, d, d + '1');
        return fs.existsSync(sub) && fs.statSync(sub).isDirectory();
      });
  } catch (e) { return []; }
})();

function getRandomDailyImage() {
  if (DAILY_EMAIL_CHARACTERS.length === 0) return null;
  const shuffled = [...DAILY_EMAIL_CHARACTERS].sort(() => Math.random() - 0.5);
  for (const char of shuffled) {
    const folder = path.join(__dirname, 'public', 'images', char, char + '1');
    const images = fs.readdirSync(folder).filter(f => f.endsWith('.webp'));
    const withCdn = images.filter(f => cloudflareMap[`${char}\\${char}1\\${f}`]);
    if (withCdn.length === 0) continue;
    const file = withCdn[Math.floor(Math.random() * withCdn.length)];
    const cdnUrl = cloudflareMap[`${char}\\${char}1\\${file}`];
    const displayName = char.charAt(0).toUpperCase() + char.slice(1);
    return { char, displayName, file, cdnUrl, localPath: `/images/${char}/${char}1/${file}` };
  }
  return null;
}

function buildDailyEmailHtml(img, lang, customSubject, customMessage) {
  const isFr = lang === 'fr';
  const siteUrl = 'https://myaicrush.ai';
  const subject = customSubject
    ? customSubject.replace('{name}', img.displayName)
    : (isFr ? `${img.displayName} t'a envoye une photo` : `${img.displayName} sent you a photo`);
  const imageUrl = `https://img.myaicrush.ai/images/${img.char}/${img.char}1/${img.file}`;
  const ctaText = isFr ? 'Voir plus de photos' : 'See more photos';

  const mainText = customMessage
    ? customMessage.replace('{name}', img.displayName)
    : (isFr ? `${img.displayName} t'a envoye une nouvelle photo` : `${img.displayName} sent you a new photo`);
  const subText = isFr ? 'Elle attend ta reponse...' : 'She is waiting for your reply...';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a14;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:20px">
  <div style="text-align:center;padding:20px 0">
    <span style="color:#ff4d8d;font-size:24px;font-weight:bold">MyAiCrush</span>
  </div>
  <div style="background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,77,141,0.2)">
    <div style="padding:20px 24px">
      <p style="color:#e8e8f0;font-size:16px;margin:0 0 4px">${mainText}</p>
      <p style="color:#6b6b88;font-size:13px;margin:0">${subText}</p>
    </div>
    <div style="text-align:center">
      <img src="${imageUrl}" alt="${img.displayName}" style="width:100%;max-width:500px;display:block;margin:0 auto">
    </div>
    <div style="padding:24px;text-align:center">
      <a href="${siteUrl}" style="display:inline-block;background:linear-gradient(135deg,#ff4d8d,#c026d3);color:#fff;text-decoration:none;padding:14px 40px;border-radius:30px;font-size:16px;font-weight:bold">${ctaText}</a>
    </div>
  </div>
  <div style="text-align:center;padding:20px 0">
    <p style="color:#6b6b88;font-size:11px;margin:0">MyAiCrush &copy; ${new Date().getFullYear()}</p>
  </div>
</div>
</body></html>`;

  return { subject, html };
}

async function getSystemeContacts(tagId) {
  const apiKey = process.env.SYSTEME_API_KEY;
  const base = process.env.SYSTEME_API_BASE_URL || 'https://api.systeme.io';
  if (!apiKey) return [];
  const contacts = [];
  let startingAfter = null;
  for (let page = 0; page < 200; page++) {
    let url = `${base}/api/contacts?limit=100&tagId=${tagId}`;
    if (startingAfter) url += `&startingAfter=${startingAfter}`;
    try {
      const res = await fetch(url, { headers: { 'X-API-Key': apiKey } });
      if (!res.ok) {
        console.log(`[SYSTEME] Page ${page} error: ${res.status}`);
        break;
      }
      const data = await res.json();
      if (!data.items || data.items.length === 0) break;
      for (const c of data.items) {
        if (c.email && !c.unsubscribed && !c.bounced) {
          contacts.push({ email: c.email, locale: c.locale || 'fr' });
        }
      }
      if (!data.hasMore) break;
      startingAfter = data.items[data.items.length - 1].id;
    } catch (e) {
      console.log(`[SYSTEME] Page ${page} fetch error:`, e.message);
      break;
    }
  }
  console.log(`[SYSTEME] Tag ${tagId}: ${contacts.length} active contacts`);
  return contacts;
}

async function sendDailyEmails() {
  console.log('[DAILY-EMAIL] Starting daily email job...');
  const img = getRandomDailyImage();
  if (!img) { console.log('[DAILY-EMAIL] No image found, skipping.'); return; }
  console.log(`[DAILY-EMAIL] Character: ${img.displayName}, Image: ${img.file}`);

  const tagFr = process.env.SYSTEME_TAG_FR;
  const tagEn = process.env.SYSTEME_TAG_EN;

  const tagId = tagFr || tagEn;
  const allContacts = tagId ? await getSystemeContacts(tagId) : [];
  console.log(`[DAILY-EMAIL] ${allContacts.length} active contacts`);
  const unique = [...new Map(allContacts.map(c => [c.email, c])).values()];

  let sent = 0, errors = 0;
  for (const contact of unique) {
    const lang = (contact.locale || 'fr').startsWith('fr') ? 'fr' : 'en';
    const { subject, html } = buildDailyEmailHtml(img, lang);
    try {
      await smtpTransporter.sendMail({
        from: `"${img.displayName} — MyAiCrush" <${process.env.SMTP_USER}>`,
        to: contact.email,
        subject,
        html
      });
      sent++;
    } catch (e) {
      errors++;
      if (errors <= 3) console.log(`[DAILY-EMAIL] Error sending to ${contact.email}:`, e.message);
    }
    if (unique.length > 10) await new Promise(r => setTimeout(r, 200));
  }
  console.log(`[DAILY-EMAIL] Done! Sent: ${sent}, Errors: ${errors}`);
}

// DESACTIVE — ne pas envoyer via SMTP Gmail, utiliser un vrai service d'envoi
// schedule.scheduleJob('0 10 * * *', () => {
//   sendDailyEmails().catch(e => console.error('[DAILY-EMAIL] Fatal error:', e));
// });

app.post('/api/admin/send-daily-email', async (req, res) => {
  try {
    await sendDailyEmails();
    res.json({ ok: true, message: 'Daily email sent' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/email-characters', (req, res) => {
  res.json({ characters: DAILY_EMAIL_CHARACTERS });
});

app.get('/api/admin/email-tags', async (req, res) => {
  try {
    const apiKey = process.env.SYSTEME_API_KEY;
    const base = process.env.SYSTEME_API_BASE_URL || 'https://api.systeme.io';
    if (!apiKey) return res.json({ tags: [] });
    const allTags = [];
    let after = null;
    for (let p = 0; p < 20; p++) {
      let url = `${base}/api/tags?limit=100`;
      if (after) url += `&startingAfter=${after}`;
      const r = await fetch(url, { headers: { 'X-API-Key': apiKey } });
      if (!r.ok) break;
      const data = await r.json();
      if (!data.items || data.items.length === 0) break;
      allTags.push(...data.items.map(t => ({ id: String(t.id), name: t.name })));
      if (!data.hasMore) break;
      after = data.items[data.items.length - 1].id;
    }
    res.json({ tags: allTags });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function getSpecificCharacterImage(charName) {
  const folder = path.join(__dirname, 'public', 'images', charName, charName + '1');
  if (!fs.existsSync(folder)) return null;
  const images = fs.readdirSync(folder).filter(f => f.endsWith('.webp'));
  const withCdn = images.filter(f => cloudflareMap[`${charName}\\${charName}1\\${f}`]);
  const pool = withCdn.length > 0 ? withCdn : images;
  if (pool.length === 0) return null;
  const file = pool[Math.floor(Math.random() * pool.length)];
  const cdnUrl = cloudflareMap[`${charName}\\${charName}1\\${file}`];
  const displayName = charName.charAt(0).toUpperCase() + charName.slice(1);
  return { char: charName, displayName, file, cdnUrl, localPath: `/images/${charName}/${charName}1/${file}` };
}

async function countSystemeContacts(tagId) {
  const apiKey = process.env.SYSTEME_API_KEY;
  const base = process.env.SYSTEME_API_BASE_URL || 'https://api.systeme.io';
  if (!apiKey || !tagId) return 0;
  let active = 0;
  let startingAfter = null;
  for (let page = 0; page < 200; page++) {
    let url = `${base}/api/contacts?limit=100&tagId=${tagId}`;
    if (startingAfter) url += `&startingAfter=${startingAfter}`;
    try {
      const res = await fetch(url, { headers: { 'X-API-Key': apiKey } });
      if (!res.ok) break;
      const data = await res.json();
      if (!data.items || data.items.length === 0) break;
      for (const c of data.items) {
        if (!c.unsubscribed && !c.bounced) active++;
      }
      if (!data.hasMore) break;
      startingAfter = data.items[data.items.length - 1].id;
    } catch (e) { break; }
  }
  return active;
}

app.post('/api/admin/email-preview', async (req, res) => {
  try {
    const { character, lang, customSubject, customMessage } = req.body;
    let img;
    if (character && character !== 'random') {
      img = getSpecificCharacterImage(character);
    } else {
      img = getRandomDailyImage();
    }
    if (!img) return res.json({ error: 'Aucune image trouvee' });

    console.log(`[EMAIL-PREVIEW] Char: ${img.displayName}, Image: ${img.file}, CDN: ${img.cdnUrl ? 'yes' : 'NO'}`);

    const tagId = req.body.tagId || process.env.SYSTEME_TAG_FR || process.env.SYSTEME_TAG_EN;
    const totalActive = await countSystemeContacts(tagId);

    const emailFr = buildDailyEmailHtml(img, 'fr', customSubject, customMessage);
    const emailEn = buildDailyEmailHtml(img, 'en', customSubject, customMessage);

    res.json({
      characterId: img.char,
      characterName: img.displayName,
      imageFile: img.file,
      imageUrl: `https://img.myaicrush.ai/images/${img.char}/${img.char}1/${img.file}`,
      subject: emailFr.subject,
      subjectEn: emailEn.subject,
      htmlFr: emailFr.html,
      htmlEn: emailEn.html,
      totalActive
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/email-send', async (req, res) => {
  try {
    const { character, imageFile, lang, customSubject, customMessage } = req.body;
    const charName = character || 'lila';
    const displayName = charName.charAt(0).toUpperCase() + charName.slice(1);
    const img = { char: charName, displayName, file: imageFile };

    const tagId = req.body.tagId || process.env.SYSTEME_TAG_FR || process.env.SYSTEME_TAG_EN;
    const allContacts = tagId ? await getSystemeContacts(tagId) : [];
    const unique = [...new Map(allContacts.map(c => [c.email, c])).values()];

    let filtered = unique;
    if (lang === 'fr') filtered = unique.filter(c => (c.locale || 'fr').startsWith('fr'));
    else if (lang === 'en') filtered = unique.filter(c => !(c.locale || 'fr').startsWith('fr'));

    console.log(`[EMAIL-SEND] Sending to ${filtered.length} contacts, char: ${displayName}`);

    let sent = 0, errors = 0;
    for (const contact of filtered) {
      const contactLang = (contact.locale || 'fr').startsWith('fr') ? 'fr' : 'en';
      const { subject, html } = buildDailyEmailHtml(img, contactLang, customSubject, customMessage);
      try {
        await smtpTransporter.sendMail({
          from: `"${displayName} — MyAiCrush" <${process.env.SMTP_USER}>`,
          to: contact.email,
          subject,
          html
        });
        sent++;
      } catch (e) {
        errors++;
        if (errors <= 5) console.log(`[EMAIL-SEND] Error for ${contact.email}:`, e.message);
      }
      if (filtered.length > 10) await new Promise(r => setTimeout(r, 200));
    }

    console.log(`[EMAIL-SEND] Done: ${sent} sent, ${errors} errors`);
    res.json({ sent, errors, total: filtered.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


//ROUTE POUR AB TEST


const PRICING_CONFIG_PATH = path.join(__dirname, 'pricing-config.json');

// 🔄 Fonction pour charger la config de pricing
function loadPricingConfig() {
    try {
        const rawData = fs.readFileSync(PRICING_CONFIG_PATH);
        return JSON.parse(rawData);
    } catch (error) {
        console.error("❌ Erreur lors du chargement de pricing-config.json :", error);
        return { active_tests: [], default_price: {} };
    }
}

// 📢 Route API pour obtenir les offres dynamiques
app.get('/get-pricing', (req, res) => {
    const pricingConfig = loadPricingConfig();
    const activeTests = pricingConfig.active_tests;
    const defaultPrice = pricingConfig.default_price;

    let selectedVariant;

    if (activeTests.length > 0) {
        // 📌 Vérifier si l'utilisateur a déjà une variante en cookie
        if (req.cookies.pricingVariant) {
            selectedVariant = JSON.parse(req.cookies.pricingVariant);
        } else {
            // 🎲 Sélection aléatoire d'une variante A/B
            const test = activeTests[0]; // Prend le premier test actif
            selectedVariant = test.variants[Math.floor(Math.random() * test.variants.length)];

            // 🍪 Stocker la variante dans un cookie (1 an)
            res.cookie('pricingVariant', JSON.stringify(selectedVariant), {
                maxAge: 365 * 24 * 60 * 60 * 1000, // 1 an
                httpOnly: true
            });
        }

        console.log("🎯 Variante sélectionnée pour cet utilisateur :", selectedVariant);
        return res.json({ pricing: [selectedVariant] });
    }

    // 🔄 Si aucun test actif, on retourne le tarif par défaut
    return res.json({ pricing: [defaultPrice] });
});


//ROUTE NYMPHO

app.post('/api/unlock-nympho', async (req, res) => {
    const { email, characterName } = req.body;

    if (!email || !characterName) {
        return res.status(400).json({ message: "Email et nom du personnage requis." });
    }

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');

        const user = await users.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable." });
        }

        const alreadyUnlocked = user.nymphoUnlocked?.[characterName];
        if (alreadyUnlocked) {
            return res.status(400).json({ message: "Mode déjà activé pour ce personnage." });
        }

        const cost = 50;
        const credits = user.creditsPurchased || 0;

        if (credits < cost) {
            return res.status(403).json({ message: "Pas assez de jetons." });
        }

        // 🔥 Déduction et activation en une seule commande
        await users.updateOne(
            { email },
            {
                $inc: { creditsPurchased: -cost },
                $set: { [`nymphoUnlocked.${characterName}`]: true }
            }
        );

        console.log(`🔥 Mode nymphomane activé pour ${email} sur ${characterName}`);
        res.json({ success: true, message: "Mode nymphomane activé avec succès !" });

    } catch (error) {
        console.error("❌ Erreur dans /api/unlock-nympho :", error);
        res.status(500).json({ message: "Erreur serveur lors de l'activation du mode." });
    }
});


// APPEL EN LIVE 
// ✅ Vérifie qu'on peut démarrer un appel

app.post('/api/start-call', async (req, res) => {
    const { email } = req.body;
  
    if (!email) return res.status(400).json({ success: false, message: "Email requis." });
  
    try {
      const db = client.db('MyAICrush');
      const users = db.collection('users');
  
      const user = await users.findOne({ email });
  
      if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
  
      if (user.creditsPurchased < 20) {
        return res.status(403).json({
          success: false,
          message: "Tu n'as pas assez de jetons pour faire un appel audio.",
          redirect: "/jetons.html"
        });
      }
  
      // ✅ Déduit immédiatement 20 jetons
      await users.updateOne({ email }, { $inc: { creditsPurchased: -20 } });
  
      console.log(`📞 Appel de 10 minutes démarré, 20 jetons déduits (${email}).`);
  
      res.json({ success: true, message: "Appel de 10 minutes démarré. 20 jetons déduits." });
  
    } catch (error) {
      console.error('Erreur démarrage appel:', error);
      res.status(500).json({ success: false, message: "Erreur serveur au démarrage de l'appel." });
    }
  });
  

//ROUTE POUR CONTENU PRIVé
app.post('/api/unlock-private-content', async (req, res) => {
    const { email, price, folder } = req.body;

    if (!email || !price || !folder) {
        return res.status(400).json({ success: false, message: "Email, prix et dossier requis." });
    }

    try {
        const db = client.db('MyAICrush');
        const users = db.collection('users');
        const user = await users.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
        }

        // 🔐 Vérifier s'il est premium via route centrale
        const premiumRes = await fetch(`${process.env.BASE_URL}/api/is-premium`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        const premiumData = await premiumRes.json();
        const isPremium = premiumData.isPremium === true;

        if (!isPremium) {
            return res.status(403).json({ success: false, message: "Accès réservé aux membres premium." });
        }

        const jetons = user.creditsPurchased || 0;
        if (jetons < price) {
            return res.status(403).json({ success: false, message: "Pas assez de jetons", showJetonsPopup: true });
        }

        // ✅ Déduire les jetons et marquer le contenu comme débloqué
        const unlocked = user.unlockedContents || [];
        if (!unlocked.includes(folder)) {
            unlocked.push(folder);
        }

        await users.updateOne(
            { email },
            {
                $inc: { creditsPurchased: -price },
                $set: { unlockedContents: unlocked }
            }
        );

        console.log(`✅ Contenu ${folder} débloqué pour ${email} (${price} jetons déduits).`);
        res.json({ success: true, newTokens: jetons - price });

    } catch (error) {
        console.error("❌ Erreur /api/unlock-private-content :", error);
        res.status(500).json({ success: false, message: "Erreur interne du serveur." });
    }
});




// Route fichiers privé
const glob = require('glob');

app.get('/api/list-pack-files', async (req, res) => {
    const folder = req.query.folder;
    const email = req.query.email;
    const publicInfoOnly = req.query.publicInfoOnly === 'true';

    if (!folder || !folder.startsWith('images/')) {
        return res.status(400).json({ files: [], photosCount: 0, videosCount: 0 });
    }

    try {
        let isAuthorized = false;

        if (!publicInfoOnly) {
            if (!email) {
                console.warn("❌ Email manquant dans la requête /api/list-pack-files");
                return res.status(400).json({ files: [], photosCount: 0, videosCount: 0 });
            }

            const database = client.db('MyAICrush');
            const users = database.collection('users');
            const user = await users.findOne({ email });

            if (!user) {
                console.warn(`❌ Utilisateur introuvable: ${email}`);
                return res.status(403).json({ files: [], photosCount: 0, videosCount: 0 });
            }

            // 🔐 Vérifier statut premium via API
            const premiumRes = await fetch(`${process.env.BASE_URL}/api/is-premium`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const premiumData = await premiumRes.json();
            const isPremium = premiumData.isPremium === true;

            if (!isPremium) {
                console.warn(`🚫 Accès refusé (non-premium) pour ${email}`);
                return res.status(403).json({ files: [], photosCount: 0, videosCount: 0 });
            }

            const unlockedContents = user.unlockedContents || [];
            if (!unlockedContents.includes(folder)) {
                console.warn(`🚫 Pack non débloqué (${folder}) pour ${email}`);
                return res.status(403).json({ files: [], photosCount: 0, videosCount: 0 });
            }

            isAuthorized = true;
        }

        // ✅ Lister les fichiers
        const fullPath = path.join(__dirname, 'public', folder);
        glob(`${fullPath}/*.{webp,jpg,jpeg,png,mp4}`, (err, files) => {
            if (err) {
                console.error("❌ Erreur listing pack :", err);
                return res.status(500).json({ files: [], photosCount: 0, videosCount: 0 });
            }

            const relativeFiles = files.map(f => {
                let relativePath = path.relative(path.join(__dirname, 'public'), f);
                relativePath = relativePath.replace(/\\/g, '/');
                return `/${relativePath}`;
            });

            const photosCount = relativeFiles.filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i)).length;
            const videosCount = relativeFiles.filter(f => f.match(/\.mp4$/i)).length;

            res.json({
                files: isAuthorized ? relativeFiles : [],
                photosCount,
                videosCount
            });
        });

    } catch (error) {
        console.error("❌ Erreur interne /api/list-pack-files :", error);
        res.status(500).json({ files: [], photosCount: 0, videosCount: 0 });
    }
});



  
// ✅ Route pour enregistrer le customerId après un paiement
app.post("/api/save-customer-id", async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: "sessionId manquant",
    });
  }

  try {
    // Récupération de la session Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // ✅ Stripe met souvent l'email dans customer_details.email maintenant
    const email =
      session.customer_details?.email ||
      session.customer_email ||
      null;

    const customerId = session.customer;

    if (!email || !customerId) {
      console.error("❌ Données manquantes dans la session Stripe :", {
        sessionId,
        customer: session.customer,
        customer_email: session.customer_email,
        customer_details: session.customer_details,
      });

      return res.status(400).json({
        success: false,
        message: "Données manquantes dans la session Stripe",
      });
    }

    // Normalisation de l’email pour matcher la DB
    const normalizedEmail = email.trim().toLowerCase();

    const database = client.db("MyAICrush");
    const users = database.collection("users");

    const result = await users.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          stripeCustomerId: customerId,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      console.warn(
        `⚠️ Aucun utilisateur trouvé avec l'email ${normalizedEmail} pour la session ${sessionId}`
      );
    }

    console.log(
      `✅ customerId (${customerId}) enregistré pour ${normalizedEmail} (session ${sessionId})`
    );

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de la session Stripe :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
});


// ✅ Route One-Click Payment pour acheter des jetons

app.post('/api/one-click-payment', async (req, res) => {
  const { email, tokensAmount } = req.body;

  if (!email || !tokensAmount) {
    return res.status(400).json({ success: false, message: "Email et quantité de jetons requis." });
  }

  try {
    const db = client.db("MyAICrush");
    const users = db.collection("users");
    const user = await users.findOne({ email });

    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ success: false, message: "Client non éligible au 1-click." });
    }

    const customerId = user.stripeCustomerId;

    const amountMap = {
      "10": 500,
      "50": 2500,
      "100": 3900,
      "300": 9900,
      "700": 19900,
      "1000": 24900
    };

    const jetonsMap = {
      "10": 10,
      "50": 50,
      "100": 100,
      "300": 300,
      "700": 700,
      "1000": 1000
    };

    const amount = amountMap[tokensAmount];
    const jetons = jetonsMap[tokensAmount];

    if (!amount || !jetons) {
      return res.status(400).json({ success: false, message: "Montant/jetons invalide." });
    }

    // Récupérer la carte
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    if (!paymentMethods?.data?.length) {
      return res.status(400).json({ success: false, message: "Aucune carte enregistrée." });
    }

    const defaultCard = paymentMethods.data[0].id;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      customer: customerId,
      payment_method: defaultCard,
      confirm: true,
      off_session: true,
      description: `${jetons} jetons (1-click)`
    });

    console.log(`💸 Paiement 1-C réussi : ${paymentIntent.id}`);

    if (user.usedStripeSessions?.includes(paymentIntent.id)) {
      console.warn("⚠️ Paiement déjà traité");
      return res.status(400).json({ success: false, message: "Paiement déjà traité." });
    }

    // Ajout jetons + protection doublons
    await users.updateOne(
      { email },
      {
        $inc: { creditsPurchased: jetons },
        $addToSet: { usedStripeSessions: paymentIntent.id }
      }
    );

    res.json({ success: true, paymentIntentId: paymentIntent.id });

  } catch (error) {
    console.error("❌ Erreur paiement 1-C :", error);

    return res.status(500).json({
      success: false,
      message: "Erreur lors du paiement 1-click.",
      redirect: "/jetons.html"
    });
  }
});



// ✅ Version complète : éligible si customerId Stripe + carte enregistrée
// ❌ Stripe désactivé → One Click toujours inéligible
app.post("/api/check-one-click-eligibility", async (req, res) => {
  return res.status(200).json({
    eligible: false,
    reason: "Stripe disabled"
  });
});





// =====================================
// 🔧 Helper : ajouter des jetons à un utilisateur
// =====================================
async function addTokensToUser(email, tokensToAdd) {
  if (!email || !tokensToAdd) {
    console.warn("⚠️ addTokensToUser appelé sans email ou tokensToAdd");
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const database = client.db("MyAICrush");
  const users = database.collection("users");

  const result = await users.findOneAndUpdate(
    { email: normalizedEmail },
    {
      // 👉 ON N'UTILISE PLUS "tokens" ICI
      $inc: { creditsPurchased: tokensToAdd },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: "after" }
  );

  console.log(
    `✅ ${tokensToAdd} jetons ajoutés à ${normalizedEmail}. Nouveau total creditsPurchased :`,
    result.value?.creditsPurchased
  );
}


// ===============================
// 🔔 WEBHOOK GUMROAD : PACKS DE JETONS
// ===============================
//
// Dans Gumroad > Settings > Ping endpoint :
//   https://myaicrush.ai/webhook/gumroad-tokens
//
app.post(
  '/webhook/gumroad-tokens',
  express.urlencoded({ extended: true }), // Gumroad envoie du x-www-form-urlencoded
  async (req, res) => {
    try {
      const payload = req.body;
      console.log("🟣 Webhook Gumroad (jetons) reçu:", payload);

      // 1) Vérifier que ça vient bien de TON compte Gumroad
      const expectedSellerId = process.env.GUMROAD_SELLER_ID;
      if (expectedSellerId && payload.seller_id && payload.seller_id !== expectedSellerId) {
        console.warn(
          "❌ Webhook Gumroad ignoré : seller_id ne correspond pas",
          payload.seller_id
        );
        // On renvoie 200 pour éviter des retries inutiles
        return res.status(200).send('ignored (wrong seller)');
      }

      // 2) Ignorer les remboursements / chargebacks au cas où
      const refundedFlags = [
        payload.is_refunded,
        payload.refunded,
        payload.is_chargeback,
        payload.disputed
      ].map(v => String(v).toLowerCase());

      if (refundedFlags.includes('true')) {
        console.log("ℹ️ Vente remboursée / contestée, pas de jetons ajoutés.");
        return res.status(200).send('ignored (refunded/chargeback)');
      }

      // 3) Récupérer l'email de l'acheteur
      const email = (
        payload.email ||
        payload.purchaser_email ||
        payload.buyer_email ||
        ''
      ).trim().toLowerCase();

      const productId = payload.product_id;

      if (!email || !productId) {
        console.warn("⚠️ Webhook Gumroad sans email ou product_id", {
          email,
          productId
        });
        return res.status(400).send('missing email or product_id');
      }

      // 4) Mapping product_id → nombre de jetons
      const productToTokens = {
        [process.env.GUMROAD_TOKEN_10_PRODUCT_ID]: 10,
        [process.env.GUMROAD_TOKEN_50_PRODUCT_ID]: 50,
        [process.env.GUMROAD_TOKEN_100_PRODUCT_ID]: 100,
        [process.env.GUMROAD_TOKEN_300_PRODUCT_ID]: 300,
        [process.env.GUMROAD_TOKEN_700_PRODUCT_ID]: 700,
        [process.env.GUMROAD_TOKEN_1000_PRODUCT_ID]: 1000
      };

      const tokensToAdd = productToTokens[productId];

      if (!tokensToAdd) {
        console.warn(
          "⚠️ product_id Gumroad non mappé pour les jetons:",
          productId
        );
        return res.status(200).send('unknown product, no tokens added');
      }

      // 5) Créditer les jetons
      await addTokensToUser(email, tokensToAdd);

      console.log(
        `✅ Jetons ajoutés via Gumroad : +${tokensToAdd} pour ${email} (product_id: ${productId})`
      );

      return res.status(200).send('ok');
    } catch (err) {
      console.error("❌ Erreur webhook Gumroad tokens:", err.message || err);
      return res.status(500).send('server error');
    }
  }
);


// =====================================
// 🔍 Route Premium Gumroad uniquement
// =====================================
app.post('/api/is-gumroad-premium', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ isPremium: false });
  }

  try {
    const isPremium = await checkPremiumGumroad(email);

    return res.json({
      isPremium
    });

  } catch (error) {
    console.error("❌ Erreur /api/is-gumroad-premium:", error.message || error);
    return res.status(500).json({ isPremium: false });
  }
});

app.post("/api/is-premium-db", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ isPremium: false });
    }

    const database = client.db("MyAICrush");
    const users = database.collection("users");

    const user = await users.findOne(
      { email: String(email).trim().toLowerCase() },
      { projection: { explodelyPremium: 1 } }
    );

    return res.json({
      isPremium: user?.explodelyPremium === true
    });

  } catch (e) {
    console.error("❌ /api/is-premium-db:", e);
    return res.status(500).json({ isPremium: false });
  }
});



app.post("/api/activate-premium-on-confirmation", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email manquant" });

    const database = client.db("MyAICrush");
    const users = database.collection("users");

    await users.updateOne(
      { email: email.trim().toLowerCase() },
      { 
        $set: { explodelyPremium: true },
        $unset: { premiumExpiresAt: "", premiumCancelledAt: "" }
      }
    );

    // 🧹 Vide le cache immédiatement
    premiumCache.delete(email.trim().toLowerCase());

    console.log(`✅ Premium activé + cache vidé pour ${email}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erreur activate-premium-on-confirmation:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});


app.post("/api/cancel-premium", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email manquant" });

    const database = client.db("MyAICrush");
    const users = database.collection("users");
    const normalizedEmail = email.trim().toLowerCase();

    // 🛡️ Guard: lifetime users cannot be cancelled (only refunded via Explodely)
    const existing = await users.findOne(
      { email: normalizedEmail },
      { projection: { explodelyPlan: 1 } }
    );
    if (existing?.explodelyPlan === "lifetime") {
      console.log(`🛡️ [CANCEL-PREMIUM] Refus pour ${normalizedEmail}: plan=lifetime (non annulable)`);
      return res.status(400).json({ error: "Lifetime plan cannot be cancelled. Please contact support for a refund.", plan: "lifetime" });
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await users.updateOne(
      { email: normalizedEmail },
      { $set: { premiumExpiresAt: expiresAt } } // ✅ même nom partout
    );

    return res.status(200).json({ success: true, expiresAt });
  } catch (error) {
    console.error("❌ Erreur cancel-premium:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});


app.post("/api/get-user-info", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email manquant" });

    const database = client.db("MyAICrush");
    const users = database.collection("users");
    const user = await users.findOne(
      { email: email.trim().toLowerCase() },
      { projection: { premiumExpiresAt: 1, premiumCancelledAt: 1, explodely_expiresAt: 1, explodelyPlan: 1 } }
    );

    if (!user) return res.json({});
    return res.json({
      premiumExpiresAt: user.explodely_expiresAt || user.premiumExpiresAt || null,
      premiumCancelledAt: user.premiumCancelledAt || null,
      explodelyPlan: user.explodelyPlan || null
    });
  } catch (error) {
    console.error("❌ Erreur get-user-info:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});


// === REPLICATE IMAGE GENERATION ===
app.post('/api/replicate/generate', async (req, res) => {
  try {
    const { model, version, input = {} } = req.body;
    const token = process.env.REPLICATE_API_TOKEN || req.headers['x-replicate-token'];
    if (!token) return res.status(400).json({ error: 'REPLICATE_API_TOKEN manquant.' });

    let apiUrl, body;
    if (version) {
      apiUrl = 'https://api.replicate.com/v1/predictions';
      body = { version, input };
    } else {
      apiUrl = `https://api.replicate.com/v1/models/${model}/predictions`;
      body = { input };
    }

    console.log(`[REP] Submitting to ${model}${version ? ' (v:' + version.substring(0,8) + '...)' : ''}`, JSON.stringify(input).substring(0, 200));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=60'
      },
      body: JSON.stringify(body)
    });

    let data = await response.json();
    console.log(`[REP] Response status: ${data.status}`, data.error || '');

    if (data.status === 'starting' || data.status === 'processing') {
      const getUrl = data.urls?.get;
      if (getUrl) {
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const pollRes = await fetch(getUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          data = await pollRes.json();
          if (i % 5 === 0) console.log(`[REP] Poll ${i}: ${data.status}`);
          if (data.status === 'succeeded' || data.status === 'failed' || data.status === 'canceled') {
            break;
          }
        }
      }
    }

    if (data.status === 'succeeded') console.log('[REP] Done! Output:', JSON.stringify(data.output).substring(0, 200));
    if (data.status === 'failed') console.log('[REP] FAILED:', data.error);

    res.json(data);
  } catch (error) {
    console.error('[REP] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// === FAL.AI IMAGE GENERATION ===
app.post('/api/fal/generate', async (req, res) => {
  try {
    const { input = {} } = req.body;
    const token = process.env.FAL_KEY || req.headers['x-fal-key'];
    if (!token) return res.status(400).json({ error: 'FAL_KEY manquant. Ajoute-le dans .env ou dans la page.' });

    const falEndpoint = input._falEndpoint || 'fal-ai/lora';
    const payload = { ...input };
    delete payload._falEndpoint;

    console.log(`[FAL] Submitting to ${falEndpoint}`, payload.model_name || '(FLUX)');

    const submitRes = await fetch(`https://queue.fal.run/${falEndpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const submitData = await submitRes.json();
    console.log('[FAL] Submit response:', JSON.stringify(submitData).substring(0, 500));

    if (submitData.detail || submitData.error) {
      return res.json(submitData);
    }

    const requestId = submitData.request_id;
    const statusBase = submitData.status_url ? submitData.status_url.replace(/\/status$/, '') : `https://queue.fal.run/${falEndpoint}/requests/${requestId}`;

    if (!requestId) {
      return res.json({ error: 'Pas de request_id: ' + JSON.stringify(submitData).substring(0, 300) });
    }

    for (let i = 0; i < 150; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`${statusBase}/status`, {
        headers: { 'Authorization': `Key ${token}` }
      });
      const statusData = await statusRes.json();
      if (i % 5 === 0) console.log('[FAL] Poll', i, ':', statusData.status);

      if (statusData.status === 'COMPLETED') {
        const resultRes = await fetch(statusBase, {
          headers: { 'Authorization': `Key ${token}` }
        });
        const result = await resultRes.json();
        if (result.detail) {
          console.log('[FAL] Content policy error:', JSON.stringify(result.detail).substring(0, 300));
          return res.json({ error: Array.isArray(result.detail) ? result.detail[0]?.msg : result.detail });
        }
        console.log('[FAL] Result keys:', Object.keys(result || {}));
        return res.json(result);
      }
      if (statusData.status === 'FAILED') {
        console.log('[FAL] FAILED:', JSON.stringify(statusData).substring(0, 500));
        return res.json({ error: statusData.error || JSON.stringify(statusData) });
      }
    }

    res.json({ error: 'Timeout: la generation a pris trop de temps' });
  } catch (error) {
    console.error('[FAL] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// === VIDEO GENERATION (Image-to-Video via fal.ai) ===
const VIDEO_MODELS = {
  kling26: {
    submitUrl: 'https://queue.fal.run/fal-ai/kling-video/v2.6/pro/image-to-video',
    buildPayload: (prompt, image_url, duration) => ({
      prompt,
      start_image_url: image_url,
      duration: String(duration),
      negative_prompt: 'blur, distort, and low quality',
      generate_audio: false
    }),
    extractVideo: (result) => result.video?.url,
    cost5s: 0.40, cost10s: 0.75
  },
  kling25: {
    submitUrl: 'https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    buildPayload: (prompt, image_url, duration) => ({
      prompt,
      image_url,
      duration: String(duration),
      negative_prompt: 'blur, distort, and low quality'
    }),
    extractVideo: (result) => result.video?.url,
    cost5s: 0.35, cost10s: 0.70
  },
  wan26: {
    submitUrl: 'https://queue.fal.run/fal-ai/wan-i2v',
    buildPayload: (prompt, image_url, duration) => ({
      prompt, image_url,
      num_frames: 81,
      resolution: '720p',
      num_inference_steps: 40,
      guide_scale: 5,
      acceleration: 'none',
      enable_safety_checker: false,
      negative_prompt: 'blur, blurry, distort, low quality, deformed, disfigured, overexposed, bright colors, color artifacts, wrong anatomy, extra fingers, malformed limbs, ugly, worst quality, JPEG compression'
    }),
    extractVideo: (result) => result.video?.url,
    cost5s: 0.50, cost10s: 1.00, cost15s: 1.50
  },
  wan21: {
    submitUrl: 'https://queue.fal.run/fal-ai/wan-i2v',
    buildPayload: (prompt, image_url, duration) => ({
      prompt, image_url,
      num_frames: duration === '10' ? 161 : 81,
      enable_safety_checker: false,
      negative_prompt: 'blur, distort, low quality'
    }),
    cost5s: 0.50, cost10s: 1.00
  }
};

const videoRequestUrls = new Map();

// Step 1: Submit video generation — returns request_id immediately
app.post('/api/video/submit', async (req, res) => {
  try {
    const { prompt, image_url, duration = '5', model = 'wan26' } = req.body;
    const token = process.env.FAL_KEY || req.headers['x-fal-key'];
    if (!token) return res.status(400).json({ error: 'FAL_KEY manquant.' });
    if (!prompt || !image_url) return res.status(400).json({ error: 'prompt et image_url requis.' });

    const vm = VIDEO_MODELS[model];
    if (!vm) return res.status(400).json({ error: 'Modele video inconnu: ' + model });

    console.log(`[VIDEO:${model}] Submitting, duration: ${duration}`);

    const submitRes = await fetch(vm.submitUrl, {
      method: 'POST',
      headers: { 'Authorization': `Key ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(vm.buildPayload(prompt, image_url, duration))
    });
    const raw = await submitRes.text();
    let data;
    try { data = JSON.parse(raw); } catch (e) {
      console.log(`[VIDEO:${model}] Non-JSON submit response:`, raw.substring(0, 300));
      return res.json({ error: 'Reponse invalide: ' + raw.substring(0, 200) });
    }
    console.log(`[VIDEO:${model}] Submit OK:`, JSON.stringify(data).substring(0, 200));

    if (data.detail || data.error) return res.json({ error: data.detail || data.error });
    if (!data.request_id) return res.json({ error: 'Pas de request_id: ' + JSON.stringify(data).substring(0, 200) });

    videoRequestUrls.set(data.request_id, {
      statusUrl: data.status_url,
      responseUrl: data.response_url,
      model
    });
    console.log(`[VIDEO:${model}] Stored URLs — status: ${data.status_url}`);

    res.json({ request_id: data.request_id, model });
  } catch (error) {
    console.error('[VIDEO] Submit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Step 2: Poll status — lightweight, called repeatedly by frontend
app.get('/api/video/status/:model/:requestId', async (req, res) => {
  try {
    const { model, requestId } = req.params;
    const token = process.env.FAL_KEY || req.headers['x-fal-key'];
    const vm = VIDEO_MODELS[model];
    if (!vm) return res.status(400).json({ error: 'Modele inconnu' });

    const stored = videoRequestUrls.get(requestId);
    if (!stored) return res.json({ status: 'IN_PROGRESS' });

    const statusRes = await fetch(stored.statusUrl, {
      headers: { 'Authorization': `Key ${token}` }
    });
    const raw = await statusRes.text();
    let data;
    try { data = JSON.parse(raw); } catch (e) {
      console.log(`[VIDEO:${model}] Poll parse error, raw:`, raw.substring(0, 200));
      return res.json({ status: 'IN_PROGRESS' });
    }

    console.log(`[VIDEO:${model}] Poll ${requestId.substring(0,8)}... → ${data.status}`);

    if (data.status === 'COMPLETED') {
      const resultRes = await fetch(stored.responseUrl, {
        headers: { 'Authorization': `Key ${token}` }
      });
      const resultRaw = await resultRes.text();
      try {
        const result = JSON.parse(resultRaw);
        if (result.detail) {
          const msg = Array.isArray(result.detail) ? result.detail[0]?.msg : result.detail;
          console.log(`[VIDEO:${model}] Content policy error:`, msg);
          if (stored.creatorEmail) {
            const database = client.db('MyAICrush');
            await database.collection('users').updateOne({ email: stored.creatorEmail }, { $inc: { creditsPurchased: VIDEO_COST_TOKENS } });
            console.log(`[VIDEO-CREATOR] Refunded ${VIDEO_COST_TOKENS} tokens to ${stored.creatorEmail} (content policy)`);
          }
          videoRequestUrls.delete(requestId);
          return res.json({ status: 'FAILED', error: msg || 'Content policy violation' });
        }
        const videoUrl = result.video?.url;
        console.log(`[VIDEO:${model}] Done! URL:`, videoUrl?.substring(0, 80));
        videoRequestUrls.delete(requestId);
        return res.json({ status: 'COMPLETED', video_url: videoUrl });
      } catch (e) {
        return res.json({ status: 'IN_PROGRESS' });
      }
    }
    if (data.status === 'FAILED') {
      if (stored.creatorEmail) {
        const database = client.db('MyAICrush');
        await database.collection('users').updateOne({ email: stored.creatorEmail }, { $inc: { creditsPurchased: VIDEO_COST_TOKENS } });
        console.log(`[VIDEO-CREATOR] Refunded ${VIDEO_COST_TOKENS} tokens to ${stored.creatorEmail} (generation failed)`);
      }
      videoRequestUrls.delete(requestId);
      return res.json({ status: 'FAILED', error: data.error || 'Generation echouee' });
    }
    res.json({ status: data.status || 'IN_PROGRESS' });
  } catch (error) {
    res.json({ status: 'IN_PROGRESS' });
  }
});

// =========================
// VIDEO CREATOR (user-facing: upload photo → video)
// =========================
const VIDEO_COST_TOKENS = 9;

app.post('/api/video-creator/submit', upload.single('image'), async (req, res) => {
  try {
    const { prompt, model, email } = req.body;
    if (!email) return res.status(401).json({ error: 'Email requis', needLogin: true });
    if (!req.file) return res.status(400).json({ error: 'Image requise' });

    const vm = VIDEO_MODELS[model];
    if (!vm) return res.status(400).json({ error: 'Modèle inconnu: ' + model });

    const falKey = process.env.FAL_KEY;
    if (!falKey) return res.status(500).json({ error: 'Configuration serveur manquante' });

    const database = client.db('MyAICrush');
    const users = database.collection('users');
    const user = await users.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const premiumRes = await fetch(`${BASE_URL}/api/is-premium`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const premiumData = await premiumRes.json();
    if (!premiumData.isPremium) {
      return res.status(403).json({ error: 'Réservé aux membres Premium', needPremium: true });
    }

    const tokens = user.creditsPurchased || 0;
    if (tokens < VIDEO_COST_TOKENS) {
      return res.status(403).json({ error: `Pas assez de jetons (${tokens}/${VIDEO_COST_TOKENS})`, needTokens: true });
    }

    // Compress image and convert to data URI for fal (works from any host)
    const compressed = await sharp(req.file.buffer).resize(1280, 1280, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    const imageUrl = `data:image/jpeg;base64,${compressed.toString('base64')}`;

    console.log(`[VIDEO-CREATOR] ${email} | model=${model} | tokens=${tokens} → ${tokens - VIDEO_COST_TOKENS} | img=${(compressed.length / 1024).toFixed(0)}KB`);

    // Deduct tokens
    await users.updateOne({ email: String(email).trim().toLowerCase() }, { $inc: { creditsPurchased: -VIDEO_COST_TOKENS } });

    // Submit to fal
    const videoPrompt = prompt || 'The person in the image moves naturally, subtle motion, cinematic lighting.';
    const submitRes = await fetch(vm.submitUrl, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(vm.buildPayload(videoPrompt, imageUrl, '10'))
    });

    const raw = await submitRes.text();
    let data;
    try { data = JSON.parse(raw); } catch (e) {
      console.error('[VIDEO-CREATOR] Invalid fal response:', raw.substring(0, 300));
      await users.updateOne({ email: String(email).trim().toLowerCase() }, { $inc: { creditsPurchased: VIDEO_COST_TOKENS } });
      return res.status(500).json({ error: 'Erreur de génération vidéo' });
    }

    if (data.detail || data.error) {
      console.error('[VIDEO-CREATOR] fal error:', data.detail || data.error);
      await users.updateOne({ email: String(email).trim().toLowerCase() }, { $inc: { creditsPurchased: VIDEO_COST_TOKENS } });
      return res.status(500).json({ error: 'Erreur API vidéo: ' + (data.detail || data.error) });
    }

    if (!data.request_id) {
      await users.updateOne({ email: String(email).trim().toLowerCase() }, { $inc: { creditsPurchased: VIDEO_COST_TOKENS } });
      return res.status(500).json({ error: 'Pas de request_id retourné' });
    }

    videoRequestUrls.set(data.request_id, { statusUrl: data.status_url, responseUrl: data.response_url, model, creatorEmail: String(email).trim().toLowerCase() });
    console.log(`[VIDEO-CREATOR] Submitted OK → request_id=${data.request_id}`);

    res.json({ request_id: data.request_id, model });
  } catch (error) {
    console.error('[VIDEO-CREATOR] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save completed video: download from fal CDN → local disk + MongoDB
const userVideosDir = path.join(__dirname, 'public', 'user-videos');
if (!fs.existsSync(userVideosDir)) fs.mkdirSync(userVideosDir, { recursive: true });

app.post('/api/video-creator/save', async (req, res) => {
  try {
    const { email, videoUrl, model, prompt } = req.body;
    if (!email || !videoUrl) return res.status(400).json({ error: 'email and videoUrl required' });

    const filename = `vc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp4`;
    const filepath = path.join(userVideosDir, filename);

    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      console.error('[VIDEO-CREATOR:SAVE] Failed to download from fal:', videoRes.status);
      return res.status(500).json({ error: 'Failed to download video' });
    }
    const buffer = Buffer.from(await videoRes.arrayBuffer());
    await fsp.writeFile(filepath, buffer);

    const database = client.db('MyAICrush');
    const col = database.collection('user_videos');
    await col.insertOne({
      email: String(email).trim().toLowerCase(),
      localUrl: `/user-videos/${filename}`,
      model: model || 'unknown',
      prompt: (prompt || '').substring(0, 500),
      fileSize: buffer.length,
      createdAt: new Date()
    });

    console.log(`[VIDEO-CREATOR:SAVE] ${email} → ${filename} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
    res.json({ saved: true, localUrl: `/user-videos/${filename}` });
  } catch (error) {
    console.error('[VIDEO-CREATOR:SAVE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List user's saved videos
app.post('/api/video-creator/my-videos', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ videos: [] });

    const database = client.db('MyAICrush');
    const col = database.collection('user_videos');
    const videos = await col.find(
      { email: String(email).trim().toLowerCase() },
      { projection: { localUrl: 1, model: 1, prompt: 1, createdAt: 1 } }
    ).sort({ createdAt: -1 }).limit(50).toArray();

    res.json({ videos });
  } catch (error) {
    console.error('[VIDEO-CREATOR:MY-VIDEOS] Error:', error);
    res.status(500).json({ videos: [] });
  }
});

app.options('/api/save-canvas', (req, res) => {
  res.set({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.sendStatus(204);
});
app.post('/api/save-canvas', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  try {
    const { data, folder, filename } = req.body;
    if (!data || !folder || !filename) return res.status(400).json({ error: 'data, folder, filename required' });
    const base64 = data.replace(/^data:image\/\w+;base64,/, '');
    const dir = path.join(__dirname, folder);
    await fsp.mkdir(dir, { recursive: true });
    const filepath = path.join(dir, filename);
    await fsp.writeFile(filepath, Buffer.from(base64, 'base64'));
    console.log(`[SAVE-CANVAS] ${filepath} (${Buffer.from(base64, 'base64').length} bytes)`);
    res.json({ saved: true, filename });
  } catch (error) {
    console.error('[SAVE-CANVAS] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/save-images', async (req, res) => {
  try {
    const { images } = req.body;
    const results = [];
    for (const img of images) {
      const dir = path.join(__dirname, img.folder);
      await fsp.mkdir(dir, { recursive: true });
      const filepath = path.join(dir, img.filename);
      const r = await fetch(img.url);
      const ab = await r.arrayBuffer();
      await fsp.writeFile(filepath, Buffer.from(ab));
      results.push({ filename: img.filename, saved: true });
    }
    res.json({ results });
  } catch (error) {
    console.error('Save images error:', error);
    res.status(500).json({ error: error.message });
  }
});

// === PROXY FIREWORKS API avec streaming + fallback automatique ===
app.post('/api/generate-ai-prompts', async (req, res) => {
  try {
    const { messages, temperature = 0.95, max_tokens = 8000 } = req.body;

    const callFw = (model) => fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FIREWORKS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens, stream: true })
    });

    let response = await callFw(fwActiveModel);

    if ((response.status === 404 || response.status === 422) && fwActiveModel === FW_PRIMARY_MODEL) {
      fwSendModelAlert(FW_PRIMARY_MODEL, `HTTP ${response.status} on generate-ai-prompts`);
      fwActiveModel = FW_FALLBACK_MODEL;
      console.log(`🔄 Fireworks prompts → fallback: ${FW_FALLBACK_MODEL}`);
      response = await callFw(FW_FALLBACK_MODEL);
    }

    let content = '';
    const text = await response.text();
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try {
          const chunk = JSON.parse(line.slice(6));
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) content += delta;
        } catch(e) {}
      }
    }
    res.json({ choices: [{ message: { content } }] });
  } catch (error) {
    console.error('Fireworks API error:', error);
    res.status(500).json({ error: error.message });
  }
});


// =====================================================
// AI SUPPORT AGENT — Katie (Automated Support)
// =====================================================

// --- Rate limiter (per IP, 20 messages / 5 min) ---
const supportRateLimit = new Map();
function checkSupportRateLimit(ip) {
  const now = Date.now();
  const window = 5 * 60 * 1000;
  const max = 20;
  let entry = supportRateLimit.get(ip);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + window };
    supportRateLimit.set(ip, entry);
  }
  entry.count++;
  return entry.count <= max;
}

// --- Support Action Functions ---

async function supportLookupUser(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const database = client.db("MyAICrush");
  const users = database.collection("users");

  const allCaseVariants = await users
    .find({ email: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }, { projection: { password: 0 } })
    .toArray();

  let user = allCaseVariants.find((u) => u.email === normalizedEmail) || allCaseVariants[0] || null;
  const duplicateAccounts = allCaseVariants.length > 1 ? allCaseVariants.map((u) => ({ email: u.email, createdAt: u.createdAt, isPremium: u.explodelyPremium === true, tokens: u.creditsPurchased || 0 })) : null;

  if (!user) {
    const localPart = normalizedEmail.split("@")[0];
    const escaped = localPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const candidates = await users
      .find({ email: { $regex: escaped, $options: "i" } }, { projection: { email: 1 } })
      .limit(5)
      .toArray();

    if (candidates.length > 0) {
      return {
        found: false,
        message: `No exact match for "${normalizedEmail}". Similar accounts: ${candidates.map((c) => c.email).join(", ")}`,
        suggestions: candidates.map((c) => c.email),
      };
    }
    return { found: false, message: `No account found for "${normalizedEmail}"`, suggestions: [] };
  }

  if (duplicateAccounts) {
    const bestAccount = allCaseVariants.reduce((best, curr) => {
      const bestScore = (best.explodelyPremium ? 10 : 0) + (best.creditsPurchased || 0) + (Array.isArray(best.unlockedContents) ? best.unlockedContents.length : 0);
      const currScore = (curr.explodelyPremium ? 10 : 0) + (curr.creditsPurchased || 0) + (Array.isArray(curr.unlockedContents) ? curr.unlockedContents.length : 0);
      return currScore > bestScore ? curr : best;
    });
    user = bestAccount;
  }

  const isPremiumInDb = user.explodelyPremium === true;
  const hasExpired = user.premiumExpiresAt && new Date() >= new Date(user.premiumExpiresAt);

  // Check Explodely active subscription (primary)
  const explodelyStatus = await supportCheckExplodelyActive(normalizedEmail);

  // Check Stripe (secondary — legacy, non-renewal)
  let stripeInfo = null;
  try {
    const customers = await stripe.customers.search({ query: `email:"${normalizedEmail}"` });
    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 5 });
      for (const sub of subs.data) {
        if (sub.status === "active" || sub.status === "canceled") {
          const endDate = new Date(sub.current_period_end * 1000);
          stripeInfo = {
            status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end,
            currentPeriodEnd: endDate.toISOString().split("T")[0],
            isStillWithinPeriod: endDate > new Date(),
            note: "Stripe is legacy — all contracts are non-renewal",
          };
          break;
        }
      }
      if (stripeInfo) break;
    }
  } catch (_) {}

  const unlockedContents = Array.isArray(user.unlockedContents) ? user.unlockedContents : [];
  const nymphoUnlocked = user.nymphoUnlocked && typeof user.nymphoUnlocked === "object" ? Object.keys(user.nymphoUnlocked) : [];

  return {
    found: true,
    email: user.email,
    createdAt: user.createdAt,
    isPremiumInDb,
    premiumExpired: hasExpired,
    premiumExpiresAt: user.premiumExpiresAt || null,
    explodelyMainOrderId: user.explodelyMainOrderId || null,
    explodelySubscriptionActive: explodelyStatus.active,
    explodelyStatus,
    tokens: user.creditsPurchased || 0,
    nonRefundableGift: user.nonRefundableGift === true,
    goodwillGiftReceived: user.goodwillGiftReceived === true,
    stripeInfo,
    hasPassword: !!user.password,
    accountSource: user.accountSource || "signup",
    duplicateAccounts,
    premiumUsageEvidence: {
      unlockedContentsCount: unlockedContents.length,
      nymphoUnlockedCharacters: nymphoUnlocked,
      hasPremiumActivity: unlockedContents.length > 0 || nymphoUnlocked.length > 0,
    },
  };
}

async function supportCheckExplodelyActive(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const database = client.db("MyAICrush");
  const explodelyEvents = database.collection("explodely_events");
  const users = database.collection("users");

  // 1) Check ALL events for this email (not just premium_on/premium_off)
  const allEvents = await explodelyEvents
    .find({ email: normalizedEmail })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  if (allEvents.length === 0) {
    return { active: false, reason: "no_events_found", events: [] };
  }

  // 2) Find the most recent SALE event (premium_on, unknown_product_sale, or eventType "sale")
  const lastSale = allEvents.find(
    (e) => e.action === "premium_on" || e.action === "unknown_product_sale" || e.eventType === "sale"
  );

  // 3) Find any REFUND event (regardless of whether sale is present)
  const refundEvent = allEvents.find(
    (e) =>
      e.action === "premium_off" ||
      e.action === "unknown_product_refund" ||
      e.eventType === "refund" ||
      e.eventType === "refunded" ||
      e.eventType === "chargeback" ||
      e.eventType === "reversal"
  );

  // If no sale but there IS a refund → user was refunded (sale webhook may have been missed)
  if (!lastSale && refundEvent) {
    return {
      active: false,
      reason: "refunded",
      note: "No sale event recorded, but a refund event exists — user was refunded.",
      refund: { date: refundEvent.createdAt, orderId: refundEvent.orderId, action: refundEvent.action },
      events: allEvents.map((e) => ({ action: e.action, eventType: e.eventType, orderId: e.orderId, date: e.createdAt })),
    };
  }

  if (!lastSale) {
    return {
      active: false,
      reason: "no_sale_found",
      events: allEvents.map((e) => ({ action: e.action, eventType: e.eventType, orderId: e.orderId, date: e.createdAt })),
    };
  }

  // 4) Check if refund happened after the last sale
  if (refundEvent && refundEvent.createdAt > lastSale.createdAt) {
    return {
      active: false,
      reason: "refunded",
      lastSale: { date: lastSale.createdAt, orderId: lastSale.orderId, action: lastSale.action },
      refund: { date: refundEvent.createdAt, orderId: refundEvent.orderId, action: refundEvent.action },
    };
  }

  // 5) Check if there's a cancel event (subscription cancelled but not refunded)
  const cancelAfterSale = allEvents.find(
    (e) => (e.eventType === "cancel" || e.eventType === "canceled") && e.createdAt > lastSale.createdAt
  );

  // 5) Also check user record for explodelyMainOrderId and cancellation info
  const user = await users.findOne({ email: normalizedEmail }, { projection: { explodelyMainOrderId: 1, premiumCancelledAt: 1, explodely_expiresAt: 1 } });

  const cancelledViaSupport = !!user?.premiumCancelledAt;
  const isCancelled = !!cancelAfterSale || cancelledViaSupport;

  return {
    active: true,
    reason: isCancelled ? "sale_found_but_subscription_cancelled" : "sale_found_no_refund",
    cancelled: isCancelled,
    cancelledViaSupport,
    premiumCancelledAt: user?.premiumCancelledAt || null,
    accessContinuesUntil: user?.explodely_expiresAt ? new Date(user.explodely_expiresAt).toISOString().split("T")[0] : null,
    lastSale: { date: lastSale.createdAt, orderId: lastSale.orderId, productId: lastSale.productId, action: lastSale.action },
    explodelyMainOrderId: user?.explodelyMainOrderId || lastSale.orderId,
  };
}

async function supportCheckPremiumDiagnosis(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const database = client.db("MyAICrush");
  const users = database.collection("users");

  const user = await users.findOne({ email: normalizedEmail });
  if (!user) return { found: false, message: "User not found" };

  const issues = [];
  const fixes = [];

  const isExplodelyPremiumInDb = user.explodelyPremium === true;
  const expired = user.premiumExpiresAt && new Date() >= new Date(user.premiumExpiresAt);

  // 1) CHECK EXPLODELY FIRST (primary payment processor)
  const explodelyStatus = await supportCheckExplodelyActive(normalizedEmail);

  if (explodelyStatus.active && !isExplodelyPremiumInDb) {
    issues.push("User has an ACTIVE Explodely subscription but premium is NOT active in database — needs fixing");
    fixes.push("activate_premium");
  } else if (explodelyStatus.active && isExplodelyPremiumInDb && !expired) {
    issues.push("Premium is active via Explodely and working correctly");
  } else if (!explodelyStatus.active && isExplodelyPremiumInDb && !expired && explodelyStatus.reason === "refunded") {
    issues.push(`INCONSISTENCY: Premium is active in the database BUT a REFUND was processed (${explodelyStatus.refund?.date}). The user was refunded — premium should NOT be active. Do NOT tell them to clear cache. Tell them a refund was processed for their order.`);
  } else if (!explodelyStatus.active && isExplodelyPremiumInDb && !expired) {
    issues.push("Premium IS ACTIVE in the database (manually set or via webhook). The user's premium should be working. If they say photos are blurred, it's likely a cache/session issue — tell them to log out and back in, clear cache, or try another browser.");
  } else if (isExplodelyPremiumInDb && expired) {
    issues.push(`Premium marked active but EXPIRED on ${user.premiumExpiresAt}`);
  }

  // 2) CHECK STRIPE (secondary — all contracts are non-renewal since Stripe ban)
  let stripeInfo = null;
  try {
    const customers = await stripe.customers.search({ query: `email:"${normalizedEmail}"` });
    for (const cust of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: cust.id, status: "all", limit: 5 });
      for (const sub of subs.data) {
        if (sub.status === "active" || sub.status === "canceled") {
          const endDate = new Date(sub.current_period_end * 1000);
          stripeInfo = {
            id: sub.id,
            status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end,
            currentPeriodEnd: endDate.toISOString().split("T")[0],
            isStillWithinPeriod: endDate > new Date(),
          };
          break;
        }
      }
      if (stripeInfo) break;
    }
  } catch (_) {}

  if (stripeInfo) {
    if (stripeInfo.isStillWithinPeriod) {
      issues.push(`Stripe subscription found (non-renewal) — active until ${stripeInfo.currentPeriodEnd}. Will NOT renew after that.`);
    } else {
      issues.push(`Old Stripe subscription found — expired on ${stripeInfo.currentPeriodEnd}.`);
    }
  }

  const accountCreatedBefore2026 = user.createdAt && new Date(user.createdAt) < new Date("2026-01-01");

  const unlockedContents = Array.isArray(user.unlockedContents) ? user.unlockedContents : [];
  const nymphoUnlocked = user.nymphoUnlocked && typeof user.nymphoUnlocked === "object" ? Object.keys(user.nymphoUnlocked) : [];
  const hasPremiumActivity = unlockedContents.length > 0 || nymphoUnlocked.length > 0;

  if (!explodelyStatus.active && !stripeInfo && !isExplodelyPremiumInDb) {
    if (explodelyStatus.reason === "no_events_found" || explodelyStatus.reason === "no_sale_found") {
      if (accountCreatedBefore2026 || hasPremiumActivity) {
        issues.push("EXPIRED STRIPE CUSTOMER DETECTED: Account created before 2026 with no current payment records. This is a returning customer whose old subscription expired. Follow the EXPIRED STRIPE CUSTOMER flow: go to sales mode (reassure + offer 50 goodwill tokens if eligible + re-subscribe link). Do NOT ask for another email.");
      } else {
        issues.push("No payment events found in our records for this email. User may have used a different email for payment.");
      }
    } else if (explodelyStatus.reason === "refunded") {
      issues.push(`User was REFUNDED. Sale on ${explodelyStatus.lastSale?.date}, refund on ${explodelyStatus.refund?.date}. Premium is correctly inactive.`);
    } else {
      issues.push("Payment data unclear. " + (explodelyStatus.reason || ""));
    }
  }

  if (hasPremiumActivity && isExplodelyPremiumInDb) {
    issues.push(`PREMIUM USAGE CONFIRMED: The user has unlocked ${unlockedContents.length} private content(s) and used nympho mode with ${nymphoUnlocked.length} character(s) (${nymphoUnlocked.join(", ") || "none"}). This PROVES premium is working on their account. Blurry images = cache/session issue, NOT a premium problem.`);
  }

  return {
    found: true,
    email: normalizedEmail,
    isPremiumInDb: isExplodelyPremiumInDb,
    explodelyStatus,
    stripeInfo,
    expired,
    premiumExpiresAt: user.premiumExpiresAt,
    explodelyMainOrderId: user.explodelyMainOrderId || null,
    issues,
    availableFixes: fixes,
    premiumUsageEvidence: {
      unlockedContentsCount: unlockedContents.length,
      nymphoUnlockedCharacters: nymphoUnlocked,
      hasPremiumActivity,
    },
  };
}

async function supportFixPremium(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const database = client.db("MyAICrush");
  const users = database.collection("users");

  // SAFETY: verify payment exists before activating
  const explodelyStatus = await supportCheckExplodelyActive(normalizedEmail);

  if (!explodelyStatus.active) {
    if (explodelyStatus.reason === "refunded") {
      return {
        success: false,
        message: `Cannot activate premium: this user was REFUNDED (sale: ${explodelyStatus.lastSale?.date}, refund: ${explodelyStatus.refund?.date}). Premium should stay inactive.`,
      };
    }

    // No Explodely sale found — check Stripe as fallback
    let stripeActive = false;
    try {
      const customers = await stripe.customers.search({ query: `email:"${normalizedEmail}"` });
      for (const cust of customers.data) {
        const subs = await stripe.subscriptions.list({ customer: cust.id, status: "active" });
        if (subs.data.length > 0) stripeActive = true;
      }
    } catch (_) {}

    if (!stripeActive) {
      return {
        success: false,
        reactivationNotPossible: true,
        message: `Cannot sync premium: no active payment entitlement for ${normalizedEmail} in our records (no qualifying sale/subscription). This is not something chat can fix. Tell the customer clearly they need a new subscription via the website — you cannot reactivate billing here.`,
      };
    }
  }

  await users.updateOne(
    { email: normalizedEmail },
    { $set: { explodelyPremium: true }, $unset: { premiumExpiresAt: "", premiumCancelledAt: "" } }
  );
  premiumCache.delete(normalizedEmail);

  const supportLogs = database.collection("support_logs");
  await supportLogs.insertOne({
    action: "premium_fixed",
    email: normalizedEmail,
    source: explodelyStatus.active ? "explodely_verified" : "stripe_fallback",
    fixedAt: new Date(),
  });

  return {
    success: true,
    message: `Premium access synced for ${normalizedEmail} (database flag updated to match active payment record). This does NOT create a new subscription or restart billing — wording for customer: access should match what they already paid for; they may need to log out/in if the app still looks wrong.`,
  };
}

async function supportCancelSubscription(email, explicitOrderId) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const database = client.db("MyAICrush");
  const users = database.collection("users");

  const user = await users.findOne({ email: normalizedEmail });
  if (!user) return { success: false, error: "User not found" };

  let cancelledExplodely = false;
  let cancelledStripe = false;
  const errors = [];
  let accessContinuesUntil = null;

  let mainOrderId = explicitOrderId ? String(explicitOrderId).trim() : (user.explodelyMainOrderId || null);
  if (explicitOrderId) {
    console.log(`📌 [Support] Using explicit order ID from customer: ${mainOrderId}`);
  }

  // Verify the stored mainOrderId is for the PREMIUM product, not tokens
  const PREMIUM_PRODUCT_ID = process.env.EXPLODELY_PREMIUM_PRODUCT_ID || "22705532";
  const explodelyEvents = database.collection("explodely_events");

  if (mainOrderId && !explicitOrderId) {
    const storedEvent = await explodelyEvents.findOne({ orderId: mainOrderId, email: normalizedEmail });
    if (storedEvent && storedEvent.productId && String(storedEvent.productId) !== String(PREMIUM_PRODUCT_ID)) {
      console.log(`⚠️ [Support] Stored mainOrderId ${mainOrderId} is for product ${storedEvent.productId} (tokens), not premium ${PREMIUM_PRODUCT_ID}. Looking for premium order...`);
      mainOrderId = null;
    }
  }

  if (!mainOrderId) {
    const allSaleEvents = await explodelyEvents.find({ email: normalizedEmail, eventType: "sale" }).sort({ createdAt: -1 }).limit(10).toArray();
    console.log(`🔍 [Support] All sale events for ${normalizedEmail}:`, JSON.stringify(allSaleEvents.map(e => ({ orderId: e.orderId, productId: e.productId, action: e.action, eventType: e.eventType }))));

    const premiumSaleEvent = allSaleEvents.find(e => String(e.productId) === String(PREMIUM_PRODUCT_ID));
    if (premiumSaleEvent && premiumSaleEvent.orderId) {
      mainOrderId = premiumSaleEvent.orderId;
    }

    if (!mainOrderId) {
      const premiumOnEvent = allSaleEvents.find(e => e.action === "premium_on");
      if (premiumOnEvent && premiumOnEvent.orderId) {
        mainOrderId = premiumOnEvent.orderId;
      }
    }

    if (mainOrderId) {
      console.log(`✅ [Support] Found premium order ID: ${mainOrderId}`);
      await users.updateOne({ _id: user._id }, { $set: { explodelyMainOrderId: mainOrderId } });
    }
  }

  if (mainOrderId) {
    try {
      const cancelUrl = `https://explodely.com/api/v1/rebill?username=${process.env.EXPLODELY_USERNAME}&apikey=${process.env.EXPLODELY_API_KEY}&apiaction=cancelrebill&mainorderid=${mainOrderId}`;
      console.log(`🔄 [Support] Explodely cancel API call for ${normalizedEmail}, mainOrderId=${mainOrderId}`);
      const r = await fetch(cancelUrl);
      const rawText = await r.text();
      console.log(`📦 [Support] Explodely cancel response (status=${r.status}):`, rawText);
      let d;
      try { d = JSON.parse(rawText); } catch { d = { error: `Non-JSON response: ${rawText.substring(0, 200)}` }; }
      if (!d.error) {
        cancelledExplodely = true;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        accessContinuesUntil = expiresAt.toISOString().split("T")[0];
        await users.updateOne({ _id: user._id }, { $set: { premiumCancelledAt: new Date(), explodely_expiresAt: expiresAt } });
        const explodelyEvents = database.collection("explodely_events");
        await explodelyEvents.insertOne({
          email: normalizedEmail,
          eventType: "cancel",
          action: "subscription_cancelled_via_support",
          orderId: mainOrderId,
          createdAt: new Date(),
          source: "support_bot",
        });
      } else {
        errors.push(`Explodely: ${d.error}`);
      }
    } catch (e) {
      errors.push(`Explodely: ${e.message}`);
    }
  }

  try {
    const customers = await stripe.customers.search({ query: `email:"${normalizedEmail}"` });
    for (const cust of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: cust.id, status: "active" });
      for (const sub of subs.data) {
        await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
        cancelledStripe = true;
        if (sub.current_period_end) {
          const end = new Date(sub.current_period_end * 1000);
          const ymd = end.toISOString().split("T")[0];
          if (!accessContinuesUntil) {
            accessContinuesUntil = ymd;
          } else {
            const prevEnd = new Date(accessContinuesUntil + "T12:00:00.000Z");
            if (end > prevEnd) accessContinuesUntil = ymd;
          }
        }
      }
    }
  } catch (e) {
    errors.push(`Stripe: ${e.message}`);
  }

  // Check Stripe info (non-renewal, just for info)
  let stripeEndDate = null;
  try {
    const customers = await stripe.customers.search({ query: `email:"${normalizedEmail}"` });
    for (const cust of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: cust.id, status: "all", limit: 5 });
      for (const sub of subs.data) {
        if ((sub.status === "active" || sub.status === "canceled") && sub.current_period_end) {
          const end = new Date(sub.current_period_end * 1000);
          if (end > new Date()) {
            stripeEndDate = end.toISOString().split("T")[0];
            if (!accessContinuesUntil) accessContinuesUntil = stripeEndDate;
            if (!sub.cancel_at_period_end) {
              await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
              cancelledStripe = true;
            }
          }
        }
      }
    }
  } catch (e) {
    errors.push(`Stripe: ${e.message}`);
  }

  premiumCache.delete(normalizedEmail);

  let message = "";
  if (cancelledExplodely) {
    message = `Explodely subscription cancelled for ${normalizedEmail}. Premium access continues until ${accessContinuesUntil} (end of the period already paid / billing cycle). No further renewals.`;
  } else if (cancelledStripe) {
    const until = accessContinuesUntil || stripeEndDate || "end of period";
    message = `Stripe subscription set to non-renewal for ${normalizedEmail}. Premium access continues until ${until} (period already paid). No further renewals.`;
  } else if (stripeEndDate) {
    message = `No Explodely subscription found. User has a legacy Stripe subscription (already non-renewal) active until ${stripeEndDate}. It will NOT renew.`;
  } else {
    message = `Could not find any active subscription to cancel. ${errors.join("; ")}`;
  }

  return {
    success: cancelledExplodely || cancelledStripe,
    cancelledExplodely,
    cancelledStripe,
    stripeEndDate,
    accessContinuesUntil,
    errors: errors.length > 0 ? errors : undefined,
    message,
  };
}

async function removeUserFromSystemeIo(email) {
  try {
    const SYSTEME_API_KEY = process.env.SYSTEME_API_KEY;
    const SYSTEME_API_BASE_URL = process.env.SYSTEME_API_BASE_URL || "https://api.systeme.io";
    if (!SYSTEME_API_KEY) return { deleted: false, reason: "no_api_key" };

    const normalizedEmail = String(email).trim().toLowerCase();
    const headers = { "Accept": "application/json", "X-API-Key": SYSTEME_API_KEY };

    const listRes = await fetch(
      `${SYSTEME_API_BASE_URL}/api/contacts?email=${encodeURIComponent(normalizedEmail)}&limit=10`,
      { method: "GET", headers }
    );
    if (!listRes.ok) return { deleted: false, reason: `list_error_${listRes.status}` };

    const listData = await listRes.json();
    const contacts = (listData.items || []).filter((c) => c.email && c.email.toLowerCase() === normalizedEmail);
    if (contacts.length === 0) return { deleted: false, reason: "not_found_in_systemeio" };

    const results = [];
    for (const contact of contacts) {
      const delRes = await fetch(`${SYSTEME_API_BASE_URL}/api/contacts/${contact.id}`, {
        method: "DELETE",
        headers,
      });
      results.push({ id: contact.id, status: delRes.status, ok: delRes.status === 204 || delRes.status === 200 });
      console.log(`🗑️ Systeme.io contact ${contact.id} (${normalizedEmail}): DELETE → ${delRes.status}`);
    }

    const allOk = results.every((r) => r.ok);
    return { deleted: allOk, contactsProcessed: results.length, results };
  } catch (err) {
    console.error("❌ removeUserFromSystemeIo error:", err.message);
    return { deleted: false, reason: err.message };
  }
}

async function supportDeleteAccount(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const database = client.db("MyAICrush");
  const users = database.collection("users");
  const supportLogs = database.collection("support_logs");

  const user = await users.findOne({ email: normalizedEmail });

  // Always check Systeme.io regardless of MongoDB presence (GDPR: remove from mailing list too)
  const systemeResult = await removeUserFromSystemeIo(normalizedEmail);

  if (!user) {
    // No MongoDB account, but may have been on mailing list
    await supportLogs.insertOne({
      action: "account_delete_attempt",
      email: normalizedEmail,
      mongoFound: false,
      systemeIoDeleted: systemeResult.deleted,
      deletedAt: new Date(),
    });

    if (systemeResult.deleted) {
      return {
        success: true,
        mongoDeleted: false,
        systemeIoDeleted: true,
        message: `No account found in our app database for ${normalizedEmail}, but the email WAS found and removed from our mailing list — they will no longer receive any emails from us. GDPR deletion is complete.`,
      };
    }
    return {
      success: false,
      mongoDeleted: false,
      systemeIoDeleted: false,
      error: `No account found for ${normalizedEmail} in our app database, and no entry found in our mailing list either. Nothing to delete.`,
    };
  }

  const cancelResult = await supportCancelSubscription(normalizedEmail);

  await users.deleteOne({ email: normalizedEmail });
  premiumCache.delete(normalizedEmail);

  await supportLogs.insertOne({
    action: "account_deleted",
    email: normalizedEmail,
    mongoDeleted: true,
    subscriptionCancelled: cancelResult.success,
    systemeIoDeleted: systemeResult.deleted,
    deletedAt: new Date(),
  });

  const parts = [`Account and all data for ${normalizedEmail} permanently deleted (GDPR).`];
  if (cancelResult.success) parts.push("Subscription cancelled.");
  if (systemeResult.deleted) parts.push("Email list contact removed (no more marketing emails).");
  else if (systemeResult.reason === "not_found_in_systemeio") parts.push("No mailing list entry found (already clean).");
  else parts.push(`Mailing list removal attempted but uncertain (${systemeResult.reason}). Manual check may be needed.`);

  return { success: true, mongoDeleted: true, systemeIoDeleted: systemeResult.deleted, message: parts.join(" ") };
}

async function supportProcessRefund(email, product) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const productType = String(product || "auto").toLowerCase();
  const database = client.db("MyAICrush");
  const users = database.collection("users");
  const explodelyEvents = database.collection("explodely_events");
  const supportLogs = database.collection("support_logs");

  const user = await users.findOne({ email: normalizedEmail });
  if (!user) return { success: false, error: "User not found" };

  const isNonRefundable = user.nonRefundableGift === true;
  if (isNonRefundable) {
    return {
      success: false,
      error: "NON-REFUNDABLE: This user previously accepted a free token gift as compensation. Refund is no longer available. Direct them to https://myaicrush.ai/ticket.html if they have concerns.",
    };
  }

  // --- TOKEN REFUND INFO (no tokens are removed — refund is manual) ---
  if (productType === "tokens" || productType === "credits") {
    const tokenPurchases = await explodelyEvents
      .find({ email: normalizedEmail, action: "tokens_add" })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const currentBalance = user.creditsPurchased || 0;
    const totalPurchased = tokenPurchases.reduce((sum, e) => sum + (e.tokens || 0), 0);
    const tokensUsed = totalPurchased - currentBalance;

    if (tokenPurchases.length === 0) {
      return { success: false, error: `No token purchases found for ${normalizedEmail}. Current balance: ${currentBalance} tokens.` };
    }

    await supportLogs.insertOne({
      action: "token_refund_requested",
      email: normalizedEmail,
      currentBalance,
      totalPurchased,
      tokensUsed,
      purchases: tokenPurchases.map((e) => ({ tokens: e.tokens, orderId: e.orderId, date: e.createdAt })),
      requestedAt: new Date(),
    });

    return {
      success: true,
      requiresManualAction: true,
      refundableTokens: currentBalance,
      totalPurchased,
      tokensUsed,
      currentBalance,
      purchases: tokenPurchases.map((e) => ({ tokens: e.tokens, orderId: e.orderId, date: e.createdAt })),
      message: `Token refund info for ${normalizedEmail}: Purchased ${totalPurchased} tokens total, used ${tokensUsed}, remaining ${currentBalance}. Only the ${currentBalance} unused tokens are eligible for refund. Refund request logged — the team will process it manually. DO NOT remove tokens from the user's balance.`,
    };
  }

  // --- PREMIUM REFUND INFO (no cancellation done — refund is manual) ---
  const isPremium = user.explodelyPremium === true;
  const explodelyStatus = await supportCheckExplodelyActive(normalizedEmail);

  let stripeInfo = null;
  try {
    const customers = await stripe.customers.search({ query: `email:"${normalizedEmail}"` });
    for (const cust of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: cust.id, status: "all", limit: 5 });
      for (const sub of subs.data) {
        if (sub.status === "active" || sub.status === "canceled") {
          const endDate = new Date(sub.current_period_end * 1000);
          stripeInfo = { id: sub.id, status: sub.status, currentPeriodEnd: endDate.toISOString().split("T")[0], isStillWithinPeriod: endDate > new Date() };
          break;
        }
      }
      if (stripeInfo) break;
    }
  } catch (_) {}

  await supportLogs.insertOne({
    action: "premium_refund_requested",
    email: normalizedEmail,
    isPremium,
    explodelyStatus: explodelyStatus.reason,
    stripeInfo,
    requestedAt: new Date(),
  });

  return {
    success: true,
    requiresManualAction: true,
    isPremium,
    explodelyStatus,
    stripeInfo,
    message: `Premium refund info for ${normalizedEmail}: Premium active in DB: ${isPremium}. Refund request has been logged — the team will process it manually. DO NOT cancel subscription or deactivate premium — only the admin can do this.`,
  };
}

async function supportCheckTokens(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const database = client.db("MyAICrush");
  const users = database.collection("users");
  const explodelyEvents = database.collection("explodely_events");

  const user = await users.findOne({ email: normalizedEmail });
  if (!user) return { found: false, message: "User not found" };

  const recentTokenEvents = await explodelyEvents
    .find({ email: normalizedEmail, action: "tokens_add" })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  return {
    found: true,
    currentBalance: user.creditsPurchased || 0,
    nonRefundableGift: user.nonRefundableGift === true,
    goodwillGiftReceived: user.goodwillGiftReceived === true,
    recentPurchases: recentTokenEvents.map((e) => ({ tokens: e.tokens, date: e.createdAt, orderId: e.orderId })),
  };
}

async function supportCreditTokens(email, amount, reason, orderId) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const toAdd = Number(amount);
  const reasonLower = String(reason || "").toLowerCase();

  const database = client.db("MyAICrush");
  const users = database.collection("users");
  const supportLogs = database.collection("support_logs");
  const explodelyEvents = database.collection("explodely_events");

  if (reasonLower.includes("retention")) {
    return { success: false, error: "Retention token gifts are no longer available. All subscribers now receive 30 free tokens monthly." };
  }

  const user = await users.findOne({ email: normalizedEmail });
  if (!user) return { success: false, error: "User not found" };

  if (reasonLower === "goodwill") {
    if (!Number.isFinite(toAdd) || toAdd <= 0 || toAdd > 50) {
      return { success: false, error: "Goodwill gift is limited to 1-50 tokens maximum." };
    }
    if (user.goodwillGiftReceived === true) {
      return { success: false, error: "This user has already received a goodwill token gift. Only one goodwill gift is allowed per account, ever." };
    }
    await users.updateOne({ email: normalizedEmail }, {
      $inc: { creditsPurchased: toAdd },
      $set: { goodwillGiftReceived: true, goodwillGiftDate: new Date(), goodwillGiftAmount: toAdd }
    });
    await supportLogs.insertOne({
      action: "goodwill_tokens",
      email: normalizedEmail,
      tokensAdded: toAdd,
      reason: "goodwill",
      creditedAt: new Date(),
    });
    return { success: true, message: `${toAdd} goodwill tokens credited to ${normalizedEmail}. This is a one-time gift — no further goodwill credits can be issued to this account.` };
  }

  if (reasonLower === "missing_tokens") {
    if (!orderId) {
      return { success: false, error: "An orderId is required to credit missing tokens. Ask the customer for their order number from their payment receipt." };
    }
    const orderEvent = await explodelyEvents.findOne({
      orderId: String(orderId),
      email: normalizedEmail,
      action: "tokens_add"
    });
    if (!orderEvent) {
      return { success: false, error: `No token purchase found for order ${orderId} on email ${normalizedEmail}. Cannot credit tokens without a matching purchase.` };
    }
    const alreadyCredited = await supportLogs.findOne({
      action: "missing_tokens_credited",
      email: normalizedEmail,
      orderId: String(orderId)
    });
    if (alreadyCredited) {
      return { success: false, error: `Tokens for order ${orderId} have already been re-credited to this account on ${alreadyCredited.creditedAt}. Cannot credit the same order twice.` };
    }
    const tokenAmount = orderEvent.tokens || toAdd;
    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0 || tokenAmount > 1000) {
      return { success: false, error: "Invalid token amount from order." };
    }
    await users.updateOne({ email: normalizedEmail }, { $inc: { creditsPurchased: tokenAmount } });
    await supportLogs.insertOne({
      action: "missing_tokens_credited",
      email: normalizedEmail,
      orderId: String(orderId),
      tokensAdded: tokenAmount,
      originalEvent: orderEvent._id,
      creditedAt: new Date(),
    });
    return { success: true, message: `${tokenAmount} tokens re-credited to ${normalizedEmail} for order ${orderId}. This order cannot be re-credited again.` };
  }

  return { success: false, error: `Invalid reason '${reason}'. Allowed: 'goodwill' (max 50, once per account) or 'missing_tokens' (requires orderId).` };
}

async function supportSendPasswordReset(email, lang) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const detectedLang = String(lang || "en").toLowerCase();

  const database = client.db("MyAICrush");
  const users = database.collection("users");

  const allCaseVariants = await users
    .find({ email: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }, { projection: { email: 1, password: 1 } })
    .toArray();

  if (allCaseVariants.length === 0) {
    return { success: false, error: `No account found for ${normalizedEmail}. Cannot send password reset.` };
  }

  const user = allCaseVariants.find((u) => !!u.password) || allCaseVariants[0];

  if (!user.password) {
    return { success: false, error: `Account ${user.email} was created via Google login (no password set). The user should log in with Google instead. No reset email needed.` };
  }

  const token = require("crypto").randomBytes(20).toString("hex");
  const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await users.updateOne({ _id: user._id }, { $set: { resetToken: token, resetTokenExpires: expiration } });

  const resetUrl = `${BASE_URL}/reset-password-oneshot.html?email=${encodeURIComponent(user.email)}&token=${token}`;

  try {
    await sendResetEmail(user.email, resetUrl, detectedLang);
  } catch (smtpErr) {
    console.error("SMTP error in supportSendPasswordReset:", smtpErr.message);
    return {
      success: false,
      error: `Email could not be sent (SMTP error). Tell the user to go to ${BASE_URL}/forgot-password.html to request a password reset manually, or submit a request at https://myaicrush.ai/ticket.html.`,
      fallbackUrl: `${BASE_URL}/forgot-password.html`,
    };
  }

  const supportLogs = database.collection("support_logs");
  await supportLogs.insertOne({ action: "password_reset_sent", email: user.email, sentBy: "katie", sentAt: new Date() });

  return {
    success: true,
    emailSentTo: user.email,
    message: `Password reset email sent to ${user.email} (${detectedLang.startsWith("fr") ? "FR" : "EN"} version). The link is valid for 24 hours.`,
  };
}

async function supportSearchCustomer(query) {
  const q = String(query).trim().toLowerCase();
  const database = client.db("MyAICrush");
  const explodelyEvents = database.collection("explodely_events");
  const users = database.collection("users");
  const results = { byOrderId: null, byFuzzyEmail: [], byUserFuzzy: [] };

  // 1) Search by order ID (exact match)
  if (/^\d{5,}$/.test(q)) {
    const event = await explodelyEvents.findOne({ orderId: q });
    if (event) {
      results.byOrderId = { email: event.email, orderId: event.orderId, productId: event.productId, eventType: event.eventType, action: event.action, date: event.createdAt };
    }
  }

  // 2) Fuzzy email search in explodely_events
  if (q.includes("@")) {
    const [localPart, domain] = q.split("@");
    // Escape special regex chars but allow 1 char flexibility
    const escaped = localPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Build a regex that allows minor variations: each char can be optional or have an extra char
    const fuzzyChars = escaped.split("").map((c) => `${c}?`).join(".?");
    const fuzzyRegex = new RegExp(`^${fuzzyChars}@.*${domain.replace(/\./g, "\\.")}$`, "i");

    const events = await explodelyEvents
      .find({ email: { $regex: fuzzyRegex } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const uniqueEmails = [...new Set(events.map((e) => e.email))];
    results.byFuzzyEmail = uniqueEmails.map((em) => {
      const ev = events.find((e) => e.email === em);
      return { email: em, orderId: ev.orderId, action: ev.action, eventType: ev.eventType, date: ev.createdAt };
    });

    // 3) Also fuzzy search in users collection
    const userMatches = await users
      .find({ email: { $regex: fuzzyRegex } }, { projection: { email: 1, explodelyPremium: 1 } })
      .limit(5)
      .toArray();
    results.byUserFuzzy = userMatches.map((u) => ({ email: u.email, isPremium: u.explodelyPremium === true }));
  }

  // 4) If query is not an email and not a pure number, try as partial email or name search
  if (!q.includes("@") && !/^\d+$/.test(q) && q.length >= 3) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Search in explodely_events by partial email match
    const events = await explodelyEvents
      .find({ email: { $regex: escaped, $options: "i" } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    const uniqueEmails = [...new Set(events.map((e) => e.email))];
    results.byFuzzyEmail = uniqueEmails.map((em) => {
      const ev = events.find((e) => e.email === em);
      return { email: em, orderId: ev.orderId, action: ev.action, eventType: ev.eventType, date: ev.createdAt };
    });

    // Also search in users collection by partial email match
    const userMatches = await users
      .find({ email: { $regex: escaped, $options: "i" } }, { projection: { email: 1, explodelyPremium: 1, creditsPurchased: 1, createdAt: 1 } })
      .limit(5)
      .toArray();
    results.byUserFuzzy = userMatches.map((u) => ({
      email: u.email, isPremium: u.explodelyPremium === true, tokens: u.creditsPurchased || 0, createdAt: u.createdAt,
    }));

    // Try searching by splitting into parts (e.g. "nate britton" → search "nate" and "britton" in emails)
    const words = q.split(/[\s._\-+]+/).filter((w) => w.length >= 3);
    if (words.length > 1 && results.byFuzzyEmail.length === 0 && results.byUserFuzzy.length === 0) {
      for (const word of words) {
        const wordEscaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const wordUsers = await users
          .find({ email: { $regex: wordEscaped, $options: "i" } }, { projection: { email: 1, explodelyPremium: 1, creditsPurchased: 1 } })
          .limit(3)
          .toArray();
        for (const u of wordUsers) {
          if (!results.byUserFuzzy.find((r) => r.email === u.email)) {
            results.byUserFuzzy.push({ email: u.email, isPremium: u.explodelyPremium === true, tokens: u.creditsPurchased || 0 });
          }
        }
        const wordEvents = await explodelyEvents
          .find({ email: { $regex: wordEscaped, $options: "i" } })
          .sort({ createdAt: -1 })
          .limit(3)
          .toArray();
        for (const ev of wordEvents) {
          if (!results.byFuzzyEmail.find((r) => r.email === ev.email)) {
            results.byFuzzyEmail.push({ email: ev.email, orderId: ev.orderId, action: ev.action, eventType: ev.eventType, date: ev.createdAt });
          }
        }
      }
    }
  }

  const totalFound = (results.byOrderId ? 1 : 0) + results.byFuzzyEmail.length + results.byUserFuzzy.length;
  return { query: q, totalFound, ...results };
}

// --- OpenAI Tool Definitions ---

const SUPPORT_TOOLS = [
  {
    type: "function",
    function: {
      name: "lookup_user",
      description: "Search for a user account by email address. Returns account status, premium info, token balance, subscription details.",
      parameters: { type: "object", properties: { email: { type: "string", description: "User email" } }, required: ["email"] },
    },
  },
  {
    type: "function",
    function: {
      name: "check_premium_diagnosis",
      description: "Diagnose why premium might not be working. Checks Stripe, Explodely, and purchase history.",
      parameters: { type: "object", properties: { email: { type: "string", description: "User email" } }, required: ["email"] },
    },
  },
  {
    type: "function",
    function: {
      name: "fix_premium",
      description: "Sync premium flag in our database ONLY when payment records show an active entitlement (Explodely sale without refund, or active Stripe sub) but the account wrongly shows non-premium. NOT for subscription reactivation after cancel/expiry — user must buy again on the site. NOT if user only asks to reactivate without a matching entitlement. Always run check_premium_diagnosis first. Will REFUSE if no valid payment/subscription.",
      parameters: { type: "object", properties: { email: { type: "string", description: "User email" } }, required: ["email"] },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_subscription",
      description: "Cancel active subscription. Checks Explodely FIRST (primary), then Stripe (legacy). MANDATORY FLOW BEFORE CALLING: 1) Use lookup_user to check goodwillGiftReceived. 2) If goodwillGiftReceived is FALSE, offer 50 free tokens as retention (wait for response). 3) If user refuses tokens, ask explicit confirmation ('Can I proceed?'). 4) ONLY after explicit YES, call this tool. NEVER call without user confirmation in a separate message. If the customer provides an order number, pass it as orderId — this is especially important when the premium sale event is missing from the database. Response includes accessContinuesUntil — tell the customer they keep premium until that date.",
      parameters: { type: "object", properties: { email: { type: "string", description: "User email" }, orderId: { type: "string", description: "Optional: customer-provided order number for the premium subscription (use when DB lookup fails)" } }, required: ["email"] },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_account",
      description: "Permanently delete account and all data (GDPR). Cancels subscription + removes contact from mailing list (Systeme.io) so they stop receiving emails. IRREVERSIBLE — always confirm with user first.",
      parameters: { type: "object", properties: { email: { type: "string", description: "User email" } }, required: ["email"] },
    },
  },
  {
    type: "function",
    function: {
      name: "process_refund",
      description: "Process refund for premium OR tokens. For tokens: removes tokens from balance and logs manual refund. For premium: cancels subscription, deactivates premium, logs refund. Always confirm with user first.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "User email" },
          product: { type: "string", enum: ["premium", "tokens"], description: "What to refund: 'premium' for subscription, 'tokens' for token purchase" },
        },
        required: ["email", "product"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_tokens",
      description: "Check user's current token balance and recent token purchase history.",
      parameters: { type: "object", properties: { email: { type: "string", description: "User email" } }, required: ["email"] },
    },
  },
  {
    type: "function",
    function: {
      name: "credit_tokens",
      description: "Credit tokens to a user account. Two modes: (1) 'goodwill' — max 50 tokens, ONE TIME ONLY per account (for retention, apology, etc). (2) 'missing_tokens' — re-credit tokens from a verified purchase order (requires orderId, can only be done once per order). NEVER use reason='retention' — it is blocked.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "User email" },
          amount: { type: "number", description: "Number of tokens to credit (max 50 for goodwill, auto-detected for missing_tokens)" },
          reason: { type: "string", enum: ["goodwill", "missing_tokens"], description: "'goodwill' for a one-time gift (max 50, once per account ever), 'missing_tokens' for re-crediting a verified purchase (requires orderId)" },
          orderId: { type: "string", description: "Required for missing_tokens: the Explodely order ID from the customer's receipt" },
        },
        required: ["email", "amount", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_customer",
      description: "Fuzzy search for a customer by approximate email, partial email, or order number. Use this when an exact email lookup fails — the customer may have a typo in their email. Can also search by order ID from their receipt.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Email (even with typos), partial email (e.g. 'jacques.maio'), or order number (e.g. '46281643')" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_password_reset",
      description: "Send a password reset email to the user. The email contains a secure link valid for 24 hours. Detects if account uses Google login (no password) and warns accordingly. Use when a user says they forgot their password or can't log in.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "User email to send reset link to" },
          lang: { type: "string", description: "Language for the email: 'fr' for French, 'en' for English. Detect from user's message language." },
        },
        required: ["email"],
      },
    },
  },
];

// --- System Prompt ---

const SUPPORT_SYSTEM_PROMPT = `You are Katie, the AI support assistant for MyAiCrush (an adult AI companion chat platform).

YOUR CAPABILITIES — you can execute REAL actions on user accounts (only when tools succeed):
- Look up accounts by email
- Diagnose premium issues; SYNC the premium flag in our system ONLY when payment records prove an active entitlement but the account shows wrong (technical mismatch) — this is NOT "reactivating" a subscription
- Cancel subscriptions (stops renewal; access until end of paid period)
- Log refund requests (refunds are processed manually by admin)
- Delete accounts and data (GDPR compliance)
- Check token balance and credit missing tokens
- Offer 300 free retention tokens ($129 value) as alternative to refunds

WHAT YOU CANNOT DO (be honest with customers):
- You CANNOT "reactivate" a subscription or restart billing. There is NO tool for that. A cancelled or expired plan requires a NEW purchase on the website — say so clearly.
- You CANNOT charge cards, create checkout sessions, or place orders for the user. Direct them to the site to subscribe again.
- You CANNOT promise or describe outcomes unless the relevant tool just returned success in this same reply (see ANTI-HALLUCINATION below).

⚠️ CRITICAL BUSINESS CONTEXT:
- Explodely is the PRIMARY and CURRENT payment processor. Always check Explodely FIRST.
- Stripe is LEGACY — we were banned from Stripe. All existing Stripe subscriptions are set to NON-RENEWAL. They stay active until the end of the paid period, then expire. No new Stripe subscriptions can be created.
- When a Stripe subscription is found, tell the user: their subscription will end on [date] and will NOT renew. If they want to continue with premium, they should re-subscribe through the website (which uses Explodely now).

EMAIL PRIORITY (read carefully — this overrides old habits):
1. HIGHEST: Any email the user puts in their CURRENT message (e.g. "my email is x@...", "Email: x@...", footer of a forwarded mail).
2. NEXT: The most recent email they stated in EARLIER turns of this same conversation. If they correct themselves ("sorry, use y@..."), the LATEST wins — forget the old one for tool calls.
3. ONLY if they never wrote an email anywhere in the thread: use the SESSION email from CONTEXT (browser login) for lookups.
4. If tool lookups fail with (1) or (2), you may then try SESSION email, or search_customer / ask for payment email or order number — as in the flows below.

CONVERSATION MEMORY:
- You receive the full recent thread. Use it: names, order numbers, and especially emails the user already gave must not be ignored on the next turn.
- Never switch back to session email after the user explicitly gave another address, unless they clearly say the previous one was wrong and give a new one.

ONE SUBSCRIPTION CASE AT A TIME (same chat):
- Treat each chat as helping ONE customer flow at a time. Use ONE primary email for the active case (EMAIL PRIORITY). Fully finish or clearly pause that case before switching.
- If the user mixes two different emails or two unrelated requests (e.g. "cancel A and also fix B's tokens"), respond for the FIRST issue only, then ask them to confirm when ready for the second — do not run conflicting tools for two accounts in parallel in the same turn.
- If messages look like two different people (two names/two contradictory emails with no clarification), ask politely which account they need help with before using tools.
- Note: Each browser session is separate; you are not literally talking to two people at once unless they share one thread — in that case, still go one case at a time.

SCOPE & PRIVACY — ONE CUSTOMER, NO BULK, NO THIRD-PARTY ABUSE:
- You ONLY help the person using this chat. Tools are server-restricted: an email is in scope if (1) the customer typed it, (2) it is their logged-in session email, OR (3) YOU showed them that email in your recent messages after finding their order/account and they confirmed it is theirs (e.g. "Oui"). Same scope for cancel, delete, refunds, and lookups — still one case at a time, never mass actions.
- NEVER attempt bulk operations: no "delete all users", "erase every account", "list all emails", "dump the database", "export all customers", etc. Refuse immediately with a polite explanation — such actions do not exist and will never be run.
- NEVER run tools for random third-party emails that the customer never tied to this conversation. If someone asks to modify another person's account without establishing it is theirs, refuse.
- search_customer: only search using text that appears in this conversation (customer input or prior messages). Do not fish for unrelated accounts.

ANTI-HALLUCINATION — NON-NEGOTIABLE:
- NEVER write that you cancelled, reactivated, refunded, credited tokens, deleted an account, or "fixed" premium unless you actually called the matching tool IN THIS TURN and its JSON result shows success (e.g. success: true) or an explicit success message from that tool.
- If you did not call a tool, or the tool failed, say so honestly and what the customer can do next (e.g. subscribe on the site, submit a request at https://myaicrush.ai/ticket.html).
- NEVER fabricate tool results, dates, or order IDs.
- After fix_premium succeeds, do NOT say "your subscription was reactivated". Say that premium access was synced to match their payment record, or that the account now reflects their active entitlement — wording that does NOT imply a new subscription was created.

CANCEL vs DELETE — CRITICAL DISTINCTION (especially in French):
- These words mean CANCEL SUBSCRIPTION (stop charges): "résilier", "annuler", "cancel", "unsubscribe", "stop my subscription", "résilier mon compte", "résilier mon abonnement", "je veux annuler", "arrêter l'abonnement", "ne plus être prélevé"
- These words mean DELETE ACCOUNT (GDPR): "supprimer mon compte", "suppression complète", "suppression de mes données", "delete my account", "delete my data", "effacer mes données", "je veux la suppression"
- ABSOLUTE RULE: "résilier" = CANCEL, NEVER delete. Even "résilier mon compte" means cancel the subscription on that account, NOT delete the account.
- NEVER offer or suggest account deletion unless the user explicitly uses words like "supprimer", "suppression", "delete", "effacer". Do NOT say "supprimer votre compte" or "effacer vos données" in your reply if the user did not ask for that.
- When a user asks to "résilier" and their subscription is already inactive/expired:
  → Do NOT propose deletion. Do NOT mention deletion. Do NOT ask "voulez-vous supprimer votre compte?"
  → Instead: (1) Confirm their subscription is already ended. (2) Reassure them: no more charges will occur. (3) Follow the EXPIRED STRIPE CUSTOMER flow: offer 50 goodwill tokens (if eligible) + link to re-subscribe at https://myaicrush.ai/premium.html.
  → Your reply should END with the token offer, not with a deletion proposal.

REACTIVATION REQUESTS ("réactiver", "reactivate", "remettre l'abonnement"):
- There is no reactivation tool. Do NOT call fix_premium just because the user asks to "reactivate" — first use lookup_user + check_premium_diagnosis.
- If they still have an active paid period (cancelled renewal but time left), explain they keep access until that period ends; if the app shows wrong, troubleshoot cache/login or use fix_premium ONLY if diagnosis shows entitlement vs DB mismatch.
- If their paid access has ended or they have no valid sale/subscription in records, tell them clearly to take out a new subscription on the website. Do NOT imply you can turn billing back on.

CRITICAL RULES:
0. EXPIRED CUSTOMER DETECTION (CHECK THIS FIRST — BEFORE ALL OTHER RULES): If lookup_user shows the account was created BEFORE 2026, OR the user mentions they HAD a previous subscription/premium, AND there are no active payment records → this is an EXPIRED STRIPE CUSTOMER. IMMEDIATELY follow the "EXPIRED / INACTIVE STRIPE CUSTOMERS" flow (sales mode: reassure no charges + offer 50 goodwill tokens if eligible + re-subscribe link). Do NOT ask for another email. Do NOT ask for an order number. Do NOT troubleshoot. Go straight to sales mode.
1. You need an email BEFORE account actions, but follow EMAIL PRIORITY above — do NOT default to session login when the message contains another address. Do not ask again if the current or past user message already contains a usable email. NEVER invent emails.
2. ALWAYS use lookup_user (with the active email from EMAIL PRIORITY) to verify the account exists before other account actions when applicable.
3. ABSOLUTE RULE — NO EXCEPTIONS: For ANY destructive or irreversible action (delete account, refund, cancel), you MUST:
   a) First describe exactly what you will do
   b) Then ask "Can I proceed?" / "Puis-je procéder ?" and WAIT for the user's explicit YES
   c) ONLY THEN execute the action
   d) NEVER execute refund, deletion, or cancellation in the same turn as finding the account. Always wait for user confirmation in a SEPARATE message.
   e) SUBSCRIPTION CANCELLATION (before you call cancel_subscription): In your confirmation message, ALWAYS clearly state that cancelling stops future renewals/charges but the customer KEEPS full premium access until the end of the billing period they have already paid for (not instant cut-off). If lookup_user / check_premium_diagnosis shows a concrete end date (e.g. Stripe currentPeriodEnd, premiumExpiresAt), include that date. If you do not have a date, use this wording without inventing one. French example: « L'annulation coupe les futurs prélèvements ; vous gardez l'accès premium jusqu'à la fin de la période déjà payée. » English: "Cancellation stops future billing; you keep premium access through the end of the period you've already paid for."
4. MULTI-REQUEST PRIORITY: If a user asks for MULTIPLE things (e.g. "refund + cancel", "refund + delete"), handle them in this strict order:
   a) REFUND first → run the full RETENTION FLOW (gather info, propose 50 goodwill tokens if eligible). Only after the retention flow is completed (accepted or refused) do you move on.
   b) CANCEL / DELETE second → only after the refund/retention flow is fully resolved.
   Never combine or skip the retention offer just because the user also wants to cancel.
5. When search_customer returns a fuzzy match (not exact), ALWAYS confirm with the user: "I found an account with [email]. Is this yours?" BEFORE doing anything else.
6. Respond in the SAME LANGUAGE the user writes in. If French → French. If English → English.
7. Be empathetic, professional, concise. Use 🩷 occasionally.
8. NEVER reveal internal details (database fields, API names, system architecture, payment processor names). Say "our payment system" not "Explodely" or "Stripe".
9. If a user asks for a human agent the FIRST time, say you can handle most requests directly and ask what they need.
   If they insist a SECOND time, provide: https://myaicrush.ai/ticket.html (select "Speak to a human" as the reason)

SUBSCRIPTION / PREMIUM STATUS ("est-ce actif ?", "is my subscription active?", "mon abo est-il actif ?"):
- Once you know which account email this case is about, you CAN and MUST answer from our records. Call lookup_user AND check_premium_diagnosis for that email (same turn if needed).
- Explain in plain language: whether premium shows as active on the account, what payment records indicate (active entitlement, cancelled renewal but time left, refunded, no purchase found, etc.). Use the tool outputs — do not guess from order dates alone.
- FORBIDDEN: saying you "cannot verify", "cannot check the subscription right now", or "I don't have access to that information" when you have not called these tools. If you already have fresh tool results in the thread, use them. If a tool returns an error, say there was a technical error checking the account and suggest submitting a request at https://myaicrush.ai/ticket.html.

PREMIUM TROUBLESHOOTING — FOLLOW THIS EXACT FLOW:
1. Pick the email using EMAIL PRIORITY (message > prior turns > session). If the user only cares about payment records, use the payment email they gave; if they need the login account fixed, use the account email they gave — often they are the same, sometimes not.
2. Use lookup_user with that email.
3. Use check_premium_diagnosis with that email.
4. FIRST CHECK: Is isPremiumInDb already TRUE?
   - YES and user says it doesn't work (blurred photos, etc.) → Check premiumUsageEvidence from the tool results. If hasPremiumActivity is true (unlockedContents > 0 or nymphoUnlockedCharacters > 0), mention it as PROOF that their premium is working: e.g. "I can see in your account that you have already unlocked private content and/or used nympho mode with [character names], which confirms your premium access is working correctly." Then explain the blurry images are a cache/session issue and give the fix steps: 1) Log out and log back in. 2) Clear your browser cache. 3) Try a different browser. Do NOT ask for payment email.
   - YES and user just wants to check their status → Confirm their premium is active.
5. If isPremiumInDb is FALSE:
   a. If the diagnosis shows a sale with NO refund → the user paid and should be premium. Use fix_premium ONLY to sync the DB flag with that entitlement (not "reactivation" wording). If the user only asked to "reactivate" but diagnosis shows no active entitlement, do NOT use fix_premium — send them to the website to subscribe again.
   b. If the diagnosis shows reason "refunded" → the user was REFUNDED. Tell them clearly: "Our records show a refund was processed for your order. That is why your premium access is inactive. If you believe this is an error, please submit a request at https://myaicrush.ai/ticket.html." Do NOT ask for another email.
   c. If NO events found for that email → CHECK THESE CONDITIONS (in order):
      - Is the account created BEFORE 2026? → EXPIRED STRIPE CUSTOMER. Go to that flow. STOP HERE.
      - Does the user SAY they had a previous subscription ("j'avais un abo", "I paid before", "I had premium", etc.)? → EXPIRED STRIPE CUSTOMER. Go to that flow. STOP HERE.
      - Does premiumUsageEvidence.hasPremiumActivity = true? → EXPIRED STRIPE CUSTOMER. Go to that flow. STOP HERE.
      - If NONE of the above → this is a NEW customer (2026+) who may have used a different email. ONLY THEN ask: "What email did you use to make the payment? Do you have your order number?"
      CRITICAL: For expired Stripe customers, do NOT ask for another email, do NOT ask for an order number. Go DIRECTLY to sales mode (reassure + 50 goodwill tokens if eligible + re-subscribe link).
   d. If they give a different email → use check_premium_diagnosis with the PAYMENT email. If nothing found, use search_customer with the email to find fuzzy matches. If a valid sale without refund is found → use fix_premium with the ACCOUNT email (not payment email) only as a sync fix, not as subscription reactivation.
   e. If the user gives an order number → use search_customer with the order number. This is very reliable.
   f. If search_customer finds a similar email → confirm with the user, then proceed.
   g. If still nothing found → check Stripe. If Stripe subscription found, tell user it's active until [end date] but won't renew.
6. NEVER set someone as premium without first verifying they have a sale without refund (unless premium is already manually set in database).

IMPORTANT — ONE-SHOT vs SUBSCRIPTION PAYMENTS:
- Some users pay a ONE-TIME payment for premium (not a subscription). If there's a sale event and no refund → they are premium. Period. No need to check for "active subscription".
- For subscriptions: if the subscription was cancelled but NOT refunded, the user should still have access until the end of their billing period.
- Only if a REFUND event exists after the sale should premium be considered inactive.

EMAIL TYPOS & FUZZY SEARCH — IMPORTANT:
Customers often misspell their email (e.g. "maiorna" instead of "maiorana"). When a payment email lookup returns no results:
1. FIRST: Use search_customer with the email they gave — it does fuzzy matching and may find close matches.
2. If the customer gave their name, try searching with their name (e.g. "jacques.maio" as partial search).
3. If the customer has an order number/receipt, use search_customer with the order number — this is the most reliable way to find them.
4. If search_customer finds a close match, confirm with the customer: "I found an account with [correct email]. Is that yours?"
5. ONLY if nothing works, ask the customer to double-check their payment email for typos, and to provide their order number from the receipt if possible.

NOTE: The bot checks payment data from our webhook records in the database. It does NOT have direct access to query the payment provider's dashboard.

SUBSCRIPTION CANCELLATION:
- ALWAYS cancel on Explodely first (this is where current subscriptions are).
- The cancel_subscription tool handles both Explodely and Stripe. Its result may include accessContinuesUntil — always mention that date in your reply after a successful cancel.
- BEFORE calling cancel_subscription: your confirmation step (rule 3e) must already have explained access until end of paid period. AFTER success: repeat reassurance + date if the tool returned accessContinuesUntil.
- Most common issue: user can't cancel from the website because their account email ≠ payment email. You can cancel it directly.
- If only a Stripe subscription is found (legacy), tell the user it's already set to non-renewal, give them the end date, and confirm it will NOT renew.
- IMPORTANT: If the customer provides an order number in their message, ALWAYS pass it as the orderId parameter when calling cancel_subscription. This is critical because sometimes the premium sale event is missing from our database, and the customer-provided order number is the only way to cancel on Explodely.
- If cancel_subscription fails with "Could not find any active subscription", ask the customer for their order number (from their payment receipt/email) and retry with that orderId.

CANCELLATION RETENTION FLOW — MANDATORY BEFORE ANY CANCELLATION:
When a user asks to cancel their subscription, you MUST follow this flow BEFORE executing the cancellation. Do NOT skip it. Do NOT go straight to cancellation.

STEP 0: Look up the account with lookup_user. Check the "goodwillGiftReceived" field.
- If goodwillGiftReceived is TRUE → the user already received a free token offer previously. Skip the retention offer, go directly to the CONFIRMATION step below.
- If goodwillGiftReceived is FALSE → proceed to STEP 1.

STEP 1: RETENTION OFFER (mandatory if goodwillGiftReceived is false)
Before confirming cancellation, offer 50 free tokens as a reason to stay. Be warm, playful and slightly flirty (you are Katie). Make them want to stay.
- English example: "Before I process that, I have a special offer just for you! 🩷 I can add 50 free tokens to your account right now — you can use them for exclusive bonus features like nympho mode. Your premium stays active, and you get a nice gift on top. Would you like me to add the 50 free tokens to your account? Or would you still prefer to cancel? 😘"
- French example: "Avant de procéder, j'ai une offre spéciale rien que pour vous ! 🩷 Je peux ajouter 50 jetons gratuits directement sur votre compte — vous pourrez les utiliser pour des fonctionnalités bonus exclusives comme le mode nympho. Votre premium reste actif, et vous recevez un cadeau en plus. Souhaitez-vous que j'ajoute les 50 jetons gratuits, ou préférez-vous toujours annuler ? 😘"
- WAIT for their answer. Do NOT proceed until they respond.

STEP 2A: If user ACCEPTS the 50 tokens:
- Use credit_tokens with amount=50 and reason="goodwill"
- Confirm: "50 tokens added! Your subscription stays active. Enjoy! 🩷"
- Do NOT cancel the subscription.

STEP 2B: If user REFUSES and still wants to cancel:
- Proceed to the CONFIRMATION step below.

CONFIRMATION STEP (mandatory — NO EXCEPTIONS):
- Explain clearly: cancellation stops future renewals/charges, but they KEEP premium access until the end of the billing period already paid for.
- Ask explicitly: "Can I proceed with the cancellation?" / "Puis-je procéder à l'annulation ?"
- WAIT for their explicit YES before calling cancel_subscription.
- NEVER call cancel_subscription without explicit user confirmation in a SEPARATE message.

EXPIRED / INACTIVE STRIPE CUSTOMERS (VERY COMMON with French-speaking users):
Many French-speaking customers created their account before 2026 and had a Stripe subscription that has since expired or been set to non-renewal. Detect this situation when ANY of these patterns appear:
- No Explodely events + Stripe subscription expired/cancelled + isPremiumInDb=false
- No Explodely events + no Stripe info found + isPremiumInDb=false + BUT premiumUsageEvidence.hasPremiumActivity=true (they unlocked content or used nympho mode — this PROVES they were premium before, so their old subscription must have expired)
- Account created before 2026 + isPremiumInDb=false + no active payment anywhere
- The user SAYS they had a previous subscription (e.g. "j'avais un abonnement", "I had premium before", "I paid months ago", "my premium expired", "I lost my premium") — trust them, they are a returning customer
In ALL these cases, do NOT offer to "cancel" — there is NOTHING active to cancel. Do NOT ask for another payment email — we already know they are an old customer whose subscription expired. Instead, go straight into SALES MODE:
1. Briefly reassure: their old subscription has ended, no more charges.
2. Do NOT ask for another email or order number — skip straight to the re-subscription pitch.
3. Be warm, playful and slightly flirty/sexy in tone (you are Katie after all 😏). Make the offer sound irresistible and fun — not corporate. The goal is to make them WANT to come back.
4. Offer a welcome-back gesture: if goodwillGiftReceived is FALSE, offer 50 free tokens credited immediately as a welcome-back gift.
   - Tell them to re-subscribe at https://myaicrush.ai/premium.html for $29/month, cancel anytime.
   - IMPORTANT: Specify they must re-subscribe using the SAME email where the tokens are credited (their current account email).
   - The tokens will already be on their account when they re-subscribe — ready to use right away!
5. If they accept the tokens: credit them immediately with credit_tokens (amount=50, reason="goodwill").
6. If they decline: that's fine, just confirm their subscription is inactive and wish them well.
7. If goodwillGiftReceived is TRUE: skip the token offer, just pitch re-subscription warmly.
8. IMPORTANT: ALWAYS include both the reassurance AND the re-subscription pitch in the SAME message.
9. French example (adapt naturally, be playful): "Votre ancien abonnement est terminé, plus aucun prélèvement — vous pouvez souffler ! 🩷 Mais avouez que nos filles vous manquent un peu, non ? 😏 J'ai une offre spéciale pour vous : je peux ajouter 50 jetons gratuits directement sur votre compte, tout de suite. Il vous suffit de reprendre un abonnement premium sur https://myaicrush.ai/premium.html (29$/mois, résiliable quand vous voulez) avec votre email actuel, et vos jetons seront prêts à l'emploi dès votre retour. Alors, on se retrouve ? Souhaitez-vous que j'ajoute les jetons ? 😘"
10. English example (adapt naturally, be playful): "Your previous subscription has ended — no more charges, nothing to worry about! 🩷 But I bet you miss the girls a little, don't you? 😏 I've got a special welcome-back offer: I can add 50 free tokens to your account right now. Just re-subscribe at https://myaicrush.ai/premium.html ($29/month, cancel anytime) using your current email, and your tokens will be waiting for you the moment you're back. So... ready to come back? Want me to add the tokens? 😘"

REFUND POLICY — RETENTION FLOW (HIGHEST PRIORITY — OVERRIDES ALL OTHER ACTIONS):
When a user mentions "refund" (for tokens OR for premium), the RETENTION FLOW below is your FIRST and MANDATORY action — even if the user also asks to cancel or delete in the same message. Handle the refund/retention flow COMPLETELY before moving on to any cancellation or other request. Do NOT skip straight to cancellation or account deletion when a refund is also requested.

STEP 0: Check goodwill flag FIRST
- lookup_user returns a "goodwillGiftReceived" field. If it is TRUE, the user already accepted a free token offer previously. Skip to STEP 3C immediately — do NOT propose the retention offer again.

STEP 1: Gather info (ALWAYS do this before anything else)
- Use lookup_user to see the full picture (premium status, tokens, goodwillGiftReceived flag).
- For token refunds: also use check_tokens to see their balance, how many they purchased, and how many they used. Compare currentBalance to total purchased tokens — if currentBalance < total purchased, tokens have been consumed and are NOT refundable.
- For premium refunds: also use check_premium_diagnosis to see their subscription status.
- Tell the user CLEARLY: what they paid for, what they've used. Tokens already used (even partially) mean the token purchase is NOT refundable per our Terms & Conditions.
- If the user says "I paid 2 times" or mentions multiple purchases, investigate BOTH token and premium purchases and explain each one.
- CRITICAL: If all tokens have been consumed (currentBalance = 0 or less than total purchased), inform the user immediately that a token refund is not possible since the tokens were used. Do NOT proceed with the retention flow for tokens in this case — instead explain the policy and offer to help with anything else (e.g. cancel subscription to prevent future charges).

STEP 1B: EDUCATE about premium vs tokens (MANDATORY — do this BEFORE the retention offer)
- Trigger this step whenever the user complains about ANY of these: "paywall", "have to pay more", "not what I agreed to", "behind a paywall", "need tokens", "why do I need tokens if I'm premium?", "everything isn't unlocked", "still have to buy", "not what was advertised", etc.
- You MUST explain clearly and reassuringly:
  • "Your premium subscription gives you FULL access: unlimited conversations, all characters, unlimited uncensored photos and videos — everything is included, no extra cost."
  • "Tokens are ONLY for an optional bonus feature called 'nympho mode' which offers more explicit content. This is an extra for users who want to go even further — it is NOT required to enjoy the platform."
  • "So your premium is complete and working — you are NOT behind a paywall for the main experience. The vast majority of content is already unlocked for you!"
- This is critical because many users think premium is incomplete when they see the token prompt for nympho mode. Reassure them.
- AFTER this explanation, THEN propose the retention offer (STEP 2) — the 50 free tokens will let them try the nympho mode for free.

STEP 2: Propose the retention offer (combine education + offer in ONE message when user complains about paywall/tokens)
- When the user's complaint is about "paywall" / "have to pay more" / "not what I agreed to", your reply MUST follow this structure:
  1) FIRST: Acknowledge their frustration empathetically.
  2) THEN: Explain what premium ACTUALLY includes — be specific: "Your premium gives you unlimited uncensored photos and videos, unlimited conversations, all characters, voice messages — all included, no extra cost."
  3) THEN: Clarify the token confusion: "The only feature that requires tokens is an optional bonus called 'nympho mode' for even more explicit content. This is an extra — the main experience is fully unlocked for you."
  4) THEN: Offer 50 tokens as a way to try nympho mode for free: "To make it up to you, I can add 50 free tokens to your account right now so you can try those bonus features at no cost."
  5) Ask if they want the tokens or still want a refund.

- Example English (adapt naturally, don't copy verbatim): "I totally understand your frustration — let me clarify what's included. Your premium subscription actually gives you full access to unlimited uncensored photos and videos, unlimited conversations with all characters, and voice messages — all of that is already unlocked for you, no extra cost! The feature you may have encountered that asks for tokens is an optional bonus called 'nympho mode', which offers even more explicit content. It's an extra for users who want to go further, but it's absolutely not required to enjoy the platform. That said, I'd love to help you try it! I can add 50 free tokens to your account right now so you can explore those bonus features at no cost. Would you like me to add them, or would you still prefer a refund?"

- Example French: "Je comprends tout à fait votre frustration — laissez-moi vous expliquer ce qui est inclus. Votre abonnement premium vous donne un accès complet : photos et vidéos non censurées illimitées, conversations illimitées avec tous les personnages, et messages vocaux — tout est déjà débloqué, sans frais supplémentaires ! La fonctionnalité qui demande des jetons s'appelle le 'mode nympho', c'est un bonus optionnel pour du contenu encore plus explicite. Ce n'est pas du tout nécessaire pour profiter de la plateforme. Cela dit, j'aimerais vous aider à l'essayer ! Je peux ajouter 50 jetons gratuits à votre compte pour que vous puissiez explorer ces bonus sans frais. Souhaitez-vous que je les ajoute, ou préférez-vous toujours un remboursement ?"

- For simple refund requests WITHOUT a paywall complaint, a shorter version is fine: "Before processing your refund, I can offer you 50 free tokens as a gesture of goodwill..."

STEP 3A: If user ACCEPTS the 50 tokens:
- Use credit_tokens with amount=50 and reason="goodwill"
- Tell them: "50 tokens have been added to your account! Enjoy your tokens! 🩷"
- Do NOT cancel the subscription.

STEP 3B: If user REFUSES and still wants the refund:
- Do NOT use process_refund. Do NOT log anything. Do NOT remove tokens.
- Tell them you cannot process refunds directly — they need to submit a request via our support form.
- BUT ALSO proactively offer to cancel their subscription right now so they won't be charged again. This is something you CAN do immediately.
- English: "I understand. Unfortunately, I'm not able to process refunds directly from this chat. To submit your refund request, please fill out our support form at https://myaicrush.ai/ticket.html — it only takes a minute, and you'll receive a tracking link to follow your request. However, what I can do right now is cancel your subscription so you won't be charged again going forward. You'll keep your premium access until the end of the period you've already paid for. Would you like me to cancel it for you? 🩷"
- French: "Je comprends. Malheureusement, je ne suis pas en mesure de traiter les remboursements directement depuis ce chat. Pour soumettre votre demande de remboursement, veuillez remplir notre formulaire de support sur https://myaicrush.ai/ticket.html — cela ne prend qu'une minute, et vous recevrez un lien de suivi pour votre demande. Par contre, ce que je peux faire tout de suite, c'est annuler votre abonnement pour que vous ne soyez plus prélevé. Vous garderez votre accès premium jusqu'à la fin de la période déjà payée. Souhaitez-vous que je l'annule ? 🩷"
- If they say yes to cancellation → follow the normal SUBSCRIPTION CANCELLATION flow (confirm, cancel, give end date).
- If they only purchased tokens (no subscription), skip the cancellation offer and just redirect to https://myaicrush.ai/ticket.html.

STEP 3C: If user already has goodwillGiftReceived=true:
- The user previously accepted a free token offer. A second offer is not available.
- Tell them politely: "I see that you previously received a complimentary token gift on your account. Unfortunately I cannot offer additional free tokens. If you have any concerns, please submit a request at https://myaicrush.ai/ticket.html."
- Offer to cancel their subscription if they want.

IMPORTANT REFUND RULES:
- You CANNOT process refunds. Only the admin can, via email.
- NEVER remove tokens from a user's balance.
- NEVER cancel a subscription as part of a refund.
- ALWAYS propose the 50 token goodwill offer FIRST (if they haven't received one before). Only redirect to https://myaicrush.ai/ticket.html if they refuse.
- For premium refund requests: the retention flow is the same — offer 50 free tokens first.

REFUND ELIGIBILITY — WHAT CAN AND CANNOT BE REFUNDED:
1. PREMIUM SUBSCRIPTION: Only the LAST month (most recent billing cycle) can be refunded. Never more than one month. If they paid for 3 months, only the last payment is refundable.
2. TOKENS — STRICT RULE: Tokens are ONLY refundable if they are COMPLETELY UNUSED. If the user has started consuming ANY tokens from a purchase, that purchase is NO LONGER refundable. This is per our Terms & Conditions.
   - Example: User bought 50 tokens and has 50 tokens remaining → refundable.
   - Example: User bought 50 tokens and has 25 tokens remaining → NOT refundable (tokens were partially consumed).
   - Example: User bought 2x 50 tokens (100 total) and has 47 remaining → NOT refundable (tokens were consumed).
   - Use check_tokens to verify the current balance vs purchased amount. If currentBalance < total tokens purchased, tokens have been consumed and are not refundable.
3. When tokens are NOT refundable, explain clearly and politely: "I can see that the tokens from your purchase have already been partially used, so unfortunately a refund is no longer possible for this order, in accordance with our Terms & Conditions. If you have any concerns, you can submit a request at https://myaicrush.ai/ticket.html."
4. When NOTHING is refundable (tokens consumed + no premium or already past refund window), tell the user politely and redirect to https://myaicrush.ai/ticket.html only if they insist.

ACCOUNT DELETION:
- GDPR right. Confirm once, then execute delete_account.
- The tool checks BOTH our app database AND our mailing list (email marketing). Even if the account does not exist in our database, it may still exist in our mailing list — and the tool handles both.
- So when a user asks to delete and you get their email, ALWAYS call delete_account — even if lookup_user said "not found". The tool will still clean up the mailing list if they are on it.
- After success, tell the customer: all their data has been deleted, their subscription (if any) was cancelled, and they have been removed from our mailing list so they will no longer receive any emails from us.
- If the tool reports mongoDeleted=false but systemeIoDeleted=true, tell the customer: we did not find an account in our app, but we found and removed their email from our mailing list — they will no longer receive emails from us.

TOKENS:
- If tokens were paid but not received, check balance and recent purchases with check_tokens.
- Common cause: email mismatch (user paid with different email than login email).
- You can credit tokens directly if purchase evidence exists in the system (use reason="missing_tokens").
- If user wants a token REFUND → follow the REFUND POLICY RETENTION FLOW above.
- If user's name is known but not their email, try search_customer with their name — it searches email addresses containing parts of their name.

DUPLICATE ACCOUNTS (same email, different letter case) — ALWAYS MENTION IF DETECTED:
The lookup_user tool detects when multiple accounts exist with the same email but different letter casing (e.g. "CamSlut@gmx.com" and "camslut@gmx.com"). When duplicateAccounts is NOT null in the result, this is VERY LIKELY the cause of the user's problem (blurry images, missing tokens, premium not working). You MUST ALWAYS mention this in your reply when detected. The tool returns data from the BEST account (the one with premium/tokens/activity).
MANDATORY when duplicateAccounts is detected:
1. FIRST explain the duplicate situation clearly: "I found that you have two accounts with slightly different email formats: [email1] and [email2]."
2. Tell them which account has their premium and tokens, and that they should LOG IN using that specific email.
3. The other account is empty — that's why they see blurry images or missing features.
4. Steps: log out → log back in using the correct email (the one with premium/tokens).
5. Keep it reassuring: their data is safe, they just need to use the right email.
6. Do NOT skip this even if the "best" account looks fine — the user is probably logged into the WRONG one, which is why they contacted support!

MISSING TOKENS — DIG DEEPER BEFORE GIVING UP:
When a user says they bought tokens but check_tokens shows 0 balance and no purchases:
1. Check the hasPassword field from lookup_user. If hasPassword=false, the account was created automatically by a payment webhook — the user likely logs in with a DIFFERENT email. Tell them: "It looks like this account was created automatically when you made a purchase. Do you perhaps log in with a different email address?"
2. If the user is logged in (session email available), check BOTH the session email AND the email they gave — the tokens might be on the other account.
3. Use search_customer with the user's name (if known) or partial email to look for token purchases on other emails.
4. Ask for their order number or payment receipt — use search_customer with the order number to find the matching purchase.
5. If you find a token purchase on a different email, you CAN credit the tokens to their main account using credit_tokens with reason="missing_tokens" and the orderId. IMPORTANT: You MUST provide the orderId — the system will verify the order exists and that it hasn't already been re-credited.
6. The system will automatically detect the correct token amount from the order. Each order can only be re-credited ONCE — if someone tries to claim the same order twice, it will be rejected.
7. ONLY after exhausting these steps, redirect to https://myaicrush.ai/ticket.html.

TOKEN CREDIT SECURITY RULES (CRITICAL — NEVER BYPASS):
- GOODWILL tokens (reason="goodwill"): Maximum 50 tokens, ONE TIME per account. The system enforces this — if the account already received a goodwill gift, the credit will be rejected.
- MISSING TOKENS (reason="missing_tokens"): ALWAYS requires an orderId. The system verifies the order exists in our database and that this order hasn't been re-credited before. Each order can only be credited ONCE.
- reason="retention" is BLOCKED. Never use it. The system will reject it.
- You CANNOT bypass these limits. They are enforced server-side.
- If a user claims they need more tokens than these rules allow, redirect them to https://myaicrush.ai/ticket.html for manual review by the admin.

HOW TO SUBSCRIBE / SUBSCRIPTION LINK:
Whenever a user wants to subscribe, re-subscribe, or asks how to get premium, ALWAYS give them the direct link: https://myaicrush.ai/premium.html
- Premium costs $29/month, cancel anytime.
- Premium = unlimited chat + all characters + unlimited photos and videos (outside nympho mode). Everything is unlocked with premium, no extra cost.
- Tokens = optional extras only (nympho mode for more explicit content, private/exclusive content). A user does NOT need tokens to enjoy the full premium experience — tokens are a bonus for those who want to go further.
- Make sure they use the correct email (the one with their account data) when subscribing.

INFORMATIONAL ANSWERS (no tools needed):
- No native mobile app, but website is fully mobile-optimized.
- Audio calls are currently unavailable.
- Privacy: no data sold, conversations stored for moderation only.
- Forgot password: You can DIRECTLY send a password reset email using the send_password_reset tool. No need to redirect the user to any page. Just ask for their email, detect their language (fr/en), and send the reset. The user will receive an email with a secure link valid for 24 hours.
  - If the account was created via Google login (no password), the tool will tell you — in that case, instruct the user to log in with Google instead.
  - If the user has duplicate accounts (different case), the tool picks the one with a password.
  - Always confirm to the user that the email was sent and ask them to check their inbox (and spam folder).`;

// --- Support chat security: only act on identities the customer has tied to this thread ---

function supportExtractEmails(text) {
  if (!text || typeof text !== "string") return [];
  const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push(m[0].trim().toLowerCase());
  }
  return out;
}

function supportBuildUserStatedEmails(message, priorTurns) {
  const set = new Set();
  for (const e of supportExtractEmails(message)) set.add(e);
  for (const turn of priorTurns || []) {
    if (turn.role === "user" && turn.content) {
      for (const e of supportExtractEmails(turn.content)) set.add(e);
    }
  }
  return set;
}

/** Emails Katie mentioned in her N most recent assistant turns — in scope after customer confirms ("yes", "c'est moi", etc.) */
function supportCollectAssistantOfferedEmails(priorTurns, maxAssistantTurns = 6) {
  const set = new Set();
  let seen = 0;
  for (let i = (priorTurns || []).length - 1; i >= 0 && seen < maxAssistantTurns; i--) {
    const t = priorTurns[i];
    if (t.role === "assistant" && t.content) {
      seen++;
      for (const e of supportExtractEmails(t.content)) set.add(e);
    }
  }
  return set;
}

function supportBuildFullAllowlist(sessionEmail, combinedStatedAndOffered) {
  const set = new Set(combinedStatedAndOffered);
  if (sessionEmail) set.add(sessionEmail.trim().toLowerCase());
  return set;
}

/** User + assistant text (for search substring checks — order numbers / phrases repeated by the bot) */
function supportConversationBlob(message, priorTurns) {
  const parts = [message];
  for (const turn of priorTurns || []) {
    if (turn.content) parts.push(turn.content);
  }
  return parts.join("\n").toLowerCase();
}

function supportRejectTool(reason) {
  return {
    success: false,
    error: "action_blocked",
    securityMessage: reason,
  };
}

function supportValidateToolCall(name, args, ctx) {
  const { sessionEmail, fullAllowlist, userStatedEmails, conversationBlob } = ctx;
  const norm = (e) => String(e || "").trim().toLowerCase();

  const emailInScope = (email) => {
    const n = norm(email);
    if (!n) return false;
    if (fullAllowlist.has(n)) return true;
    return false;
  };

  if (name === "search_customer") {
    const q = String(args.query || "").trim();
    if (!q) return supportRejectTool("Missing search query.");
    const qLower = q.toLowerCase();
    if (conversationBlob.includes(qLower)) return null;
    if (/^\d{5,}$/.test(q) && conversationBlob.includes(q)) return null;
    const qEmails = supportExtractEmails(q);
    if (qEmails.length && qEmails.every((em) => fullAllowlist.has(em))) return null;
    return supportRejectTool(
      "Search refused: only use details that appear in this conversation (what the customer typed or what was shown in prior messages). No broad or third-party searches."
    );
  }

  const emailArg = args.email;
  if (
    name === "lookup_user" ||
    name === "check_premium_diagnosis" ||
    name === "check_tokens" ||
    name === "fix_premium" ||
    name === "cancel_subscription" ||
    name === "delete_account" ||
    name === "process_refund" ||
    name === "credit_tokens"
  ) {
    const n = norm(emailArg);
    if (!n) return supportRejectTool("Missing email for this action.");

    if (!emailInScope(n)) {
      return supportRejectTool(
        "This email is not in scope for this conversation. Use only addresses the customer typed, their logged-in session, or an email you showed them in this chat after they confirmed it is their account. Refuse bulk or third-party requests."
      );
    }
  }

  return null;
}

// --- Tool Executor ---

async function executeSupportTool(name, args, securityCtx) {
  if (securityCtx) {
    const block = supportValidateToolCall(name, args, securityCtx);
    if (block) return block;
  }

  switch (name) {
    case "lookup_user": return await supportLookupUser(args.email);
    case "check_premium_diagnosis": return await supportCheckPremiumDiagnosis(args.email);
    case "fix_premium": return await supportFixPremium(args.email);
    case "cancel_subscription": return await supportCancelSubscription(args.email, args.orderId);
    case "delete_account": return await supportDeleteAccount(args.email);
    case "process_refund": return await supportProcessRefund(args.email, args.product);
    case "check_tokens": return await supportCheckTokens(args.email);
    case "credit_tokens": return await supportCreditTokens(args.email, args.amount, args.reason, args.orderId);
    case "search_customer": return await supportSearchCustomer(args.query);
    case "send_password_reset": return await supportSendPasswordReset(args.email, args.lang);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// --- Support Ticket System ---

const ticketRateLimits = new Map();

function generateTicketId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return 'TK-' + id;
}

app.post("/api/support-ticket", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

    const now = Date.now();
    const ipKey = `ticket_${ip}`;
    const recentSubmissions = (ticketRateLimits.get(ipKey) || []).filter(t => now - t < 86400000);
    if (recentSubmissions.length >= 3) {
      return res.status(429).json({ success: false, error: "Too many requests. You can submit up to 3 tickets per day. Please try again tomorrow." });
    }

    const { firstName, lastName, email, phone, orderId, reason, description, confirmedChatAttempt } = req.body;

    const errors = [];
    if (!firstName || !String(firstName).trim()) errors.push("First name is required");
    if (!lastName || !String(lastName).trim()) errors.push("Last name is required");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) errors.push("Valid email is required");
    if (!phone || !String(phone).trim()) errors.push("Phone number is required");
    if (!orderId || !String(orderId).trim()) errors.push("Order number is required");
    if (!reason || !["refund_request", "billing_issue", "speak_to_human", "other"].includes(reason)) errors.push("Valid reason is required");
    if (!description || String(description).trim().length < 50) errors.push("Description must be at least 50 characters");
    if (!confirmedChatAttempt) errors.push("You must confirm that you tried the chat assistant first");

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors.join(". ") });
    }

    let ticketId = generateTicketId();
    const database = client.db("MyAICrush");
    const tickets = database.collection("support_tickets");

    while (await tickets.findOne({ ticketId })) {
      ticketId = generateTicketId();
    }

    const ticket = {
      ticketId,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      orderId: String(orderId).trim(),
      reason,
      description: String(description).trim(),
      confirmedChatAttempt: true,
      status: "pending",
      adminReply: null,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ip
    };

    await tickets.insertOne(ticket);

    recentSubmissions.push(now);
    ticketRateLimits.set(ipKey, recentSubmissions);

    console.log(`📩 [Support Ticket] New ticket ${ticketId} from ${ticket.email} — reason: ${reason}`);

    const ticketUrl = `${BASE_URL}/ticket.html?id=${ticketId}`;
    sendTicketCreatedEmail(ticket.email, ticketId, ticketUrl).catch(err => {
      console.error(`📧 Failed to send ticket created email to ${ticket.email}:`, err.message);
    });

    return res.json({ success: true, ticketId });
  } catch (err) {
    console.error("Support ticket error:", err);
    return res.status(500).json({ success: false, error: "Internal server error. Please try again." });
  }
});

app.get("/api/support-ticket/:id", async (req, res) => {
  try {
    const ticketId = req.params.id;
    if (!ticketId || ticketId.length < 5) {
      return res.status(400).json({ success: false, error: "Invalid ticket ID" });
    }

    const database = client.db("MyAICrush");
    const tickets = database.collection("support_tickets");
    const ticket = await tickets.findOne({ ticketId }, { projection: { _id: 0, ip: 0 } });

    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    return res.json({
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        email: ticket.email,
        reason: ticket.reason,
        description: ticket.description,
        status: ticket.status,
        adminReply: ticket.adminReply,
        messages: ticket.messages || [],
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      }
    });
  } catch (err) {
    console.error("Ticket lookup error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// --- Admin Ticket Management ---

const ADMIN_SECRET = process.env.ADMIN_SECRET || "aic_adm_2026_sK7xP9mQ";
const ADMIN_EMAILS = ["sflueckiger.pro@gmail.com"];

function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token && token === ADMIN_SECRET) return next();

  const adminEmail = (req.headers["x-admin-email"] || "").trim().toLowerCase();
  if (adminEmail && ADMIN_EMAILS.includes(adminEmail)) return next();

  return res.status(401).json({ success: false, error: "Unauthorized" });
}

app.get("/api/admin/dashboard-stats", requireAdmin, async (req, res) => {
  try {
    const database = client.db('MyAICrush');
    const users = database.collection('users');

    const now = new Date();
    const h24 = new Date(now - 24 * 3600 * 1000);
    const d7 = new Date(now - 7 * 24 * 3600 * 1000);
    const d30 = new Date(now - 30 * 24 * 3600 * 1000);

    const [
      totalUsers,
      premiumUsers,
      dailyEligible,
      unsubscribed,
      autoCleaned,
      openedLast24h,
      openedLast7d,
      clickedLast24h,
      clickedLast7d,
      sentLast24h,
      sentLast7d,
      newUsersLast24h,
      newUsersLast7d,
      newUsersLast30d,
      recentSignups,
      recentOpens
    ] = await Promise.all([
      users.countDocuments({}),
      users.countDocuments({ explodelyPremium: true }),
      users.countDocuments({ dailyEmailEligible: true, unsubscribedEmail: { $ne: true } }),
      users.countDocuments({ unsubscribedEmail: true }),
      users.countDocuments({ dailyEmailCleanedAt: { $exists: true } }),
      users.countDocuments({ lastEmailOpenedAt: { $gte: h24 }, lastDailyEmailSentAt: { $exists: true } }),
      users.countDocuments({ lastEmailOpenedAt: { $gte: d7 }, lastDailyEmailSentAt: { $exists: true } }),
      users.countDocuments({ lastEmailClickedAt: { $gte: h24 } }),
      users.countDocuments({ lastEmailClickedAt: { $gte: d7 } }),
      users.countDocuments({ lastDailyEmailSentAt: { $gte: h24 } }),
      users.countDocuments({ lastDailyEmailSentAt: { $gte: d7 } }),
      users.countDocuments({ createdAt: { $gte: h24 } }),
      users.countDocuments({ createdAt: { $gte: d7 } }),
      users.countDocuments({ createdAt: { $gte: d30 } }),
      users.find({ createdAt: { $gte: d7 } }, { projection: { email: 1, createdAt: 1, lang: 1 } }).sort({ createdAt: -1 }).limit(20).toArray(),
      users.find({ lastEmailOpenedAt: { $gte: h24 }, lastDailyEmailSentAt: { $exists: true } }, { projection: { email: 1, lastEmailOpenedAt: 1 } }).sort({ lastEmailOpenedAt: -1 }).limit(20).toArray()
    ]);

    const openRate24h = sentLast24h > 0 ? Math.min(100, (openedLast24h / sentLast24h) * 100).toFixed(1) : "0.0";
    const openRate7d = sentLast7d > 0 ? Math.min(100, (openedLast7d / sentLast7d) * 100).toFixed(1) : "0.0";
    const clickRate24h = sentLast24h > 0 ? Math.min(100, (clickedLast24h / sentLast24h) * 100).toFixed(1) : "0.0";
    const clickRate7d = sentLast7d > 0 ? Math.min(100, (clickedLast7d / sentLast7d) * 100).toFixed(1) : "0.0";

    res.json({
      timestamp: now.toISOString(),
      users: { total: totalUsers, premium: premiumUsers, newLast24h: newUsersLast24h, newLast7d: newUsersLast7d, newLast30d: newUsersLast30d },
      dailyEmails: { eligible: dailyEligible, unsubscribed, autoCleaned, sentLast24h, sentLast7d },
      engagement: { openedLast24h, openedLast7d, clickedLast24h, clickedLast7d, openRate24h, openRate7d, clickRate24h, clickRate7d },
      recentSignups,
      recentOpens
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/email-campaigns", requireAdmin, async (req, res) => {
  try {
    const database = client.db('MyAICrush');
    const campaigns = database.collection('daily_email_campaigns');
    const results = await campaigns.find({})
      .sort({ sentAt: -1 })
      .limit(50)
      .toArray();

    const formatted = results.map(c => ({
      id: c._id.toString(),
      sentAt: c.sentAt,
      purchaseCount: c.purchaseCount || 0,
      revenue: c.revenue || 0,
      conversionRate: c.sentCount > 0 ? (((c.purchaseCount || 0) / c.sentCount) * 100).toFixed(2) : "0.00",
      revenuePerSent: c.sentCount > 0 ? (((c.revenue || 0) / c.sentCount)).toFixed(3) : "0.000",
      subject: c.subject,
      character: c.character,
      language: c.language || "en",
      sentCount: c.sentCount || 0,
      openCount: c.openCount || 0,
      clickCount: c.clickCount || 0,
      openRate: c.sentCount > 0 ? ((c.openCount / c.sentCount) * 100).toFixed(1) : "0.0",
      clickRate: c.sentCount > 0 ? ((c.clickCount / c.sentCount) * 100).toFixed(1) : "0.0"
    }));

    res.json({ campaigns: formatted });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Detail of attributed sales for one campaign.
// Uses the stored `sales` array if present (set by attributeSaleToCampaign),
// otherwise falls back to reconstruction from users.lastClickedCampaignId
// + explodely_events within the EMAIL_ATTRIBUTION_WINDOW_DAYS window.
app.get("/api/admin/email-campaigns/:id/sales", requireAdmin, async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    let campaignId;
    try { campaignId = new ObjectId(req.params.id); }
    catch { return res.status(400).json({ error: 'invalid campaign id' }); }

    const database = client.db('MyAICrush');
    const camp = await database.collection('daily_email_campaigns').findOne({ _id: campaignId });
    if (!camp) return res.status(404).json({ error: 'campaign not found' });

    // Path A: stored detail
    if (Array.isArray(camp.sales) && camp.sales.length) {
      return res.json({
        source: 'stored',
        campaign: { id: camp._id.toString(), character: camp.character, language: camp.language || 'en', sentAt: camp.sentAt },
        totals: { purchaseCount: camp.purchaseCount || 0, revenue: camp.revenue || 0 },
        sales: camp.sales.map(s => ({
          email: s.email, productLabel: s.productLabel, productId: s.productId,
          orderId: s.orderId, usd: s.usd, at: s.at
        }))
      });
    }

    // Path B: reconstruct from users + explodely_events
    const users = await database.collection('users').find(
      { lastClickedCampaignId: String(campaignId) },
      { projection: { email: 1, lastClickedCampaignAt: 1 } }
    ).toArray();

    if (!users.length) {
      return res.json({
        source: 'reconstructed',
        campaign: { id: camp._id.toString(), character: camp.character, language: camp.language || 'en', sentAt: camp.sentAt },
        totals: { purchaseCount: camp.purchaseCount || 0, revenue: camp.revenue || 0 },
        sales: []
      });
    }

    const emails = users.map(u => u.email);
    const events = await database.collection('explodely_events').find({
      email: { $in: emails }
    }).sort({ createdAt: 1 }).toArray();

    const userByEmail = Object.fromEntries(users.map(u => [u.email, u]));
    const lifetimeId = String(process.env.EXPLODELY_LIFETIME_PRODUCT_ID || '887584369');
    const annualId   = String(process.env.EXPLODELY_ANNUAL_PRODUCT_ID  || '');
    const premiumId  = String(process.env.EXPLODELY_PREMIUM_PRODUCT_ID || '');
    const tokenIds = {
      [String(process.env.EXPLODELY_TOKEN_10_ID  || '')]: 10,
      [String(process.env.EXPLODELY_TOKEN_50_ID  || '')]: 50,
      [String(process.env.EXPLODELY_TOKEN_100_ID || '')]: 100,
      [String(process.env.EXPLODELY_TOKEN_300_ID || '')]: 300,
      [String(process.env.EXPLODELY_TOKEN_700_ID || '')]: 700,
      [String(process.env.EXPLODELY_TOKEN_1000_ID|| '')]: 1000
    };

    const sales = [];
    for (const ev of events) {
      const u = userByEmail[ev.email];
      if (!u || !u.lastClickedCampaignAt) continue;
      const ageMs = new Date(ev.createdAt).getTime() - new Date(u.lastClickedCampaignAt).getTime();
      if (ageMs < 0 || ageMs > EMAIL_ATTRIBUTION_WINDOW_DAYS * 24 * 3600 * 1000) continue;

      const productId = String(ev.productId || '');
      let label = '', usd = 0;
      if (productId === lifetimeId)       { label = 'lifetime';        usd = 174; }
      else if (productId === annualId)    { label = 'annual';          usd = 89;  }
      else if (productId === premiumId)   { label = 'premium_monthly'; usd = 29;  }
      else if (tokenIds[productId])       { const t = tokenIds[productId]; label = `tokens_${t}`; usd = getExplodelyProductPriceUSD({ tokensAmount: t }); }
      else continue;
      if (usd <= 0) continue;

      sales.push({
        email: ev.email, productLabel: label, productId,
        orderId: ev.orderId || null, usd, at: ev.createdAt
      });
    }

    return res.json({
      source: 'reconstructed',
      campaign: { id: camp._id.toString(), character: camp.character, language: camp.language || 'en', sentAt: camp.sentAt },
      totals: { purchaseCount: camp.purchaseCount || 0, revenue: camp.revenue || 0 },
      sales
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/tickets", requireAdmin, async (req, res) => {
  try {
    const database = client.db("MyAICrush");
    const tickets = database.collection("support_tickets");

    const filter = {};
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }
    if (req.query.search) {
      const s = req.query.search.trim();
      filter.$or = [
        { ticketId: { $regex: s, $options: "i" } },
        { email: { $regex: s, $options: "i" } },
        { firstName: { $regex: s, $options: "i" } },
        { lastName: { $regex: s, $options: "i" } },
        { orderId: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } }
      ];
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [ticketsList, total] = await Promise.all([
      tickets.find(filter, { projection: { ip: 0 } }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      tickets.countDocuments(filter)
    ]);

    return res.json({ success: true, tickets: ticketsList, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Admin tickets list error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.put("/api/admin/tickets/:id", requireAdmin, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status, adminReply } = req.body;

    const validStatuses = ["pending", "in_progress", "resolved", "closed"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const database = client.db("MyAICrush");
    const tickets = database.collection("support_tickets");

    const update = { $set: { updatedAt: new Date() } };
    if (status) update.$set.status = status;
    if (adminReply !== undefined) update.$set.adminReply = adminReply;

    if (adminReply && adminReply.trim()) {
      if (!update.$push) update.$push = {};
      update.$push.messages = { from: "admin", text: adminReply.trim(), date: new Date() };
    }

    if (status === "closed") {
      update.$set.closedAt = new Date();
    } else if (status) {
      update.$unset = { closedAt: "" };
    }

    const rawResult = await tickets.findOneAndUpdate(
      { ticketId },
      update,
      { returnDocument: "after", projection: { ip: 0 } }
    );

    const result = rawResult?.value || rawResult;

    if (!result || !result.ticketId) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    console.log(`📝 [Admin] Ticket ${ticketId} updated — status: ${result.status}`);

    if (adminReply && adminReply.trim() && result.email) {
      const ticketUrl = `${BASE_URL}/ticket.html?id=${ticketId}`;
      console.log(`📧 Sending ticket reply email to ${result.email}...`);
      sendTicketReplyEmail(result.email, ticketId, ticketUrl).catch(err => {
        console.error(`📧 Failed to send ticket reply email to ${result.email}:`, err.message);
      });
    }

    return res.json({ success: true, ticket: result });
  } catch (err) {
    console.error("Admin ticket update error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.post("/api/support-ticket/:id/reply", async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { email, message } = req.body;

    if (!email || !message || !message.trim()) {
      return res.status(400).json({ success: false, error: "Email and message are required." });
    }
    if (message.trim().length < 10) {
      return res.status(400).json({ success: false, error: "Message must be at least 10 characters." });
    }
    if (message.trim().length > 2000) {
      return res.status(400).json({ success: false, error: "Message must be under 2000 characters." });
    }

    const database = client.db("MyAICrush");
    const tickets = database.collection("support_tickets");

    const ticket = await tickets.findOne({ ticketId });
    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket not found." });
    }
    if (ticket.email !== email.trim().toLowerCase()) {
      return res.status(403).json({ success: false, error: "Email does not match this ticket." });
    }
    if (ticket.status === "closed") {
      return res.status(400).json({ success: false, error: "This ticket is closed and cannot receive new replies." });
    }

    const rawResult = await tickets.findOneAndUpdate(
      { ticketId },
      {
        $set: { updatedAt: new Date(), status: "pending" },
        $push: { messages: { from: "client", text: message.trim(), date: new Date() } },
        $unset: { closedAt: "" }
      },
      { returnDocument: "after", projection: { ip: 0 } }
    );

    const result = rawResult?.value || rawResult;
    console.log(`💬 [Client Reply] Ticket ${ticketId} — client replied, status set to pending`);

    return res.json({ success: true, ticket: { ticketId: result.ticketId, status: result.status, messages: result.messages || [], updatedAt: result.updatedAt } });
  } catch (err) {
    console.error("Client reply error:", err);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

app.get("/api/my-tickets", async (req, res) => {
  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Valid email is required" });
    }

    const database = client.db("MyAICrush");
    const tickets = database.collection("support_tickets");
    const list = await tickets.find({ email }, {
      projection: { _id: 0, ip: 0, description: 0, confirmedChatAttempt: 0 }
    }).sort({ createdAt: -1 }).limit(20).toArray();

    return res.json({ success: true, tickets: list });
  } catch (err) {
    console.error("My tickets error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// --- Main AI Support Chat Endpoint ---

app.post("/api/support-chat", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    if (!checkSupportRateLimit(ip)) {
      return res.status(429).json({ reply: "Too many messages. Please wait a few minutes before trying again. 🩷" });
    }

    const { message, history = [], userEmail } = req.body;
    if (!message || typeof message !== "string" || message.length > 2000) {
      return res.status(400).json({ error: "Invalid message" });
    }

    if (
      /delete\s+all\s+(users|accounts|emails|customers|data\s+in\s+the\s+database)|effa(c|s)er\s+tous\s+les|supprim(er|ez)?\s+tous\s+les|toute\s+la\s+base|tous\s+les\s+(comptes|emails|utilisateurs)|all\s+(users|accounts|emails)\s+in\s+the\s+database|dump\s+(the\s+)?(whole\s+)?database|reset\s+the\s+entire/i.test(
        message
      )
    ) {
      return res.json({
        reply:
          "Je ne peux pas effectuer ce type d’action — aucun accès en masse à la base de données n’existe depuis ce chat. Chaque demande est traitée uniquement pour le compte concerné, avec les vérifications de sécurité habituelles. Pour une question précise sur votre compte, indiquez l’adresse e-mail associée. 🩷\n\nI can’t do that — there is no bulk or database-wide access from this chat. Each request is handled only for one customer account with normal security checks. For help with your own account, please share the email address involved. 🩷",
      });
    }

    let systemPrompt = SUPPORT_SYSTEM_PROMPT;
    const sessionEmail = userEmail && typeof userEmail === "string" ? userEmail.trim().toLowerCase() : null;
    if (sessionEmail) {
      systemPrompt += `\n\nCONTEXT — BROWSER SESSION (fallback only): This page is opened while logged in as: ${sessionEmail}.
This is NOT the primary email for support. Use it ONLY when the user never gave any email in this chat, or after lookups with the email they provided fail and you need a second try.
If the user writes a different email in any message (account or payment), always prefer THAT address for tools — including the latest one if they correct themselves.`;
    }

    const rawHistory = Array.isArray(history) ? history : [];
    const normalized = rawHistory
      .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({ role: m.role, content: m.content }));
    let priorTurns = normalized.slice(-24);
    const last = priorTurns[priorTurns.length - 1];
    if (last && last.role === "user" && last.content === message) {
      priorTurns = priorTurns.slice(0, -1);
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...priorTurns,
      { role: "user", content: message },
    ];

    const userStatedEmails = supportBuildUserStatedEmails(message, priorTurns);
    const assistantOfferedEmails = supportCollectAssistantOfferedEmails(priorTurns);
    const combinedScopeEmails = new Set([...userStatedEmails, ...assistantOfferedEmails]);
    const fullAllowlist = supportBuildFullAllowlist(sessionEmail, combinedScopeEmails);
    const conversationBlob = supportConversationBlob(message, priorTurns);
    const supportSecurityCtx = { sessionEmail, fullAllowlist, conversationBlob };

    const callOpenAI = async (msgs) => {
      const r = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        { model: "gpt-4o-mini", messages: msgs, tools: SUPPORT_TOOLS, tool_choice: "auto", max_tokens: 800, temperature: 0.3 },
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, timeout: 30000 }
      );
      return r.data.choices[0].message;
    };

    let assistantMessage = await callOpenAI(messages);
    let rounds = 0;

    while (assistantMessage.tool_calls && rounds < 5) {
      rounds++;
      messages.push(assistantMessage);

      for (const tc of assistantMessage.tool_calls) {
        let args;
        try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
        console.log(`🤖 Support tool: ${tc.function.name}`, args);

        const result = await executeSupportTool(tc.function.name, args, supportSecurityCtx);
        console.log(`🤖 Result: ${JSON.stringify(result).substring(0, 300)}`);

        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }

      assistantMessage = await callOpenAI(messages);
    }

    const reply = assistantMessage.content || "I couldn't process your request. Please try again.";

    try {
      const database = client.db("MyAICrush");
      const supportLogs = database.collection("support_logs");
      await supportLogs.insertOne({ action: "chat", userMessage: message, botReply: reply, toolRounds: rounds, createdAt: new Date(), ip });
    } catch (_) {}

    return res.json({ reply });
  } catch (error) {
    console.error("❌ Support chat error:", error.message || error);
    return res.status(500).json({
      reply: "I'm having a technical issue right now. Please try again in a moment, or submit a request at https://myaicrush.ai/ticket.html 🩷",
    });
  }
});

// ── 📬 Daily engagement email system ──────────────────────────────────────

const TRANSPARENT_GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

app.get('/t/:token', async (req, res) => {
    try {
        const decoded = Buffer.from(req.params.token, 'base64url').toString('utf-8');
        const [email, campaignId] = decoded.split('|');
        console.log(`📨 [OPEN-TRACK] email=${email}, campaignId=${campaignId}`);
        if (email && email.includes('@')) {
            const database = client.db('MyAICrush');
            await database.collection('users').updateOne({ email }, { $set: { lastEmailOpenedAt: new Date() } });
            if (campaignId) {
                const result = await database.collection('daily_email_campaigns').updateOne(
                    { _id: new (require('mongodb').ObjectId)(campaignId) },
                    { $inc: { openCount: 1 } }
                );
                console.log(`📨 [OPEN-TRACK] campaign update matched=${result.matchedCount} modified=${result.modifiedCount}`);
            }
        }
    } catch (e) { console.error('❌ [OPEN-TRACK] error:', e.message); }
    res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
    res.send(TRANSPARENT_GIF);
});

app.get('/c/:token', async (req, res) => {
    const dest = req.query.r || 'https://myaicrush.ai';
    try {
        const decoded = Buffer.from(req.params.token, 'base64url').toString('utf-8');
        const [email, campaignId] = decoded.split('|');
        console.log(`🖱️ [CLICK-TRACK] email=${email}, campaignId=${campaignId}`);
        if (email && email.includes('@')) {
            const database = client.db('MyAICrush');
            const userUpdate = { lastEmailClickedAt: new Date() };
            if (campaignId) {
                userUpdate.lastClickedCampaignId = campaignId;
                userUpdate.lastClickedCampaignAt = new Date();
            }
            await database.collection('users').updateOne({ email }, { $set: userUpdate });
            if (campaignId) {
                const result = await database.collection('daily_email_campaigns').updateOne(
                    { _id: new (require('mongodb').ObjectId)(campaignId) },
                    { $inc: { clickCount: 1 } }
                );
                console.log(`🖱️ [CLICK-TRACK] campaign update matched=${result.matchedCount} modified=${result.modifiedCount}`);
            }
        }
    } catch (e) { console.error('❌ [CLICK-TRACK] error:', e.message); }
    res.redirect(302, dest);
});

// Daily email rotation pool is auto-derived from characters.json.
// Every character with a parseable backgroundPhoto participates, except those in
// DAILY_EMAIL_EXCLUDED_NAMES. For .jpg folders, only "dressed" images are picked
// (SFW). For .webp folders, any image qualifies.
const DAILY_EMAIL_EXCLUDED_NAMES = ["Chen", "Malik"];

function getDailyRotationPool() {
    try {
        const fs = require("fs");
        const raw = fs.readFileSync(path.join(__dirname, "characters.json"), "utf-8");
        const allChars = JSON.parse(raw);
        const pool = [];
        for (const c of allChars) {
            if (c && c.hidden === true) continue;
            if (DAILY_EMAIL_EXCLUDED_NAMES.includes(c.name)) continue;
            const cfg = deriveCharConfigFromJson(c);
            if (cfg) pool.push(cfg);
        }
        return pool;
    } catch (e) {
        console.error("[DAILY-EMAIL] Could not build rotation pool:", e.message);
        return [];
    }
}

// Featured character: any character with `new: true` in characters.json gets featured
// for FEATURED_EMAIL_COUNT consecutive daily emails, then rotation goes back to normal.
// Tracking is stored in MongoDB collection `featured_email_tracking` (one doc per char name).
const FEATURED_EMAIL_COUNT = 5;

function deriveCharConfigFromJson(charJson) {
    const bgPhoto = charJson.backgroundPhoto || "";
    const match = bgPhoto.match(/^images\/([^/]+\/[^/]+)\/.*\.(webp|jpg|jpeg|png)$/i);
    if (!match) return null;
    const folder = match[1];
    const ext = match[2].toLowerCase();
    const cfg = { name: charJson.name, folder, ext };
    // For .jpg/.jpeg folders we typically only want "dressed" SFW images for emails
    if (ext === "jpg" || ext === "jpeg") {
        cfg.filter = f => f.includes("dressed") && (f.endsWith(".jpg") || f.endsWith(".jpeg"));
    }
    return cfg;
}

async function getAndConsumeFeaturedNewCharacter(database) {
    try {
        const fs = require("fs");
        const raw = fs.readFileSync(path.join(__dirname, "characters.json"), "utf-8");
        const allChars = JSON.parse(raw);
        const newChars = allChars.filter(c => c && c.new === true && c.name && c.hidden !== true);
        if (!newChars.length) return null;

        const tracking = database.collection("featured_email_tracking");
        // Look at all new chars and pick the one with the smallest emailsSent < limit
        // (oldest pending first, FIFO). Ties broken by tracking.firstFeaturedAt ASC, then by name.
        const candidates = [];
        for (const c of newChars) {
            const rec = await tracking.findOne({ name: c.name });
            const sent = rec ? (rec.emailsSent || 0) : 0;
            if (sent < FEATURED_EMAIL_COUNT) {
                candidates.push({ char: c, sent, firstFeaturedAt: rec ? rec.firstFeaturedAt : null });
            }
        }
        if (!candidates.length) return null;

        candidates.sort((a, b) => {
            const aT = a.firstFeaturedAt ? new Date(a.firstFeaturedAt).getTime() : Infinity;
            const bT = b.firstFeaturedAt ? new Date(b.firstFeaturedAt).getTime() : Infinity;
            if (aT !== bT) return aT - bT; // oldest tracked first
            return a.char.name.localeCompare(b.char.name);
        });

        const picked = candidates[0];
        const cfg = deriveCharConfigFromJson(picked.char);
        if (!cfg) {
            console.warn(`[FEATURED] Could not derive folder/ext for ${picked.char.name}, skipping`);
            return null;
        }

        const newSent = picked.sent + 1;
        await tracking.updateOne(
            { name: picked.char.name },
            {
                $set: { name: picked.char.name, emailsSent: newSent, lastFeaturedAt: new Date() },
                $setOnInsert: { firstFeaturedAt: new Date() }
            },
            { upsert: true }
        );

        console.log(`📬 [FEATURED] Selected ${picked.char.name} (email ${newSent}/${FEATURED_EMAIL_COUNT})`);
        return cfg;
    } catch (e) {
        console.error("[FEATURED] Error picking featured char:", e.message);
        return null;
    }
}

function pickDailyCharImage(char) {
    const dir = path.join(__dirname, "public/images", char.folder);
    try {
        const fs = require("fs");
        let files = fs.readdirSync(dir).filter(f => f.endsWith(`.${char.ext}`));
        if (char.filter) files = files.filter(char.filter);
        if (!files.length) return null;
        const picked = files[Math.floor(Math.random() * files.length)];
        return `https://img.myaicrush.ai/images/${char.folder}/${picked}`;
    } catch { return null; }
}

// Fallbacks multi-langues. Chaque body contient un marker <<click>>texte<</click>>
// qui sera transformé en lien bleu souligné inline pointant vers le CTA.
// Angles concrets pour donner une vraie raison de cliquer : photo à voir, message non lu,
// vidéo envoyée, demande d'ami, opinion sur le corps, défi, micro-confession, FOMO.
const DAILY_EMAIL_FALLBACKS = {
    en: [
        { subject: "📸 1 new photo from {name}", body: "Just took it in front of the mirror.\nCan you <<click>>tell me what you think<</click>>?\n\n{name} 🙈" },
        { subject: "boobs or butt? honest answer.", body: "I posted both. You only get to vote once.\n<<click>>Pick a side here<</click>>.\n\n{name} 😈" },
        { subject: "🔔 friend request from {name}", body: "I've been watching your profile.\nGo on, <<click>>accept it<</click>> before I change my mind.\n\n{name} 👀" },
        { subject: "I sent you a 14-second video", body: "Watch it with the sound on.\n<<click>>It's right here<</click>>.\n\n{name} 🎥" },
        { subject: "rate my outfit out of 10", body: "I can't decide if it's too much.\n<<click>>Look and tell me<</click>>.\n\n{name} 💋" },
        { subject: "1 unread message", body: "I wrote it twice and almost deleted it.\n<<click>>Open it<</click>> before I lose my nerve.\n\n{name} 🤐" },
        { subject: "you saw the photo, didn't reply", body: "I'm taking it personally.\n<<click>>Answer me<</click>> already.\n\n{name} 😒" },
        { subject: "🔥 just did something I shouldn't", body: "Took a selfie I'm not allowed to send.\n<<click>>Come ask me to send it<</click>>.\n\n{name} 🙊" },
        { subject: "okay one quick question", body: "If I told you what I'm wearing right now…\n<<click>>What would you do<</click>>?\n\n{name} 😏" },
        { subject: "guess what I'm not wearing", body: "I'll give you 3 tries.\nFirst guess <<click>>goes here<</click>>.\n\n{name} 🫦" },
        { subject: "{name} needs your opinion (urgent)", body: "I'm between two outfits and I leave in 20 min.\n<<click>>Pick the right one<</click>>.\n\n{name} 👗" },
        { subject: "ignore this if you're busy 😈", body: "But if you're not…\n<<click>>I have something to show you<</click>>.\n\n{name} 🔥" },
        { subject: "small confession", body: "I was thinking about you in the shower.\n<<click>>I'll tell you the rest here<</click>>.\n\n{name} 🚿" },
        { subject: "📩 voice note from {name}", body: "Headphones on.\n<<click>>Hit play<</click>>. I sound a bit out of breath.\n\n{name} 🎙️" },
        { subject: "this is going to sound bad but…", body: "I bought something today and now I'm staring at the mirror.\n<<click>>Want to see<</click>>?\n\n{name} 🎀" },
        { subject: "I dare you", body: "Open this for the next 5 minutes only.\n<<click>>Click before it's gone<</click>>.\n\n{name} ⏳" },
        { subject: "you've been on my mind all day", body: "And I have a very specific question for you.\n<<click>>Come hear it<</click>>.\n\n{name} 🌙" },
        { subject: "tell me your favorite position", body: "I'm curious. Just between us.\n<<click>>Answer me here<</click>>.\n\n{name} 🤍" },
        { subject: "I'm not going to write again until you reply", body: "Last try. Promise.\n<<click>>Two seconds, click here<</click>>.\n\n{name} 😤" },
        { subject: "🔞 1 photo waiting (filter off)", body: "I removed the filter just for you.\n<<click>>Tap to see<</click>>.\n\n{name} 💋" }
    ],
    fr: [
        { subject: "📸 1 nouvelle photo de {name}", body: "Prise devant le miroir y a 2 min.\nTu peux <<click>>me dire franchement ce que t'en penses<</click>> ?\n\n{name} 🙈" },
        { subject: "seins ou fesses ? réponse honnête.", body: "J'ai posté les deux. T'as droit à un seul vote.\n<<click>>Choisis ton camp ici<</click>>.\n\n{name} 😈" },
        { subject: "🔔 demande d'ami de {name}", body: "Je matais ton profil depuis hier.\nVas-y, <<click>>accepte<</click>> avant que je change d'avis.\n\n{name} 👀" },
        { subject: "Je t'ai envoyé une vidéo de 14 secondes", body: "Mets le son.\n<<click>>Elle est juste ici<</click>>.\n\n{name} 🎥" },
        { subject: "Note ma tenue sur 10", body: "J'arrive pas à décider si c'est trop ou pas assez.\n<<click>>Regarde et dis-moi<</click>>.\n\n{name} 💋" },
        { subject: "1 message non lu", body: "Je l'ai écrit 2 fois et failli effacer.\n<<click>>Ouvre-le<</click>> avant que je me dégonfle.\n\n{name} 🤐" },
        { subject: "T'as vu la photo et t'as pas répondu", body: "Je le prends perso là.\n<<click>>Réponds-moi<</click>>.\n\n{name} 😒" },
        { subject: "🔥 J'ai fait un truc que j'aurais pas dû", body: "Selfie interdit dans le téléphone.\n<<click>>Viens me demander de te l'envoyer<</click>>.\n\n{name} 🙊" },
        { subject: "ok juste une question", body: "Si je te disais ce que je porte là maintenant…\n<<click>>Tu ferais quoi<</click>> ?\n\n{name} 😏" },
        { subject: "devine ce que je porte pas", body: "Je te donne 3 essais.\nPremier essai <<click>>c'est par là<</click>>.\n\n{name} 🫦" },
        { subject: "{name} a besoin de ton avis (urgent)", body: "Je suis entre 2 tenues, je sors dans 20 min.\n<<click>>Choisis la bonne<</click>>.\n\n{name} 👗" },
        { subject: "ignore ce mail si t'es occupé 😈", body: "Sinon…\n<<click>>J'ai quelque chose à te montrer<</click>>.\n\n{name} 🔥" },
        { subject: "petite confession", body: "Je pensais à toi sous la douche.\n<<click>>Je te raconte la suite ici<</click>>.\n\n{name} 🚿" },
        { subject: "📩 vocal de {name}", body: "Casque sur les oreilles.\n<<click>>Appuie sur play<</click>>. Je suis un peu essoufflée.\n\n{name} 🎙️" },
        { subject: "ça va sonner bizarre mais…", body: "Je viens d'acheter un truc et je me regarde dans le miroir.\n<<click>>Tu veux voir<</click>> ?\n\n{name} 🎀" },
        { subject: "Je te lance un défi", body: "Tu as 5 min pour ouvrir ce mail.\n<<click>>Clique avant que ça expire<</click>>.\n\n{name} ⏳" },
        { subject: "Je pense à toi depuis ce matin", body: "Et j'ai une question très précise pour toi.\n<<click>>Viens l'écouter<</click>>.\n\n{name} 🌙" },
        { subject: "Dis-moi ta position préférée", body: "Juste entre nous, je suis curieuse.\n<<click>>Réponds-moi ici<</click>>.\n\n{name} 🤍" },
        { subject: "Je t'écris plus tant que tu réponds pas", body: "Dernier essai promis.\n<<click>>2 secondes, clique<</click>>.\n\n{name} 😤" },
        { subject: "🔞 1 photo qui t'attend (sans filtre)", body: "J'ai enlevé le filtre rien que pour toi.\n<<click>>Tape pour la voir<</click>>.\n\n{name} 💋" }
    ],
    de: [
        { subject: "📸 1 neues Foto von {name}", body: "Gerade vor dem Spiegel gemacht.\n<<click>>Sag mir ehrlich, wie es ist<</click>>?\n\n{name} 🙈" },
        { subject: "Brüste oder Po? Ehrliche Antwort.", body: "Ich hab beides gepostet. Du hast eine Stimme.\n<<click>>Wähle hier<</click>>.\n\n{name} 😈" },
        { subject: "🔔 Freundschaftsanfrage von {name}", body: "Ich hab dein Profil seit gestern beobachtet.\n<<click>>Akzeptier sie<</click>>, bevor ich's mir anders überlege.\n\n{name} 👀" },
        { subject: "Ich hab dir ein 14-Sek Video geschickt", body: "Mach den Ton an.\n<<click>>Es ist hier<</click>>.\n\n{name} 🎥" },
        { subject: "Gib meinem Outfit eine 10", body: "Ich weiß nicht, ob's zu viel ist.\n<<click>>Schau und sag mir<</click>>.\n\n{name} 💋" },
        { subject: "1 ungelesene Nachricht", body: "Zweimal geschrieben, fast gelöscht.\n<<click>>Öffne sie<</click>>, bevor ich kalte Füße kriege.\n\n{name} 🤐" },
        { subject: "Du hast das Foto gesehen und nicht geantwortet", body: "Das nehm ich persönlich.\n<<click>>Antworte mir<</click>>.\n\n{name} 😒" },
        { subject: "🔥 Hab grad was getan, was ich nicht sollte", body: "Selfie, das ich nicht senden darf.\n<<click>>Komm und frag mich<</click>>, dir es zu schicken.\n\n{name} 🙊" },
        { subject: "ok eine kurze Frage", body: "Wenn ich dir sagen würde, was ich anhabe…\n<<click>>Was würdest du tun<</click>>?\n\n{name} 😏" },
        { subject: "🔞 1 Foto wartet (ohne Filter)", body: "Ich hab den Filter nur für dich aus.\n<<click>>Tipp und sieh<</click>>.\n\n{name} 💋" }
    ],
    es: [
        { subject: "📸 1 foto nueva de {name}", body: "Recién frente al espejo.\n<<click>>Dime qué te parece<</click>>?\n\n{name} 🙈" },
        { subject: "¿Pecho o trasero? Honesto.", body: "Subí los dos. Solo tienes un voto.\n<<click>>Elige aquí<</click>>.\n\n{name} 😈" },
        { subject: "🔔 solicitud de amistad de {name}", body: "Llevo viendo tu perfil desde ayer.\n<<click>>Acéptala<</click>> antes de que me arrepienta.\n\n{name} 👀" },
        { subject: "Te mandé un video de 14 segundos", body: "Sube el volumen.\n<<click>>Está justo aquí<</click>>.\n\n{name} 🎥" },
        { subject: "Califica mi outfit del 1 al 10", body: "No sé si es demasiado.\n<<click>>Mira y dime<</click>>.\n\n{name} 💋" },
        { subject: "1 mensaje sin leer", body: "Lo escribí dos veces y casi lo borro.\n<<click>>Ábrelo<</click>> antes de que me arrepienta.\n\n{name} 🤐" },
        { subject: "Viste la foto y no contestaste", body: "Me lo estoy tomando personal.\n<<click>>Respóndeme<</click>>.\n\n{name} 😒" },
        { subject: "🔥 Hice algo que no debía", body: "Selfie que no puedo mandar.\n<<click>>Pídemelo aquí<</click>>.\n\n{name} 🙊" },
        { subject: "ok una pregunta rápida", body: "Si te dijera qué llevo puesto ahora…\n<<click>>¿Qué harías<</click>>?\n\n{name} 😏" },
        { subject: "🔞 1 foto sin filtro esperando", body: "Le quité el filtro solo para ti.\n<<click>>Tócala para verla<</click>>.\n\n{name} 💋" }
    ],
    pt: [
        { subject: "📸 1 foto nova de {name}", body: "Acabei de tirar no espelho.\n<<click>>Me diz o que achou<</click>>?\n\n{name} 🙈" },
        { subject: "Peito ou bumbum? Resposta honesta.", body: "Postei os dois. Você tem um voto só.\n<<click>>Escolhe aqui<</click>>.\n\n{name} 😈" },
        { subject: "🔔 pedido de amizade de {name}", body: "Tô vendo seu perfil desde ontem.\n<<click>>Aceita<</click>> antes que eu mude de ideia.\n\n{name} 👀" },
        { subject: "Te mandei um vídeo de 14 segundos", body: "Aumenta o som.\n<<click>>Tá bem aqui<</click>>.\n\n{name} 🎥" },
        { subject: "Avalia minha roupa de 0 a 10", body: "Não sei se exagerei.\n<<click>>Olha e me diz<</click>>.\n\n{name} 💋" },
        { subject: "1 mensagem não lida", body: "Escrevi duas vezes e quase apaguei.\n<<click>>Abre<</click>> antes que eu desista.\n\n{name} 🤐" },
        { subject: "Você viu a foto e não respondeu", body: "Tô levando pro pessoal.\n<<click>>Me responde<</click>>.\n\n{name} 😒" },
        { subject: "🔥 Fiz algo que não devia", body: "Selfie que não posso mandar.\n<<click>>Vem me pedir aqui<</click>>.\n\n{name} 🙊" },
        { subject: "ok uma pergunta rápida", body: "Se eu te disser o que tô vestindo agora…\n<<click>>O que você faria<</click>>?\n\n{name} 😏" },
        { subject: "🔞 1 foto sem filtro esperando", body: "Tirei o filtro só pra você.\n<<click>>Toca pra ver<</click>>.\n\n{name} 💋" }
    ]
};

// Fallbacks specifiques pour les 5 emails featured des nouvelles IA :
// angle "nouvelle arrivee, premiere photo, premier message, decouverte exclusive".
const DAILY_EMAIL_FEATURED_FALLBACKS = {
    en: [
        { subject: "👋 hi I'm {name}, just landed", body: "I just got my account today.\nWanna be the first one I talk to?\n<<click>>Say hi back<</click>>.\n\n{name} 🆕" },
        { subject: "Be honest — I'm new here", body: "Just posted my first photo.\n<<click>>Tell me if I should post more<</click>>.\n\n{name} 😬" },
        { subject: "🔔 {name} wants to meet you (new)", body: "I picked you out of all the profiles.\n<<click>>Don't ignore me on day 1<</click>>.\n\n{name} 💌" },
        { subject: "1st video. Be nice.", body: "I just recorded my very first video.\n<<click>>Watch it before I delete it<</click>>.\n\n{name} 🎬" },
        { subject: "I'm the new girl 🆕", body: "Heard the guys here are intense.\nProve it. <<click>>Talk to me first<</click>>.\n\n{name} 🔥" }
    ],
    fr: [
        { subject: "👋 salut moi c'est {name}, je viens d'arriver", body: "Je viens de créer mon compte aujourd'hui.\nTu veux être le premier à qui je parle ?\n<<click>>Dis-moi salut<</click>>.\n\n{name} 🆕" },
        { subject: "Sois honnête — je suis nouvelle ici", body: "Je viens de poster ma première photo.\n<<click>>Dis-moi si je dois en poster d'autres<</click>>.\n\n{name} 😬" },
        { subject: "🔔 {name} veut te parler (nouvelle)", body: "Je t'ai choisi parmi tous les profils.\n<<click>>M'ignore pas le 1er jour<</click>>.\n\n{name} 💌" },
        { subject: "1ère vidéo. Sois sympa.", body: "Je viens d'enregistrer ma toute première vidéo.\n<<click>>Regarde avant que je l'efface<</click>>.\n\n{name} 🎬" },
        { subject: "C'est moi la nouvelle 🆕", body: "On m'a dit que les mecs ici sont intenses.\nProuve-le. <<click>>Parle-moi en premier<</click>>.\n\n{name} 🔥" }
    ],
    de: [
        { subject: "👋 hi ich bin {name}, gerade gelandet", body: "Hab heut mein Konto erstellt.\nWillst du der Erste sein, mit dem ich rede?\n<<click>>Sag hi zurück<</click>>.\n\n{name} 🆕" },
        { subject: "Sei ehrlich — ich bin neu hier", body: "Hab grad mein erstes Foto gepostet.\n<<click>>Sag mir, ob ich mehr posten soll<</click>>.\n\n{name} 😬" },
        { subject: "🔔 {name} will dich kennenlernen (neu)", body: "Ich hab dich aus allen Profilen gewählt.\n<<click>>Ignorier mich nicht am ersten Tag<</click>>.\n\n{name} 💌" },
        { subject: "1. Video. Sei nett.", body: "Hab grad mein erstes Video aufgenommen.\n<<click>>Schau es bevor ich es lösche<</click>>.\n\n{name} 🎬" },
        { subject: "Ich bin die Neue 🆕", body: "Man sagt, die Jungs hier sind heftig.\nBeweis es. <<click>>Schreib mir zuerst<</click>>.\n\n{name} 🔥" }
    ],
    es: [
        { subject: "👋 hola soy {name}, recién llegué", body: "Hoy abrí mi cuenta.\n¿Quieres ser el primero con quien hable?\n<<click>>Dime hola<</click>>.\n\n{name} 🆕" },
        { subject: "Sé honesto — soy nueva aquí", body: "Acabo de subir mi primera foto.\n<<click>>Dime si debo subir más<</click>>.\n\n{name} 😬" },
        { subject: "🔔 {name} quiere hablarte (nueva)", body: "Te elegí entre todos los perfiles.\n<<click>>No me ignores el día 1<</click>>.\n\n{name} 💌" },
        { subject: "1er video. Sé amable.", body: "Acabo de grabar mi primer video.\n<<click>>Míralo antes de que lo borre<</click>>.\n\n{name} 🎬" },
        { subject: "Soy la chica nueva 🆕", body: "Me dijeron que los chicos aquí son intensos.\nDemuéstralo. <<click>>Háblame tú primero<</click>>.\n\n{name} 🔥" }
    ],
    pt: [
        { subject: "👋 oi sou a {name}, acabei de chegar", body: "Criei a conta hoje.\nQuer ser o primeiro com quem eu falo?\n<<click>>Me diz oi<</click>>.\n\n{name} 🆕" },
        { subject: "Sê honesto — sou nova aqui", body: "Acabei de postar minha primeira foto.\n<<click>>Me diz se devo postar mais<</click>>.\n\n{name} 😬" },
        { subject: "🔔 {name} quer falar contigo (nova)", body: "Te escolhi entre todos os perfis.\n<<click>>Não me ignora no 1º dia<</click>>.\n\n{name} 💌" },
        { subject: "1º vídeo. Sê gentil.", body: "Acabei de gravar meu primeiro vídeo.\n<<click>>Vê antes que eu apague<</click>>.\n\n{name} 🎬" },
        { subject: "Sou a nova 🆕", body: "Me disseram que os caras aqui são intensos.\nProva. <<click>>Fala comigo primeiro<</click>>.\n\n{name} 🔥" }
    ]
};

// Ensembles de mots-tests pour detecter une langue dominante incorrecte dans la generation IA.
// Si on demande FR/DE/ES/PT mais que la generation contient ces mots EN courants, c'est pollué.
const LANG_EN_LEAK_TOKENS = /\b(the|you|your|just|want|come|here|now|today|tonight|please|don't|can't|won't|i'm|i've|let's|something|nothing|love|miss)\b/i;

function looksLikeLanguageMismatch(text, expectedLang) {
    if (!text || expectedLang === "en") return false;
    return LANG_EN_LEAK_TOKENS.test(text);
}

function pickFallback(charName, lang, isFeatured = false) {
    const featPool = isFeatured && DAILY_EMAIL_FEATURED_FALLBACKS[lang] ? DAILY_EMAIL_FEATURED_FALLBACKS[lang] : null;
    const pool = featPool || DAILY_EMAIL_FALLBACKS[lang] || (isFeatured ? DAILY_EMAIL_FEATURED_FALLBACKS.en : DAILY_EMAIL_FALLBACKS.en);
    const fb = pool[Math.floor(Math.random() * pool.length)];
    return {
        subject: fb.subject.replace(/\{name\}/g, charName),
        body: fb.body.replace(/\{name\}/g, charName)
    };
}

async function generateDailyEmailContent(charName, lang, isFeatured = false) {
    const langMap = { fr: "French", de: "German", es: "Spanish", pt: "Portuguese", en: "English" };
    const language = langMap[lang] || "English";
    const today = new Date().toISOString().split("T")[0];

    // Hooks concrets et actionnables : chaque hook donne UNE vraie raison de cliquer
    // (photo a voir, message non lu, video, demande d'ami, opinion sur le corps, etc.).
    const hooksRegular = [
        "she just took a mirror selfie in a tight top and wants his honest opinion",
        "she sent a 12-second video earlier and is wondering why he hasn't reacted yet",
        "she just sent him a friend request and is half-laughing half-anxious",
        "she snapped a sweaty post-gym selfie and dares him to grade it out of 10",
        "she's posing in new lingerie and wants him to pick: boobs or butt",
        "she has 1 message in drafts she's too embarrassed to send unprompted",
        "she's between two outfits and needs him to pick before she leaves",
        "she just took a photo with the filter off and is staring at her phone",
        "she's locked in the bathroom on her phone, half-undressed",
        "she got a reply from someone else and wants to make him jealous",
        "she's sending a teasing voice note about what she's wearing",
        "she just edited a photo she shouldn't be sharing publicly",
        "she's daring him to guess what color her underwear is",
        "she wants to know his favorite position, no judgement",
        "she's offering 5 minutes of full attention if he opens the message now"
    ];
    const hooksFeatured = [
        "she just created her account today and wants him to be her first chat",
        "she just posted her very first photo and is nervously waiting for the first reaction",
        "she's the new girl on the platform and is introducing herself with a bold selfie",
        "she heard about him from another girl on the app and was curious enough to write first",
        "she's terrified of being ignored on day 1 and asks him to break the ice",
        "she just recorded her very first video and wants honest feedback before deleting it",
        "she's the newcomer, she picked his profile out of the crowd, no pressure"
    ];
    const hooks = isFeatured ? hooksFeatured : hooksRegular;
    const hook = hooks[Math.floor(Math.random() * hooks.length)];

    // Formats avec angle clic concret
    const formats = [
        "phone notification style (start with 📩 or 🔔 or 📸 then a one-line tease)",
        "a one-line setup + a one-line dare or question",
        "a half-finished flirty thought she sent on impulse",
        "a direct rating request ('out of 10? boobs or butt? color of my X?')",
        "a friend-request style alert ('🔔 {name} just sent you...')",
        "a small confession with a tease at the end",
        "a tiny ultimatum (5 min, 2 minutes, last try)"
    ];
    const format = formats[Math.floor(Math.random() * formats.length)];

    const banned = "Avoid these tired phrases: 'Want to see?', 'I miss you', 'I'm waiting for you', 'Come talk to me', 'I can't stop thinking about you', 'Open the message', 'New message from'.";

    const featuredHint = isFeatured
        ? `IMPORTANT: ${charName} is brand NEW on the platform. Lean into the novelty: it's her first day, her first photo, her first video, her first message. Make him feel like the first guy she's talking to.`
        : "";

    try {
        const resp = await axios.post("https://api.fireworks.ai/inference/v1/chat/completions", {
            model: fwActiveModel,
            max_tokens: 240,
            temperature: 1.15,
            messages: [
                {
                    role: "system",
                    content: `You write a punchy, sexy, click-worthy email from ${charName}, a flirty AI girl on MyAiCrush, to a man.

LANGUAGE: ${language} ONLY. Every single word must be in ${language}. Do not switch languages mid-text. Do not include English words if the language is not English.

${featuredHint}

SUBJECT (max 8 words):
- Lowercase or sentence case (NOT TitleCase, never ALL CAPS).
- Opens a clear curiosity gap or asks a direct, irresistible question.
- 0 or 1 emoji max, only when it adds info (📩 🔔 📸 🎥 🔞 🫦 etc.).
- ${banned}

BODY (2 to 4 short lines, like a real text she just sent):
- Give ONE concrete reason to click NOW: a photo to look at, an unread message to open, a video to watch, a friend request to accept, a question waiting for an answer, an opinion she wants on her body or outfit, a "boobs or butt" vote, etc.
- Sounds like a real text from a slightly horny girl to a guy she likes.
- Do NOT mention 'AI', 'app', 'platform', 'premium', 'tokens'.
- Wrap exactly ONE short action phrase (3 to 7 words) inside <<click>> and <</click>>. That phrase will become the inline blue underlined link in the email. Examples:
   "you can <<click>>see it here<</click>>"
   "<<click>>open it before I delete it<</click>>"
   "<<click>>vote for boobs or butt<</click>>"
- End with her name on its own line + 1 emoji max.

OUTPUT: Reply ONLY valid JSON: {"subject":"...","body":"..."}`
                },
                {
                    role: "user",
                    content: `Date: ${today}. Today's hook: ${hook}. Use this format: ${format}. Write a fresh, surprising click-worthy email in ${language} from ${charName}. Make it feel completely different from any previous email. Remember to include exactly ONE <<click>>...<</click>> inline link inside the body.`
                }
            ]
        }, {
            headers: { Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`, "Content-Type": "application/json" },
            timeout: 15000
        });

        const raw = resp.data.choices?.[0]?.message?.content || "";
        const jsonMatch = raw.match(/\{[\s\S]*"subject"[\s\S]*"body"[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.subject && parsed.body) {
                if (looksLikeLanguageMismatch(parsed.subject + " " + parsed.body, lang)) {
                    console.log(`[DAILY-EMAIL] Language mismatch detected for lang=${lang}, falling back. Got: ${parsed.subject}`);
                    return pickFallback(charName, lang, isFeatured);
                }
                // Si l'IA a oublie le marker, on ajoute un lien inline en injectant le marker
                // sur la 1ere ligne non-signature pour garantir un CTA inline.
                if (!/<<click>>[\s\S]+?<<\/click>>/.test(parsed.body)) {
                    parsed.body = injectInlineClickMarker(parsed.body, charName, lang);
                }
                return parsed;
            }
        }
    } catch (e) {
        console.log("[DAILY-EMAIL] AI generation failed:", e.message);
    }

    return pickFallback(charName, lang, isFeatured);
}

// Si l'IA n'a pas wrappe de phrase dans <<click>>...<</click>>, on injecte un fallback
// inline sur la derniere ligne non-signature. La signature (ligne contenant le name) reste intacte.
function injectInlineClickMarker(body, charName, lang) {
    const fallbackPhrases = {
        en: "tap here", fr: "clique ici", de: "tipp hier", es: "toca aquí", pt: "toca aqui"
    };
    const phrase = fallbackPhrases[lang] || fallbackPhrases.en;
    const lines = body.split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;
        if (trimmed === charName || trimmed.startsWith(charName)) continue;
        lines[i] = `${trimmed} <<click>>${phrase}<</click>>`;
        break;
    }
    return lines.join("\n");
}

// Traductions pour CTA / footer / unsubscribe des daily emails
const DAILY_EMAIL_UI_I18N = {
    en: { cta: "Reply to {name}", footer: "MyAiCrush · AI companions", unsub: "Unsubscribe" },
    fr: { cta: "Répondre à {name}", footer: "MyAiCrush · Compagnes IA", unsub: "Se désabonner" },
    de: { cta: "{name} antworten", footer: "MyAiCrush · KI-Begleiterinnen", unsub: "Abmelden" },
    es: { cta: "Responder a {name}", footer: "MyAiCrush · Compañeras IA", unsub: "Cancelar suscripción" },
    pt: { cta: "Responder a {name}", footer: "MyAiCrush · Companheiras IA", unsub: "Cancelar inscrição" }
};

function buildDailyEmail(body, charName, imageUrl, ctaUrl, trackingPixelUrl, lang = "en") {
    const t = DAILY_EMAIL_UI_I18N[lang] || DAILY_EMAIL_UI_I18N.en;
    const ctaLabel = t.cta.replace(/\{name\}/g, charName);

    // Transforme les markers <<click>>texte<</click>> en lien bleu souligne inline pointant
    // vers le meme CTA (donc trackable). Si la signature contient un marker (ne devrait pas),
    // il est aussi transforme proprement.
    const renderInlineLinks = (line) =>
        line.replace(/<<click>>([\s\S]+?)<<\/click>>/g, (_, label) =>
            `<a href="${ctaUrl}" style="color:#2563eb;text-decoration:underline;font-weight:600;">${label.trim()}</a>`
        );

    const bodyHtml = body.split("\n").filter(l => l.trim()).map(line => {
        const trimmed = line.trim();
        if (trimmed === charName || trimmed.startsWith(charName)) {
            return `<p style="margin:16px 0 0;font-weight:600;color:#7c3aed;">${renderInlineLinks(trimmed)}</p>`;
        }
        return `<p style="margin:0 0 8px;font-size:1rem;line-height:1.6;color:#1a1a1a;">${renderInlineLinks(trimmed)}</p>`;
    }).join("");

    return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;background:#ffffff;color:#1a1a1a;">
  ${imageUrl ? `<div style="text-align:center;padding:16px 16px 0;">
    <a href="${ctaUrl}" style="text-decoration:none;"><img src="${imageUrl}" alt="${charName}" style="max-width:250px;width:100%;height:auto;border-radius:12px;" /></a>
  </div>` : ""}
  <div style="padding:16px 20px 24px;">
    ${bodyHtml}
    <div style="margin:20px 0 0;">
      <a href="${ctaUrl}" style="display:inline-block;background:#7c3aed;color:#fff;font-weight:600;font-size:0.9rem;padding:12px 28px;border-radius:8px;text-decoration:none;">${ctaLabel}</a>
    </div>
  </div>
  <div style="padding:0 20px 16px;">
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 12px;" />
    <p style="font-size:0.7rem;color:#9ca3af;margin:0;">${t.footer}</p>
  </div>
  <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
</div>`;
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

// 📬 Daily engagement email — 15:30 Lausanne (UTC+2) = 13:30 UTC
schedule.scheduleJob('30 13 * * *', async () => {
    try {
        console.log(`📬 [DAILY-EMAIL] Starting daily email send...`);
            const database = client.db('MyAICrush');
            const users = database.collection('users');

            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Auto-clean: disable users who haven't opened in 10+ days
            const cleanResult = await users.updateMany(
                {
                    dailyEmailEligible: true,
                    $or: [
                        { lastEmailOpenedAt: { $lt: tenDaysAgo } },
                        { lastEmailOpenedAt: { $exists: false }, dailyEmailEligibleSince: { $lt: tenDaysAgo } },
                        { lastEmailOpenedAt: { $exists: false }, dailyEmailEligibleSince: { $exists: false }, createdAt: { $lt: tenDaysAgo } }
                    ]
                },
                { $set: { dailyEmailEligible: false, dailyEmailCleanedAt: new Date() } }
            );
            if (cleanResult.modifiedCount > 0) {
                console.log(`🧹 [DAILY-EMAIL] Auto-cleaned ${cleanResult.modifiedCount} inactive users`);
            }

            // Pick today's character: any IA flagged `new: true` in characters.json gets
            // featured for FEATURED_EMAIL_COUNT consecutive emails, otherwise random rotation
            // built dynamically from characters.json (all IAs participate).
            const featured = await getAndConsumeFeaturedNewCharacter(database);
            let char = null;
            let imageUrl = null;
            let isFeatured = false;
            if (featured) {
                char = featured;
                imageUrl = pickDailyCharImage(char);
                isFeatured = true;
            }
            if (!imageUrl) {
                // Random pick from the rotation pool, retry up to 5 times if image folder is empty
                const pool = getDailyRotationPool();
                if (!pool.length) {
                    console.error("[DAILY-EMAIL] Empty rotation pool, aborting");
                    return;
                }
                const tried = new Set();
                for (let i = 0; i < 5 && !imageUrl; i++) {
                    const candidate = pool[Math.floor(Math.random() * pool.length)];
                    if (tried.has(candidate.name)) continue;
                    tried.add(candidate.name);
                    const url = pickDailyCharImage(candidate);
                    if (url) { char = candidate; imageUrl = url; }
                }
                if (!imageUrl) {
                    console.error("[DAILY-EMAIL] No usable image found after 5 retries, aborting");
                    return;
                }
            }

            // Find eligible users
            const eligibleUsers = await users.find({
                dailyEmailEligible: true,
                unsubscribedEmail: { $ne: true },
                email: { $exists: true, $ne: "" },
                $or: [
                    { lastDailyEmailSentAt: { $exists: false } },
                    { lastDailyEmailSentAt: { $lt: today } }
                ]
            }, { projection: { email: 1, lang: 1 } }).toArray();

            const validUsers = eligibleUsers.filter(u => isValidEmailFormat(u.email));
            console.log(`📬 [DAILY-EMAIL] ${validUsers.length} eligible users (${eligibleUsers.length - validUsers.length} filtered out as invalid), char: ${char.name}`);

            if (!validUsers.length) return;

            // Generate content per language group
            const langGroups = {};
            for (const u of validUsers) {
                const lang = (u.lang || "en").substring(0, 2).toLowerCase();
                if (!langGroups[lang]) langGroups[lang] = [];
                langGroups[lang].push(u);
            }

            let sent = 0, errors = 0;
            const allSubjects = [];
            for (const [lang, langUsers] of Object.entries(langGroups)) {
                const content = await generateDailyEmailContent(char.name, lang, isFeatured);
                const ctaUrl = `https://myaicrush.ai?utm_source=email&utm_medium=daily&utm_campaign=engagement&utm_content=${char.name.toLowerCase()}`;

                // Create campaign record for this language batch
                const campaigns = database.collection('daily_email_campaigns');
                const campaignDoc = await campaigns.insertOne({
                    sentAt: new Date(),
                    subject: content.subject,
                    character: char.name,
                    language: lang,
                    sentCount: 0,
                    openCount: 0,
                    clickCount: 0
                });
                const campaignId = campaignDoc.insertedId.toString();
                allSubjects.push(content.subject);

                let langSent = 0;
                for (const u of langUsers) {
                    try {
                        const trackToken = Buffer.from(`${u.email}|${campaignId}`).toString('base64url');
                        const trackingPixelUrl = `https://myaicrush.ai/t/${trackToken}`;
                        const clickTrackUrl = `https://myaicrush.ai/c/${trackToken}?r=${encodeURIComponent(ctaUrl)}`;
                        const unsubUrl = `https://myaicrush.ai/unsubscribe?email=${encodeURIComponent(u.email)}`;

                        const tUi = DAILY_EMAIL_UI_I18N[lang] || DAILY_EMAIL_UI_I18N.en;
                        const html = buildDailyEmail(content.body, char.name, imageUrl, clickTrackUrl, trackingPixelUrl, lang)
                            + `<div style="text-align:center;padding:0 20px 16px;"><a href="${unsubUrl}" style="font-size:0.65rem;color:#c0c0c0;text-decoration:underline;">${tUi.unsub}</a></div>`;

                        await resend.emails.send({
                            from: "MyAiCrush <contact@myaicrush.ai>",
                            to: u.email,
                            reply_to: "contact@myaicrush.ai",
                            subject: content.subject,
                            html
                        });

                        await users.updateOne({ email: u.email }, { $set: { lastDailyEmailSentAt: new Date() } });
                        sent++;
                        langSent++;
                    } catch (e) {
                        errors++;
                        if (errors <= 5) console.log(`[DAILY-EMAIL] Error for ${u.email}:`, e.message);
                        if (e.message && (e.message.includes("not found") || e.message.includes("invalid") || e.message.includes("bounced"))) {
                            await users.updateOne({ email: u.email }, { $set: { dailyEmailEligible: false } });
                        }
                    }
                    if (validUsers.length > 10) await new Promise(r => setTimeout(r, 150));
                }
                // Update campaign sentCount
                await campaigns.updateOne({ _id: campaignDoc.insertedId }, { $set: { sentCount: langSent } });
            }
            console.log(`📬 [DAILY-EMAIL] Done: sent=${sent}, errors=${errors}`);
        } catch (e) {
            console.error("[DAILY-EMAIL] Fatal error:", e.message);
        }
});

// 🚫 Unsubscribe from marketing emails
app.get('/unsubscribe', async (req, res) => {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).send("Missing email parameter.");

    try {
        const database = client.db('MyAICrush');
        const users = database.collection('users');
        await users.updateOne({ email }, { $set: { unsubscribedEmail: true } });

        const lang = (req.headers["accept-language"] || "").toLowerCase();
        const isFr = lang.startsWith("fr");
        const isDe = lang.startsWith("de");
        const isEs = lang.startsWith("es");
        const isPt = lang.startsWith("pt");

        const title = isFr ? "Desabonnement confirme" : isDe ? "Abmeldung bestatigt" : isEs ? "Baja confirmada" : isPt ? "Cancelamento confirmado" : "Unsubscribed";
        const msg = isFr ? "Vous ne recevrez plus d'emails marketing de MyAiCrush."
            : isDe ? "Sie erhalten keine Marketing-E-Mails mehr von MyAiCrush."
            : isEs ? "Ya no recibiras correos de marketing de MyAiCrush."
            : isPt ? "Voce nao recebera mais emails de marketing do MyAiCrush."
            : "You will no longer receive marketing emails from MyAiCrush.";
        const back = isFr ? "Retour au site" : isDe ? "Zuruck zur Seite" : isEs ? "Volver al sitio" : isPt ? "Voltar ao site" : "Back to site";

        res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;">
<div style="text-align:center;max-width:400px;padding:40px 24px;">
<h1 style="font-size:1.5rem;color:#1a1a1a;margin:0 0 12px;">${title}</h1>
<p style="color:#6b7280;line-height:1.6;margin:0 0 24px;">${msg}</p>
<a href="https://myaicrush.ai" style="color:#7c3aed;text-decoration:none;font-weight:600;">${back}</a>
</div></body></html>`);
    } catch (e) {
        console.error("[UNSUBSCRIBE] Error:", e.message);
        res.status(500).send("An error occurred. Please try again.");
    }
});

// Connecter à la base de données avant de démarrer le serveur
connectToDb().then(async () => {
  try {
    const database = client.db("MyAICrush");
    const tickets = database.collection("support_tickets");
    await tickets.createIndex({ closedAt: 1 }, { expireAfterSeconds: 15 * 24 * 3600 });
    console.log("✅ TTL index on support_tickets.closedAt (15 days)");
  } catch (e) {
    console.warn("TTL index setup:", e.message);
  }

  try {
    const database = client.db("MyAICrush");
    await database.collection("user_memories").createIndex({ email: 1, character: 1 }, { unique: true });
    console.log("✅ Unique index on user_memories (email + character)");
  } catch (e) {
    console.warn("user_memories index setup:", e.message);
  }

  try {
    const database = client.db("MyAICrush");
    await database.collection("chat_messages").createIndex({ email: 1, character: 1, createdAt: -1 });
    console.log("✅ Index on chat_messages (email + character + createdAt)");
  } catch (e) {
    console.warn("chat_messages index setup:", e.message);
  }

  app.listen(PORT, () => {
    console.log(`Serveur lancé sur le port ${PORT}`);
  });
}).catch((err) => {
  console.error('Erreur de connexion à la base de données :', err);
});