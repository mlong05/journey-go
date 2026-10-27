package com.journeygo.modules.auth.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoginRateLimiterServiceTest {

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private LoginRateLimiterService rateLimiterService;

    @Test
    @DisplayName("Email chưa bị khóa thì cho phép đăng nhập bình thường")
    void testCheckLoginAllowed_NotBlocked() {
        when(stringRedisTemplate.hasKey("auth:login:blocked:user@example.com")).thenReturn(false);

        assertDoesNotThrow(() -> rateLimiterService.checkLoginAllowed("user@example.com"));
    }

    @Test
    @DisplayName("Email đã bị khóa trên Redis thì ném ngoại lệ LOGIN_RATE_LIMITED")
    void testCheckLoginAllowed_Blocked_ThrowsException() {
        when(stringRedisTemplate.hasKey("auth:login:blocked:user@example.com")).thenReturn(true);

        AppException ex = assertThrows(AppException.class, () ->
                rateLimiterService.checkLoginAllowed("user@example.com")
        );

        assertEquals(ErrorCode.LOGIN_RATE_LIMITED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Ghi nhận đăng nhập sai lần đầu thiết lập expire cho counter")
    void testRecordFailedAttempt_FirstAttempt() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("auth:login:attempts:user@example.com")).thenReturn(1L);

        rateLimiterService.recordFailedAttempt("user@example.com");

        verify(stringRedisTemplate).expire("auth:login:attempts:user@example.com", Duration.ofMinutes(5));
    }

    @Test
    @DisplayName("Ghi nhận đăng nhập sai đạt 5 lần thì tạo khóa blocked và xóa counter")
    void testRecordFailedAttempt_FifthAttempt_LocksUser() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("auth:login:attempts:user@example.com")).thenReturn(5L);

        rateLimiterService.recordFailedAttempt("user@example.com");

        verify(valueOperations).set(eq("auth:login:blocked:user@example.com"), eq("blocked"), eq(Duration.ofMinutes(5)));
        verify(stringRedisTemplate).delete("auth:login:attempts:user@example.com");
    }

    @Test
    @DisplayName("Đăng nhập thành công xóa toàn bộ khóa counter và blocked")
    void testResetAttempts_Success() {
        rateLimiterService.resetAttempts("user@example.com");

        verify(stringRedisTemplate).delete("auth:login:attempts:user@example.com");
        verify(stringRedisTemplate).delete("auth:login:blocked:user@example.com");
    }
}
