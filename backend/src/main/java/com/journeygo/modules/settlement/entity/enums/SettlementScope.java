package com.journeygo.modules.settlement.entity.enums;

/**
 * Phạm vi của một đợt tất toán.
 *
 * <p>Trước đây mỗi đợt tất toán chỉ thuộc MỘT đối tác ({@code provider_profile_id}).
 * Khi sàn có hàng chục/hàng trăm đối tác thì việc lập đợt cho từng người rất chậm và dễ sót.
 * Nay hỗ trợ thêm đợt TỔNG — gom doanh thu của TOÀN BỘ đối tác trong một kỳ vào cùng
 * một đợt, duyệt một lần là xong.
 */
public enum SettlementScope {

    /**
     * Đợt tất toán của MỘT đối tác — mỗi đối tác một đợt, mỗi đối tác một lần duyệt,
     * tiền cộng vào ví của riêng đối tác đó.
     */
    PROVIDER,

    /**
     * Đợt tất toán TỔNG cho cả sàn — gom khoản doanh thu đủ điều kiện của TẤT CẢ đối tác
     * trong kỳ (kèm doanh thu chuyển tiếp từ các kỳ trước) vào MỘT đợt.
     *
     * <p>Khi duyệt, tiền được cộng vào ví của TỪNG đối tác theo đúng số tiền của họ
     * (mỗi đối tác một giao dịch cộng tiền) — nhưng Admin chỉ phải duyệt MỘT lần.
     */
    BATCH
}
