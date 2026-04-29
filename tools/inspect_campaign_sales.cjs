// Inspect a daily_email_campaigns row by date+character and rebuild the
// list of attributed sales by joining users.lastClickedCampaignId with
// explodely_events that fall inside the 7-day attribution window.
//
// Usage:
//   node tools/inspect_campaign_sales.cjs "Megane" 2026-04-28

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const ATTRIBUTION_WINDOW_DAYS = 7;
const TOKEN_PRICES = { 10: 9, 50: 37, 100: 59, 300: 129, 700: 249, 1000: 299 };
const PREMIUM_USD = 29, ANNUAL_USD = 89, LIFETIME_USD = 174;

function priceFromEvent(productId, env) {
  const lifetimeId = String(env.EXPLODELY_LIFETIME_PRODUCT_ID || '887584369');
  const annualId   = String(env.EXPLODELY_ANNUAL_PRODUCT_ID  || '');
  const premiumId  = String(env.EXPLODELY_PREMIUM_PRODUCT_ID || '');
  const tokenIds = {
    [String(env.EXPLODELY_TOKEN_10_ID  || '')]: 10,
    [String(env.EXPLODELY_TOKEN_50_ID  || '')]: 50,
    [String(env.EXPLODELY_TOKEN_100_ID || '')]: 100,
    [String(env.EXPLODELY_TOKEN_300_ID || '')]: 300,
    [String(env.EXPLODELY_TOKEN_700_ID || '')]: 700,
    [String(env.EXPLODELY_TOKEN_1000_ID|| '')]: 1000
  };
  if (productId === lifetimeId) return { label: 'lifetime',        usd: LIFETIME_USD };
  if (productId === annualId)   return { label: 'annual',          usd: ANNUAL_USD   };
  if (productId === premiumId)  return { label: 'premium_monthly', usd: PREMIUM_USD  };
  const tk = tokenIds[productId];
  if (tk) return { label: `tokens_${tk}`, usd: TOKEN_PRICES[tk] };
  return { label: `unknown_${productId}`, usd: 0 };
}

(async () => {
  const charName = process.argv[2] || 'Megane';
  const dayStr   = process.argv[3] || new Date().toISOString().slice(0, 10);
  const langArg  = (process.argv[4] || '').toLowerCase();

  const dayStart = new Date(`${dayStr}T00:00:00.000Z`);
  const dayEnd   = new Date(`${dayStr}T23:59:59.999Z`);

  const cli = new MongoClient(process.env.MONGO_URI);
  await cli.connect();
  const db = cli.db('MyAICrush');

  const filter = { character: charName, sentAt: { $gte: dayStart, $lte: dayEnd } };
  if (langArg) filter.language = langArg;

  const camps = await db.collection('daily_email_campaigns').find(filter).sort({ sentAt: 1 }).toArray();
  if (!camps.length) {
    console.log(`No campaign found for ${charName} on ${dayStr}${langArg ? ` (${langArg})` : ''}`);
    return process.exit(0);
  }
  if (camps.length > 1 && !langArg) {
    console.log(`Found ${camps.length} campaigns on that day for ${charName}. Re-run with a language filter:`);
    camps.forEach(c => console.log(`   - ${c._id}  lang=${c.language || 'en'}  sent=${c.sentCount}  rev=$${c.revenue || 0}`));
    return process.exit(0);
  }
  const camp = camps[0];

  console.log(`\n📧 Campaign ${camp._id}`);
  console.log(`   character=${camp.character}  lang=${camp.language || 'en'}`);
  console.log(`   sentAt=${camp.sentAt?.toISOString()}`);
  console.log(`   sent=${camp.sentCount} open=${camp.openCount} click=${camp.clickCount}`);
  console.log(`   stored: purchaseCount=${camp.purchaseCount || 0}  revenue=$${camp.revenue || 0}`);

  // 1) Users who clicked this campaign (and have it as their last click)
  const users = await db.collection('users').find(
    { lastClickedCampaignId: String(camp._id) },
    { projection: { email: 1, lastClickedCampaignAt: 1, explodelyPlan: 1 } }
  ).toArray();

  console.log(`\n👥 ${users.length} users have this campaign as their last clicked email.`);

  if (!users.length) { await cli.close(); return; }

  const emails = users.map(u => u.email);

  // 2) Explodely events for these users
  const events = await db.collection('explodely_events').find({
    email: { $in: emails }
  }).sort({ createdAt: 1 }).toArray();

  // 3) Filter to events inside the attribution window per user
  const userByEmail = Object.fromEntries(users.map(u => [u.email, u]));
  const attributed = [];
  let computedRevenue = 0;
  let computedCount = 0;

  for (const ev of events) {
    const u = userByEmail[ev.email];
    if (!u || !u.lastClickedCampaignAt) continue;
    const ageMs = new Date(ev.createdAt).getTime() - new Date(u.lastClickedCampaignAt).getTime();
    // sale must come AFTER click and within window
    if (ageMs < 0 || ageMs > ATTRIBUTION_WINDOW_DAYS * 24 * 3600 * 1000) continue;
    // only count sale-like events (skip refund/cancel/no_match)
    const eventType = String(ev.eventType || ev.action || '').toLowerCase();
    if (!eventType.includes('sale') && eventType !== 'sale' && eventType !== 'sale_processed') {
      // try to detect by presence of productId
      if (!ev.productId) continue;
    }
    const productId = String(ev.productId || '');
    const { label, usd } = priceFromEvent(productId, process.env);
    if (usd <= 0) continue;
    attributed.push({
      email: ev.email,
      orderId: ev.orderId,
      productId,
      label,
      usd,
      at: ev.createdAt
    });
    computedRevenue += usd;
    computedCount += 1;
  }

  console.log(`\n💰 Computed from events: ${computedCount} sales = $${computedRevenue}\n`);
  for (const s of attributed) {
    console.log(`   ${s.at.toISOString()}  ${s.email.padEnd(36)}  ${s.label.padEnd(18)}  $${s.usd}  (order ${s.orderId})`);
  }

  if (computedRevenue !== (camp.revenue || 0)) {
    console.log(`\n⚠️  Mismatch: stored revenue=$${camp.revenue || 0}, computed=$${computedRevenue}`);
  } else {
    console.log(`\n✅ Stored revenue matches computed.`);
  }

  await cli.close();
})().catch(e => { console.error(e); process.exit(1); });
