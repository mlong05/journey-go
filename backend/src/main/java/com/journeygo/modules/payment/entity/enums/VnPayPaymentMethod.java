package com.journeygo.modules.payment.entity.enums;

import lombok.Getter;

import java.util.Arrays;
import java.util.Optional;

/**
 * Nhóm phương thức thanh toán mà VNPay hiển thị trên trang thanh toán.
 *
 * <p>Nguồn: tài liệu chính thức VNPay — tham số {@code vnp_BankCode} cho lệnh {@code pay}:
 * <ul>
 *   <li>{@code VNPAYQR} — Thanh toán quét mã QR (Ứng dụng Ngân hàng & Ví điện tử).</li>
 *   <li>{@code VNBANK} — Thẻ ATM / Tài khoản ngân hàng nội địa.</li>
 *   <li>{@code VISA} — Thẻ thanh toán quốc tế (Visa, Mastercard, JCB, UnionPay).</li>
 * </ul>
 *
 * <p>Lưu ý quan trọng: nếu KHÔNG gửi tham số {@code vnp_BankCode}, VNPay sẽ chuyển khách
 * hàng tới trang chọn phương thức thanh toán — đúng với 3 lựa chọn trên trang Sandbox.
 * Gửi {@code vnp_BankCode} = một trong 3 mã trên thì VNPay mở thẳng phương thức đó.
 *
 * <p>Các mã ngân hàng cụ thể (VD {@code MB}, {@code VCB}, {@code ZINGPAY}…) lấy từ API
 * {@code POST https://sandbox.vnpayment.vn/qrpayauth/api/merchant/get_bank_list}
 * (body {@code tmn_code=...}) — xem {@code PaymentMethodService} để lấy danh sách đầy đủ.
 */
@Getter
public enum VnPayPaymentMethod {

    /** Ứng dụng Ngân hàng & Ví điện tử — quét mã QR. */
    QR_APP_WALLET(
            "VNPAYQR",
            "App ngân hàng và Ví điện tử (VNPay QR)",
            "Quét mã QR bằng ứng dụng Mobile Banking hoặc ví điện tử liên kết VNPay-QR "
                    + "(MoMo, ZingPay, VNPay, Viettel Pay, VCB Digibank…)",
            "QRCODE",
            1),

    /**
     * Thẻ ATM nội địa & tài khoản ngân hàng.
     *
     * <p>ĐÃ KIỂM CHỨNG TRÊN SANDBOX: {@code vnp_BankCode=VNBANK} mở trang
     * {@code /paymentv2/Transaction/PaymentMethod.html} nhưng trang đó chỉ hiện
     * ĐÚNG 1 mục "Thẻ nội địa và tài khoản ngân hàng" (KHÔNG có QR, KHÔNG có thẻ
     * quốc tế — đã đếm DOM: 1 mục, không tìm thấy "QR"/"quốc tế"/"Visa").
     * Bên trong mục đó, VNPay tự load danh sách ngân hàng (AJAX) để khách chọn —
     * nên app KHÔNG cần hiển thị danh sách ngân hàng riêng.
     *
     * <p>Nếu muốn mở THẲNG form nhập thẻ của một ngân hàng (bỏ qua bước chọn
     * ngân hàng), phải gửi MÃ NGÂN HÀNG CỤ THỂ lấy từ {@code get_bank_list}
     * (bank_type = 2): {@code NCB}, {@code MBBANK}, {@code VIETINBANK},
     * {@code VPBANK}, {@code AGRIBANK}… Mỗi mã mở thẳng form
     * {@code /paymentv2/{Bank}/Transaction/Index.html} của ngân hàng đó.
     */
    DOMESTIC_CARD(
            "VNBANK",
            "Thẻ nội địa và tài khoản ngân hàng",
            "Thanh toán bằng thẻ ATM nội địa hoặc tài khoản ngân hàng (Internet Banking, "
                    + "Mobile Banking của các ngân hàng Việt Nam)",
            "ATM",
            2),
    /**
     * Thẻ thanh toán quốc tế.
     *
     * <p>LƯU Ý QUAN TRỌNG: {@code vnp_BankCode=INTCARD} KHÔNG được VNPay Sandbox chấp nhận
     * (đã kiểm chứng: URL bị fallback về trang chọn phương thức ⇒ không mở form thẻ).
     * Các mã hợp lệ lấy từ API {@code get_bank_list} (bank_type = 3):
     * {@code VISA}, {@code MASTERCARD}, {@code JCB}, {@code UPI}, {@code AMEX}.
     *
     * <p>Ta dùng {@code VISA} vì trang thanh toán đó nhận ĐẦY ĐỦ cả Visa/Mastercard/JCB
     * (tiêu đề "Thanh toán qua thẻ quốc tế"), còn {@code MASTERCARD}/{@code JCB} chỉ nhận
     * đúng loại thẻ tương ứng.
     *
     * <p>Về {@code vnp_CardType}: tài liệu chính thức VNPay chỉ liệt kê 2 giá trị là
     * {@code ATM} và {@code QRCODE} — KHÔNG có {@code CREDIT}. Vì vậy {@link #cardType}
     * của nhóm này để trống: mã {@code vnp_BankCode} vẫn là {@code VISA}, còn
     * {@code vnp_CardType} do VNPay trả về sẽ không khớp nhóm này.
     */
    INTERNATIONAL_CARD(
            "VISA",
            "Thẻ thanh toán quốc tế",
            "Thanh toán bằng thẻ quốc tế Visa, Mastercard, JCB, UnionPay",
            null,
            3);

    /** Mã gửi lên VNPay qua {@code vnp_BankCode}. */
    private final String bankCode;

    /** Nhãn hiển thị (tiếng Việt). */
    private final String label;

    /** Mô tả chi tiết cho frontend. */
    private final String description;

    /** Giá trị {@code vnp_CardType} tương ứng mà VNPay trả về. */
    private final String cardType;

    /** Thứ tự hiển thị. */
    private final int displayOrder;

    VnPayPaymentMethod(String bankCode, String label, String description, String cardType, int displayOrder) {
        this.bankCode = bankCode;
        this.label = label;
        this.description = description;
        this.cardType = cardType;
        this.displayOrder = displayOrder;
    }

    /**
     * Tìm phương thức theo mã {@code vnp_BankCode} của 3 nhóm phương thức.
     *
     * @param bankCode mã bank code (không phân biệt hoa thường)
     * @return phương thức tương ứng, hoặc empty nếu không thuộc 3 nhóm này
     *         (ví dụ mã ngân hàng cụ thể lấy từ {@code get_bank_list}).
     */
    public static Optional<VnPayPaymentMethod> fromBankCode(String bankCode) {
        if (bankCode == null || bankCode.isBlank()) {
            return Optional.empty();
        }
        String normalized = bankCode.trim().toUpperCase();
        return Arrays.stream(values())
                .filter(m -> m.bankCode.equals(normalized))
                .findFirst();
    }

    /**
     * Tìm phương thức theo {@code vnp_CardType} mà VNPay trả về trong IPN/Return.
     *
     * @param cardType giá trị {@code vnp_CardType} — tài liệu chính thức liệt kê
     *                {@code ATM} và {@code QRCODE}
     * @return phương thức tương ứng, hoặc empty nếu không xác định được
     */
    public static Optional<VnPayPaymentMethod> fromCardType(String cardType) {
        if (cardType == null || cardType.isBlank()) {
            return Optional.empty();
        }
        String normalized = cardType.trim().toUpperCase();
        return Arrays.stream(values())
                .filter(m -> normalized.equals(m.cardType))
                .findFirst();
    }
}
