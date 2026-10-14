package com.screendroid.capture;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScreenDroidNative")
public class ScreenDroidNativePlugin extends Plugin {

    private static final String TAG = "ScreenDroidNative";
    public static Intent screenCaptureIntentData = null;
    public static int screenCaptureResultCode = 0;

    @PluginMethod
    public void isOverlayPermissionGranted(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            granted = Settings.canDrawOverlays(getContext());
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(getContext())) {
                Intent intent = new Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
                return;
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void requestScreenCapturePermission(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }

        MediaProjectionManager mpm = (MediaProjectionManager) activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (mpm == null) {
            call.reject("MediaProjectionManager unavailable");
            return;
        }

        Intent captureIntent = mpm.createScreenCaptureIntent();
        startActivityForResult(call, captureIntent, "screenCaptureCallback");
    }

    @ActivityCallback
    private void screenCaptureCallback(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            screenCaptureResultCode = result.getResultCode();
            screenCaptureIntentData = result.getData();

            // Start the native floating overlay service with screen capture token
            startFloatingService();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } else {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", "Permission de capture refusée par l'utilisateur");
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void startFloatingOverlay(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(getContext())) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("needsOverlayPermission", true);
                call.resolve(ret);
                return;
            }
        }

        startFloatingService();

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopFloatingOverlay(PluginCall call) {
        Context ctx = getContext();
        Intent intent = new Intent(ctx, FloatingWidgetService.class);
        ctx.stopService(intent);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void isOverlayRunning(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("running", FloatingWidgetService.isRunning);
        call.resolve(ret);
    }

    private void startFloatingService() {
        Context ctx = getContext();
        Intent serviceIntent = new Intent(ctx, FloatingWidgetService.class);
        if (screenCaptureIntentData != null) {
            serviceIntent.putExtra("resultCode", screenCaptureResultCode);
            serviceIntent.putExtra("data", screenCaptureIntentData);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(serviceIntent);
        } else {
            ctx.startService(serviceIntent);
        }
    }
}
