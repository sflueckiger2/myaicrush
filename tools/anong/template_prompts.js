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
const SFW_BUNDLES = [
  // Bedroom — pyjamas / sleepwear
  { outfit: "thin gray spaghetti tank top with no bra and tiny pyjama shorts", setting: "lying on her unmade bed with rumpled white sheets" },
  { outfit: "oversized faded band t-shirt and no bra, hair messy", setting: "sitting on her unmade bed at night with phone charger cables tangled in the sheets" },
  { outfit: "matching pink cotton pyjama set with the buttons of the top half undone", setting: "kneeling on her bed in soft morning light through curtains" },
  { outfit: "tiny silk slip pyjama set with one strap fallen off her shoulder", setting: "in her dim bedroom by a bedside lamp at 2 a.m." },
  { outfit: "white cotton tank top tucked into pink plaid pyjama pants, no bra", setting: "leaning against the bedroom doorway with a coffee mug" },
  { outfit: "oversized boyfriend t-shirt without anything else underneath", setting: "on her unmade bed reaching for her phone on the nightstand" },
  { outfit: "tight ribbed cropped tank top and tiny shorts barely covering anything", setting: "sitting cross-legged on her bed scrolling on her phone" },
  { outfit: "loose faded blue oversized tee and no bra, knees up", setting: "on the floor next to her bed with laundry piled around" },
  { outfit: "thin strappy black babydoll slip with adjustable straps slipping off", setting: "standing at the foot of her bed in front of a wardrobe mirror" },
  { outfit: "thin cotton white tank top, no bra, cleavage soaked from a glass of water she just spilled", setting: "in her kitchenette at the edge of her studio bedroom" },

  // Bedroom — getting dressed / mirror
  { outfit: "tight low cut blue summer dress with thin straps", setting: "leaning over a messy bedroom dresser in front of a smudged mirror" },
  { outfit: "low-cut black satin slip dress with delicate straps", setting: "in a hotel room at night by the unmade king bed" },
  { outfit: "deep V-neck red knit sweater dress hugging her body", setting: "standing in front of a fireplace in a wood-paneled living room" },
  { outfit: "tight ribbed beige bodysuit unsnapped at the shoulder", setting: "in a tiny apartment elevator with mirror walls" },
  { outfit: "tiny black tube top pulled low and short denim skirt", setting: "in a cluttered college dorm room next to a desk full of books" },
  { outfit: "navy school-style cardigan unbuttoned over a tight white tank", setting: "sitting on a windowsill in a small library at sunset" },
  { outfit: "tight strapless black bandeau top and high-waist jeans", setting: "in front of a full-length bedroom mirror taking a phone selfie" },
  { outfit: "loose cropped sweatshirt that barely fits her chest", setting: "trying on outfits in front of an open closet, clothes strewn on the bed" },

  // Bathroom — towel / steam / mirror
  { outfit: "fluffy oversized bath towel barely wrapped under her chest", setting: "in a foggy bathroom with the mirror covered in condensation" },
  { outfit: "wet white tank top clinging to every curve over no bra", setting: "stepping out of a hot shower with the bathroom still steamy" },
  { outfit: "small white towel barely held up across her chest", setting: "leaning over the bathroom sink brushing her teeth" },
  { outfit: "a wet pink robe slipping open at the chest", setting: "sitting on the edge of the porcelain bathtub steam still rising" },
  { outfit: "dripping wet sports bra and panties", setting: "stepping out of the shower onto the bath mat with her hair plastered to her shoulders" },
  { outfit: "white ribbed crop top stretched tight with no bra and visible nipple shape", setting: "sitting on the edge of a porcelain bathtub with steam rising" },
  { outfit: "knotted men's button-up shirt slightly damp from steam", setting: "wiping the bathroom mirror clear with the back of her hand" },

  // Living room — couch / floor / window
  { outfit: "oversized cream knit pullover slipping off both shoulders down to her bra straps", setting: "curled sideways on a soft beige couch with a half-finished cup of coffee" },
  { outfit: "soft pink hoodie unzipped halfway with no bra", setting: "in the back seat of a car at night, city lights through the window" },
  { outfit: "loose unbuttoned olive cargo shirt over a black bralette", setting: "leaning on a graffiti-tagged concrete wall in a parking garage at night" },
  { outfit: "thin strappy white camisole with the lace edge of a bra peeking out", setting: "sprawled on the living room rug with a laptop open" },
  { outfit: "fitted black turtleneck cropped just above the navel", setting: "standing by the living room window at golden hour with city skyline behind" },
  { outfit: "loose oversized pastel knit cardigan worn with nothing underneath", setting: "sitting cross-legged on a sheepskin rug with a cup of tea" },
  { outfit: "white ribbed tank top tucked into baggy gray sweatpants riding low", setting: "leaning over the kitchen island reaching for a cookie jar" },
  { outfit: "tiny black tube top with a fitted leather mini skirt", setting: "on a balcony at night with a cigarette and a glass of wine" },

  // Kitchen / dining
  { outfit: "tight black sports bra and high-waist leggings", setting: "standing in a dim kitchen at night drinking from a water bottle" },
  { outfit: "oversized white men's button-up shirt half-tucked with no pants", setting: "barefoot in a sunlit kitchen pouring coffee" },
  { outfit: "tiny apron tied at the waist over a thin cotton top with no bra", setting: "leaning over the kitchen counter chopping fruit" },
  { outfit: "tight black bralette and high-waist jeans, sleeves rolled up", setting: "loading a dishwasher in a sunlit kitchen" },

  // Outdoor / car / urban
  { outfit: "tight white t-shirt slightly cropped over low-rise blue jeans", setting: "sitting on the hood of a small parked car in a beach parking lot" },
  { outfit: "tiny string bikini top under an unbuttoned beach shirt", setting: "on a balcony overlooking the ocean at sunrise" },
  { outfit: "oversized white linen shirt fully unbuttoned over a beige bikini top", setting: "leaning on the railing of a wooden seaside balcony at golden hour" },
  { outfit: "tight blue denim shorts and a knotted plaid shirt over a white tank", setting: "sitting on the curb in a quiet neighborhood at dusk" },
  { outfit: "fitted khaki utility shorts and a tight white ribbed tank top", setting: "leaning into the open trunk of a hatchback car packing groceries" },
  { outfit: "ripped low-rise jeans and a tight black crop top with thin straps", setting: "sitting cross-legged on a metro platform bench late at night" },
  { outfit: "fitted leather mini skirt and a thin sheer tank top with a black bra showing", setting: "leaning against a brick wall in a graffitied alley at night" },
  { outfit: "high-waist white denim shorts and a fitted blue cropped tee", setting: "in front of a small corner shop holding a paper bag of groceries" },
  { outfit: "tight beige athletic dress with a built-in bra, hair in a high ponytail", setting: "leaning against the open door of an SUV in a sunlit parking lot" },
  { outfit: "small white sundress with thin straps and tan legs", setting: "barefoot on the warm tile of a sun-bleached terrace overlooking the sea" },
  { outfit: "thin black wrap top showing a lot of cleavage and a long flowy skirt", setting: "sitting on a bench at a quiet park at golden hour" },

  // Gym / yoga
  { outfit: "thin cropped black hoodie pulled up baring her stomach with no bra", setting: "in a small home gym surrounded by yoga mats" },
  { outfit: "tight neon sports bra and matching tight shorts, slightly sweaty", setting: "leaning against a yoga ball in a small home gym" },
  { outfit: "thin strappy gray gym tank top and tiny black bike shorts", setting: "sitting on a yoga mat with a dumbbell beside her" },
  { outfit: "tight pink sports bra under an open zipped athletic jacket", setting: "stretching by a window in a sunlit empty gym" },

  // Mirror selfies / dressing
  { outfit: "tight ribbed white tank top with no bra and visible nipples", setting: "in front of a full-length bedroom mirror with the phone partially blocking her face" },
  { outfit: "tiny black bikini top tied at the front with bottoms riding low", setting: "in a fitting room of a clothing store with mirrors on three sides" },
  { outfit: "soft cotton boxer shorts and a thin tight white t-shirt with no bra", setting: "in front of a bathroom mirror brushing out her wet hair" },
  { outfit: "fitted knotted plaid shirt and high-waist jean shorts", setting: "leaning forward over a bathroom counter applying lip balm" },
  { outfit: "thin tight tan camisole with delicate lace trim", setting: "in front of a wardrobe mirror trying on different earrings" },

  // Office / professional but inappropriately tight
  { outfit: "fitted white blouse with the top three buttons undone over a tiny black bra", setting: "leaning over a cluttered home office desk with papers everywhere" },
  { outfit: "tight black pencil skirt and a thin cream silk blouse half-tucked", setting: "in front of a tall office window with the city behind her" },
  { outfit: "tight gray turtleneck dress with sleeves pushed up", setting: "leaning on the back of a leather office chair in a dim study" },

  // Misc / specific scenarios
  { outfit: "see-through white linen shirt fully unbuttoned over a tiny black bra", setting: "on a wooden balcony at golden hour with vines behind her" },
  { outfit: "loose oversized purple sweater with one shoulder slipping completely off", setting: "sitting on the kitchen floor leaning against a cabinet eating cereal" },
  { outfit: "fitted white ribbed long-sleeve top and tight beige leggings", setting: "in a quiet hallway of an apartment building waiting by the elevator" },
  { outfit: "thin spaghetti-strap silk camisole and tiny matching shorts", setting: "in a small kitchen at 3 a.m. with the fridge open lighting her face" },
  { outfit: "tight black ribbed bodysuit and an open denim jacket on her shoulders", setting: "in the back seat of an Uber at night, neon city lights moving outside" },
  { outfit: "white halter top with a deep open back and tight low-rise jeans", setting: "leaning over a railing in a small rooftop garden at night" },
];

const NSFW_BUNDLES = [
  // Bedroom — bare on bed
  { outfit: "topless covering her bare breasts with her crossed forearms underneath pushing them up", setting: "kneeling on a messy unmade bed in dim warm light" },
  { outfit: "topless with the bedsheet pulled down to her waist", setting: "lying back on white sheets just after waking up" },
  { outfit: "completely topless lying on her stomach with her arms crossed under her chin", setting: "on her unmade bed with morning sunlight on her bare back" },
  { outfit: "topless and squeezing her bare breasts together with both hands", setting: "in front of a bedroom mirror in dim warm bedside light" },
  { outfit: "topless wearing only loose pyjama bottoms riding low on her hips", setting: "in her dark bedroom lit only by the blue glow of a laptop" },
  { outfit: "topless with hair wet and dripping down her chest", setting: "wrapped in a half-open bathrobe in a steamy bathroom" },
  { outfit: "completely nude with only a thin chain necklace", setting: "wrapped in white sheets on a hotel bed at sunrise" },
  { outfit: "topless covering her bare breasts with one hand, the other holding the phone", setting: "selfie in front of a bedroom mirror at golden hour" },
  { outfit: "topless wearing only mismatched white cotton panties", setting: "sitting cross-legged on her unmade bed eating cereal at midnight" },
  { outfit: "completely nude under a thin white sheet that has slipped off her chest", setting: "lying on her side on a hotel bed with the curtains drawn" },
  { outfit: "topless on her back with one knee up and her bare chest fully exposed", setting: "sprawled across the duvet in soft afternoon light" },
  { outfit: "topless with a white sheet wrapped around her hips only", setting: "sitting on the edge of the bed putting on socks" },

  // Bathroom — wet, mirror, post-shower
  { outfit: "open unbuttoned oversized white shirt with absolutely nothing underneath", setting: "in front of a steamy bathroom mirror after a shower" },
  { outfit: "wet bare chest with water dripping down her body", setting: "leaning forward against the glass of a steamy shower" },
  { outfit: "soaked white bra clinging to her nipples, the rest of her body wet", setting: "stepping out of a bath with bubbles still on her skin" },
  { outfit: "completely wet and topless with her hair slicked back", setting: "standing under a hot shower head with water cascading down her chest" },
  { outfit: "topless wearing only black string panties soaked from a shower", setting: "leaning against a bathroom sink in a foggy mirror behind her" },
  { outfit: "fully nude wrapped in a small towel that has fallen down to her hips", setting: "wiping the bathroom mirror with her hand to take a selfie" },
  { outfit: "wet bare breasts pressed against the glass shower door from inside", setting: "in a steamy walk-in shower with hot water running" },
  { outfit: "topless with her hair tied up in a towel turban after a bath", setting: "sitting on the bathroom counter with her bare feet on the cold tile" },
  { outfit: "completely topless after a bath, soap suds still on her chest", setting: "wrapped in a small white towel only around her hips" },

  // Living room / floor / couch — bare
  { outfit: "long silk robe completely open at the front showing her full bare chest", setting: "sitting on the floor against a tall living room window" },
  { outfit: "loose cardigan slipped completely off both shoulders, fully topless", setting: "sitting cross-legged on a beige couch in soft afternoon light" },
  { outfit: "topless and sucking softly on her own finger", setting: "lying on her stomach on a soft white rug in front of a fireplace" },
  { outfit: "completely nude on her stomach reading a book", setting: "stretched out on a sheepskin rug in front of a lit fireplace" },
  { outfit: "topless wearing only thin gold chains on her hips", setting: "sitting on the living room floor leaning against the couch" },
  { outfit: "fully nude with one leg up on the couch", setting: "in a sunlit minimalist living room with sheer curtains" },
  { outfit: "open unbuttoned cardigan with absolutely nothing underneath", setting: "curled up on the couch with a blanket halfway covering her" },
  { outfit: "topless with a denim jacket slipping off both shoulders showing her chest", setting: "sitting cross-legged on the rug with city lights through the window" },

  // Kitchen / domestic — bare
  { outfit: "topless wearing only an unbuttoned denim mini skirt", setting: "in a sunlit kitchen leaning against the counter" },
  { outfit: "topless with a small kitchen apron tied at the waist barely covering her chest from the side", setting: "leaning over the stove cooking pasta" },
  { outfit: "completely nude with a small dish towel barely held over her chest", setting: "leaning into the open fridge looking for something to eat" },
  { outfit: "topless wearing only short white socks", setting: "sitting on the kitchen counter eating yogurt with a spoon" },
  { outfit: "topless wearing only loose gray sweatpants riding very low on her hips", setting: "leaning over a kitchen island reaching for the salt shaker" },

  // Mirror selfies — semi-clothed/bare
  { outfit: "bare breasts with only black lace panties on", setting: "in front of a full-length bedroom mirror at night" },
  { outfit: "topless and pulling a t-shirt up over her head, bare breasts exposed", setting: "in a small messy laundry room with clothes piled around" },
  { outfit: "topless and biting the strap of a tiny bralette pulled down", setting: "sitting on the kitchen counter with bare feet" },
  { outfit: "topless with both arms crossed under her bare breasts pushing them way up", setting: "standing barefoot by a sunlit bedroom window" },
  { outfit: "topless wearing only fishnet stockings and high heels", setting: "in front of a wardrobe mirror in a dim bedroom" },
  { outfit: "fully nude squatting in front of a low mirror selfie", setting: "in a small bathroom with the lights low" },
  { outfit: "topless trying on a tight new t-shirt that won't fit over her chest", setting: "in a fitting room with the curtain half-closed" },

  // Gym / sweat
  { outfit: "topless body covered in a sheen of sweat", setting: "in a tiny home gym after a workout, towel around her neck" },
  { outfit: "sports bra pulled up to her collarbone exposing her bare chest, sweaty", setting: "sitting on the bench of a small home gym after a set" },
  { outfit: "topless drinking from a water bottle, hair wet with sweat", setting: "leaning against a wall mirror in a small gym after running on the treadmill" },

  // Outdoor / balcony / window
  { outfit: "topless leaning out from a half-open robe in the open air", setting: "on a private balcony overlooking the rooftops at sunrise" },
  { outfit: "completely nude with a thin scarf draped over one shoulder only", setting: "in front of an open window with a sheer curtain blowing inward" },
  { outfit: "fully topless wearing only short denim cutoffs", setting: "in a private garden hammock at golden hour" },
  { outfit: "open unbuttoned silk robe falling completely off both shoulders", setting: "stepping out onto a private hotel balcony at dawn" },

  // Specific positions / actions
  { outfit: "topless leaning forward chest hanging heavy and full toward the camera", setting: "kneeling on the bed in dim warm light" },
  { outfit: "topless and stretching her arms above her head", setting: "in front of an open window in the morning sun" },
  { outfit: "topless and putting on a pair of earrings, bare chest fully exposed", setting: "in front of a vanity table mirror at night" },
  { outfit: "topless and brushing her long hair", setting: "sitting at a vanity table with low warm lamp light" },
  { outfit: "topless and applying lotion to her chest with one hand", setting: "sitting on the edge of the bed in the morning sun" },
  { outfit: "fully nude on her back with her arm covering her eyes", setting: "in a sunlit hotel bed with white sheets twisted around her legs" },
  { outfit: "topless and trying to push her chest into a too-small bralette", setting: "in front of a wardrobe mirror with bras strewn on the bed" },
  { outfit: "topless and laughing while her chest bounces from the motion", setting: "sitting cross-legged on the bed with a friend's voice off-camera" },
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
// generic — no stacked modifiers. Each note is a single descriptor that gives
// the image a clear visual identity (B&W, soft daylight, mirror-shot, etc.).
const STYLE_NOTES_SFW = [
  "Black and white photo.",
  "Black and white photo.",
  "Black and white photo.",
  "Mirror selfie holding the phone in front of her face.",
  "Mirror selfie holding the phone in front of her face.",
  "Soft natural daylight from a window.",
  "Warm bedside lamp light at night.",
  "Sun-flare overexposed selfie outdoors.",
  "Front-facing phone selfie at arm's length.",
  "Slightly tilted candid phone selfie.",
  "She is wearing thin round glasses.",
  "", // plain — no extra style note
  "",
];
const STYLE_NOTES_NSFW = [
  "Black and white photo.",
  "Black and white photo.",
  "Black and white photo.",
  "Mirror selfie holding the phone in front of her face.",
  "Mirror selfie holding the phone in front of her face.",
  "Soft natural daylight from a window.",
  "Warm bedside lamp light at night.",
  "Front-facing phone selfie at arm's length.",
  "She is wearing thin round glasses.",
  "",
  "",
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
