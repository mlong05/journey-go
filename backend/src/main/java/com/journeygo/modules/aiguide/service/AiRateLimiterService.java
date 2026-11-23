package com.journeygo.modules.aiguide.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate Limiter chống spam API hỏi đáp AI Virtual Guide theo từng người dùng.
 * Ưu tiên dùng Redis (fixed-window 60 giây), tự động fallback sang bộ nhớ cục bộ nếu Redis không khả dụng.
 */
@Slf4j
@Service
public class AiRateLimiterService {

    private static final String KEY_PREFIX = "ai:chat:rate:";
    private static final long WINDOW_MS = 60_000L;

    private final GeminiAiProperties properties;
    private final StringRedisTemplate stringRedisTemplate;
    private final ConcurrentHashMap<Long, WindowCounter> localCounters = new ConcurrentHashMap<>();

    public AiRateLimiterService(GeminiAiProperties properties,
                                @Autowired(required = false) StringRedisTemplate stringRedisTemplate) {
        this.properties = properties;
        this.stringRedisTemplate = stringRedisTemplate;
    }

    /**
     * Kiểm tra và tiêu thụ 1 lượt hỏi AI của {@code userId} trong cửa sổ 1 phút.
     * Ném {@link ErrorCode#AI_RATE_LIMITED} nếu vượt ngưỡng.
     */
    public void checkAndConsume(Long userId) {
        if (userId == null) {
            return;
        }
        int limit = properties.getRateLimitPerMinute();
        if (limit <= 0) {
            return;
        }

        if (stringRedisTemplate != null) {
            try {
                String key = KEY_PREFIX + userId;
                Long count = stringRedisTemplate.opsForValue().increment(key);
                if (count != null && count == 1L) {
                    stringRedisTemplate.expire(key, Duration.ofSeconds(60));
                }
                if (count != null && count > limit) {
                    throw new AppException(ErrorCode.AI_RATE_LIMITED);
                }
                return;
            } catch (AppException ex) {
                throw ex;
            } catch (Exception ex) {
                log.debug("Redis rate limit fallback sang bộ nhớ cục bộ: {}", ex.getMessage());
            }
        }

        checkLocalWindow(userId, limit);
    }

    private void checkLocalWindow(Long userId, int limit) {
        long now = System.currentTimeMillis();
        WindowCounter counter = localCounters.compute(userId, (id, existing) -> {
            if (existing == null || now - existing.windowStartMs >= WINDOW_MS) {
                return new WindowCounter(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (counter.count.get() > limit) {
            throw new AppException(ErrorCode.AI_RATE_LIMITED);
        }
    }

    private record WindowCounter(long windowStartMs, AtomicInteger count) {}
}
