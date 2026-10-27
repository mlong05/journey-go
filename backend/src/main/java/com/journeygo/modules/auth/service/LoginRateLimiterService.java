package com.journeygo.modules.auth.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoginRateLimiterService {

    private static final String ATTEMPTS_PREFIX = "auth:login:attempts:";
    private static final String BLOCKED_PREFIX = "auth:login:blocked:";
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(5);

    private final StringRedisTemplate stringRedisTemplate;

    public void checkLoginAllowed(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        try {
            String key = BLOCKED_PREFIX + email.toLowerCase().trim();
            if (Boolean.TRUE.equals(stringRedisTemplate.hasKey(key))) {
                throw new AppException(ErrorCode.LOGIN_RATE_LIMITED,
                        "Bạn đã nhập sai mật khẩu quá 5 lần liên tiếp. Tài khoản tạm khóa đăng nhập trong 5 phút để bảo vệ an toàn.");
            }
        } catch (AppException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Lỗi kiểm tra Rate Limit trên Redis: {}", ex.getMessage());
        }
    }

    public void recordFailedAttempt(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        try {
            String normalizedEmail = email.toLowerCase().trim();
            String attemptsKey = ATTEMPTS_PREFIX + normalizedEmail;
            Long count = stringRedisTemplate.opsForValue().increment(attemptsKey);

            if (count != null && count == 1) {
                stringRedisTemplate.expire(attemptsKey, LOCK_DURATION);
            }

            if (count != null && count >= MAX_FAILED_ATTEMPTS) {
                stringRedisTemplate.opsForValue().set(BLOCKED_PREFIX + normalizedEmail, "blocked", LOCK_DURATION);
                stringRedisTemplate.delete(attemptsKey);
                log.warn("Email {} đã bị tạm khóa 5 phút do nhập sai mật khẩu quá 5 lần", normalizedEmail);
            }
        } catch (Exception ex) {
            log.warn("Lỗi ghi nhận đăng nhập thất bại trên Redis: {}", ex.getMessage());
        }
    }

    public void resetAttempts(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        try {
            String normalizedEmail = email.toLowerCase().trim();
            stringRedisTemplate.delete(ATTEMPTS_PREFIX + normalizedEmail);
            stringRedisTemplate.delete(BLOCKED_PREFIX + normalizedEmail);
        } catch (Exception ex) {
            log.warn("Lỗi reset số lần đăng nhập sai trên Redis: {}", ex.getMessage());
        }
    }
}
