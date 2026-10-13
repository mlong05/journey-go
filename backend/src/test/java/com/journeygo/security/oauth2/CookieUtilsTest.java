package com.journeygo.security.oauth2;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import jakarta.servlet.http.Cookie;

import static org.junit.jupiter.api.Assertions.*;

class CookieUtilsTest {

    @Test
    void testSerializationAndDeserialization() {
        OAuth2AuthorizationRequest request = OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .clientId("test-client-id")
                .redirectUri("http://localhost:8088/login/oauth2/code/google")
                .state("sample-state")
                .build();

        String serialized = CookieUtils.serialize(request);
        assertNotNull(serialized);
        assertFalse(serialized.isBlank());

        Cookie cookie = new Cookie("test_cookie", serialized);
        OAuth2AuthorizationRequest deserialized = CookieUtils.deserialize(cookie, OAuth2AuthorizationRequest.class);

        assertNotNull(deserialized);
        assertEquals("test-client-id", deserialized.getClientId());
        assertEquals("sample-state", deserialized.getState());
        assertEquals("http://localhost:8088/login/oauth2/code/google", deserialized.getRedirectUri());
    }
}
