/**
 * Lấy vị trí hiện tại của thiết bị.
 *
 * Máy tính để bàn thường không có chip GPS, chỉ định vị được qua Wi-Fi/mạng. Gọi với
 * enableHighAccuracy = true trên các máy này hay bị hết thời gian chờ, nên thử độ chính xác
 * thường trước (nhanh và hiệu quả với Wi-Fi), chỉ khi thất bại mới thử lại với độ chính xác cao.
 *
 * Trả về { latitude, longitude, accuracy } hoặc ném lỗi có `message` tiếng Việt, `code` gốc.
 */
function getPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function describeGeoError(err) {
  switch (err?.code) {
    case 1:
      // Trình duyệt đã cho phép mà vẫn bị từ chối: hệ điều hành đang chặn vị trí cho trình duyệt
      if (err?.browserAllowed) {
        return "Quyền vị trí đã được bật nhưng trang chưa áp dụng. Hãy tải lại trang (nút Reload của Chrome hoặc Ctrl+F5) rồi bấm lại. Nếu vẫn lỗi sau khi tải lại, kiểm tra Windows: Cài đặt > Quyền riêng tư và bảo mật > Vị trí.";
      }
      return "Trình duyệt đang chặn quyền vị trí. Bấm biểu tượng ổ khóa cạnh thanh địa chỉ, chọn Cho phép Vị trí rồi bấm lại nút.";
    case 2:
      return "Thiết bị chưa xác định được vị trí. Hãy bật Dịch vụ định vị của hệ điều hành (Windows: Cài đặt > Quyền riêng tư > Vị trí) và kết nối mạng, hoặc chọn trên bản đồ.";
    case 3:
      return "Hết thời gian chờ định vị. Hãy thử lại, hoặc chọn vị trí trên bản đồ.";
    default:
      return err?.message || "Không lấy được vị trí hiện tại.";
  }
}

async function withPermissionHint(err) {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" });
    const wrapped = new Error(err.message);
    wrapped.code = err.code;
    wrapped.browserAllowed = status?.state === "granted";
    return wrapped;
  } catch {
    return err;
  }
}

export async function getDevicePosition() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    const e = new Error("Trình duyệt không hỗ trợ định vị.");
    e.code = 0;
    throw e;
  }
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    const e = new Error("Định vị chỉ hoạt động trên trang HTTPS hoặc localhost.");
    e.code = 0;
    throw e;
  }

  let pos;
  try {
    pos = await getPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
  } catch (first) {
    // Bị từ chối quyền thì thử lại cũng vô ích; ghi nhận trình duyệt có đang cho phép không để báo đúng nguyên nhân
    if (first?.code === 1) throw await withPermissionHint(first);
    try {
      pos = await getPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    } catch (second) {
      throw second?.code === 1 ? await withPermissionHint(second) : second;
    }
  }
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  };
}
