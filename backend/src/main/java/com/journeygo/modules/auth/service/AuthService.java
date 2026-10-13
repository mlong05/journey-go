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

        Role assignedRole = request.role() != null ? request.role() : Role.USER;

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
            Role assignedRole = request.role() != null ? request.role() : Role.USER;
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
}
