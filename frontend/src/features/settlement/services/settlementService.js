/**
 * Service cho module Settlement (Tất toán) + Provider Revenue + Wallet.
 *
 * ── Contract ──
 *  • GET  /settlements/candidates?providerProfileId=&revenuePeriod= → SettlementCandidatesResponse
 *  • POST /settlements                    (ADMIN) body: { providerProfileId, revenuePeriod, note }
 *  • POST /settlements/{id}/approve       (ADMIN)
 *  • POST /settlements/{id}/reject        (ADMIN) body: { reason }
 *  • GET  /settlements/{id}               → SettlementResponse
 *  • GET  /settlements/{id}/details       → SettlementDetailResponse[]
 *  • GET  /settlements?status=            (ADMIN)
 *  • GET  /settlements/provider-profile/{providerProfileId}
 *
 *  • GET  /provider-revenues/provider-profile/{providerProfileId}
 *  • GET  /provider-revenues/{revenueId}/eligibility → 9 điều kiện tất toán
 *
 *  • GET  /wallets/provider-profile/{providerProfileId}
 *  • GET  /wallets/provider-profile/{providerProfileId}/transactions
 *
 * ── Luật nghiệp vụ ──
 *  • Kỳ doanh thu là THÁNG DƯƠNG LỊCH đã đóng (`YYYY-MM`). Backend từ chối tạo settlement
 *    cho kỳ chưa kết thúc (`SETTLEMENT_PERIOD_NOT_CLOSED`).
 *  • `POST /settlements` KHÔNG nhận danh sách revenueId — backend tự lấy các khoản ELIGIBLE
 *    của đối tác trong kỳ và chuyển chúng sang IN_SETTLEMENT.
 *  • Duyệt settlement ghi tiền vào ví trong CÙNG một transaction (nguyên tử).
 *    Đợt đã duyệt không thể từ chối — phải dùng khoản điều chỉnh tài chính.
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINT = "/settlements";

/** Ứng viên tất toán của một đối tác theo kỳ (đánh giá lại 9 điều kiện tại thời điểm gọi). */
export async function getSettlementCandidates(providerProfileId, revenuePeriod) {
  const query = new URLSearchParams({
    providerProfileId: String(providerProfileId),
    revenuePeriod: String(revenuePeriod),
  });
  const res = await apiClient.get(`${ENDPOINT}/candidates?${query.toString()}`);
  return res?.data ?? res;
}

/** Tạo bản nháp đợt tất toán (chỉ kỳ đã đóng). */
export async function createSettlement({ providerProfileId, revenuePeriod, note }) {
  const res = await apiClient.post(ENDPOINT, { providerProfileId, revenuePeriod, note });
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
export async function getSettlementsByProviderProfile(providerProfileId, { page = 0, size = 20 } = {}) {
  const res = await apiClient.get(
    `${ENDPOINT}/provider-profile/${providerProfileId}?page=${page}&size=${size}`,
  );
  return res?.data ?? res;
}
