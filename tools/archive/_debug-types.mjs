import { readFileSync } from "node:fs";
const src = readFileSync("data/types64.ts", "utf8");

// 直接正则扫所有字段出现位置，按顺序配对
const codeRe = /code:\s*"([A-Z]{4})"/g;
const cnRe = /cn:\s*"([^"]+)"/g;
const groupRe = /group:\s*"(\w+)"/g;
const tagRe = /tagline:\s*"([^"]+)"/g;

const pos = (re) => {
  const arr = [];
  let m;
  while ((m = re.exec(src))) arr.push({ idx: m.index, val: m[1] });
  re.lastIndex = 0;
  return arr;
};

const codes = pos(codeRe);
const cns = pos(cnRe);
const groups = pos(groupRe);
const tags = pos(tagRe);

console.log("codes", codes.length, "cns", cns.length, "groups", groups.length, "tags", tags.length);

const baseMap = {};
for (const c of codes) {
  // cn 在这个 code 之后、下一个 code 之前
  const nextCode = codes.find((x) => x.idx > c.idx);
  const end = nextCode ? nextCode.idx : src.length;
  const cn = cns.find((x) => x.idx > c.idx && x.idx < end);
  const gr = groups.find((x) => x.idx > c.idx && x.idx < end);
  const tg = tags.find((x) => x.idx > c.idx && x.idx < end);
  baseMap[c.val] = {
    cn: cn ? cn.val : c.val,
    group: gr ? gr.val : "analyst",
    tagline: tg ? tg.val : "",
  };
}
console.log("baseMap", Object.keys(baseMap).length);
console.log(JSON.stringify(baseMap["INTJ"]));
console.log(JSON.stringify(baseMap["ENFP"]));
