const data = require('../../utils/data.js');
const app = getApp();

/* 可以当作「出发点」的地标。不依赖定位权限，选一个就按它排序。 */
const ANCHORS = [
  { n: '西安站', short: '距站', lat: 34.2795, lng: 108.9535 },
  { n: '钟楼', short: '距钟楼', lat: 34.2610, lng: 108.9422 },
  { n: '回民街', short: '距回坊', lat: 34.2637, lng: 108.9410 },
  { n: '小寨', short: '距小寨', lat: 34.2230, lng: 108.9440 },
  { n: '大雁塔', short: '距大雁塔', lat: 34.2186, lng: 108.9640 }
];

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
    q: '',
    slot: '',
    cat: 'all',
    cats: data.cats,
    slots: data.slots,
    list: [],
    countText: '',
    located: false,
    anchor: ANCHORS[0],
    anchorName: ANCHORS[0].n
  },

  onLoad() {
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  onSearch(e) {
    this.setData({ q: (e.detail.value || '').trim().toLowerCase() });
    this.refresh();
  },

  pickSlot(e) {
    this.setData({ slot: e.currentTarget.dataset.v || '' });
    this.refresh();
  },

  pickCat(e) {
    this.setData({ cat: e.currentTarget.dataset.v || 'all' });
    this.refresh();
  },

  /* 选出发点：地标，或者用当前位置 */
  pickAnchor() {
    const that = this;
    const items = ANCHORS.map(function (a) { return a.n; });
    items.push('我的位置');

    wx.showActionSheet({
      itemList: items,
      success(res) {
        if (res.tapIndex === ANCHORS.length) {
          that.locate();
          return;
        }
        const a = ANCHORS[res.tapIndex];
        that.setData({ anchor: a, anchorName: a.n });
        that.refresh();
      }
    });
  },

  refresh() {
    const q = this.data.q;
    const slot = this.data.slot;
    const cat = this.data.cat;
    const anchor = this.data.anchor;

    let list = data.shops.filter(function (s) {
      if (slot && s.win && s.win.length && s.win.indexOf(slot) < 0) return false;
      if (cat !== 'all' && s.c !== cat) return false;
      if (q) {
        const hay = (s.n + s.a + s.t).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });

    list = list.map(function (s, i) {
      let dd = '';
      let dl = '';
      if (s.la !== null) {
        dd = distKm(anchor.lat, anchor.lng, s.la, s.ln).toFixed(1);
        dl = anchor.short;
      } else if (s.d !== null && s.d !== undefined) {
        dd = Number(s.d).toFixed(1);
        dl = '距站';
      }
      const openTag = !!slot && s.win && s.win.length > 0;
      const open = openTag ? s.win.indexOf(slot) > -1 : false;

      return Object.assign({}, s, {
        dd: dd,
        dl: dl,
        open: open,
        openTag: openTag,
        k: 's' + i
      });
    });

    list.sort(function (a, b) {
      const va = parseFloat(a.dd) || 99;
      const vb = parseFloat(b.dd) || 99;
      return va - vb;
    });

    this.setData({
      list: list,
      countText: '共 ' + list.length + ' 家'
    });
  },

  locate() {
    const that = this;

    wx.getLocation({
      type: 'gcj02',
      success: function (res) {
        that.setData({
          located: true,
          anchorName: '我的位置',
          anchor: { n: '我的位置', short: '距我', lat: res.latitude, lng: res.longitude }
        });
        that.refresh();
        wx.showToast({ title: '已按你的位置排序', icon: 'none' });
      },
      fail: function () {
        wx.showModal({
          title: '定位没成功',
          content: '可能是没给权限，或者小程序还没开通 getLocation 接口。\n\n不用定位也能用：点左边那个「从 西安站」，选一个地标当出发点。',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
  },

  openMap(e) {
    const s = this.data.list[e.currentTarget.dataset.i];
    if (!s) return;
    if (s.la === null) {
      wx.showModal({
        title: s.n,
        content: '这家只记了名字和大概位置，没有精确坐标，地图上标不出来。\n复制店名，去高德或腾讯地图搜一下就有了。',
        confirmText: '复制店名',
        cancelText: '知道了',
        success: function (r) {
          if (r.confirm) wx.setClipboardData({ data: s.n });
        }
      });
      return;
    }
    wx.navigateTo({ url: '/pages/map/map?name=' + encodeURIComponent(s.n) });
  }
});
