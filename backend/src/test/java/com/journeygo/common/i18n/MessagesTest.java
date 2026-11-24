package com.journeygo.common.i18n;

import com.journeygo.common.exception.ErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

class MessagesTest {

    private ResourceBundleMessageSource source;

    @BeforeEach
    void setUp() {
        source = new ResourceBundleMessageSource();
        source.setBasename("i18n/messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        new Messages(source);
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    private void withAcceptLanguage(String header) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        if (header != null) request.addHeader("Accept-Language", header);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @Test
    void noHeader_defaultsToVietnamese() {
        withAcceptLanguage(null);
        assertThat(ErrorCode.TOUR_NOT_FOUND.getLocalizedMessage()).isEqualTo("Tour không tồn tại");
    }

    @Test
    void english_and_japanese_followHeader() {
        withAcceptLanguage("en-US,en;q=0.9");
        assertThat(ErrorCode.TOUR_NOT_FOUND.getLocalizedMessage()).isEqualTo("Tour does not exist");

        withAcceptLanguage("ja");
        assertThat(ErrorCode.TOUR_NOT_FOUND.getLocalizedMessage()).isEqualTo("ツアーが存在しません");
    }

    @Test
    void unsupportedLanguage_fallsBackToVietnamese() {
        withAcceptLanguage("fr-FR,fr;q=0.9");
        assertThat(Messages.currentLocale()).isEqualTo(Messages.VIETNAMESE);

        withAcceptLanguage("fr;q=1, ja;q=0.5");
        assertThat(Messages.currentLocale().getLanguage()).isEqualTo("ja");
    }

    @Test
    void malformedHeader_fallsBackToVietnamese() {
        withAcceptLanguage(";;;q=abc");
        assertThat(Messages.currentLocale()).isEqualTo(Messages.VIETNAMESE);
    }

    @Test
    void argumentsAreFormatted() {
        withAcceptLanguage("en");
        assertThat(Messages.get("common.missingParam", "page")).isEqualTo("Missing required parameter: page");
        assertThat(Messages.get("common.paramTypeMismatch", "id")).isEqualTo("Parameter 'id' has an invalid format");
    }

    /** Thêm mã lỗi mới mà quên khai báo bản dịch ⇒ test này báo đỏ. */
    @Test
    void everyErrorCode_hasMessageInAllLanguages() {
        for (Locale locale : new Locale[]{Messages.VIETNAMESE, Locale.ENGLISH, Locale.JAPANESE}) {
            for (ErrorCode code : ErrorCode.values()) {
                String key = "error." + code.name();
                String msg = source.getMessage(key, null, null, locale);
                assertThat(msg).as("%s (%s)", key, locale).isNotBlank();
            }
        }
    }
}
