package com.journeygo.modules.payment.entity;

import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.payment.entity.enums.PaymentMethod;
import com.journeygo.modules.payment.entity.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Payment — một lần thử thanh toán cho một Booking.
 *
 * <p>Quy tắc nghiệp vụ (UC-03, UC-04):
 * <ul>
 *   <li>Mỗi lần thử thanh toán tạo một Payment riêng với {@code txnRef} (vnp_TxnRef) riêng —
 *       nhưng cùng tham chiếu tới một Booking.</li>
 *   <li>Chỉ một Payment attempt thành công hợp lệ được dùng để xác nhận Booking.</li>
 *   <li>Payment trùng (callback lặp) được nhận diện bằng {@code txnRef} + {@code vnpTransactionNo}
 *       và {@code vnpBankTranNo}; không ghi nhận doanh thu lần thứ hai.</li>
 *   <li>Payment trở thành "khoản tiền dư" (đã thu tiền nhưng Booking đã được thanh toán bởi
 *       giao dịch khác) được đánh dấu {@link PaymentStatus#SUCCESS} kèm cờ
 *       {@link #duplicatePayment} để chuyển sang quy trình hoàn tiền.</li>
 * </ul>
 */
@Entity
@Table(name = "payments", uniqueConstraints = {
        @UniqueConstraint(name = "uk_payment_txn_ref", columnNames = {"txn_ref"}),
        @UniqueConstraint(name = "uk_payment_vnp_transaction_no", columnNames = {"vnp_transaction_no"})
}, indexes = {
        @Index(name = "idx_payments_booking", columnList = "booking_id"),
        @Index(name = "idx_payments_status", columnList = "status"),
        @Index(name = "idx_payments_method", columnList = "method")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    /** Mã tham chiếu giao dịch do merchant sinh, gửi lên VNPay (vnp_TxnRef). Duy nhất. */
    @Column(name = "txn_ref", nullable = false, unique = true, length = 100)
    private String txnRef;

    /** Mã giao dịch của VNPay (vnp_TransactionNo). Có thể null cho tới khi có kết quả. */
    @Column(name = "vnp_transaction_no", length = 20)
    private String vnpTransactionNo;

    /** Mã giao dịch tại ngân hàng (vnp_BankTranNo) — dùng để đối soát callback trùng. */
    @Column(name = "vnp_bank_tran_no", length = 255)
    private String vnpBankTranNo;

    /** Mã ngân hàng / ví (vnp_BankCode). */
    @Column(name = "bank_code", length = 20)
    private String bankCode;

    /**
     * Loại thẻ / phương thức thực tế (vnp_CardType) do VNPay trả về trong IPN/Return.
     *
     * <p>Theo tài liệu chính thức VNPay chỉ có 2 giá trị: {@code ATM} (thẻ ATM nội địa /
     * tài khoản ngân hàng) và {@code QRCODE} (ứng dụng ngân hàng & ví điện tử).
     * Thẻ quốc tế KHÔNG có mã cardType riêng — dùng {@code vnp_BankCode=INTCARD}.
     */
    @Column(name = "card_type", length = 20)
    private String cardType;

    @Enumerated(EnumType.STRING)
    @Column(name = "method", nullable = false, length = 20)
    @Builder.Default
    private PaymentMethod method = PaymentMethod.VNPAY;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    /** Số tiền thanh toán (VND, chưa nhân 100 — giá trị thực). */
    @Column(name = "amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "VND";

    /** Thời điểm tạo Payment attempt. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Thời hạn thanh toán — cố định bằng paymentDeadline của Booking (không gia hạn khi retry). */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /** Thời điểm thanh toán thành công đã được xác minh (vnp_PayDate). */
    @Column(name = "paid_at")
    private Instant paidAt;

    /** Thời điểm xử lý callback / kết quả cuối cùng. */
    @Column(name = "resolved_at")
    private Instant resolvedAt;

    /** vnp_ResponseCode trả về. */
    @Column(name = "vnp_response_code", length = 10)
    private String vnpResponseCode;

    /** vnp_TransactionStatus trả về — trạng thái giao dịch tại VNPay. */
    @Column(name = "vnp_transaction_status", length = 10)
    private String vnpTransactionStatus;

    /** vnp_Message trả về. */
    @Column(name = "vnp_message", length = 255)
    private String vnpMessage;

    /** URL thanh toán VNPay để hiển thị QR / chuyển hướng. */
    @Column(name = "payment_url", columnDefinition = "TEXT")
    private String paymentUrl;

    /**
     * Cờ đánh dấu đây là giao dịch thành công "dư" — Booking đã được thanh toán bởi giao dịch khác.
     * Khoản tiền này chuyển sang quy trình tài chính / hoàn tiền (UC-04 — Thanh toán trùng thực sự).
     */
    @Column(name = "duplicate_payment", nullable = false)
    @Builder.Default
    private boolean duplicatePayment = false;

    /** Số lần IPN callback đã nhận — dùng để đối soát callback trùng. */
    @Column(name = "ipn_count", nullable = false)
    @Builder.Default
    private int ipnCount = 0;

    /** Số lần đã thử truy vấn kết quả giao dịch (QueryDR). */
    @Column(name = "query_count", nullable = false)
    @Builder.Default
    private int queryCount = 0;

    /** Ghi chú/ghi nhận kỹ thuật cho đối soát (vd: "late payment - slot conflict"). */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) {
            this.status = PaymentStatus.PENDING;
        }
        if (this.method == null) {
            this.method = PaymentMethod.VNPAY;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ── Workflow methods ──────────────────────────────────────────────────────

    /** Đánh dấu thanh toán thành công đã được xác minh. */
    public void markSuccess(Instant paidTime, String vnpTransactionNo, String bankTranNo,
                            String bankCode, String responseCode, String transactionStatus, String message) {
        this.status = PaymentStatus.SUCCESS;
        this.paidAt = paidTime;
        this.resolvedAt = Instant.now();
        this.vnpTransactionNo = vnpTransactionNo;
        this.vnpBankTranNo = bankTranNo;
        this.bankCode = bankCode;
        this.vnpResponseCode = responseCode;
        this.vnpTransactionStatus = transactionStatus;
        this.vnpMessage = message;
    }

    /** Ghi nhận phương thức thanh toán thực tế (vnp_CardType) từ IPN/Return. */
    public void setCardType(String cardType) {
        this.cardType = cardType;
    }

    /** Đánh dấu thất bại đã được xác minh rõ ràng. */
    public void markFailed(String responseCode, String transactionStatus, String message) {
        this.status = PaymentStatus.FAILED;
        this.resolvedAt = Instant.now();
        this.vnpResponseCode = responseCode;
        this.vnpTransactionStatus = transactionStatus;
        this.vnpMessage = message;
    }

    /** Đánh dấu khách hủy giao dịch. */
    public void markCancelled(String responseCode, String transactionStatus, String message) {
        this.status = PaymentStatus.CANCELLED;
        this.resolvedAt = Instant.now();
        this.vnpResponseCode = responseCode;
        this.vnpTransactionStatus = transactionStatus;
        this.vnpMessage = message;
    }

    /**
     * Chuyển sang trạng thái "đang xử lý" — kết quả chưa rõ, KHÔNG được kết luận thất bại.
     * Dùng khi: đã gửi yêu cầu tới VNPay nhưng chưa có kết quả cuối cùng (UC-03, UC-05).
     */
    public void markProcessing() {
        if (this.status != PaymentStatus.SUCCESS) {
            this.status = PaymentStatus.PROCESSING;
        }
    }

    /** Đánh dấu quá hạn thanh toán — chỉ dùng khi chưa xác minh được kết quả. */
    public void markExpired() {
        if (this.status == PaymentStatus.PENDING || this.status == PaymentStatus.PROCESSING) {
            this.status = PaymentStatus.EXPIRED;
            this.resolvedAt = Instant.now();
        }
    }

    /** Payment đã có kết quả cuối cùng rõ ràng (thành công / thất bại / khách hủy). */
    public boolean isResolved() {
        return status != null && status.isFinal();
    }

    /** Payment đã thành công — có thể dùng để xác nhận Booking. */
    public boolean isSuccess() {
        return status == PaymentStatus.SUCCESS;
    }
}
