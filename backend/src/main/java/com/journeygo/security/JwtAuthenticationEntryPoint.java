package com.journeygo.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.i18n.Messages;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        // Chạy trong filter chain (trước DispatcherServlet) ⇒ đọc ngôn ngữ trực tiếp từ request.
        ApiResponse<Object> apiResponse = ApiResponse.error(
                HttpServletResponse.SC_UNAUTHORIZED,
                Messages.get(request, "common.sessionExpired")
        );

        response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
    }
}
