const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = [];
  p.on("pageerror", e => errs.push(String(e.message).slice(0, 80)));
  await p.goto("file:///E:/workbuddy/xian-food-map/index.html", { waitUntil: "load" });
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => ({
    total: document.querySelectorAll(".shop").length,
    noPt: Array.from(document.querySelectorAll(".shop")).filter(e => e.textContent.indexOf("无点位") > -1).length
  }));
  console.log("总数", r.total, "| 无点位标记", r.noPt, "| 有坐标", r.total - r.noPt);
  console.log("errors:", errs.length ? errs : "none");
  await b.close();
})();
