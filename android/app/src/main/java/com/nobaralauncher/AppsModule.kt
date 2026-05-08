package com.nobaralauncher

import android.content.pm.PackageManager
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class AppsModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private val executor: ExecutorService = Executors.newSingleThreadExecutor()

    private fun drawableToBitmap(drawable: Drawable): Bitmap {
        if (drawable is BitmapDrawable && drawable.bitmap != null) {
            return drawable.bitmap
        }
        
        val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 128
        val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 128
        
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        return bitmap
    }

    override fun getName(): String {
        return "AppsModule"
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        executor.execute {
            try {
                val pm = reactContext.packageManager
                val mainIntent = Intent(Intent.ACTION_MAIN, null)
                mainIntent.addCategory(Intent.CATEGORY_LAUNCHER)
                
                val resolveInfos = pm.queryIntentActivities(mainIntent, 0)
                val cacheDir = reactContext.cacheDir
                val array = Arguments.createArray()

                for (resolveInfo in resolveInfos) {
                    val packageName = resolveInfo.activityInfo.packageName
                    val label = resolveInfo.loadLabel(pm).toString()
                    
                    val map = Arguments.createMap()
                    map.putString("name", label)
                    map.putString("packageName", packageName)

                    val iconFile = File(cacheDir, "${packageName}.png")
                    if (!iconFile.exists()) {
                        try {
                            val icon = resolveInfo.loadIcon(pm)
                            val bitmap = drawableToBitmap(icon)
                            FileOutputStream(iconFile).use { fos ->
                                // Using 70% quality and PNG (though PNG is lossless, some compressors use quality for speed/filtering)
                                // Actually PNG quality param is often ignored, but we can use WEBP for real speed.
                                bitmap.compress(Bitmap.CompressFormat.PNG, 70, fos)
                            }
                        } catch (e: Exception) {
                            // Skip icon if error
                        }
                    }
                    
                    if (iconFile.exists()) {
                        map.putString("iconUri", iconFile.absolutePath)
                    } else {
                        map.putString("iconUri", "")
                    }
                    
                    array.pushMap(map)
                }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("ERR", e)
            }
        }
    }

    @ReactMethod
    fun launchApp(packageName: String, promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val intent = pm.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(intent)
                promise.resolve(null)
            } else {
                promise.reject("ERR", "No launch intent for $packageName")
            }
        } catch (e: Exception) {
            promise.reject("ERR", e)
        }
    }
}
