/**
 * Service layer cho module Payment (VNPay).
 *
 * Endpoint tích hợp:
 *  - GET  /api/v1/payments/methods                    : phương thức thanh toán
 *  - POST /api/v1/payments/bookings/{id}/init         : khởi tạo / thử lại thanh toán
 *  - GET  /api/v1/payments/return?<query VNPay>       : xác minh sau khi VNPay redirect (public)
 *  - GET  /api/v1/payments/{paymentId}                : chi tiết giao dịch
 *  - POST /api/v1/payments/{paymentId}/query          : QueryDR trực tiếp với VNPay
 *  - GET  /api/v1/payments/my                         : lịch sử của tôi
 *  - GET  /api/v1/payments/bookings/{bookingId}       : các lần thử của một booking
 *  - GET  /api/v1/payments?status=                    : toàn bộ giao dịch (ADMIN)
 *
 * Không gọi /payments/ipn: đó là webhook server-to-server của VNPay.
 * Không tự dựng hay chỉnh sửa paymentUrl: URL đã được ký HMAC ở backend.
 */
import { apiClient } from "@/services/apiClient";
import { toPage } from "@/features/booking/services/bookingService";

const ENDPOINTS = {
  ROOT: "/payments",
  METHODS: "/payments/methods",
  MY: "/payments/my",
  RETURN: "/payments/return",
  BY_ID: (id) => `/payments/${id}`,
  QUERY: (id) => `/payments/${id}/query`,
  INIT: (bookingId) => `/payments/bookings/${bookingId}/init`,
  BY_BOOKING: (bookingId) => `/payments/bookings/${bookingId}`,
};

function unwrap(res) {
  return res?.data ?? res;
}

function pageQuery({ page = 0, size = 10, status } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set("status", status);
  return params.toString();
}

const paymentService = {
  async getMethods() {
    return unwrap(await apiClient.get(ENDPOINTS.METHODS));
  },

  /** @param {string} [bankCode] VNPAYQR | VNBANK | INTCARD | mã ngân hàng; bỏ trống để khách tự chọn. */
  async init(bookingId, bankCode) {
    const query = bankCode ? `?bankCode=${encodeURIComponent(bankCode)}` : "";
    return unwrap(await apiClient.post(`${ENDPOINTS.INIT(bookingId)}${query}`));
  },

  /** @param {string} search nguyên query string VNPay trả về, ví dụ "?vnp_TxnRef=...". */
  async processReturn(search) {
    return unwrap(await apiClient.get(`${ENDPOINTS.RETURN}${search}`));
  },

  async getById(paymentId) {
    return unwrap(await apiClient.get(ENDPOINTS.BY_ID(paymentId)));
  },

  /** QueryDR. Trả về { outcome, message }; outcome = UNKNOWN nghĩa là chưa rõ, KHÔNG phải thất bại. */
  async query(paymentId) {
    return unwrap(await apiClient.post(ENDPOINTS.QUERY(paymentId)));
  },

  async getMine(options) {
    return toPage(unwrap(await apiClient.get(`${ENDPOINTS.MY}?${pageQuery(options)}`)));
  },

  async getByBooking(bookingId, options) {
    return toPage(
      unwrap(await apiClient.get(`${ENDPOINTS.BY_BOOKING(bookingId)}?${pageQuery(options)}`)),
    );
  },

  /** ADMIN */
  async getAll(options) {
    return toPage(unwrap(await apiClient.get(`${ENDPOINTS.ROOT}?${pageQuery({ size: 20, ...options })}`)));
  },
};

export default paymentService;
