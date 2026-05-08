/*
  template_prompts.js — combinatorial generator for Mage.space prompts.

  DESIGN GOALS (rewritten 2026-05):
    - SHORT prompts. Long prompts confused Mango 2 and produced 3-arm /
      weird-nipple artifacts.
    - NO PHONE. We removed every mention of "phone", "holding the phone",
      "mirror selfie with phone in hand", etc. The phone-in-frame prop
      caused continuity issues in the generated videos (extra hand,
      wandering phone, etc.). The vibe is now "candid intimate selfie"
      WITHOUT showing the device — most refs the user provided are
      framed as if the camera is just there.
    - Style matches the user's reference set: small intimate spaces
      (attic bedroom with wooden ceiling, simple bedrooms, bathrooms,
      beds), simple lingerie / bralettes / sports bras / loose tees /
      light dresses, natural daylight, sometimes B&W, sometimes round
      glasses, framing often cropped (only face+chest, only torso, only
      side body, etc.).
    - Genetics stay 100% the character's — only outfit / setting /
      framing vary across batches.

  Final prompt shape:
    Photo of {GENETICS}. She is wearing {OUTFIT}, {SETTING}. {FRAMING} {STYLE}

  Video prompt: short imperative English describing chest motion (Wan 2.2).
*/

const DEFAULT_STYLE = "natural amateur selfie, very realistic, vertical 9:16";

// ---------- SCENE BUNDLES (outfit + setting kept coherent) ----------
//
// Each bundle is just `outfit` + `setting`. Style: intimate, domestic,
// candid amateur selfie — without specifying "phone in hand" (the device
// caused continuity issues in videos). We aim for VARIETY of small
// domestic decors so two batches don't end up in the same room. The
// reference set was used as STYLE inspiration (intimate / candid /
// natural light), NOT a prescription — we deliberately do NOT lock to
// "attic with wooden ceiling" or "round glasses", which would make every
// shot look identical.
const SFW_BUNDLES = [
  // — Lingerie / bralette sets (varied rooms)
  { outfit: "a thin black lace bralette and matching panties", setting: "in a soft-lit bedroom" },
  { outfit: "a soft white lace bralette and white panties", setting: "in a small white-walled bedroom" },
  { outfit: "a beige seamless bralette and matching panties", setting: "in a sunlit bedroom" },
  { outfit: "a plain black bralette and black cotton panties", setting: "by a tall bedroom window" },
  { outfit: "a soft pink bralette and pink panties", setting: "in a cozy bedroom" },
  { outfit: "a thin satin cream bralette and matching shorts", setting: "in a hotel room" },
  { outfit: "a black sports bra and black panties", setting: "by a bedroom window with sheer curtains" },
  { outfit: "a fitted gray sports bra and tiny gray shorts", setting: "in a bright bedroom" },
  { outfit: "a small olive sports bra and matching panties", setting: "in a small dim bedroom" },
  { outfit: "a thin white lace bralette", setting: "in a dressing room with mirrored walls" },

  // — Tank tops / oversized tees
  { outfit: "a thin white ribbed tank top with no bra and white panties", setting: "in a small bedroom" },
  { outfit: "an oversized faded gray t-shirt and no pants", setting: "in a soft-lit bedroom in the morning" },
  { outfit: "an oversized white t-shirt and white panties", setting: "in a sunlit bedroom" },
  { outfit: "a tiny gray tank top and tiny pyjama shorts", setting: "in a small living room" },
  { outfit: "an oversized boyfriend t-shirt and short cotton shorts", setting: "in a cozy bedroom in the morning" },
  { outfit: "a thin black ribbed tank top and small shorts", setting: "in a hotel room with city light through the window" },

  // — On / in bed
  { outfit: "a soft white tank top and panties", setting: "lying on a bed with white sheets" },
  { outfit: "a small black bralette and panties", setting: "lying on a bed with gray sheets" },
  { outfit: "an oversized t-shirt slipping off one shoulder", setting: "sitting cross-legged on a bed" },
  { outfit: "a thin pink camisole", setting: "lying on white pillows" },
  { outfit: "a tiny strappy nightie", setting: "on a soft duvet" },

  // — Bathroom / post-shower / robe
  { outfit: "a black bralette", setting: "in a small modern bathroom" },
  { outfit: "a soft white towel wrapped under her chest", setting: "in a steamy bathroom" },
  { outfit: "a fitted gray sports bra", setting: "in a tiled bathroom" },
  { outfit: "a thin silk robe loosely tied", setting: "in a small bathroom" },
  { outfit: "a soft pink robe slightly open at the chest", setting: "by a sunlit bathroom window" },
  { outfit: "a small white towel turban and a tank top", setting: "in front of a steamy bathroom mirror" },

  // — Light dresses / blouses
  { outfit: "a small light blue summer dress with thin straps", setting: "in a soft-lit room" },
  { outfit: "a small white summer dress with thin straps", setting: "in a sunlit hallway" },
  { outfit: "a soft gray pleated short dress with long sheer sleeves", setting: "in front of a closet mirror" },
  { outfit: "a small black slip dress", setting: "in a dim hotel room" },
  { outfit: "a thin floral sundress", setting: "by an open window" },
  { outfit: "an unbuttoned oversized white shirt over a small bra", setting: "in a bright bedroom" },

  // — Crop / knot tops
  { outfit: "a small white knotted top tied at the chest and tiny black shorts", setting: "in a small kitchen" },
  { outfit: "a small beige knotted top tied at the chest and a black mini skirt", setting: "in a soft-lit hallway" },
  { outfit: "a fitted black crop top and high-waist jean shorts", setting: "in front of a wardrobe mirror" },
  { outfit: "a tight ribbed white crop top and gray sweatpants riding low", setting: "on a beige sofa" },

  // — Living room / sofa / couch
  { outfit: "an oversized cream knit pullover slipping off one shoulder", setting: "on a beige couch" },
  { outfit: "a soft pink hoodie unzipped halfway over a small bralette", setting: "on a couch" },
  { outfit: "a thin strappy white camisole", setting: "in a small living room" },
  { outfit: "a fitted black turtleneck and high-waist jeans", setting: "by a window at golden hour" },

  // — Outdoor / balcony / terrace (clothed)
  { outfit: "a small white sundress with thin straps", setting: "on a small sunlit balcony" },
  { outfit: "a tiny string bikini top under an unbuttoned linen shirt", setting: "on a sunlit terrace" },
  { outfit: "a tight white tank top and low-rise jeans", setting: "on a small balcony at golden hour" },
];

const NSFW_BUNDLES = [
  // — Topless + panties (varied rooms)
  { outfit: "topless wearing only black panties", setting: "in a soft-lit bedroom" },
  { outfit: "topless wearing only white panties", setting: "in a small bedroom" },
  { outfit: "topless wearing only black lace panties", setting: "by a bedroom window with sheer curtains" },
  { outfit: "topless wearing only white lace panties", setting: "in a sunlit bedroom" },
  { outfit: "topless wearing only beige panties", setting: "in a small white-walled bedroom" },
  { outfit: "topless wearing only thin pink panties", setting: "in a cozy bedroom" },
  { outfit: "topless wearing only black string panties", setting: "in a hotel room" },
  { outfit: "topless wearing only fishnet stockings", setting: "in a dim bedroom" },

  // — Bare on / in bed
  { outfit: "topless lying on her back", setting: "on a bed with white sheets" },
  { outfit: "topless lying on her stomach with arms folded under her chin", setting: "on a bed with gray sheets" },
  { outfit: "topless wearing only panties, sitting cross-legged", setting: "on a soft duvet" },
  { outfit: "topless wrapped loosely in a white sheet", setting: "on a bed in the morning" },
  { outfit: "topless on her side", setting: "on white pillows" },
  { outfit: "fully nude under a thin sheet slipping off her chest", setting: "on a bed in soft daylight" },

  // — Bathroom / post-shower / wet
  { outfit: "topless wearing only black panties", setting: "in a small bathroom" },
  { outfit: "topless with a small white towel held loosely against her chest", setting: "in a tiled bathroom" },
  { outfit: "topless wearing only white panties", setting: "in front of a foggy bathroom mirror" },
  { outfit: "topless after a shower with damp hair", setting: "in a steamy bathroom" },
  { outfit: "topless wearing only a small white towel around her hips", setting: "in a modern bathroom" },
  { outfit: "fully nude with wet hair stuck to her chest", setting: "in a steamy bathroom" },

  // — Half-undressed / in motion
  { outfit: "topless under an open unbuttoned white shirt", setting: "in a sunlit bedroom" },
  { outfit: "topless under an open unbuttoned oversized denim shirt", setting: "in a small living room" },
  { outfit: "topless with a black bralette pulled down exposing her bare chest", setting: "in front of a wardrobe mirror" },
  { outfit: "topless with her soft white t-shirt lifted up over her bare chest", setting: "on a beige couch" },
  { outfit: "topless under a thin silk robe falling open at the chest", setting: "in a hotel room" },
  { outfit: "topless under a soft pink robe slipping off both shoulders", setting: "by a sunlit bedroom window" },

  // — Posed / kneeling
  { outfit: "topless kneeling on the floor", setting: "in a small bedroom" },
  { outfit: "topless kneeling on a soft rug", setting: "in a sunlit living room" },
  { outfit: "topless on her knees stretching her arms above her head", setting: "in a dim bedroom" },
  { outfit: "topless leaning forward on the edge of a bed", setting: "in a small bedroom" },

  // — Outdoor / window / balcony (bare)
  { outfit: "topless leaning out from a half-open silk robe", setting: "on a small balcony at sunrise" },
  { outfit: "fully nude with a thin sheer scarf over one shoulder only", setting: "in front of an open window with a sheer curtain" },
  { outfit: "topless wearing only short denim cutoffs", setting: "on a small terrace at golden hour" },
];

// ---------- VIDEO MICRO-BEATS ----------
// Wan 2.2 prefers VERY simple English imperatives. One short sentence
// describing chest motion + one short consequence sentence. Long prompts
// are ignored. Format: "The woman squeezes her large breasts with her hands.
// Her breasts look bigger and bounce."
const VIDEO_BEATS_SFW = [
  "The woman squeezes her large breasts with her hands. Her breasts look bigger and bounce.",
  "The woman squeezes her arms against her chest. Her breasts look bigger and bounce.",
  "The woman bounces her breasts up and down. Her breasts bounce heavily.",
  "The woman shakes her chest left and right. Her breasts swing heavily.",
  "The woman leans forward. Her breasts hang heavy and bounce.",
  "The woman jumps in place. Her breasts bounce up and down.",
  "The woman taps her chest with her hand. Her breasts bounce.",
  "The woman turns around quickly. Her breasts swing and bounce.",
  "The woman arches her back. Her breasts push forward.",
  "The woman hugs herself tightly. Her breasts get squeezed and bounce.",
  "The woman runs her hands down her breasts. Her breasts bounce.",
  "The woman stretches her arms up. Her breasts lift and settle.",
  "The woman shakes her shoulders. Her breasts shake with the motion.",
  "The woman bounces lightly on her heels. Her breasts bounce up and down.",
  "The woman leans back then forward. Her breasts swing.",
  "The woman lifts her breasts with both hands. Her breasts look bigger.",
  "The woman pushes her breasts together. Her breasts look bigger.",
  "The woman walks backward. Her breasts bounce.",
  "The woman drops her shoulders. Her breasts fall heavy and settle.",
  "The woman laughs softly. Her breasts shake naturally.",
];

const VIDEO_BEATS_NSFW = [
  "The woman squeezes her large bare breasts with her hands. Her breasts look bigger and bounce.",
  "The woman squeezes her arms against her bare chest. Her bare breasts look bigger and bounce.",
  "The woman bounces her bare breasts up and down. Her bare breasts bounce heavily.",
  "The woman shakes her bare chest left and right. Her bare breasts swing heavily.",
  "The woman leans forward. Her bare breasts hang heavy and bounce.",
  "The woman jumps in place. Her bare breasts bounce up and down.",
  "The woman taps her bare chest with her hand. Her bare breasts bounce.",
  "The woman turns around quickly. Her bare breasts swing and bounce.",
  "The woman arches her back. Her bare breasts push forward.",
  "The woman cups one bare breast. The bare breast bounces in her hand.",
  "The woman runs her hands down her bare breasts. Her bare breasts bounce.",
  "The woman stretches her arms up. Her bare breasts lift and settle.",
  "The woman shakes her shoulders. Her bare breasts shake with the motion.",
  "The woman bounces lightly on her heels. Her bare breasts bounce up and down.",
  "The woman leans back then forward. Her bare breasts swing.",
  "The woman lifts her bare breasts with both hands. Her bare breasts look bigger.",
  "The woman pushes her bare breasts together. Her bare breasts look bigger.",
  "The woman walks backward. Her bare breasts bounce.",
  "The woman drops her shoulders. Her bare breasts fall heavy and settle.",
  "The woman laughs softly. Her bare breasts shake naturally.",
];

// ---------- helpers ----------
const fs = require('fs');
const path = require('path');

const USAGE_FILE = path.join(__dirname, '_bundle_usage.json');

function loadUsage() {
  try { return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8')); }
  catch (_) { return {}; }
}
function saveUsage(usage) {
  try { fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2)); }
  catch (e) { console.warn('[template_prompts] could not persist usage: ' + e.message); }
}
function bundleKey(b) { return b.outfit + '|' + b.setting; }

// Pick `n` items preferring the lowest usage count. Same-count items are
// shuffled with Fisher-Yates so successive batches don't replay the same
// order at a given level.
function pickNWeighted(arr, n, getCount) {
  const groups = new Map();
  for (const item of arr) {
    const c = getCount(item) || 0;
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(item);
  }
  const keys = Array.from(groups.keys()).sort((a, b) => a - b);
  const out = [];
  for (const k of keys) {
    const g = groups.get(k);
    for (let i = g.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [g[i], g[j]] = [g[j], g[i]];
    }
    for (const item of g) {
      out.push(item);
      if (out.length === n) return out;
    }
  }
  return out;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ---------- FRAMING NOTES ----------
// SHORT framing/camera-perspective modifiers. We deliberately avoid
// putting outfit/decor/accessory specifics here (no "round glasses",
// no "wooden ceiling"), because those would compound with the bundle's
// outfit+setting and turn every shot into a clone. These are PURE
// composition notes — angle, crop, B&W, etc.
//
// Empty slots = let the bundle stand on its own (most natural-looking).
const FRAMING_NOTES = [
  "Close-up on her face and chest.",
  "Close-up on her face and chest.",
  "Tight crop showing only her torso, face out of frame.",
  "Tight crop showing only her chest and stomach, face out of frame.",
  "Side profile shot of her body.",
  "Low angle from below looking up at her.",
  "Top-down angle looking down at her chest.",
  "Lying on the bed, close-up.",
  "Looking up at the camera, head slightly tilted.",
  "Slightly tilted candid framing, a bit imperfect.",
  "Badly framed candid shot, head partially cropped.",
  "Wide shot showing her full body in the room.",
  "Black and white photo.",
  "Black and white photo.",
  "Black and white photo, close-up.",
  "Soft natural daylight on her skin.",
  "",
  "",
  "",
  "",
];

const FRAMING_NOTES_NSFW = [
  "Close-up on her face and bare chest.",
  "Close-up on her face and bare chest.",
  "Tight crop showing only her bare chest and stomach, face out of frame.",
  "Tight crop showing only her bare torso, face out of frame.",
  "Side profile shot of her body.",
  "Low angle from below looking up at her bare chest.",
  "Top-down angle looking down at her bare chest.",
  "Lying on the bed, close-up of her bare chest.",
  "Looking up at the camera, head slightly tilted.",
  "Slightly tilted candid framing, a bit imperfect.",
  "Badly framed candid shot, head partially cropped.",
  "Wide shot showing her full body in the room.",
  "Black and white photo.",
  "Black and white photo.",
  "Black and white photo, close-up.",
  "Soft natural daylight on her skin.",
  "",
  "",
  "",
  "",
];

function composeSfwScene(bundle) {
  return {
    label: `${bundle.outfit}, ${bundle.setting}`,
    note: pick(FRAMING_NOTES),
    video: pick(VIDEO_BEATS_SFW),
  };
}
function composeNsfwScene(bundle) {
  return {
    label: `${bundle.outfit}, ${bundle.setting}`,
    note: pick(FRAMING_NOTES_NSFW),
    video: pick(VIDEO_BEATS_NSFW),
  };
}

function buildItem(prefix, idx, kind, scene) {
  const name = `${prefix}_${kind === 'sfw' ? 'dressed' : 'coquin'}_${idx}`;
  const verb = kind === 'sfw' ? 'She is wearing' : 'She is';
  const note = scene.note ? ` ${scene.note}` : '';
  const text = `Photo of {GENETICS}. ${verb} ${scene.label}.${note} {STYLE}`;
  return { name, kind, prompt: text, videoPrompt: scene.video };
}

function buildPromptsForGenetics({ character, genetics, styleSuffix, dressedStart, coquinStart, count = 5 }) {
  const style = styleSuffix || DEFAULT_STYLE;
  const ds = Number.isFinite(dressedStart) ? dressedStart : 10;
  const cs = Number.isFinite(coquinStart) ? coquinStart : 10;

  const usage = loadUsage();
  if (!usage[character]) usage[character] = { sfw: {}, nsfw: {} };
  const sfwUsage = usage[character].sfw || (usage[character].sfw = {});
  const nsfwUsage = usage[character].nsfw || (usage[character].nsfw = {});

  const dressedBundles = pickNWeighted(SFW_BUNDLES, count, (b) => sfwUsage[bundleKey(b)] || 0);
  const coquinBundles = pickNWeighted(NSFW_BUNDLES, count, (b) => nsfwUsage[bundleKey(b)] || 0);

  for (const b of dressedBundles) sfwUsage[bundleKey(b)] = (sfwUsage[bundleKey(b)] || 0) + 1;
  for (const b of coquinBundles) nsfwUsage[bundleKey(b)] = (nsfwUsage[bundleKey(b)] || 0) + 1;
  saveUsage(usage);

  const dressed = dressedBundles.map((b, i) =>
    buildItem(character, ds + i, 'sfw', composeSfwScene(b)));
  const coquin = coquinBundles.map((b, i) =>
    buildItem(character, cs + i, 'nsfw', composeNsfwScene(b)));

  return {
    character,
    genetics,
    styleSuffix: style,
    prompts: [...dressed, ...coquin],
    dressedStart: ds,
    coquinStart: cs,
  };
}

module.exports = { buildPromptsForGenetics, DEFAULT_STYLE };
