package com.journeygo.modules.tour.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TourStopExperienceQrTest {

    @Test
    @DisplayName("Mã QR mới có dạng JGE- + 16 ký tự hex in hoa và không trùng nhau")
    void newTokenFormat() {
        String a = TourStopExperience.newQrToken();
        String b = TourStopExperience.newQrToken();
        assertTrue(TourStopExperience.QR_TOKEN_PATTERN.matcher(a).matches(), a);
        assertNotEquals(a, b);
    }

    @Test
    @DisplayName("Giữ mã QR cũ hợp lệ (QR đã in vẫn dùng được); mã rỗng hoặc sai định dạng thì sinh mã mới")
    void keepValidTokenOtherwiseNew() {
        assertEquals("JGE-0123456789ABCDEF", TourStopExperience.keepOrNewQrToken("JGE-0123456789ABCDEF"));
        assertTrue(TourStopExperience.QR_TOKEN_PATTERN.matcher(TourStopExperience.keepOrNewQrToken(null)).matches());
        String replaced = TourStopExperience.keepOrNewQrToken("JGD-0123456789ABCDEF");
        assertNotEquals("JGD-0123456789ABCDEF", replaced);
        assertTrue(TourStopExperience.QR_TOKEN_PATTERN.matcher(replaced).matches());
    }
}
