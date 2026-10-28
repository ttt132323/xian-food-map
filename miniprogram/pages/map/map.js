const data = require('../../utils/data.js');
const app = getApp();
const mk = require('../../utils/markers.js');

const points = mk.points;
const buildMarkers = mk.buildMarkers;

function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

Page({
  data: {
    lat: 34.267,
    lng: 108.948,
    scale: 13,
    markers: [],
    cur: null,
    dist: "",
    areaList: [],
    incPts: []
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

    const upd = {
      cur: s, areaList: [],
      lat: s.la, lng: s.ln, scale: 15,
      dist: this.distText(s)
    };
    // 全量视图下点某个点，把这家放大；只看单店时不用重建
    if (this.data.markers.length > 1) {
      upd.markers = buildMarkers(points(), s);
      upd.incPts = [];
    }
    this.setData(upd);
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
    if (s.lv !== 1) {
      wx.showToast({ title: "这家只有片区位置，导航不准", icon: "none", duration: 2000 });
      return;
    }
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
