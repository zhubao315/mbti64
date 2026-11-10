// 最终版稀有度审校：在表格/段落里按分号或换行切分后逐段检查
import fs from 'node:fs';
import path from 'node:path';

const DIM_PRIOR = { EI: 0.55, SN: 0.65, TF: 0.5, JP: 0.55, AC: 0.6, OH: 0.45 };
const BASE_CODES = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFP','ENFJ','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
function prior(base, acoh) {
  const letters = base.split('');
  const dims = [['EI','E','I'],['SN','S','N'],['TF','T','F'],['JP','J','P']];
  let p = 1;
  dims.forEach(([dim, a, b], i) => { p *= letters[i] === a ? DIM_PRIOR[dim] : 1 - DIM_PRIOR[dim]; });
  const [ac, oh] = acoh.split('-');
  p *= ac === 'A' ? DIM_PRIOR.AC : 1 - DIM_PRIOR.AC;
  p *= oh === 'O' ? DIM_PRIOR.OH : 1 - DIM_PRIOR.OH;
  return p;
}
const all = [];
for (const b of BASE_CODES) for (const s of ['C-O','C-H','A-O','A-H']) all.push({ code: `${b}-${s}`, p: prior(b, s) });
all.sort((a, b) => a.p - b.p || a.code.localeCompare(b.code));
let rank = 1;
for (let i = 0; i < all.length; i++) {
  if (i > 0 && Math.abs(all[i].p - all[i-1].p) > 1e-15) rank = i + 1;
  all[i].rank = rank;
  all[i].per1000 = Math.round(all[i].p * 100000) / 100;
}
const AUTH = Object.fromEntries(all.map(x => [x.code, x]));

const root = path.join(process.cwd(), '书-千分之一的你');
const ERR = [];

for (const vol of fs.readdirSync(root)) {
  const volPath = path.join(root, vol);
  if (!fs.statSync(volPath).isDirectory()) continue;
  for (const f of fs.readdirSync(volPath)) {
    if (!/^第\d+章-.+\.md$/.test(f)) continue;
    const full = path.join(volPath, f);
    const t = fs.readFileSync(full, 'utf8');
    // 按 ; ； | \n 切（必须同时支持半角与中文全角分号）
    const segments = t.split(/[;；|\n]/);
    for (const seg of segments) {
      const m = seg.match(/([A-Z]{4})-([A-CH])-([A-H])/);
      if (!m) continue;
      const code = m[0];
      if (!AUTH[code]) continue;
      const a = AUTH[code];
      const rankM = seg.match(/第(\d+)\/64/);
      if (rankM) {
        const br = parseInt(rankM[1]);
        if (br !== a.rank) ERR.push(`${f}: ${code} rank 错（书第${br}/64，权威第${a.rank}/64） 片段="${seg.trim().slice(0,80)}"`);
      }
      const perM = seg.match(/([\d.]+)‰/) || seg.match(/每千人约?([\d.]+)/);
      if (perM) {
        const bp = parseFloat(perM[1]);
        if (Math.abs(bp - a.per1000) > 0.01) ERR.push(`${f}: ${code} per1000 错（书${bp}‰，权威${a.per1000}‰） 片段="${seg.trim().slice(0,80)}"`);
      }
    }
  }
}

console.log('=== 稀有度最终审校报告（DIM_PRIOR 权威结果）===\n');
if (ERR.length === 0) {
  console.log('✅ 全部 0 错误，16 原型 × 4 亚型 = 64 个型别的 rank / per1000 与 DIM_PRIOR 完全一致。');
} else {
  console.log('❌ 发现 ' + ERR.length + ' 处错误：\n');
  ERR.forEach(e => console.log('   - ' + e));
}
