/**
 * Service cho module Settlement (Tất toán) + Partner Revenue + Wallet.
 *
 * ── Contract ──
 *  • GET  /settlements/candidates?partnerId=&revenuePeriod= → SettlementCandidatesResponse
 *  • POST /settlements                    (ADMIN) body: { partnerId, revenuePeriod, note }
 *  • POST /settlements/{id}/approve       (ADMIN)
 *  • POST /settlements/{id}/reject        (ADMIN) body: { reason }
 *  • GET  /settlements/{id}               → SettlementResponse
 *  • GET  /settlements/{id}/details       → SettlementDetailResponse[]
 *  • GET  /settlements?status=            (ADMIN)
 *  • GET  /settlements/partner/{partnerId}
 *
 *  • GET  /partner-revenues/partners/{partnerId}
 *  • GET  /partner-revenues/{revenueId}/eligibility → 9 điều kiện tất toán
 *
 *  • GET  /wallets/partner/{partnerId}
 *  • GET  /wallets/partner/{partnerId}/transactions
 *
 * ── Luật nghiệp vụ ──
 *  • Kỳ doanh thu là THÁNG DƯƠNG LỊCH đã đóng (`YYYY-MM`). Backend từ chối tạo settlement
 *    cho kỳ chưa kết thúc (`SETTLEMENT_PERIOD_NOT_CLOSED`).
 *  • `POST /settlements` KHÔNG nhận danh sách revenueId — backend tự lấy các khoản ELIGIBLE
 *    của partner trong kỳ và chuyển chúng sang IN_SETTLEMENT.
 *  • Duyệt settlement ghi tiền vào ví trong CÙNG một transaction (nguyên tử).
 *    Đợt đã duyệt không thể từ chối — phải dùng khoản điều chỉnh tài chính.
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINT = "/settlements";

/** Ứng viên tất toán của một đối tác theo kỳ (đánh giá lại 9 điều kiện tại thời điểm gọi). */
export async function getSettlementCandidates(partnerId, revenuePeriod) {
  const query = new URLSearchParams({
    partnerId: String(partnerId),
    revenuePeriod: String(revenuePeriod),
  });
  const res = await apiClient.get(`${ENDPOINT}/candidates?${query.toString()}`);
  return res?.data ?? res;
}

/** Tạo bản nháp đợt tất toán (chỉ kỳ đã đóng). */
export async function createSettlement({ partnerId, revenuePeriod, note }) {
  const res = await apiClient.post(ENDPOINT, { partnerId, revenuePeriod, note });
  return res?.data ?? res;
}

/** Duyệt đợt tất toán — ghi tiền vào ví nguyên tử. */
export async function approveSettlement(settlementId) {
  const res = await apiClient.post(`${ENDPOINT}/${settlementId}/approve`);
  return res?.data ?? res;
}

/** Từ chối / hủy đợt tất toán — giải phóng các khoản doanh thu về ELIGIBLE/PENDING. */
export async function rejectSettlement(settlementId, reason) {
  const res = await apiClient.post(`${ENDPOINT}/${settlementId}/reject`, { reason });
  return res?.data ?? res;
}

/** Chi tiết một đợt tất toán. */
export async function getSettlementById(settlementId) {
  const res = await apiClient.get(`${ENDPOINT}/${settlementId}`);
  return res?.data ?? res;
}

/** Chi tiết từng khoản doanh thu trong đợt tất toán. */
export async function getSettlementDetails(settlementId) {
  const res = await apiClient.get(`${ENDPOINT}/${settlementId}/details`);
  return res?.data ?? res;
}

/** Danh sách toàn bộ đợt tất toán (ADMIN). */
export async function getAllSettlements({ status, page = 0, size = 20 } = {}) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) query.set("status", status);
  const res = await apiClient.get(`${ENDPOINT}?${query.toString()}`);
  return res?.data ?? res;
}

/**
 * Tổng hợp doanh thu nền tảng (ADMIN).
 *
 * Phần tiền nền tảng thu được sau khi tất toán cho đối tác
 * (= tổng thanh toán − tổng hoàn tiền − tổng chi trả đối tác = hoa hồng + điều chỉnh).
 * Chỉ tính các đợt tất toán đã DUYỆT.
 *
 * @param {number} periods số kỳ tối đa (mới nhất trước)
 */
export async function getPlatformRevenueSummary(periods = 12) {
  const query = new URLSearchParams({ periods: String(periods) });
  const res = await apiClient.get(`${ENDPOINT}/platform-revenue?${query.toString()}`);
  return res?.data ?? res;
}

/** Danh sách đợt tất toán của một đối tác. */
export async function getSettlementsByPartner(partnerId, { page = 0, size = 20 } = {}) {
  const res = await apiClient.get(`${ENDPOINT}/partner/${partnerId}?page=${page}&size=${size}`);
  return res?.data ?? res;
}
