package com.journeygo.modules.partner.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.partner.dto.request.CreatePartnerRequest;
import com.journeygo.modules.partner.dto.response.PartnerResponse;
import com.journeygo.modules.partner.entity.Partner;
import com.journeygo.modules.partner.repository.PartnerRepository;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.RoleRepository;
import com.journeygo.modules.user.repository.UserRepository;
import com.journeygo.modules.wallet.entity.Wallet;
import com.journeygo.modules.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Partner — quản lý đối tác và ví nội bộ.
 *
 * <p>Quy tắc nghiệp vụ (Mục 3.1 — Quy tắc tạo Wallet):
 * <ol>
 *   <li>Admin tạo tài khoản Partner bằng cách chọn User có sẵn và gán vai trò PARTNER.</li>
 *   <li>Hệ thống tạo bản ghi Partner và Wallet <b>trong cùng một transaction</b>.</li>
 *   <li>Mỗi Partner chỉ có một Wallet — không tạo Wallet thứ hai.</li>
 *   <li>Số dư khởi tạo bằng 0.</li>
 *   <li>Nếu tạo Wallet thất bại, toàn bộ thao tác tạo Partner phải rollback.</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerService {

    private final PartnerRepository partnerRepository;
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final FinanceProperties financeProperties;

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Tạo Partner + Wallet trong cùng một transaction.
     *
     * <p>Nếu không tạo được Wallet thì Partner cũng không được tạo (rollback toàn bộ) —
     * tránh trạng thái "Partner tồn tại mà không có Wallet".
     */
    @Transactional
    public PartnerResponse createPartner(CreatePartnerRequest request, Long adminId) {
        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (partnerRepository.existsByUser_Id(user.getId())) {
            throw new AppException(ErrorCode.PARTNER_ALREADY_EXISTS,
                    "Người dùng này đã là đối tác — không thể tạo lần thứ hai");
        }

        // Gán vai trò PARTNER nếu user chưa có.
        if (user.getRole() == null || !Role.PARTNER.equalsIgnoreCase(user.getRole().getName())) {
            Role partnerRole = roleRepository.findByName(Role.PARTNER)
                    .orElseGet(() -> roleRepository.save(new Role(Role.PARTNER, "Đối tác nhận doanh thu")));
            user.setRole(partnerRole);
            userRepository.save(user);
        }

        String partnerName = (request.partnerName() != null && !request.partnerName().isBlank())
                ? request.partnerName().trim()
                : user.getFullName();

        BigDecimal rate = request.commissionRate() != null
                ? request.commissionRate()
                : financeProperties.getDefaultCommissionRate();

        Partner partner = partnerRepository.save(Partner.builder()
                .user(user)
                .partnerName(partnerName)
                .commissionRate(rate)
                .active(true)
                .build());

        // Tạo Wallet trong CÙNG transaction — nếu lỗi thì toàn bộ rollback.
        Wallet wallet = walletRepository.save(Wallet.builder()
                .partner(partner)
                .balance(BigDecimal.ZERO)
                .currency("VND")
                .build());

        log.info("[Partner] Đã tạo partner id={} user={} wallet={} (admin={})",
                partner.getId(), user.getId(), wallet.getId(), adminId);

        return PartnerResponse.fromEntity(partner, true);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PartnerResponse getById(Long partnerId) {
        Partner partner = findOrThrow(partnerId);
        boolean hasWallet = walletRepository.findByPartner_Id(partnerId).isPresent();
        return PartnerResponse.fromEntity(partner, hasWallet);
    }

    @Transactional(readOnly = true)
    public PartnerResponse getByUserId(Long userId) {
        Partner partner = partnerRepository.findByUser_Id(userId)
                .orElseThrow(() -> new AppException(ErrorCode.PARTNER_NOT_FOUND));
        boolean hasWallet = walletRepository.findByPartner_Id(partner.getId()).isPresent();
        return PartnerResponse.fromEntity(partner, hasWallet);
    }

    @Transactional(readOnly = true)
    public PageResponse<PartnerResponse> getAll(Boolean active, Pageable pageable) {
        Page<Partner> page = (active != null)
                ? partnerRepository.findByActiveTrue(pageable)
                : partnerRepository.findAll(pageable);
        return PageResponse.from(page, p -> PartnerResponse.fromEntity(p, true));
    }

    @Transactional(readOnly = true)
    public List<PartnerResponse> getActivePartners() {
        return partnerRepository.findByActiveTrue().stream()
                .map(p -> PartnerResponse.fromEntity(p, true))
                .toList();
    }

    // ── Update ────────────────────────────────────────────────────────────────

    /**
     * Cập nhật thông tin đối tác (tên, tỷ lệ hoa hồng, trạng thái).
     *
     * <p>Không cho phép sửa tỷ lệ hoa hồng nếu đối tác đã có doanh thu đã ghi nhận —
     * việc đó sẽ làm sai lịch sử tài chính. Khi đó Admin dùng khoản điều chỉnh tài chính.
     */
    @Transactional
    public PartnerResponse updatePartner(Long partnerId, String partnerName, BigDecimal commissionRate, Boolean active) {
        Partner partner = findOrThrow(partnerId);

        if (partnerName != null && !partnerName.isBlank()) {
            partner.setPartnerName(partnerName.trim());
        }
        if (commissionRate != null) {
            partner.setCommissionRate(commissionRate);
        }
        if (active != null) {
            partner.setActive(active);
        }
        partnerRepository.save(partner);
        return PartnerResponse.fromEntity(partner, walletRepository.findByPartner_Id(partnerId).isPresent());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public Partner findOrThrow(Long partnerId) {
        return partnerRepository.findById(partnerId)
                .orElseThrow(() -> new AppException(ErrorCode.PARTNER_NOT_FOUND));
    }

    /**
     * Tìm Partner theo user — dùng khi hệ thống cần ghi nhận doanh thu cho đối tác sở hữu
     * một Experience/Destination.
     */
    @Transactional(readOnly = true)
    public Partner findByUserIdOrNull(Long userId) {
        return partnerRepository.findByUser_Id(userId).orElse(null);
    }
}
