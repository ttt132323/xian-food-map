const data = require('../../utils/data.js');
const app = getApp();

function points() {
  return data.shops.filter(function (s) { return s.la !== null; });
}

Page({
  data: {
    lat: 34.267,
    lng: 108.948,
    scale: 13,
    markers: [],
    cur: null
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
    let scale = 13;
    let cur = null;

    if (my.myLat !== null) {
      lat = my.myLat;
      lng = my.myLng;
      scale = 14;
    }

    if (q && q.name) {
      const n = decodeURIComponent(q.name);
      for (let i = 0; i < pts.length; i++) {
        if (pts[i].n === n) {
          cur = pts[i];
          lat = cur.la;
          lng = cur.ln;
          scale = 16;
          break;
        }
      }
    }

    this.setData({ lat: lat, lng: lng, scale: scale, markers: markers, cur: cur });
  },

  onMarker(e) {
    const s = points()[e.detail.markerId];
    if (!s) return;
    this.setData({ cur: s, lat: s.la, lng: s.ln, scale: 16 });
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
  },

  close() {
    this.setData({ cur: null });
  }
});
