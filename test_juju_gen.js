const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, 'public', 'images', 'test_juju');

const BASE_APPEARANCE = `low quality phone camera photo of a young European woman, 21 years old, caucasian, dark brown wavy medium-length hair sometimes in a messy bun sometimes loose, large oversized geometric octagonal gold-rimmed prescription glasses, fair skin with visible freckles and natural redness on cheeks and nose, visible pores and tiny blemishes and uneven skin tone, naturally full lips with subtle pink color, small silver earrings, naturally curvy soft body with full natural D-cup bust, soft round face with round cheeks, not angular not model-like, gentle soft jawline, natural light brown eyebrows slightly thick, bright green-hazel eyes, small nose, 167cm`;

const SUFFIX_V6 = `. Captured on cheap smartphone front camera, Samsung Galaxy. The photo is slightly soft and blurry — phone autofocus is imprecise. Visible digital noise grain in shadow areas. JPEG compression artifacts on edges. Warm yellowish color cast from indoor lighting. The skin is REAL UNEDITED UNRETOUCHED — visible pores on nose and cheeks, natural oily shine on T-zone, redness on cheeks and around nose, tiny pimple or blemish, peach fuzz visible on jawline, uneven skin tone with slightly darker under-eyes, NO beauty filter NO smoothing NO FaceTune. Overexposed highlights where light hits skin. The framing is imperfect — tilted, off-center, something cropped at edge. NOT a professional photo. A real girl snapped this in 2 seconds on her phone without thinking about it`;

const TESTS = [
  // --- REALISTIC VISION v6 (SD 1.5) ---
  {
    id: 57,
    model: 'rep:realistic-vision-v6',
    prompt: `RAW photo, (selfie:1.3), (front camera:1.2), young european woman, 21yo, dark brown wavy medium-length hair in messy bun with fabric scrunchie, large oversized geometric octagonal gold-rimmed prescription glasses, fair skin with visible freckles redness and pores, naturally curvy body with full natural bust, soft round face round cheeks, green-hazel eyes, small nose, mirror selfie in attic bedroom with slanted wooden plank ceiling, wearing light lavender-grey pleated chiffon mini dress with balloon sleeves and scoop neckline showing cleavage, pink bra strap visible, phone in decorative case, messy bedroom behind with pink sheets and stuffed animal, warm afternoon daylight from small window, 3/4 view looking at phone screen, (film grain:1.2), (Fujifilm XT3:1.1), (phone camera quality:1.3), slightly blurry, soft focus, warm color cast, JPEG artifacts, imperfect framing tilted`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, photoshop, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, ultra HD, masterpiece, perfect composition, symmetrical, flawless, porcelain skin, plastic skin`,
    label: 'RV6 lavender dress attic',
    guidance: 5.0,
    steps: 30,
    scheduler: 'DPMSolverMultistep',
    width: 512,
    height: 768
  },
  {
    id: 58,
    model: 'rep:realistic-vision-v6',
    prompt: `RAW photo, (selfie:1.3), (front camera:1.2), young european woman, 21yo, dark brown wavy hair loose past shoulders, large oversized geometric gold-rimmed glasses, fair skin with freckles and visible pores and redness on cheeks, naturally curvy, soft round face, green-hazel eyes, close-up front camera selfie only face and upper chest, wearing black off-shoulder ruffle crop top, leaning forward toward camera from above, warm indoor light, another person partially visible blurred at edge of frame, genuine warm smile showing teeth, candid party photo, (film grain:1.3), (phone camera:1.2), slightly out of focus, warm golden tones, noise in shadows, JPEG compression`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, photoshop, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, ultra HD, masterpiece, flawless, porcelain skin`,
    label: 'RV6 black top close-up',
    guidance: 5.0,
    steps: 30,
    scheduler: 'DPMSolverMultistep',
    width: 512,
    height: 768
  },
  {
    id: 59,
    model: 'rep:realistic-vision-v6',
    prompt: `RAW photo, (selfie:1.3), black and white, monochrome, high contrast, young european woman, 21yo, dark brown wavy hair loose, large geometric gold-rimmed glasses, fair skin with visible pores and blemishes, naturally curvy body with full bust, bathroom mirror selfie, small bathroom with wooden plank ceiling, wearing black lace push-up bra showing cleavage, phone in decorative case held up, pouty sultry expression lips pursed, bathroom counter with skincare products and glass, intimate private photo, hair falling over one shoulder, (film grain:1.4), (Instagram B&W filter:1.2), visible noise and grain throughout, soft focus`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, flawless, color, colorful`,
    label: 'RV6 B&W bathroom lingerie',
    guidance: 5.0,
    steps: 30,
    scheduler: 'DPMSolverMultistep',
    width: 512,
    height: 768
  },
  {
    id: 60,
    model: 'rep:realistic-vision-v6',
    prompt: `RAW photo, (selfie:1.3), (front camera:1.2), young european woman, 21yo, dark brown wavy hair in messy bun, large oversized geometric gold-rimmed glasses slightly smudged, fair skin with visible pores and natural redness, naturally curvy, soft round puffy face, green-hazel eyes, front camera selfie sitting on unmade bed in morning, wearing oversized washed-out grey t-shirt hanging off one shoulder, messy white sheets, she just woke up looking sleepy and puffy, arm extended holding phone from above, bedside lamp and charger on nightstand, morning light through thin curtains, warm yellow tint, (film grain:1.3), (phone camera:1.3), slightly blurry, noise in shadow areas, JPEG artifacts`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, flawless, porcelain skin, makeup`,
    label: 'RV6 morning bed wakeup',
    guidance: 5.0,
    steps: 30,
    scheduler: 'DPMSolverMultistep',
    width: 512,
    height: 768
  },
  {
    id: 61,
    model: 'rep:realistic-vision-v6',
    prompt: `RAW photo, (selfie:1.3), (front camera:1.2), young european woman, 21yo, dark brown wavy hair loose, large geometric gold-rimmed glasses, fair skin with freckles and pores and oily shine, naturally curvy, car passenger seat selfie, seatbelt across chest, wearing sage-green sundress with thin straps, sunglasses pushed up on head, messy bun with scrunchie, dirty windshield and dashboard visible, trees outside, bright daylight through window hitting face causing squint, casual half-smile, backlit hair golden halo, (film grain:1.2), (phone camera:1.3), slightly overexposed highlights, warm tones, noise, soft focus`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, flawless, porcelain skin`,
    label: 'RV6 car selfie',
    guidance: 5.0,
    steps: 30,
    scheduler: 'DPMSolverMultistep',
    width: 512,
    height: 768
  },

  // --- JUGGERNAUT XL v7 (SDXL) ---
  {
    id: 62,
    model: 'rep:juggernaut-xl',
    prompt: `RAW candid phone selfie, amateur photo, young european woman 21yo, dark brown wavy medium-length hair in messy bun with fabric scrunchie, large oversized geometric octagonal gold-rimmed prescription glasses, fair skin with visible freckles natural redness on cheeks and pores and tiny blemishes, naturally curvy soft body with full natural D-cup bust, soft round face with round cheeks, green-hazel eyes, mirror selfie in attic bedroom with slanted wooden plank ceiling and pine hardwood floor, wearing light lavender-grey pleated chiffon mini dress with balloon sleeves showing cleavage, pink bra strap visible, phone in decorative case, messy bedroom behind with pink sheets stuffed animal clothes on floor, warm afternoon daylight, 3/4 view, film grain, phone camera quality, slightly soft and blurry, warm color cast, imperfect framing`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, photoshop, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, ultra HD, masterpiece, perfect, flawless, porcelain, plastic`,
    label: 'JugXL lavender dress attic',
    guidance: 5.5,
    steps: 35,
    width: 832,
    height: 1216
  },
  {
    id: 63,
    model: 'rep:juggernaut-xl',
    prompt: `RAW candid phone selfie, amateur photo, young european woman 21yo, dark brown wavy hair loose past shoulders, large oversized geometric gold-rimmed glasses, fair skin with freckles visible pores redness on cheeks tiny blemishes, naturally curvy, soft round face, green-hazel eyes, close-up front camera selfie face and upper chest, wearing black off-shoulder ruffle crop top, leaning forward toward camera, warm indoor light from window behind, another person partially visible blurred at edge, genuine warm smile showing teeth, candid party gathering, film grain, phone camera quality, slightly out of focus, warm golden tones, digital noise`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, ultra HD, masterpiece, flawless, porcelain, plastic`,
    label: 'JugXL black top close-up',
    guidance: 5.5,
    steps: 35,
    width: 832,
    height: 1216
  },
  {
    id: 64,
    model: 'rep:juggernaut-xl',
    prompt: `RAW candid phone selfie, amateur photo, black and white, monochrome, high contrast, young european woman 21yo, dark brown wavy hair loose, large geometric gold-rimmed glasses, fair skin with visible pores blemishes, naturally curvy body with full bust, bathroom mirror selfie, small bathroom with wooden plank ceiling, wearing black lace push-up bra showing cleavage, phone in decorative case held up, pouty sultry expression, bathroom counter with products and glass, intimate private photo, visible film grain and noise throughout, Instagram B&W filter effect`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, retouched, beauty filter, professional photo, studio lighting, sharp focus, 4k, 8k, flawless, color, colorful, vibrant`,
    label: 'JugXL B&W bathroom lingerie',
    guidance: 5.5,
    steps: 35,
    width: 832,
    height: 1216
  },
  {
    id: 65,
    model: 'rep:juggernaut-xl',
    prompt: `RAW candid phone selfie, amateur photo, young european woman 21yo, dark brown wavy hair in messy bun, large oversized geometric gold-rimmed glasses slightly smudged, fair skin with visible pores natural redness puffy face, naturally curvy, green-hazel eyes, front camera selfie sitting on unmade bed morning, wearing oversized washed-out grey t-shirt off one shoulder, messy white sheets, just woke up sleepy puffy, arm extended holding phone from above, bedside lamp charger nightstand, morning light thin curtains, warm yellow tint, film grain, phone camera, slightly blurry, noise in shadows`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, flawless, porcelain, makeup, perfect hair`,
    label: 'JugXL morning bed wakeup',
    guidance: 5.5,
    steps: 35,
    width: 832,
    height: 1216
  },
  {
    id: 66,
    model: 'rep:juggernaut-xl',
    prompt: `RAW candid phone selfie, amateur photo, young european woman 21yo, dark brown wavy hair loose, large geometric gold-rimmed glasses, fair skin with freckles pores oily shine, naturally curvy, car passenger seat selfie, seatbelt across chest, wearing sage-green sundress thin straps, sunglasses pushed up on head, messy bun scrunchie, dirty windshield dashboard, trees outside, bright daylight through window causing squint, casual half-smile, backlit hair golden halo, film grain, phone camera quality, overexposed highlights, warm tones, digital noise, soft focus`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, flawless, porcelain, plastic`,
    label: 'JugXL car selfie',
    guidance: 5.5,
    steps: 35,
    width: 832,
    height: 1216
  },
];

// ACTIVE_TESTS set below after TESTS2
const SUFFIX_V4 = '';

const TESTS2 = [
  // --- CYBER-REALISTIC XL v5 ---
  {
    id: 67,
    model: 'rep:cyber-realistic-xl',
    prompt: `RAW candid phone selfie, amateur photo, young european woman 21yo, dark brown wavy medium-length hair in messy bun with fabric scrunchie, large oversized geometric octagonal gold-rimmed prescription glasses, fair skin with visible freckles natural redness on cheeks and pores and tiny blemishes, naturally curvy soft body with full natural D-cup bust, soft round face with round cheeks, green-hazel eyes, mirror selfie in attic bedroom with slanted wooden plank ceiling and pine hardwood floor, wearing light lavender-grey pleated chiffon mini dress with balloon sleeves showing cleavage, pink bra strap visible, phone in decorative case, messy bedroom behind with pink sheets stuffed animal clothes on floor, warm afternoon daylight, 3/4 view, film grain, phone camera quality, slightly soft and blurry, warm color cast, imperfect framing`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, photoshop, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, ultra HD, masterpiece, perfect, flawless, porcelain, plastic`,
    label: 'CyberXL lavender dress attic',
    guidance: 5.0,
    steps: 30,
    width: 832,
    height: 1216
  },
  {
    id: 68,
    model: 'rep:cyber-realistic-xl',
    prompt: `RAW candid phone selfie, amateur photo, young european woman 21yo, dark brown wavy hair loose past shoulders, large oversized geometric gold-rimmed glasses, fair skin with freckles visible pores redness on cheeks tiny blemishes, naturally curvy, soft round face, green-hazel eyes, close-up front camera selfie face and upper chest, wearing black off-shoulder ruffle crop top, leaning forward toward camera, warm indoor light from window behind, another person partially visible blurred at edge, genuine warm smile showing teeth, candid party gathering, film grain, phone camera quality, slightly out of focus, warm golden tones, digital noise`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, ultra HD, masterpiece, flawless, porcelain, plastic`,
    label: 'CyberXL black top close-up',
    guidance: 5.0,
    steps: 30,
    width: 832,
    height: 1216
  },
  {
    id: 69,
    model: 'rep:cyber-realistic-xl',
    prompt: `RAW candid phone selfie, amateur photo, black and white, monochrome, high contrast, young european woman 21yo, dark brown wavy hair loose, large geometric gold-rimmed glasses, fair skin with visible pores blemishes, naturally curvy body with full bust, close-up selfie from slightly above, wearing black lace bralette with scalloped edges showing cleavage, she looks up at camera with soft smile, natural window light from side creating shadows on face, wavy dark hair around shoulders, intimate private photo, visible film grain and noise, Instagram B&W filter`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, retouched, beauty filter, professional photo, studio lighting, sharp focus, 4k, 8k, flawless, color, colorful, vibrant`,
    label: 'CyberXL B&W bralette',
    guidance: 5.0,
    steps: 30,
    width: 832,
    height: 1216
  },
  {
    id: 70,
    model: 'rep:cyber-realistic-xl',
    prompt: `RAW candid phone selfie, amateur photo, young european woman 21yo, dark brown wavy hair in messy bun, large oversized geometric gold-rimmed glasses slightly smudged, fair skin with visible pores natural redness puffy face, naturally curvy, green-hazel eyes, front camera selfie sitting on unmade bed morning, wearing oversized washed-out grey t-shirt off one shoulder, messy white sheets, just woke up sleepy puffy, arm extended holding phone from above, bedside lamp charger nightstand, morning light thin curtains, warm yellow tint, film grain, phone camera, slightly blurry, noise in shadows`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, flawless, porcelain, makeup, perfect hair`,
    label: 'CyberXL morning bed wakeup',
    guidance: 5.0,
    steps: 30,
    width: 832,
    height: 1216
  },
  {
    id: 71,
    model: 'rep:cyber-realistic-xl',
    prompt: `RAW candid phone selfie, amateur photo, young european woman 21yo, dark brown wavy hair loose, large geometric gold-rimmed glasses, fair skin with freckles pores oily shine, naturally curvy, car passenger seat selfie, seatbelt across chest, wearing sage-green sundress thin straps, sunglasses pushed up on head, messy bun scrunchie, dirty windshield dashboard, trees outside, bright daylight through window causing squint, casual half-smile, backlit hair golden halo, film grain, phone camera quality, overexposed highlights, warm tones, digital noise, soft focus`,
    negative_prompt: `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, flawless, porcelain, plastic`,
    label: 'CyberXL car selfie',
    guidance: 5.0,
    steps: 30,
    width: 832,
    height: 1216
  },

  // --- LUMA PHOTON ---
  {
    id: 72,
    model: 'rep:luma-photon',
    prompt: `A raw candid phone selfie taken by a 21 year old European woman with dark brown wavy medium-length hair up in a messy bun with a fabric scrunchie, wearing large oversized geometric octagonal gold-rimmed prescription glasses. She has fair skin with visible freckles, natural redness on her cheeks and nose, visible pores and tiny blemishes. She is taking a mirror selfie in an attic bedroom with a slanted wooden plank ceiling and pine hardwood floor. She wears a light lavender-grey pleated chiffon mini dress with balloon sleeves and a scoop neckline, a pink bra strap visible on one shoulder. She holds her phone in a decorative case. Behind her is a messy bedroom with pink sheets, a stuffed animal, and clothes on the floor. Warm afternoon daylight comes from a small window. The photo has film grain, is slightly soft and blurry like a cheap phone camera, with warm color cast and imperfect tilted framing.`,
    label: 'Photon lavender dress attic',
    guidance: 3.5,
    steps: 30,
    width: 832,
    height: 1216
  },
  {
    id: 73,
    model: 'rep:luma-photon',
    prompt: `A raw candid phone selfie of a 21 year old European woman with dark brown wavy hair loose past her shoulders, wearing large oversized geometric gold-rimmed glasses. She has fair skin with freckles and visible pores and natural redness on her cheeks. She is naturally curvy with a soft round face. This is a close-up front camera selfie showing only her face and upper chest. She wears a black off-shoulder ruffle crop top and leans forward toward the camera from above. Warm indoor light from a window behind her. Another person is partially visible and blurred at the edge of the frame. She has a genuine warm smile showing teeth. The photo is candid and spontaneous at a party. It has film grain, is slightly out of focus, with warm golden tones and digital noise.`,
    label: 'Photon black top close-up',
    guidance: 3.5,
    steps: 30,
    width: 832,
    height: 1216
  },
  {
    id: 74,
    model: 'rep:luma-photon',
    prompt: `A black and white Instagram-filtered selfie of a 21 year old European woman with dark brown wavy hair loose, wearing large geometric gold-rimmed glasses. She has fair skin with visible pores and blemishes. She is naturally curvy with a full bust. Close-up selfie from slightly above, wearing a black lace bralette with scalloped edges showing cleavage. She looks up at the camera with a soft gentle smile. Natural window light from the side creates shadows on one side of her face. Her wavy dark hair falls around her shoulders. The image has visible film grain and noise throughout. Intimate boyfriend-sent-me-this vibe. Very close and personal. Black and white monochrome with high contrast.`,
    label: 'Photon B&W bralette',
    guidance: 3.5,
    steps: 30,
    width: 832,
    height: 1216
  },
  {
    id: 75,
    model: 'rep:luma-photon',
    prompt: `A raw candid phone selfie of a 21 year old European woman with dark brown wavy hair in a messy bun. She wears large oversized geometric gold-rimmed glasses that are slightly smudged. She has fair skin with visible pores, natural redness, and a puffy sleepy face. She is naturally curvy. She is sitting on an unmade bed in the morning, wearing an oversized washed-out grey t-shirt that hangs off one shoulder. The sheets are messy and white. She just woke up and looks sleepy and puffy. Her arm is extended holding the phone from above. There is a bedside lamp and phone charger on the nightstand. Warm morning light comes through thin curtains. The photo has a warm yellow tint, film grain, and is slightly blurry with noise in the shadows.`,
    label: 'Photon morning bed wakeup',
    guidance: 3.5,
    steps: 30,
    width: 832,
    height: 1216
  },
  {
    id: 76,
    model: 'rep:luma-photon',
    prompt: `A raw candid phone selfie of a 21 year old European woman with dark brown wavy hair in a messy bun with a scrunchie. She wears large geometric gold-rimmed glasses. She has fair skin with freckles, visible pores, and an oily shine. She is naturally curvy. She is in the passenger seat of a car, with the seatbelt across her chest, wearing a sage-green sundress with thin straps. Sunglasses are pushed up on her head. The dirty windshield and dashboard are visible. Trees are outside. Bright daylight through the window hits her face causing her to squint. She has a casual half-smile. Her backlit hair creates a golden halo. The photo has film grain, is slightly overexposed with warm tones and digital noise.`,
    label: 'Photon car selfie',
    guidance: 3.5,
    steps: 30,
    width: 832,
    height: 1216
  },
];
const RUN_TESTS = TESTS2;
const ACTIVE_TESTS = RUN_TESTS;
const SKIP_TESTS = [
  {
    id: 9921,
    model: 'rep:nsfw-flux-dev',
    prompt: `${BASE_APPEARANCE}. Mirror selfie in a cozy attic bedroom with slanted wooden plank ceiling and warm pine hardwood floor, wearing a light lavender-grey pleated chiffon mini dress with flowy puffed balloon sleeves and gathered scoop neckline, pink bra strap peeking out on one shoulder, phone held at chest level slightly covering her chin, standing in front of a full-length mirror leaning against the wall, the mirror reflection shows the real messy bedroom behind — a small bed with rumpled dusty pink sheets and a faded stuffed animal, shoes and clothes scattered on the old wooden floor, a small attic window letting in warm natural afternoon daylight. Her face is slightly turned to the side (3/4 view) looking at the phone screen, not directly posing. Glasses have slight glare from the window light. One loose hair strand falls across her cheek${SUFFIX_V4}`,
    label: 'V4 lavender dress attic (close to ref)',
    guidance: 2.5,
    steps: 28
  },
  {
    id: 22,
    model: 'rep:nsfw-flux-dev',
    prompt: `${BASE_APPEARANCE}. Front camera selfie sitting cross-legged on an unmade bed, wearing a washed-out oversized grey band t-shirt and mismatched socks, messy white sheets bunched around her, two flat pillows behind, a phone charger cable dangling off the nightstand, a half-empty glass of water and hair ties on the wooden nightstand, weak morning light filtering through thin IKEA curtains, her glasses are slightly crooked and smudged, she just woke up and looks slightly puffy-eyed, arm extended above holding phone creating slight wide-angle chin distortion, warm yellow tint from morning sun${SUFFIX_V4}`,
    label: 'V4 morning bed messy wakeup',
    guidance: 2.5,
    steps: 28
  },
  {
    id: 23,
    model: 'rep:nsfw-flux-dev',
    prompt: `${BASE_APPEARANCE}. Bathroom mirror selfie, small cramped European bathroom with old white tiles and yellowish grout, wearing a fitted ribbed white tank top under an open oversized vintage denim jacket, high-waisted light wash jeans, red lipstick just applied, the counter has an open makeup bag, a used cotton pad, a tube of mascara with the cap off, a pink toothbrush in a mug, harsh bright fluorescent overhead light casting unflattering shadows under her eyes and nose, phone held up in front of the spotty mirror with visible water spots, slight phone flash reflecting off the mirror creating a bright white circle near her hand, the bathroom door behind her is half-open showing a dark hallway${SUFFIX_V4}`,
    label: 'V4 bathroom harsh light',
    guidance: 2.5,
    steps: 28
  },
  {
    id: 24,
    model: 'rep:nsfw-flux-dev',
    prompt: `${BASE_APPEARANCE}. Sitting at a small round cafe table on a European sidewalk, wearing a chunky cream-colored oversized knit cardigan unbuttoned over a simple black cotton top, an iced coffee in a plastic cup on the marble table, a half-eaten pain au chocolat on a napkin, crumbs visible, her glasses catching the late afternoon sun creating a slight glare, other people and trees blurred behind her, she holds the phone in one hand taking a front camera selfie while the other hand rests on the coffee cup, genuine relaxed closed-mouth smile, a strand of hair has escaped her messy bun and hangs across her glasses${SUFFIX_V4}`,
    label: 'V4 cafe afternoon',
    guidance: 2.5,
    steps: 28
  },
  {
    id: 25,
    model: 'rep:nsfw-flux-dev',
    prompt: `${BASE_APPEARANCE}. Standing in a clothing store fitting room with white walls and a large mirror, fluorescent ceiling panel light, wearing a floral print wrap dress in cream with small blue flowers, she's pulling the fabric at the waist to show how it fits, other hand holding phone up for mirror selfie, her regular clothes and a canvas tote bag piled on the small wooden bench behind her, a price tag hangs from the dress near the waist, she makes a slightly uncertain pursed-lip expression like "should I get this?", the overhead light creates slight shadows under her eyes, the mirror has fingerprint smudges visible${SUFFIX_V4}`,
    label: 'V4 fitting room tryout',
    guidance: 2.5,
    steps: 28
  },
  {
    id: 26,
    model: 'rep:nsfw-flux-dev',
    prompt: `${BASE_APPEARANCE}. Car passenger seat, seatbelt crossing diagonally over her chest, wearing a sage-green linen sundress with thin straps, hair in messy bun with sunglasses pushed up on top, dashboard and dirty windshield visible, trees and parked cars outside, warm natural daylight flooding through the side window hitting her face and causing her to squint slightly, she holds phone with one hand taking a selfie, the other hand rests on the seatbelt, casual half-smile, some of her loose hair strands are backlit creating a golden halo effect, slight motion blur on the background because the car might be moving slowly${SUFFIX_V4}`,
    label: 'V4 car selfie squinting',
    guidance: 2.5,
    steps: 28
  },
  {
    id: 27,
    model: 'rep:nsfw-flux-dev',
    prompt: `${BASE_APPEARANCE}. Tight close-up front camera selfie in bed at night, lying on her side on a white pillowcase, only face and neck and shoulder visible, wearing a simple faded grey cotton sleep shirt, phone screen casting blue-white glow on the lower half of her face, a warm orange bedside lamp glowing behind her head creating a rim of warm light on her messy hair, the room is dark otherwise, her eyes are slightly squinted from the phone brightness, sleepy tired expression, lips slightly parted, glasses off resting on the pillow next to her face, loose messy hair fanned out on the pillow with strands across her forehead, strong visible noise and grain in all the dark shadow areas of the image${SUFFIX_V4}`,
    label: 'V4 night bed intimate phone glow',
    guidance: 2.2,
    steps: 28
  },
  {
    id: 28,
    model: 'rep:nsfw-flux-dev',
    prompt: `${BASE_APPEARANCE}. Full-body mirror selfie in a narrow apartment hallway, cheap full-length mirror leaning against the beige wall, wearing a cropped vintage graphic t-shirt (faded red print) and high-waisted light wash straight-leg mom jeans with white chunky platform sneakers, hallway behind her with a messy shoe rack, coat hooks with jackets hanging, a canvas tote bag on a hook, warm orange tungsten light from the adjacent bedroom casting warm tones on one side, her phone held at hip level angled slightly upward to capture the full outfit, she stands with weight shifted to one hip, head tilted, casual slight smile, part of the mirror frame is visible and slightly scratched${SUFFIX_V4}`,
    label: 'V4 hallway OOTD mirror',
    guidance: 2.5,
    steps: 28
  },
  {
    id: 29,
    model: 'rep:nsfw-flux-dev',
    prompt: `${BASE_APPEARANCE}. Couch selfie at home, lying on her side on a worn fabric couch with a knitted blanket half-draped over her legs, wearing an oversized dusty pink hoodie and grey cotton shorts, one arm extended holding phone above taking selfie from slightly above, the TV is on in the background casting blue light (screen blurred), a bowl of chips and a remote on the coffee table, warm evening lamp light from a floor lamp, she has a cozy relaxed expression with a soft smile, her glasses reflect the TV screen slightly, messy bun is half-falling apart with more loose strands than usual${SUFFIX_V4}`,
    label: 'V4 couch TV evening',
    guidance: 2.5,
    steps: 28
  },
  {
    id: 30,
    model: 'rep:nsfw-flux-dev',
    prompt: `${BASE_APPEARANCE}. Elevator mirror selfie, inside a small European apartment elevator with brushed metal walls and doors, wearing a fitted black spaghetti-strap mini dress with a denim jacket thrown over one shoulder, small black crossbody bag, red lipstick freshly applied, harsh unflattering fluorescent tube light from directly above casting hard shadows under her chin and eyes and nose, she holds the phone up in her right hand, her left hand does a peace sign, the metal elevator walls create multiple dim reflections, she's going out with friends and looks excited with a slight head tilt and cheeky grin${SUFFIX_V4}`,
    label: 'V4 elevator going out',
    guidance: 2.5,
    steps: 28
  },
];

async function generateImage(test) {
  console.log(`\n[Test ${test.id}] ${test.label} [model: ${test.model}]`);
  console.log(`Generating...`);
  
  const startTime = Date.now();
  let url;

  if (test.model === 'fal:flux2-dev') {
    const falRes = await fetch(`${BASE_URL}/api/fal/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: {
          _falEndpoint: 'fal-ai/flux-2/lora',
          prompt: test.prompt,
          guidance_scale: test.guidance || 3.0,
          num_inference_steps: test.steps || 28,
          image_size: { width: 832, height: 1216 },
          num_images: 1,
          output_format: 'jpeg',
          enable_safety_checker: false
        }
      })
    });
    const data = await falRes.json();
    if (data.error || data.detail) {
      console.log(`  ERROR (fal): ${data.error || data.detail}`);
      return null;
    }
    url = data.images?.[0]?.url;
    if (!url) {
      console.log(`  ERROR: No URL in fal response: ${JSON.stringify(data).substring(0, 300)}`);
      return null;
    }
  } else if (test.model === 'rep:realistic-vision-v6') {
    const replicateRes = await fetch(`${BASE_URL}/api/replicate/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 'fa61c3351b7fe2fe2497082fb459168e88ff1b66c845f12bfdaaa4f2139f6a9a',
        input: {
          prompt: test.prompt,
          negative_prompt: test.negative_prompt || '',
          width: test.width || 512,
          height: test.height || 768,
          num_inference_steps: test.steps || 30,
          guidance_scale: test.guidance || 5.0,
          scheduler: test.scheduler || 'DPMSolverMultistep',
          seed: 0,
          disable_safety_checker: true
        }
      })
    });
    const data = await replicateRes.json();
    console.log(`  [RV6 debug] status=${data.status}, output type=${typeof data.output}, isArray=${Array.isArray(data.output)}, raw=${JSON.stringify(data.output).substring(0,200)}`);
    if (data.error || data.status === 'failed') {
      console.log(`  ERROR: ${data.error || JSON.stringify(data).substring(0, 300)}`);
      return null;
    }
    url = Array.isArray(data.output) ? data.output[0] : data.output;
    if (!url) {
      console.log(`  ERROR: No URL in response: ${JSON.stringify(data).substring(0, 300)}`);
      return null;
    }
  } else if (test.model === 'rep:juggernaut-xl') {
    const replicateRes = await fetch(`${BASE_URL}/api/replicate/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: '6a52feace43ce1f6bbc2cdabfc68423cb2319d7444a1a1dae529c5e88b976382',
        input: {
          prompt: test.prompt,
          negative_prompt: test.negative_prompt || '',
          width: test.width || 832,
          height: test.height || 1216,
          num_inference_steps: test.steps || 35,
          guidance_scale: test.guidance || 5.5,
          seed: 0,
          num_outputs: 1
        }
      })
    });
    const data = await replicateRes.json();
    if (data.error || data.status === 'failed') {
      console.log(`  ERROR: ${data.error || JSON.stringify(data).substring(0, 300)}`);
      return null;
    }
    url = Array.isArray(data.output) ? data.output[0] : data.output;
    if (!url) {
      console.log(`  ERROR: No URL in response: ${JSON.stringify(data).substring(0, 300)}`);
      return null;
    }
  } else if (test.model === 'rep:cyber-realistic-xl') {
    const replicateRes = await fetch(`${BASE_URL}/api/replicate/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 'e59f794af91478fd535883feeec0cc554851be615e0ff12db25c076bef06b0ab',
        input: {
          prompt: test.prompt,
          negative_prompt: test.negative_prompt || '',
          width: test.width || 832,
          height: test.height || 1216,
          steps: test.steps || 30,
          cfg_scale: test.guidance || 5.0,
          scheduler: 'DPM++ 2M SDE Karras',
          seed: -1,
          batch_size: 1,
          prepend_preprompt: false
        }
      })
    });
    const data = await replicateRes.json();
    if (data.error || data.status === 'failed') {
      console.log(`  ERROR: ${data.error || JSON.stringify(data).substring(0, 300)}`);
      return null;
    }
    url = Array.isArray(data.output) ? data.output[0] : data.output;
    if (!url) {
      console.log(`  ERROR: No URL in response: ${JSON.stringify(data).substring(0, 300)}`);
      return null;
    }
  } else if (test.model === 'rep:luma-photon') {
    const replicateRes = await fetch(`${BASE_URL}/api/replicate/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'luma/photon',
        input: {
          prompt: test.prompt,
          aspect_ratio: '3:4',
          output_format: 'png'
        }
      })
    });
    const data = await replicateRes.json();
    if (data.error || data.status === 'failed') {
      console.log(`  ERROR: ${data.error || JSON.stringify(data).substring(0, 300)}`);
      return null;
    }
    url = Array.isArray(data.output) ? data.output[0] : (typeof data.output === 'string' ? data.output : null);
    if (!url) {
      console.log(`  ERROR: No URL in response: ${JSON.stringify(data).substring(0, 300)}`);
      return null;
    }
  } else {
    const replicateRes = await fetch(`${BASE_URL}/api/replicate/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'aisha-ai-official/nsfw-flux-dev',
        version: 'fb4f086702d6a301ca32c170d926239324a7b7b2f0afc3d232a9c4be382dc3fa',
        input: {
          prompt: test.prompt,
          width: 832,
          height: 1216,
          steps: test.steps || 20,
          guidance_scale: test.guidance || 3.5,
          seed: -1
        }
      })
    });

    const data = await replicateRes.json();
    
    if (data.error || data.status === 'failed') {
      console.log(`  ERROR: ${data.error || 'failed'}`);
      return null;
    }

    url = Array.isArray(data.output) ? data.output[0] : (typeof data.output === 'object' && data.output?.url ? data.output.url : data.output);
    if (!url) {
      console.log(`  ERROR: No URL in response: ${JSON.stringify(data).substring(0, 300)}`);
      return null;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Generated in ${elapsed}s: ${url.substring(0, 80)}...`);

  const imgRes = await fetch(url);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  console.log(`  [debug] Downloaded buffer: ${buffer.length} bytes, content-type: ${imgRes.headers.get('content-type')}`);
  
  const filename = `juju_test_${String(test.id).padStart(3, '0')}.webp`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  const isBW = test.label.includes('B&W');
  const isRV6 = test.model === 'rep:realistic-vision-v6';
  const isJugXL = test.model === 'rep:juggernaut-xl';
  const isCyberXL = test.model === 'rep:cyber-realistic-xl';
  const isPhoton = test.model === 'rep:luma-photon';

  let final;

  if (isRV6) {
    // RV6 outputs 512x768 — upscale to 832x1216 with light processing (model already has grain)
    let pipeline = sharp(buffer).resize(832, 1216, { fit: 'fill', kernel: 'lanczos3' });
    if (isBW) {
      pipeline = pipeline.greyscale().modulate({ brightness: 1.03 }).gamma(1.2);
    } else {
      pipeline = pipeline.modulate({ brightness: 1.01, saturation: 0.92 }).gamma(1.05);
    }
    const jpegBuf = await pipeline
      .jpeg({ quality: 62, chromaSubsampling: '4:2:0', mozjpeg: true })
      .toBuffer();
    final = await sharp(jpegBuf).webp({ quality: 75, effort: 4 }).toBuffer();

  } else if (isJugXL || isCyberXL) {
    let pipeline = sharp(buffer).blur(0.3);
    if (isBW) {
      pipeline = pipeline.greyscale().modulate({ brightness: 1.02 }).gamma(1.15);
    } else {
      pipeline = pipeline.modulate({ brightness: 1.01, saturation: 0.93 }).gamma(1.04);
    }
    const jpegBuf = await pipeline
      .jpeg({ quality: 65, chromaSubsampling: '4:2:0', mozjpeg: true })
      .toBuffer();
    final = await sharp(jpegBuf).webp({ quality: 78, effort: 4 }).toBuffer();

  } else if (isPhoton) {
    let pipeline = sharp(buffer).resize(832, 1216, { fit: 'inside', kernel: 'lanczos3' });
    if (isBW) {
      pipeline = pipeline.greyscale().modulate({ brightness: 1.02 }).gamma(1.15);
    } else {
      pipeline = pipeline.modulate({ brightness: 1.01, saturation: 0.94 }).gamma(1.03);
    }
    const jpegBuf = await pipeline
      .jpeg({ quality: 68, chromaSubsampling: '4:2:0', mozjpeg: true })
      .toBuffer();
    final = await sharp(jpegBuf).webp({ quality: 80, effort: 4 }).toBuffer();

  } else {
    // FLUX models — aggressive post-processing needed
    const downscaled = await sharp(buffer)
      .resize(440, 644, { fit: 'fill' })
      .blur(0.5)
      .toBuffer();

    let pipeline = sharp(downscaled)
      .resize(832, 1216, { fit: 'fill', kernel: 'cubic' })
      .blur(0.4);

    if (isBW) {
      pipeline = pipeline.greyscale().modulate({ brightness: 1.04 }).gamma(1.25);
    } else {
      pipeline = pipeline.modulate({ brightness: 1.01, saturation: 0.88 }).gamma(1.06);
    }

    const jpegBuf = await pipeline
      .jpeg({ quality: 52, chromaSubsampling: '4:2:0', mozjpeg: true })
      .toBuffer();

    final = await sharp(jpegBuf)
      .webp({ quality: 72, effort: 4 })
      .toBuffer();
  }

  fs.writeFileSync(filepath, final);
  
  const sizeMB = (final.length / 1024 / 1024).toFixed(2);
  console.log(`  Saved: ${filename} (${sizeMB}MB) [V5 post-process: downscale+blur+upscale+gamma+jpeg65]`);
  
  return { id: test.id, filename, url, filepath };
}

async function main() {
  console.log('='.repeat(60));
  console.log('TEST JUJU - Image Generation Tests');
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Tests: ${ACTIVE_TESTS.length}`);
  console.log('='.repeat(60));

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const results = [];
  for (let i = 0; i < ACTIVE_TESTS.length; i++) {
    const test = ACTIVE_TESTS[i];
    if (i > 0) {
      console.log(`  [waiting 12s to avoid rate limit...]`);
      await new Promise(r => setTimeout(r, 12000));
    }
    try {
      const result = await generateImage(test);
      if (result) results.push(result);
    } catch (e) {
      console.log(`  EXCEPTION: ${e.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`DONE: ${results.length}/${TESTS.length} images generated`);
  results.forEach(r => console.log(`  ${r.filename}`));
  console.log('='.repeat(60));
}

main().catch(console.error);
