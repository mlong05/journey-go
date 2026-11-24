package com.journeygo.config;

import com.journeygo.modules.aiguide.config.AiStartupLogger;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Hợp đồng log cảnh báo AI lúc khởi động.
 *
 * <p>Mục đích: phát hiện sớm (lúc deploy) việc thiếu {@code GEMINI_API_KEY} —
 * thay vì để người dùng mở chat mới thấy lỗi "Chưa cấu hình GEMINI_API_KEY".
 */
class AiStartupLoggerTest {

    private ListAppender<ILoggingEvent> attach() {
        Logger logger = (Logger) LoggerFactory.getLogger(AiStartupLogger.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        return appender;
    }

    @Test
    @DisplayName("Thiếu API key ⇒ log CẢNH BÁO nêu rõ cách khắc phục")
    void missingApiKey_logsWarningWithGuidance() {
        ListAppender<ILoggingEvent> appender = attach();

        GeminiAiProperties props = new GeminiAiProperties();
        props.setApiKey("");

        new AiStartupLogger(props).logConfiguration();

        List<ILoggingEvent> events = appender.list;
        assertTrue(events.stream().anyMatch(e -> e.getLevel() == Level.WARN
                        && e.getFormattedMessage().contains("GEMINI_API_KEY")
                        && e.getFormattedMessage().contains("aistudio.google.com")),
                "Phải log WARN nêu rõ GEMINI_API_KEY và link lấy key");

        appender.stop();
    }

    @Test
    @DisplayName("Có API key ⇒ log INFO, KHÔNG in giá trị key ra log")
    void validApiKey_logsInfoWithoutLeakingKey() {
        ListAppender<ILoggingEvent> appender = attach();

        GeminiAiProperties props = new GeminiAiProperties();
        props.setApiKey("super-secret-key-abc123");

        new AiStartupLogger(props).logConfiguration();

        List<ILoggingEvent> events = appender.list;
        assertTrue(events.stream().anyMatch(e -> e.getLevel() == Level.INFO
                        && e.getFormattedMessage().contains("[AI]")),
                "Phải log INFO tổng quan cấu hình AI");
        assertFalse(events.stream().anyMatch(e -> e.getFormattedMessage().contains("super-secret-key-abc123")),
                "TUYỆT ĐỐI KHÔNG in giá trị API key ra log");

        appender.stop();
    }

    @Test
    @DisplayName("API key = mock ⇒ log cảnh báo chế độ giả lập")
    void mockApiKey_logsMockWarning() {
        ListAppender<ILoggingEvent> appender = attach();

        GeminiAiProperties props = new GeminiAiProperties();
        props.setApiKey("mock");

        new AiStartupLogger(props).logConfiguration();

        assertTrue(appender.list.stream().anyMatch(e -> e.getLevel() == Level.WARN
                        && e.getFormattedMessage().contains("MOCK")),
                "Phải cảnh báo khi key ở chế độ mock");

        appender.stop();
    }
}
