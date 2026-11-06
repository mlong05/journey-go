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
            // Đọc role từ cookie nếu có truyền, mặc định là TOURIST
            String requestedRole = CookieUtils.getCookie(request, HttpCookieOAuth2AuthorizationRequestRepository.ROLE_PARAM_COOKIE_NAME)
                    .map(Cookie::getValue)
                    .map(String::trim)
                    .map(String::toUpperCase)
                    .orElse(Role.TOURIST);

            // Kiểm tra bảo mật: chỉ cho phép tự đăng ký TOURIST hoặc PROVIDER
            if (!Role.TOURIST.equals(requestedRole) && !Role.CONTENT_PROVIDER.equals(requestedRole)) {
                requestedRole = Role.TOURIST;
            }

            final String finalRole = requestedRole;
            Role userRole = roleRepository.findByName(finalRole)
                    .orElseGet(() -> roleRepository.save(new Role(finalRole, Role.CONTENT_PROVIDER.equals(finalRole) ? "Nhà cung cấp" : "Khách du lịch")));

            user = User.builder()
                    .email(email)
                    .fullName(name != null && !name.isBlank() ? name : email.split("@")[0])
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(userRole)
                    .authProvider(AuthProvider.GOOGLE)
                    .providerId(sub)
                    .avatarUrl(picture)
                    .active(true)
                    .build();
            user = userRepository.save(user);
            log.info("Đã tạo mới tài khoản Google OAuth2 cho email: {} với role: {}", email, finalRole);
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

    public boolean isAuthorizedRedirectUri(String uri) {
        if (uri == null || uri.isBlank()) {
            return false;
        }

        URI clientRedirectUri;
        try {
            clientRedirectUri = URI.create(uri.trim());
        } catch (IllegalArgumentException e) {
            log.warn("Malformed redirect URI: {}", uri);
            return false;
        }

        List<String> authorizedUris = Arrays.asList(authorizedRedirectUris);

        return authorizedUris.stream().anyMatch(authorizedUri -> {
            try {
                URI authorizedURI = URI.create(authorizedUri.trim());

                // 1. Trường hợp Custom App Scheme (Mobile Deep Link) như: journeygo://oauth2/redirect
                if (authorizedURI.getScheme() != null
                        && !authorizedURI.getScheme().equalsIgnoreCase("http")
                        && !authorizedURI.getScheme().equalsIgnoreCase("https")) {
                    boolean schemeMatch = authorizedURI.getScheme().equalsIgnoreCase(clientRedirectUri.getScheme());
                    boolean hostMatch = authorizedURI.getHost() == null
                            || authorizedURI.getHost().equalsIgnoreCase(clientRedirectUri.getHost());
                    boolean pathMatch = authorizedURI.getPath() == null || authorizedURI.getPath().isEmpty()
                            || authorizedURI.getPath().equalsIgnoreCase(clientRedirectUri.getPath());
                    return schemeMatch && hostMatch && pathMatch;
                }

                // 2. Trường hợp HTTP / HTTPS Web URLs (Web Browser)
                return authorizedURI.getHost() != null
                        && authorizedURI.getHost().equalsIgnoreCase(clientRedirectUri.getHost())
                        && authorizedURI.getPort() == clientRedirectUri.getPort();
            } catch (Exception ex) {
                log.warn("Error parsing authorized redirect URI: {}", authorizedUri, ex);
                return false;
            }
        });
    }
}
