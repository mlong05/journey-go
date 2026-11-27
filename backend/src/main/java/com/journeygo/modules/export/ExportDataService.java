package com.journeygo.modules.export;

import com.journeygo.modules.audit.entity.SystemAuditLog;
import com.journeygo.modules.audit.repository.SystemAuditLogRepository;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.providerrevenue.entity.ProviderRevenue;
import com.journeygo.modules.providerrevenue.repository.ProviderRevenueRepository;
import com.journeygo.modules.refund.entity.RefundRequest;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.refund.repository.RefundRequestRepository;
import com.journeygo.modules.tourfeedback.entity.TourCustomerReview;
import com.journeygo.modules.tourfeedback.repository.TourCustomerReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Thu thập dữ liệu cho các tập dữ liệu xuất (D2 — "Export dữ liệu").
 *
 * <p>⚠️ Vì sao tách khỏi lớp sinh file?
 * <ul>
 *   <li>Tách "lấy dữ liệu" và "ghi file" ⇒ có thể kiểm thử phần dữ liệu không cần đụng POI.</li>
 *   <li>Mỗi tập dữ liệu có BỘ LỌC RIÊNG (khoảng ngày, trạng thái, từ khoá) — trả về
 *       một bảng dữ liệu phẳng (danh sách cột + danh sách dòng) để lớp ghi file chỉ
 *       cần biết "in ra".</li>
 * </ul>
 *
 * <p>Giới hạn an toàn: mỗi lần xuất tối đa {@link #MAX_ROWS} dòng để không làm cạn
 * bộ nhớ / không tạo file quá lớn khi bảng có hàng triệu bản ghi.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExportDataService {

    /** Trần số dòng cho một lần xuất. */
    public static final int MAX_ROWS = 50_000;

    private final BookingRepository bookingRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final ProviderRevenueRepository providerRevenueRepository;
    private final TourCustomerReviewRepository reviewRepository;
    private final SystemAuditLogRepository auditLogRepository;

    // ── Bảng dữ liệu phẳng ───────────────────────────────────────────────────

    /**
     * Một bảng dữ liệu phẳng: tên cột + các dòng (mỗi dòng là danh sách ô kiểu
     * {@link Object} — để lớp ghi file tự quyết định kiểu hiển thị (số / ngày / chuỗi).
     */
    public record ExportTable(List<String> columns, List<List<Object>> rows) {

        public int rowCount() {
            return rows.size();
        }
    }

    // ── Entry point ──────────────────────────────────────────────────────────

    /**
     * Thu thập dữ liệu cho một tập dữ liệu với bộ lọc đã chuẩn hoá.
     *
     * @param dataset   tập dữ liệu (null ⇒ không hợp lệ)
     * @param from      ngày bắt đầu (null = không lọc)
     * @param to        ngày kết thúc (null = không lọc)
     * @param status    trạng thái lọc (null = không lọc) — ý nghĩa phụ thuộc tập dữ liệu
     * @param keyword   từ khoá lọc (null/blank = không lọc)
     */
    @Transactional(readOnly = true)
    public ExportTable collect(ExportDataset dataset,
                               LocalDate from,
                               LocalDate to,
                               String status,
                               String keyword) {
        return switch (dataset) {
            case BOOKINGS -> bookings(from, to, status, keyword);
            case REFUNDS -> refunds(from, to, status, keyword);
            case PROVIDER_REVENUES -> providerRevenues(from, to, status, keyword);
            case TOUR_REVIEWS -> tourReviews(from, to, status, keyword);
            case AUDIT_LOGS -> auditLogs(from, to, status, keyword);
        };
    }

    // ── Từng tập dữ liệu ────────────────────────────────────────────────────

    private ExportTable bookings(LocalDate from, LocalDate to, String status, String keyword) {
        List<String> columns = List.of(
                "Mã đơn", "Tên tour", "Khách hàng", "Email khách", "Ngày trải nghiệm",
                "Trạng thái đơn", "Tổng tiền", "Giảm giá voucher", "Số slot", "Ngày tạo đơn");

        Pageable pageable = PageRequest.of(0, MAX_ROWS,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Booking> rows = bookingRepository.findAll(pageable).stream()
                .filter(b -> inRange(b.getExperienceDate(), from, to))
                .filter(b -> status == null || status.isBlank() || b.getStatus().name().equalsIgnoreCase(status))
                .filter(b -> keyword == null || keyword.isBlank() || matchesBooking(b, keyword))
                .toList();

        List<List<Object>> data = new ArrayList<>(rows.size());
        for (Booking b : rows) {
            data.add(List.of(
                    nz(b.getBookingCode()),
                    nz(b.getTour() != null ? b.getTour().getTitle() : null),
                    nz(b.getTourist() != null ? b.getTourist().getFullName() : null),
                    nz(b.getTourist() != null ? b.getTourist().getEmail() : null),
                    b.getExperienceDate() != null ? b.getExperienceDate().toString() : "",
                    b.getStatus() != null ? b.getStatus().name() : "",
                    b.getTotalAmount() != null ? b.getTotalAmount() : "",
                    b.getDiscountAmount() != null ? b.getDiscountAmount() : "",
                    b.getSlotCount(),
                    b.getCreatedAt() != null ? b.getCreatedAt().toString() : ""));
        }
        return new ExportTable(columns, data);
    }

    private ExportTable refunds(LocalDate from, LocalDate to, String status, String keyword) {
        List<String> columns = List.of(
                "Mã yêu cầu", "Mã đơn", "Khách hàng", "Trạng thái", "Phương thức",
                "Số tiền đề xuất", "Số tiền duyệt", "Số tiền đã hoàn", "Lý do",
                "Ngày tạo", "Ngày xử lý");

        Pageable pageable = PageRequest.of(0, MAX_ROWS,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        List<RefundRequest> rows = refundRequestRepository.findAll(pageable).stream()
                .filter(r -> inRange(r.getCreatedAt() != null ? r.getCreatedAt().atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate() : null, from, to))
                .filter(r -> status == null || status.isBlank() || r.getStatus().name().equalsIgnoreCase(status))
                .filter(r -> keyword == null || keyword.isBlank() || matchesRefund(r, keyword))
                .toList();

        List<List<Object>> data = new ArrayList<>(rows.size());
        for (RefundRequest r : rows) {
            data.add(List.of(
                    nz(r.getRefundCode()),
                    nz(r.getPayment() != null && r.getPayment().getBooking() != null
                            ? r.getPayment().getBooking().getBookingCode() : null),
                    nz(r.getTourist() != null ? r.getTourist().getFullName() : null),
                    r.getStatus() != null ? r.getStatus().name() : "",
                    r.getMethod() != null ? r.getMethod().name() : "",
                    r.getProposedAmount() != null ? r.getProposedAmount() : "",
                    r.getApprovedAmount() != null ? r.getApprovedAmount() : "",
                    r.getRefundedAmount() != null ? r.getRefundedAmount() : "",
                    nz(r.getApprovedReasonCode() != null ? r.getApprovedReasonCode() : r.getDeclaredReasonCode()),
                    r.getCreatedAt() != null ? r.getCreatedAt().toString() : "",
                    r.getReviewedAt() != null ? r.getReviewedAt().toString() : ""));
        }
        return new ExportTable(columns, data);
    }

    private ExportTable providerRevenues(LocalDate from, LocalDate to, String status, String keyword) {
        List<String> columns = List.of(
                "Kỳ doanh thu", "Đối tác", "Mã đơn", "Ngày hoàn thành", "Tổng tiền gốc",
                "Tổng hoàn tiền", "Tỷ lệ hoa hồng", "Hoa hồng nền tảng", "Điều chỉnh",
                "Giảm giá voucher", "Tiền đối tác nhận", "Trạng thái", "Ngày tất toán");

        Pageable pageable = PageRequest.of(0, MAX_ROWS,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        List<ProviderRevenue> rows = providerRevenueRepository.findAll(pageable).stream()
                .filter(r -> inRange(r.getCompletedDate(), from, to))
                .filter(r -> status == null || status.isBlank() || r.getStatus().name().equalsIgnoreCase(status))
                .filter(r -> keyword == null || keyword.isBlank() || matchesRevenue(r, keyword))
                .toList();

        List<List<Object>> data = new ArrayList<>(rows.size());
        for (ProviderRevenue r : rows) {
            data.add(List.of(
                    nz(r.getRevenuePeriod()),
                    nz(r.getProviderProfile() != null ? r.getProviderProfile().getProviderName() : null),
                    nz(r.getBooking() != null ? r.getBooking().getBookingCode() : null),
                    r.getCompletedDate() != null ? r.getCompletedDate().toString() : "",
                    r.getGrossAmount() != null ? r.getGrossAmount() : "",
                    r.getRefundAmount() != null ? r.getRefundAmount() : "",
                    r.getCommissionRate() != null ? r.getCommissionRate() : "",
                    r.getCommissionAmount() != null ? r.getCommissionAmount() : "",
                    r.getAdjustmentAmount() != null ? r.getAdjustmentAmount() : "",
                    r.getVoucherDiscount() != null ? r.getVoucherDiscount() : "",
                    r.getProviderNetAmount() != null ? r.getProviderNetAmount() : "",
                    r.getStatus() != null ? r.getStatus().name() : "",
                    r.getSettledAt() != null ? r.getSettledAt().toString() : ""));
        }
        return new ExportTable(columns, data);
    }

    private ExportTable tourReviews(LocalDate from, LocalDate to, String status, String keyword) {
        List<String> columns = List.of(
                "ID đánh giá", "Tour", "Người viết", "Tổng điểm", "Hướng dẫn viên",
                "Văn hóa", "Lịch trình", "Đáng giá tiền", "Tiêu đề", "Nội dung",
                "Trạng thái hiển thị", "Lý do ẩn", "Có phản hồi", "Ngày trải nghiệm",
                "Ngày tạo");

        Pageable pageable = PageRequest.of(0, MAX_ROWS,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        List<TourCustomerReview> rows = reviewRepository.findAll(pageable).stream()
                .filter(r -> inRange(r.getExperienceDate(), from, to))
                .filter(r -> status == null || status.isBlank()
                        || (r.isHidden() && "HIDDEN".equalsIgnoreCase(status))
                        || (!r.isHidden() && "VISIBLE".equalsIgnoreCase(status)))
                .filter(r -> keyword == null || keyword.isBlank() || matchesReview(r, keyword))
                .toList();

        List<List<Object>> data = new ArrayList<>(rows.size());
        for (TourCustomerReview r : rows) {
            data.add(List.of(
                    r.getId(),
                    nz(r.getTour() != null ? r.getTour().getTitle() : null),
                    nz(r.getReviewer() != null ? r.getReviewer().getFullName() : null),
                    r.getOverallRating() != null ? r.getOverallRating() : "",
                    r.getGuideRating() != null ? r.getGuideRating() : "",
                    r.getCultureRating() != null ? r.getCultureRating() : "",
                    r.getScheduleRating() != null ? r.getScheduleRating() : "",
                    r.getValueRating() != null ? r.getValueRating() : "",
                    nz(r.getTitle()),
                    nz(r.getComment()),
                    r.isHidden() ? "Đã ẩn" : "Đang hiển thị",
                    nz(r.getHiddenReason()),
                    r.getProviderReply() != null ? "Có" : "Không",
                    r.getExperienceDate() != null ? r.getExperienceDate().toString() : "",
                    r.getCreatedAt() != null ? r.getCreatedAt().toString() : ""));
        }
        return new ExportTable(columns, data);
    }

    private ExportTable auditLogs(LocalDate from, LocalDate to, String status, String keyword) {
        List<String> columns = List.of(
                "Thời điểm", "Người thực hiện", "Email", "Vai trò", "Nhóm", "Hành động",
                "Đối tượng", "IP", "Kết quả", "Chi tiết");

        Pageable pageable = PageRequest.of(0, MAX_ROWS,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        List<SystemAuditLog> rows = auditLogRepository.findAll(pageable).stream()
                .filter(l -> inRange(l.getCreatedAt() != null ? l.getCreatedAt().atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate() : null, from, to))
                .filter(l -> status == null || status.isBlank() || l.getCategory().name().equalsIgnoreCase(status))
                .filter(l -> keyword == null || keyword.isBlank() || matchesAuditLog(l, keyword))
                .toList();

        List<List<Object>> data = new ArrayList<>(rows.size());
        for (SystemAuditLog l : rows) {
            data.add(List.of(
                    l.getCreatedAt() != null ? l.getCreatedAt().toString() : "",
                    nz(l.getActor() != null ? l.getActor().getFullName() : null),
                    nz(l.getActorEmail()),
                    nz(l.getActorRole()),
                    l.getCategory() != null ? l.getCategory().name() : "",
                    nz(l.getAction()),
                    nz(l.getEntityType() != null
                            ? l.getEntityType() + (l.getEntityId() != null ? "#" + l.getEntityId() : "")
                            : null),
                    nz(l.getIpAddress()),
                    l.getOutcome() != null ? l.getOutcome().name() : "",
                    nz(l.getDetail())));
        }
        return new ExportTable(columns, data);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static boolean inRange(LocalDate value, LocalDate from, LocalDate to) {
        if (from == null && to == null) {
            return true;
        }
        if (value == null) {
            return false;
        }
        if (from != null && value.isBefore(from)) {
            return false;
        }
        return to == null || !value.isAfter(to);
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }

    private static boolean matchesBooking(Booking b, String keyword) {
        String q = keyword.trim().toLowerCase();
        return contains(b.getBookingCode(), q)
                || contains(b.getTour() != null ? b.getTour().getTitle() : null, q)
                || contains(b.getTourist() != null ? b.getTourist().getFullName() : null, q)
                || contains(b.getTourist() != null ? b.getTourist().getEmail() : null, q);
    }

    private static boolean matchesRefund(RefundRequest r, String keyword) {
        String q = keyword.trim().toLowerCase();
        return contains(r.getRefundCode(), q)
                || contains(r.getPayment() != null && r.getPayment().getBooking() != null
                        ? r.getPayment().getBooking().getBookingCode() : null, q)
                || contains(r.getTourist() != null ? r.getTourist().getFullName() : null, q)
                || contains(r.getTourist() != null ? r.getTourist().getEmail() : null, q)
                || contains(r.getApprovedReasonCode(), q)
                || contains(r.getDeclaredReasonCode(), q);
    }

    private static boolean matchesRevenue(ProviderRevenue r, String keyword) {
        String q = keyword.trim().toLowerCase();
        return contains(r.getRevenuePeriod(), q)
                || contains(r.getProviderProfile() != null ? r.getProviderProfile().getProviderName() : null, q)
                || contains(r.getBooking() != null ? r.getBooking().getBookingCode() : null, q);
    }

    private static boolean matchesReview(TourCustomerReview r, String keyword) {
        String q = keyword.trim().toLowerCase();
        return contains(r.getTour() != null ? r.getTour().getTitle() : null, q)
                || contains(r.getReviewer() != null ? r.getReviewer().getFullName() : null, q)
                || contains(r.getTitle(), q)
                || contains(r.getComment(), q);
    }

    private static boolean matchesAuditLog(SystemAuditLog l, String keyword) {
        String q = keyword.trim().toLowerCase();
        return contains(l.getActorEmail(), q)
                || contains(l.getAction(), q)
                || contains(l.getEntityType(), q)
                || contains(l.getDetail(), q);
    }

    private static boolean contains(String value, String lowercaseKeyword) {
        return value != null && value.toLowerCase().contains(lowercaseKeyword);
    }
}
