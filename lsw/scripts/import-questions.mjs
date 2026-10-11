// Usage: npm run import:questions [path-to-csv]
// CSV columns: Question, Option A, Option B, Option C, Option D, Correct (A/B/C/D)
// In Google Sheets: File > Download > Comma Separated Values (.csv)
import fs from 'node:fs';

const file = process.argv[2] || 'data/NIA_Question_Bank.csv';
const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');

function parse(s) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const rows = parse(text).slice(1);
const seen = new Set(), out = [], skipped = [];
rows.forEach((r, i) => {
  const [q, a, b, c, d, ans] = r.map((x) => (x || '').trim());
  if (!q) return;
  if (!a || !b || !c || !d || !/^[ABCD]$/i.test(ans)) return skipped.push(`row ${i + 2}: incomplete`);
  if (seen.has(q)) return skipped.push(`row ${i + 2}: duplicate question`);
  seen.add(q);
  out.push({ id: out.length + 1, q, a, b, c, d, ans: ans.toUpperCase() });
});

fs.writeFileSync('data/questions.json', JSON.stringify(out, null, 1));
const dist = out.reduce((m, x) => ((m[x.ans] = (m[x.ans] || 0) + 1), m), {});
console.log(`Imported ${out.length} questions. Answer spread:`, dist);
if (skipped.length) console.log('Skipped:\n' + skipped.join('\n'));
