package com.journeygo.modules.auth.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.auth.entity.RefreshToken;
import com.journeygo.modules.auth.repository.RefreshTokenRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private SetOperations<String, String> setOperations;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(10L)
                .email("tourist@journeygo.com")
                .fullName("Nguyen Van A")
                .build();
    }

    @Test
    @DisplayName("Tạo mới Refresh Token lưu vào cả DB và Redis với TTL")
    void testCreateRefreshToken_Success() {
        when(tokenProvider.getRefreshTokenExpirationMs()).thenReturn(604800000L); // 7 ngày
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(i -> i.getArgument(0));
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(stringRedisTemplate.opsForSet()).thenReturn(setOperations);

        RefreshToken result = refreshTokenService.createRefreshToken(sampleUser);

        assertNotNull(result);
        assertNotNull(result.getToken());
        assertEquals(sampleUser, result.getUser());
        verify(refreshTokenRepository).save(any(RefreshToken.class));
        verify(valueOperations).set(startsWith("auth:refresh_token:"), eq("10"), any(Duration.class));
        verify(setOperations).add(eq("auth:user_refresh_tokens:10"), anyString());
    }

    @Test
    @DisplayName("Thu hồi (revoke) 1 Refresh Token xóa khỏi Redis và cập nhật DB")
    void testRevokeToken_Success() {
        refreshTokenService.revokeToken("sample-refresh-token");

        verify(stringRedisTemplate).delete("auth:refresh_token:sample-refresh-token");
        verify(refreshTokenRepository).revokeByToken("sample-refresh-token");
    }

    @Test
    @DisplayName("Thu hồi toàn bộ Refresh Token của user xóa tập hợp trên Redis và cập nhật DB")
    void testRevokeAllUserTokens_Success() {
        when(stringRedisTemplate.opsForSet()).thenReturn(setOperations);
        when(setOperations.members("auth:user_refresh_tokens:10"))
                .thenReturn(Set.of("token-1", "token-2"));

        refreshTokenService.revokeAllUserTokens(sampleUser);

        verify(stringRedisTemplate).delete("auth:refresh_token:token-1");
        verify(stringRedisTemplate).delete("auth:refresh_token:token-2");
        verify(stringRedisTemplate).delete("auth:user_refresh_tokens:10");
        verify(refreshTokenRepository).revokeAllUserTokens(sampleUser);
    }

    @Test
    @DisplayName("Tìm kiếm Refresh Token không tồn tại ném REFRESH_TOKEN_NOT_FOUND")
    void testFindByToken_NotFound() {
        when(refreshTokenRepository.findByToken("invalid-token")).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () ->
                refreshTokenService.findByToken("invalid-token")
        );

        assertEquals(ErrorCode.REFRESH_TOKEN_NOT_FOUND, ex.getErrorCode());
    }
}
