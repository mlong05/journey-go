package com.fpt.capstone.security.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // Tắt CSRF để dễ dàng test API qua Postman/Swagger
                .authorizeHttpRequests(auth -> auth
                        // Mở khóa các đường dẫn của Swagger
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // Tạm thời mở khóa toàn bộ các API khác để bạn code Entity và test thoải mái
                        // Sau này khi Minh Long làm xong phần Auth, bạn ấy sẽ sửa chỗ này thành .authenticated()
                        .anyRequest().permitAll()
                );
        return http.build();
    }
}