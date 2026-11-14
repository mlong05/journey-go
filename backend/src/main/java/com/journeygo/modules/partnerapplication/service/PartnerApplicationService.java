package com.journeygo.modules.partnerapplication.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.common.service.CloudinaryService;
import com.journeygo.modules.partnerapplication.dto.request.ApprovePartnerApplicationRequest;
import com.journeygo.modules.partnerapplication.dto.request.PartnerApplicationDraftRequest;
import com.journeygo.modules.partnerapplication.dto.request.RejectPartnerApplicationRequest;
import com.journeygo.modules.partnerapplication.dto.request.SendPartnerOtpRequest;
import com.journeygo.modules.partnerapplication.dto.request.VerifyPartnerOtpRequest;
import com.journeygo.modules.partnerapplication.dto.response.PartnerApplicationDecisionResponse;
import com.journeygo.modules.partnerapplication.dto.response.PartnerApplicationResponse;
import com.journeygo.modules.partnerapplication.dto.response.PartnerOtpVerifyResponse;
import com.journeygo.modules.partnerapplication.entity.PartnerActivationToken;
import com.journeygo.modules.partnerapplication.entity.PartnerApplication;
import com.journeygo.modules.partnerapplication.entity.PartnerApplicationHistory;
import com.journeygo.modules.partnerapplication.entity.PartnerApplicationOtp;
import com.journeygo.modules.partnerapplication.entity.PartnerVerificationToken;
import com.journeygo.modules.partnerapplication.entity.enums.PartnerApplicationAction;
import com.journeygo.modules.partnerapplication.entity.enums.PartnerApplicationStatus;
import com.journeygo.modules.partnerapplication.entity.enums.PartnerType;
import com.journeygo.modules.partnerapplication.repository.PartnerActivationTokenRepository;
import com.journeygo.modules.partnerapplication.repository.PartnerApplicationHistoryRepository;
import com.journeygo.modules.partnerapplication.repository.PartnerApplicationOtpRepository;
import com.journeygo.modules.partnerapplication.repository.PartnerApplicationRepository;
import com.journeygo.modules.partnerapplication.repository.PartnerVerificationTokenRepository;
import com.journeygo.modules.providerprofile.service.ProviderProfileService;
import com.journeygo.modules.user.entity.AuthProvider;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.RoleRepository;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Nghiệp vụ "Đăng ký trở thành đối tác" và "Admin quản lý đối tác".
 *
 * <p>Luồng người đăng ký:
 * <ol>
 *   <li>{@code sendOtp} — gửi OTP 6 chữ số xác minh email (hạn 5 phút, 3 lần/ngày, 5 lần sai).</li>
 *   <li>{@code verifyOtp} — xác minh OTP. Nếu email đã có tài khoản ⇒ báo "chuyển sang màn hình
 *       Đăng nhập / Khôi phục mật khẩu" (không tiết lộ trước khi có OTP).</li>
 *   <li>{@code saveDraft} — lưu nháp từng giai đoạn, có thể quay lại sửa.</li>
 *   <li>{@code submit} — kiểm tra lại TOÀN BỘ dữ liệu rồi mới gửi.</li>
 * </ol>
 *
 * <p>Luồng Admin:
 * <ol>
 *   <li>{@code approve} — kiểm tra hồ sơ hợp lệ → tạo/nâng cấp tài khoản CONTENT_PROVIDER
 *       → cấp ProviderProfile + Wallet → cập nhật trạng thái → ghi lịch sử → gửi email.</li>
 *   <li>{@code reject} — bắt buộc có lý do → cập nhật trạng thái → ghi lịch sử → gửi email.</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerApplicationService {

    // ── Hằng số nghiệp vụ ──────────────────────────────────────────────────────
    /** Thời hạn hiệu lực của mã OTP (phút). */
    private static final int OTP_EXPIRY_MINUTES = 5;
    /** Tối đa số lần gửi OTP cho cùng một email trong 1 ngày. */
    private static final int MAX_OTP_SENDS_PER_DAY = 3;
    /** Tối đa số lần nhập sai OTP. */
    private static final int MAX_OTP_ATTEMPTS = 5;
    /** Thời hạn token thiết lập mật khẩu (giờ). */
    private static final int ACTIVATION_TOKEN_EXPIRY_HOURS = 72;
    /** Thời hạn token xác nhận "email đã verify" (giờ). */
    private static final int VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
    /** Trạng thái được coi là "đơn đang chờ xử lý" dùng để chống trùng. */
    private static final List<PartnerApplicationStatus> OPEN_STATUSES =
            List.of(PartnerApplicationStatus.PENDING);

    private final PartnerApplicationRepository applicationRepository;
    private final PartnerApplicationHistoryRepository historyRepository;
    private final PartnerApplicationOtpRepository otpRepository;
    private final PartnerActivationTokenRepository activationTokenRepository;
    private final PartnerVerificationTokenRepository verificationTokenRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ProviderProfileService providerProfileService;
    private final PasswordEncoder passwordEncoder;
    private final PartnerApplicationEmailService emailService;
    private final CloudinaryService cloudinaryService;

    @Value("${app.partner.otp-expiry-minutes:5}")
    private int otpExpiryMinutes;

    @Value("${app.partner.support-contact:support@journeygo.com}")
    private String supportContact;

    private final SecureRandom random = new SecureRandom();

    // ═══════════════════════════════════════════════════════════════════════════
    //  GIAI ĐOẠN 1 — XÁC MINH EMAIL BẰNG OTP
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gửi OTP 6 chữ số tới email để xác minh.
     *
     * <p>Quy tắc: hạn 5 phút · tối đa 3 lần gửi / email / ngày · gửi mã mới ⇒ mã cũ mất hiệu lực.
     */
    @Transactional
    public void sendOtp(SendPartnerOtpRequest request) {
        String email = request.email().toLowerCase().trim();

        Instant dayStart = Instant.now().truncatedTo(ChronoUnit.DAYS);
        long sentToday = otpRepository.countByEmailIgnoreCaseAndCreatedAtBetween(email, dayStart, Instant.now());
        if (sentToday >= MAX_OTP_SENDS_PER_DAY) {
            // Thông báo rõ ràng cho người dùng biết khi nào mới gửi lại được.
            ZonedDateTime resetAt = ZonedDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"))
                    .toLocalDate()
                    .plusDays(1)
                    .atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh"));
            throw new AppException(ErrorCode.PARTNER_OTP_LIMIT_EXCEEDED,
                    "Bạn đã yêu cầu gửi mã xác thực quá " + MAX_OTP_SENDS_PER_DAY
                            + " lần trong ngày. Vui lòng thử lại sau "
                            + resetAt.format(DateTimeFormatter.ofPattern("HH:mm d/MM/yyyy"))
                            + " (giờ Việt Nam).");
        }

        // Mã mới ⇒ vô hiệu hóa các mã cũ của email này.
        otpRepository.findByEmailIgnoreCase(email).forEach(otp -> {
            if (!otp.isUsed()) {
                otp.setUsed(true);
                otpRepository.save(otp);
            }
        });

        String otp = String.format("%06d", random.nextInt(1_000_000));
        otpRepository.save(PartnerApplicationOtp.builder()
                .email(email)
                .otp(otp)
                .expiryDate(Instant.now().plus(otpExpiryMinutes, ChronoUnit.MINUTES))
                .used(false)
                .attemptCount(0)
                .build());

        // Gửi email OTP. Nếu SMTP lỗi (chưa cấu hình / sai thông tin) thì KHÔNG được làm
        // hỏng cả luồng đăng ký: mã OTP vẫn được lưu và đã ghi log ra console để test.
        try {
            emailService.sendPartnerOtp(email, otp, otpExpiryMinutes);
        } catch (Exception ex) {
            log.error("[PartnerApplication] Không gửi được email OTP tới {}: {}", email, ex.getMessage());
        }
        log.info("[PartnerApplication] Đã gửi OTP tới {} (lần thứ {} trong ngày)", email, sentToday + 1);
    }

    /**
     * Upload tài liệu hồ sơ đăng ký đối tác (giấy phép, GPKD, giấy ký quỹ — ảnh hoặc PDF).
     *
     * <p>Người đăng ký CHƯA có tài khoản nên không có JWT. Để không mở lỗ hổng upload ẩn danh,
     * endpoint này yêu cầu {@code verificationToken} — bằng chứng "email đã xác minh OTP" —
     * giống hệt cơ chế bảo vệ lưu nháp / gửi đơn.
     *
     * @param email           email đang đăng ký
     * @param verificationToken token do server cấp sau khi verify OTP thành công
     * @param file            tệp tài liệu (ảnh hoặc PDF, tối đa 10MB)
     * @return URL an toàn của tài liệu
     */
    public String uploadDocument(String email, String verificationToken, MultipartFile file) {
        String normalizedEmail = email == null ? "" : email.toLowerCase().trim();
        if (normalizedEmail.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Email không được để trống");
        }
        if (!isEmailVerified(normalizedEmail, verificationToken)) {
            throw new AppException(ErrorCode.PARTNER_APPLICATION_EMAIL_NOT_VERIFIED);
        }
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tệp tải lên không được để trống");
        }
        return cloudinaryService.uploadDocument(file, "journeygo/partner-applications");
    }

    /**
     * Xác minh OTP email.
     *
     * <p>Chỉ khi OTP đúng mới tiết lộ email đã có tài khoản hay chưa — nhờ vậy kẻ gian nhập bừa
     * email của người khác bị kẹt ở bước nhập OTP và không biết email đó đã đăng ký hay chưa.
     */
    @Transactional
    public PartnerOtpVerifyResponse verifyOtp(VerifyPartnerOtpRequest request) {
        String email = request.email().toLowerCase().trim();
        String otp = request.otp().trim();

        PartnerApplicationOtp record = otpRepository
                .findTopByEmailIgnoreCaseAndUsedFalseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new AppException(ErrorCode.PARTNER_OTP_INVALID));

        if (record.isExpired()) {
            record.setUsed(true);
            otpRepository.save(record);
            throw new AppException(ErrorCode.PARTNER_OTP_EXPIRED);
        }

        if (!record.getOtp().equals(otp)) {
            record.setAttemptCount(record.getAttemptCount() + 1);
            if (record.getAttemptCount() >= MAX_OTP_ATTEMPTS) {
                record.setUsed(true);
                otpRepository.save(record);
                throw new AppException(ErrorCode.PARTNER_OTP_ATTEMPT_LIMIT_EXCEEDED);
            }
            otpRepository.save(record);
            throw new AppException(ErrorCode.PARTNER_OTP_INVALID,
                    "Mã xác thực không đúng. Bạn còn "
                            + (MAX_OTP_ATTEMPTS - record.getAttemptCount()) + " lần thử.");
        }

        record.setUsed(true);
        otpRepository.save(record);

        boolean accountExists = userRepository.existsByEmail(email);
        String message = accountExists
                ? "Xác thực thành công. Email của bạn đã có tài khoản trên hệ thống. "
                  + "Hệ thống đã tự động chuyển bạn sang màn hình Đăng nhập/Khôi phục mật khẩu."
                : "Xác thực thành công. Vui lòng tiếp tục điền thông tin doanh nghiệp.";

        return new PartnerOtpVerifyResponse(email, accountExists, message,
                createVerificationToken(email));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  LƯU NHÁP & GỬI ĐƠN
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Lưu nháp đơn đăng ký (tự động lưu dần theo từng giai đoạn).
     *
     * <p>Nếu đã có đơn của người dùng thì cập nhật đơn đó; nếu đơn đó đã ở trạng thái
     * PENDING / APPROVED thì không cho sửa (chỉ sửa được khi DRAFT hoặc REJECTED).
     */
    @Transactional
    public PartnerApplicationResponse saveDraft(PartnerApplicationDraftRequest request, Long applicantUserId) {
        PartnerApplication application = resolveEditableApplication(request.email(), applicantUserId,
                request.verificationToken());

        application.setEmail(request.email().toLowerCase().trim());
        // Chỉ đánh dấu đã xác minh khi client có token xác nhận do server cấp sau khi verify OTP.
        application.setEmailVerified(Boolean.TRUE.equals(request.emailVerified())
                && isEmailVerified(request.email(), request.verificationToken()));

        application.setPhone(trimToNull(request.phone()));
        application.setRepresentativeName(trimToNull(request.representativeName()));
        application.setRepresentativePosition(request.representativePosition());

        application.setBusinessName(trimToNull(request.businessName()));
        application.setPartnerType(request.partnerType());
        application.setTravelScope(request.partnerType() == PartnerType.TRAVEL_AGENCY ? request.travelScope() : null);
        application.setTaxCode(trimToNull(request.taxCode()));
        application.setBusinessRegistrationInfo(trimToNull(request.businessRegistrationInfo()));
        application.setOperationLicenseUrl(trimToNull(request.operationLicenseUrl()));
        application.setTravelLicenseUrl(trimToNull(request.travelLicenseUrl()));
        application.setSignatureDocumentUrl(trimToNull(request.signatureDocumentUrl()));
        application.setBusinessRegistrationUrl(trimToNull(request.businessRegistrationUrl()));
        application.setProvince(trimToNull(request.province()));
        application.setWard(trimToNull(request.ward()));
        application.setAddressDetail(trimToNull(request.addressDetail()));
        application.setBusinessScope(trimToNull(request.businessScope()));

        application.setBankName(trimToNull(request.bankName()));
        application.setBankAccountNumber(trimToNull(request.bankAccountNumber()));
        application.setBankAccountHolder(trimToNull(request.bankAccountHolder()));

        application.setConfirmedAuthority(Boolean.TRUE.equals(request.confirmedAuthority()));
        application.setAgreedPartnerTerms(Boolean.TRUE.equals(request.agreedPartnerTerms()));
        application.setAgreedPrivacyPolicy(Boolean.TRUE.equals(request.agreedPrivacyPolicy()));

        if (applicantUserId != null && application.getApplicant() == null) {
            application.setApplicant(userRepository.findById(applicantUserId).orElse(null));
        }

        PartnerApplication saved = applicationRepository.save(application);
        return PartnerApplicationResponse.fromEntity(saved, List.of());
    }

    /**
     * Gửi đơn đăng ký.
     *
     * <p>Backend kiểm tra lại TOÀN BỘ dữ liệu (không chỉ dựa vào validation phía frontend)
     * theo 8 điều kiện tối thiểu trong đặc tả. Nếu không đạt, hệ thống từ chối gửi và
     * chỉ rõ trường cần sửa.
     */
    @Transactional
    public PartnerApplicationResponse submit(PartnerApplicationDraftRequest request, Long applicantUserId) {
        PartnerApplication application = resolveEditableApplication(request.email(), applicantUserId,
                request.verificationToken());

        // Nạp trạng thái đã lưu để không mất dữ liệu giai đoạn trước khi client gửi một phần.
        application.setEmail(request.email().toLowerCase().trim());
        application.setEmailVerified(Boolean.TRUE.equals(request.emailVerified())
                && isEmailVerified(request.email(), request.verificationToken()));
        application.setPhone(trimToNull(request.phone()));
        application.setRepresentativeName(trimToNull(request.representativeName()));
        application.setRepresentativePosition(request.representativePosition());
        application.setBusinessName(trimToNull(request.businessName()));
        application.setPartnerType(request.partnerType());
        application.setTravelScope(request.partnerType() == PartnerType.TRAVEL_AGENCY ? request.travelScope() : null);
        application.setTaxCode(trimToNull(request.taxCode()));
        application.setBusinessRegistrationInfo(trimToNull(request.businessRegistrationInfo()));
        application.setOperationLicenseUrl(trimToNull(request.operationLicenseUrl()));
        application.setTravelLicenseUrl(trimToNull(request.travelLicenseUrl()));
        application.setSignatureDocumentUrl(trimToNull(request.signatureDocumentUrl()));
        application.setBusinessRegistrationUrl(trimToNull(request.businessRegistrationUrl()));
        application.setProvince(trimToNull(request.province()));
        application.setWard(trimToNull(request.ward()));
        application.setAddressDetail(trimToNull(request.addressDetail()));
        application.setBusinessScope(trimToNull(request.businessScope()));
        application.setBankName(trimToNull(request.bankName()));
        application.setBankAccountNumber(trimToNull(request.bankAccountNumber()));
        application.setBankAccountHolder(trimToNull(request.bankAccountHolder()));
        application.setConfirmedAuthority(Boolean.TRUE.equals(request.confirmedAuthority()));
        application.setAgreedPartnerTerms(Boolean.TRUE.equals(request.agreedPartnerTerms()));
        application.setAgreedPrivacyPolicy(Boolean.TRUE.equals(request.agreedPrivacyPolicy()));

        if (applicantUserId != null && application.getApplicant() == null) {
            application.setApplicant(userRepository.findById(applicantUserId).orElse(null));
        }

        // ── Kiểm tra dữ liệu trước khi gửi đơn (8 điều kiện tối thiểu) ──────────
        Map<String, String> errors = validateForSubmit(application);

        // 8. Chưa tồn tại đơn đang chờ duyệt cho cùng email hoặc định danh doanh nghiệp.
        if (applicationRepository.existsByEmailIgnoreCaseAndStatusIn(application.getEmail(), OPEN_STATUSES)) {
            errors.put("email", "Đã tồn tại đơn đăng ký đang chờ duyệt cho email này");
        }
        if (application.getBusinessName() != null
                && applicationRepository.existsByBusinessNameIgnoreCaseAndStatusIn(
                        application.getBusinessName(), OPEN_STATUSES)) {
            errors.put("businessName", "Đã tồn tại đơn đăng ký đang chờ duyệt cho doanh nghiệp này");
        }

        if (!errors.isEmpty()) {
            throw new AppException(ErrorCode.PARTNER_APPLICATION_INCOMPLETE,
                    "Hồ sơ chưa hợp lệ: " + String.join("; ", errors.values()));
        }

        PartnerApplicationStatus before = application.getStatus();
        application.setStatus(PartnerApplicationStatus.PENDING);
        application.setSubmittedAt(Instant.now());
        application.setRejectionReason(null);

        PartnerApplication saved = applicationRepository.save(application);

        historyRepository.save(PartnerApplicationHistory.builder()
                .application(saved)
                .actor(saved.getApplicant())
                .action(before == PartnerApplicationStatus.REJECTED
                        ? PartnerApplicationAction.RESUBMITTED : PartnerApplicationAction.SUBMITTED)
                .statusBefore(before)
                .statusAfter(PartnerApplicationStatus.PENDING)
                .reason(before == PartnerApplicationStatus.REJECTED ? "Người đăng ký sửa và gửi lại hồ sơ" : null)
                .build());

        log.info("[PartnerApplication] Đơn id={} ({}) đã được gửi đi duyệt", saved.getId(), saved.getEmail());
        return PartnerApplicationResponse.fromEntity(saved, loadHistory(saved.getId()));
    }

    /**
     * 8 điều kiện tối thiểu trước khi gửi đơn. Trả về map {@code field → thông báo lỗi}.
     */
    private Map<String, String> validateForSubmit(PartnerApplication a) {
        Map<String, String> errors = new LinkedHashMap<>();

        // 1. Email đã xác minh
        if (!a.isEmailVerified()) {
            errors.put("email", "Email chưa được xác minh — vui lòng xác thực OTP trước");
        }

        // 2. Số điện thoại hợp lệ
        if (a.getPhone() == null || a.getPhone().isBlank()) {
            errors.put("phone", "Số điện thoại không được để trống");
        } else if (!a.getPhone().matches("^0\\d{9,10}$")) {
            errors.put("phone", "Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và có 10-11 chữ số)");
        }

        // 3. Thông tin người đại diện đầy đủ
        if (a.getRepresentativeName() == null || a.getRepresentativeName().isBlank()) {
            errors.put("representativeName", "Họ tên người đại diện không được để trống");
        }
        if (a.getRepresentativePosition() == null) {
            errors.put("representativePosition", "Chức vụ người đại diện không được để trống");
        }

        // 4. Loại hình đối tác hợp lệ
        if (a.getPartnerType() == null) {
            errors.put("partnerType", "Loại hình đối tác không được để trống");
        }
        if (a.getBusinessName() == null || a.getBusinessName().isBlank()) {
            errors.put("businessName", "Tên doanh nghiệp / cơ sở không được để trống");
        }
        if (a.getTaxCode() == null || a.getTaxCode().isBlank()) {
            errors.put("taxCode", "Mã số thuế không được để trống");
        } else if (!a.getTaxCode().matches("^\\d{10}$")) {
            errors.put("taxCode", "Mã số thuế phải gồm đúng 10 chữ số");
        }
        if (a.getBusinessRegistrationInfo() == null || a.getBusinessRegistrationInfo().isBlank()) {
            errors.put("businessRegistrationInfo", "Thông tin đăng ký kinh doanh không được để trống");
        }

        // 5. Các giấy tờ bắt buộc đã được tải lên
        if (a.getOperationLicenseUrl() == null || a.getOperationLicenseUrl().isBlank()) {
            errors.put("operationLicenseUrl", "Giấy phép hoạt động không được để trống");
        }
        if (a.getBusinessRegistrationUrl() == null || a.getBusinessRegistrationUrl().isBlank()) {
            errors.put("businessRegistrationUrl", "Giấy đăng ký kinh doanh không được để trống");
        }
        if (a.getPartnerType() == PartnerType.TRAVEL_AGENCY) {
            // Công ty Lữ hành: bắt buộc Giấy phép lữ hành + Giấy ký quỹ + chọn phạm vi.
            if (a.getTravelScope() == null) {
                errors.put("travelScope", "Vui lòng chọn Giấy phép lữ hành Quốc tế hoặc Nội địa");
            }
            if (a.getTravelLicenseUrl() == null || a.getTravelLicenseUrl().isBlank()) {
                errors.put("travelLicenseUrl", "Giấy phép lữ hành không được để trống");
            }
            if (a.getSignatureDocumentUrl() == null || a.getSignatureDocumentUrl().isBlank()) {
                errors.put("signatureDocumentUrl", "Giấy ký quỹ không được để trống");
            }
        }

        // Địa chỉ trụ sở — mô hình hành chính 2 cấp mới: Tỉnh/Thành phố → Phường/Xã
        if (a.getProvince() == null || a.getProvince().isBlank()) {
            errors.put("province", "Tỉnh/Thành phố không được để trống");
        }
        if (a.getWard() == null || a.getWard().isBlank()) {
            errors.put("ward", "Phường/Xã không được để trống");
        }
        if (a.getAddressDetail() == null || a.getAddressDetail().isBlank()) {
            errors.put("addressDetail", "Địa chỉ trụ sở không được để trống");
        }
        if (a.getBusinessScope() == null || a.getBusinessScope().isBlank()) {
            errors.put("businessScope", "Phạm vi hoạt động không được để trống");
        }

        // 6. Thông tin thanh toán hợp lệ
        if (a.getBankName() == null || a.getBankName().isBlank()) {
            errors.put("bankName", "Ngân hàng thụ hưởng không được để trống");
        }
        if (a.getBankAccountNumber() == null || a.getBankAccountNumber().isBlank()) {
            errors.put("bankAccountNumber", "Số tài khoản không được để trống");
        }
        if (a.getBankAccountHolder() == null || a.getBankAccountHolder().isBlank()) {
            errors.put("bankAccountHolder", "Tên chủ tài khoản không được để trống");
        }

        // 7. Các checkbox bắt buộc đã được xác nhận
        if (!a.isConfirmedAuthority()) {
            errors.put("confirmedAuthority", "Vui lòng xác nhận thẩm quyền đại diện");
        }
        if (!a.isAgreedPartnerTerms()) {
            errors.put("agreedPartnerTerms", "Vui lòng đồng ý với Điều khoản hợp tác Đối tác");
        }
        if (!a.isAgreedPrivacyPolicy()) {
            errors.put("agreedPrivacyPolicy", "Vui lòng đồng ý với Chính sách bảo vệ dữ liệu cá nhân");
        }

        return errors;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ADMIN — DUYỆT / TỪ CHỐI
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Admin duyệt hồ sơ.
     *
     * <p>Trình tự theo đặc tả:
     * <ol>
     *   <li>Kiểm tra hồ sơ hợp lệ.</li>
     *   <li>Kiểm tra email đã tồn tại chưa. Chưa tồn tại ⇒ tạo account mới và gán role
     *       {@code CONTENT_PROVIDER}. Đã tồn tại ⇒ nâng cấp role + cấp ProviderProfile + Wallet.</li>
     *   <li>Cập nhật Application Status thành APPROVED.</li>
     *   <li>Ghi nhận lịch sử kiểm duyệt.</li>
     *   <li>Gửi email thông báo phê duyệt (kèm activation token + link đăng nhập).</li>
     * </ol>
     */
    @Transactional
    public PartnerApplicationDecisionResponse approve(Long applicationId, ApprovePartnerApplicationRequest request,
                                                      Long adminId) {
        PartnerApplication application = findOrThrow(applicationId);

        if (application.getStatus() != PartnerApplicationStatus.PENDING) {
            throw new AppException(ErrorCode.PARTNER_APPLICATION_INVALID_STATUS,
                    "Chỉ duyệt được đơn đang ở trạng thái chờ duyệt");
        }

        // 1. Kiểm tra hồ sơ hợp lệ.
        Map<String, String> errors = validateForSubmit(application);
        if (!errors.isEmpty()) {
            throw new AppException(ErrorCode.PARTNER_APPLICATION_INCOMPLETE,
                    "Hồ sơ không hợp lệ: " + String.join("; ", errors.values()));
        }

        // 2. Tạo hoặc nâng cấp tài khoản CONTENT_PROVIDER.
        User user = userRepository.findByEmail(application.getEmail()).orElse(null);
        boolean existingAccount = user != null;

        if (!existingAccount) {
            Role providerRole = roleRepository.findByName(Role.CONTENT_PROVIDER)
                    .orElseGet(() -> roleRepository.save(new Role(Role.CONTENT_PROVIDER, "Đối tác nhận doanh thu")));

            user = User.builder()
                    .email(application.getEmail())
                    // Mật khẩu tạm ngẫu nhiên — đối tác phải dùng activation token để thiết lập mật khẩu.
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .fullName(application.getRepresentativeName())
                    .phone(application.getPhone())
                    .role(providerRole)
                    .authProvider(AuthProvider.LOCAL)
                    .active(true)
                    .build();
            user = userRepository.save(user);
        } else {
            Role providerRole = roleRepository.findByName(Role.CONTENT_PROVIDER)
                    .orElseGet(() -> roleRepository.save(new Role(Role.CONTENT_PROVIDER, "Đối tác nhận doanh thu")));
            user.setRole(providerRole);
            if (user.getFullName() == null || user.getFullName().isBlank()) {
                user.setFullName(application.getRepresentativeName());
            }
            if (user.getPhone() == null || user.getPhone().isBlank()) {
                user.setPhone(application.getPhone());
            }
            user.setActive(true);
            user = userRepository.save(user);
        }

        // Cấp ProviderProfile + Wallet (idempotent) — cùng transaction.
        providerProfileService.ensureProfileAndWallet(user);

        // 3. Cập nhật trạng thái.
        PartnerApplicationStatus before = application.getStatus();
        application.setStatus(PartnerApplicationStatus.APPROVED);
        application.setReviewer(userRepository.getReferenceById(adminId));
        application.setReviewedAt(Instant.now());
        application.setReviewNote(request == null ? null : trimToNull(request.note()));
        application.setRejectionReason(null);
        PartnerApplication saved = applicationRepository.save(application);

        // 4. Ghi lịch sử kiểm duyệt.
        historyRepository.save(PartnerApplicationHistory.builder()
                .application(saved)
                .actor(userRepository.getReferenceById(adminId))
                .action(PartnerApplicationAction.APPROVED)
                .statusBefore(before)
                .statusAfter(PartnerApplicationStatus.APPROVED)
                .reason(saved.getReviewNote())
                .build());

        // 5. Gửi email thông báo phê duyệt (có activation token để thiết lập mật khẩu).
        String activationLink = createActivationLink(user, saved.getId());
        try {
            emailService.sendApprovalEmail(
                    user.getEmail(),
                    application.getRepresentativeName(),
                    application.getBusinessName(),
                    activationLink,
                    emailService.getWebLoginUrl());
        } catch (Exception ex) {
            log.error("Không gửi được email duyệt cho {}: {}", user.getEmail(), ex.getMessage());
        }

        log.info("[PartnerApplication] Admin {} đã duyệt đơn id={} ({}), cấp tài khoản CONTENT_PROVIDER user={}",
                adminId, saved.getId(), saved.getEmail(), user.getId());

        return new PartnerApplicationDecisionResponse(
                PartnerApplicationResponse.fromEntity(saved, loadHistory(saved.getId())),
                user.getId(),
                existingAccount,
                existingAccount
                        ? "Hồ sơ đã được phê duyệt. Tài khoản đối tác đã được nâng cấp quyền CONTENT_PROVIDER."
                        : "Hồ sơ đã được phê duyệt. Tài khoản đối tác đã được tạo và cấp quyền CONTENT_PROVIDER."
        );
    }

    /**
     * Admin từ chối hồ sơ — bắt buộc nhập lý do.
     */
    @Transactional
    public PartnerApplicationDecisionResponse reject(Long applicationId, RejectPartnerApplicationRequest request,
                                                     Long adminId) {
        PartnerApplication application = findOrThrow(applicationId);

        if (application.getStatus() != PartnerApplicationStatus.PENDING) {
            throw new AppException(ErrorCode.PARTNER_APPLICATION_INVALID_STATUS,
                    "Chỉ từ chối được đơn đang ở trạng thái chờ duyệt");
        }
        if (request == null || request.reason() == null || request.reason().isBlank()) {
            throw new AppException(ErrorCode.PARTNER_APPLICATION_REJECTION_REASON_REQUIRED);
        }

        PartnerApplicationStatus before = application.getStatus();
        application.setStatus(PartnerApplicationStatus.REJECTED);
        application.setReviewer(userRepository.getReferenceById(adminId));
        application.setReviewedAt(Instant.now());
        application.setRejectionReason(request.reason().trim());
        PartnerApplication saved = applicationRepository.save(application);

        historyRepository.save(PartnerApplicationHistory.builder()
                .application(saved)
                .actor(userRepository.getReferenceById(adminId))
                .action(PartnerApplicationAction.REJECTED)
                .statusBefore(before)
                .statusAfter(PartnerApplicationStatus.REJECTED)
                .reason(saved.getRejectionReason())
                .build());

        try {
            emailService.sendRejectionEmail(
                    saved.getEmail(),
                    saved.getRepresentativeName(),
                    saved.getBusinessName(),
                    saved.getRejectionReason(),
                    supportContact);
        } catch (Exception ex) {
            log.error("Không gửi được email từ chối cho {}: {}", saved.getEmail(), ex.getMessage());
        }

        log.info("[PartnerApplication] Admin {} đã từ chối đơn id={} ({})",
                adminId, saved.getId(), saved.getEmail());

        return new PartnerApplicationDecisionResponse(
                PartnerApplicationResponse.fromEntity(saved, loadHistory(saved.getId())),
                null,
                false,
                "Hồ sơ đã bị từ chối. Lý do đã được gửi tới email " + saved.getEmail());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ĐỌC
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public PartnerApplicationResponse getById(Long applicationId, Long callerUserId, boolean isAdmin) {
        PartnerApplication application = findOrThrow(applicationId);
        if (!isAdmin) {
            // Người đăng ký chỉ xem được đơn của chính mình.
            Long applicantId = application.getApplicant() == null ? null : application.getApplicant().getId();
            boolean ownsByEmail = callerUserId != null
                    && userRepository.findById(callerUserId)
                    .map(u -> u.getEmail().equalsIgnoreCase(application.getEmail()))
                    .orElse(false);
            if (applicantId == null || !applicantId.equals(callerUserId)) {
                if (!ownsByEmail) {
                    throw new AppException(ErrorCode.UNAUTHORIZED, "Bạn không có quyền xem đơn đăng ký này");
                }
            }
        }
        return PartnerApplicationResponse.fromEntity(application, loadHistory(applicationId));
    }

    /** Đơn mới nhất của người đăng ký (để tiếp tục nháp / theo dõi trạng thái). */
    @Transactional(readOnly = true)
    public Optional<PartnerApplicationResponse> getMyApplication(Long applicantUserId) {
        return applicationRepository.findFirstByApplicant_IdOrderByCreatedAtDesc(applicantUserId)
                .map(a -> PartnerApplicationResponse.fromEntity(a, loadHistory(a.getId())));
    }

    /**
     * Danh sách đơn — hàng đợi của Admin.
     *
     * <p>{@code status == null} ⇒ trả về <b>tất cả</b> các trạng thái (tab "Tất cả").
     * Trạng thái {@code DRAFT} vẫn được lưu và hiển thị trong lịch sử kiểm duyệt nhưng
     * không tách riêng thành tab trên màn hình làm việc.
     */
    @Transactional(readOnly = true)
    public Page<PartnerApplicationResponse> getQueue(PartnerApplicationStatus status, Pageable pageable) {
        Page<PartnerApplication> page = (status != null)
                ? applicationRepository.findByStatus(status, pageable)
                : applicationRepository.findByStatusNot(PartnerApplicationStatus.DRAFT, pageable);
        return page.map(a -> PartnerApplicationResponse.fromEntity(a, List.of()));
    }

    /** Thống kê nhanh số lượng đơn theo trạng thái — cho Admin Dashboard. */
    @Transactional(readOnly = true)
    public Map<String, Long> getStats() {
        Map<String, Long> stats = new LinkedHashMap<>();
        for (PartnerApplicationStatus s : PartnerApplicationStatus.values()) {
            stats.put(s.name(), applicationRepository.countByStatus(s));
        }
        return stats;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  THIẾT LẬP MẬT KHẨU QUA ACTIVATION TOKEN
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Đối tác thiết lập mật khẩu bằng activation token được nhận qua email.
     */
    @Transactional
    public void activate(String token, String newPassword, String confirmPassword) {
        if (newPassword == null || !newPassword.equals(confirmPassword)) {
            throw new AppException(ErrorCode.PASSWORD_NOT_MATCH);
        }
        if (newPassword.length() < 8) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Mật khẩu phải có ít nhất 8 ký tự");
        }

        PartnerActivationToken activationToken = activationTokenRepository.findByTokenAndUsedFalse(token)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_TOKEN,
                        "Link thiết lập mật khẩu không hợp lệ hoặc đã được sử dụng"));
        if (activationToken.isExpired()) {
            throw new AppException(ErrorCode.INVALID_TOKEN, "Link thiết lập mật khẩu đã hết hạn");
        }

        User user = activationToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setActive(true);
        userRepository.save(user);

        activationToken.setUsed(true);
        activationTokenRepository.save(activationToken);

        log.info("[PartnerApplication] Đối tác user={} đã thiết lập mật khẩu qua activation token", user.getId());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Tìm đơn đang chỉnh sửa được (DRAFT / REJECTED).
     *
     * <p>Với người đăng ký đã có tài khoản ⇒ tra cứu theo {@code applicantUserId}.
     * Với người chưa có tài khoản ⇒ tra cứu theo email, nhưng CHỈ được chỉnh đơn
     * chưa gắn với user nào (đơn ẩn danh của chính họ). Nhờ vậy không ai có thể sửa
     * đơn của người khác chỉ bằng cách biết email.
     *
     * <p>Trường hợp ẩn danh bắt buộc phải có token xác minh email hợp lệ — nếu không,
     * ai cũng có thể ghi đè nháp của người khác chỉ bằng cách biết email.
     *
     * <p>Nếu chưa có ⇒ tạo mới ở trạng thái DRAFT.
     */
    private PartnerApplication resolveEditableApplication(String email, Long applicantUserId,
                                                           String verificationToken) {
        String normalized = email.toLowerCase().trim();

        Optional<PartnerApplication> existing;
        if (applicantUserId != null) {
            existing = applicationRepository.findFirstByApplicant_IdOrderByCreatedAtDesc(applicantUserId);
        } else {
            if (!isEmailVerified(normalized, verificationToken)) {
                throw new AppException(ErrorCode.PARTNER_APPLICATION_EMAIL_NOT_VERIFIED,
                        "Email chưa được xác minh — vui lòng xác thực OTP trước khi tiếp tục");
            }
            existing = applicationRepository.findByEmailIgnoreCase(normalized)
                    .filter(a -> a.getApplicant() == null);
        }

        if (existing.isPresent()) {
            PartnerApplication application = existing.get();
            if (!application.getStatus().isEditable()) {
                throw new AppException(ErrorCode.PARTNER_APPLICATION_INVALID_STATUS,
                        "Đơn đăng ký hiện đang ở trạng thái "
                                + application.getStatus() + " — không thể chỉnh sửa");
            }
            return application;
        }

        return PartnerApplication.builder()
                .email(normalized)
                .status(PartnerApplicationStatus.DRAFT)
                .applicant(applicantUserId != null ? userRepository.getReferenceById(applicantUserId) : null)
                .build();
    }

    private PartnerApplication findOrThrow(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new AppException(ErrorCode.PARTNER_APPLICATION_NOT_FOUND));
    }

    private List<PartnerApplicationHistory> loadHistory(Long applicationId) {
        return historyRepository.findByApplication_IdOrderByCreatedAtDesc(applicationId);
    }

    /**
     * Sinh token xác nhận "email đã verify" — trả về cho client dùng kèm lệnh lưu nháp / gửi đơn.
     */
    private String createVerificationToken(String email) {
        String token = UUID.randomUUID().toString().replace("-", "");
        verificationTokenRepository.save(PartnerVerificationToken.builder()
                .token(token)
                .email(email)
                .used(false)
                .expiryDate(Instant.now().plus(VERIFICATION_TOKEN_EXPIRY_HOURS, ChronoUnit.HOURS))
                .build());
        return token;
    }

    /**
     * Kiểm tra token xác nhận "email đã verify" có hợp lệ với email đang khai không.
     *
     * <p>Đây là chốt chặn chống giả mạo: client không thể tự khai {@code emailVerified = true}
     * mà không có token do server cấp sau khi verify OTP thành công.
     */
    private boolean isEmailVerified(String email, String verificationToken) {
        if (verificationToken == null || verificationToken.isBlank()) {
            return false;
        }
        PartnerVerificationToken token = verificationTokenRepository
                .findByTokenAndUsedFalse(verificationToken)
                .orElse(null);
        return token != null
                && !token.isExpired()
                && token.getEmail().equalsIgnoreCase(email);
    }

    private String createActivationLink(User user, Long applicationId) {
        String token = UUID.randomUUID().toString().replace("-", "");
        activationTokenRepository.save(PartnerActivationToken.builder()
                .token(token)
                .user(user)
                .applicationId(applicationId)
                .used(false)
                .expiryDate(Instant.now().plus(ACTIVATION_TOKEN_EXPIRY_HOURS, ChronoUnit.HOURS))
                .build());

        String base = emailService.getActivationUrl();
        return base + (base.contains("?") ? "&" : "?") + "token=" + token;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
