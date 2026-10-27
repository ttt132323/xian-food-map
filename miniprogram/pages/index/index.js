const data = require('../../utils/data.js');
const app = getApp();

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
    located: false
  },

  onLoad() {
    this.refresh();
  },

  onShow() {
    if (app.globalData.myLat !== null) {
      this.setData({ located: true });
      this.refresh();
    }
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

  refresh() {
    const q = this.data.q;
    const slot = this.data.slot;
    const cat = this.data.cat;
    const my = app.globalData;

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
      if (my.myLat !== null && s.la !== null) {
        dd = distKm(my.myLat, my.myLng, s.la, s.ln).toFixed(1);
        dl = '距我';
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
      countText: my.myLat !== null
        ? '以你为中心 · ' + list.length + ' 家'
        : list.length + ' 家 · 按到西安站的距离排'
    });
  },

  locate() {
    const that = this;
    const my = app.globalData;

    if (my.myLat !== null) {
      that.refresh();
      wx.showToast({ title: '已按你的位置排序', icon: 'none' });
      return;
    }

    wx.getLocation({
      type: 'gcj02',
      success: function (res) {
        my.myLat = res.latitude;
        my.myLng = res.longitude;
        that.setData({ located: true });
        that.refresh();
      },
      fail: function () {
        wx.showModal({
          title: '定位没成功',
          content: '需要允许定位权限。另外小程序还要在「开发管理 → 接口设置」里申请 getLocation，个人主体可能通不过。先用「距站」排序一样能查。',
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
  },

  navTo(e) {
    const s = this.data.list[e.currentTarget.dataset.i];
    if (!s) return;
    if (s.la === null) {
      wx.showModal({
        title: s.n,
        content: '这家只记了名字和大概位置，没有精确坐标，导航算不出来。\n复制店名，去高德或腾讯地图搜一下就有了。',
        confirmText: '复制店名',
        cancelText: '知道了',
        success: function (r) {
          if (r.confirm) wx.setClipboardData({ data: s.n });
        }
      });
      return;
    }
    wx.openLocation({
      latitude: s.la,
      longitude: s.ln,
      name: s.n,
      address: s.a,
      scale: 17
    });
  }
});
