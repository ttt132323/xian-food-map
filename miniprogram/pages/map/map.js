const data = require('../../utils/data.js');
const app = getApp();

function points() {
  return data.shops.filter(function (s) { return s.la !== null; });
}

function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(x));
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
    // 用组内第一家店的坐标当这个片区的位置
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

Page({
  data: {
    lat: 34.267,
    lng: 108.948,
    scale: 13,
    markers: [],
    cur: null,
    dist: "",
    areaList: []
  },

  onLoad(q) {
    const my = app.globalData;
    let lat = 34.267;
    let lng = 108.948;
    let scale = 13;
    let cur = null;
    let list = points();

    if (my.myLat !== null) {
      lat = my.myLat;
      lng = my.myLng;
    }

    if (q && q.name) {
      const n = decodeURIComponent(q.name);
      const hit = list.filter(function (s) { return s.n === n; })[0];
      if (hit) {
        cur = hit;
        lat = hit.la;
        lng = hit.ln;
        scale = 16;
        // 只显示这一家，别的不打扰
        list = [hit];
      }
    }

    const markers = buildMarkers(list, cur);

    this.setData({
      lat: lat, lng: lng, scale: scale,
      markers: markers, cur: cur,
      dist: this.distText(cur), areaList: []
    });

    wx.setNavigationBarTitle({
      title: cur ? cur.n : "附近 " + markers.length + " 个点"
    });
  },

  /* 点全部时把 141 个点补回来 */
  resetMarkers() {
    return buildMarkers(points(), null);
  },

  distText(s) {
    if (!s || s.la === null) return "";
    const my = app.globalData;
    if (my.myLat !== null) {
      return "距我 " + distKm(my.myLat, my.myLng, s.la, s.ln).toFixed(1) + " km";
    }
    if (s.d !== null && s.d !== undefined) {
      return "距西安站 " + Number(s.d).toFixed(1) + " km";
    }
    return "";
  },

  onMarker(e) {
    const m = this.data.markers.filter(function (x) { return x.id === e.detail.markerId; })[0];
    if (!m) return;

    if (m.isArea) {
      this.setData({
        cur: {
          n: m.areaName + " 一带",
          a: "这一片没有精确坐标",
          t: m.areaShops.length + " 家店",
          la: m.latitude,
          ln: m.longitude
        },
        areaList: m.areaShops,
        lat: m.latitude,
        lng: m.longitude,
        scale: this.data.scale,
        dist: ""
      });
      wx.setNavigationBarTitle({ title: m.areaName });
      return;
    }

    const s = points().filter(function (x) { return x.n === m.shopName; })[0];
    if (!s) return;
    this.setData({
      cur: s, areaList: [],
      lat: s.la, lng: s.ln, scale: 15,
      dist: this.distText(s)
    });
    wx.setNavigationBarTitle({ title: s.n });
  },

  showAll() {
    const markers = buildMarkers(points(), null);
    this.setData({
      markers: markers,
      incPts: markers.map(function (m) { return { latitude: m.latitude, longitude: m.longitude }; }),
      cur: null, dist: "", areaList: []
    });
    wx.setNavigationBarTitle({ title: "全部 " + markers.length + " 个点" });
  },

  navTo() {
    const s = this.data.cur;
    if (!s) return;
    wx.openLocation({
      latitude: s.la, longitude: s.ln,
      name: s.n, address: s.a, scale: 17
    });
  },

  /* 小程序跳不了美团（微信不让跳外部网页），只能复制店名让用户自己去搜 */
  copyName() {
    const s = this.data.cur;
    if (!s) return;
    wx.setClipboardData({
      data: s.n,
      success: function () {
        wx.showToast({ title: "已复制，去美团搜", icon: "none", duration: 2000 });
      }
    });
  },

  copyArea() {
    const list = this.data.areaList || [];
    if (!list.length) return;
    wx.setClipboardData({
      data: list.join("\n"),
      success: function () {
        wx.showToast({ title: "已复制 " + list.length + " 个店名", icon: "none", duration: 2000 });
      }
    });
  }
});
