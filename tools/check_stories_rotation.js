/**
 * tools/check_stories_rotation.js
 *
 * Verifies that GET /api/stories returns different media every day. Runs the
 * exact same logic as app.js (Mulberry32-ish daily seed) but parameterized
 * by `dayOffset` so we can simulate today, tomorrow, +7 days, +30 days.
 *
 * Usage: node tools/check_stories_rotation.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const charactersPath = path.join(root, 'characters.json');
const characters = JSON.parse(fs.readFileSync(charactersPath, 'utf8'));

const mediaExts = /\.(webp|jpg|jpeg|png|gif|mp4|webm|mov)$/i;

function simulate(dayOffset) {
    const today = Math.floor(Date.now() / 86400000) + dayOffset;
    const out = [];
    for (const char of characters) {
        if (char.hidden === true) continue;
        const photoPath = char.photo || '';
        const match = photoPath.match(/images\/([^/]+)\//);
        if (!match) continue;
        const girl = match[1];
        const sub = `${girl}3`;
        const subAbs = path.join(root, 'public', 'images', girl, sub);

        let allMedia = [];
        try {
            const files = fs.readdirSync(subAbs);
            for (const f of files) {
                if (mediaExts.test(f)) allMedia.push(`${sub}/${f}`);
            }
        } catch (_) { continue; }
        if (!allMedia.length) continue;

        let s = (today ^ (girl.length * 2654435761)) >>> 0;
        const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
        const shuffled = [...allMedia].sort(() => rand() - 0.5);
        const count = 1 + Math.floor(rand() * 3);
        const picked = shuffled.slice(0, Math.min(shuffled.length, count));

        out.push({ name: char.name, girl, pool: allMedia.length, count, picked });
    }
    return out;
}

const day0 = simulate(0);
const day1 = simulate(1);
const day7 = simulate(7);
const day30 = simulate(30);

console.log(`\n=== Story rotation check (${day0.length} characters) ===\n`);
console.log('Char            | pool | today (count + files)                     | tomorrow                                  | +7d                                       | same?');
console.log('-'.repeat(190));

let identicalNext = 0;
let identicalWeek = 0;
for (const c of day0) {
    const d1 = day1.find(x => x.girl === c.girl) || { count: 0, picked: [] };
    const d7 = day7.find(x => x.girl === c.girl) || { count: 0, picked: [] };
    const sameNext = JSON.stringify(c.picked) === JSON.stringify(d1.picked);
    const sameWeek = JSON.stringify(c.picked) === JSON.stringify(d7.picked);
    if (sameNext) identicalNext++;
    if (sameWeek) identicalWeek++;
    const t = `${c.count}× [${c.picked.map(p => p.split('/').pop()).join(', ')}]`;
    const t1 = `${d1.count}× [${d1.picked.map(p => p.split('/').pop()).join(', ')}]`;
    const t7 = `${d7.count}× [${d7.picked.map(p => p.split('/').pop()).join(', ')}]`;
    const flag = sameNext ? 'SAME-NEXT!' : (sameWeek ? 'same-7d' : 'rotates ✓');
    console.log(`${c.name.padEnd(15)} | ${String(c.pool).padStart(4)} | ${t.padEnd(40).slice(0, 40)}  | ${t1.padEnd(40).slice(0, 40)}  | ${t7.padEnd(40).slice(0, 40)}  | ${flag}`);
}

console.log('\n' + '-'.repeat(190));
console.log(`Summary: ${day0.length} characters, ${identicalNext} unchanged tomorrow, ${identicalWeek} unchanged in 7 days.`);
console.log(`Pool min/max: ${Math.min(...day0.map(c => c.pool))} / ${Math.max(...day0.map(c => c.pool))} media files.`);
