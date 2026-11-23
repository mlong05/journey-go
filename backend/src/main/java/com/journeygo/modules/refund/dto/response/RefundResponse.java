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
        @Schema(description = "Mã đơn (mã người dùng thấy) — thay cho bookingId thô")
        String bookingCode,
        @Schema(description = "ID tourist") Long touristId,
        @Schema(description = "Trạng thái refund") RefundStatus status,
        @Schema(description = "Nguyên nhân khai báo bởi tourist") RefundReason declaredReason,
        @Schema(description = "Nguyên nhân do Admin xác định") RefundReason approvedReason,
        @Schema(description = "Tên tiếng Việt của nhóm lý do khai báo (VD: Lỗi khách hàng) — "
                + "KHÔNG hiển thị mã kỹ thuật cho người dùng")
        String declaredReasonName,
        @Schema(description = "Tên tiếng Việt của nhóm lý do do Admin xác định")
        String approvedReasonName,
        @Schema(description = "Mã lý do cụ thể do Tourist chọn") String declaredReasonCode,
        @Schema(description = "Mã lý do cụ thể do Admin xác định") String approvedReasonCode,
        @Schema(description = "Tên tiếng Việt của lý do cụ thể do Tourist chọn — "
                + "KHÔNG hiển thị mã kỹ thuật cho người dùng")
        String declaredReasonCodeName,
        @Schema(description = "Tên tiếng Việt của lý do cụ thể do Admin xác định")
        String approvedReasonCodeName,
        @Schema(description = "Lý do NGẮN GỌN do Tourist nhập (VD: Bị ốm đột xuất)")
        String reasonSummary,
        @Schema(description = "Chi tiết lý do") String reasonDetail,
        @Schema(description = "Ngày trải nghiệm của booking — dùng để Admin đối chiếu "
                + "thời điểm gửi yêu cầu với lịch khởi hành (cửa sổ no-show 48h)")
        java.time.LocalDate experienceDate,
        @Schema(description = "Danh sách URL file bằng chứng đính kèm") List<String> evidenceAttachments,
        @Schema(description = "Số tiền gốc của giao dịch thanh toán (100% — cơ sở tính tỷ lệ hoàn)")
        BigDecimal paymentAmount,
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
        @Schema(description = "Ngân hàng / ví KHÁCH DÙNG khi thanh toán (vnp_BankCode của giao dịch gốc) "
                + "— để Admin đối chiếu với ngân hàng khách khai báo lúc gửi yêu cầu hoàn")
        String paymentBankCode,
        @Schema(description = "Loại thẻ / phương thức khách dùng khi thanh toán (vnp_CardType: "
                + "ATM = thẻ nội địa & tài khoản ngân hàng, QRCODE = ứng dụng ngân hàng & ví)")
        String paymentCardType,
        @Schema(description = "Mã giao dịch tại ngân hàng của lần thanh toán gốc (vnp_BankTranNo) "
                + "— đối chiếu với biên lai khi hoàn thủ công")
        String paymentBankTranNo,
        @Schema(description = "Thời điểm thanh toán thành công (đã xác minh)") Instant paymentPaidAt,
        @Schema(description = "Số điện thoại liên hệ do Tourist cung cấp")
        String contactPhone,
        @Schema(description = "Email dự phòng do Tourist cung cấp")
        String contactEmail,
        @Schema(description = "Mã tham chiếu chuyển khoản thủ công") String transferReference,
        @Schema(description = "Bằng chứng chuyển khoản") String transferEvidence,
        @Schema(description = "Ghi chú của nền tảng khi ghi nhận chuyển khoản thủ công")
        String transferNote,
        @Schema(description = "Ghi chú của nền tảng khi Admin xử lý yêu cầu (duyệt / từ chối)")
        String adminNote,
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
                .bookingCode(r.getPayment() != null && r.getPayment().getBooking() != null
                        ? r.getPayment().getBooking().getBookingCode() : null)
                .touristId(r.getTourist() != null ? r.getTourist().getId() : null)
                .status(r.getStatus())
                .declaredReason(r.getDeclaredReason())
                .approvedReason(r.getApprovedReason())
                .declaredReasonCode(r.getDeclaredReasonCode())
                .approvedReasonCode(r.getApprovedReasonCode())
                .reasonSummary(r.getReasonSummary())
                .reasonDetail(r.getReasonDetail())
                .experienceDate(r.getPayment() != null && r.getPayment().getBooking() != null
                        ? r.getPayment().getBooking().getExperienceDate()
                        : null)
                .evidenceAttachments(parseAttachments(r.getEvidenceAttachments()))
                .paymentAmount(r.getPayment() != null ? r.getPayment().getAmount() : null)
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
                /*
                  ⚠️ Thông tin ngân hàng/phương thức của lần THANH TOÁN GỐC — để Admin
                  đối chiếu với tài khoản khách khai báo lúc gửi yêu cầu hoàn (thường
                  phải TRÙNG tên chủ TK ⇒ dấu hiệu giao dịch không chính chủ).
                */
                .paymentBankCode(r.getPayment() != null ? r.getPayment().getBankCode() : null)
                .paymentCardType(r.getPayment() != null ? r.getPayment().getCardType() : null)
                .paymentBankTranNo(r.getPayment() != null ? r.getPayment().getVnpBankTranNo() : null)
                .paymentPaidAt(r.getPayment() != null ? r.getPayment().getPaidAt() : null)
                .contactPhone(r.getContactPhone())
                .contactEmail(r.getContactEmail())
                .transferReference(r.getTransferReference())
                .transferEvidence(r.getTransferEvidence())
                .transferNote(r.getTransferNote())
                .adminNote(r.getAdminNote())
                .transferredAt(r.getTransferredAt())
                .createdAt(r.getCreatedAt())
                .auditLogs(List.of())
                .build();
    }

    /**
     * Đọc danh sách URL bằng chứng từ cột JSON — dữ liệu hỏng không được làm hỏng
     * cả response ⇒ bỏ qua và trả về danh sách rỗng.
     */
    static List<String> parseAttachments(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper =
                    new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.core.type.TypeReference<List<String>> type =
                    new com.fasterxml.jackson.core.type.TypeReference<>() {
                    };
            List<String> list = mapper.readValue(raw, type);
            return list == null ? List.of() : list;
        } catch (Exception e) {
            return List.of();
        }
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
                    // Chuẩn hoá lúc ĐỌC ⇒ các dòng cũ đã lưu trong DB (chứa map thô
                    // tham số VNPay / mã enum / số tiền thô) cũng hiển thị đúng,
                    // không cần migrate dữ liệu.
                    .detail(RefundAuditDetailFormatter.format(log.getDetail()))
                    .createdAt(log.getCreatedAt())
                    .build();
        }
    }
}
