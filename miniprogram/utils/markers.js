const data = require('./data.js');

function points() {
  return data.shops.filter(function (s) { return s.la !== null; });
}

/* 把同一片区的店合并成一个点。list 可传子集，cur 用来突出当前店 */
function buildMarkers(list, cur) {
  const pts = list || points();
  const exact = pts.filter(function (s) { return s.lv === 1; });
  const loose = pts.filter(function (s) { return s.lv !== 1; });

  const groups = {};
  loose.forEach(function (s) {
    const key = (s.a || "未知").split(" · ")[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  const markers = [];
  exact.forEach(function (s) {
    const isCur = cur && s.n === cur.n;
    markers.push({
      id: markers.length,
      latitude: s.la,
      longitude: s.ln,
      width: isCur ? 36 : 24,
      height: isCur ? 36 : 24,
      iconPath: "/images/pin.png",
      shopName: s.n,
      isArea: false,
      callout: {
        content: s.n,
        color: "#241F1A",
        fontSize: 11,
        borderRadius: 6,
        padding: 6,
        bgColor: "#FFFCF6",
        display: "BYCLICK"
      }
    });
  });

  Object.keys(groups).forEach(function (key) {
    const arr = groups[key];
    const anchor = arr[0];
    markers.push({
      id: markers.length,
      latitude: anchor.la,
      longitude: anchor.ln,
      width: 22,
      height: 22,
      iconPath: "/images/dot.png",
      shopName: "",
      isArea: true,
      areaName: key,
      areaShops: arr.map(function (s) { return s.n; }),
      callout: {
        content: key + " · " + arr.length + " 家",
        color: "#5B5145",
        fontSize: 11,
        borderRadius: 6,
        padding: 6,
        bgColor: "#FFFCF6",
        display: "BYCLICK"
      }
    });
  });

  return markers;
}

module.exports = { points: points, buildMarkers: buildMarkers };
