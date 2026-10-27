const fs = require("fs");
const keep = JSON.parse(fs.readFileSync("_keep.json", "utf8"));
const mid = JSON.parse(fs.readFileSync("_mid.json", "utf8"));
const q = JSON.parse(fs.readFileSync("_q.json", "utf8"));

// 人工判断：这些是「店名 + 地址都对得上」的，可以直接用
const OK_KEEP = ["石家包子","哈里泡馍","星月楼","新凯涮肉","京顺祥","老门框铜锅涮肉","马健酱汁烤肉","马乐烤肉","白娃烤肉","郭楠烤肉","老兰家","东乡手抓","杨钊锅贴","崇斌","振兴路雷记"];
const OK_MID  = ["马二水饺","大学习巷串串","拙夫重庆火锅","蓝薄荷餐厅","彦彬炸元宵","矮子酥饼（麻家十字）","大学南路拴马桩","东关吉祥（吉祥村店）","赵记素斋（绿豆饼）","经九路早市","曲江池西村早市"];

const picked = {};
keep.forEach(r => { if (OK_KEEP.indexOf(r.n) > -1) picked[r.n] = { lat: r.lat, lng: r.lng, poi: r.poi, src: "exact" }; });
mid.forEach(r => { if (OK_MID.indexOf(r.n) > -1) picked[r.n] = { lat: r.lat, lng: r.lng, poi: r.poi, src: "exact" }; });

console.log("精确坐标确认", Object.keys(picked).length, "家");
Object.keys(picked).forEach(n => console.log("  ✓", n, "→", picked[n].poi));

// ---- 街区词典 ----
const AREA = [
  ["大皮院", 34.2652, 108.9390], ["洒金桥", 34.2655, 108.9338], ["红埠街", 34.2672, 108.9345],
  ["庙后街", 34.2658, 108.9378], ["光明巷", 34.2642, 108.9382], ["大学习巷", 34.2658, 108.9352],
  ["化觉巷", 34.2640, 108.9412], ["北广济街", 34.2655, 108.9365], ["广济街", 34.2650, 108.9360],
  ["西羊市", 34.2648, 108.9398], ["麦苋街", 34.2650, 108.9370], ["小皮院", 34.2655, 108.9385],
  ["大莲花池", 34.2678, 108.9395], ["麻家十字", 34.2648, 108.9385], ["回民街", 34.2637, 108.9410],
  ["东新街", 34.2708, 108.9640], ["解放路", 34.2710, 108.9535], ["东木头市", 34.2564, 108.9502],
  ["南院门", 34.2585, 108.9405], ["书院门", 34.2528, 108.9465], ["钟楼", 34.2610, 108.9422],
  ["小寨", 34.2230, 108.9440], ["大雁塔", 34.2186, 108.9640], ["曲江", 34.2050, 108.9700],
  ["高新区", 34.2200, 108.8800], ["未央路", 34.3100, 108.9450], ["凤城", 34.3300, 108.9400],
  ["北关", 34.2900, 108.9500], ["土门", 34.2650, 108.8900], ["纺织城", 34.2600, 109.0300],
  ["吉祥村", 34.2270, 108.9380], ["草场坡", 34.2420, 108.9500], ["大学南路", 34.2360, 108.9300],
  ["翠华路", 34.2180, 108.9550], ["南门外", 34.2480, 108.9450], ["红庙坡", 34.2950, 108.9200],
  ["经九路", 34.2600, 108.9900], ["曲江池", 34.2000, 108.9750], ["东关", 34.2600, 108.9750],
  ["西稍门", 34.2650, 108.9100], ["大唐不夜城", 34.2130, 108.9640], ["小南门", 34.2510, 108.9380]
];

function guessArea(addr) {
  if (!addr) return null;
  let best = null;
  AREA.forEach(([name, lat, lng]) => {
    if (addr.indexOf(name) > -1) {
      if (!best || name.length > best[0].length) best = [name, lat, lng];
    }
  });
  return best;
}

const areaHit = [], noHit = [];
q.forEach(item => {
  if (picked[item.n]) return;
  const g = guessArea(item.addr) || guessArea(item.n);
  if (g) areaHit.push({ n: item.n, area: g[0], lat: g[1], lng: g[2] });
  else noHit.push(item.n);
});

console.log("\n街区坐标可定位", areaHit.length, "家");
console.log("完全没线索", noHit.length, "家");
if (noHit.length) console.log("  ", noHit.join("、"));

fs.writeFileSync("_exact.json", JSON.stringify(picked, null, 1));
fs.writeFileSync("_area.json", JSON.stringify(areaHit, null, 1));
