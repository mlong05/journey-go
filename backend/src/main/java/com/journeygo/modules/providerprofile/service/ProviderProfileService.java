package com.journeygo.modules.providerprofile.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.common.security.AuthorizationGuard;
import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.providerprofile.dto.request.CreateProviderProfileRequest;
import com.journeygo.modules.providerprofile.dto.response.ProviderProfileResponse;
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
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
 * ProviderProfile — quản lý đối tác và ví nội bộ.
 *
 * <p>Quy tắc nghiệp vụ (Mục 3.1 — Quy tắc tạo Wallet):
 * <ol>
 *   <li>Admin tạo tài khoản ProviderProfile bằng cách chọn User có sẵn và gán vai trò CONTENT_PROVIDER.</li>
 *   <li>Hệ thống tạo bản ghi ProviderProfile và Wallet <b>trong cùng một transaction</b>.</li>
 *   <li>Mỗi ProviderProfile chỉ có một Wallet — không tạo Wallet thứ hai.</li>
 *   <li>Số dư khởi tạo bằng 0.</li>
 *   <li>Nếu tạo Wallet thất bại, toàn bộ thao tác tạo ProviderProfile phải rollback.</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderProfileService {

    private final ProviderProfileRepository providerProfileRepository;
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final FinanceProperties financeProperties;

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Tạo ProviderProfile + Wallet trong cùng một transaction.
     *
     * <p>Nếu không tạo được Wallet thì ProviderProfile cũng không được tạo (rollback toàn bộ) —
     * tránh trạng thái "ProviderProfile tồn tại mà không có Wallet".
     */
    @Transactional
    public ProviderProfileResponse createProviderProfile(CreateProviderProfileRequest request, Long adminId) {
        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (providerProfileRepository.existsByUser_Id(user.getId())) {
            throw new AppException(ErrorCode.PROVIDER_PROFILE_ALREADY_EXISTS,
                    "Người dùng này đã là đối tác — không thể tạo lần thứ hai");
        }

        // Gán vai trò CONTENT_PROVIDER nếu user chưa có.
        if (user.getRole() == null || !Role.CONTENT_PROVIDER.equalsIgnoreCase(user.getRole().getName())) {
            Role providerRole = roleRepository.findByName(Role.CONTENT_PROVIDER)
                    .orElseGet(() -> roleRepository.save(new Role(Role.CONTENT_PROVIDER, "Đối tác nhận doanh thu")));
            user.setRole(providerRole);
            userRepository.save(user);
        }

        String providerName = (request.providerName() != null && !request.providerName().isBlank())
                ? request.providerName().trim()
                : user.getFullName();

        BigDecimal rate = request.commissionRate() != null
                ? request.commissionRate()
                : financeProperties.getDefaultCommissionRate();

        ProviderProfile providerProfile = providerProfileRepository.save(ProviderProfile.builder()
                .user(user)
                .providerName(providerName)
                .commissionRate(rate)
                .active(true)
                .build());

        // Tạo Wallet trong CÙNG transaction — nếu lỗi thì toàn bộ rollback.
        Wallet wallet = walletRepository.save(Wallet.builder()
                .providerProfile(providerProfile)
                .balance(BigDecimal.ZERO)
                .currency("VND")
                .build());

        log.info("[ProviderProfile] Đã tạo providerProfile id={} user={} wallet={} (admin={})",
                providerProfile.getId(), user.getId(), wallet.getId(), adminId);

        return ProviderProfileResponse.fromEntity(providerProfile, true);
    }

    // ── Provisioning ──────────────────────────────────────────────────────────

    /**
     * Bảo đảm User có đúng một ProviderProfile và đúng một Wallet.
     *
     * <p>Hàm này là <b>idempotent</b>: nếu hồ sơ đã tồn tại thì không tạo thêm; nếu Wallet
     * đã tồn tại thì không tạo thêm. Được gọi khi User được cấp vai trò
     * {@code CONTENT_PROVIDER} (Admin đổi role, Admin tạo user, đăng ký tài khoản đối tác).
     *
     * <p>Việc tạo hồ sơ và ví nằm trong cùng transaction với thay đổi role nên không có
     * trạng thái trung gian "có role nhưng chưa có ví".
     *
     * <p>Nguyên tắc: Revenue Service KHÔNG dùng hàm này — Revenue Service chỉ được truy vấn
     * hồ sơ đã tồn tại.
     */
    @Transactional
    public ProviderProfile ensureProfileAndWallet(User user) {
        ProviderProfile profile = providerProfileRepository.findByUser_Id(user.getId()).orElse(null);
        if (profile == null) {
            profile = providerProfileRepository.save(ProviderProfile.builder()
                    .user(user)
                    .providerName(user.getFullName())
                    .commissionRate(financeProperties.getDefaultCommissionRate())
                    .active(true)
                    .build());
        }
        if (walletRepository.findByProviderProfile_Id(profile.getId()).isEmpty()) {
            walletRepository.save(Wallet.builder()
                    .providerProfile(profile)
                    .balance(BigDecimal.ZERO)
                    .currency("VND")
                    .build());
        }
        return profile;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ProviderProfileResponse getById(Long providerProfileId) {
        ProviderProfile providerProfile = findOrThrow(providerProfileId);
        requireFinanceAccess(providerProfile);
        boolean hasWallet = walletRepository.findByProviderProfile_Id(providerProfileId).isPresent();
        return ProviderProfileResponse.fromEntity(providerProfile, hasWallet);
    }

    @Transactional(readOnly = true)
    public ProviderProfileResponse getByUserId(Long userId) {
        ProviderProfile providerProfile = providerProfileRepository.findByUser_Id(userId)
                .orElseThrow(() -> new AppException(ErrorCode.PROVIDER_PROFILE_NOT_FOUND));
        requireFinanceAccess(providerProfile);
        boolean hasWallet = walletRepository.findByProviderProfile_Id(providerProfile.getId()).isPresent();
        return ProviderProfileResponse.fromEntity(providerProfile, hasWallet);
    }

    /**
     * Chặn Content Provider đọc hồ sơ tài chính của đối tác khác.
     *
     * <p>Hồ sơ ProviderProfile chứa {@code commissionRate} và {@code hasWallet} — là dữ liệu
     * tài chính. ADMIN xem được tất cả; CONTENT_PROVIDER chỉ xem được hồ sơ của chính mình.
     */
    private void requireFinanceAccess(ProviderProfile providerProfile) {
        if (providerProfile == null) {
            return;
        }
        User owner = providerProfile.getUser();
        AuthorizationGuard.requireFinanceOwnerOrAdmin(owner == null ? null : owner.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<ProviderProfileResponse> getAll(Boolean active, Pageable pageable) {
        Page<ProviderProfile> page = (active != null)
                ? providerProfileRepository.findByActiveTrue(pageable)
                : providerProfileRepository.findAll(pageable);
        return PageResponse.from(page, p -> ProviderProfileResponse.fromEntity(p, true));
    }

    @Transactional(readOnly = true)
    public List<ProviderProfileResponse> getActiveProviderProfiles() {
        return providerProfileRepository.findByActiveTrue().stream()
                .map(p -> ProviderProfileResponse.fromEntity(p, true))
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
    public ProviderProfileResponse updateProviderProfile(Long providerProfileId, String providerName, BigDecimal commissionRate, Boolean active) {
        ProviderProfile providerProfile = findOrThrow(providerProfileId);

        if (providerName != null && !providerName.isBlank()) {
            providerProfile.setProviderName(providerName.trim());
        }
        if (commissionRate != null) {
            providerProfile.setCommissionRate(commissionRate);
        }
        if (active != null) {
            providerProfile.setActive(active);
        }
        providerProfileRepository.save(providerProfile);
        return ProviderProfileResponse.fromEntity(providerProfile, walletRepository.findByProviderProfile_Id(providerProfileId).isPresent());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public ProviderProfile findOrThrow(Long providerProfileId) {
        return providerProfileRepository.findById(providerProfileId)
                .orElseThrow(() -> new AppException(ErrorCode.PROVIDER_PROFILE_NOT_FOUND));
    }

    /**
     * Tìm ProviderProfile theo user — dùng khi hệ thống cần ghi nhận doanh thu cho đối tác sở hữu
     * một Experience/Destination.
     */
    @Transactional(readOnly = true)
    public ProviderProfile findByUserIdOrNull(Long userId) {
        return providerProfileRepository.findByUser_Id(userId).orElse(null);
    }

    /**
     * BR-01: chỉ đối tác đã được Admin duyệt (có hồ sơ — tạo khi duyệt đơn đăng ký đối tác)
     * và đang hoạt động mới được tạo / gửi duyệt tour.
     */
    @Transactional(readOnly = true)
    public void requireCanManageTours(Long userId) {
        ProviderProfile profile = providerProfileRepository.findByUser_Id(userId).orElse(null);
        if (profile == null || !profile.canManageTours()) {
            throw new AppException(ErrorCode.PROVIDER_NOT_APPROVED);
        }
    }
}
