// 第二轮暴力修复：直接按型别逐一替换 rank / per1000，不限上下文格式
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

// 所有 64 型
const ALL_CODES = [];
for (const b of BASE_CODES) for (const s of ['C-O','C-H','A-O','A-H']) ALL_CODES.push(`${b}-${s}`);

const root = path.join(process.cwd(), '书-千分之一的你');
const changedFiles = [];
let totalFixes = 0;

for (const vol of fs.readdirSync(root)) {
  const volPath = path.join(root, vol);
  if (!fs.statSync(volPath).isDirectory()) continue;
  for (const f of fs.readdirSync(volPath)) {
    if (!/^第\d+章-.+\.md$/.test(f)) continue;
    const full = path.join(volPath, f);
    let t = fs.readFileSync(full, 'utf8');
    const orig = t;
    let fileChanges = 0;

    for (const code of ALL_CODES) {
      if (!t.includes(code)) continue;
      const a = AUTH[code];
      // 暴力替换：在 code 之后 500 字符内，所有 "第\d+/64" 都替换成权威 rank
      // 但要小心不要误伤别的型别（所以只替换紧跟 code 之后的第一处/前几处）
      // 做法: 找出所有 code 出现的位置，然后在该位置后面 300 字符内替换第一个 "第\d+/64"
      let idx = 0;
      while (true) {
        const pos = t.indexOf(code, idx);
        if (pos === -1) break;
        const after = t.slice(pos, pos + 400);
        const rankMatch = after.match(/第(\d+)\/64/);
        if (rankMatch && parseInt(rankMatch[1]) !== a.rank) {
          const fullMatchStart = rankMatch.index + pos;
          const newStr = t.slice(0, fullMatchStart) + `第${a.rank}/64` + t.slice(fullMatchStart + rankMatch[0].length);
          if (newStr !== t) { fileChanges++; t = newStr; }
        }
        // 同理替换 per1000（如果有的话）
        const perMatch = after.match(/(?:每千人约?)?\(([\d.]+)‰\)/) || after.match(/每千人约?([\d.]+)/);
        if (perMatch) {
          const oldPer = parseFloat(perMatch[1]);
          if (Math.abs(oldPer - a.per1000) > 0.01) {
            const newPer = a.per1000 % 1 === 0 ? String(a.per1000) : a.per1000.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
            const fullMatchStart = perMatch.index + pos;
            let replaced = t.slice(0, fullMatchStart) + t.slice(fullMatchStart);
            // 用 replace 替换第一次出现
            replaced = replaced.replace(perMatch[0], perMatch[0].replace(perMatch[1], newPer));
            if (replaced !== t) { fileChanges++; t = replaced; }
          }
        }
        idx = pos + code.length;
      }
    }

    if (t !== orig) {
      fs.writeFileSync(full, t, 'utf8');
      changedFiles.push({ file: f, fixes: fileChanges });
      totalFixes += fileChanges;
    }
  }
}

console.log('=== 第二轮暴力修复完成 ===');
console.log('修复文件数：' + changedFiles.length);
console.log('总修复处数：' + totalFixes + '\n');
for (const c of changedFiles) console.log('✅ ' + c.file + ' 修复 ' + c.fixes + ' 处');
