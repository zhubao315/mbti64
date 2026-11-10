// 稀有度自动修复脚本：把每章里写的 rank / per1000 替换成 DIM_PRIOR 权威结果
// 用法: node scripts/_fix_rarity.mjs
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

    // 修复 1: 段落里的 "TYPECODE-XX-Y 第N/64，每千人约X.XX"
    t = t.replace(/([A-Z]{4})-([A-CH])-([A-H])([^\n]{0,200}?)第(\d+)\/64([^\n]{0,120}?)每千人约?([\d.]+)/g, (m, base, ac, oh, mid, oldRank, post, oldPer) => {
      const code = `${base}-${ac}-${oh}`;
      const a = AUTH[code];
      if (!a) return m;
      let replaced = m;
      if (parseInt(oldRank) !== a.rank) {
        replaced = replaced.replace(`第${oldRank}/64`, `第${a.rank}/64`);
      }
      if (Math.abs(parseFloat(oldPer) - a.per1000) > 0.01) {
        // 处理 "每千人约X.XX人" 或 "每千人约X.XX‰"
        const newPerStr = a.per1000 % 1 === 0 ? String(a.per1000) : a.per1000.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
        replaced = replaced.replace(new RegExp(oldPer.toString().replace(/\./,'\\.'), 'g'), newPerStr);
      }
      if (replaced !== m) fileChanges++;
      return replaced;
    });

    // 修复 2: 验证表里的 "TYPECODE-XX-Y 第N/64（X.XX‰）"
    t = t.replace(/([A-Z]{4})-([A-CH])-([A-H])[^\n|]*第(\d+)\/64[^\n|]*?\(([\d.]+)‰\)/g, (m, base, ac, oh, oldRank, oldPer) => {
      const code = `${base}-${ac}-${oh}`;
      const a = AUTH[code];
      if (!a) return m;
      let replaced = m;
      if (parseInt(oldRank) !== a.rank) replaced = replaced.replace(`第${oldRank}/64`, `第${a.rank}/64`);
      if (Math.abs(parseFloat(oldPer) - a.per1000) > 0.01) {
        const newPerStr = a.per1000 % 1 === 0 ? String(a.per1000) : a.per1000.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
        replaced = replaced.replace(`${oldPer}‰`, `${newPerStr}‰`);
      }
      if (replaced !== m) fileChanges++;
      return replaced;
    });

    // 修复 3: 段落里的 "TYPECODE-XX-Y 第N/64（X.XX‰）" 格式
    t = t.replace(/([A-Z]{4})-([A-CH])-([A-H])[^\n]{0,200}?第(\d+)\/64[^\n]{0,120}?\(([\d.]+)‰\)/g, (m, base, ac, oh, oldRank, oldPer) => {
      const code = `${base}-${ac}-${oh}`;
      const a = AUTH[code];
      if (!a) return m;
      let replaced = m;
      if (parseInt(oldRank) !== a.rank) replaced = replaced.replace(`第${oldRank}/64`, `第${a.rank}/64`);
      if (Math.abs(parseFloat(oldPer) - a.per1000) > 0.01) {
        const newPerStr = a.per1000 % 1 === 0 ? String(a.per1000) : a.per1000.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
        replaced = replaced.replace(`${oldPer}‰`, `${newPerStr}‰`);
      }
      if (replaced !== m) fileChanges++;
      return replaced;
    });

    if (t !== orig) {
      fs.writeFileSync(full, t, 'utf8');
      changedFiles.push({ file: f, fixes: fileChanges });
      totalFixes += fileChanges;
    }
  }
}

console.log('=== 自动修复完成 ===');
console.log('修复文件数：' + changedFiles.length);
console.log('总修复处数：' + totalFixes + '\n');
for (const c of changedFiles) console.log('✅ ' + c.file + ' 修复 ' + c.fixes + ' 处');
