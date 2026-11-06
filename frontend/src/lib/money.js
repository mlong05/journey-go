/**
 * Tiện ích định dạng tiền tệ & ngày giờ cho toàn bộ Web.
 *
 * ── Quy ước bắt buộc (theo contract backend `docs/IMPLEMENTATION.md`) ──
 *  • Tiền VND là số nguyên, backend trả `BigDecimal` dạng JSON number (ví dụ 1500000).
 *    TUYỆT ĐỐI không nhân/chia 100 khi gọi API — giá trị nhận về đã là đơn vị VND.
 *  • Mốc thời gian trả về là ISO-8601 UTC (`Instant`); hiển thị theo múi giờ Việt Nam.
 *  • `experienceDate` là `LocalDate` (`YYYY-MM-DD`) — không có phần giờ, không được chuyển qua
 *    `new Date(...)` theo múi giờ local vì sẽ lệch ngày.
 *  • `revenuePeriod` là chuỗi kỳ `YYYY-MM` (ví dụ "2026-09").
 */

const VND_FORMATTER = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const VND_NUMBER_FORMATTER = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

/**
 * Chuyển giá trị tiền tệ về number an toàn.
 * Backend có thể trả string ("1500000.00") hoặc number — cả hai đều phải chấp nhận.
 */
export function toAmount(value) {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Định dạng số tiền VND kèm ký hiệu đồng — dùng cho tổng tiền trong giỏ/checkout.
 * Ví dụ: 1500000 → "1.500.000 ₫"
 */
export function formatVND(value) {
  return VND_FORMATTER.format(toAmount(value));
}

/**
 * Định dạng số tiền VND không ký hiệu — dùng cho input, biểu đồ, bảng số liệu.
 * Ví dụ: 1500000 → "1.500.000"
 */
export function formatVNDNumber(value) {
  return VND_NUMBER_FORMATTER.format(toAmount(value));
}

/**
 * Múi giờ cố định cho mọi định dạng ngày giờ.
 *
 * ⚠️ BẮT BUỘC chỉ định cứng: Next.js render ở server (UTC) nhưng hydrate ở
 * client (múi giờ máy người dùng). Nếu định dạng theo múi giờ hệ thống mặc
 * định thì 2 bên cho ra chuỗi khác nhau ⇒ lỗi "Hydration failed" trên mọi
 * trang admin có bảng dữ liệu ngày giờ.
 */
export const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

/**
 * Định dạng ngày giờ theo giờ Việt Nam.
 * ISO-8601 UTC (có "Z") → giờ VN. Chuỗi không có timezone được coi như giờ local.
 */
export function formatDateTimeVN(value, options = {}) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(date);
}

/**
 * Định dạng ngày (không giờ) theo giờ Việt Nam — dùng cho timestamp ISO.
 */
export function formatDateVN(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Định dạng `LocalDate` (YYYY-MM-DD) mà không bị lệch ngày do múi giờ.
 * 2026-11-20 → "20/11/2026"
 */
export function formatLocalDate(value) {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: VN_TIME_ZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}

/**
 * Định dạng kỳ doanh thu `YYYY-MM` → "Tháng 09/2026".
 */
export function formatPeriod(value) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})$/.exec(String(value).slice(0, 7));
  if (!match) return String(value);
  const [, y, m] = match;
  return `Tháng ${m}/${y}`;
}

/**
 * Kỳ doanh thu của tháng trước, định dạng `YYYY-MM`.
 *
 * Kỳ tất toán chỉ được tạo cho tháng ĐÃ ĐÓNG ⇒ mặc định chọn tháng trước
 * (tháng hiện tại thường chưa kết thúc nên chưa thể tất toán).
 */
export function previousMonth() {
  // Dùng múi giờ VN cố định để server (UTC) và client cho cùng kết quả
  // ⇒ tránh lỗi hydration trên ô "Kỳ doanh thu".
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m] = parts.split("-").map(Number);
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}

/**
 * Đếm ngược (mm:ss) tới một mốc thời gian ISO.
 * Trả về null khi đã hết hạn.
 */
export function countdownTo(deadlineIso) {
  if (!deadlineIso) return null;
  const deadline = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadline)) return null;
  const diff = deadline - Date.now();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Ngày hôm nay theo giờ Việt Nam dạng `YYYY-MM-DD` — dùng cho `experienceDate`.
 */
export function todayLocalDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Cộng số ngày lên một `YYYY-MM-DD`, giữ nguyên định dạng.
 */
export function addDaysLocalDate(localDate, days) {
  if (!localDate) return "";
  const [y, m, d] = String(localDate).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Nhãn tiếng Việt cho trạng thái booking.
 */
export const BOOKING_STATUS_LABELS = {
  PENDING_PAYMENT: "Chờ thanh toán",
  CONFIRMED: "Đã xác nhận",
  COMPLETED: "Đã hoàn thành",
  EXPIRED: "Đã hết hạn",
  CANCELLED: "Đã hủy",
};

/**
 * Nhãn tiếng Việt cho trạng thái thanh toán.
 * `PROCESSING` KHÔNG phải thất bại — không được hiển thị như lỗi.
 *
 * Khớp enum `PaymentStatus` ở backend.
 */
export const PAYMENT_STATUS_LABELS = {
  PENDING: "Đang chờ",
  PROCESSING: "Đang xử lý",
  SUCCESS: "Thành công",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
  EXPIRED: "Đã hết hạn",
};

/**
 * Nhãn tiếng Việt cho trạng thái hoàn tiền.
 *
 * Khớp enum `RefundStatus` ở backend:
 *   PENDING_REVIEW → APPROVED → REFUND_PROCESSING → REFUNDED
 *   (kèm REJECTED / FAILED / CANCELLED)
 *
 * LƯU Ý: backend KHÔNG có `PENDING` hay `MANUAL_TRANSFER_PENDING`.
 * Dùng sai key ⇒ dropdown lọc không trả kết quả nào ⇒ phải bám đúng enum backend.
 */
export const REFUND_STATUS_LABELS = {
  PENDING_REVIEW: "Chờ xét duyệt",
  APPROVED: "Đã duyệt — đang hoàn tiền",
  REFUND_PROCESSING: "Đang xử lý hoàn tiền",
  REFUNDED: "Đã hoàn tiền",
  REJECTED: "Đã từ chối",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
};

/**
 * Nhãn tiếng Việt cho trạng thái settlement.
 * Khớp enum `SettlementStatus` ở backend (DRAFT / APPROVED / REJECTED / CANCELLED).
 */
export const SETTLEMENT_STATUS_LABELS = {
  DRAFT: "Chờ duyệt",
  APPROVED: "Đã duyệt & chi trả",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};

/**
 * Nhãn tiếng Việt cho phương thức thanh toán.
 *
 * `method` trả về từ backend là `PaymentMethod` (chỉ có `VNPAY`).
 * Mã ngân hàng cụ thể nằm ở `bankCode` (vnp_BankCode) và `cardType` (vnp_CardType).
 */
export const PAYMENT_METHOD_LABELS = {
  VNPAY: "Cổng VNPay",
};

/**
 * Nhãn tiếng Việt cho `vnp_CardType` — loại thẻ / phương thức thực tế.
 * Khớp giá trị `cardType` lưu trong Payment.
 */
export const PAYMENT_CARD_TYPE_LABELS = {
  ATM: "Thẻ nội địa & tài khoản ngân hàng",
  QRCODE: "Ứng dụng ngân hàng & ví điện tử",
};

/**
 * Nhãn tiếng Việt cho `vnp_BankCode` — mã ngân hàng / ví thực tế.
 * Chỉ liệt kê những mã backend thực sự gửi lên VNPay.
 */
export const PAYMENT_BANK_CODE_LABELS = {
  VNBANK: "Ngân hàng Ngoại thương (Vietcombank)",
  QR_APP: "Ứng dụng ngân hàng / Ví điện tử",
  VISA: "Thẻ quốc tế Visa",
  MASTERCARD: "Thẻ quốc tế Mastercard",
  JCB: "Thẻ quốc tế JCB",
  UPI: "Thẻ quốc tế UPI",
  AMEX: "Thẻ quốc tế Amex",
};

/**
 * Nhãn tiếng Việt cho trạng thái khoản doanh thu đối tác.
 * Khớp enum `ProviderRevenueStatus` ở backend
 * (PENDING / ELIGIBLE / IN_SETTLEMENT / SETTLED).
 */
export const PROVIDER_REVENUE_STATUS_LABELS = {
  PENDING: "Chờ đủ điều kiện",
  ELIGIBLE: "Đủ điều kiện tất toán",
  IN_SETTLEMENT: "Đã gom vào đợt tất toán",
  SETTLED: "Đã tất toán",
};

/**
 * Nhãn tiếng Việt cho lý do giữ lại doanh thu (deferred reason).
 * Khớp enum `DeferredReason` ở backend.
 */
export const DEFERRED_REASON_LABELS = {
  PAYMENT_NOT_VERIFIED: "Chưa xác minh thanh toán",
  BOOKING_NOT_COMPLETED: "Chưa hoàn thành trải nghiệm",
  REFUND_PENDING: "Còn yêu cầu hoàn tiền",
  PERIOD_NOT_CLOSED: "Kỳ doanh thu chưa kết thúc",
  FINANCIAL_REVIEW_REQUIRED: "Cần kiểm tra đối soát tài chính",
};

/**
 * Nhãn tiếng Việt cho nguyên nhân hoàn tiền.
 */
export const REFUND_REASON_LABELS = {
  TOURIST_FAULT: "Lỗi khách du lịch (hoàn 50%)",
  PLATFORM_FAULT: "Lỗi nền tảng (hoàn 100%)",
};

/**
 * Nhãn tiếng Việt cho phương thức hoàn tiền.
 * Khớp enum `RefundMethod` ở backend.
 */
export const REFUND_METHOD_LABELS = {
  VNPAY_API: "Hoàn qua VNPay",
  MANUAL_BANK_TRANSFER: "Chuyển khoản thủ công",
};

/**
 * Nhãn tiếng Việt cho hành động trong nhật ký kiểm toán Refund.
 *
 * Khớp enum `RefundAuditLog.Action` ở backend.
 * Nhãn ở đây là thứ NGƯỜI DÙNG ĐỌC ĐƯỢC — không hiển thị mã kỹ thuật.
 */
/**
 * Nhãn tiếng Việt cho các ĐIỀU KIỆN tất toán (9 điều kiện bắt buộc).
 *
 * ⚠️ Backend trả về `description`/`detail` có thuật ngữ kỹ thuật tiếng Anh
 * (Payment / Booking / Refund / Settlement / OK). Ở đây ta dịch SẴN sang
 * tiếng Việt theo `code` của điều kiện ⇒ không bao giờ lộ thuật ngữ kỹ thuật
 * cho người dùng, và không phụ thuộc backend đã sửa nội dung hay chưa.
 *
 * Khớp `code` mà backend gửi lên (ProviderRevenueService#evaluateEligibility).
 */
export const SETTLEMENT_CHECK_LABELS = {
  "1_PAYMENT_VERIFIED": {
    title: "Thanh toán thành công đã được xác minh",
    passedDetail: "Giao dịch thanh toán đã được xác minh thành công.",
    failedDetail: "Giao dịch thanh toán chưa được xác minh thành công.",
  },
  "2_BOOKING_COMPLETED": {
    title: "Đơn đặt tour đã hoàn thành trải nghiệm",
    passedDetail: "Đơn đặt tour đã hoàn thành trải nghiệm.",
    failedDetail: "Đơn đặt tour chưa hoàn thành trải nghiệm.",
  },
  "3_NO_PENDING_REFUND": {
    title: "Không còn yêu cầu hoàn tiền chưa có kết quả",
    passedDetail: "Không còn yêu cầu hoàn tiền nào đang chờ xử lý.",
    failedDetail: "Còn yêu cầu hoàn tiền đang chờ hoặc đang xử lý.",
  },
  "4_REFUND_APPLIED": {
    title: "Số tiền hoàn tiền đã được cập nhật",
    passedDetail: "Số tiền đã hoàn đã được ghi nhận đầy đủ vào khoản doanh thu.",
    failedDetail: "Số tiền đã hoàn chưa được cập nhật đầy đủ vào khoản doanh thu.",
  },
  "5_NO_RECONCILIATION_ISSUE": {
    title: "Không có vấn đề đối soát tài chính",
    passedDetail: "Không có khoản điều chỉnh tài chính nào đang chờ xử lý.",
    failedDetail: "Có khoản điều chỉnh tài chính đang chờ xử lý.",
  },
  "6_NOT_SETTLED": {
    title: "Chưa bị tất toán và thuộc đúng đợt đang duyệt",
    passedDetail: "Khoản doanh thu chưa bị tất toán.",
    failedDetail: "Khoản doanh thu đã bị tất toán hoặc không thuộc đợt đang duyệt.",
  },
  "7_CALCULATED": {
    title: "Hoa hồng và tiền đối tác nhận đã được tính",
    passedDetail: "Đã tính xong hoa hồng và số tiền đối tác nhận.",
    failedDetail: "Chưa tính xong hoa hồng và số tiền đối tác nhận.",
  },
  "8_POSITIVE_NET": {
    title: "Số tiền đối tác nhận còn lại lớn hơn 0",
    passedDetail: "Số tiền đối tác nhận còn lại lớn hơn 0.",
    failedDetail: "Số tiền đối tác nhận còn lại không lớn hơn 0.",
  },
  "9_PERIOD_CLOSED": {
    title: "Kỳ doanh thu đã kết thúc",
    passedDetail: "Kỳ doanh thu của khoản này đã kết thúc.",
    failedDetail: "Kỳ doanh thu của khoản này chưa kết thúc.",
  },
};

/**
 * Dịch một điều kiện tất toán sang tiếng Việt.
 *
 * @param {object} check phần tử trong `checks` của API đánh giá điều kiện
 * @returns {{title: string, detail: string}} tiêu đề + mô tả tiếng Việt
 */
export function settlementCheckLabel(check) {
  const mapped = SETTLEMENT_CHECK_LABELS[check?.code];
  if (!mapped) {
    // Backend bổ sung điều kiện mới chưa có bản dịch → dùng mô tả gốc,
    // nhưng bỏ các mã kỹ thuật rõ ràng (OK) để không lộ thuật ngữ.
    const raw = String(check?.description ?? check?.code ?? "").trim();
    const title = raw
      .replace(/\bOK\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return { title: title || "Điều kiện tất toán", detail: "" };
  }
  return {
    title: mapped.title,
    detail: check?.passed ? mapped.passedDetail : mapped.failedDetail,
  };
}

/**
 * Chuẩn hoá thông điệp lỗi từ VNPay để KHÔNG BAO GIỜ hiển thị ra cho người dùng.
 *
 * VNPay trả về `vnp_ResponseCode = 99` kèm `vnp_Message = "Unexpected error"`
 * khi lỗi nằm ở phía hạ tầng/cấu hình (không phải lỗi nghiệp vụ) ⇒ thông điệp
 * này vô nghĩa với người dùng và chỉ gây hoang mang. Khi đó trả về chuỗi rỗng
 * ⇒ UI bỏ trống ô "Thông điệp" thay vì hiện chuỗi kỹ thuật.
 *
 * @param {string} responseCode mã phản hồi (`vnp_ResponseCode`)
 * @param {string} message      thông điệp thô (`vnp_Message`)
 */
export function vnpayMessageForUser(responseCode, message) {
  const code = String(responseCode ?? "").trim();
  const text = String(message ?? "").trim();

  // Mã 99 = lỗi không xác định phía hệ thống ⇒ tuyệt đối không lộ ra.
  if (code === "99") return "";

  // Các thông điệp lỗi kỹ thuật tiếng Anh của VNPay cũng không nên lộ.
  if (/^unexpected error$/i.test(text)) return "";
  if (/^(error|system error|internal error)$/i.test(text)) return "";

  return text;
}

/**
 * Mã phản hồi VNPay an toàn để hiển thị.
 *
 * Mã 99 là "lỗi không xác định phía hệ thống" — không mang ý nghĩa gì với người
 * dùng nên bị ẩn hoàn toàn (đi kèm thông điệp kỹ thuật tương ứng).
 *
 * @param {string} code mã phản hồi (`vnp_ResponseCode`)
 * @returns {string} mã an toàn để hiển thị, hoặc chuỗi rỗng nếu nên ẩn
 */
export function vnpayResponseCodeForUser(code) {
  const text = String(code ?? "").trim();
  if (!text || text === "99") return "";
  return text;
}

/**
 * Chuẩn hoá chi tiết nhật ký kiểm toán để KHÔNG BAO GIỜ lộ thông tin kỹ thuật.
 *
 * ── Các dạng thô cần xử lý ──
 *  1. Map tham số VNPay: `{vnp_ResponseId=…, vnp_Command=refund, vnp_SecureHash=…}`
 *     → thay bằng câu tự nhiên.
 *  2. Mã enum: `TOURIST_FAULT` / `PLATFORM_FAULT` / `VNPAY_API`
 *     → dịch sang tiếng Việt.
 *  3. Số tiền thô lặp lại: `750000.00`, `Số tiền đề xuất: 750000.00`
 *     → bỏ (số tiền đã hiển thị ở cột riêng trên UI).
 *  4. Thông điệp lỗi kỹ thuật: `Mã phản hồi: 99. Thông điệp: Unexpected error.`
 *     → bỏ hoàn toàn.
 *
 * ⚠️ Backend đã chuẩn hoá sẵn khi trả về (xem `RefundAuditDetailFormatter`) — hàm này
 * là lớp bảo vệ thứ hai, để UI không phụ thuộc vào việc backend đã xử lý hay chưa.
 *
 * @param {string} detail chi tiết gốc từ backend
 * @returns {string} chi tiết đã làm sạch
 */
export function sanitizeAuditDetail(detail) {
  if (!detail) return "";
  let text = String(detail).trim();

  // 0. Quy tắc theo TIỀN TỐ — giữ câu tự nhiên, bỏ hẳn phần thừa.
  // "Tourist gửi yêu cầu hoàn tiền. Nguyên nhân: … Số tiền đề xuất: …"
  //   → "Tourist gửi yêu cầu hoàn tiền."
  if (/^(?:Tourist|Khách du lịch)\s+gửi\s+yêu cầu\s+hoàn\s+tiền/i.test(text)) {
    return "Tourist gửi yêu cầu hoàn tiền.";
  }
  // "Admin phê duyệt hoàn 750000.00 — nguyên nhân: …" → "Quản trị viên phê duyệt hoàn tiền …"
  // Số tiền có thể kèm đơn vị ("750.000,00 ₫") ⇒ bắt cả phần đơn vị.
  text = text.replace(
    /^(?:Admin|Quản trị viên)\s+phê\s+duyệt\s+hoàn(?:\s+tiền)?\s+[\d.,]+\s*₫?/i,
    "Quản trị viên phê duyệt hoàn tiền",
  );
  // "phương thức: VNPay" → "phương thức VNPay" (bỏ dấu hai chấm thô).
  text = text.replace(/phương thức\s*:\s*/gi, "phương thức ");

  // 1. "Phản hồi VNPay: {vnp_...}" → câu tự nhiên.
  text = text.replace(
    /Phản hồi VNPay\s*:\s*\{[^{}]*\}/gi,
    "VNPay đã phản hồi yêu cầu hoàn tiền.",
  );
  // "Kiểm tra trạng thái từ VNPay: {vnp_...}" → câu tự nhiên.
  text = text.replace(
    /Kiểm tra trạng thái từ VNPay\s*:\s*\{[^{}]*\}/gi,
    "Đã kiểm tra lại trạng thái hoàn tiền với VNPay.",
  );
  // Map thô không có tiền tố (trường hợp phòng thủ) → gỡ hẳn.
  text = text.replace(/\{[^{}]*vnp_[^{}]*\}/gi, "");

  // 2. "Mã phản hồi: 99. Thông điệp: Unexpected error." → bỏ hoàn toàn.
  text = text.replace(/\s*Mã phản hồi:\s*\d+\.\s*Thông điệp:\s*[^.]*\.\s*/gi, " ");
  text = text.replace(/\s*Unexpected error\.?/gi, " ");

  // 3. Bỏ mệnh đề lý do (mã enum) — lý do đã hiển thị ở cột riêng.
  text = text.replace(
    /[,.]?\s*[Nn]guyên nhân\s*:\s*(TOURIST_FAULT|PLATFORM_FAULT)\s*[.,]?/g,
    " ",
  );
  // Bỏ "Số tiền đề xuất: 750000.00" — số tiền đã hiển thị ở cột riêng.
  text = text.replace(/[,.]?\s*Số tiền đề xuất\s*:\s*[\d.,]+\s*[.,]?/g, " ");

  // 4. Dịch mã enum còn sót lại.
  text = text.replace(/\bTOURIST_FAULT\b/g, "lỗi khách du lịch");
  text = text.replace(/\bPLATFORM_FAULT\b/g, "lỗi nền tảng");
  text = text.replace(/\bVNPAY_API\b/g, "VNPay");
  text = text.replace(/\bMANUAL_BANK_TRANSFER\b/g, "chuyển khoản thủ công");

  // 5. Bỏ số tiền thô đứng sau chữ "hoàn" (ví dụ "phê duyệt hoàn 750000.00 —").
  text = text.replace(/(?<=\shoàn\s)\d+(?:[.,]\d+)?(?=\s*[-–—.,]|$)/g, "");

  // 6. Dọn khoảng trắng & dấu câu thừa.
  // Em-dash luôn có khoảng trắng hai bên ("hoàn tiền — phương thức VNPay").
  text = text.replace(/—/g, " — ");
  text = text.replace(/\s{2,}/g, " ").trim();
  text = text.replace(/\s+([.,;:])/g, "$1");
  text = text.replace(/^[\s.,;:]+/, "");
  text = text.replace(/[.,;:\s]+$/, ".");

  return text.trim();
}

/**
 * Nhãn tiếng Việt cho hành động trong nhật ký kiểm toán Refund.
 *
 * Khớp enum `RefundAuditLog.Action` ở backend.
 * Nhãn ở đây là thứ NGƯỜI DÙNG ĐỌC ĐƯỢC — không hiển thị mã kỹ thuật.
 */
export const AUDIT_LOG_ACTION_LABELS = {
  CREATED: "Khách gửi yêu cầu",
  APPROVED: "Quản trị viên phê duyệt",
  REJECTED: "Quản trị viên từ chối",
  VNPAY_REQUEST_SENT: "Đã gửi yêu cầu tới VNPay",
  VNPAY_RESPONSE: "VNPay phản hồi",
  VNPAY_STATUS_UPDATED: "Cập nhật trạng thái hoàn tiền",
  MANUAL_TRANSFER_RECORDED: "Chuyển khoản thủ công — chờ thực hiện",
  MANUAL_TRANSFER_CONFIRMED: "Đã chuyển khoản thủ công",
  STATUS_UPDATED: "Cập nhật trạng thái",
  CANCELLED: "Đã hủy",
};

/**
 * Nhãn tiếng Việt cho hành động trong nhật ký kiểm toán — có fallback về chính mã
 * khi backend bổ sung hành động mới mà frontend chưa cập nhật.
 */
export function auditActionLabel(action) {
  if (!action) return "—";
  return AUDIT_LOG_ACTION_LABELS[action] ?? action;
}

/**
 * Tỷ lệ hoàn tiền theo nguyên nhân — khớp `FinanceProperties` ở backend
 * (tourist-fault 50%, platform-fault 100%).
 */
export const REFUND_RATE_BY_REASON = {
  TOURIST_FAULT: 0.5,
  PLATFORM_FAULT: 1,
};

/**
 * Tính số tiền hoàn theo nguyên nhân từ số tiền gốc của đơn.
 * Ví dụ: 1.500.000 + TOURIST_FAULT → 750.000; + PLATFORM_FAULT → 1.500.000.
 */
export function refundAmountForReason(paymentAmount, reason) {
  const base = toAmount(paymentAmount);
  const rate = REFUND_RATE_BY_REASON[reason] ?? 0.5;
  return Math.round(base * rate);
}

/**
 * Nhãn tiếng Việt cho phương thức hoàn tiền — dùng trong bảng "Phương thức".
 * `method` có thể null (tourist mới gửi yêu cầu, chưa chọn phương thức).
 */
export function refundMethodLabel(method) {
  if (!method) return "Chưa chọn";
  return REFUND_METHOD_LABELS[method] ?? method;
}

/**
 * Nhãn tiếng Việt cho trạng thái hoàn tiền — có fallback về chính mã khi chưa biết.
 * Dùng cho Cột bảng (nơi không được để trống) — dropdown lọc thì dùng
 * `REFUND_STATUS_LABELS` để bám đúng enum backend.
 */
export function refundStatusLabel(status) {
  if (!status) return "—";
  return REFUND_STATUS_LABELS[status] ?? status;
}

/**
 * Nhãn tiếng Việt cho phương thức thanh toán kèm ngân hàng — dùng cho cột bảng.
 * Ví dụ: "Cổng VNPay · Thẻ nội địa & tài khoản ngân hàng (Vietcombank)".
 */
export function paymentMethodLabel(payment) {
  const parts = [];
  parts.push(PAYMENT_METHOD_LABELS[payment?.method] ?? payment?.method ?? "—");
  if (payment?.cardType) {
    parts.push(PAYMENT_CARD_TYPE_LABELS[payment.cardType] ?? payment.cardType);
  }
  if (payment?.bankCode) {
    const bank = PAYMENT_BANK_CODE_LABELS[payment.bankCode] ?? payment.bankCode;
    parts.push(`(${bank})`);
  }
  return parts.join(" · ");
}

/**
 * Kiểm tra một giao dịch thanh toán có khớp từ khoá tìm kiếm hay không.
 *
 * ── Vì sao cần hàm này? ──
 * Ô "Tìm mã giao dịch / mã đơn" của trang quản trị lọc ở BACKEND trên toàn hệ thống.
 * Nhưng khi backend KHÔNG hỗ trợ tham số `search` (bản deploy cũ), lọc phía client
 * trên nội dung trang hiện tại là cách duy nhất còn lại — dùng chung hàm này để
 * tiêu chí khớp luôn giống tiêu chí của backend:
 *   • Mã giao dịch (`txnRef`)
 *   • Mã đơn (`bookingCode`)
 *   • Mã giao dịch VNPay (`vnpTransactionNo`)
 *
 * @param {object} payment giao dịch (PaymentResponse)
 * @param {string} keyword từ khoá đã trim & lowercase
 */
export function paymentMatchesKeyword(payment, keyword) {
  if (!keyword) return true;
  const needle = String(keyword).toLowerCase();
  const haystacks = [
    payment?.txnRef,
    payment?.bookingCode,
    payment?.vnpTransactionNo,
  ];
  return haystacks.some((value) =>
    value ? String(value).toLowerCase().includes(needle) : false,
  );
}

/**
 * Chuẩn hoá response phân trang của backend về một shape duy nhất.
 *
 * Backend trả `PageResponse<T>`: { page, size, totalElements, totalPages, first, last, content }.
 * Một số endpoint trả mảng thuần — khi đó coi như trang 0 duy nhất.
 *
 * @returns {{ content: Array, page: number, size: number, totalElements: number, totalPages: number }}
 */
export function normalizePage(data, fallbackSize = 20) {
  if (Array.isArray(data)) {
    return {
      content: data,
      page: 0,
      size: fallbackSize,
      totalElements: data.length,
      totalPages: data.length === 0 ? 0 : 1,
    };
  }
  const content = data?.content ?? [];
  return {
    content,
    page: data?.page ?? 0,
    size: data?.size ?? fallbackSize,
    totalElements: data?.totalElements ?? content.length,
    totalPages: data?.totalPages ?? 0,
  };
}

