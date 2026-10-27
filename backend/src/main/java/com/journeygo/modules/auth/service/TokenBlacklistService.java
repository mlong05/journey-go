package com.journeygo.modules.auth.service;

import com.journeygo.modules.auth.entity.InvalidatedToken;
import com.journeygo.modules.auth.repository.InvalidatedTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private static final String BLACKLIST_PREFIX = "auth:blacklist:";
    private final InvalidatedTokenRepository invalidatedTokenRepository;
    private final StringRedisTemplate stringRedisTemplate;

    @Transactional
    public void blacklistToken(String token, Instant expiryTime) {
        if (token == null || token.isBlank()) {
            return;
        }

        if (expiryTime == null || expiryTime.isBefore(Instant.now())) {
            return;
        }

        long ttlMillis = Math.max(0, expiryTime.toEpochMilli() - Instant.now().toEpochMilli());

        // 1. Lưu vào Redis với TTL tự động hủy
        try {
            if (ttlMillis > 0) {
                stringRedisTemplate.opsForValue().set(BLACKLIST_PREFIX + token, "revoked", Duration.ofMillis(ttlMillis));
                log.info("Access Token đã được đưa vào Redis Blacklist với TTL: {} ms", ttlMillis);
            }
        } catch (Exception ex) {
            log.warn("Lỗi lưu token vào Redis blacklist, ghi log fallback về PostgreSQL: {}", ex.getMessage());
        }

        // 2. Lưu vào DB PostgreSQL để persist dữ liệu
        InvalidatedToken invalidatedToken = InvalidatedToken.builder()
                .id(token)
                .expiryTime(expiryTime)
                .build();
        invalidatedTokenRepository.save(invalidatedToken);
    }

    @Transactional(readOnly = true)
    public boolean isBlacklisted(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        // 1. Kiểm tra nhanh trên Redis O(1) in-memory
        try {
            Boolean hasKey = stringRedisTemplate.hasKey(BLACKLIST_PREFIX + token);
            if (Boolean.TRUE.equals(hasKey)) {
                return true;
            }
        } catch (Exception ex) {
            log.warn("Lỗi kiểm tra Redis blacklist, fallback về PostgreSQL: {}", ex.getMessage());
        }

        // 2. Fallback về PostgreSQL nếu Redis cache miss
        boolean inDb = invalidatedTokenRepository.existsById(token);
        if (inDb) {
            try {
                stringRedisTemplate.opsForValue().set(BLACKLIST_PREFIX + token, "revoked", Duration.ofMinutes(15));
            } catch (Exception ignored) {}
        }
        return inDb;
    }
}
