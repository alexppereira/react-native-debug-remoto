package com.debugremoto

import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Environment
import android.view.View
import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.MotionEvent
import android.widget.EditText

class DebugRemotoModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return NAME
  }

  @ReactMethod
  fun takeScreenshot(promise: Promise) {
    val activity = currentActivity ?: run {
      promise.reject("Error", "No current activity available")
      return
    }

    try {
      val windowManager = activity.getSystemService(ReactApplicationContext.WINDOW_SERVICE) as WindowManager
      val view = activity.window.decorView.rootView

      val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(bitmap)
      view.draw(canvas)

      // Usar a pasta de cache interna do aplicativo
      val cacheDir = activity.cacheDir
      val file = File(cacheDir, "screenshot_${System.currentTimeMillis()}.png")
      FileOutputStream(file).use { outputStream ->
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
      }

      promise.resolve(file.absolutePath)
    } catch (e: IOException) {
      promise.reject("Error", "Failed to take screenshot", e)
    }
  }

  @ReactMethod
  fun deleteImage(filePath: String, promise: Promise) {
    try {
      val file = File(filePath)
      if (file.exists()) {
        if (file.delete()) {
          promise.resolve("File deleted successfully")
        } else {
          promise.reject("Error", "Failed to delete file")
        }
      } else {
        promise.reject("Error", "File does not exist")
      }
    } catch (e: Exception) {
      promise.reject("Error", "Failed to delete file", e)
    }
  }

  @ReactMethod
  fun simulateClick(x: Float, y: Float, promise: Promise) {
    val activity: Activity? = currentActivity
    if (activity != null) {
        val handler = Handler(Looper.getMainLooper())
        handler.post {
            val view: View = activity.window.decorView
            val downTime = SystemClock.uptimeMillis()
            val eventDown = MotionEvent.obtain(downTime, downTime, MotionEvent.ACTION_DOWN, x, y, 0)
            val eventUp = MotionEvent.obtain(downTime, downTime + 100, MotionEvent.ACTION_UP, x, y, 0)
            view.dispatchTouchEvent(eventDown)
            view.dispatchTouchEvent(eventUp)
            eventDown.recycle()
            eventUp.recycle()
            promise.resolve(true)
        }
    } else {
        promise.reject("Activity not found", "Unable to get current activity")
    }
  }

  @ReactMethod
  fun insertText(text: String, promise: Promise) {
      val activity: Activity? = currentActivity
      if (activity != null) {
          val handler = Handler(Looper.getMainLooper())
          handler.post {
              val view: View? = activity.currentFocus
              if (view is EditText) {
                  view.setText(text)
                  promise.resolve(true)
              } else {
                  promise.reject("Error", "Current focus is not an EditText")
              }
          }
      } else {
          promise.reject("Activity not found", "Unable to get current activity")
      }
  }

  companion object {
    const val NAME = "DebugRemoto"
  }
}
