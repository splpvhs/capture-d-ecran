package com.screendroid.capture;

import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int OVERLAY_PERMISSION_REQ_CODE = 1234;
    private static final int SCREEN_CAPTURE_REQ_CODE = 5678;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScreenDroidNativePlugin.class);
        super.onCreate(savedInstanceState);

        handlePermissionsAndService();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if ("ACTION_REQUEST_CAPTURE".equals(intent.getAction())) {
            requestScreenCapture();
        }
    }

    /**
     * Vérifie l'overlay et démarre le flux d'autorisation
     */
    public void handlePermissionsAndService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Toast.makeText(this, "Autorisez 'Afficher par-dessus d'autres applications' pour activer le bouton flottant", Toast.LENGTH_LONG).show();
                Intent intent = new Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getPackageName())
                );
                startActivityForResult(intent, OVERLAY_PERMISSION_REQ_CODE);
                return;
            }
        }

        // Si l'overlay est accordé, demander l'autorisation de capture d'écran
        requestScreenCapture();
    }

    private void requestScreenCapture() {
        MediaProjectionManager mpm = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (mpm != null) {
            Intent captureIntent = mpm.createScreenCaptureIntent();
            startActivityForResult(captureIntent, SCREEN_CAPTURE_REQ_CODE);
        } else {
            startFloatingService(null, 0);
        }
    }

    private void startFloatingService(Intent data, int resultCode) {
        Intent serviceIntent = new Intent(this, FloatingWidgetService.class);
        if (data != null && resultCode != 0) {
            serviceIntent.putExtra("resultCode", resultCode);
            serviceIntent.putExtra("data", data);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == OVERLAY_PERMISSION_REQ_CODE) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Settings.canDrawOverlays(this)) {
                    requestScreenCapture();
                } else {
                    Toast.makeText(this, "La permission de superposition est requise pour afficher le bouton sur les autres applications.", Toast.LENGTH_LONG).show();
                }
            }
        } else if (requestCode == SCREEN_CAPTURE_REQ_CODE) {
            if (resultCode == RESULT_OK && data != null) {
                FloatingWidgetService.screenCaptureResultCode = resultCode;
                FloatingWidgetService.screenCaptureIntentData = data;
                startFloatingService(data, resultCode);
                Toast.makeText(this, "ScreenDroid actif ! Vous pouvez ouvrir n'importe quelle application (WhatsApp, etc.).", Toast.LENGTH_LONG).show();
            } else {
                // Démarre quand même le service pour que le widget soit visible
                startFloatingService(null, 0);
            }
        }
    }
}
