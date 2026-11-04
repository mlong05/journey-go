/**
 * Service cho Partner Revenue (Doanh thu đối tác) và Wallet (Ví nội bộ).
 *
 * ── Contract ──
 *  • GET /partner-revenues/partners/{partnerId}  → PageResponse<PartnerRevenueResponse>
 *  • GET /partner-revenues/{revenueId}           → PartnerRevenueResponse
 *  • GET /partner-revenues/{revenueId}/eligibility → { eligible, deferredReason, checks[] }
 *  • GET /partner-revenues/bookings/{bookingId}  → PartnerRevenueResponse[]
 *  • GET /partner-revenues?status=                (ADMIN)
 *
 *  • GET /wallets/partner/{partnerId}             → WalletResponse
 *  • GET /wallets/partner/{partnerId}/transactions → PageResponse<WalletTransactionResponse>
 *  • GET /wallets/{walletId}
 *  • GET /wallets/{walletId}/transactions
 *
 * ── Luật nghiệp vụ ──
 *  • Số dư ví phản ánh QUYỀN LỢI TÀI CHÍNH đã được ghi nhận, KHÔNG đồng nghĩa tiền đã
 *    chuyển vào tài khoản ngân hàng.
 *  • Mọi biến động số dư đều có một giao dịch tương ứng: SETTLEMENT_CREDIT,
 *    REFUND_ADJUSTMENT, MANUAL_ADJUSTMENT.
 */
import { apiClient } from "@/services/apiClient";

const REVENUE_ENDPOINT = "/partner-revenues";
const WALLET_ENDPOINT = "/wallets";

/** Danh sách doanh thu của một đối tác. */
export async function getRevenuesByPartner(partnerId, { page = 0, size = 20 } = {}) {
  const res = await apiClient.get(
    `${REVENUE_ENDPOINT}/partners/${partnerId}?page=${page}&size=${size}`,
  );
  return res?.data ?? res;
}

/** Chi tiết một khoản doanh thu. */
export async function getRevenueById(revenueId) {
  const res = await apiClient.get(`${REVENUE_ENDPOINT}/${revenueId}`);
  return res?.data ?? res;
}

/**
 * Đánh giá lại 9 điều kiện đủ tư cách tất toán tại thời điểm gọi.
 * @returns {Promise<{eligible: boolean, deferredReason: string|null, checks: Array}>}
 */
export async function evaluateEligibility(revenueId) {
  const res = await apiClient.get(`${REVENUE_ENDPOINT}/${revenueId}/eligibility`);
  return res?.data ?? res;
}

/** Doanh thu phát sinh từ một booking. */
export async function getRevenuesByBooking(bookingId) {
  const res = await apiClient.get(`${REVENUE_ENDPOINT}/bookings/${bookingId}`);
  return res?.data ?? res;
}

/** Danh sách doanh thu theo trạng thái (ADMIN). */
export async function getAllRevenues({ status, page = 0, size = 20 } = {}) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.set("status", status);
  const res = await apiClient.get(`${REVENUE_ENDPOINT}?${query.toString()}`);
  return res?.data ?? res;
}

/** Số dư ví của một đối tác. */
export async function getPartnerWallet(partnerId) {
  const res = await apiClient.get(`${WALLET_ENDPOINT}/partner/${partnerId}`);
  return res?.data ?? res;
}

/** Lịch sử giao dịch ví của một đối tác. */
export async function getPartnerWalletTransactions(partnerId, { page = 0, size = 20 } = {}) {
  const res = await apiClient.get(
    `${WALLET_ENDPOINT}/partner/${partnerId}/transactions?page=${page}&size=${size}`,
  );
  return res?.data ?? res;
}

/** Chi tiết ví theo ID. */
export async function getWalletById(walletId) {
  const res = await apiClient.get(`${WALLET_ENDPOINT}/${walletId}`);
  return res?.data ?? res;
}

/** Lịch sử giao dịch của một ví theo ID. */
export async function getWalletTransactions(walletId, { page = 0, size = 20 } = {}) {
  const res = await apiClient.get(`${WALLET_ENDPOINT}/${walletId}/transactions?page=${page}&size=${size}`);
  return res?.data ?? res;
}
