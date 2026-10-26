package com.journeygo.security.oauth2;

import com.journeygo.modules.auth.entity.RefreshToken;
import com.journeygo.modules.auth.service.RefreshTokenService;
import com.journeygo.modules.user.entity.AuthProvider;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import com.journeygo.security.JwtTokenProvider;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider tokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final UserRepository userRepository;
    private final com.journeygo.modules.user.repository.RoleRepository roleRepository;
    @org.springframework.context.annotation.Lazy
    private final PasswordEncoder passwordEncoder;
    private final HttpCookieOAuth2AuthorizationRequestRepository httpCookieOAuth2AuthorizationRequestRepository;

    @Value("${app.oauth2.default-redirect-uri:http://localhost:3000/oauth2/redirect}")
    private String defaultRedirectUri;

    @Value("${app.oauth2.authorized-redirect-uris:http://localhost:3000/oauth2/redirect,http://127.0.0.1:3000/oauth2/redirect}")
    private String[] authorizedRedirectUris;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        String targetUrl = determineTargetUrl(request, response, authentication);

        if (response.isCommitted()) {
            log.debug("Response đã được commit, không thể redirect đến: {}", targetUrl);
            return;
        }

        clearAuthenticationAttributes(request, response);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    protected String determineTargetUrl(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) {
        Optional<String> redirectUri = CookieUtils.getCookie(request, HttpCookieOAuth2AuthorizationRequestRepository.REDIRECT_URI_PARAM_COOKIE_NAME)
                .map(Cookie::getValue);

        String targetUrl = redirectUri.filter(this::isAuthorizedRedirectUri).orElse(defaultRedirectUri);

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = (String) oAuth2User.getAttributes().get("email");
        String name = (String) oAuth2User.getAttributes().get("name");
        String picture = (String) oAuth2User.getAttributes().get("picture");
        String sub = (String) oAuth2User.getAttributes().get("sub");

        if (email == null || email.isBlank()) {
            return UriComponentsBuilder.fromUriString(targetUrl)
                    .queryParam("error", "Email không tìm thấy từ tài khoản Google")
                    .build().toUriString();
        }

        email = email.toLowerCase().trim();

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            // Đăng ký mới người dùng qua Google OAuth2
            Role touristRole = roleRepository.findByName(Role.TOURIST)
                    .orElseGet(() -> roleRepository.save(new Role(Role.TOURIST, "Khách du lịch")));
            user = User.builder()
                    .email(email)
                    .fullName(name != null && !name.isBlank() ? name : email.split("@")[0])
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(touristRole)
                    .authProvider(AuthProvider.GOOGLE)
                    .providerId(sub)
                    .avatarUrl(picture)
                    .active(true)
                    .build();
            user = userRepository.save(user);
            log.info("Đã tạo mới tài khoản Google OAuth2 cho email: {}", email);
        } else {
            if (!user.isActive()) {
                return UriComponentsBuilder.fromUriString(targetUrl)
                        .queryParam("error", "Tài khoản của bạn đã bị vô hiệu hóa")
                        .build().toUriString();
            }
            // Cập nhật thông tin avatar hoặc providerId nếu còn thiếu
            boolean modified = false;
            if (user.getAvatarUrl() == null && picture != null) {
                user.setAvatarUrl(picture);
                modified = true;
            }
            if (user.getProviderId() == null && sub != null) {
                user.setProviderId(sub);
                modified = true;
            }
            if (modified) {
                user = userRepository.save(user);
            }
        }

        String accessToken = tokenProvider.generateAccessToken(user.getEmail(), user.getId());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        return UriComponentsBuilder.fromUriString(targetUrl)
                .queryParam("token", accessToken)
                .queryParam("refreshToken", refreshToken.getToken())
                .build().toUriString();
    }

    protected void clearAuthenticationAttributes(HttpServletRequest request, HttpServletResponse response) {
        super.clearAuthenticationAttributes(request);
        httpCookieOAuth2AuthorizationRequestRepository.removeAuthorizationRequestCookies(request, response);
    }

    private boolean isAuthorizedRedirectUri(String uri) {
        URI clientRedirectUri = URI.create(uri);
        List<String> authorizedUris = Arrays.asList(authorizedRedirectUris);

        return authorizedUris.stream().anyMatch(authorizedUri -> {
            URI authorizedURI = URI.create(authorizedUri);
            return authorizedURI.getHost().equalsIgnoreCase(clientRedirectUri.getHost())
                    && authorizedURI.getPort() == clientRedirectUri.getPort();
        });
    }
}
