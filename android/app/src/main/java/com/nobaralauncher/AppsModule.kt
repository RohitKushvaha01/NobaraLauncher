package com.nobaralauncher

import android.content.pm.PackageManager
import com.facebook.react.bridge.*

class AppsModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AppsModule"
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {

        try {

            val pm = reactContext.packageManager

            val intent =
                pm.getLaunchIntentForPackage(reactContext.packageName)

            val apps = pm.getInstalledApplications(0)

            val array = Arguments.createArray()

            for (app in apps) {

                val launchIntent =
                    pm.getLaunchIntentForPackage(app.packageName)

                // only launcher apps
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

                array.pushMap(map)
            }

            promise.resolve(array)

        } catch (e: Exception) {
            promise.reject("ERR", e)
        }
    }
}