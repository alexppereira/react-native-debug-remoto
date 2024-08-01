package fr.greweb.reactnativeviewshot;

import android.app.Activity;
import android.content.Context;
import android.net.Uri;
import android.os.AsyncTask;
import androidx.annotation.NonNull;
import android.util.DisplayMetrics;
import android.util.Log;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.os.Build;
import android.view.WindowManager;

import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactContext;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import com.facebook.react.bridge.GuardedAsyncTask;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.fabric.FabricUIManager;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.common.UIManagerType;

import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.view.View;
import android.widget.EditText;

import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import fr.greweb.reactnativeviewshot.ViewShot.Formats;
import fr.greweb.reactnativeviewshot.ViewShot.Results;

public class RNViewShotModule extends ReactContextBaseJavaModule implements TurboModule {

    public static final String RNVIEW_SHOT = "RNViewShot";

    private final ReactApplicationContext reactContext;

    private final Executor executor = Executors.newCachedThreadPool();

    public RNViewShotModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return RNVIEW_SHOT;
    }

    @Override
    public Map<String, Object> getConstants() {
        return Collections.emptyMap();
    }

    @Override
    public void invalidate() {
        super.invalidate();
        new CleanTask(getReactApplicationContext()).executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR);
    }

    @ReactMethod
    public void deleteImage(String filePath, Promise promise) {
        try {
            File file = new File(filePath);
            if (file.exists()) {
                if (file.delete()) {
                    promise.resolve("File deleted successfully");
                } else {
                    promise.reject("Error", "Failed to delete file");
                }
            } else {
                promise.reject("Error", "File does not exist");
            }
        } catch (Exception e) {
            promise.reject("Error", "Failed to delete file", e);
        }
    }

    @ReactMethod
    public void simulateClick(float x, float y, Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity != null) {
            Handler handler = new Handler(Looper.getMainLooper());
            handler.post(() -> {
                View view = activity.getWindow().getDecorView();
                long downTime = SystemClock.uptimeMillis();
                MotionEvent eventDown = MotionEvent.obtain(downTime, downTime, MotionEvent.ACTION_DOWN, x, y, 0);
                MotionEvent eventUp = MotionEvent.obtain(downTime, downTime + 100, MotionEvent.ACTION_UP, x, y, 0);
                view.dispatchTouchEvent(eventDown);
                view.dispatchTouchEvent(eventUp);
                eventDown.recycle();
                eventUp.recycle();
                promise.resolve(true);
            });
        } else {
            promise.reject("Activity not found", "Unable to get current activity");
        }
    }

    @ReactMethod
    public void insertText(String text, Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity != null) {
            Handler handler = new Handler(Looper.getMainLooper());
            handler.post(() -> {
                View view = activity.getCurrentFocus();
                if (view instanceof EditText) {
                    ((EditText) view).setText(text);
                    promise.resolve(true);
                } else {
                    promise.reject("Error", "Current focus is not an EditText");
                }
            });
        } else {
            promise.reject("Activity not found", "Unable to get current activity");
        }
    }

    @ReactMethod
    public void takeScreenshot(Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("Error", "No current activity available");
            return;
        }
        try {
            WindowManager windowManager = (WindowManager) activity.getSystemService(ReactContext.WINDOW_SERVICE);
            View view = activity.getWindow().getDecorView().getRootView();

            Bitmap bitmap = Bitmap.createBitmap(view.getWidth(), view.getHeight(), Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            view.draw(canvas);

            // Usar a pasta de cache interna do aplicativo
            File cacheDir = activity.getCacheDir();
            File file = new File(cacheDir, "screenshot_" + System.currentTimeMillis() + ".png");
            try (FileOutputStream outputStream = new FileOutputStream(file)) {
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
            }

            promise.resolve("file://" + file.getAbsolutePath());
        } catch (IOException e) {
            promise.reject("Error", "Failed to take screenshot", e);
        }
    }

    @ReactMethod
    public void releaseCapture(String uri) {
        final String path = Uri.parse(uri).getPath();
        if (path == null)
            return;
        File file = new File(path);
        if (!file.exists())
            return;
        File parent = file.getParentFile();
        if (parent.equals(reactContext.getExternalCacheDir()) || parent.equals(reactContext.getCacheDir())) {
            file.delete();
        }
    }

    @ReactMethod
    public void captureRef(double tagFromJs, ReadableMap options, Promise promise) {
        int tag = (int) tagFromJs;
        final ReactApplicationContext context = getReactApplicationContext();
        final DisplayMetrics dm = context.getResources().getDisplayMetrics();

        final String extension = options.getString("format");
        final int imageFormat = "jpg".equals(extension)
                ? Formats.JPEG
                : "webm".equals(extension)
                        ? Formats.WEBP
                        : "raw".equals(extension)
                                ? Formats.RAW
                                : Formats.PNG;

        final double quality = options.getDouble("quality");
        final Integer scaleWidth = options.hasKey("width") ? options.getInt("width") : null;
        final Integer scaleHeight = options.hasKey("height") ? options.getInt("height") : null;
        final String resultStreamFormat = options.getString("result");
        final String fileName = options.hasKey("fileName") ? options.getString("fileName") : null;
        final Boolean snapshotContentContainer = options.getBoolean("snapshotContentContainer");
        final boolean handleGLSurfaceView = options.hasKey("handleGLSurfaceViewOnAndroid")
                && options.getBoolean("handleGLSurfaceViewOnAndroid");

        try {
            File outputFile = null;
            if (Results.TEMP_FILE.equals(resultStreamFormat)) {
                outputFile = createTempFile(getReactApplicationContext(), extension, fileName);
            }

            final Activity activity = getCurrentActivity();
            ViewShot uiBlock = new ViewShot(
                    tag, extension, imageFormat, quality,
                    scaleWidth, scaleHeight, outputFile, resultStreamFormat,
                    snapshotContentContainer, reactContext, activity, handleGLSurfaceView, promise, executor);

            if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
                UIManager uiManager = UIManagerHelper.getUIManager(context, UIManagerType.FABRIC);
                ((FabricUIManager) uiManager).addUIBlock(uiBlock);
            } else {
                final UIManagerModule uiManager = this.reactContext.getNativeModule(UIManagerModule.class);
                uiManager.addUIBlock(uiBlock);
            }
        } catch (final Throwable ex) {
            Log.e(RNVIEW_SHOT, "Failed to snapshot view tag " + tag, ex);
            promise.reject(ViewShot.ERROR_UNABLE_TO_SNAPSHOT, "Failed to snapshot view tag " + tag);
        }
    }

    @ReactMethod
    public void captureScreen(ReadableMap options, Promise promise) {
        captureRef(-1, options, promise);
    }

    private static final String TEMP_FILE_PREFIX = "ReactNative-snapshot-image";

    /**
     * Asynchronous task that cleans up cache dirs (internal and, if available,
     * external) of cropped
     * image files. This is run when the catalyst instance is being destroyed (i.e.
     * app is shutting
     * down) and when the module is instantiated, to handle the case where the app
     * crashed.
     */
    private static class CleanTask extends GuardedAsyncTask<Void, Void> implements FilenameFilter {
        private final File cacheDir;
        private final File externalCacheDir;

        private CleanTask(ReactContext context) {
            super(context);

            cacheDir = context.getCacheDir();
            externalCacheDir = context.getExternalCacheDir();
        }

        @Override
        protected void doInBackgroundGuarded(Void... params) {
            if (null != cacheDir) {
                cleanDirectory(cacheDir);
            }

            if (externalCacheDir != null) {
                cleanDirectory(externalCacheDir);
            }
        }

        @Override
        public final boolean accept(File dir, String filename) {
            return filename.startsWith(TEMP_FILE_PREFIX);
        }

        private void cleanDirectory(@NonNull final File directory) {
            final File[] toDelete = directory.listFiles(this);

            if (toDelete != null) {
                for (File file : toDelete) {
                    if (file.delete()) {
                        Log.d(RNVIEW_SHOT, "deleted file: " + file.getAbsolutePath());
                    }
                }
            }
        }
    }

    /**
     * Create a temporary file in the cache directory on either internal or external
     * storage,
     * whichever is available and has more free space.
     */
    @NonNull
    private File createTempFile(@NonNull final Context context, @NonNull final String ext, String fileName)
            throws IOException {
        final File externalCacheDir = context.getExternalCacheDir();
        final File internalCacheDir = context.getCacheDir();
        final File cacheDir;

        if (externalCacheDir == null && internalCacheDir == null) {
            throw new IOException("No cache directory available");
        }

        if (externalCacheDir == null) {
            cacheDir = internalCacheDir;
        } else if (internalCacheDir == null) {
            cacheDir = externalCacheDir;
        } else {
            cacheDir = externalCacheDir.getFreeSpace() > internalCacheDir.getFreeSpace() ? externalCacheDir
                    : internalCacheDir;
        }

        final String suffix = "." + ext;
        if (fileName != null) {
            return File.createTempFile(fileName, suffix, cacheDir);
        }
        return File.createTempFile(TEMP_FILE_PREFIX, suffix, cacheDir);
    }

}
