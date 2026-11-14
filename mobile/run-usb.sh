#!/usr/bin/env bash
# Chạy app trên điện thoại thật cắm USB.
#
# `adb reverse` chuyển cổng 8088 trên điện thoại về backend trên máy tính, nên app gọi
# http://127.0.0.1:8088 là tới được backend — không cần chung Wi-Fi.
# Lệnh này mất hiệu lực mỗi khi rút cáp / khởi động lại adb ⇒ chạy lại script này.
set -e

PORT=8088

if command -v adb >/dev/null 2>&1; then
  ADB=adb
elif [ -x "$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" ]; then
  ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
else
  echo "Không tìm thấy adb. Cài Android SDK platform-tools hoặc thêm adb vào PATH." >&2
  exit 1
fi

"$ADB" wait-for-device
"$ADB" reverse tcp:$PORT tcp:$PORT
echo "Đã bật adb reverse tcp:$PORT → backend trên máy tính."

cd "$(dirname "$0")"
flutter run "$@"
