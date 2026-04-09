const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BASE_URL = 'http://localhost:3000';
const DIR_DRESSED = path.join(__dirname, 'public', 'images', 'juju', 'juju3');
const DIR_COQUIN = path.join(__dirname, 'public', 'images', 'juju', 'juju4');

const NEGATIVE = `smooth skin, airbrushed, perfect skin, CGI, 3D render, cartoon, anime, painting, illustration, digital art, photoshop, retouched, beauty filter, FaceTune, professional photo, studio lighting, sharp focus, 4k, 8k, ultra HD, masterpiece, perfect, flawless, porcelain, plastic`;

const DRESSED_PHOTOS = [
  {
    id: 1,
    model: 'rep:juggernaut-xl',
    prompt: `RAW candid phone selfie, amateur photo, young european woman 21yo, dark brown wavy medium-length hair in messy bun with fabric scrunchie, large oversized geometric octagonal gold-rimmed prescription glasses, fair skin with visible freckles natural redness on cheeks and pores and tiny blemishes, naturally curvy soft body with full natural D-cup bust, soft round face with round cheeks, green-hazel eyes, small nose, mirror selfie in cozy attic bedroom with slanted wooden plank ceiling, wearing light lavender-grey pleated chiffon mini dress with balloon sleeves showing cleavage, pink bra strap visible on shoulder, phone in decorative case, messy bedroom behind with pink sheets and stuffed animal on bed, warm afternoon daylight from small window, 3/4 view looking at phone screen, film grain, phone camera quality, slightly soft and blurry, warm color cast, imperfect tilted framing`,
    negative_prompt: NEGATIVE,
    label: 'Dressed lavender dress attic mirror',
    videoPrompt: `She adjusts her dress straps with both hands, tilting her head to the side with a shy smile. Her hair falls loose from the messy bun as she moves, creating a natural playful moment.`,
    guidance: 5.5,
    steps: 35,
    width: 832,
    height: 1216
  },
  {
    id: 2,
    model: 'rep:juggernaut-xl',
    prompt: `RAW candid phone selfie, amateur photo, young european woman 21yo, dark brown wavy hair loose past shoulders, large oversized geometric gold-rimmed glasses, fair skin with freckles visible pores redness on cheeks tiny blemishes, naturally curvy body with full bust visible cleavage, soft round face, green-hazel eyes, front camera selfie in car passenger seat, seatbelt across chest, wearing sage-green linen sundress with thin straps and deep neckline, sunglasses pushed up on head, dirty windshield and dashboard visible, trees outside, bright daylight through window causing squint, casual warm smile, backlit hair golden halo effect, film grain, phone camera quality, slightly overexposed highlights, warm golden tones, digital noise, soft focus`,
    negative_prompt: NEGATIVE,
    label: 'Dressed car selfie sundress',
    videoPrompt: `She turns from looking out the window toward the camera, her hair catching the sunlight. She gives a cute little wave and blows a small kiss, her cleavage shifting naturally as she moves.`,
    guidance: 5.5,
    steps: 35,
    width: 832,
    height: 1216
  },
  {
    id: 3,
    model: 'rep:juggernaut-xl',
    prompt: `RAW candid phone selfie, amateur photo, young european woman 21yo, dark brown wavy hair in messy low ponytail, large oversized geometric gold-rimmed glasses slightly smudged, fair skin with visible pores natural redness puffy morning face, naturally curvy body, green-hazel eyes, front camera selfie sitting on unmade bed morning light, wearing oversized washed-out vintage band t-shirt hanging off one shoulder exposing bra strap and collar bone, messy white sheets bunched around her, phone charger and water glass on nightstand, morning light through thin curtains giving warm yellow tint, she just woke up looking sleepy and cute with slightly puffy eyes, arm extended holding phone from above, film grain, phone camera, slightly blurry, noise in shadows, imperfect framing tilted`,
    negative_prompt: NEGATIVE,
    label: 'Dressed morning bed wakeup',
    videoPrompt: `She stretches her arms above her head sleepily, the oversized t-shirt riding up slightly. She yawns and then gives a sleepy smile toward the camera, running her hand through her messy hair.`,
    guidance: 5.5,
    steps: 35,
    width: 832,
    height: 1216
  }
];

const COQUIN_PHOTOS = [
  {
    id: 1,
    model: 'rep:nsfw-flux-dev',
    prompt: `low quality phone camera photo of a young European woman, 21 years old, caucasian, dark brown wavy medium-length hair loose and messy, large oversized geometric octagonal gold-rimmed prescription glasses, fair skin with visible freckles and natural redness on cheeks and nose, visible pores and tiny blemishes and uneven skin tone, naturally full lips, naturally curvy soft body with full natural D-cup bust, soft round face with round cheeks, green-hazel eyes, small nose, 167cm. She is completely nude, lying on her side on an unmade bed with rumpled white sheets, one arm extended holding phone for selfie from slightly above, the other arm draped across her waist, her bare breasts visible and natural-looking with natural nipples, soft warm morning light from window behind creating rim light on her body, messy bedroom with clothes on floor and charger on nightstand, she has a shy intimate smile looking directly at camera, the photo is intimate and private like sent to a boyfriend. Captured on cheap smartphone front camera, Samsung Galaxy. The photo is slightly soft and blurry — phone autofocus is imprecise. Visible digital noise grain in shadow areas. JPEG compression artifacts on edges. Warm yellowish color cast from indoor lighting. The skin is REAL UNEDITED UNRETOUCHED — visible pores on nose and cheeks, natural oily shine, redness, uneven skin tone with slightly darker under-eyes, NO beauty filter NO smoothing. Overexposed highlights where light hits skin. The framing is imperfect — tilted, off-center. NOT a professional photo`,
    label: 'Coquin bed nude morning',
    videoPrompt: `She rolls slowly from her side onto her back, stretching languidly. Her breasts shift naturally with the movement. She gives a sleepy intimate smile toward the camera and reaches her hand toward the lens.`,
    guidance: 3.5,
    steps: 28
  },
  {
    id: 2,
    model: 'rep:nsfw-flux-dev',
    prompt: `low quality phone camera photo of a young European woman, 21 years old, caucasian, dark brown wavy medium-length hair in messy bun with loose strands, large oversized geometric octagonal gold-rimmed prescription glasses, fair skin with visible freckles and natural redness on cheeks, visible pores, naturally curvy soft body with full natural D-cup bust, soft round face, green-hazel eyes, small nose, 167cm. Bathroom mirror selfie, she is completely nude, standing in a small bathroom with white tiles, her full nude body reflected in the slightly steamy mirror, one hand holding phone at chest level, the other hand on her hip, her bare breasts and body fully visible, natural body hair visible, phone flash creating a bright spot on the mirror, bathroom counter cluttered with skincare products and toothbrush, warm overhead light, she has a playful pouty expression with slightly pursed lips. Captured on cheap smartphone. Slightly blurry, visible noise and grain, JPEG artifacts, warm color cast, imperfect framing, mirror has water spots and fingerprints. Real unretouched skin with pores and blemishes visible. NOT a professional photo`,
    label: 'Coquin bathroom mirror nude',
    videoPrompt: `She turns slowly in front of the mirror, showing her body from different angles. She runs a hand through her messy hair and gives a flirty look at the camera through the mirror reflection.`,
    guidance: 3.5,
    steps: 28
  },
  {
    id: 3,
    model: 'rep:nsfw-flux-dev',
    prompt: `low quality phone camera photo of a young European woman, 21 years old, caucasian, dark brown wavy medium-length hair loose on pillow, large oversized geometric octagonal gold-rimmed prescription glasses slightly crooked, fair skin with visible freckles and natural redness, visible pores and tiny blemishes, naturally curvy soft body with full natural D-cup bust, soft round face with round cheeks, green-hazel eyes, small nose, 167cm. She is completely nude lying on her back on a couch with a knitted blanket half covering her legs, phone held above taking selfie from above showing her bare chest and stomach, her breasts natural and soft falling slightly to the sides, TV remote and empty mug on coffee table, warm evening lamp light casting golden tones, she looks up at camera with genuine warm inviting smile, intimate cozy evening photo sent to boyfriend. Captured on cheap phone camera. Slightly soft and out of focus, visible digital noise, warm yellow color cast, imperfect framing cropped at edges. Real unretouched skin, NO beauty filter, visible pores and natural imperfections. NOT a professional photo`,
    label: 'Coquin couch nude evening',
    videoPrompt: `She shifts on the couch, pulling the blanket down slightly and stretching. Her breasts move naturally as she adjusts position. She gives a warm playful wink toward the camera above her.`,
    guidance: 3.5,
    steps: 28
  }
];

async function generateDressedImage(test) {
  console.log(`\n[DRESSED #${test.id}] ${test.label}`);
  const startTime = Date.now();

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
  const url = Array.isArray(data.output) ? data.output[0] : data.output;
  if (!url) {
    console.log(`  ERROR: No URL in response`);
    return null;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Generated in ${elapsed}s`);

  const imgRes = await fetch(url);
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  let pipeline = sharp(buffer).blur(0.3);
  pipeline = pipeline.modulate({ brightness: 1.01, saturation: 0.93 }).gamma(1.04);
  const jpegBuf = await pipeline.jpeg({ quality: 65, chromaSubsampling: '4:2:0', mozjpeg: true }).toBuffer();
  const final = await sharp(jpegBuf).webp({ quality: 78, effort: 4 }).toBuffer();

  const filename = `juju_photo_${test.id}.webp`;
  const filepath = path.join(DIR_DRESSED, filename);
  fs.writeFileSync(filepath, final);
  console.log(`  Saved: ${filename} (${(final.length / 1024 / 1024).toFixed(2)}MB)`);

  return { id: test.id, filename, filepath, url, type: 'dressed', videoPrompt: test.videoPrompt };
}

async function generateCoquinImage(test) {
  console.log(`\n[COQUIN #${test.id}] ${test.label}`);
  const startTime = Date.now();

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
        steps: test.steps || 28,
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
  const url = Array.isArray(data.output) ? data.output[0] : (typeof data.output === 'object' && data.output?.url ? data.output.url : data.output);
  if (!url) {
    console.log(`  ERROR: No URL in response`);
    return null;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Generated in ${elapsed}s`);

  const imgRes = await fetch(url);
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  const downscaled = await sharp(buffer).resize(440, 644, { fit: 'fill' }).blur(0.5).toBuffer();
  let pipeline = sharp(downscaled).resize(832, 1216, { fit: 'fill', kernel: 'cubic' }).blur(0.4);
  pipeline = pipeline.modulate({ brightness: 1.01, saturation: 0.88 }).gamma(1.06);
  const jpegBuf = await pipeline.jpeg({ quality: 52, chromaSubsampling: '4:2:0', mozjpeg: true }).toBuffer();
  const final = await sharp(jpegBuf).webp({ quality: 72, effort: 4 }).toBuffer();

  const filename = `juju_coquin_photo_${test.id}.webp`;
  const filepath = path.join(DIR_COQUIN, filename);
  fs.writeFileSync(filepath, final);
  console.log(`  Saved: ${filename} (${(final.length / 1024 / 1024).toFixed(2)}MB)`);

  return { id: test.id, filename, filepath, url, type: 'coquin', videoPrompt: test.videoPrompt };
}

async function submitVideo(imageUrl, videoPrompt, model) {
  console.log(`  Submitting video (${model})...`);
  const res = await fetch(`${BASE_URL}/api/video/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: videoPrompt,
      image_url: imageUrl,
      duration: '5',
      model
    })
  });
  const data = await res.json();
  if (data.error) {
    console.log(`  Video submit error: ${data.error}`);
    return null;
  }
  console.log(`  Video submitted: request_id=${data.request_id}`);
  return { request_id: data.request_id, model };
}

async function pollVideo(requestId, model, maxPolls = 120) {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const res = await fetch(`${BASE_URL}/api/video/status/${model}/${requestId}`);
      const data = await res.json();
      if (data.status === 'COMPLETED' && data.video_url) {
        return data.video_url;
      }
      if (data.status === 'FAILED') {
        console.log(`  Video FAILED: ${JSON.stringify(data).substring(0, 200)}`);
        return null;
      }
      if (i % 12 === 0) console.log(`  Polling ${model}/${requestId}... (${i * 5}s)`);
    } catch (e) {
      console.log(`  Poll error: ${e.message}`);
    }
  }
  console.log(`  Video timed out after ${maxPolls * 5}s`);
  return null;
}

async function downloadVideo(url, filepath) {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
  console.log(`  Downloaded video: ${path.basename(filepath)} (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('JUJU — Full Generation: 3 Dressed + 3 Coquin (Photos + Videos)');
  console.log('='.repeat(60));

  if (!fs.existsSync(DIR_DRESSED)) fs.mkdirSync(DIR_DRESSED, { recursive: true });
  if (!fs.existsSync(DIR_COQUIN)) fs.mkdirSync(DIR_COQUIN, { recursive: true });

  // === PHASE 1: GENERATE ALL 6 PHOTOS ===
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 1: Generating 6 photos');
  console.log('='.repeat(60));

  const allImages = [];

  for (let i = 0; i < DRESSED_PHOTOS.length; i++) {
    if (i > 0) {
      console.log(`  [waiting 12s...]`);
      await new Promise(r => setTimeout(r, 12000));
    }
    try {
      const result = await generateDressedImage(DRESSED_PHOTOS[i]);
      if (result) allImages.push(result);
    } catch (e) {
      console.log(`  EXCEPTION: ${e.message}`);
    }
  }

  console.log(`  [waiting 12s before coquin...]`);
  await new Promise(r => setTimeout(r, 12000));

  for (let i = 0; i < COQUIN_PHOTOS.length; i++) {
    if (i > 0) {
      console.log(`  [waiting 12s...]`);
      await new Promise(r => setTimeout(r, 12000));
    }
    try {
      const result = await generateCoquinImage(COQUIN_PHOTOS[i]);
      if (result) allImages.push(result);
    } catch (e) {
      console.log(`  EXCEPTION: ${e.message}`);
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`Photos done: ${allImages.length}/6`);
  allImages.forEach(r => console.log(`  ${r.type} #${r.id}: ${r.filename}`));

  if (allImages.length === 0) {
    console.log('No images generated. Aborting.');
    return;
  }

  // === PHASE 2: GENERATE VIDEOS FROM EACH PHOTO ===
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 2: Generating videos from photos');
  console.log('  Dressed → Kling 2.6 Pro | Coquin → Wan 2.1 (NSFW OK)');
  console.log('='.repeat(60));

  const videoJobs = [];

  for (const img of allImages) {
    const videoModel = img.type === 'dressed' ? 'kling26' : 'wan21';
    console.log(`\n[VIDEO ${img.type} #${img.id}] model=${videoModel}`);
    try {
      const job = await submitVideo(img.url, img.videoPrompt, videoModel);
      if (job) {
        videoJobs.push({ ...job, imgType: img.type, imgId: img.id });
      }
    } catch (e) {
      console.log(`  Submit exception: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`\n${videoJobs.length} videos submitted. Polling for completion...`);

  const videoResults = [];
  for (const job of videoJobs) {
    console.log(`\n  Polling ${job.imgType} #${job.imgId} (${job.model})...`);
    const videoUrl = await pollVideo(job.request_id, job.model);
    if (videoUrl) {
      const dir = job.imgType === 'dressed' ? DIR_DRESSED : DIR_COQUIN;
      const prefix = job.imgType === 'dressed' ? 'juju_video' : 'juju_coquin_video';
      const filepath = path.join(dir, `${prefix}_${job.imgId}.mp4`);
      await downloadVideo(videoUrl, filepath);
      videoResults.push({ type: job.imgType, id: job.imgId, filepath });
    }
  }

  // === SUMMARY ===
  console.log('\n' + '='.repeat(60));
  console.log('COMPLETE');
  console.log(`  Photos: ${allImages.length}/6`);
  console.log(`  Videos: ${videoResults.length}/${videoJobs.length}`);
  console.log('='.repeat(60));
  allImages.forEach(r => console.log(`  📷 ${r.filename}`));
  videoResults.forEach(r => console.log(`  🎬 ${path.basename(r.filepath)}`));
}

main().catch(console.error);
