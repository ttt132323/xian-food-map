const { chromium } = require("playwright-core");
const fs = require("fs");

const all = JSON.parse(fs.readFileSync("_q.json", "utf8"));
const from = parseInt(process.argv[2] || "0", 10);
const to = parseInt(process.argv[3] || "50", 10);
const batch = all.slice(from, to);

(async () => {
  const b = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  p.setDefaultTimeout(300000);
  await p.goto("https://ttt132323.github.io/xian-food-map/", { waitUntil: "load", timeout: 45000 });
  await p.waitForTimeout(5000);

  const t0 = Date.now();
  const res = await p.evaluate(async (list) => {
    const out = {};
    for (const item of list) {
      await new Promise((resolve) => {
        let done = false;
        const finish = (v) => { if (!done) { done = true; out[item.n] = v; resolve(); } };
        const ps = new AMap.PlaceSearch({ city: "西安", citylimit: true, pageSize: 3 });
        ps.search(item.q, (status, r) => {
          const pois = r && r.poiList && r.poiList.pois;
          if (status === "complete" && pois && pois.length) {
            finish(pois.map((x) => ({
              n: x.name,
              a: x.address || "",
              ty: x.type || "",
              lat: x.location.lat,
              lng: x.location.lng
            })));
          } else {
            finish([]);
          }
        });
        setTimeout(() => finish([]), 4000);
      });
      await new Promise((r) => setTimeout(r, 130));
    }
    return out;
  }, batch);

  console.log("耗时", Math.round((Date.now() - t0) / 1000), "秒，命中", Object.keys(res).filter(k => res[k].length).length, "/", batch.length);
  fs.writeFileSync(`_r${from}.json`, JSON.stringify(res, null, 1));
  await b.close();
})();
