package com.journeygo.modules.gamification.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.gamification.dto.*;
import com.journeygo.modules.gamification.entity.*;
import com.journeygo.modules.gamification.entity.enums.BadgeType;
import com.journeygo.modules.gamification.entity.enums.PointTransactionType;
import com.journeygo.modules.gamification.entity.enums.UserVoucherStatus;
import com.journeygo.modules.gamification.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class GamificationService {

    private final BadgeRepository badgeRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final UserPointRepository userPointRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final VoucherRepository voucherRepository;
    private final UserVoucherRepository userVoucherRepository;

    // ── BADGE OPERATIONS ────────────────────────────────────────────────────────

    @Transactional
    public UserBadge awardCheckInBadge(Long userId, Long destinationId, String destinationName, Long journeyId) {
        Badge badge = badgeRepository.findByDestinationIdAndActiveTrue(destinationId)
                .orElseGet(() -> {
                    String cleanName = (destinationName != null && !destinationName.isBlank())
                            ? destinationName : "Điểm di sản #" + destinationId;
                    Badge newBadge = Badge.builder()
                            .code("BADGE_DEST_" + destinationId)
                            .name("Dấu chân " + cleanName)
                            .description("Đã đặt chân và khám phá thành công " + cleanName)
                            .iconUrl("https://assets.journeygo.com/badges/destination_pin.png")
                            .destinationId(destinationId)
                            .badgeType(BadgeType.DESTINATION_CHECKIN)
                            .bonusPoints(10)
                            .active(true)
                            .build();
                    return badgeRepository.save(newBadge);
                });

        var existing = userBadgeRepository.findByUserIdAndBadgeId(userId, badge.getId());
        if (existing.isPresent()) {
            log.info("User {} đã sở hữu Badge {} trước đó (idempotent)", userId, badge.getCode());
            return existing.get();
        }

        UserBadge userBadge = UserBadge.builder()
                .userId(userId)
                .badge(badge)
                .journeyId(journeyId)
                .destinationId(destinationId)
                .build();

        UserBadge saved = userBadgeRepository.save(userBadge);
        log.info("Cấp Badge {} thành công cho user {}", badge.getCode(), userId);

        if (badge.getBonusPoints() != null && badge.getBonusPoints() > 0) {
            awardPoints(
                    userId,
                    badge.getBonusPoints(),
                    PointTransactionType.EARNED_CHECKIN,
                    "BADGE_" + badge.getId() + "_U_" + userId,
                    "Thưởng mở khóa huy hiệu " + badge.getName()
            );
        }

        return saved;
    }

    @Transactional(readOnly = true)
    public List<UserBadgeResponse> getUserBadges(Long userId) {
        return userBadgeRepository.findByUserIdWithBadge(userId)
                .stream().map(UserBadgeResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public List<BadgeResponse> getAllBadges() {
        return badgeRepository.findByActiveTrue()
                .stream().map(BadgeResponse::fromEntity).toList();
    }

    // ── POINT OPERATIONS ────────────────────────────────────────────────────────

    @Transactional
    public UserPoint awardPoints(Long userId, int amount, PointTransactionType type, String referenceId, String description) {
        if (amount <= 0) {
            return getOrCreateUserPoint(userId);
        }

        if (referenceId != null && pointTransactionRepository.existsByUserIdAndReferenceId(userId, referenceId)) {
            log.info("Điểm đã được cấp cho ref {} (idempotent)", referenceId);
            return getOrCreateUserPoint(userId);
        }

        UserPoint point = getOrCreateUserPoint(userId);
        point.setCurrentBalance(point.getCurrentBalance() + amount);
        point.setLifetimeEarned(point.getLifetimeEarned() + amount);
        point = userPointRepository.save(point);

        PointTransaction tx = PointTransaction.builder()
                .userId(userId)
                .amount(amount)
                .transactionType(type)
                .referenceId(referenceId)
                .description(description)
                .balanceAfter(point.getCurrentBalance())
                .build();

        pointTransactionRepository.save(tx);
        log.info("Cộng {} điểm cho user {}, số dư mới: {}", amount, userId, point.getCurrentBalance());
        return point;
    }

    @Transactional
    public UserPoint deductPoints(Long userId, int amount, PointTransactionType type, String referenceId, String description) {
        if (amount <= 0) {
            return getOrCreateUserPoint(userId);
        }

        UserPoint point = getOrCreateUserPoint(userId);
        if (point.getCurrentBalance() < amount) {
            throw new BusinessException("INSUFFICIENT-POINTS", "Số dư điểm không đủ để thực hiện thao tác này");
        }

        point.setCurrentBalance(point.getCurrentBalance() - amount);
        point.setLifetimeSpent(point.getLifetimeSpent() + amount);
        point = userPointRepository.save(point);

        PointTransaction tx = PointTransaction.builder()
                .userId(userId)
                .amount(-amount)
                .transactionType(type)
                .referenceId(referenceId)
                .description(description)
                .balanceAfter(point.getCurrentBalance())
                .build();

        pointTransactionRepository.save(tx);
        log.info("Trừ {} điểm của user {}, số dư còn: {}", amount, userId, point.getCurrentBalance());
        return point;
    }

    @Transactional(readOnly = true)
    public UserPointResponse getUserPoint(Long userId) {
        UserPoint point = getOrCreateUserPoint(userId);
        return UserPointResponse.fromEntity(point);
    }

    @Transactional(readOnly = true)
    public List<PointTransactionResponse> getPointHistory(Long userId) {
        return pointTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(PointTransactionResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public Page<PointTransactionResponse> getPointHistoryPaged(Long userId, Pageable pageable) {
        return pointTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(PointTransactionResponse::fromEntity);
    }

    // ── VOUCHER OPERATIONS ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<VoucherResponse> getAvailableVouchers() {
        return voucherRepository.findByActiveTrueOrderByPointsRequiredAsc()
                .stream().map(VoucherResponse::fromEntity).toList();
    }

    @Transactional
    public UserVoucherResponse redeemVoucher(Long userId, Long voucherId) {
        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new BusinessException("VOUCHER-NOT-FOUND", "Voucher không tồn tại"));

        if (!voucher.isActive()) {
            throw new BusinessException("VOUCHER-INACTIVE", "Voucher hiện không còn mở phát hành");
        }

        if (voucher.getRemainingQuantity() <= 0) {
            throw new BusinessException("VOUCHER-OUT-OF-STOCK", "Voucher này đã hết lượt quy đổi");
        }

        Instant now = Instant.now();
        if (voucher.getEndDate() != null && voucher.getEndDate().isBefore(now)) {
            throw new BusinessException("VOUCHER-EXPIRED", "Chương trình quy đổi voucher này đã hết hạn");
        }

        int pointsRequired = voucher.getPointsRequired();
        deductPoints(
                userId,
                pointsRequired,
                PointTransactionType.REDEEM_VOUCHER,
                "VOUCHER_REDEEM_" + voucherId + "_" + System.currentTimeMillis(),
                "Quy đổi voucher: " + voucher.getTitle()
        );

        voucher.setRemainingQuantity(voucher.getRemainingQuantity() - 1);
        voucherRepository.save(voucher);

        String randomSuffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String generatedCode = voucher.getCode() + "-" + randomSuffix;

        Instant expiryDate = now.plus(voucher.getValidDays(), ChronoUnit.DAYS);

        UserVoucher userVoucher = UserVoucher.builder()
                .userId(userId)
                .voucher(voucher)
                .userVoucherCode(generatedCode)
                .pointsSpent(pointsRequired)
                .status(UserVoucherStatus.AVAILABLE)
                .expiryDate(expiryDate)
                .build();

        UserVoucher saved = userVoucherRepository.save(userVoucher);
        log.info("User {} đổi thành công voucher {} với mã {}", userId, voucher.getCode(), generatedCode);

        return UserVoucherResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<UserVoucherResponse> getMyVouchers(Long userId, UserVoucherStatus status) {
        if (status != null) {
            return userVoucherRepository.findByUserIdAndStatusWithVoucher(userId, status)
                    .stream().map(UserVoucherResponse::fromEntity).toList();
        }
        return userVoucherRepository.findByUserIdWithVoucher(userId)
                .stream().map(UserVoucherResponse::fromEntity).toList();
    }

    private UserPoint getOrCreateUserPoint(Long userId) {
        return userPointRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserPoint up = UserPoint.builder()
                            .userId(userId)
                            .currentBalance(0)
                            .lifetimeEarned(0)
                            .lifetimeSpent(0)
                            .build();
                    return userPointRepository.save(up);
                });
    }
}
