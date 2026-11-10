// 权威 64 型完整排名，按 base 型分组输出
const DIM_PRIOR = { EI: 0.55, SN: 0.65, TF: 0.5, JP: 0.55, AC: 0.6, OH: 0.45 };
const BASE_CODES = [
  'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFP','ENFJ',
  'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'
];
const SUFFIXES = ['C-O','C-H','A-O','A-H'];
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
for (const b of BASE_CODES) for (const s of SUFFIXES) all.push({ code: `${b}-${s}`, p: prior(b, s) });
all.sort((a, b) => a.p - b.p || a.code.localeCompare(b.code));
let rank = 1;
for (let i = 0; i < all.length; i++) {
  if (i > 0 && Math.abs(all[i].p - all[i-1].p) > 1e-15) rank = i + 1;
  all[i].rank = rank;
  all[i].per1000 = Math.round(all[i].p * 100000) / 100;
}

console.log('=== 16 base × 4 suffix 完整权威排名 ===');
for (const b of BASE_CODES) {
  console.log('\n' + b + ':');
  for (const s of SUFFIXES) {
    const r = all.find(x => x.code === `${b}-${s}`);
    console.log(`  ${b}-${s.padEnd(3)}  rank=${String(r.rank).padStart(2)}/64  per1000=${r.per1000}‰  prior=${r.p.toFixed(6)}`);
  }
}
