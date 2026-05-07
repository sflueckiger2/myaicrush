/*
  template_prompts.js — combinatorial generator for Mage.space prompts.

  Each call to `buildPromptsForGenetics` randomly composes N dressed (SFW) +
  N coquin (NSFW) scenes from independent pools:

    SCENE_BUNDLE   = outfit + setting (kept coherent together)
    ANGLES         = camera framing / point of view
    POSES_*        = body language with chest emphasis
    LIGHTINGS      = lighting & mood
    STYLE_MODS     = realism modifiers (B&W, grain, blur, ...)
    VIDEO_BEATS_*  = micro-motion templates for video prompt

  This way two batches with the same character almost never produce the same
  shot. The pool sizes give MILLIONS of unique combinations per kind.

  Style is intentionally amateur iPhone selfie / candid — the model is told
  the photo is unedited, motion-blurred, badly framed, with skin imperfections.
  Video prompts are short imperative directions describing chest dynamics in
  English (Wan 2.2 prefers English) — they intentionally allow facial
  expressions (smile, wink, lip-bite, tongue-out) where they make the clip
  feel more like a real selfie.
*/

// Short, simple style suffix. Long stacked modifiers (motion blur + grain +
// vellus hair + blemishes + chromatic aberration + ...) confused Mage and
// produced 3-arm / weird-nipple artifacts, so we keep it minimal.
const DEFAULT_STYLE = "amateur iPhone selfie, very realistic, vertical 9:16";

// ---------- SCENE BUNDLES (outfit + setting kept coherent) ----------
//
// Each bundle is a CLEAN scene: just outfit + simple location.
// NO narrative props (no "eating cereal", no "with phone charger cables",
// no "with a friend's voice off-camera", etc.) — those create distractions
// and cause the model to focus on irrelevant details. Think: a girl quickly
// snapping a coquin selfie to send to her boyfriend.
const SFW_BUNDLES = [
  // Bedroom — pyjamas / sleepwear
  { outfit: "thin gray spaghetti tank top with no bra and tiny pyjama shorts", setting: "in her bedroom" },
  { outfit: "oversized faded band t-shirt and no bra", setting: "in her bedroom" },
  { outfit: "matching pink cotton pyjama set with the top buttons undone", setting: "in her bedroom" },
  { outfit: "tiny silk slip pyjama with one strap fallen off her shoulder", setting: "in her bedroom" },
  { outfit: "white cotton tank top and pink plaid pyjama pants, no bra", setting: "in her bedroom" },
  { outfit: "oversized boyfriend t-shirt and nothing else", setting: "on her bed" },
  { outfit: "tight ribbed cropped tank top and tiny shorts", setting: "on her bed" },
  { outfit: "loose oversized blue tee and no bra", setting: "in her bedroom" },
  { outfit: "thin strappy black babydoll slip", setting: "in front of a bedroom mirror" },
  { outfit: "thin cotton white tank top with no bra", setting: "in her bedroom" },

  // Bedroom — dresses / mirror
  { outfit: "tight low-cut blue summer dress with thin straps", setting: "in front of a bedroom mirror" },
  { outfit: "low-cut black satin slip dress", setting: "in her bedroom" },
  { outfit: "deep V-neck red knit sweater dress", setting: "in her bedroom" },
  { outfit: "tight ribbed beige bodysuit", setting: "in front of a bedroom mirror" },
  { outfit: "tiny black tube top and short denim skirt", setting: "in her bedroom" },
  { outfit: "navy cardigan unbuttoned over a tight white tank", setting: "in her bedroom" },
  { outfit: "tight strapless black bandeau top and high-waist jeans", setting: "in front of a full-length bedroom mirror" },
  { outfit: "loose cropped sweatshirt that barely fits her chest", setting: "in her bedroom" },

  // Bathroom — towel / steam / mirror
  { outfit: "fluffy oversized bath towel wrapped under her chest", setting: "in a foggy bathroom" },
  { outfit: "wet white tank top clinging to her body, no bra", setting: "in a steamy bathroom" },
  { outfit: "small white towel held up across her chest", setting: "in front of a bathroom mirror" },
  { outfit: "wet pink robe slipping open at the chest", setting: "in a steamy bathroom" },
  { outfit: "dripping wet sports bra", setting: "in a bathroom after a shower" },
  { outfit: "white ribbed crop top stretched tight, no bra", setting: "in a bathroom" },
  { outfit: "knotted men's button-up shirt", setting: "in front of a bathroom mirror" },
  { outfit: "tight black sports bra", setting: "in front of a bathroom mirror" },
  { outfit: "lace bralette under an unbuttoned shirt", setting: "in front of a bathroom mirror" },

  // Living room — couch / floor / window
  { outfit: "oversized cream knit pullover slipping off both shoulders", setting: "on a beige couch" },
  { outfit: "soft pink hoodie unzipped halfway with no bra", setting: "on a couch" },
  { outfit: "thin strappy white camisole", setting: "in her living room" },
  { outfit: "fitted black turtleneck cropped above the navel", setting: "by a living room window at golden hour" },
  { outfit: "loose oversized pastel knit cardigan worn with nothing underneath", setting: "on a soft rug" },
  { outfit: "white ribbed tank top and baggy gray sweatpants riding low", setting: "in her kitchen" },

  // Kitchen / dining
  { outfit: "tight black sports bra and high-waist leggings", setting: "in her kitchen" },
  { outfit: "oversized white men's button-up shirt half-tucked", setting: "in a sunlit kitchen" },
  { outfit: "tight black bralette and high-waist jeans", setting: "in her kitchen" },

  // Outdoor / beach
  { outfit: "tight white t-shirt and low-rise blue jeans", setting: "outdoors at golden hour" },
  { outfit: "tiny string bikini top under an unbuttoned beach shirt", setting: "on a sunlit balcony" },
  { outfit: "oversized white linen shirt over a beige bikini top", setting: "on a sunlit balcony" },
  { outfit: "small white sundress with thin straps", setting: "on a sunlit terrace" },
  { outfit: "thin black wrap top with deep cleavage and a flowy skirt", setting: "outdoors at golden hour" },

  // Gym / yoga
  { outfit: "thin cropped black hoodie pulled up baring her stomach, no bra", setting: "in a small home gym" },
  { outfit: "tight neon sports bra and tight shorts", setting: "in a home gym" },
  { outfit: "thin strappy gray gym tank top and tiny black bike shorts", setting: "in a home gym" },
  { outfit: "tight pink sports bra under an open athletic jacket", setting: "in a sunlit gym" },

  // Mirror selfies — outfits
  { outfit: "tight ribbed white tank top with no bra", setting: "in front of a full-length bedroom mirror" },
  { outfit: "tiny black bikini top tied at the front", setting: "in front of a fitting room mirror" },
  { outfit: "soft cotton boxer shorts and a thin tight white t-shirt, no bra", setting: "in front of a bathroom mirror" },
  { outfit: "fitted knotted plaid shirt and high-waist jean shorts", setting: "in front of a bathroom mirror" },
  { outfit: "thin tight tan camisole with lace trim", setting: "in front of a bedroom mirror" },
  { outfit: "tight white tank top knotted at the waist", setting: "in front of a bathroom mirror" },
  { outfit: "fitted black crop top and high-waist denim shorts", setting: "in front of a bedroom mirror" },

  // Office / dressed up
  { outfit: "fitted white blouse with top buttons undone over a tiny black bra", setting: "in a home office" },
  { outfit: "tight black pencil skirt and a cream silk blouse half-tucked", setting: "in front of a window" },
  { outfit: "tight gray turtleneck dress with sleeves pushed up", setting: "in a dim study" },
  { outfit: "see-through white linen shirt over a tiny black bra", setting: "on a sunlit balcony" },
];

const NSFW_BUNDLES = [
  // Bedroom — bare on bed
  { outfit: "topless with arms pushing her bare breasts together", setting: "on her bed" },
  { outfit: "topless with the bedsheet pulled down to her waist", setting: "on white sheets" },
  { outfit: "topless lying on her stomach with arms crossed under her chin", setting: "on her bed" },
  { outfit: "topless squeezing her bare breasts together with both hands", setting: "in front of a bedroom mirror" },
  { outfit: "topless wearing only loose pyjama bottoms low on her hips", setting: "in her bedroom" },
  { outfit: "topless with hair wet and dripping down her chest", setting: "in a bathrobe in a steamy bathroom" },
  { outfit: "fully nude with only a thin chain necklace", setting: "wrapped in white sheets on a bed" },
  { outfit: "topless covering her bare breasts with one hand", setting: "in front of a bedroom mirror" },
  { outfit: "topless wearing only white cotton panties", setting: "on her bed" },
  { outfit: "fully nude under a thin white sheet slipping off her chest", setting: "on a bed" },
  { outfit: "topless on her back with one knee up", setting: "on her bed in soft daylight" },
  { outfit: "topless with a white sheet wrapped around her hips only", setting: "on the edge of her bed" },

  // Bathroom — wet, mirror, post-shower
  { outfit: "open unbuttoned oversized white shirt, nothing underneath", setting: "in front of a steamy bathroom mirror" },
  { outfit: "wet bare chest with water dripping down her body", setting: "in a steamy shower" },
  { outfit: "soaked white bra clinging to her nipples", setting: "in a bathroom after a shower" },
  { outfit: "fully topless with her hair slicked back, wet", setting: "under a shower" },
  { outfit: "topless wearing only black string panties, wet", setting: "in front of a foggy bathroom mirror" },
  { outfit: "fully nude with a small towel slipping down to her hips", setting: "in front of a bathroom mirror" },
  { outfit: "topless with hair tied up in a towel turban", setting: "on a bathroom counter" },
  { outfit: "topless after a bath, soap suds on her chest", setting: "in a small bathroom" },
  { outfit: "topless in front of a steamy bathroom mirror", setting: "in a steamy bathroom" },

  // Living room / floor / couch — bare
  { outfit: "long silk robe open at the front, full bare chest visible", setting: "on the living room floor" },
  { outfit: "loose cardigan off both shoulders, fully topless", setting: "on a beige couch" },
  { outfit: "fully topless", setting: "on a soft white rug" },
  { outfit: "topless wearing only thin gold chains on her hips", setting: "in her living room" },
  { outfit: "fully nude with one leg up on the couch", setting: "in a sunlit living room" },
  { outfit: "open unbuttoned cardigan with nothing underneath", setting: "on the couch" },

  // Kitchen / domestic — bare
  { outfit: "topless wearing only an unbuttoned denim mini skirt", setting: "in a sunlit kitchen" },
  { outfit: "topless wearing only short white socks", setting: "in her kitchen" },
  { outfit: "topless wearing only loose gray sweatpants low on her hips", setting: "in her kitchen" },

  // Mirror selfies — semi-clothed/bare
  { outfit: "bare breasts with only black lace panties on", setting: "in front of a full-length bedroom mirror" },
  { outfit: "topless biting the strap of a tiny bralette pulled down", setting: "on a kitchen counter" },
  { outfit: "topless with arms crossed under her bare breasts pushing them up", setting: "by a sunlit bedroom window" },
  { outfit: "topless wearing only fishnet stockings", setting: "in front of a bedroom mirror" },
  { outfit: "fully nude squatting low for a mirror selfie", setting: "in a small bathroom" },
  { outfit: "topless with a tight t-shirt half pulled up over her chest", setting: "in front of a bathroom mirror" },
  { outfit: "topless in only black panties", setting: "in front of a bedroom mirror" },
  { outfit: "topless in only white lace panties", setting: "in her bedroom" },

  // Gym / sweat
  { outfit: "topless and slightly sweaty", setting: "in a small home gym" },
  { outfit: "sports bra pulled up exposing her bare chest", setting: "in a home gym" },
  { outfit: "topless after a workout", setting: "in a home gym" },

  // Outdoor / balcony / window
  { outfit: "topless leaning out from a half-open robe", setting: "on a private balcony at sunrise" },
  { outfit: "fully nude with a thin scarf over one shoulder only", setting: "in front of an open window with a sheer curtain" },
  { outfit: "fully topless wearing only short denim cutoffs", setting: "in a private garden at golden hour" },
  { outfit: "open silk robe falling off both shoulders", setting: "on a private balcony at dawn" },

  // Positions / poses
  { outfit: "topless leaning forward, chest hanging heavy toward the camera", setting: "kneeling on the bed" },
  { outfit: "topless and stretching her arms above her head", setting: "by an open bedroom window" },
  { outfit: "topless brushing her long hair", setting: "at a vanity table" },
  { outfit: "topless applying lotion to her chest with one hand", setting: "on the edge of her bed" },
  { outfit: "fully nude on her back, arm over her eyes", setting: "in a sunlit bed" },
  { outfit: "topless and laughing", setting: "on her bed" },
];

// ---------- ANGLES ----------
const ANGLES = [
  "extreme close up centered on her chest with her face only half visible at the top",
  "low angle phone selfie taken from below pointing up at her face and chest",
  "top down POV looking straight down at her chest and stomach, phone held above her face",
  "side profile shot from her right showing her chest in clean side view",
  "side profile shot from her left with the camera slightly tilted diagonally",
  "very close up of just her lips and chest with the rest of her face out of frame",
  "mirror selfie from waist up with her face partially obscured by the phone",
  "over the shoulder shot showing her back and the side curve of her chest",
  "badly framed accidental selfie cutting the top of her head and one shoulder",
  "ultra wide phone selfie distorting her perspective with chest in the foreground",
  "candid shot from far away across the room with her chest still as the focal point",
  "POV with the camera held very close to her collarbone looking down her shirt",
  "low angle from her feet looking up her body, breasts in the foreground heavy",
  "tight headshot mostly her face with just the top of her cleavage in frame",
  "fisheye-like distortion close up making her breasts look exaggeratedly large in the foreground",
  "phone held at hip level pointing up at her chest, head cropped off",
  "behind-the-shoulder mirror selfie showing her back and a sliver of her side chest",
  "selfie taken with the phone pressed against the bathroom mirror, chest in foreground",
  "candid blurry shot mid-motion as she reaches for the phone",
  "phone left propped up across the room catching her by accident in passing",
  "ultra-close macro of her cleavage and a single drop of water on her skin",
  "phone held in her teeth, hands free, chest pushed forward to fit her face into frame",
  "selfie taken with the phone above her head looking down, chest centered in frame",
  "wide environmental shot showing the entire room with her tiny in the corner, chest still readable",
  "selfie with the phone hovering inches from one breast, the other half out of frame",
  "tilted dutch-angle shot with one corner higher than the other",
  "back-camera shot held low pointing back at her, feet and chest in frame",
  "rear-view mirror selfie inside a parked car at night",
  "bathroom-mirror full-body selfie with the phone deliberately covering her face",
  "candid shot taken by a friend off to the side mid-laugh",
];

// ---------- POSES (chest emphasis) ----------
const POSES_SFW = [
  "deep cleavage pressed together as she leans forward",
  "her arms crossed underneath her chest pushing her breasts up",
  "one hand absentmindedly resting under her breasts",
  "she is biting her lower lip while pushing her chest forward",
  "her free hand pulling her top lower to expose more cleavage",
  "her breasts hanging heavy in the fabric, slightly spilling sideways",
  "she is squeezing her breasts together with the inside of her arms",
  "her shoulder slightly turned so her chest takes most of the frame",
  "she is stretching her arms above her head making the fabric ride up",
  "she is laughing and her breasts are slightly bouncing mid-motion",
  "she is leaning sideways against a wall, chest pushed forward",
  "she is mid-yawn with her arms behind her head, chest fully exposed by the pose",
  "her hand inside the open neckline of her top resting on her chest",
  "she is twisting her torso to one side so her chest pushes against the fabric",
  "she is sliding one strap of her top down her shoulder while biting her lip",
  "her arms hugging her own waist pushing her chest up tight",
  "she is mid-breath with her chest expanded and pushing against the top",
  "she is leaning over a counter, chest pressing on the surface flattening sideways",
  "she is on tiptoes reaching for something high, chest pulled tight by the motion",
  "she is winking at the camera, chest leaning toward the lens",
  "she is cradling a coffee mug between her chest, breasts compressed around it",
  "she is tucking a strand of hair behind her ear, chest cocked forward",
  "she is bending over to pick up something, chest hanging into frame",
  "she is sitting cross-legged with her chest resting on her crossed arms",
  "she is pulling the bottom of her top up exposing her stomach, chest framed by fabric",
  "she is mid-step with her chest visibly bouncing in motion",
  "she is squishing her chest between both upper arms in a self-hug",
  "she is twisting her head to one side, ponytail flicking, chest tilted",
];

const POSES_NSFW = [
  "she is squeezing her bare breasts together with both hands",
  "her bare breasts hanging heavy and slightly spilling between her arms",
  "she is biting her lower lip while pushing her bare chest forward",
  "her crossed forearms pressing under her bare breasts pushing them way up",
  "she is leaning forward so her bare breasts hang into the camera",
  "one bare breast is partially covered by her hair, the other fully visible",
  "she is cupping just one bare breast while looking down at it",
  "she is licking her own finger as her bare chest is fully exposed",
  "she is pressing her bare chest against a cold surface flattening her breasts",
  "she is mid-laugh with her bare breasts bouncing visibly",
  "she is arching her back deeply making her bare breasts point upward",
  "she is sliding a strap off her shoulder slowly, bare chest only half exposed",
  "she is on her hands and knees with her bare breasts hanging straight down full",
  "she is stretching her arms over her head, bare chest pulled tight and lifted",
  "she is tracing her bare nipple with one finger, the other hand holding the phone",
  "she is mid-yawn with bare chest fully exposed and arched back",
  "she is twisting her body so one bare breast is in profile and the other dimly lit",
  "she is leaning forward over a counter with her bare chest spilling onto the surface",
  "she is biting her lip while one bare breast is partly lifted by her hand",
  "she is on her back with arms above her head, bare breasts spilling sideways",
  "she is sliding a panty strap off her hip with her bare chest in foreground",
  "she is laughing softly while her bare breasts shake from the motion",
  "she is tugging at the elastic of her panties exposing more skin, bare chest forward",
  "she is hugging her own waist with both arms, lifting bare chest tight together",
  "she is brushing her bare nipples lightly with the back of her fingers",
  "she is crouched down with her bare breasts hanging between her arms",
  "she is twisting one nipple gently between thumb and finger, the other breast bare and free",
  "she is mid-step with bare chest visibly bouncing in motion",
];

// ---------- LIGHTINGS ----------
const LIGHTINGS = [
  "warm evening tungsten light from a bedside lamp",
  "cold blue neon overhead light from a bathroom fixture",
  "soft natural morning light coming through sheer curtains",
  "harsh phone flash directly on her skin",
  "golden hour orange sunlight on her chest from a window",
  "dim blue glow from a TV or laptop screen",
  "mixed orange-and-blue light from a window and a lamp",
  "low warm candlelight",
  "fluorescent flickering overhead light from a parking garage",
  "fridge interior light spilling sideways across her body",
  "overhead lighting from a single bare bulb",
  "filtered light through a foggy bathroom",
  "city neon signs reflecting in the window onto her face",
  "single shaft of sunlight through closed blinds striping her chest",
  "screen-only lighting from her own phone screen lighting her face from below",
  "moonlight through the curtains falling on her chest",
  "soft pink light from a string of fairy lights around the bed",
  "amber light from a streetlamp through the window at night",
  "harsh white salon light from above",
  "diffused overcast daylight, no shadows, slightly gray",
  "uneven uplight from a candle flickering on the floor",
  "underexposed bedroom with one small lamp on the floor",
];

// ---------- STYLE MODIFIERS ----------
const STYLE_MODS = [
  "slight motion blur on her arm",
  "grainy black and white photo",
  "very out of focus background with sharp chest in foreground",
  "candid mid-blink shot",
  "slightly underexposed with crushed shadows",
  "high ISO grain visible everywhere",
  "deep saturated colors",
  "muted desaturated colors",
  "harsh contrast like a phone in low light",
  "slight chromatic aberration on the edges",
  "lens fingerprint smudge softening the corners",
  "phone-flash overexposed in the chest area",
  "tilted horizon, looks like a hurried snap",
  "raw unedited iPhone photo, no filter",
  "slight greenish tint typical of cheap phone cameras",
  "soft halation around the brightest light source",
  "minor light flare from a window catching the lens",
];

// ---------- VIDEO MICRO-BEATS ----------
// Wan 2.2 prefers VERY simple English imperatives. We aim for one short
// sentence describing chest motion + one short consequence sentence. The
// model interprets long descriptive prompts poorly and tends to ignore them
// or freeze the subject. Format reference: "The woman squeezes her large
// breasts with her hands. Her breasts look bigger and bounce."
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
  "The woman waves at the camera. Her breasts bounce as she moves.",
  "The woman drops her shoulders. Her breasts fall heavy and settle.",
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
  "The woman traces her bare nipple with one finger. Her bare breasts move slightly.",
];

// ---------- helpers ----------
const fs = require('fs');
const path = require('path');

// Persistent usage history so successive batches don't keep tripping over the
// same SCENE_BUNDLE (outfit + setting). Each call increments the count for
// each bundle picked. Bundles with the lowest count are always preferred —
// only after all 60 bundles have been used once does the picker start a
// second pass. This eliminates near-duplicate images across batches.
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

// Pick `n` items from `arr`, preferring those with the lowest usage count.
// `getCount(item)` returns the current count. Items with the same count are
// shuffled with Fisher-Yates so successive batches don't always replay the
// same order at a given level.
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

// Light style notes inspired by the user's reference selfies. Kept SHORT and
// generic — only ORTHOGONAL modifiers (B&W, mirror-shot, glasses, plain) so
// they never conflict with the bundle's setting/outfit. Lighting / time-of-day
// notes were removed because they clashed with bundle specifics (e.g. "sun-
// flare outdoors" + "in her bedroom").
const STYLE_NOTES_SFW = [
  "Black and white photo.",
  "Black and white photo.",
  "Black and white photo.",
  "Mirror selfie holding the phone in front of her face.",
  "Mirror selfie holding the phone in front of her face.",
  "Front-facing phone selfie at arm's length.",
  "Slightly tilted candid phone selfie.",
  "She is wearing thin round glasses.",
  "", "", "",
];
const STYLE_NOTES_NSFW = [
  "Black and white photo.",
  "Black and white photo.",
  "Black and white photo.",
  "Mirror selfie holding the phone in front of her face.",
  "Front-facing phone selfie at arm's length.",
  "She is wearing thin round glasses.",
  "", "", "",
];

function composeSfwScene(bundle) {
  return {
    label: `${bundle.outfit}, ${bundle.setting}`,
    note: pick(STYLE_NOTES_SFW),
    video: pick(VIDEO_BEATS_SFW),
  };
}
function composeNsfwScene(bundle) {
  return {
    label: `${bundle.outfit}, ${bundle.setting}`,
    note: pick(STYLE_NOTES_NSFW),
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

// `dressedStart` and `coquinStart` let the caller anchor the numbering past
// existing files so that successive batches never overwrite each other.
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

  // Persist updated usage counts so the next batch sees these as "used".
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
