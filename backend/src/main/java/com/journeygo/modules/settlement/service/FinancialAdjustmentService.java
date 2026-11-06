package com.journeygo.modules.settlement.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
import com.journeygo.modules.providerrevenue.repository.ProviderRevenueRepository;
import com.journeygo.modules.refund.entity.RefundRequest;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.refund.repository.RefundRequestRepository;
import com.journeygo.modules.settlement.dto.request.CreateFinancialAdjustmentRequest;
import com.journeygo.modules.settlement.dto.response.FinancialAdjustmentResponse;
import com.journeygo.modules.settlement.entity.FinancialAdjustment;
import com.journeygo.modules.settlement.entity.enums.FinancialAdjustmentStatus;
import com.journeygo.modules.settlement.repository.FinancialAdjustmentRepository;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import com.journeygo.modules.wallet.entity.Wallet;
import com.journeygo.modules.wallet.entity.WalletTransaction;
import com.journeygo.modules.wallet.entity.enums.WalletTransactionType;
import com.journeygo.modules.wallet.repository.WalletRepository;
import com.journeygo.modules.wallet.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Financial Adjustment — khoản điều chỉnh tài chính phát sinh SAU khi đã tất toán.
 *
 * <p>Quy tắc nghiệp vụ (Mục 8.2 — Refund phát sinh sau tất toán):
 * <ol>
 *   <li>KHÔNG sửa số liệu của Settlement đã duyệt.</li>
 *   <li>Ghi nhận Refund và xác định ảnh hưởng tài chính lên ProviderProfile.</li>
 *   <li>Tạo khoản điều chỉnh liên kết với Refund và Settlement gốc.</li>
 *   <li>Nếu ProviderProfile phải chịu phần điều chỉnh → ghi nhận khoản khấu trừ vào kỳ tất toán tiếp theo
 *       hoặc quy trình điều chỉnh tài chính được duyệt.</li>
 *   <li>Nếu có bồi hoàn cho ProviderProfile do lỗi nền tảng → ghi nhận khoản cộng riêng.</li>
 * </ol>
 *
 * <p>KHÔNG tự động trừ tiền chỉ vì Tourist gửi yêu cầu Refund — chỉ điều chỉnh khi có kết quả
 * và căn cứ tài chính rõ ràng. Nếu ví không đủ số dư → ghi nhận khoản phải thu thay vì âm
 * số dư không kiểm soát.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FinancialAdjustmentService {

    private final FinancialAdjustmentRepository adjustmentRepository;
    private final ProviderProfileRepository providerProfileRepository;
    private final RefundRequestRepository refundRepository;
    private final ProviderRevenueRepository revenueRepository;
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final WalletService walletService;
    private final NotificationPublisher notifications;

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Tạo khoản điều chỉnh tài chính ở trạng thái {@code PENDING} — chờ phê duyệt.
     */
    @Transactional
    public FinancialAdjustmentResponse createAdjustment(CreateFinancialAdjustmentRequest request, Long adminId) {
        ProviderProfile providerProfile = providerProfileRepository.findById(request.providerProfileId())
                .orElseThrow(() -> new AppException(ErrorCode.PROVIDER_PROFILE_NOT_FOUND));

        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) == 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Số tiền điều chỉnh không được bằng 0");
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        RefundRequest refund = null;
        if (request.refundRequestId() != null) {
            refund = refundRepository.findById(request.refundRequestId())
                    .orElseThrow(() -> new AppException(ErrorCode.REFUND_NOT_FOUND));

            // Chặn tạo trùng cho cùng một Refund (UC-06 — không hoàn tiền hai lần).
            if (adjustmentRepository.existsByRefundRequest_IdAndStatus(
                    refund.getId(), FinancialAdjustmentStatus.PENDING)
                    || adjustmentRepository.existsByRefundRequest_IdAndStatus(
                    refund.getId(), FinancialAdjustmentStatus.APPROVED)) {
                throw new AppException(ErrorCode.REFUND_ALREADY_EXISTS,
                        "Đã tồn tại khoản điều chỉnh cho refund này");
            }
        }

        FinancialAdjustment adjustment = adjustmentRepository.save(FinancialAdjustment.builder()
                .providerProfile(providerProfile)
                .refundRequest(refund)
                .sourceSettlementId(request.sourceSettlementId())
                .amount(request.amount())
                .currency("VND")
                .reason(request.reason())
                .status(FinancialAdjustmentStatus.PENDING)
                .createdBy(admin)
                .build());

        log.info("[FinancialAdjustment] Đã tạo khoản điều chỉnh id={} providerProfile={} amount={}",
                adjustment.getId(), providerProfile.getId(), request.amount());

        // Người tạo không tự duyệt khoản của mình: báo các Admin còn lại
        notifications.send(NotificationType.ADJUSTMENT_PENDING)
                .toRole(Role.ADMIN)
                .except(adminId)
                .title("Khoản điều chỉnh tài chính chờ duyệt")
                .body(NotificationPublisher.money(request.amount()) + " cho đối tác " + providerProfile.getProviderName()
                        + (request.reason() == null || request.reason().isBlank() ? "." : " — " + request.reason().trim()))
                .link("/admin/finance")
                .ref("ADJUSTMENT", adjustment.getId())
                .queue(NotificationPublisher.Queue.ADJUSTMENT_REVIEW)
                .publish();

        return FinancialAdjustmentResponse.fromEntity(adjustment);
    }

    // ── Approve / Reject ──────────────────────────────────────────────────────

    /**
     * Phê duyệt khoản điều chỉnh và áp dụng vào Wallet.
     *
     * <p>Việc phê duyệt tạo giao dịch Wallet tương ứng (CREDIT hoặc DEBIT) — không sửa trực
     * tiếp số dư.
     */
    @Transactional
    public FinancialAdjustmentResponse approveAdjustment(Long adjustmentId, Long adminId) {
        FinancialAdjustment adjustment = adjustmentRepository.findById(adjustmentId)
                .orElseThrow(() -> new AppException(ErrorCode.FINANCIAL_ADJUSTMENT_NOT_FOUND));

        if (adjustment.getStatus() != FinancialAdjustmentStatus.PENDING) {
            throw new AppException(ErrorCode.SETTLEMENT_INVALID_STATUS,
                    "Khoản điều chỉnh không ở trạng thái chờ phê duyệt: " + adjustment.getStatus());
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Wallet wallet = walletRepository.findByProviderProfileIdForUpdate(adjustment.getProviderProfile().getId())
                .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND,
                        "Đối tác chưa có ví nội bộ"));

        // Khoản điều chỉnh có căn cứ từ Refund → REFUND_ADJUSTMENT;
        // điều chỉnh thủ công (bồi hoàn cho ProviderProfile) → MANUAL_ADJUSTMENT.
        WalletTransactionType type = adjustment.getRefundRequest() != null
                ? WalletTransactionType.REFUND_ADJUSTMENT
                : WalletTransactionType.MANUAL_ADJUSTMENT;

        walletService.applyAdjustment(
                wallet,
                type,
                adjustment.getAmount(),
                WalletTransaction.SourceType.FINANCIAL_ADJUSTMENT,
                adjustment.getId(),
                admin,
                "Điều chỉnh tài chính #" + adjustment.getId() + ": " + adjustment.getReason());

        adjustment.approve(admin);
        adjustmentRepository.save(adjustment);

        log.info("[FinancialAdjustment] Đã duyệt khoản điều chỉnh id={} amount={}",
                adjustmentId, adjustment.getAmount());

        return FinancialAdjustmentResponse.fromEntity(adjustment);
    }

    /**
     * Từ chối khoản điều chỉnh — không ảnh hưởng số dư Wallet.
     */
    @Transactional
    public FinancialAdjustmentResponse rejectAdjustment(Long adjustmentId, String reason, Long adminId) {
        FinancialAdjustment adjustment = adjustmentRepository.findById(adjustmentId)
                .orElseThrow(() -> new AppException(ErrorCode.FINANCIAL_ADJUSTMENT_NOT_FOUND));

        if (adjustment.getStatus() != FinancialAdjustmentStatus.PENDING) {
            throw new AppException(ErrorCode.SETTLEMENT_INVALID_STATUS,
                    "Khoản điều chỉnh không ở trạng thái chờ phê duyệt: " + adjustment.getStatus());
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        adjustment.reject(admin, reason);
        adjustmentRepository.save(adjustment);

        log.info("[FinancialAdjustment] Đã từ chối khoản điều chỉnh id={}", adjustmentId);

        return FinancialAdjustmentResponse.fromEntity(adjustment);
    }

    /**
     * Ghi nhận khoản điều chỉnh tự động cho một Refund xảy ra SAU khi Settlement đã duyệt.
     *
     * <p>Được gọi từ luồng Refund. Nếu Refund liên quan tới một khoản doanh thu đã
     * {@code SETTLED} thì tạo khoản điều chỉnh riêng (không sửa lịch sử đã duyệt).
     *
     * @return khoản điều chỉnh đã tạo, hoặc null nếu chưa cần điều chỉnh
     */
    @Transactional
    public FinancialAdjustment createAdjustmentForRefund(RefundRequest refund, Long adminId) {
        if (refund.getStatus() != RefundStatus.REFUNDED || refund.getRefundedAmount() == null) {
            return null;
        }
        if (refund.getPayment() == null || refund.getPayment().getBooking() == null) {
            return null;
        }

        Long bookingId = refund.getPayment().getBooking().getId();

        // Tìm khoản doanh thu đã SETTLED của booking này — nếu có thì cần điều chỉnh.
        var revenues = revenueRepository.findByBooking_Id(bookingId);
        Long settlementId = null;
        BigDecimal providerShare = BigDecimal.ZERO;

        for (var revenue : revenues) {
            if (revenue.getSettlementId() != null) {
                settlementId = revenue.getSettlementId();
                providerShare = revenue.getProviderNetAmount() != null
                        ? revenue.getProviderNetAmount() : BigDecimal.ZERO;
                break;
            }
        }

        if (settlementId == null) {
            // Chưa được tất toán → không cần khoản điều chỉnh; doanh thu sẽ được tính lại
            // bởi ProviderRevenueService qua sự kiện RefundCompletedEvent.
            return null;
        }

        // Phần doanh thu ProviderProfile bị ảnh hưởng bởi refund = phần providerProfile net tương ứng.
        BigDecimal refundShare = refund.getRefundedAmount();
        BigDecimal gross = refund.getPayment().getAmount();
        if (gross != null && gross.compareTo(BigDecimal.ZERO) > 0 && providerShare.compareTo(BigDecimal.ZERO) > 0) {
            refundShare = refund.getRefundedAmount()
                    .multiply(providerShare)
                    .divide(gross, 2, java.math.RoundingMode.HALF_UP);
        }

        // Điều chỉnh GIẢM doanh thu ProviderProfile sau khi đã tất toán.
        BigDecimal adjustmentAmount = refundShare.negate();

        ProviderProfile providerProfile = providerProfileRepository.findById(
                        revenues.get(0).getProviderProfile().getId())
                .orElseThrow(() -> new AppException(ErrorCode.PROVIDER_PROFILE_NOT_FOUND));

        FinancialAdjustment adjustment = adjustmentRepository.save(FinancialAdjustment.builder()
                .providerProfile(providerProfile)
                .refundRequest(refund)
                .sourceSettlementId(settlementId)
                .amount(adjustmentAmount)
                .currency("VND")
                .reason("Điều chỉnh doanh thu do Refund #" + refund.getRefundCode()
                        + " hoàn thành sau khi Settlement đã được duyệt (settlement " + settlementId + ")")
                .status(FinancialAdjustmentStatus.PENDING)
                .build());

        log.info("[FinancialAdjustment] Đã tạo khoản điều chỉnh {} cho refund {} (settlement {})",
                adjustmentAmount, refund.getRefundCode(), settlementId);

        return adjustment;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public FinancialAdjustmentResponse getById(Long adjustmentId) {
        return FinancialAdjustmentResponse.fromEntity(adjustmentRepository.findById(adjustmentId)
                .orElseThrow(() -> new AppException(ErrorCode.FINANCIAL_ADJUSTMENT_NOT_FOUND)));
    }

    @Transactional(readOnly = true)
    public PageResponse<FinancialAdjustmentResponse> getByProviderProfile(Long providerProfileId, Pageable pageable) {
        Page<FinancialAdjustment> page = adjustmentRepository
                .findByProviderProfile_IdOrderByCreatedAtDesc(providerProfileId, pageable);
        return PageResponse.from(page, FinancialAdjustmentResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public PageResponse<FinancialAdjustmentResponse> getAll(FinancialAdjustmentStatus status, Pageable pageable) {
        Page<FinancialAdjustment> page = (status != null)
                ? adjustmentRepository.findByStatus(status, pageable)
                : adjustmentRepository.findAll(pageable);
        return PageResponse.from(page, FinancialAdjustmentResponse::fromEntity);
    }
}
