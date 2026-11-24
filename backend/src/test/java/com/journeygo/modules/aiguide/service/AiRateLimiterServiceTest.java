package com.journeygo.modules.aiguide.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Hợp đồng rate limit cho AI Virtual Guide.
 *
 * <p>Mục đích: mỗi câu hỏi đều tốn tiền (Gemini) ⇒ cần chặn spam để không đốt
 * quota và không bị Google trả 429 làm hỏng chức năng cho tất cả du khách.
 *
 * <p>Phủ 2 nhánh: dùng Redis (bộ nhớ dùng chung, đúng khi scale nhiều instance)
 * và fallback bộ nhớ cục bộ (khi Redis chết ⇒ AI vẫn chạy, chỉ mất chống-spam
 * trong phạm vi 1 instance).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AiRateLimiterServiceTest {

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private GeminiAiProperties properties;
    private AiRateLimiterService service;

    @BeforeEach
    void setUp() {
        properties = new GeminiAiProperties();
        service = new AiRateLimiterService(properties, stringRedisTemplate);
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    @DisplayName("Chưa vượt giới hạn ⇒ cho qua")
    void withinLimit_passes() {
        properties.setRateLimitPerMinute(20);
        when(valueOperations.increment(anyString())).thenReturn(5L);

        assertDoesNotThrow(() -> service.checkAndConsume(1L));
    }

    @Test
    @DisplayName("Vượt giới hạn ⇒ ném 429 (AI_RATE_LIMITED)")
    void exceedsLimit_throws() {
        properties.setRateLimitPerMinute(20);
        when(valueOperations.increment(anyString())).thenReturn(21L);

        AppException ex = assertThrows(AppException.class, () -> service.checkAndConsume(1L));
        assertEquals(ErrorCode.AI_RATE_LIMITED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Lần đầu ⇒ đặt hạn 60 giây cho cửa sổ")
    void firstRequest_setsExpiry() {
        properties.setRateLimitPerMinute(20);
        when(valueOperations.increment(anyString())).thenReturn(1L);

        service.checkAndConsume(1L);

        verify(stringRedisTemplate).expire(anyString(), eq(Duration.ofSeconds(60)));
    }

    @Test
    @DisplayName("Rate limit = 0 ⇒ tắt, không gọi Redis")
    void disabled_skipsRedis() {
        properties.setRateLimitPerMinute(0);

        service.checkAndConsume(1L);

        verify(valueOperations, never()).increment(anyString());
    }

    @Test
    @DisplayName("userId null ⇒ bỏ qua (không xác định được chủ sở hữu)")
    void nullUser_skips() {
        properties.setRateLimitPerMinute(20);

        assertDoesNotThrow(() -> service.checkAndConsume(null));
        verify(valueOperations, never()).increment(anyString());
    }

    @Test
    @DisplayName("Redis lỗi ⇒ fallback bộ nhớ cục bộ, KHÔNG chặn người dùng")
    void redisFailure_fallsBackToLocalMemory() {
        properties.setRateLimitPerMinute(20);
        when(valueOperations.increment(anyString())).thenThrow(new RuntimeException("Redis down"));

        // Lần 1: Redis chết ⇒ fallback local, vẫn cho qua (còn dưới ngưỡng).
        assertDoesNotThrow(() -> service.checkAndConsume(1L),
                "Sự cố Redis không được làm hỏng chức năng chat AI");

        // Các lần sau vẫn bị đếm trong bộ nhớ cục bộ ⇒ vẫn chống spam.
        for (int i = 1; i < 20; i++) {
            service.checkAndConsume(1L);
        }
        assertThrows(AppException.class, () -> service.checkAndConsume(1L),
                "Bộ nhớ cục bộ phải vẫn chống spam khi Redis không khả dụng");
    }

    @Test
    @DisplayName("Không có Redis ⇒ dùng bộ nhớ cục bộ ngay từ đầu")
    void withoutRedis_usesLocalMemory() {
        properties.setRateLimitPerMinute(3);
        AiRateLimiterService localOnly = new AiRateLimiterService(properties, null);

        assertDoesNotThrow(() -> localOnly.checkAndConsume(99L));
        assertDoesNotThrow(() -> localOnly.checkAndConsume(99L));
        assertDoesNotThrow(() -> localOnly.checkAndConsume(99L));
        assertThrows(AppException.class, () -> localOnly.checkAndConsume(99L));
    }
}
