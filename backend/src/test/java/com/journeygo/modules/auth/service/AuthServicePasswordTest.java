package com.journeygo.modules.auth.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.auth.dto.ChangePasswordRequest;
import com.journeygo.modules.auth.dto.ForgotPasswordRequest;
import com.journeygo.modules.auth.dto.ResetPasswordRequest;
import com.journeygo.modules.auth.dto.VerifyOtpRequest;
import com.journeygo.modules.auth.entity.PasswordResetOtp;
import com.journeygo.modules.auth.repository.PasswordResetOtpRepository;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServicePasswordTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private PasswordResetOtpRepository passwordResetOtpRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "otpExpirationMinutes", 10);

        sampleUser = User.builder()
                .id(1L)
                .email("test@journeygo.com")
                .password("encoded-old-password")
                .fullName("Nguyễn Văn A")
                .role(Role.valueOf(Role.TOURIST))
                .active(true)
                .build();
    }

    @Test
    void forgotPassword_WhenUserExists_ShouldGenerateOtpAndSendEmail() {
        // Arrange
        ForgotPasswordRequest request = new ForgotPasswordRequest("test@journeygo.com");
        when(userRepository.findByEmail("test@journeygo.com")).thenReturn(Optional.of(sampleUser));

        // Act
        authService.forgotPassword(request);

        // Assert
        verify(passwordResetOtpRepository).deleteByEmail("test@journeygo.com");
        verify(passwordResetOtpRepository).save(argThat(otp ->
                otp.getEmail().equals("test@journeygo.com") &&
                otp.getOtp().length() == 6 &&
                !otp.isUsed()
        ));
        verify(emailService).sendPasswordResetOtp(eq("test@journeygo.com"), eq("Nguyễn Văn A"), anyString(), eq(10));
    }

    @Test
    void forgotPassword_WhenUserNotFound_ShouldThrowException() {
        // Arrange
        ForgotPasswordRequest request = new ForgotPasswordRequest("unknown@journeygo.com");
        when(userRepository.findByEmail("unknown@journeygo.com")).thenReturn(Optional.empty());

        // Act & Assert
        AppException ex = assertThrows(AppException.class, () -> authService.forgotPassword(request));
        assertEquals(ErrorCode.USER_NOT_EXISTED, ex.getErrorCode());
    }

    @Test
    void verifyOtp_WhenOtpValid_ShouldReturnTrue() {
        // Arrange
        VerifyOtpRequest request = new VerifyOtpRequest("test@journeygo.com", "123456");
        PasswordResetOtp otpEntity = PasswordResetOtp.builder()
                .email("test@journeygo.com")
                .otp("123456")
                .expiryDate(Instant.now().plus(10, ChronoUnit.MINUTES))
                .used(false)
                .build();

        when(passwordResetOtpRepository.findTopByEmailAndOtpAndUsedFalseOrderByCreatedAtDesc("test@journeygo.com", "123456"))
                .thenReturn(Optional.of(otpEntity));

        // Act
        boolean result = authService.verifyOtp(request);

        // Assert
        assertTrue(result);
    }

    @Test
    void verifyOtp_WhenOtpExpired_ShouldThrowException() {
        // Arrange
        VerifyOtpRequest request = new VerifyOtpRequest("test@journeygo.com", "123456");
        PasswordResetOtp expiredOtp = PasswordResetOtp.builder()
                .email("test@journeygo.com")
                .otp("123456")
                .expiryDate(Instant.now().minus(5, ChronoUnit.MINUTES))
                .used(false)
                .build();

        when(passwordResetOtpRepository.findTopByEmailAndOtpAndUsedFalseOrderByCreatedAtDesc("test@journeygo.com", "123456"))
                .thenReturn(Optional.of(expiredOtp));

        // Act & Assert
        AppException ex = assertThrows(AppException.class, () -> authService.verifyOtp(request));
        assertEquals(ErrorCode.OTP_EXPIRED, ex.getErrorCode());
    }

    @Test
    void resetPassword_WhenValidOtp_ShouldUpdatePassword() {
        // Arrange
        ResetPasswordRequest request = new ResetPasswordRequest(
                "test@journeygo.com", "123456", "NewPassword123@", "NewPassword123@"
        );

        PasswordResetOtp otpEntity = PasswordResetOtp.builder()
                .email("test@journeygo.com")
                .otp("123456")
                .expiryDate(Instant.now().plus(10, ChronoUnit.MINUTES))
                .used(false)
                .build();

        when(passwordResetOtpRepository.findTopByEmailAndOtpAndUsedFalseOrderByCreatedAtDesc("test@journeygo.com", "123456"))
                .thenReturn(Optional.of(otpEntity));
        when(userRepository.findByEmail("test@journeygo.com")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("NewPassword123@", "encoded-old-password")).thenReturn(false);
        when(passwordEncoder.encode("NewPassword123@")).thenReturn("encoded-new-password");

        // Act
        authService.resetPassword(request);

        // Assert
        assertEquals("encoded-new-password", sampleUser.getPassword());
        assertTrue(otpEntity.isUsed());
        verify(userRepository).save(sampleUser);
        verify(passwordResetOtpRepository).save(otpEntity);
        verify(refreshTokenService).revokeAllUserTokens(sampleUser);
    }

    @Test
    void resetPassword_WhenPasswordMismatch_ShouldThrowException() {
        // Arrange
        ResetPasswordRequest request = new ResetPasswordRequest(
                "test@journeygo.com", "123456", "Pass1", "Pass2"
        );

        // Act & Assert
        AppException ex = assertThrows(AppException.class, () -> authService.resetPassword(request));
        assertEquals(ErrorCode.PASSWORD_NOT_MATCH, ex.getErrorCode());
    }

    @Test
    void changePassword_WhenValidCurrentPassword_ShouldUpdatePassword() {
        // Arrange
        ChangePasswordRequest request = new ChangePasswordRequest(
                "OldPass123@", "NewPass123@", "NewPass123@"
        );

        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("OldPass123@", "encoded-old-password")).thenReturn(true);
        when(passwordEncoder.matches("NewPass123@", "encoded-old-password")).thenReturn(false);
        when(passwordEncoder.encode("NewPass123@")).thenReturn("new-encoded-pass");

        // Act
        authService.changePassword(1L, request);

        // Assert
        assertEquals("new-encoded-pass", sampleUser.getPassword());
        verify(userRepository).save(sampleUser);
        verify(refreshTokenService).revokeAllUserTokens(sampleUser);
    }

    @Test
    void changePassword_WhenWrongCurrentPassword_ShouldThrowException() {
        // Arrange
        ChangePasswordRequest request = new ChangePasswordRequest(
                "WrongOldPass", "NewPass123@", "NewPass123@"
        );

        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("WrongOldPass", "encoded-old-password")).thenReturn(false);

        // Act & Assert
        AppException ex = assertThrows(AppException.class, () -> authService.changePassword(1L, request));
        assertEquals(ErrorCode.INVALID_CREDENTIALS, ex.getErrorCode());
    }
}
