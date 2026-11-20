/**
 * Từ điển nghiệp vụ của tab "Tổng quan vận hành" (Admin).
 *
 * Mỗi thuật ngữ được dùng làm văn bản giải thích cho tooltip hover (component `Hint`).
 * Giữ nội dung ở đây để một nguồn duy nhất ⇒ dễ bảo trì, tránh rải rác trong JSX.
 */

/** Giải thích chung cho các thuật ngữ dùng ở nhiều nơi. */
export const GLOSSARY = {
  gmv: "Tổng giá trị booking đã thanh toán thành công (không tính chờ thanh toán).",
  platformRevenue:
    "Phần hoa hồng JourneyGo thu được từ các booking đã thanh toán thành công. KHÔNG phải toàn bộ tiền khách thanh toán.",
  refund: "Hoàn tiền hiển thị riêng, không tính trùng vào doanh thu nền tảng.",
  period:
    "Kỳ lọc áp dụng cho dòng tiền khách & doanh thu ghi nhận; tiền quyết toán tính theo kỳ doanh thu (yyyy-MM) của đợt tất toán.",
  settlementPeriod:
    "Kỳ doanh thu (yyyy-MM) mà các đợt đã phê duyệt tất toán. Khác với kỳ lọc ở thanh trên — tiền quyết toán theo kỳ doanh thu, không theo ngày duyệt.",
};

/** Giải thích cho các KPI ở hàng đầu tiên. */
export const KPI_HINTS = {
  revenue: GLOSSARY.platformRevenue,
  gmv: GLOSSARY.gmv,
  bookings: "Tổng số booking được tạo trong kỳ, bất kể trạng thái thanh toán.",
  success: "Booking đã thanh toán và được xác nhận (đã xác minh giao dịch thành công).",
  tourists: "Số khách du lịch có đặt tour trong kỳ (đếm theo khách duy nhất).",
  providers: "Số đối tác có ít nhất một tour đang mở bán (xuất bản) trong kỳ.",
};

/** Giải thích cho các thẻ bộ lọc thời gian. */
export const RANGE_HINTS = {
  today: "Toàn bộ số liệu tính trong ngày hôm nay (0h00 đến lúc hiện tại).",
  week: "Số liệu trong 7 ngày gần nhất tính từ thời điểm hiện tại.",
  month: "Số liệu trong 30 ngày gần nhất tính từ thời điểm hiện tại. Kỳ trước tương ứng là 30 ngày liền trước đó.",
  thisMonth: "Số liệu từ đầu tháng hiện tại đến thời điểm hiện tại.",
  prevMonth: "Số liệu của tháng trước. Dùng để so sánh với 'Tháng này'.",
  custom: "Tự chọn khoảng thời gian. Kỳ trước sẽ tự động là khoảng liền trước cùng độ dài.",
};

/** Giải thích cho các nhãn trong biểu đồ doanh thu & GMV. */
export const TREND_HINTS = {
  revenue: GLOSSARY.platformRevenue,
  gmv: GLOSSARY.gmv,
  current: "Tổng số liệu của kỳ đang chọn, cộng dồn toàn bộ các điểm trên biểu đồ.",
  previous: "Tổng số liệu của kỳ liền trước, cùng độ dài để so sánh công bằng.",
  delta: "Mức thay đổi (%) của kỳ hiện tại so với kỳ liền trước.",
};

/** Giải thích cho các trạng thái booking. */
export const BOOKING_STATE_HINTS = {
  success: "Booking đã thanh toán và được xác nhận (đã xác minh giao dịch thành công).",
  pendingPayment: "Booking đã tạo nhưng khách chưa hoàn tất thanh toán. Không tính vào GMV.",
  cancelled: "Booking bị khách hoặc đối tác hủy. Không phát sinh doanh thu.",
  failed: "Giao dịch thanh toán thất bại (VD: thẻ bị từ chối, hết thời gian thanh toán).",
  successRatio: "Tỷ lệ booking thành công trên tổng số booking phát sinh trong kỳ.",
};

/** Giải thích cho các mức độ ưu tiên trong Action Center. */
export const SEVERITY_HINTS = {
  URGENT: "Việc cần Admin xử lý ngay — ảnh hưởng trực tiếp tới tiền của khách hoặc nền tảng.",
  SOON: "Việc nên xử lý sớm — chưa chặn vận hành nhưng càng sớm càng tốt.",
  NORMAL: "Việc thường lệ, không gấp — xử lý theo thứ tự ưu tiên.",
};

/** Giải thích cho các chỉ số trong "Hoạt động khách du lịch". */
export const TOURIST_HINTS = {
  total: "Tổng số tài khoản khách du lịch (Tourist) đang có trên nền tảng, tính tới thời điểm xem.",
  newInPeriod: "Số tài khoản Tourist được đăng ký mới trong kỳ đang chọn.",
  active: "Số khách du lịch có ít nhất một lượt đặt tour trong kỳ đang chọn.",
  completedAtLeastOne: "Số khách du lịch đã hoàn thành ít nhất một tour (đã đi xong chuyến).",
  returningRate:
    "Khách đặt từ 2 lượt trở lên trong kỳ so với tổng khách có đặt tour.",
  returningRateDelta: "Mức thay đổi của tỷ lệ khách quay lại so với kỳ liền trước.",
};

/** Giải thích cho các chỉ số trong "Hoạt động đối tác". */
export const PARTNER_HINTS = {
  total: "Tổng số hồ sơ đối tác (Content Provider) trên nền tảng.",
  active: "Hồ sơ đối tác đang hoạt động — còn hiệu lực, không bị vô hiệu hoá.",
  inactive: "Hồ sơ đối tác không hoạt động — đã bị vô hiệu hoá hoặc hết hạn.",
  withPublishedTours: "Số đối tác đang có ít nhất một tour đang mở bán (xuất bản).",
  newInPeriod: "Số đối tác đăng ký hồ sơ mới trong kỳ đang chọn.",
  pendingApproval: "Số hồ sơ đối tác đang chờ Admin xét duyệt.",
};

/** Giải thích cho các chỉ số trong "Thống kê trải nghiệm". */
export const EXPERIENCE_HINTS = {
  unlocks: "Số lượt khách mở khóa (bắt đầu) một Experience trong kỳ.",
  checkIns: "Số lượt khách check-in tại điểm của Experience trong kỳ.",
  completed: "Số Experience khách đã hoàn thành xong trong kỳ.",
  completionRate: "Tỷ lệ hoàn thành: số Experience hoàn thành trên tổng số lượt mở khóa trong kỳ.",
};

/** Giải thích cho các chỉ số trong bảng "Top tour phổ biến". */
export const TOP_TOUR_HINTS = {
  bookings: "Số lượt đặt tour của tour này trong kỳ đang chọn.",
  revenue: "Doanh thu mà tour này tạo ra trong kỳ (đã trừ hoàn tiền).",
  completionRate: "Tỷ lệ khách hoàn thành chuyến đi này so với tổng lượt đặt của tour.",
};

/** Giải thích cho bảng "Quyết toán gần đây". */
export const SETTLEMENT_HINTS = {
  code: "Mã quyết toán do hệ thống sinh, dùng để tra cứu đợt tất toán.",
  providerName: "Đối tác nhận tiền từ đợt tất toán này. Đợt tổng (BATCH) gom nhiều đối tác.",
  revenuePeriod: "Kỳ doanh thu (yyyy-MM) mà đợt tất toán này tính tiền.",
  totalAmount: "Tổng tiền được cộng vào ví đối tác trong đợt tất toán này.",
  status: "Trạng thái đợt tất toán: Chờ duyệt / Đã quyết toán / Đã từ chối / Đã hủy.",
  DRAFT: "Đợt đang ở trạng thái bản nháp — Admin chưa phê duyệt nên tiền chưa về ví đối tác.",
  APPROVED: "Đợt đã được phê duyệt — tiền đã cộng vào ví đối tác.",
  REJECTED: "Đợt đã bị từ chối — không có tiền nào được chuyển.",
  CANCELLED: "Đợt đã bị hủy.",
};

/** Giải thích cho "Top địa điểm được ghé thăm". */
export const DESTINATION_HINTS = {
  checkIns: "Số lượt khách check-in tại địa điểm này trong kỳ.",
  completionRate: "Tỷ lệ lượt check-in tại địa điểm đã hoàn thành Experience.",
};

/** Giải thích cho nhật ký hoạt động gần đây. */
export const ACTIVITY_HINTS = {
  TOUR_SUBMITTED: "Đối tác vừa gửi duyệt một tour mới.",
  BOOKING_PAID: "Có booking mới được thanh toán thành công.",
  REFUND_REQUESTED: "Có yêu cầu hoàn tiền mới cần Admin xử lý.",
  SETTLEMENT_APPROVED: "Một đợt quyết toán doanh thu vừa được phê duyệt.",
  PARTNER_REGISTERED: "Có hồ sơ đối tác mới đăng ký, đang chờ xét duyệt.",
};
