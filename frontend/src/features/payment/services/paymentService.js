/**
 * Service cho module Payment (VNPay) — phía WEB.
 *
 * ── Phạm vi ──
 * THANH TOÁN DIỄN RA TRÊN MOBILE (du khách đặt tour và thanh toán trong app).
 * Web KHÔNG có màn checkout / trang kết quả thanh toán.
 *
 * Web chỉ dùng API thanh toán ở góc nhìn QUẢN TRỊ:
 *  • `GET /payments`               → danh sách giao dịch toàn hệ thống (ADMIN)
 *  • `GET /payments/{id}`          → chi tiết giao dịch
 *  • `GET /payments/summary`       → tổng hợp doanh thu (ADMIN)
 *  • `POST /payments/{id}/query`   → tra cứu QueryDR
 *  • `GET /payments/bookings/{id}` → các lần thử của một booking
 *
 * ── Luật nghiệp vụ ──
 *  • Trạng thái: PENDING / PROCESSING / SUCCESS / FAILED / CANCELLED / EXPIRED.
 *    `PROCESSING` KHÔNG phải thất bại — tuyệt đối không hiển thị như lỗi.
 *  • Nếu lần thử trước chưa rõ kết quả, backend trả 409 `PAYMENT_NOT_RETRYABLE` →
 *    phải gọi `POST /payments/{id}/query` (QueryDR) rồi mới cho phép thử lại.
 */
import { apiClient } from "@/services/apiClient";
import { normalizePage, paymentMatchesKeyword } from "@/lib/money";
import { toPage } from "@/features/booking/services/bookingService";

const ENDPOINT = "/payments";

/** Danh sách 3 nhóm phương thức thanh toán + danh sách ngân hàng từ VNPay. */
export async function getPaymentMethods() {
  const res = await apiClient.get(`${ENDPOINT}/methods`);
  return res?.data ?? res;
}

/** Chi tiết một giao dịch thanh toán. */
export async function getPaymentById(paymentId) {
  const res = await apiClient.get(`${ENDPOINT}/${paymentId}`);
  return res?.data ?? res;
}

/** Các lần thử thanh toán của một booking (dùng để tìm `paymentId` khi quay lại từ VNPay). */
export async function getPaymentsByBooking(bookingId, { page = 0, size = 10 } = {}) {
  const res = await apiClient.get(`${ENDPOINT}/bookings/${bookingId}?page=${page}&size=${size}`);
  return res?.data ?? res;
}

/**
 * Truy vấn trực tiếp kết quả giao dịch với VNPay (QueryDR).
 * Dùng khi kết quả chưa rõ: timeout, callback đến muộn, hoặc sau 409 PAYMENT_NOT_RETRYABLE.
 * @returns {Promise<{outcome: string, message: string}>}
 *          outcome ∈ SUCCESS | FAILED | CANCELLED | DUPLICATE | UNKNOWN
 */
export async function queryPayment(paymentId) {
  const res = await apiClient.post(`${ENDPOINT}/${paymentId}/query`);
  return res?.data ?? res;
}

/**
 * Danh sách toàn bộ giao dịch (ADMIN).
 *
 * @param search từ khoá tìm theo mã giao dịch / mã đơn / mã giao dịch VNPay.
 *             Tìm kiếm chạy ở BACKEND trên toàn hệ thống — nên mã giao dịch nằm ở
 *             trang khác vẫn tìm thấy được (lọc ở frontend chỉ lọc trong 1 trang).
 */
export async function getAllPayments({ status, search, page = 0, size = 20 } = {}) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.set("status", status);
  if (search && String(search).trim()) query.set("search", String(search).trim());
  const res = await apiClient.get(`${ENDPOINT}?${query.toString()}`);
  return res?.data ?? res;
}

/**
 * Tìm kiếm giao dịch trên TOÀN HỆ THỐNG theo mã giao dịch / mã đơn / mã VNPay.
 *
 * ── Vì sao cần hàm riêng? ──
 * Backend hỗ trợ tham số `search` (lọc ở database TRƯỚC khi phân trang) — đây là
 * cách ĐÚNG: mã giao dịch nằm ở trang 3 vẫn tìm thấy được khi đang ở trang 1.
 *
 * Nhưng nếu bản backend đang chạy KHÔNG hỗ trợ `search`, lọc ở client trên
 * nội dung trang hiện tại sẽ cho kết quả SAI (mã ở trang khác không bao giờ
 * xuất hiện). Hàm này vì vậy:
 *   1. Gọi API kèm `search`.
 *   2. Kiểm tra xem backend có THẬT SỰ lọc không (so kết quả với tiêu chí khớp).
 *   3. Nếu backend lọc đúng → trả thẳng (kèm phân trang của backend).
 *      Nếu backend bỏ qua → quét TẤT CẢ các trang, lọc ở client, tự phân trang.
 *
 * Kết quả luôn được phân trang ĐÚNG theo `page`/`size` ⇒ bấm "Sau" vẫn đúng.
 *
 * @returns {Promise<{content: Array, page: number, size: number,
 *                    totalElements: number, totalPages: number}>}
 */
export async function searchPayments({ search, status, page = 0, size = 20 } = {}) {
  const keyword = search ? String(search).trim() : "";

  // Không có từ khoá → gọi thẳng endpoint danh sách (không cần quét nhiều trang).
  if (!keyword) {
    const data = await getAllPayments({ status, page, size });
    return normalizePage(data, size);
  }

  // Có từ khoá → lọc ở backend trước (đây là đường chính).
  let serverResult;
  try {
    const data = await getAllPayments({ status, search: keyword, page, size });
    serverResult = normalizePage(data, size);
  } catch (err) {
    // Backend lỗi (VD. bản deploy cũ chưa hỗ trợ `search`) → quét tất cả trang.
    return scanAllPagesForKeyword({ status, keyword, page, size });
  }

  // Backend ĐÃ lọc đúng:
  //  • có kết quả khớp        → dùng luôn (phân trang do backend đảm bảo).
  //  • rỗng hoàn toàn          → thật sự không có giao dịch nào khớp.
  //  • trả về BẤT kỳ mà không có dòng nào khớp ⇒ backend BỎ QUA tham số `search`
  //    (bản cũ) ⇒ phải tự quét toàn hệ thống, nếu không mã ở trang khác sẽ
  //    không bao giờ hiện ra.
  const anyMatch = serverResult.content.some((p) => paymentMatchesKeyword(p, keyword));
  if (anyMatch || serverResult.totalElements === 0) {
    return serverResult;
  }

  return scanAllPagesForKeyword({ status, keyword, page, size });
}

/**
 * Fallback: quét TẤT CẢ các trang rồi lọc ở client — dùng khi backend không hỗ trợ
 * tìm kiếm toàn hệ thống. Kết quả tự phân trang theo `page`/`size` ⇒ bấm "Sau"
 * vẫn hiển thị đúng.
 */
async function scanAllPagesForKeyword({ status, keyword, page, size }) {
  const all = await fetchAllPages({ status, size });
  const matches = all.content.filter((p) => paymentMatchesKeyword(p, keyword));
  const totalPages = Math.max(1, Math.ceil(matches.length / size));
  const start = page * size;
  return {
    content: matches.slice(start, start + size),
    page,
    size,
    totalElements: matches.length,
    totalPages,
  };
}

/**
 * Quét TẤT CẢ các trang của endpoint danh sách (dùng làm fallback khi backend
 * không hỗ trợ tìm kiếm toàn hệ thống).
 *
 * Có giới hạn cứng `MAX_SCAN_PAGES` để tránh quét vô hạn khi bảng rất lớn.
 */
const MAX_SCAN_PAGES = 50;

async function fetchAllPages({ status, size = 20 }) {
  const collected = [];
  let page = 0;
  let totalPages = 1;

  do {
    const data = await getAllPayments({ status, page, size });
    const normalized = normalizePage(data, size);
    collected.push(...normalized.content);
    totalPages = normalized.totalPages || 1;
    page += 1;
  } while (page < totalPages && page < MAX_SCAN_PAGES);

  return { content: collected };
}

/**
 * Tổng hợp giao dịch thanh toán TOÀN HỆ THỐNG (ADMIN).
 *
 * Dùng cho ô chỉ số "Tổng tiền đã thu" — KHÔNG cộng trên nội dung trang,
 * vì mỗi lần đổi trang sẽ ra một con số khác nhau (sai lệch đối soát).
 */
export async function getPaymentSummary() {
  const res = await apiClient.get(`${ENDPOINT}/summary`);
  return res?.data ?? res;
}

/** Trạng thái cuối cùng của một giao dịch — dùng để quyết định dừng poll hay chưy. */
export const FINAL_PAYMENT_STATUSES = ["SUCCESS", "FAILED", "CANCELLED"];

/** `PROCESSING` là trạng thái đang xử lý — KHÔNG phải lỗi, KHÔNG được coi là thất bại. */
export function isPaymentFinal(status) {
  return FINAL_PAYMENT_STATUSES.includes(status);
}

/** Giao dịch đã thất bại/đã hủy ⇒ được phép thử lại (nếu booking còn trong hạn). */
export function isRetryable(status) {
  return ["FAILED", "CANCELLED", "EXPIRED"].includes(status);
}

/**
 * Service dạng object (default export) — dùng bởi code gọi `paymentService.xxx`.
 *
 * Lưu ý: `getByBooking` trả về dạng chuẩn hoá `{ items, page, totalPages,
 * totalElements }` (qua `toPage`) để tương thích với code đang dùng
 * `paymentService.getByBooking(...).items`.
 */
const paymentService = {
  getMethods: getPaymentMethods,
  getById: getPaymentById,
  getByBooking: (bookingId, options) => toPage(getPaymentsByBooking(bookingId, options)),
  query: queryPayment,
  getAll: (options) => toPage(getAllPayments(options)),
  search: searchPayments,
  summary: getPaymentSummary,
};

export default paymentService;
