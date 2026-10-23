package com.journeygo.modules.auth.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.auth.dto.*;
import com.journeygo.modules.auth.entity.RefreshToken;
import com.journeygo.modules.user.entity.AuthProvider;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import com.journeygo.security.JwtTokenProvider;
import com.journeygo.security.oauth2.GoogleTokenVerifierService;
import com.journeygo.security.oauth2.GoogleUserInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final TokenBlacklistService tokenBlacklistService;
    private final GoogleTokenVerifierService googleTokenVerifierService;
    private final com.journeygo.modules.auth.repository.PasswordResetOtpRepository passwordResetOtpRepository;
    private final EmailService emailService;

    @org.springframework.beans.factory.annotation.Value("${app.mail.otp-expiration-minutes:10}")
    private int otpExpirationMinutes;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (BadCredentialsException ex) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (!user.isActive()) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Tài khoản của bạn đã bị vô hiệu hóa");
        }

        String accessToken = tokenProvider.generateAccessToken(user.getEmail(), user.getId());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getAccessTokenExpirationMs())
                .user(UserResponse.fromEntity(user))
                .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        Role assignedRole = request.role() != null ? request.role() : Role.TOURIST;

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .phone(request.phone())
                .role(assignedRole)
                .authProvider(AuthProvider.LOCAL)
                .active(true)
                .build();

        user = userRepository.save(user);

        String accessToken = tokenProvider.generateAccessToken(user.getEmail(), user.getId());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getAccessTokenExpirationMs())
                .user(UserResponse.fromEntity(user))
                .build();
    }

    @Transactional
    public AuthResponse processGoogleAuth(GoogleAuthRequest request) {
        GoogleUserInfo googleUser = googleTokenVerifierService.verify(request.idToken());

        String email = googleUser.email().toLowerCase().trim();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            Role assignedRole = request.role() != null ? request.role() : Role.TOURIST;
            String fullName = (googleUser.name() != null && !googleUser.name().isBlank())
                    ? googleUser.name()
                    : email.split("@")[0];

            user = User.builder()
                    .email(email)
                    .fullName(fullName)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(assignedRole)
                    .authProvider(AuthProvider.GOOGLE)
                    .providerId(googleUser.sub())
                    .avatarUrl(googleUser.picture())
                    .active(true)
                    .build();

            user = userRepository.save(user);
            log.info("Tạo mới tài khoản thành công qua Google OAuth2: email={}, role={}", email, assignedRole);
        } else {
            if (!user.isActive()) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Tài khoản của bạn đã bị vô hiệu hóa");
            }

            boolean modified = false;
            if (user.getAvatarUrl() == null && googleUser.picture() != null) {
                user.setAvatarUrl(googleUser.picture());
                modified = true;
            }
            if (user.getProviderId() == null && googleUser.sub() != null) {
                user.setProviderId(googleUser.sub());
                modified = true;
            }
            if (modified) {
                user = userRepository.save(user);
            }
        }

        String accessToken = tokenProvider.generateAccessToken(user.getEmail(), user.getId());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getAccessTokenExpirationMs())
                .user(UserResponse.fromEntity(user))
                .build();
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        RefreshToken token = refreshTokenService.findByToken(request.refreshToken());
        refreshTokenService.verifyExpiration(token);

        User user = token.getUser();
        if (!user.isActive()) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Tài khoản đã bị vô hiệu hóa");
        }

        String newAccessToken = tokenProvider.generateAccessToken(user.getEmail(), user.getId());

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(token.getToken())
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getAccessTokenExpirationMs())
                .user(UserResponse.fromEntity(user))
                .build();
    }

    @Transactional
    public void logout(String accessToken, String refreshToken) {
        if (accessToken != null && !accessToken.isBlank()) {
            try {
                Date expiration = tokenProvider.getExpirationFromToken(accessToken);
                tokenBlacklistService.blacklistToken(accessToken, expiration.toInstant());
            } catch (Exception e) {
                log.warn("Không thể lấy hạn sử dụng token để blacklist: {}", e.getMessage());
            }
        }

        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenService.revokeToken(refreshToken);
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
            userRepository.findByEmail(authentication.getName())
                    .ifPresent(refreshTokenService::revokeAllUserTokens);
        }

        SecurityContextHolder.clearContext();
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.email().toLowerCase().trim();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED, "Không tìm thấy người dùng với email: " + email));

        if (!user.isActive()) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Tài khoản của bạn đã bị vô hiệu hóa");
        }

        // Xóa các mã OTP cũ chưa dùng của email này nếu có
        passwordResetOtpRepository.deleteByEmail(email);

        // Sinh mã OTP 6 chữ số ngẫu nhiên
        java.security.SecureRandom random = new java.security.SecureRandom();
        String otp = String.format("%06d", random.nextInt(1_000_000));

        com.journeygo.modules.auth.entity.PasswordResetOtp resetOtp = com.journeygo.modules.auth.entity.PasswordResetOtp.builder()
                .email(email)
                .otp(otp)
                .expiryDate(java.time.Instant.now().plus(otpExpirationMinutes, java.time.temporal.ChronoUnit.MINUTES))
                .used(false)
                .build();

        passwordResetOtpRepository.save(resetOtp);

        // Gửi email chứa OTP
        emailService.sendPasswordResetOtp(email, user.getFullName(), otp, otpExpirationMinutes);
    }

    @Transactional(readOnly = true)
    public boolean verifyOtp(VerifyOtpRequest request) {
        String email = request.email().toLowerCase().trim();
        String otp = request.otp().trim();

        com.journeygo.modules.auth.entity.PasswordResetOtp resetOtp = passwordResetOtpRepository
                .findTopByEmailAndOtpAndUsedFalseOrderByCreatedAtDesc(email, otp)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_OTP));

        if (resetOtp.isExpired()) {
            throw new AppException(ErrorCode.OTP_EXPIRED);
        }

        return true;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new AppException(ErrorCode.PASSWORD_NOT_MATCH);
        }

        String email = request.email().toLowerCase().trim();
        String otp = request.otp().trim();

        com.journeygo.modules.auth.entity.PasswordResetOtp resetOtp = passwordResetOtpRepository
                .findTopByEmailAndOtpAndUsedFalseOrderByCreatedAtDesc(email, otp)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_OTP));

        if (resetOtp.isExpired()) {
            throw new AppException(ErrorCode.OTP_EXPIRED);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (user.getPassword() != null && passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.SAME_OLD_PASSWORD);
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        resetOtp.setUsed(true);
        passwordResetOtpRepository.save(resetOtp);

        // Hủy toàn bộ refresh token cũ để buộc đăng nhập lại
        refreshTokenService.revokeAllUserTokens(user);
        log.info("Đặt lại mật khẩu thành công cho tài khoản email: {}", email);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new AppException(ErrorCode.PASSWORD_NOT_MATCH);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Nếu tài khoản có mật khẩu cũ (tài khoản LOCAL hoặc OAuth2 đã từng đặt password)
        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            if (request.currentPassword() == null || request.currentPassword().isBlank()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Vui lòng nhập mật khẩu hiện tại");
            }
            if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
                throw new AppException(ErrorCode.INVALID_CREDENTIALS, "Mật khẩu hiện tại không chính xác");
            }
            if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
                throw new AppException(ErrorCode.SAME_OLD_PASSWORD);
            }
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        refreshTokenService.revokeAllUserTokens(user);
        log.info("Người dùng id={} đổi mật khẩu thành công", userId);
    }
}
