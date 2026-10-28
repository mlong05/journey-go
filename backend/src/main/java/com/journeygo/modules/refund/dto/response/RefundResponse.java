package com.journeygo.modules.refund.dto.response;

import com.journeygo.modules.refund.entity.RefundAuditLog;
import com.journeygo.modules.refund.entity.RefundRequest;
import com.journeygo.modules.refund.entity.enums.RefundMethod;
import com.journeygo.modules.refund.entity.enums.RefundReason;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Builder(toBuilder = true)
@Schema(description = "Thông tin yêu cầu hoàn tiền")
public record RefundResponse(

        @Schema(description = "ID yêu cầu") Long id,
        @Schema(description = "Mã yêu cầu hoàn tiền") String refundCode,
        @Schema(description = "ID payment gốc") Long paymentId,
        @Schema(description = "Mã giao dịch thanh toán") String txnRef,
        @Schema(description = "ID booking") Long bookingId,
        @Schema(description = "ID tourist") Long touristId,
        @Schema(description = "Trạng thái refund") RefundStatus status,
        @Schema(description = "Nguyên nhân khai báo bởi tourist") RefundReason declaredReason,
        @Schema(description = "Nguyên nhân do Admin xác định") RefundReason approvedReason,
        @Schema(description = "Chi tiết lý do") String reasonDetail,
        @Schema(description = "Số tiền đề xuất (hệ thống tự tính)") BigDecimal proposedAmount,
        @Schema(description = "Số tiền được duyệt") BigDecimal approvedAmount,
        @Schema(description = "Số tiền đã hoàn thành thành công") BigDecimal refundedAmount,
        @Schema(description = "Loại tiền") String currency,
        @Schema(description = "Phương thức hoàn tiền") RefundMethod method,
        @Schema(description = "Người xử lý") Long reviewedBy,
        @Schema(description = "Thời điểm xử lý") Instant reviewedAt,
        @Schema(description = "Lý do từ chối") String rejectionReason,
        @Schema(description = "vnp_RequestId") String vnpRequestId,
        @Schema(description = "vnp_TransactionNo của giao dịch hoàn") String vnpTransactionNo,
        @Schema(description = "vnp_ResponseCode") String vnpResponseCode,
        @Schema(description = "vnp_TransactionStatus") String vnpTransactionStatus,
        @Schema(description = "Thông điệp từ VNPay") String vnpMessage,
        @Schema(description = "Thời điểm gửi yêu cầu tới VNPay") Instant vnpRequestedAt,
        @Schema(description = "Thời điểm xác minh kết quả cuối cùng") Instant vnpResolvedAt,
        @Schema(description = "Số tài khoản nhận tiền") String bankAccountNumber,
        @Schema(description = "Tên chủ tài khoản") String bankAccountName,
        @Schema(description = "Ngân hàng") String bankName,
        @Schema(description = "Mã tham chiếu chuyển khoản thủ công") String transferReference,
        @Schema(description = "Bằng chứng chuyển khoản") String transferEvidence,
        @Schema(description = "Thời điểm chuyển khoản") Instant transferredAt,
        @Schema(description = "Thời điểm tạo yêu cầu") Instant createdAt,
        @Schema(description = "Nhật ký kiểm toán") List<RefundAuditLogResponse> auditLogs
) {
    public static RefundResponse fromEntity(RefundRequest r) {
        if (r == null) return null;
        return RefundResponse.builder()
                .id(r.getId())
                .refundCode(r.getRefundCode())
                .paymentId(r.getPayment() != null ? r.getPayment().getId() : null)
                .txnRef(r.getPayment() != null ? r.getPayment().getTxnRef() : null)
                .bookingId(r.getPayment() != null && r.getPayment().getBooking() != null
                        ? r.getPayment().getBooking().getId() : null)
                .touristId(r.getTourist() != null ? r.getTourist().getId() : null)
                .status(r.getStatus())
                .declaredReason(r.getDeclaredReason())
                .approvedReason(r.getApprovedReason())
                .reasonDetail(r.getReasonDetail())
                .proposedAmount(r.getProposedAmount())
                .approvedAmount(r.getApprovedAmount())
                .refundedAmount(r.getRefundedAmount())
                .currency(r.getCurrency())
                .method(r.getMethod())
                .reviewedBy(r.getReviewedBy() != null ? r.getReviewedBy().getId() : null)
                .reviewedAt(r.getReviewedAt())
                .rejectionReason(r.getRejectionReason())
                .vnpRequestId(r.getVnpRequestId())
                .vnpTransactionNo(r.getVnpTransactionNo())
                .vnpResponseCode(r.getVnpResponseCode())
                .vnpTransactionStatus(r.getVnpTransactionStatus())
                .vnpMessage(r.getVnpMessage())
                .vnpRequestedAt(r.getVnpRequestedAt())
                .vnpResolvedAt(r.getVnpResolvedAt())
                .bankAccountNumber(r.getBankAccountNumber())
                .bankAccountName(r.getBankAccountName())
                .bankName(r.getBankName())
                .transferReference(r.getTransferReference())
                .transferEvidence(r.getTransferEvidence())
                .transferredAt(r.getTransferredAt())
                .createdAt(r.getCreatedAt())
                .auditLogs(List.of())
                .build();
    }

    /** Nhật ký kiểm toán của yêu cầu hoàn tiền. */
    @Builder
    @Schema(description = "Bản ghi kiểm toán refund")
    public record RefundAuditLogResponse(
            @Schema(description = "ID") Long id,
            @Schema(description = "Hành động") RefundAuditLog.Action action,
            @Schema(description = "Trạng thái trước") RefundStatus fromStatus,
            @Schema(description = "Trạng thái sau") RefundStatus toStatus,
            @Schema(description = "Số tiền") BigDecimal amount,
            @Schema(description = "Mã tham chiếu") String reference,
            @Schema(description = "Chi tiết") String detail,
            @Schema(description = "Thời điểm") Instant createdAt
    ) {
        public static RefundAuditLogResponse fromEntity(RefundAuditLog log) {
            if (log == null) return null;
            return RefundAuditLogResponse.builder()
                    .id(log.getId())
                    .action(log.getAction())
                    .fromStatus(log.getFromStatus())
                    .toStatus(log.getToStatus())
                    .amount(log.getAmount())
                    .reference(log.getReference())
                    .detail(log.getDetail())
                    .createdAt(log.getCreatedAt())
                    .build();
        }
    }
}
