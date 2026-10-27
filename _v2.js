const fs = require("fs");
const high = JSON.parse(fs.readFileSync("_high.json", "utf8"));
const mid = JSON.parse(fs.readFileSync("_mid.json", "utf8"));

// 地名后缀，用来从「大皮院走到尽头向北」里切出「大皮院」
const SUFFIX = /(街|路|巷|门|寺|院|坊|桥|十字|口|里|村|堡|坡|园|城|广场|大厦|花园)/;

function places(addr) {
  if (!addr) return [];
  const out = new Set();
  // 按分隔符切
  addr.split(/[\/、,，和及与]/).forEach(seg => {
    seg = seg.replace(/[（(].*?[）)]/g, "").trim();
    // 从每个片段里，找以地名后缀结尾的 2-5 字词
    const chars = Array.from(seg);
    for (let i = 0; i < chars.length; i++) {
      for (let len = 2; len <= 5; len++) {
        const w = chars.slice(i, i + len).join("");
        if (w.length < 2) continue;
        if (SUFFIX.test(w.slice(-1)) || SUFFIX.test(w.slice(-2))) {
          out.add(w);
        }
      }
    }
  });
  return [...out].filter(w => w.length >= 2 && w.length <= 5);
}

function check(r) {
  const ps = places(r.addr);
  if (!ps.length) return { ok: null, why: "资料没写地址" };
  const hit = ps.filter(p => (r.poiAddr || "").indexOf(p) > -1 || (r.poi || "").indexOf(p) > -1);
  return { ok: hit.length > 0, why: hit.length ? "地址吻合：" + hit.slice(0, 2).join("/") : "地址对不上：" + ps.slice(0, 3).join("/") };
}

const keep = [], drop = [], noAddr = [];
high.forEach(r => {
  const c = check(r);
  if (c.ok === true) keep.push({ ...r, note: c.why });
  else if (c.ok === false) drop.push({ ...r, note: c.why });
  else noAddr.push({ ...r, note: c.why });
});

console.log("=== 高置信 72 家的地址复核 ===");
console.log("地址对得上（保留）", keep.length);
console.log("地址对不上（剔除）", drop.length);
console.log("资料没写地址（看名字）", noAddr.length);

console.log("\n--- 剔除的（地址不合） ---");
drop.forEach(r => console.log(" ", r.n, "|", r.note, "| 搜到:", r.poi, "@", r.poiAddr.slice(0, 20)));

console.log("\n--- 保留的 ---");
keep.slice(0, 40).forEach(r => console.log(" ", r.n, "→", r.poi, "|", r.d + "km"));

fs.writeFileSync("_keep.json", JSON.stringify(keep, null, 1));
fs.writeFileSync("_noAddr.json", JSON.stringify(noAddr, null, 1));
