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

class AppsModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private fun drawableToBitmap(drawable: Drawable): Bitmap {
        if (drawable is BitmapDrawable && drawable.bitmap != null) {
            return drawable.bitmap
        }
        val bitmap = Bitmap.createBitmap(
            drawable.intrinsicWidth.coerceAtLeast(1),
            drawable.intrinsicHeight.coerceAtLeast(1),
            Bitmap.Config.ARGB_8888
        )
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

        try {

            val pm = reactContext.packageManager

            val apps = pm.getInstalledApplications(0)

            val cacheDir = reactContext.cacheDir

            val array = Arguments.createArray()

            for (app in apps) {

                val launchIntent = pm.getLaunchIntentForPackage(app.packageName)

                // Only include apps that can be launched
                if (launchIntent == null) continue

                val map = Arguments.createMap()

                map.putString(
                    "name",
                    pm.getApplicationLabel(app).toString()
                )

                map.putString(
                    "packageName",
                    app.packageName
                )

                // Get app icon and save to cache
                val iconFile = File(cacheDir, "${app.packageName}.png")
                if (!iconFile.exists()) {
                    try {
                        val icon = pm.getApplicationIcon(app)
                        val bitmap = drawableToBitmap(icon)
                        val fos = FileOutputStream(iconFile)
                        bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos)
                        fos.close()
                    } catch (e: Exception) {
                        // Icon not available, skip
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