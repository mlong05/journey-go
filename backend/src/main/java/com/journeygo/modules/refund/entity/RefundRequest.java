package com.journeygo.modules.refund.entity;

import com.journeygo.modules.payment.entity.Payment;
import com.journeygo.modules.refund.entity.enums.RefundMethod;
import com.journeygo.modules.refund.entity.enums.RefundReason;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Refund Request — yêu cầu hoàn tiền cho một Payment đã thành công.
 *
 * <p>Quy tắc nghiệp vụ (Refund Processing Policy):
 * <ul>
 *   <li>Mỗi Payment chỉ có tối đa một yêu cầu Refund đang xử lý hoặc đã hoàn tất —
 *       ràng buộc duy nhất {@code (payment_id)} với điều kiện trạng thái mở được kiểm tra ở tầng service.</li>
 *   <li>Số tiền hoàn <b>không</b> do Tourist tự nhập — hệ thống tính theo nguyên nhân
 *       (50% lỗi Tourist / 100% lỗi nền tảng).</li>
 *   <li>Chỉ chuyển {@link RefundStatus#REFUNDED} khi có bằng chứng xác minh giao dịch hoàn
 *       tiền đã hoàn tất (VNPay xác nhận hoặc Admin nhập mã tham chiếu + bằng chứng chuyển khoản).</li>
 *   <li>Không được chuyển sang phương thức thủ công chỉ vì API timeout — phải xác minh trạng thái.</li>
 * </ul>
 */
@Entity
@Table(name = "refund_requests", indexes = {
        @Index(name = "idx_refund_payment", columnList = "payment_id"),
        @Index(name = "idx_refund_status", columnList = "status"),
        @Index(name = "idx_refund_tourist", columnList = "tourist_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Mã định danh riêng của yêu cầu hoàn tiền. */
    @Column(name = "refund_code", nullable = false, unique = true, length = 32)
    private String refundCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    /** Tourist gửi yêu cầu — phải khớp với chủ sở hữu Payment. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tourist_id", nullable = false)
    private User tourist;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private RefundStatus status = RefundStatus.PENDING_REVIEW;

    /** Nguyên nhân do Tourist khai báo (lý do cá nhân / lỗi nền tảng). */
    @Enumerated(EnumType.STRING)
    @Column(name = "declared_reason", length = 30)
    private RefundReason declaredReason;

    /** Nguyên nhân do Admin xác định khi phê duyệt — quyết định số tiền thực tế. */
    @Enumerated(EnumType.STRING)
    @Column(name = "approved_reason", length = 30)
    private RefundReason approvedReason;

    /** Lý do chi tiết từ Tourist. */
    @Column(name = "reason_detail", columnDefinition = "TEXT")
    private String reasonDetail;

    /** Bằng chứng / thông tin bổ sung do Tourist cung cấp (JSONB). */
    @Column(name = "evidence", columnDefinition = "TEXT")
    private String evidence;

    /** Số tiền đề xuất — hệ thống tính tự động theo nguyên nhân. */
    @Column(name = "proposed_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal proposedAmount;

    /** Số tiền thực tế được Admin duyệt. */
    @Column(name = "approved_amount", precision = 14, scale = 2)
    private BigDecimal approvedAmount;

    /** Số tiền đã hoàn thành thành công — chỉ ghi nhận khi có bằng chứng xác minh. */
    @Column(name = "refunded_amount", precision = 14, scale = 2)
    private BigDecimal refundedAmount;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "VND";

    @Enumerated(EnumType.STRING)
    @Column(name = "method", length = 30)
    private RefundMethod method;

    /** Admin phê duyệt. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    /** Lý do từ chối. */
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    // ── VNPay refund tracking ────────────────────────────────────────────────

    /** vnp_RequestId dùng cho yêu cầu hoàn tiền. */
    @Column(name = "vnp_request_id", length = 32)
    private String vnpRequestId;

    /** vnp_TxnRef của giao dịch gốc (thường trùng txnRef của Payment). */
    @Column(name = "vnp_txn_ref", length = 100)
    private String vnpTxnRef;

    /** vnp_TransactionNo của giao dịch hoàn tiền. */
    @Column(name = "vnp_transaction_no", length = 20)
    private String vnpTransactionNo;

    /** vnp_ResponseCode trả về từ VNPay. */
    @Column(name = "vnp_response_code", length = 10)
    private String vnpResponseCode;

    /** vnp_TransactionStatus trả về từ VNPay. */
    @Column(name = "vnp_transaction_status", length = 10)
    private String vnpTransactionStatus;

    /** vnp_Message trả về từ VNPay. */
    @Column(name = "vnp_message", length = 255)
    private String vnpMessage;

    /** Raw response của VNPay (JSON) để đối soát. */
    @Column(name = "vnp_raw_response", columnDefinition = "TEXT")
    private String vnpRawResponse;

    /** Thời điểm gửi yêu cầu hoàn tiền tới VNPay. */
    @Column(name = "vnp_requested_at")
    private Instant vnpRequestedAt;

    /** Thời điểm xác minh được kết quả hoàn tiền cuối cùng. */
    @Column(name = "vnp_resolved_at")
    private Instant vnpResolvedAt;

    // ── Manual bank transfer tracking ─────────────────────────────────────────

    /** Số tài khoản nhận tiền (khi hoàn thủ công). */
    @Column(name = "bank_account_number", length = 50)
    private String bankAccountNumber;

    /** Tên chủ tài khoản nhận tiền. */
    @Column(name = "bank_account_name", length = 150)
    private String bankAccountName;

    /** Tên ngân hàng. */
    @Column(name = "bank_name", length = 150)
    private String bankName;

    /** Mã tham chiếu giao dịch chuyển khoản thủ công. */
    @Column(name = "transfer_reference", length = 100)
    private String transferReference;

    /** Bằng chứng chuyển khoản (URL hoặc mô tả). */
    @Column(name = "transfer_evidence", columnDefinition = "TEXT")
    private String transferEvidence;

    /** Thời điểm Admin xác nhận đã chuyển khoản. */
    @Column(name = "transferred_at")
    private Instant transferredAt;

    /** Thời điểm tạo yêu cầu. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) {
            this.status = RefundStatus.PENDING_REVIEW;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ── Workflow methods ──────────────────────────────────────────────────────

    /** Admin phê duyệt — chuyển sang APPROVED, chưa phải REFUNDED. */
    public void approve(User reviewer, RefundReason reason, BigDecimal amount) {
        this.status = RefundStatus.APPROVED;
        this.reviewedBy = reviewer;
        this.reviewedAt = Instant.now();
        this.approvedReason = reason;
        this.approvedAmount = amount;
    }

    /** Admin từ chối. */
    public void reject(User reviewer, String reason) {
        this.status = RefundStatus.REJECTED;
        this.reviewedBy = reviewer;
        this.reviewedAt = Instant.now();
        this.rejectionReason = reason;
    }

    /** Đã gửi yêu cầu tới VNPay nhưng chưa có kết quả cuối cùng. */
    public void markProcessing() {
        if (this.status != RefundStatus.REFUNDED) {
            this.status = RefundStatus.REFUND_PROCESSING;
        }
    }

    /**
     * Đánh dấu hoàn tiền thành công — chỉ gọi khi đã XÁC MINH được kết quả cuối cùng.
     */
    public void markRefunded(BigDecimal amount, Instant at) {
        this.status = RefundStatus.REFUNDED;
        this.refundedAmount = amount;
        this.vnpResolvedAt = at;
    }

    /** Đánh dấu thất bại đã được xác minh rõ ràng. */
    public void markFailed(String responseCode, String transactionStatus, String message) {
        this.status = RefundStatus.FAILED;
        this.vnpResponseCode = responseCode;
        this.vnpTransactionStatus = transactionStatus;
        this.vnpMessage = message;
        this.vnpResolvedAt = Instant.now();
    }
}
