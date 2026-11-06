package com.journeygo.modules.wallet.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.common.security.AuthorizationGuard;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.wallet.dto.response.WalletResponse;
import com.journeygo.modules.wallet.dto.response.WalletTransactionResponse;
import com.journeygo.modules.wallet.entity.Wallet;
import com.journeygo.modules.wallet.entity.WalletTransaction;
import com.journeygo.modules.wallet.entity.enums.WalletTransactionType;
import com.journeygo.modules.wallet.repository.WalletRepository;
import com.journeygo.modules.wallet.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Wallet — ví nội bộ của ProviderProfile.
 *
 * <p>Quy tắc nghiệp vụ (Mục 3.2 & 3.3):
 * <ul>
 *   <li>Mỗi ProviderProfile có đúng một Wallet (ràng buộc duy nhất {@code uk_wallet_provider_profile}).</li>
 *   <li>Số dư khởi tạo = 0.</li>
 *   <li>Số dư CHỈ thay đổi qua giao dịch Wallet tương ứng — không sửa trực tiếp số dư.</li>
 *   <li>Không triển khai nạp tiền / rút tiền (ngoài phạm vi hiện tại).</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public WalletResponse getByProviderProfile(Long providerProfileId) {
        Wallet wallet = walletRepository.findByProviderProfile_Id(providerProfileId)
                .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND,
                        "Đối tác chưa có ví nội bộ"));
        requireFinanceAccess(wallet);
        return WalletResponse.fromEntity(wallet);
    }

    @Transactional(readOnly = true)
    public WalletResponse getById(Long walletId) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));
        requireFinanceAccess(wallet);
        return WalletResponse.fromEntity(wallet);
    }

    @Transactional(readOnly = true)
    public PageResponse<WalletTransactionResponse> getTransactions(Long providerProfileId, Pageable pageable) {
        Wallet wallet = walletRepository.findByProviderProfile_Id(providerProfileId)
                .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND,
                        "Đối tác chưa có ví nội bộ"));
        requireFinanceAccess(wallet);
        var page = transactionRepository.findByWallet_ProviderProfile_IdOrderByCreatedAtDesc(providerProfileId, pageable);
        return PageResponse.from(page, WalletTransactionResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public PageResponse<WalletTransactionResponse> getTransactionsByWallet(Long walletId, Pageable pageable) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));
        requireFinanceAccess(wallet);
        var page = transactionRepository.findByWallet_IdOrderByCreatedAtDesc(walletId, pageable);
        return PageResponse.from(page, WalletTransactionResponse::fromEntity);
    }

    /**
     * Chặn Content Provider đọc dữ liệu ví của đối tác khác. ADMIN thì qua tất cả.
     */
    private void requireFinanceAccess(Wallet wallet) {
        if (wallet.getProviderProfile() == null) {
            return;
        }
        User owner = wallet.getProviderProfile().getUser();
        AuthorizationGuard.requireFinanceOwnerOrAdmin(owner == null ? null : owner.getId());
    }

    // ── Mutation ──────────────────────────────────────────────────────────────

    /**
     * Cộng tiền vào ví — tạo một giao dịch {@code SETTLEMENT_CREDIT}.
     *
     * <p>Được gọi khi Settlement được duyệt. Việc này phải nằm trong CÙNG transaction với
     * việc duyệt Settlement và cập nhật ProviderProfile Revenue (Mục 9.6 — duyệt phải nguyên tử).
     *
     * <p>Ràng buộc {@code uk_wallet_txn_settlement_credit} bảo đảm một Settlement chỉ tạo
     * được một giao dịch cộng tiền thành công — kể cả khi Admin nhấn duyệt hai lần.
     *
     * @param wallet   Ví của ProviderProfile
     * @param amount   Số tiền cộng (phải > 0)
     * @param sourceId ID Settlement nguồn
     * @param createdBy Admin duyệt
     * @param note     Ghi chú
     * @return Giao dịch ví đã tạo
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public WalletTransaction creditFromSettlement(Wallet wallet, BigDecimal amount, Long sourceId,
                                                   User createdBy, String note) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Số tiền cộng vào ví phải lớn hơn 0");
        }

        // Chống giao dịch cộng tiền lần thứ hai cho cùng một Settlement.
        if (transactionRepository.findSettlementCredit(wallet.getId(), sourceId,
                WalletTransactionType.SETTLEMENT_CREDIT).isPresent()) {
            throw new AppException(ErrorCode.SETTLEMENT_ALREADY_APPROVED,
                    "Settlement này đã tạo giao dịch cộng tiền vào ví — không thể cộng lần thứ hai");
        }

        BigDecimal balanceBefore = wallet.getBalance() != null ? wallet.getBalance() : BigDecimal.ZERO;

        WalletTransaction txn = WalletTransaction.credit(
                wallet,
                WalletTransactionType.SETTLEMENT_CREDIT,
                WalletTransaction.SourceType.SETTLEMENT,
                sourceId,
                amount,
                balanceBefore,
                createdBy,
                note);

        transactionRepository.save(txn);

        wallet.setBalance(balanceBefore.add(amount));
        walletRepository.save(wallet);

        log.info("[Wallet] Cộng {} vào ví {} (settlement {}) — số dư: {} → {}",
                amount, wallet.getId(), sourceId, balanceBefore, wallet.getBalance());

        return txn;
    }

    /**
     * Ghi nhận khoản điều chỉnh (CREDIT hoặc DEBIT) vào ví — dùng cho Financial Adjustment.
     *
     * <p>Nếu số dư không đủ cho khoản khấu trừ → KHÔNG cho âm số dư; ghi nhận giao dịch
     * {@code PENDING} để xử lý khoản phải thu (Mục 8.2).
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public WalletTransaction applyAdjustment(Wallet wallet, WalletTransactionType type, BigDecimal amount,
                                             WalletTransaction.SourceType sourceType, Long sourceId,
                                             User createdBy, String note) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Số tiền điều chỉnh không được bằng 0");
        }

        boolean debit = amount.compareTo(BigDecimal.ZERO) < 0;
        BigDecimal absAmount = amount.abs();
        BigDecimal balanceBefore = wallet.getBalance() != null ? wallet.getBalance() : BigDecimal.ZERO;

        if (debit && balanceBefore.compareTo(absAmount) < 0) {
            // Không đủ số dư — ghi nhận khoản phải thu thay vì âm số dư không kiểm soát.
            WalletTransaction pending = WalletTransaction.debit(
                    wallet, type, sourceType, sourceId, absAmount, balanceBefore, createdBy, note);
            pending.setStatus(com.journeygo.modules.wallet.entity.enums.WalletTransactionStatus.PENDING);
            transactionRepository.save(pending);
            log.warn("[Wallet] Không đủ số dư để khấu trừ {} (số dư {}) — ghi nhận khoản phải thu chờ xử lý",
                    absAmount, balanceBefore);
            return pending;
        }

        WalletTransaction txn = debit
                ? WalletTransaction.debit(wallet, type, sourceType, sourceId, absAmount, balanceBefore, createdBy, note)
                : WalletTransaction.credit(wallet, type, sourceType, sourceId, absAmount, balanceBefore, createdBy, note);

        transactionRepository.save(txn);

        wallet.setBalance(debit ? balanceBefore.subtract(absAmount) : balanceBefore.add(absAmount));
        walletRepository.save(wallet);

        log.info("[Wallet] Điều chỉnh {} vào ví {} ({}) — số dư: {} → {}",
                amount, wallet.getId(), sourceType, balanceBefore, wallet.getBalance());

        return txn;
    }
}
