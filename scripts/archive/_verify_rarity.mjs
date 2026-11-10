// 直接内联 DIM_PRIOR，验证 ENTP 四态真实排名
const DIM_PRIOR = { EI: 0.55, SN: 0.65, TF: 0.5, JP: 0.55, AC: 0.6, OH: 0.45 };
const BASE_CODES = [
  'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFP','ENFJ',
  'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'
];
const SUFFIXES = ['C-O','A-O','A-H','C-H'];

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

// 给每个型别打排名（同概率同 rank，用竞争排名）
let rank = 1;
for (let i = 0; i < all.length; i++) {
  if (i > 0 && Math.abs(all[i].p - all[i-1].p) > 1e-15) rank = i + 1;
  all[i].rank = rank;
  all[i].per1000 = Math.round(all[i].p * 100000) / 100;
}

const TARGETS = ['ENTP-C-O','ENTP-A-O','ENTP-A-H','ENTP-C-H'];
console.log('=== ENTP 四态真实排名（DIM_PRIOR）===');
for (const t of TARGETS) {
  const r = all.find(x => x.code === t);
  console.log(t, 'rank=' + r.rank + '/64', 'per1000=' + r.per1000 + '‰', 'prior=' + r.p.toFixed(6));
}
console.log('\n=== 全书 TOP 20（最稀有）===');
for (let i = 0; i < 20; i++) {
  const r = all[i];
  console.log((i+1) + '. ' + r.code + ' rank=' + r.rank + ' p=' + r.per1000 + '‰');
}
console.log('\n=== 全书 BOTTOM 20（最常见）===');
for (let i = 44; i < 64; i++) {
  const r = all[i];
  console.log((i+1) + '. ' + r.code + ' rank=' + r.rank + ' p=' + r.per1000 + '‰');
}
