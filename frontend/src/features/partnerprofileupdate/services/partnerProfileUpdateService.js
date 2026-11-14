/**
 * Service cho luồng "Yêu cầu đổi thông tin đối tác".
 *
 * ── Contract (đối tác) ──
 *  • GET  /partner-profile-updates/mine  → hồ sơ hiện tại + trạng thái yêu cầu
 *  • POST /partner-profile-updates       → gửi yêu cầu đổi thông tin
 *
 * ── Contract (admin) ──
 *  • GET   /partner-profile-updates/queue       → hàng đợi xử lý
 *  • GET   /partner-profile-updates/stats       → thống kê theo trạng thái
 *  • GET   /partner-profile-updates/{id}        → chi tiết + lịch sử thay đổi
 *  • PATCH /partner-profile-updates/{id}/approve
 *  • PATCH /partner-profile-updates/{id}/reject
 */
import { apiClient } from "@/services/apiClient";

const ENDPOINT = "/partner-profile-updates";

/** Thông tin đối tác hiện tại + yêu cầu đang chờ + yêu cầu gần nhất. */
export async function getMyProfileInfo() {
  const res = await apiClient.get(`${ENDPOINT}/mine`);
  return res?.data ?? res;
}

/** Gửi yêu cầu đổi thông tin. */
export async function submitProfileUpdate(payload) {
  const res = await apiClient.post(ENDPOINT, payload);
  return res?.data ?? res;
}

/** Hàng đợi yêu cầu đổi thông tin (Admin). */
export async function getQueue({ status, page = 0, size = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status && status !== "ALL") params.append("status", status);
  const res = await apiClient.get(`${ENDPOINT}/queue?${params.toString()}`);
  return res?.data ?? res;
}

/** Thống kê yêu cầu đổi thông tin theo trạng thái (Admin). */
export async function getStats() {
  const res = await apiClient.get(`${ENDPOINT}/stats`);
  return res?.data ?? res;
}

/** Chi tiết yêu cầu kèm lịch sử thay đổi (Admin). */
export async function getById(id) {
  const res = await apiClient.get(`${ENDPOINT}/${id}`);
  return res?.data ?? res;
}

/** Admin duyệt yêu cầu — ghi đè thông tin mới vào hồ sơ chính thức. */
export async function approveUpdate(id, note) {
  const res = await apiClient.patch(`${ENDPOINT}/${id}/approve`, { note: note || null });
  return res?.data ?? res;
}

/** Admin từ chối yêu cầu — bắt buộc có lý do. */
export async function rejectUpdate(id, reason) {
  const res = await apiClient.patch(`${ENDPOINT}/${id}/reject`, { reason });
  return res?.data ?? res;
}

/** Nhãn tiếng Việt của các trường thông tin đối tác (dùng cho màn hình so sánh). */
export const PARTNER_PROFILE_FIELD_LABELS = {
  phone: "Số điện thoại",
  representativeName: "Họ tên người đại diện",
  representativePosition: "Chức vụ người đại diện",
  businessName: "Tên doanh nghiệp / Cơ sở",
  taxCode: "Mã số thuế",
  businessRegistrationInfo: "Thông tin đăng ký kinh doanh",
  province: "Tỉnh / Thành phố",
  ward: "Phường / Xã",
  addressDetail: "Địa chỉ trụ sở",
  businessScope: "Phạm vi hoạt động",
  bankName: "Ngân hàng thụ hưởng",
  bankAccountNumber: "Số tài khoản",
  bankAccountHolder: "Tên chủ tài khoản",
};

/** Thứ tự hiển thị các trường. */
export const PARTNER_PROFILE_FIELD_ORDER = Object.keys(PARTNER_PROFILE_FIELD_LABELS);

/**
 * Chia thông tin đối tác thành 3 nhóm nghiệp vụ rõ ràng.
 *
 * <p>Dùng chung cho cả màn hình read-only của đối tác và modal so sánh của Admin
 * ⇒ hai bên luôn hiển thị cùng một cấu trúc, dễ đối chiếu.
 */
export const PARTNER_PROFILE_GROUPS = [
  {
    id: "representative",
    label: "Thông tin người đại diện",
    description: "Người đại diện doanh nghiệp và thông tin liên hệ",
    fields: ["phone", "representativeName", "representativePosition"],
  },
  {
    id: "business",
    label: "Thông tin doanh nghiệp",
    description: "Thông tin pháp lý, địa chỉ trụ sở và phạm vi hoạt động",
    fields: [
      "businessName",
      "taxCode",
      "businessRegistrationInfo",
      "province",
      "ward",
      "addressDetail",
      "businessScope",
    ],
  },
  {
    id: "payment",
    label: "Thông tin thanh toán",
    description: "Tài khoản ngân hàng nhận doanh thu",
    fields: ["bankName", "bankAccountNumber", "bankAccountHolder"],
  },
];
