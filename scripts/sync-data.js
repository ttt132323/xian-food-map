#!/usr/bin/env node
/**
 * 从 index.html 抽出店铺数据，生成 miniprogram/utils/data.js
 *
 * 网页版是数据源头。改完 index.html 里的 DATA / TABLE 之后跑一次：
 *   node scripts/sync-data.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function grabArr(name) {
  const m = html.match(new RegExp('var ' + name + ' = ([\\s\\S]*?)\\n  \\];'));
  if (!m) throw new Error('在 index.html 里找不到 ' + name);
  return eval('(' + m[1] + '])');
}

function grabObj(name) {
  const m = html.match(new RegExp('var ' + name + ' = ([\\s\\S]*?)\\n  \\};'));
  if (!m) throw new Error('在 index.html 里找不到 ' + name);
  return eval('(' + m[1] + '})');
}

function shopCat(t) {
  if (t.indexOf('烤肉') > -1) return 'bbq';
  if (t.indexOf('凉皮') > -1 || t.indexOf('肉夹馍') > -1 || t.indexOf('包子') > -1 ||
      t.indexOf('甑糕') > -1 || t.indexOf('糊辣汤') > -1 || t.indexOf('卤味') > -1 ||
      t.indexOf('小吃') > -1) return 'snack';
  if (t.indexOf('泡馍') > -1 || t.indexOf('小炒') > -1 || t.indexOf('面食') > -1 ||
      t.indexOf('饺子') > -1 || t.indexOf('烩菜') > -1) return 'staple';
  return 'meal';
}

function tableCat(id) {
  if (id === 'kaorou2') return 'bbq';
  if (id === 'xiaochi2') return 'snack';
  if (id === 'xicai') return 'dessert';
  return id === 'mianshi' ? 'staple' : 'meal';
}

const DATA = grabArr('DATA');
const TABLE = grabArr('TABLE');
const INDEX = grabArr('INDEX');
const MARKET = grabArr('MARKET');
const PTS = grabObj('SHOP_PTS');
const GEO = grabObj('GEO');

const out = [];
const seen = {};

function geoOf(name) {
  const g = GEO[name];
  return g ? { la: g[0], ln: g[1], lv: g[2] } : { la: null, ln: null, lv: -1 };
}

DATA.forEach(function (d) {
  seen[d.name] = 1;
  const p = PTS[d.id];
  out.push({
    n: d.name,
    a: d.area,
    t: d.type,
    c: shopCat(d.type),
    d: d.dist,
    la: p ? p[0] : (geoOf(d.name).la),
    ln: p ? p[1] : (geoOf(d.name).ln),
    lv: p ? 1 : geoOf(d.name).lv,
    win: d.windows || []
  });
});

TABLE.forEach(function (c) {
  c.rows.forEach(function (r) {
    if (seen[r.n]) return;
    seen[r.n] = 1;
    const m = /约\s*([\d.]+)\s*km/.exec(r.loc || '');
    out.push({
      n: r.n,
      a: r.loc || c.name,
      t: c.name,
      c: tableCat(c.id),
      d: m ? parseFloat(m[1]) : null,
      la: geoOf(r.n).la,
      ln: geoOf(r.n).ln,
      lv: geoOf(r.n).lv,
      win: []
    });
  });
});

/* 本地清单：同一家店换个叫法的跳过 */
const ALIAS = {
  '大皮院一真楼': 1, '马宾（小炒）': 1, '春发生葫芦头': 1,
  '红埠街白牙牙': 1, '红埠街壹佳烤肉': 1, '郭楠': 1, '全盛斋': 1
};
const IDX_CAT = {
  paomo: 'staple', hulatang: 'snack', kaorou: 'bbq', mipi: 'snack',
  roujiamo: 'snack', shuipen: 'staple', chaocai: 'meal', dianxin: 'dessert'
};

INDEX.forEach(function (c) {
  c.items.forEach(function (r) {
    if (ALIAS[r.n] || seen[r.n]) return;
    seen[r.n] = 1;
    out.push({
      n: r.n,
      a: r.loc || c.name,
      t: c.name,
      c: IDX_CAT[c.id] || 'snack',
      d: null,
      la: geoOf(r.n).la,
      ln: geoOf(r.n).ln,
      lv: geoOf(r.n).lv,
      win: []
    });
  });
});

MARKET.forEach(function (m) {
  if (seen[m.name]) return;
  seen[m.name] = 1;
  out.push({
    n: m.name,
    a: m.area,
    t: '早市',
    c: 'morning',
    d: m.dist,
    la: geoOf(m.name).la,
    ln: geoOf(m.name).ln,
    lv: geoOf(m.name).lv,
    note: m.go || '',
    win: ['morning']
  });
});

const cats = [
  { id: 'all', n: '全部' },
  { id: 'staple', n: '主食' },
  { id: 'snack', n: '小吃' },
  { id: 'bbq', n: '烤肉' },
  { id: 'meal', n: '正餐' },
  { id: 'dessert', n: '甜点' },
  { id: 'morning', n: '早市' }
];

const slots = [
  { id: '', n: '不限' },
  { id: 'morning', n: '上午' },
  { id: 'noon', n: '午间' },
  { id: 'afternoon', n: '下午' },
  { id: 'evening', n: '傍晚' },
  { id: 'late', n: '深夜' }
];

const body = 'module.exports = {\n  shops: ' + JSON.stringify(out) +
  ',\n  cats: ' + JSON.stringify(cats) +
  ',\n  slots: ' + JSON.stringify(slots) + '\n};\n';

const target = path.join(root, 'miniprogram/utils/data.js');
fs.writeFileSync(target, body);

console.log('已写入 ' + path.relative(root, target));
console.log('  店铺 ' + out.length + ' 家，其中有坐标 ' + out.filter(function (s) { return s.la !== null; }).length + ' 家');
