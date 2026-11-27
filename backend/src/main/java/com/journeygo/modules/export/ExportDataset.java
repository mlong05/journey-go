package com.journeygo.modules.export;

/**
 * Các tập dữ liệu có thể xuất (D2 — "Export dữ liệu").
 *
 * <p>Mỗi tập dữ liệu gắn với một bảng / nhóm nghiệp vụ và có bộ lọc riêng.
 * Danh sách này là nguồn sự thật duy nhất ⇒ UI Admin hiển thị dropdown lấy từ
 * {@code GET /api/v1/admin/exports/datasets} ⇒ không phải hardcode ở frontend.
 */
public enum ExportDataset {

    /** Đơn đặt tour (bookings) — doanh thu dòng tiền, tình trạng thanh toán. */
    BOOKINGS("bookings", "Đơn đặt tour"),

    /** Yêu cầu hoàn tiền — đối soát tài chính. */
    REFUNDS("refunds", "Yêu cầu hoàn tiền"),

    /** Doanh thu & tất toán của đối tác. */
    PROVIDER_REVENUES("provider-revenues", "Doanh thu đối tác"),

    /** Đánh giá khách hàng + trạng thái kiểm duyệt. */
    TOUR_REVIEWS("tour-reviews", "Đánh giá tour"),

    /** Nhật ký kiểm toán hệ thống. */
    AUDIT_LOGS("audit-logs", "Nhật ký kiểm toán");

    private final String slug;
    private final String label;

    ExportDataset(String slug, String label) {
        this.slug = slug;
        this.label = label;
    }

    public String slug() {
        return slug;
    }

    public String label() {
        return label;
    }

    /** Tìm tập dữ liệu theo slug (không phân biệt hoa thường). */
    public static ExportDataset fromSlug(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toLowerCase();
        for (ExportDataset dataset : values()) {
            if (dataset.slug.equals(normalized)) {
                return dataset;
            }
        }
        return null;
    }
}
