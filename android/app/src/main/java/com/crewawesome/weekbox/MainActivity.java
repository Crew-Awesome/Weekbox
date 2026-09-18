package com.crewawesome.weekbox;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Window;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppManagerPlugin.class);
        super.onCreate(savedInstanceState);

        boolean isTablet = getResources().getConfiguration().smallestScreenWidthDp >= 600;
        if (!isTablet) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    @CapacitorPlugin(name = "AppManager")
    public static class AppManagerPlugin extends Plugin {
        private BroadcastReceiver packageReceiver;

        @Override
        public void load() {
            super.load();
            try {
                packageReceiver = new BroadcastReceiver() {
                    @Override
                    public void onReceive(Context context, Intent intent) {
                        String action = intent.getAction();
                        Uri data = intent.getData();
                        String pkgName = data != null ? data.getSchemeSpecificPart() : null;
                        JSObject payload = new JSObject();
                        payload.put("packageName", pkgName);
                        payload.put("action", action);
                        notifyListeners("packageChanged", payload);
                    }
                };
                IntentFilter filter = new IntentFilter();
                filter.addAction(Intent.ACTION_PACKAGE_ADDED);
                filter.addAction(Intent.ACTION_PACKAGE_REMOVED);
                filter.addAction(Intent.ACTION_PACKAGE_REPLACED);
                filter.addDataScheme("package");
                getContext().registerReceiver(packageReceiver, filter);
            } catch (Exception ignored) {}
        }

        @Override
        protected void handleOnDestroy() {
            if (packageReceiver != null) {
                try {
                    getContext().unregisterReceiver(packageReceiver);
                } catch (Exception ignored) {}
                packageReceiver = null;
            }
            super.handleOnDestroy();
        }

        @PluginMethod
        public void isPackageInstalled(PluginCall call) {
            String packageName = call.getString("packageName");
            if (packageName == null || packageName.isEmpty()) {
                call.reject("Must provide packageName");
                return;
            }
            boolean installed = false;
            try {
                getContext().getPackageManager().getPackageInfo(packageName, 0);
                installed = true;
            } catch (Exception ignored) {
                installed = false;
            }
            JSObject ret = new JSObject();
            ret.put("installed", installed);
            call.resolve(ret);
        }

        @PluginMethod
        public void uninstallPackage(PluginCall call) {
            String packageName = call.getString("packageName");
            if (packageName == null || packageName.isEmpty()) {
                call.reject("Must provide packageName");
                return;
            }
            if (getActivity() == null) {
                call.reject("Activity is null");
                return;
            }
            getActivity().runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_DELETE);
                    intent.setData(Uri.parse("package:" + packageName));
                    intent.putExtra(Intent.EXTRA_RETURN_RESULT, true);
                    getActivity().startActivity(intent);
                    call.resolve();
                } catch (Exception e) {
                    try {
                        Intent fallback = new Intent(Intent.ACTION_UNINSTALL_PACKAGE);
                        fallback.setData(Uri.parse("package:" + packageName));
                        fallback.putExtra(Intent.EXTRA_RETURN_RESULT, true);
                        getActivity().startActivity(fallback);
                        call.resolve();
                    } catch (Exception ex) {
                        call.reject("Failed to open uninstall prompt: " + ex.getMessage());
                    }
                }
            });
        }

        @PluginMethod
        public void setSystemTheme(PluginCall call) {
            String theme = call.getString("theme", "dark");
            if (getActivity() == null) {
                call.reject("Activity is null");
                return;
            }
            getActivity().runOnUiThread(() -> {
                try {
                    Window window = getActivity().getWindow();
                    boolean isDark = "dark".equalsIgnoreCase(theme);
                    int darkColor = Color.parseColor("#0e1415");
                    int lightColor = Color.parseColor("#eff5f6");

                    int targetColor = isDark ? darkColor : lightColor;

                    window.setStatusBarColor(targetColor);
                    window.setNavigationBarColor(targetColor);

                    WindowInsetsControllerCompat insetsController =
                        new WindowInsetsControllerCompat(window, window.getDecorView());
                    insetsController.setAppearanceLightStatusBars(!isDark);
                    insetsController.setAppearanceLightNavigationBars(!isDark);

                    call.resolve();
                } catch (Exception e) {
                    call.reject("Error applying system theme: " + e.getMessage());
                }
            });
        }
    }
}
