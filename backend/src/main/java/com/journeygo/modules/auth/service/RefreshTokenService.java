package com.journeygo.modules.auth.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.auth.entity.RefreshToken;
import com.journeygo.modules.auth.repository.RefreshTokenRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.security.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class RefreshTokenService {

    private static final String REFRESH_TOKEN_PREFIX = "auth:refresh_token:";
    private static final String USER_TOKENS_PREFIX = "auth:user_refresh_tokens:";

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider tokenProvider;
    private final StringRedisTemplate stringRedisTemplate;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository,
                               JwtTokenProvider tokenProvider,
                               StringRedisTemplate stringRedisTemplate) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.tokenProvider = tokenProvider;
        this.stringRedisTemplate = stringRedisTemplate;
    }

    @Transactional
    public RefreshToken createRefreshToken(User user) {
        String tokenStr = UUID.randomUUID().toString().replace("-", "") + System.currentTimeMillis();
        long expirationMs = tokenProvider.getRefreshTokenExpirationMs();
        Instant expiryDate = Instant.now().plusMillis(expirationMs);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(tokenStr)
                .expiryDate(expiryDate)
                .revoked(false)
                .build();

        RefreshToken saved = refreshTokenRepository.save(refreshToken);

        // Lưu vào Redis với TTL tự động hủy
        try {
            stringRedisTemplate.opsForValue().set(
                    REFRESH_TOKEN_PREFIX + tokenStr,
                    user.getId().toString(),
                    Duration.ofMillis(expirationMs)
            );
            stringRedisTemplate.opsForSet().add(USER_TOKENS_PREFIX + user.getId(), tokenStr);
            stringRedisTemplate.expire(USER_TOKENS_PREFIX + user.getId(), Duration.ofMillis(expirationMs));
            log.info("Đã lưu Refresh Token vào Redis cho user id={}", user.getId());
        } catch (Exception ex) {
            log.warn("Không thể lưu Refresh Token vào Redis, fallback về PostgreSQL: {}", ex.getMessage());
        }

        return saved;
    }

    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.isRevoked() || token.getExpiryDate().isBefore(Instant.now())) {
            throw new AppException(ErrorCode.REFRESH_TOKEN_EXPIRED);
        }
        return token;
    }

    @Transactional
    public void revokeToken(String token) {
        try {
            stringRedisTemplate.delete(REFRESH_TOKEN_PREFIX + token);
        } catch (Exception ex) {
            log.warn("Lỗi xóa Refresh Token trên Redis: {}", ex.getMessage());
        }
        refreshTokenRepository.revokeByToken(token);
    }

    @Transactional
    public void revokeAllUserTokens(User user) {
        try {
            Set<String> tokens = stringRedisTemplate.opsForSet().members(USER_TOKENS_PREFIX + user.getId());
            if (tokens != null && !tokens.isEmpty()) {
                tokens.forEach(t -> stringRedisTemplate.delete(REFRESH_TOKEN_PREFIX + t));
            }
            stringRedisTemplate.delete(USER_TOKENS_PREFIX + user.getId());
        } catch (Exception ex) {
            log.warn("Lỗi xóa tất cả Refresh Token của user trên Redis: {}", ex.getMessage());
        }
        refreshTokenRepository.revokeAllUserTokens(user);
    }

    public RefreshToken findByToken(String token) {
        return refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new AppException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));
    }
}
