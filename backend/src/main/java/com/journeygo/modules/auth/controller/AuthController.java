package com.journeygo.modules.auth.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.auth.dto.*;
import com.journeygo.modules.auth.service.AuthService;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Xác thực (Authentication)", description = "Các API đăng nhập, đăng ký, cấp mới token và đăng xuất")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập", description = "Đăng nhập bằng email và mật khẩu, trả về Access Token và Refresh Token")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse authResponse = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", authResponse));
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản", description = "Tạo tài khoản mới và tự động đăng nhập trả về Access Token và Refresh Token")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse authResponse = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đăng ký tài khoản thành công", authResponse));
    }

    @PostMapping("/google")
    @Operation(summary = "Đăng ký hoặc đăng nhập với Google OAuth2", description = "Xác thực Google ID Token gửi từ client (Web/Mobile), tự động tạo tài khoản nếu chưa tồn tại và trả về JWT")
    public ResponseEntity<ApiResponse<AuthResponse>> googleAuth(@Valid @RequestBody GoogleAuthRequest request) {
        AuthResponse authResponse = authService.processGoogleAuth(request);
        return ResponseEntity.ok(ApiResponse.success("Xác thực tài khoản Google thành công", authResponse));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Làm mới Access Token", description = "Cung cấp Refresh Token hợp lệ để nhận Access Token mới")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse authResponse = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success("Làm mới token thành công", authResponse));
    }

    @PostMapping("/logout")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Đăng xuất", description = "Hủy phiên làm việc, thu hồi Refresh Token và vô hiệu hóa Access Token")
    public ResponseEntity<ApiResponse<Void>> logout(
            HttpServletRequest request,
            @RequestBody(required = false) RefreshTokenRequest refreshTokenRequest) {
        String bearerToken = request.getHeader("Authorization");
        String accessToken = null;
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            accessToken = bearerToken.substring(7);
        }

        String refreshToken = refreshTokenRequest != null ? refreshTokenRequest.refreshToken() : null;
        authService.logout(accessToken, refreshToken);
        return ResponseEntity.ok(ApiResponse.success("Đăng xuất thành công", null));
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lấy thông tin người dùng hiện tại", description = "Lấy thông tin tài khoản đang đăng nhập từ JWT Bearer token")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        if (userPrincipal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(401, "Người dùng chưa đăng nhập"));
        }

        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thành công", UserResponse.fromEntity(user)));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Quên mật khẩu - Gửi mã OTP", description = "Gửi mã OTP 6 chữ số đến email của người dùng để xác thực khôi phục mật khẩu")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Mã OTP khôi phục mật khẩu đã được gửi đến email của bạn", null));
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Xác thực mã OTP", description = "Kiểm tra mã OTP 6 chữ số có hợp lệ và còn hiệu lực hay không trước khi đổi mật khẩu")
    public ResponseEntity<ApiResponse<Boolean>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        boolean valid = authService.verifyOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Mã OTP hợp lệ", valid));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Đặt lại mật khẩu mới bằng OTP", description = "Xác thực OTP và đặt mật khẩu mới cho tài khoản (không cần đăng nhập)")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Đặt lại mật khẩu thành công, vui lòng đăng nhập bằng mật khẩu mới", null));
    }

    @PostMapping("/change-password")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Đổi mật khẩu tài khoản", description = "Người dùng đang đăng nhập đổi mật khẩu tài khoản bằng mật khẩu hiện tại")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody ChangePasswordRequest request) {
        if (userPrincipal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(401, "Người dùng chưa đăng nhập"));
        }

        authService.changePassword(userPrincipal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công", null));
    }
}
