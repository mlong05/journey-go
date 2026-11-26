# ─────────────────────────────────────────────────────────────────────────────
#  ProGuard rules — JourneyGo Mobile (bản release)
#
#  Hiện build KHÔNG bật minify (isMinifyEnabled = false) ⇒ file này chỉ là
#  chỗ dành sẵn cho khi bật R8 sau này.
#
#  ⚠️ Khi bật R8, PHẢI giữ lại các rule dưới đây: Flutter engine, plugin
#     Google Sign-In, flutter_local_notifications, geolocator, mobile_scanner
#     đều dùng reflection / class name cố định.
# ─────────────────────────────────────────────────────────────────────────────

# Flutter
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.embedding.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# Google Sign-In
-keep class com.google.android.gms.auth.api.credentials.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }
-keep class com.google.android.gms.common.** { *; }
-dontwarn com.google.android.gms.**

# flutter_local_notifications
-keep class com.dexterous.** { *; }
-dontwarn com.dexterous.**

# geolocator
-keep class com.baseflow.** { *; }
-dontwarn com.baseflow.**

# mobile_scanner
-keep class com.mr.flutter.plugin.** { *; }
-dontwarn com.mr.flutter.plugin.**

# flutter_overlay_window
-keep class flutter.overlay.window.** { *; }
-dontwarn flutter.overlay.window.**

# Kotlin coroutines
-dontwarn kotlinx.coroutines.**
