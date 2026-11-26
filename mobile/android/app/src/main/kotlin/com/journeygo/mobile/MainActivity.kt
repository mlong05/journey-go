package com.journeygo.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, COUNTDOWN_CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "show" -> result.success(showCountdown(call.arguments as? Map<*, *>))
                    else -> result.notImplemented()
                }
            }
    }

    /**
     * Thông báo cố định có SỐ ĐẾM NGƯỢC CỠ LỚN (Chronometer trong RemoteViews). Hệ thống tự đếm nên chạy được
     * trên màn hình khóa kể cả khi app đã tắt. Trả về false khi không dựng được (máy quá cũ / thiếu dữ liệu)
     * ⇒ phía Dart quay về thông báo thường của plugin.
     */
    private fun showCountdown(args: Map<*, *>?): Boolean {
        if (args == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
        return try {
            val id = (args["id"] as Number).toInt()
            val endsAt = (args["endsAtMs"] as Number).toLong()
            val title = args["title"] as? String ?: ""
            val body = args["body"] as? String ?: ""
            val payload = args["payload"] as? String
            val channelId = args["channelId"] as? String ?: DEFAULT_CHANNEL_ID
            val channelName = args["channelName"] as? String ?: "Countdown"
            val channelDesc = args["channelDesc"] as? String

            val remaining = endsAt - System.currentTimeMillis()
            if (remaining <= 0) return false

            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (manager.getNotificationChannel(channelId) == null) {
                val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW)
                channel.description = channelDesc
                channel.setSound(null, null)
                channel.enableVibration(false)
                manager.createNotificationChannel(channel)
            }

            val views = RemoteViews(packageName, R.layout.notification_countdown)
            views.setTextViewText(R.id.countdown_title, title)
            views.setTextViewText(R.id.countdown_body, body)
            views.setViewVisibility(R.id.countdown_body, if (body.isEmpty()) View.GONE else View.VISIBLE)
            views.setChronometerCountDown(R.id.countdown_time, true)
            views.setChronometer(R.id.countdown_time, SystemClock.elapsedRealtime() + remaining, null, true)

            // Bấm vào thông báo ⇒ mở app và gửi payload như thông báo của flutter_local_notifications
            // (cùng action "SELECT_NOTIFICATION" + extra "notificationId", "payload").
            val launch = Intent(this, MainActivity::class.java).apply {
                action = "SELECT_NOTIFICATION"
                putExtra("notificationId", id)
                putExtra("payload", payload)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            val contentIntent = PendingIntent.getActivity(
                this, id, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

            val notification = Notification.Builder(this, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(Notification.DecoratedCustomViewStyle())
                .setCustomContentView(views)
                .setCustomBigContentView(views)
                .setContentIntent(contentIntent)
                .setOngoing(true)
                .setAutoCancel(false)
                .setOnlyAlertOnce(true)
                .setShowWhen(false)
                .setCategory(Notification.CATEGORY_PROGRESS)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setTimeoutAfter(remaining)
                .build()
            manager.notify(id, notification)
            true
        } catch (e: Exception) {
            false
        }
    }

    companion object {
        private const val COUNTDOWN_CHANNEL = "com.journeygo.mobile/countdown"
        private const val DEFAULT_CHANNEL_ID = "journeygo_activity_countdown"
    }
}
