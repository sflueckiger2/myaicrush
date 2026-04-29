// One-shot courtesy email to Bruce (typo on purchases) confirming the
// 1000 tokens credited as a goodwill gesture.
//
// Usage:
//   node tools/send_courtesy_email.cjs [--dry-run]
//
// Reads RESEND_API_KEY and RESEND_FROM_EMAIL from .env.

require('dotenv').config();
const { Resend } = require('resend');

const TO_EMAIL = 'bruce.w2010@hotmail.com';
const TOTAL_TOKENS = 1000;
const DRY = process.argv.includes('--dry-run');

const subject = `Your ${TOTAL_TOKENS} tokens have been added to your account`;

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e8e8f0;">
  <div style="max-width:540px;margin:0 auto;padding:32px 20px;">
    <div style="background:linear-gradient(135deg,#1f1430,#140a1e);border:1px solid rgba(244,114,182,0.2);border-radius:16px;padding:28px 26px;">
      <h1 style="margin:0 0 8px 0;font-size:1.3rem;color:#f472b6;">Hi Bruce,</h1>
      <p style="font-size:0.95rem;line-height:1.55;margin:14px 0;color:#e8e8f0;">
        We noticed that some of your recent token purchases were made using
        a slightly different email address (a small typo). To make sure you
        keep full access to everything you paid for, we've consolidated
        everything onto your main account.
      </p>
      <div style="background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.35);border-radius:12px;padding:16px 18px;margin:20px 0;text-align:center;">
        <div style="font-size:0.72rem;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Tokens credited</div>
        <div style="font-size:2rem;font-weight:700;color:#34d399;margin-top:4px;">+${TOTAL_TOKENS} 🪙</div>
        <div style="font-size:0.78rem;color:#9ca3af;margin-top:6px;">Already available on your account.</div>
      </div>
      <p style="font-size:0.92rem;line-height:1.55;color:#e8e8f0;">
        As an apology for the technical inconvenience, we've also added
        some extra tokens on top — consider it a thank-you for your trust.
      </p>
      <p style="font-size:0.92rem;line-height:1.55;color:#e8e8f0;">
        You can use them right away by signing in to your account.
      </p>
      <div style="text-align:center;margin:24px 0 8px 0;">
        <a href="https://myaicrush.ai/login.html"
           style="display:inline-block;background:linear-gradient(135deg,#f472b6,#ec4899);color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600;font-size:0.95rem;">
          Open my account
        </a>
      </div>
      <p style="font-size:0.82rem;line-height:1.5;color:#9ca3af;margin-top:24px;">
        If you have any question, just reply to this email — we read every message.
      </p>
      <p style="font-size:0.82rem;line-height:1.5;color:#9ca3af;">
        Thanks for being with us,<br>
        <strong style="color:#f472b6;">The MyAiCrush team</strong>
      </p>
    </div>
    <p style="text-align:center;font-size:0.7rem;color:#6b6b88;margin-top:18px;">
      MyAiCrush · AI companions
    </p>
  </div>
</body></html>`;

(async () => {
  if (DRY) {
    console.log('--- DRY RUN ---');
    console.log('To:', TO_EMAIL);
    console.log('Subject:', subject);
    console.log('Length:', html.length, 'bytes');
    return;
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY in .env');
    process.exit(1);
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const r = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'MyAiCrush <contact@myaicrush.ai>',
    to: TO_EMAIL,
    subject,
    html
  });
  console.log('✅ Sent:', JSON.stringify(r, null, 2));
})().catch(e => { console.error('❌', e); process.exit(1); });
