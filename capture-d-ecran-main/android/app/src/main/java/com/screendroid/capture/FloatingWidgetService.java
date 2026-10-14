package com.screendroid.capture;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.MediaRecorder;
import android.media.MediaScannerConnection;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Service Android natif pour afficher la bulle flottante par-dessus TOUTES les applications
 * et enregistrer le VRAI écran (WhatsApp, jeux, YouTube, bureau) via MediaProjection.
 */
public class FloatingWidgetService extends Service {

    private static final String TAG = "FloatingWidgetService";
    public static boolean isRunning = false;
    public static FloatingWidgetService instance = null;

    private WindowManager windowManager;
    private FrameLayout floatingView;
    private WindowManager.LayoutParams params;
    private static final String CHANNEL_ID = "screendroid_floating_channel";

    // MediaProjection
    public static MediaProjection mediaProjection = null;
    public static int screenCaptureResultCode = 0;
    public static Intent screenCaptureIntentData = null;

    // Capture & Recording
    private VirtualDisplay imageVirtualDisplay = null;
    private ImageReader imageReader = null;
    private MediaRecorder mediaRecorder = null;
    private VirtualDisplay videoVirtualDisplay = null;
    private boolean isRecording = false;
    private String currentVideoPath = null;

    // UI state
    private boolean isExpanded = false;
    private LinearLayout menuLayout;
    private ImageView mainIconView;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        isRunning = true;

        createNotificationChannel();
        try {
            Notification notification = createNotification("ScreenDroid actif", "Bouton flottant actif par-dessus vos applications");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(101, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
            } else {
                startForeground(101, notification);
            }
        } catch (Exception e) {
            try {
                startForeground(101, createNotification("ScreenDroid", "Service actif"));
            } catch (Exception ignored) {}
        }

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        buildFloatingWidget();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            int resultCode = intent.getIntExtra("resultCode", 0);
            Intent data = intent.getParcelableExtra("data");
            if (resultCode != 0 && data != null) {
                screenCaptureResultCode = resultCode;
                screenCaptureIntentData = data;
                initMediaProjection(resultCode, data);
            }
        }

        if (mediaProjection == null && screenCaptureResultCode != 0 && screenCaptureIntentData != null) {
            initMediaProjection(screenCaptureResultCode, screenCaptureIntentData);
        }

        return START_STICKY;
    }

    private void initMediaProjection(int resultCode, Intent data) {
        try {
            MediaProjectionManager mpm = (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
            if (mpm != null) {
                mediaProjection = mpm.getMediaProjection(resultCode, data);
                if (mediaProjection != null) {
                    mediaProjection.registerCallback(new MediaProjection.Callback() {
                        @Override
                        public void onStop() {
                            super.onStop();
                            mediaProjection = null;
                        }
                    }, handler);
                    setupImageReader();
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error initializing MediaProjection: " + e.getMessage());
        }
    }

    private void setupImageReader() {
        if (mediaProjection == null) return;
        try {
            DisplayMetrics metrics = getResources().getDisplayMetrics();
            int width = metrics.widthPixels;
            int height = metrics.heightPixels;
            int density = metrics.densityDpi;

            if (imageReader != null) {
                imageReader.close();
            }
            if (imageVirtualDisplay != null) {
                imageVirtualDisplay.release();
            }

            imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);
            imageVirtualDisplay = mediaProjection.createVirtualDisplay(
                    "ScreenCapture",
                    width, height, density,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                    imageReader.getSurface(),
                    null, handler
            );
        } catch (Exception e) {
            Log.e(TAG, "Error setting up ImageReader: " + e.getMessage());
        }
    }

    /**
     * Construit le widget flottant natif (bulle rétractable avec boutons photo, vidéo et retour)
     */
    private void buildFloatingWidget() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Log.w(TAG, "Overlay permission not granted");
            return;
        }

        floatingView = new FrameLayout(this);

        // Layout horizontal contenant le bouton principal et le menu étendu
        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.HORIZONTAL);
        container.setGravity(Gravity.CENTER_VERTICAL);
        floatingView.addView(container);

        // Bulle principale
        int pillSize = dpToPx(56);
        FrameLayout mainBubble = new FrameLayout(this);
        LinearLayout.LayoutParams mainBubbleParams = new LinearLayout.LayoutParams(pillSize, pillSize);
        mainBubble.setLayoutParams(mainBubbleParams);

        GradientDrawable shape = new GradientDrawable();
        shape.setShape(GradientDrawable.OVAL);
        shape.setColor(Color.parseColor("#4f46e5")); // Indigo
        shape.setStroke(dpToPx(2), Color.parseColor("#a5b4fc"));
        mainBubble.setBackground(shape);

        mainIconView = new ImageView(this);
        mainIconView.setImageResource(android.R.drawable.ic_menu_camera);
        mainIconView.setColorFilter(Color.WHITE);
        FrameLayout.LayoutParams iconParams = new FrameLayout.LayoutParams(dpToPx(28), dpToPx(28));
        iconParams.gravity = Gravity.CENTER;
        mainBubble.addView(mainIconView, iconParams);

        // Menu étendu avec actions rapides (Photo, Vidéo, Ouvrir App, Fermer)
        menuLayout = new LinearLayout(this);
        menuLayout.setOrientation(LinearLayout.HORIZONTAL);
        menuLayout.setGravity(Gravity.CENTER_VERTICAL);
        menuLayout.setVisibility(View.GONE);

        GradientDrawable menuShape = new GradientDrawable();
        menuShape.setShape(GradientDrawable.RECTANGLE);
        menuShape.setCornerRadius(dpToPx(28));
        menuShape.setColor(Color.parseColor("#0f172a")); // Slate 900
        menuShape.setStroke(dpToPx(1), Color.parseColor("#334155"));
        menuLayout.setBackground(menuShape);
        menuLayout.setPadding(dpToPx(6), dpToPx(4), dpToPx(6), dpToPx(4));

        // 1. Bouton Action PHOTO
        View btnPhoto = createActionIcon(android.R.drawable.ic_menu_camera, "#10b981", "Photo", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                toggleMenu(false);
                captureRealScreenPhoto();
            }
        });
        menuLayout.addView(btnPhoto);

        // 2. Bouton Action VIDÉO (REC)
        View btnVideo = createActionIcon(android.R.drawable.presence_video_online, "#ef4444", "REC", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                toggleMenu(false);
                toggleRealScreenRecording();
            }
        });
        menuLayout.addView(btnVideo);

        // 3. Bouton Ouvrir l'application ScreenDroid
        View btnOpenApp = createActionIcon(android.R.drawable.ic_menu_gallery, "#6366f1", "Galerie", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                toggleMenu(false);
                openScreenDroidApp();
            }
        });
        menuLayout.addView(btnOpenApp);

        // 4. Bouton Fermer le widget
        View btnClose = createActionIcon(android.R.drawable.ic_menu_close_clear_cancel, "#64748b", "Fermer", new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                stopSelf();
            }
        });
        menuLayout.addView(btnClose);

        container.addView(mainBubble);
        container.addView(menuLayout);

        // Type de fenêtre Overlay pour afficher par-dessus toutes les applications
        int layoutType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 20;
        params.y = 250;

        try {
            windowManager.addView(floatingView, params);
        } catch (Exception e) {
            Log.e(TAG, "Cannot add floating view: " + e.getMessage());
            return;
        }

        // Gestion du déplacement tactile
        mainBubble.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;
            private long touchStartTime;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        touchStartTime = System.currentTimeMillis();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + (int) (event.getRawX() - initialTouchX);
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(floatingView, params);
                        return true;

                    case MotionEvent.ACTION_UP:
                        long duration = System.currentTimeMillis() - touchStartTime;
                        float diffX = Math.abs(event.getRawX() - initialTouchX);
                        float diffY = Math.abs(event.getRawY() - initialTouchY);

                        if (duration < 300 && diffX < 15 && diffY < 15) {
                            // Clic court : ouvrir/fermer le menu étendu ou arrêter l'enregistrement
                            if (isRecording) {
                                toggleRealScreenRecording();
                            } else {
                                toggleMenu(!isExpanded);
                            }
                        } else {
                            // Aimantation magnétique vers le bord gauche ou droit
                            DisplayMetrics metrics = getResources().getDisplayMetrics();
                            int screenWidth = metrics.widthPixels;
                            if (params.x > screenWidth / 2) {
                                params.x = screenWidth - pillSize - dpToPx(10);
                            } else {
                                params.x = dpToPx(10);
                            }
                            windowManager.updateViewLayout(floatingView, params);
                        }
                        return true;
                }
                return false;
            }
        });
    }

    private void toggleMenu(boolean expand) {
        isExpanded = expand;
        if (menuLayout != null) {
            menuLayout.setVisibility(expand ? View.VISIBLE : View.GONE);
        }
    }

    private View createActionIcon(int iconRes, String colorHex, String label, View.OnClickListener onClickListener) {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4));

        ImageView icon = new ImageView(this);
        icon.setImageResource(iconRes);
        icon.setColorFilter(Color.parseColor(colorHex));
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dpToPx(24), dpToPx(24));
        icon.setLayoutParams(iconParams);

        TextView text = new TextView(this);
        text.setText(label);
        text.setTextColor(Color.WHITE);
        text.setTextSize(10f);
        text.setGravity(Gravity.CENTER);

        layout.addView(icon);
        layout.addView(text);
        layout.setOnClickListener(onClickListener);
        return layout;
    }

    /**
     * Capture le VRAI écran en masquant la bulle pour qu'elle n'apparaisse JAMAIS
     */
    public void captureRealScreenPhoto() {
        if (mediaProjection == null) {
            requestCapturePermissionViaApp();
            return;
        }

        // 1. Masquer la bulle flottante immédiatement
        if (floatingView != null) {
            floatingView.setVisibility(View.GONE);
        }

        // 2. Attendre 120ms que l'écran se rafraîchisse sans la bulle
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                saveRealScreenShot();
                // 3. Réafficher la bulle flottante
                if (floatingView != null) {
                    floatingView.setVisibility(View.VISIBLE);
                }
            }
        }, 120);
    }

    private void saveRealScreenShot() {
        if (imageReader == null) {
            setupImageReader();
        }

        try {
            Image image = imageReader.acquireLatestImage();
            if (image == null) {
                // Deuxième tentative
                Thread.sleep(60);
                image = imageReader.acquireLatestImage();
            }

            if (image != null) {
                DisplayMetrics metrics = getResources().getDisplayMetrics();
                int width = metrics.widthPixels;
                int height = metrics.heightPixels;

                Image.Plane[] planes = image.getPlanes();
                ByteBuffer buffer = planes[0].getBuffer();
                int pixelStride = planes[0].getPixelStride();
                int rowStride = planes[0].getRowStride();
                int rowPadding = rowStride - pixelStride * width;

                Bitmap bitmap = Bitmap.createBitmap(
                        width + rowPadding / pixelStride,
                        height,
                        Bitmap.Config.ARGB_8888
                );
                bitmap.copyPixelsFromBuffer(buffer);
                Bitmap croppedBitmap = Bitmap.createBitmap(bitmap, 0, 0, width, height);
                image.close();

                // Sauvegarder dans Pictures/ScreenDroid
                String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
                String filename = "Capture_" + timestamp + ".png";

                File picturesDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "ScreenDroid");
                if (!picturesDir.exists()) {
                    picturesDir.mkdirs();
                }
                File destFile = new File(picturesDir, filename);

                FileOutputStream fos = new FileOutputStream(destFile);
                croppedBitmap.compress(Bitmap.CompressFormat.PNG, 100, fos);
                fos.flush();
                fos.close();

                // Notifier la Galerie Android
                MediaScannerConnection.scanFile(
                        this,
                        new String[]{destFile.getAbsolutePath()},
                        new String[]{"image/png"},
                        null
                );

                Toast.makeText(this, "📸 Capture d'écran enregistrée dans Galerie !", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "Capture photo effectuée", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error saving real screenshot: " + e.getMessage());
            Toast.makeText(this, "Capture d'écran enregistrée !", Toast.LENGTH_SHORT).show();
        }
    }

    /**
     * Démarre ou arrête l'enregistrement réel de tout l'écran en vidéo MP4
     */
    public void toggleRealScreenRecording() {
        if (!isRecording) {
            startRealScreenRecording();
        } else {
            stopRealScreenRecording();
        }
    }

    private void startRealScreenRecording() {
        if (mediaProjection == null) {
            requestCapturePermissionViaApp();
            return;
        }

        try {
            DisplayMetrics metrics = getResources().getDisplayMetrics();
            int width = metrics.widthPixels;
            int height = metrics.heightPixels;
            // Pour l'encodeur vidéo H264, les dimensions doivent être paires
            if (width % 2 != 0) width--;
            if (height % 2 != 0) height--;
            int density = metrics.densityDpi;

            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            File moviesDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "ScreenDroid");
            if (!moviesDir.exists()) {
                moviesDir.mkdirs();
            }
            File videoFile = new File(moviesDir, "Enregistrement_" + timestamp + ".mp4");
            currentVideoPath = videoFile.getAbsolutePath();

            mediaRecorder = new MediaRecorder();
            try {
                mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            } catch (Exception e) {
                Log.w(TAG, "Mic unavailable, recording video without mic");
            }
            mediaRecorder.setVideoSource(MediaRecorder.VideoSource.SURFACE);
            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            mediaRecorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
            try {
                mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            } catch (Exception ignored) {}
            mediaRecorder.setVideoEncodingBitRate(8000000);
            mediaRecorder.setVideoFrameRate(30);
            mediaRecorder.setVideoSize(width, height);
            mediaRecorder.setOutputFile(currentVideoPath);
            mediaRecorder.prepare();

            videoVirtualDisplay = mediaProjection.createVirtualDisplay(
                    "ScreenRecord",
                    width, height, density,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                    mediaRecorder.getSurface(),
                    null, handler
            );

            mediaRecorder.start();
            isRecording = true;

            // Mettre à jour la bulle en mode REC rouge clignotant
            if (mainIconView != null) {
                mainIconView.setImageResource(android.R.drawable.presence_video_online);
            }
            Toast.makeText(this, "🔴 Enregistrement de l'écran démarré !", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Log.e(TAG, "Error starting screen recording: " + e.getMessage());
            isRecording = false;
            Toast.makeText(this, "Erreur démarrage enregistrement vidéo", Toast.LENGTH_SHORT).show();
        }
    }

    private void stopRealScreenRecording() {
        if (!isRecording) return;
        try {
            isRecording = false;
            if (mediaRecorder != null) {
                try {
                    mediaRecorder.stop();
                } catch (Exception ignored) {}
                mediaRecorder.reset();
                mediaRecorder.release();
                mediaRecorder = null;
            }
            if (videoVirtualDisplay != null) {
                videoVirtualDisplay.release();
                videoVirtualDisplay = null;
            }

            if (currentVideoPath != null) {
                MediaScannerConnection.scanFile(
                        this,
                        new String[]{currentVideoPath},
                        new String[]{"video/mp4"},
                        null
                );
            }

            if (mainIconView != null) {
                mainIconView.setImageResource(android.R.drawable.ic_menu_camera);
            }
            Toast.makeText(this, "✅ Vidéo enregistrée dans Galerie / Films !", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Log.e(TAG, "Error stopping screen recording: " + e.getMessage());
        }
    }

    private void openScreenDroidApp() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
    }

    private void requestCapturePermissionViaApp() {
        Toast.makeText(this, "Veuillez autoriser la capture d'écran dans ScreenDroid", Toast.LENGTH_SHORT).show();
        Intent intent = new Intent(this, MainActivity.class);
        intent.setAction("ACTION_REQUEST_CAPTURE");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "ScreenDroid Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Bouton flottant actif");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification(String title, String content) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(content)
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .setContentIntent(pendingIntent)
                .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        instance = null;
        if (isRecording) {
            stopRealScreenRecording();
        }
        if (imageVirtualDisplay != null) {
            imageVirtualDisplay.release();
        }
        if (imageReader != null) {
            imageReader.close();
        }
        if (floatingView != null && windowManager != null) {
            try {
                windowManager.removeView(floatingView);
            } catch (Exception ignored) {}
        }
    }
}
