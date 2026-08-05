package com.ipowerupreactnative

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Native battery/temperature alerts — works when app is minimized or JS is suspended (iOS parity).
 */
class BatteryAlertNotifier(private val context: Context) {

    companion object {
        private const val CHANNEL_ID = "ipowerup_battery"
        private const val CHANNEL_NAME = "iPowerUp Alerts"
        private const val PREFS = "ipowerup_battery_alerts"

        private val HIGH_BANDS = listOf(80, 90, 95, 100)
        private val LOW_BANDS = listOf(20, 10, 5, 1, 0)
        private val MIN_THRESHOLDS = listOf(20, 10, 5, 0)
        private val MAX_THRESHOLDS = listOf(80, 85, 90, 95)

        private var notificationId = 2000
    }

    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val notificationManager = NotificationManagerCompat.from(context)

    init {
        ensureChannel()
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Case battery and temperature alerts"
                enableVibration(true)
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    fun handlePowerBankStatus(data: ByteArray) {
        if (data.size < 10 || data[0].toInt() and 0xFF != 0x04) {
            return
        }

        val caseBatPct = data[3].toInt() and 0xFF
        val flags = data[4].toInt() and 0xFF
        val vcBelowMin = (flags and 0x08) != 0
        val vcAboveMax = (flags and 0x10) != 0
        val tcBelowMin = (flags and 0x20) != 0
        val tcAboveMax = (flags and 0x40) != 0

        handleBatteryBands(caseBatPct)
        handleMinBattery(caseBatPct, vcBelowMin)
        handleMaxBattery(caseBatPct, vcAboveMax)
        handleTemperature(tcBelowMin, tcAboveMax)
    }

    /** iOS shouldShowBatteryAlert parity with band crossing so 79→81 still alerts at 80. */
    private fun handleBatteryBands(level: Int) {
        var lastHigh = prefs.getInt("last_high_notified", 0)
        if (level < 80) {
            prefs.edit().putInt("last_high_notified", 0).apply()
            lastHigh = 0
        } else {
            val band = HIGH_BANDS.lastOrNull { level >= it }
            if (band != null && band > lastHigh) {
                prefs.edit().putInt("last_high_notified", band).apply()
                showForLevel(band)
            }
        }

        var lastLow = prefs.getInt("last_low_notified", 100)
        if (level > 20) {
            prefs.edit().putInt("last_low_notified", 100).apply()
            lastLow = 100
        } else {
            val band = LOW_BANDS.firstOrNull { level <= it }
            if (band != null && band < lastLow) {
                prefs.edit().putInt("last_low_notified", band).apply()
                showForLevel(band)
            }
        }
    }

    private fun showForLevel(level: Int) {
        val (title, body, critical) = when (level) {
            1, 5, 0 -> Triple(
                "Critical Battery Level",
                "Case battery is critically low at $level%. Please charge immediately.",
                true,
            )
            10 -> Triple(
                "Low Battery",
                "Case battery is low at $level%. Consider charging soon.",
                true,
            )
            20 -> Triple(
                "Battery Level Alert",
                "Case battery is at $level%.",
                false,
            )
            80 -> Triple(
                "Battery Level Good",
                "Case battery is at $level%.",
                false,
            )
            90 -> Triple(
                "Battery Almost Full",
                "Case battery is almost full at $level%.",
                false,
            )
            95 -> Triple(
                "Battery Full",
                "Case battery is nearly full at $level%.",
                false,
            )
            100 -> Triple(
                "Battery Fully Charged",
                "Case battery is fully charged at 100%.",
                false,
            )
            else -> Triple(
                "Battery Level Alert",
                "Case battery is at $level%.",
                false,
            )
        }
        showNotification(title, body, critical)
    }

    private fun handleMinBattery(level: Int, isBelowMin: Boolean) {
        if (!isBelowMin) {
            return
        }

        if (level > 20) {
            prefs.edit().putInt("last_min_alert", 100).apply()
            return
        }

        val lastAlerted = prefs.getInt("last_min_alert", 100)
        val threshold = MIN_THRESHOLDS.firstOrNull { level <= it } ?: return

        if (lastAlerted == threshold) {
            return
        }
        if (!(lastAlerted == 0 || threshold < lastAlerted)) {
            return
        }

        prefs.edit().putInt("last_min_alert", threshold).apply()
        showNotification(
            "Critical Battery Alert",
            "Case battery is below minimum threshold. Please charge immediately.",
            true,
        )
    }

    private fun handleMaxBattery(level: Int, isAboveMax: Boolean) {
        if (!isAboveMax) {
            return
        }

        if (level < 80) {
            prefs.edit().putInt("last_max_alert", 0).apply()
            return
        }

        val lastAlerted = prefs.getInt("last_max_alert", 0)
        val threshold = MAX_THRESHOLDS.lastOrNull { level >= it } ?: return

        if (lastAlerted == threshold) {
            return
        }
        if (threshold <= lastAlerted) {
            return
        }

        prefs.edit().putInt("last_max_alert", threshold).apply()
        showNotification(
            "Critical Battery Alert",
            "Case battery is above maximum threshold. Please disconnect charger.",
            true,
        )
    }

    private fun handleTemperature(tcBelowMin: Boolean, tcAboveMax: Boolean) {
        if (tcBelowMin && !prefs.getBoolean("tc_below_shown", false)) {
            prefs.edit().putBoolean("tc_below_shown", true).apply()
            showNotification(
                "Temperature Alert",
                "Case temperature is too low. Device may shutdown.",
                true,
            )
        } else if (!tcBelowMin && prefs.getBoolean("tc_below_shown", false)) {
            prefs.edit().putBoolean("tc_below_shown", false).apply()
        }

        if (tcAboveMax && !prefs.getBoolean("tc_above_shown", false)) {
            prefs.edit().putBoolean("tc_above_shown", true).apply()
            showNotification(
                "Temperature Alert",
                "Case temperature is too high. Device may shutdown.",
                true,
            )
        } else if (!tcAboveMax && prefs.getBoolean("tc_above_shown", false)) {
            prefs.edit().putBoolean("tc_above_shown", false).apply()
        }
    }

    private fun showNotification(title: String, body: String, critical: Boolean) {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(
                if (critical) NotificationCompat.PRIORITY_HIGH
                else NotificationCompat.PRIORITY_DEFAULT,
            )

        try {
            notificationManager.notify(notificationId++, builder.build())
        } catch (_: SecurityException) {
            // POST_NOTIFICATIONS not granted
        }
    }
}
