package com.journeygo.config;

import com.journeygo.security.JwtAuthenticationEntryPoint;
import com.journeygo.security.JwtAuthenticationFilter;
import com.journeygo.security.oauth2.CustomOAuth2UserService;
import com.journeygo.security.oauth2.HttpCookieOAuth2AuthorizationRequestRepository;
import com.journeygo.security.oauth2.OAuth2AuthenticationFailureHandler;
import com.journeygo.security.oauth2.OAuth2AuthenticationSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsConfigurationSource corsConfigurationSource;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
    private final OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler;
    private final HttpCookieOAuth2AuthorizationRequestRepository httpCookieOAuth2AuthorizationRequestRepository;

    private static final String[] PUBLIC_ENDPOINTS = {
            "/api/v1/auth/**",
            // Luồng đăng ký trở thành đối tác — người dùng CHƯA có tài khoản vẫn phải đăng ký được.
            // Bằng chứng "email đã xác minh" là bản ghi OTP đã dùng trong `partner_application_otps`
            // (service kiểm tra lại khi lưu nháp / gửi đơn).
            // Endpoint duyệt/từ chối vẫn được bảo vệ bằng @PreAuthorize("hasRole('ADMIN')").
            "/api/v1/partner-applications/**",
            // VNPay callback — endpoint server-to-server, KHÔNG có JWT.
            "/api/v1/payments/ipn",
            "/api/v1/payments/return",
            "/api/v1/payments/return-result",
            // Trang kết quả thanh toán cho TRÌNH DUYỘT (web + mobile deep link).
            "/api/v1/payments/return-page",
            "/oauth2/**",
            "/login/oauth2/**",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/actuator/**",
            // WebSocket/STOMP — bắt tay (CONNECT) được xác thực riêng trong
            // WebSocketConfig (đọc header Authorization của frame CONNECT).
            "/ws",
            "/error"
    };

    private static final String[] PUBLIC_GET_ENDPOINTS = {
            "/api/v1/destinations/**",
            "/api/v1/experiences/**",
            // Danh mục tour cho du khách: danh sách tour đã xuất bản và trang chi tiết công khai
            "/api/v1/tours/published",
            "/api/v1/tours/*/public-detail",
            // Số chỗ còn theo ngày — du khách cần xem trước khi đặt (không cần đăng nhập).
            "/api/v1/tours/*/availability",
            // Master data: public read, admin write
            "/api/v1/task-types",
            "/api/v1/task-types/*",
            "/api/v1/task-types/code/*",
            "/api/v1/task-types/*/point-rule",
            // Metadata public
            "/api/v1/tasks/*/unlock-condition",
            // Gamification catalog public read
            "/api/v1/gamification/badges",
            "/api/v1/gamification/vouchers",`r`n            "/api/v1/vouchers/applicable",`r`n            "/api/v1/vouchers/calculate",
            // Community feed & posts public read
            "/api/v1/community/posts/**",
            // Xem lời mời tham gia tour (deep link trong email): token là "capability
            // token" ngẫu nhiên 72 ký tự, chỉ người được mời mới có ⇒ cho phép
            // xem trước khi đăng nhập. Việc XÁC NHẬN (POST) vẫn bắt buộc đăng nhập.
            "/api/v1/bookings/invitations/*"
    };


    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .exceptionHandling(exception -> exception.authenticationEntryPoint(jwtAuthenticationEntryPoint))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Luồng SSE (/notifications/stream) đã xác thực ở request đầu; các lần gửi sau là
                        // async dispatch không mang lại JWT — nếu chặn, luồng bị ngắt sau sự kiện đầu tiên.
                        .dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ASYNC).permitAll()
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, PUBLIC_GET_ENDPOINTS).permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/destinations/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/destinations/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/regions/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/themes/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/cultural-contents/**").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth2 -> oauth2
                        .authorizationEndpoint(authorization -> authorization
                                .baseUri("/oauth2/authorization")
                                .authorizationRequestRepository(httpCookieOAuth2AuthorizationRequestRepository)
                        )
                        .redirectionEndpoint(redirection -> redirection
                                .baseUri("/login/oauth2/code/*")
                        )
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(customOAuth2UserService)
                        )
                        .successHandler(oAuth2AuthenticationSuccessHandler)
                        .failureHandler(oAuth2AuthenticationFailureHandler)
                );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
