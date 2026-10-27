package com.journeygo.security.oauth2;

import com.journeygo.modules.auth.entity.RefreshToken;
import com.journeygo.modules.auth.service.RefreshTokenService;
import com.journeygo.modules.user.entity.AuthProvider;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.RoleRepository;
import com.journeygo.modules.user.repository.UserRepository;
import com.journeygo.security.JwtTokenProvider;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuth2AuthenticationSuccessHandlerTest {

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private HttpCookieOAuth2AuthorizationRequestRepository httpCookieOAuth2AuthorizationRequestRepository;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private Authentication authentication;

    @Mock
    private OAuth2User oAuth2User;

    @InjectMocks
    private OAuth2AuthenticationSuccessHandler successHandler;

    private final String[] authorizedUris = {
            "http://localhost:3000/oauth2/redirect",
            "http://127.0.0.1:3000/oauth2/redirect",
            "journeygo://oauth2/redirect",
            "journeygo://auth/callback"
    };

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(successHandler, "defaultRedirectUri", "http://localhost:3000/oauth2/redirect");
        ReflectionTestUtils.setField(successHandler, "authorizedRedirectUris", authorizedUris);
    }

    @Test
    @DisplayName("Kiểm tra URI được phép: Web hợp lệ")
    void testIsAuthorizedRedirectUri_WebValid() {
        assertTrue(successHandler.isAuthorizedRedirectUri("http://localhost:3000/oauth2/redirect"));
        assertTrue(successHandler.isAuthorizedRedirectUri("http://127.0.0.1:3000/oauth2/redirect"));
    }

    @Test
    @DisplayName("Kiểm tra URI được phép: Mobile Deep Link hợp lệ")
    void testIsAuthorizedRedirectUri_MobileDeepLinkValid() {
        assertTrue(successHandler.isAuthorizedRedirectUri("journeygo://oauth2/redirect"));
        assertTrue(successHandler.isAuthorizedRedirectUri("journeygo://auth/callback"));
    }

    @Test
    @DisplayName("Kiểm tra URI không được phép: Tấn công Open Redirect")
    void testIsAuthorizedRedirectUri_UnauthorizedRejected() {
        assertFalse(successHandler.isAuthorizedRedirectUri("https://evil.com/phishing"));
        assertFalse(successHandler.isAuthorizedRedirectUri("journeygo://malicious/path"));
        assertFalse(successHandler.isAuthorizedRedirectUri(""));
        assertFalse(successHandler.isAuthorizedRedirectUri(null));
    }

    @Test
    @DisplayName("Đăng nhập Mobile thành công và chuyển hướng về Custom Scheme journeygo://")
    void testDetermineTargetUrl_MobileCustomScheme() {
        Cookie redirectCookie = new Cookie(HttpCookieOAuth2AuthorizationRequestRepository.REDIRECT_URI_PARAM_COOKIE_NAME, "journeygo://oauth2/redirect");
        when(request.getCookies()).thenReturn(new Cookie[]{redirectCookie});

        when(authentication.getPrincipal()).thenReturn(oAuth2User);
        when(oAuth2User.getAttributes()).thenReturn(Map.of(
                "email", "tourist.mobile@gmail.com",
                "name", "Mobile Tourist",
                "sub", "google-sub-12345",
                "picture", "https://avatar.google.com/pic.jpg"
        ));

        User existingUser = User.builder()
                .id(99L)
                .email("tourist.mobile@gmail.com")
                .fullName("Mobile Tourist")
                .role(new Role(Role.TOURIST, "Khách du lịch"))
                .providerId("google-sub-12345")
                .avatarUrl("https://avatar.google.com/pic.jpg")
                .active(true)
                .build();
        when(userRepository.findByEmail("tourist.mobile@gmail.com")).thenReturn(Optional.of(existingUser));

        when(tokenProvider.generateAccessToken("tourist.mobile@gmail.com", 99L)).thenReturn("jwt-access-token-123");
        RefreshToken refreshToken = RefreshToken.builder().token("mock-refresh-token-456").build();
        when(refreshTokenService.createRefreshToken(existingUser)).thenReturn(refreshToken);

        String targetUrl = successHandler.determineTargetUrl(request, response, authentication);

        assertNotNull(targetUrl);
        assertTrue(targetUrl.startsWith("journeygo://oauth2/redirect"));
        assertTrue(targetUrl.contains("token=jwt-access-token-123"));
        assertTrue(targetUrl.contains("refreshToken=mock-refresh-token-456"));
    }

    @Test
    @DisplayName("Đăng ký mới du khách qua Mobile Deep Link thành công")
    void testDetermineTargetUrl_CreateNewUser() {
        Cookie redirectCookie = new Cookie(HttpCookieOAuth2AuthorizationRequestRepository.REDIRECT_URI_PARAM_COOKIE_NAME, "journeygo://oauth2/redirect");
        Cookie roleCookie = new Cookie(HttpCookieOAuth2AuthorizationRequestRepository.ROLE_PARAM_COOKIE_NAME, "TOURIST");
        when(request.getCookies()).thenReturn(new Cookie[]{redirectCookie, roleCookie});

        when(authentication.getPrincipal()).thenReturn(oAuth2User);
        when(oAuth2User.getAttributes()).thenReturn(Map.of(
                "email", "new.tourist@gmail.com",
                "name", "New Tourist",
                "sub", "google-new-999"
        ));

        when(userRepository.findByEmail("new.tourist@gmail.com")).thenReturn(Optional.empty());
        Role touristRole = new Role(Role.TOURIST, "Khách du lịch");
        when(roleRepository.findByName(Role.TOURIST)).thenReturn(Optional.of(touristRole));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-pass");

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(101L);
            return u;
        });

        when(tokenProvider.generateAccessToken(eq("new.tourist@gmail.com"), eq(101L))).thenReturn("jwt-new-token");
        RefreshToken refreshToken = RefreshToken.builder().token("mock-refresh-token-789").build();
        when(refreshTokenService.createRefreshToken(any(User.class))).thenReturn(refreshToken);

        String targetUrl = successHandler.determineTargetUrl(request, response, authentication);

        assertNotNull(targetUrl);
        assertTrue(targetUrl.startsWith("journeygo://oauth2/redirect"));
        assertTrue(targetUrl.contains("token=jwt-new-token"));
        verify(userRepository).save(argThat(u -> u.getEmail().equals("new.tourist@gmail.com") && u.getAuthProvider() == AuthProvider.GOOGLE));
    }
}
