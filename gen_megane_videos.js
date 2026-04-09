const { fal } = require('@fal-ai/client');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

require('dotenv').config();

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) { console.error('FAL_KEY missing from .env'); process.exit(1); }

fal.config({ credentials: FAL_KEY });

const DIR_DRESSED = path.join(__dirname, 'public', 'images', 'megane', 'megane3');
const DIR_COQUIN = path.join(__dirname, 'public', 'images', 'megane', 'megane4');

const DRESSED_VIDEO_PROMPTS = {
  14: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  15: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  16: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  17: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  18: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  19: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  20: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  21: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  22: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  23: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  24: 'She turns from side to side gently, her body moving with natural soft momentum, her chest shifting subtly with the movement.',
  25: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  26: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  27: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  28: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  29: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  30: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  31: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  32: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  33: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  34: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  35: 'She leans forward then straightens up, her large heavy saggy breasts bouncing heavily and swaying with natural weight and momentum.',
  36: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  37: 'She shifts her weight and adjusts her posture, her large heavy breasts bouncing and swaying naturally under her top with each movement.',
  38: 'She spins slowly and stops, her large heavy breasts continuing to bounce and jiggle with natural delayed momentum from the movement.'
};

const COQUIN_VIDEO_PROMPTS = {
  14: 'She shifts on the bed, her large heavy bare breasts swaying and bouncing naturally with the movement, jiggling as she adjusts position.',
  15: 'She stretches her arms, her large heavy bare breasts lifting then dropping and bouncing with natural weight and momentum.',
  16: 'She stands up slowly, her large heavy bare breasts swinging and bouncing heavily as she rises, natural jiggle from the movement.',
  17: 'She rolls over, her large heavy bare breasts shifting and bouncing with exaggerated natural momentum, swaying side to side.',
  18: 'She sits up in bed, her large heavy bare breasts bouncing and jiggling as she moves upright, swaying with natural weight.',
  19: 'She turns toward camera, her large heavy bare breasts swinging and bouncing from the rotation, natural momentum carrying them.',
  20: 'She leans forward then back, her large heavy bare breasts bouncing heavily and swaying with each movement, natural jiggle.',
  21: 'She adjusts her position, her large heavy bare breasts swaying and bouncing with natural delayed momentum from the movement.',
  22: 'She stretches languidly, her large heavy bare breasts lifting and bouncing as she moves, jiggling with natural weight.',
  23: 'She sits up and reaches forward, her large heavy bare breasts swinging and bouncing heavily with the movement.',
  24: 'She shifts against the doorframe, her large heavy bare breasts swaying and bouncing with exaggerated natural momentum.',
  25: 'She stands and stretches, her large heavy bare breasts bouncing and jiggling heavily as she extends her arms.',
  26: 'She leans back then forward, her large heavy bare breasts bouncing and swaying with natural weight and momentum.',
  27: 'She rolls onto her side, her large heavy bare breasts shifting and bouncing with natural movement, swaying heavily.',
  28: 'She stands up from sitting, her large heavy bare breasts bouncing heavily and jiggling with the upward movement.',
  29: 'She lowers herself down slowly, her large heavy bare breasts swaying and bouncing with each movement.',
  30: 'She props herself up on her elbows, her large heavy bare breasts hanging and swaying with natural weight.',
  31: 'She shifts on the bed, her large heavy bare breasts bouncing and jiggling with exaggerated natural momentum.',
  32: 'She uncrosses her legs and leans forward, her large heavy bare breasts swinging and bouncing naturally.',
  33: 'She lifts her chin from her hands and stretches, her large heavy bare breasts bouncing and swaying heavily.',
  34: 'She turns from the mirror, her large heavy bare breasts swinging and bouncing with the rotation.',
  35: 'She stretches her arms overhead, her large heavy bare breasts lifting then dropping and bouncing with natural weight.',
  36: 'She rolls onto her side on the chaise, her large heavy bare breasts shifting and bouncing with natural momentum.',
  37: 'She shifts on the counter, her large heavy bare breasts bouncing and jiggling with each movement.',
  38: 'She steps forward, her large heavy bare breasts swaying and bouncing heavily with each step, natural jiggle.'
};

const QUEUE_SUBMIT = {
  kling26: 'https://queue.fal.run/fal-ai/kling-video/v2.6/pro/image-to-video',
  wan21: 'https://queue.fal.run/fal-ai/wan-i2v',
  wan26: 'https://queue.fal.run/wan/v2.6/image-to-video'
};

function buildPayload(model, prompt, imageUrl) {
  if (model === 'kling26') {
    return {
      prompt,
      start_image_url: imageUrl,
      duration: '5',
      negative_prompt: 'blur, distort, and low quality',
      generate_audio: false
    };
  }
  if (model === 'wan26') {
    return {
      prompt,
      image_url: imageUrl,
      duration: '5',
      resolution: '720p',
      negative_prompt: 'blur, distort, low quality, deformed',
      enable_safety_checker: false,
      enable_prompt_expansion: false
    };
  }
  return {
    prompt,
    image_url: imageUrl,
    num_frames: 81,
    enable_safety_checker: false,
    negative_prompt: 'blur, distort, low quality'
  };
}

async function uploadImage(filepath) {
  const fileBuffer = fs.readFileSync(filepath);
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
  const file = new File([blob], path.basename(filepath), { type: 'image/jpeg' });
  const url = await fal.storage.upload(file);
  return url;
}

async function submitVideo(model, prompt, imageUrl) {
  const url = QUEUE_SUBMIT[model];
  const payload = buildPayload(model, prompt, imageUrl);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.error || data.detail) throw new Error(data.error || data.detail);
  if (!data.request_id) throw new Error('No request_id: ' + JSON.stringify(data).substring(0, 200));
  return data; // contains request_id, status_url, response_url
}

async function pollVideo(job) {
  const { statusUrl, responseUrl, model } = job;
  console.log(`  statusUrl: ${statusUrl}`);
  console.log(`  responseUrl: ${responseUrl}`);

  for (let i = 0; i < 180; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const res = await fetch(statusUrl, {
        headers: { 'Authorization': `Key ${FAL_KEY}` }
      });
      const text = await res.text();
      console.log(`  [${i * 5}s] raw: ${text.substring(0, 200)}`);
      let data;
      try { data = JSON.parse(text); } catch { 
        console.log(`  [${i * 5}s] Parse error, retrying...`);
        continue;
      }
      if (data.status === 'COMPLETED') {
        console.log(`  COMPLETED! Fetching result from ${responseUrl}...`);
        const resultRes = await fetch(responseUrl, {
          headers: { 'Authorization': `Key ${FAL_KEY}` }
        });
        const resultText = await resultRes.text();
        console.log(`  Result (first 300): ${resultText.substring(0, 300)}`);
        let result;
        try { result = JSON.parse(resultText); } catch { return null; }
        return result.video?.url;
      }
      if (data.status === 'FAILED') {
        console.log(`  FAILED: ${JSON.stringify(data).substring(0, 500)}`);
        return null;
      }
      if (i % 6 === 0) console.log(`  Polling [${i * 5}s]... status=${data.status}`);
    } catch (e) {
      console.log(`  Poll error [${i * 5}s]: ${e.message}`);
    }
  }
  console.log('  Timed out (900s)');
  return null;
}

async function downloadFile(url, filepath) {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
  console.log(`  Saved: ${path.basename(filepath)} (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);
}

async function processCategory(category, dir, prompts, model, startId, endId) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing ${category} videos (${model}) #${startId}-${endId}`);
  console.log('='.repeat(60));

  const jobs = [];

  for (let id = startId; id <= endId; id++) {
    const imgFile = path.join(dir, `megane_${category}_${String(id).padStart(2, '0')}.jpg`);
    if (!fs.existsSync(imgFile)) {
      console.log(`[#${id}] Image not found: ${imgFile}, skipping`);
      continue;
    }

    const videoFile = path.join(dir, `megane_${category}_video_${String(id).padStart(2, '0')}.mp4`);
    if (fs.existsSync(videoFile)) {
      console.log(`[#${id}] Video already exists, skipping`);
      continue;
    }

    const prompt = prompts[id];
    if (!prompt) {
      console.log(`[#${id}] No video prompt, skipping`);
      continue;
    }

    console.log(`\n[#${id}] Uploading image...`);
    try {
      const cdnUrl = await uploadImage(imgFile);
      console.log(`  CDN: ${cdnUrl}`);

      console.log(`  Submitting video (${model})...`);
      const submitData = await submitVideo(model, prompt, cdnUrl);
      console.log(`  request_id: ${submitData.request_id}`);
      console.log(`  status_url: ${submitData.status_url}`);
      jobs.push({ 
        id, 
        requestId: submitData.request_id, 
        statusUrl: submitData.status_url,
        responseUrl: submitData.response_url,
        model, 
        videoFile 
      });
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n${jobs.length} video jobs submitted. Polling for completion...`);

  for (const job of jobs) {
    console.log(`\n[#${job.id}] Polling ${job.model}/${job.requestId}...`);
    const videoUrl = await pollVideo(job);
    if (videoUrl) {
      await downloadFile(videoUrl, job.videoFile);
    } else {
      console.log(`  No video URL for #${job.id}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'all';

  if (mode === 'dressed' || mode === 'all') {
    await processCategory('dressed', DIR_DRESSED, DRESSED_VIDEO_PROMPTS, 'kling26', 14, 38);
  }
  if (mode === 'dressed-wan' || mode === 'all') {
    await processCategory('dressed', DIR_DRESSED, DRESSED_VIDEO_PROMPTS, 'wan21', 14, 38);
  }
  if (mode === 'dressed-wan26') {
    await processCategory('dressed', DIR_DRESSED, DRESSED_VIDEO_PROMPTS, 'wan26', 14, 38);
  }
  if (mode === 'coquin' || mode === 'all') {
    await processCategory('coquin', DIR_COQUIN, COQUIN_VIDEO_PROMPTS, 'wan21', 14, 38);
  }

  console.log('\n\nDone!');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
