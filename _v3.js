const fs = require("fs");
const q = JSON.parse(fs.readFileSync("_q.json", "utf8"));
const raw = {};
[0, 50, 100].forEach(k => Object.assign(raw, JSON.parse(fs.readFileSync("_r" + k + ".json", "utf8"))));

const norm = s => (s || "").replace(/[（）()·\s\-—、,，]/g, "");

// 字符重叠率：店名的字有多少出现在 POI 名里
function overlap(shop, poi) {
  const a = Array.from(norm(shop)), b = new Set(Array.from(norm(poi)));
  if (!a.length) return 0;
  let hit = 0;
  a.forEach(c => { if (b.has(c)) hit++; });
  return hit / a.length;
}

function distKm(a1, o1, a2, o2) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (a2 - a1) * rad, dLng = (o2 - o1) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a1 * rad) * Math.cos(a2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const XA = [34.2795, 108.9535];

// 街区词典（和之前一致）
const AREA = [["大皮院",34.2652,108.9390],["洒金桥",34.2655,108.9338],["红埠街",34.2672,108.9345],["庙后街",34.2658,108.9378],["光明巷",34.2642,108.9382],["大学习巷",34.2658,108.9352],["化觉巷",34.2640,108.9412],["北广济街",34.2655,108.9365],["广济街",34.2650,108.9360],["西羊市",34.2648,108.9398],["麦苋街",34.2650,108.9370],["小皮院",34.2655,108.9385],["大莲花池",34.2678,108.9395],["麻家十字",34.2648,108.9385],["回民街",34.2637,108.9410],["东新街",34.2708,108.9640],["解放路",34.2710,108.9535],["东木头市",34.2564,108.9502],["南院门",34.2585,108.9405],["书院门",34.2528,108.9465],["钟楼",34.2610,108.9422],["小寨",34.2230,108.9440],["大雁塔",34.2186,108.9640],["曲江",34.2050,108.9700],["高新区",34.2200,108.8800],["未央路",34.3100,108.9450],["凤城",34.3300,108.9400],["北关",34.2900,108.9500],["土门",34.2650,108.8900],["纺织城",34.2600,108.1090*0+109.0300],["吉祥村",34.2270,108.9380],["草场坡",34.2420,108.9500],["大学南路",34.2360,108.9300],["翠华路",34.2180,108.9550],["南门外",34.2480,108.9450],["红庙坡",34.2950,108.9200],["经九路",34.2600,108.9900],["曲江池",34.2000,108.9750],["东关",34.2600,108.9750],["西稍门",34.2650,108.9100],["大唐不夜城",34.2130,108.9640],["小南门",34.2510,108.9380],["凤城五路",34.3280,108.9330],["凤城九路",34.3450,108.9350],["凤城十二路",34.3600,108.9350],["北大街",34.2680,108.9450],["西大街",34.2625,108.9380],["粉巷",34.2570,108.9415],["四府街",34.2575,108.9430],["建国门",34.2520,108.9560],["和平门",34.2540,108.9600]];

function areaOf(addr) {
  if (!addr) return null;
  let best = null;
  AREA.forEach(([name, lat, lng]) => {
    if (addr.indexOf(name) > -1 && (!best || name.length > best[0].length)) best = [name, lat, lng];
  });
  return best;
}

const exact = [], areaOnly = [], none = [];

q.forEach(item => {
  const pois = raw[item.n] || [];
  let best = null;
  pois.forEach(poi => {
    const ov = overlap(item.n, poi.n);
    const d = distKm(XA[0], XA[1], poi.lat, poi.lng);
    if (d > 15) return;
    const score = ov * 10 - d * 0.1;
    if (!best || score > best.score) best = { poi, ov, d, score };
  });

  if (best && best.ov >= 0.7) {
    exact.push({ n: item.n, poi: best.poi.n, poiAddr: best.poi.a, lat: best.poi.lat, lng: best.poi.lng, ov: +best.ov.toFixed(2), d: +best.d.toFixed(1) });
    return;
  }
  const g = areaOf(item.addr) || areaOf(item.n);
  if (g) areaOnly.push({ n: item.n, area: g[0], lat: g[1], lng: g[2] });
  else none.push(item.n);
});

console.log("=== 新规则结果 ===");
console.log("精确（重叠≥0.7 且 <15km）", exact.length);
console.log("只有街区", areaOnly.length);
console.log("完全没线索", none.length);
console.log("\n--- 精确的新增中最可疑的（重叠刚好 0.7-0.8） ---");
exact.filter(r => r.ov < 0.85).slice(0, 25).forEach(r => console.log("  " + r.ov + " | " + r.n + " → " + r.poi + " @" + r.poiAddr.slice(0, 20) + " " + r.d + "km"));
fs.writeFileSync("_exact2.json", JSON.stringify(exact, null, 1));
fs.writeFileSync("_area2.json", JSON.stringify(areaOnly, null, 1));
