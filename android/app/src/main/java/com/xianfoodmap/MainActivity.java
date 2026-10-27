package com.xianfoodmap;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

/**
 * 一个 WebView 壳。
 *
 * 优先加载 GitHub Pages 上的在线版（改页面不用重新打包）；
 * 在线版打不开时自动退回打包在 assets 里的离线版。
 *
 * 两种来源都跑在 https 下：
 *  - 在线：https://<user>.github.io/xian-food-map/
 *  - 本地：https://appassets.androidplatform.net/assets/index.html
 * 这样浏览器的定位 API 才被允许，高德 Key 的域名白名单也只需配这两个域名。
 */
public class MainActivity extends Activity {

    private static final String LOCAL_URL = "https://appassets.androidplatform.net/assets/index.html";
    private static final int REQ_LOCATION = 1001;

    private WebView web;
    private WebViewAssetLoader assetLoader;
    private boolean fellBack = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        web.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                                                           GeolocationPermissions.Callback callback) {
                // 页面要定位时直接放行（App 层面已经申请过系统权限）
                callback.invoke(origin, true, false);
            }
        });

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                String scheme = u.getScheme() == null ? "" : u.getScheme();
                // 站内页面自己处理
                if (scheme.startsWith("http") &&
                        ("appassets.androidplatform.net".equals(u.getHost())
                                || (u.getHost() != null && u.getHost().endsWith("github.io")))) {
                    return false;
                }
                // 其余（amap:// 、tel: 、外链）交给系统
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) {
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) fallbackToLocal();
            }
        });

        setContentView(web);

        askLocationPermission();
        loadStartPage();
    }

    private void loadStartPage() {
        String online = getString(R.string.site_url);
        if (online != null && online.startsWith("http") && !online.contains("YOURNAME")) {
            web.loadUrl(online);
        } else {
            web.loadUrl(LOCAL_URL);
        }
    }

    private void fallbackToLocal() {
        if (fellBack) return;
        fellBack = true;
        Toast.makeText(this, R.string.offline_tip, Toast.LENGTH_SHORT).show();
        web.loadUrl(LOCAL_URL);
    }

    private void askLocationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(
                        new String[]{
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                        }, REQ_LOCATION);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        // 拒绝也不阻断使用，页面上会提示「定位失败」
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
