package com.journeygo.modules.auth.service;

import com.journeygo.modules.auth.entity.InvalidatedToken;
import com.journeygo.modules.auth.repository.InvalidatedTokenRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TokenBlacklistServiceTest {

    @Mock
    private InvalidatedTokenRepository invalidatedTokenRepository;

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private TokenBlacklistService tokenBlacklistService;

    @Test
    @DisplayName("Đưa token vào blacklist thành công trên cả Redis và DB")
    void testBlacklistToken_Success() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        Instant expiryTime = Instant.now().plusSeconds(900); // 15 phút

        tokenBlacklistService.blacklistToken("jwt-sample-token", expiryTime);

        verify(valueOperations).set(eq("auth:blacklist:jwt-sample-token"), eq("revoked"), any(Duration.class));
        verify(invalidatedTokenRepository).save(any(InvalidatedToken.class));
    }

    @Test
    @DisplayName("Kiểm tra token bị blacklist: Tìm thấy trực tiếp trong Redis O(1)")
    void testIsBlacklisted_FoundInRedis() {
        when(stringRedisTemplate.hasKey("auth:blacklist:jwt-revoked-token")).thenReturn(true);

        boolean blacklisted = tokenBlacklistService.isBlacklisted("jwt-revoked-token");

        assertTrue(blacklisted);
        verify(invalidatedTokenRepository, never()).existsById(anyString());
    }

    @Test
    @DisplayName("Kiểm tra token bị blacklist: Redis miss nhưng DB có -> Trả về true và warm cache vào Redis")
    void testIsBlacklisted_RedisMiss_FoundInDatabase() {
        when(stringRedisTemplate.hasKey("auth:blacklist:jwt-db-token")).thenReturn(false);
        when(invalidatedTokenRepository.existsById("jwt-db-token")).thenReturn(true);
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);

        boolean blacklisted = tokenBlacklistService.isBlacklisted("jwt-db-token");

        assertTrue(blacklisted);
        verify(valueOperations).set(eq("auth:blacklist:jwt-db-token"), eq("revoked"), eq(Duration.ofMinutes(15)));
    }

    @Test
    @DisplayName("Kiểm tra token hợp lệ: Cả Redis và DB đều không có -> Trả về false")
    void testIsBlacklisted_ValidToken() {
        when(stringRedisTemplate.hasKey("auth:blacklist:jwt-valid-token")).thenReturn(false);
        when(invalidatedTokenRepository.existsById("jwt-valid-token")).thenReturn(false);

        boolean blacklisted = tokenBlacklistService.isBlacklisted("jwt-valid-token");

        assertFalse(blacklisted);
    }
}
