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

Page({
  data: {
    lat: 34.267,
    lng: 108.948,
    scale: 14,
    markers: [],
    incPts: [],
    cur: null,
    dist: ''
  },

  onLoad(q) {
    const pts = points();
    const markers = pts.map(function (s, i) {
      return {
        id: i,
        latitude: s.la,
        longitude: s.ln,
        width: 26,
        height: 26,
        iconPath: '/images/pin.png',
        callout: {
          content: s.n,
          color: '#241F1A',
          fontSize: 11,
          borderRadius: 6,
          padding: 6,
          bgColor: '#FFFCF6',
          display: 'BYCLICK'
        }
      };
    });

    const my = app.globalData;

    let lat = 34.267;
    let lng = 108.948;
    let scale = 14;
    let cur = null;

    if (my.myLat !== null) {
      lat = my.myLat;
      lng = my.myLng;
    }

    if (q && q.name) {
      const n = decodeURIComponent(q.name);
      for (let i = 0; i < pts.length; i++) {
        if (pts[i].n === n) {
          cur = pts[i];
          lat = cur.la;
          lng = cur.ln;
          scale = 15;
          break;
        }
      }
    }

    this.setData({
      lat: lat,
      lng: lng,
      scale: scale,
      markers: markers,
      incPts: [],
      cur: cur,
      dist: this.distText(cur)
    });

    if (cur) {
      wx.setNavigationBarTitle({ title: cur.n });
    } else {
      wx.setNavigationBarTitle({ title: '附近 ' + pts.length + ' 家' });
    }
  },

  distText(s) {
    if (!s || s.la === null) return '';
    const my = app.globalData;
    if (my.myLat !== null) {
      return '距我 ' + distKm(my.myLat, my.myLng, s.la, s.ln).toFixed(1) + ' km';
    }
    if (s.d !== null && s.d !== undefined) {
      return '距西安站 ' + Number(s.d).toFixed(1) + ' km';
    }
    return '';
  },

  onMarker(e) {
    const s = points()[e.detail.markerId];
    if (!s) return;
    this.setData({
      cur: s,
      lat: s.la,
      lng: s.ln,
      scale: 15,
      incPts: [],
      dist: this.distText(s)
    });
    wx.setNavigationBarTitle({ title: s.n });
  },

  showAll() {
    const pts = points();
    this.setData({
      incPts: pts.map(function (s) { return { latitude: s.la, longitude: s.ln }; }),
      cur: null,
      dist: ''
    });
    wx.setNavigationBarTitle({ title: '全部 ' + pts.length + ' 家' });
  },

  navTo() {
    const s = this.data.cur;
    if (!s) return;
    wx.openLocation({
      latitude: s.la,
      longitude: s.ln,
      name: s.n,
      address: s.a,
      scale: 17
    });
  }
});
