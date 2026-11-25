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
    "Phần hoa hồng JourneyGo thu được từ các booking đã thanh toán thành công, đã trừ phần hoàn tiền. KHÔNG phải toàn bộ tiền khách thanh toán.",
  refund: "Hoàn tiền hiển thị riêng, không tính trùng vào doanh thu nền tảng.",
};

/** Giải thích cho các KPI ở hàng đầu tiên. */
export const KPI_HINTS = {
  revenue: GLOSSARY.platformRevenue,
  gmv: GLOSSARY.gmv,
  success: "Booking đã thanh toán và được xác nhận (đã xác minh giao dịch thành công).",
  tourists: "Số khách du lịch có đặt tour trong kỳ (đếm theo khách duy nhất).",
  refundRate: "Tiền đã hoàn khách chia cho GMV của kỳ. Tỷ lệ cao bất thường ⇒ kiểm tra chất lượng tour hoặc chính sách hoàn.",
  avgBookingValue: "GMV chia cho số booking thành công — giá trị trung bình mỗi đơn trong kỳ.",
  successRate: "Tỷ lệ booking thành công trên tổng số booking phát sinh trong kỳ.",
};


/** Giải thích cho các thẻ bộ lọc thời gian. */
export const RANGE_HINTS = {
  today: "Toàn bộ số liệu tính trong ngày hôm nay (0h00 đến lúc hiện tại).",
  week: "Số liệu trong 7 ngày gần nhất tính từ thời điểm hiện tại.",
  month: "Số liệu trong 30 ngày gần nhất tính từ thời điểm hiện tại.",
  thisMonth: "Số liệu từ đầu tháng hiện tại đến thời điểm hiện tại.",
  prevMonth: "Số liệu của tháng trước. Dùng để so sánh với 'Tháng này'.",
  custom: "Tự chọn khoảng thời gian. Kỳ trước sẽ tự động là khoảng liền trước cùng độ dài.",
};

/** Giải thích cho các bậc của phễu chuyển đổi đặt tour. */
export const FUNNEL_HINTS = {
  created: "Số booking được tạo trong kỳ (kể cả chưa thanh toán).",
  paid: "Số booking đã thanh toán thành công trong kỳ.",
  completed: "Số booking đã hoàn thành trải nghiệm trong kỳ.",
  drop:
    "Số khách rơi ra khỏi phễu ở bậc này. Bậc 'đã thanh toán → đã trải nghiệm' thấp ⇒ kiểm tra chất lượng tour hoặc vấn đề check-in.",
};

/** Giải thích cho khối "Doanh thu theo khu vực". */
export const REGION_HINTS = {
  basis: "Khu vực lấy theo tour",
  share: "Tỷ trọng doanh thu của khu vực so với tổng doanh thu trong kỳ.",
  unassigned: "Tour chưa được gán khu vực — vẫn tính vào tổng để số liệu không bị thiếu.",
};


/** Giải thích cho các trạng thái booking. */
export const BOOKING_STATE_HINTS = {
  success: "Booking đã thanh toán và được xác nhận (đã xác minh giao dịch thành công).",
  pendingPayment: "Booking đã tạo nhưng khách chưa hoàn tất thanh toán. Không tính vào GMV.",
  cancelled: "Booking bị khách hoặc đối tác hủy. Không phát sinh doanh thu.",
  failed: "Giao dịch thanh toán thất bại (VD: thẻ bị từ chối, hết thời gian thanh toán).",
  successRatio: "Tỷ lệ booking thành công trên tổng số booking phát sinh trong kỳ.",
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

/** Giải thích cho "Top địa điểm được ghé thăm". */
export const DESTINATION_HINTS = {
  checkIns: "Số lượt khách check-in tại địa điểm này trong kỳ.",
  completionRate: "Tỷ lệ lượt check-in tại địa điểm đã hoàn thành Experience.",
};

/** Giải thích cho khối "Doanh thu nền tảng" (theo tháng dương lịch). */
export const REVENUE_HINTS = {
  monthToDate:
    "Hoa hồng JourneyGo từ đầu tháng tới hiện tại, đã trừ phần hoàn tiền. Gom theo ngày khách thanh toán.",
  sameDays:
    "Cùng số ngày của tháng trước (VD: 1–24/10 khi hôm nay là 24/11) — so sánh công bằng, không bị thiệt vì tháng chưa hết.",
  previousFull: "Toàn bộ doanh thu nền tảng của tháng trước.",
  projected:
    "Ước tính doanh thu cả tháng nếu giữ tốc độ hiện tại: doanh thu từ đầu tháng ÷ thời gian đã qua × độ dài tháng.",
  gmv: GLOSSARY.gmv,
  takeRate:
    "Doanh thu nền tảng chia cho GMV. Thấp hơn tỷ lệ hoa hồng cấu hình khi có hoàn tiền hoặc voucher nền tảng.",
  refund: "Tiền đã hoàn cho khách của các booking thanh toán trong tháng này.",
  bookings: "Số booking được thanh toán thành công trong tháng (đang xác nhận hoặc đã hoàn thành).",
  lastYear: "Doanh thu nền tảng của cùng tháng năm trước, để thấy yếu tố mùa vụ.",
  splitProvider: "Phần tiền đối tác được nhận sau khi trừ hoa hồng (và voucher đối tác nếu có).",
  splitCommission: "Hoa hồng JourneyGo giữ lại — chính là doanh thu nền tảng.",
  splitVoucher: "Số tiền giảm giá từ voucher (nền tảng hoặc đối tác tài trợ).",
  splitRefund: "Phần đã hoàn trả lại cho khách.",
};
