package com.crewawesome.weekbox;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Window;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppManagerPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @CapacitorPlugin(name = "AppManager")
    public static class AppManagerPlugin extends Plugin {

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
