package com.journeygo.common.i18n;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.Locale;

/**
 * Thông điệp đa ngôn ngữ theo header {@code Accept-Language} của request hiện tại.
 *
 * <p>Ngôn ngữ hỗ trợ: vi (mặc định), en, ja. Không có header hoặc header chỉ chứa ngôn ngữ
 * không hỗ trợ ⇒ tiếng Việt.
 *
 * <p>⚠️ Không dùng {@code LocaleContextHolder}/{@code request.getLocale()}: khi client không gửi
 * Accept-Language, servlet trả về locale mặc định của JVM (trên Docker thường là en_US) ⇒ client cũ
 * (chưa gửi header) sẽ đột nhiên nhận tiếng Anh. Ở đây tự đọc header để mặc định luôn là tiếng Việt.
 *
 * <p>Dùng được cả ngoài DispatcherServlet (VD {@code AuthenticationEntryPoint} trong filter chain)
 * bằng {@link #get(HttpServletRequest, String, Object...)}.
 */
@Component
public class Messages {

    public static final Locale VIETNAMESE = Locale.forLanguageTag("vi");
    private static final List<Locale> SUPPORTED = List.of(VIETNAMESE, Locale.ENGLISH, Locale.JAPANESE);

    private static MessageSource source;

    public Messages(MessageSource messageSource) {
        Messages.source = messageSource;
    }

    /** Ngôn ngữ của request hiện tại (vi nếu không có request / header). */
    public static Locale currentLocale() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            return localeOf(attrs.getRequest());
        }
        return VIETNAMESE;
    }

    /** Ngôn ngữ được chọn từ header Accept-Language của [request]. */
    public static Locale localeOf(HttpServletRequest request) {
        String header = request == null ? null : request.getHeader("Accept-Language");
        if (header == null || header.isBlank()) return VIETNAMESE;
        try {
            Locale match = Locale.lookup(Locale.LanguageRange.parse(header), SUPPORTED);
            return match != null ? match : VIETNAMESE;
        } catch (IllegalArgumentException e) {
            return VIETNAMESE; // header sai cú pháp
        }
    }

    public static boolean isVietnamese(Locale locale) {
        return VIETNAMESE.getLanguage().equals(locale.getLanguage());
    }

    /** Thông điệp theo khoá cho request hiện tại; không có khoá ⇒ trả lại chính khoá. */
    public static String get(String key, Object... args) {
        return resolve(currentLocale(), key, key, args);
    }

    /** Như {@link #get(String, Object...)} nhưng dùng [fallback] khi không có khoá. */
    public static String getOrDefault(String key, String fallback, Object... args) {
        return resolve(currentLocale(), key, fallback, args);
    }

    public static String get(HttpServletRequest request, String key, Object... args) {
        return resolve(localeOf(request), key, key, args);
    }

    private static String resolve(Locale locale, String key, String fallback, Object... args) {
        if (source == null) return fallback; // chưa khởi tạo Spring (VD unit test thuần)
        try {
            return source.getMessage(key, args.length == 0 ? null : args, locale);
        } catch (NoSuchMessageException e) {
            return fallback;
        }
    }
}
