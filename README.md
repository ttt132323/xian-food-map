# 西安吃在哪

西安觅食地图，169 家店。左边筛，右边看，点一家在地图上定位，选几家自动串成最优路线。

数据来自一位常住西安的朋友（2025 年 4 月）和他维护的一份 Excel，不是必吃榜。

## 三种用法

| | |
|---|---|
| **网页** | 打开 `index.html`，或访问 https://ttt132323.github.io/xian-food-map/ |
| **Android** | 装 `dist/西安吃在哪-1.0-debug.apk` |
| **微信小程序** | 用微信开发者工具导入 `miniprogram/`，填自己的 AppID |

网页版功能最全（地图、定位、单点导航、多点最优路线）。Android 是它的套壳，小程序是原生重写，少了「多点路线」——微信 map 组件没有路径规划接口。

## ⚠️ 地图空白的话

高德 Key 配了域名白名单之后，`file://` 双击打开会被拒（没有域名）。要么用本地服务器：

```bash
python -m http.server 8080   # 然后开 http://localhost:8080
```

要么直接用上面的 Pages 地址。白名单里要有 `ttt132323.github.io` 和 `localhost`。

## 目录

```
index.html      网页版全部代码
android/        WebView 壳，gradle assembleDebug 出 APK
miniprogram/    小程序，导入微信开发者工具
scripts/        从 index.html 抽数据给小程序
dist/           编好的 APK
```

改了店铺数据，跑一次 `node scripts/sync-data.js` 同步给小程序。

## 说明

- 坐标是街区级估算，误差几百米。导航用的是高德实时算的路线，那个才准。
- 店铺会搬家、换老板。本地人的原话是「哪家都不能保证永远好吃，先少要点尝尝」。

代码 MIT。
