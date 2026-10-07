package com.fpt.capstone.core.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Cultural Tourism Platform API",
                description = "Tài liệu API cho các Microservices trong dự án Capstone",
                version = "1.0",
                contact = @Contact(
                        name = "Backend Team",
                        email = "team@fpt.edu.vn"
                )
        ),
        servers = {
                @Server(description = "Local Environment", url = "http://localhost:8080") // Trỏ về API Gateway
        },
        security = {
                @SecurityRequirement(name = "bearerAuth") // Yêu cầu token mặc định cho các API
        }
)

@SecurityScheme(
        name = "bearerAuth",
        description = "Nhập JWT Token vào đây (Không cần thêm chữ Bearer)",
        scheme = "bearer",
        type = SecuritySchemeType.HTTP,
        bearerFormat = "JWT",
        in = SecuritySchemeIn.HEADER
)

public class OpenApiConfig {
}