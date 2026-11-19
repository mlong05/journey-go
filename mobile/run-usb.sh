#!/usr/bin/env bash
# Chạy app trên điện thoại thật cắm USB, dùng backend LOCAL trên máy tính.
#
# `adb reverse` chuyển cổng trên điện thoại về máy tính, nên app gọi http://127.0.0.1:<cổng>
# là tới được backend — không cần chung Wi-Fi:
#   8080 — nginx của Docker Compose (backend trong container)
#   8088 — backend chạy trực tiếp bằng mvnw / IntelliJ
# Lệnh này mất hiệu lực mỗi khi rút cáp / khởi động lại adb ⇒ chạy lại script này.
# Nhớ để trống API_BASE_URL trong mobile/.env để app dò backend local.
set -e

PORTS="8080 8088"

if command -v adb >/dev/null 2>&1; then
  ADB=adb
elif [ -x "$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" ]; then
  ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
else
  echo "Không tìm thấy adb. Cài Android SDK platform-tools hoặc thêm adb vào PATH." >&2
  exit 1
fi

"$ADB" wait-for-device
for PORT in $PORTS; do
  "$ADB" reverse tcp:$PORT tcp:$PORT
  echo "Đã bật adb reverse tcp:$PORT → máy tính."
done

cd "$(dirname "$0")"
flutter run "$@"
