const fs = require("fs");

const q = JSON.parse(fs.readFileSync("_q.json", "utf8"));
const raw = {};
[0, 50, 100].forEach(k => Object.assign(raw, JSON.parse(fs.readFileSync("_r" + k + ".json", "utf8"))));

const norm = s => (s || "").replace(/[（）()·\s\-—、,，]/g, "");

function nameScore(shop, poi) {
  const a = norm(shop), b = norm(poi);
  if (!a || !b) return 0;
  if (a === b) return 3;
  if (b.indexOf(a) > -1) return 3;
  if (a.indexOf(b) > -1 && b.length >= 2) return 2;
  const k3 = a.slice(0, 3);
  if (k3.length >= 3 && b.indexOf(k3) > -1) return 2;
  const k2 = a.slice(0, 2);
  if (k2.length >= 2 && b.indexOf(k2) > -1) return 1;
  return 0;
}

function addrScore(addr, poiAddr) {
  if (!addr) return 0;
  const sq = poiAddr || "";
  const keys = (addr.match(/[\u4e00-\u9fa5]{2,4}/g) || []);
  for (const k of keys) if (k.length >= 2 && sq.indexOf(k) > -1) return 1;
  return 0;
}

function distKm(a1, o1, a2, o2) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (a2 - a1) * rad, dLng = (o2 - o1) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a1 * rad) * Math.cos(a2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const XA = [34.2795, 108.9535];
const high = [], mid = [], low = [];

q.forEach(item => {
  const pois = raw[item.n] || [];
  if (!pois.length) { low.push({ n: item.n, why: "搜不到" }); return; }

  let best = null;
  pois.forEach(poi => {
    const ns = nameScore(item.n, poi.n);
    const as = addrScore(item.addr, poi.a);
    const d = distKm(XA[0], XA[1], poi.lat, poi.lng);
    const total = ns * 2 + as * 3 - (d > 15 ? 20 : 0);
    if (!best || total > best.total) best = { poi, ns, as, d, total };
  });

  const rec = {
    n: item.n, addr: item.addr,
    poi: best.poi.n, poiAddr: best.poi.a,
    d: +best.d.toFixed(1), lat: best.poi.lat, lng: best.poi.lng,
    ns: best.ns, as: best.as
  };

  if (best.d > 15) low.push({ ...rec, why: "太远" });
  else if (best.ns === 3) high.push(rec);
  else if (best.ns === 2 && best.as === 1) high.push(rec);
  else if (best.ns === 2 || (best.ns === 1 && best.as === 1)) mid.push(rec);
  else low.push({ ...rec, why: "名字对不上" });
});

console.log("=== 统计 ===");
console.log("高置信（直接用）", high.length);
console.log("待定（我要人工看）", mid.length);
console.log("丢弃", low.length);

fs.writeFileSync("_high.json", JSON.stringify(high, null, 1));
fs.writeFileSync("_mid.json", JSON.stringify(mid, null, 1));
fs.writeFileSync("_low.json", JSON.stringify(low, null, 1));

console.log("\n=== 高置信样例（前 12） ===");
high.slice(0, 12).forEach(r => console.log(" ", r.n, "→", r.poi, "|", r.poiAddr.slice(0, 24), "|", r.d + "km"));

console.log("\n=== 待定样例（前 10） ===");
mid.slice(0, 10).forEach(r => console.log(" ", r.n, "(", r.addr, ") →", r.poi, "|", r.poiAddr.slice(0, 24), "|", r.d + "km"));

console.log("\n=== 丢弃样例（前 8） ===");
low.slice(0, 8).forEach(r => console.log(" ", r.n, "|", r.why, r.poi ? "→ " + r.poi : ""));
