package com.journeygo.modules.auth.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.auth.dto.AuthResponse;
import com.journeygo.modules.auth.dto.GoogleAuthRequest;
import com.journeygo.modules.auth.entity.RefreshToken;
import com.journeygo.modules.user.entity.AuthProvider;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import com.journeygo.security.JwtTokenProvider;
import com.journeygo.security.oauth2.GoogleTokenVerifierService;
import com.journeygo.security.oauth2.GoogleUserInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceGoogleTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @Mock
    private GoogleTokenVerifierService googleTokenVerifierService;

    @InjectMocks
    private AuthService authService;

    private GoogleUserInfo sampleGoogleUser;

    @BeforeEach
    void setUp() {
        sampleGoogleUser = GoogleUserInfo.builder()
                .sub("google-sub-123")
                .email("test.google@journeygo.com")
                .emailVerified(true)
                .name("Nguyen Google")
                .picture("https://lh3.googleusercontent.com/avatar.jpg")
                .build();
    }

    @Test
    void processGoogleAuth_WhenUserDoesNotExist_ShouldRegisterNewUser() {
        // Arrange
        GoogleAuthRequest request = new GoogleAuthRequest("valid-id-token", Role.TOURIST);

        when(googleTokenVerifierService.verify("valid-id-token")).thenReturn(sampleGoogleUser);
        when(userRepository.findByEmail(sampleGoogleUser.email())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed-uuid");

        User savedUser = User.builder()
                .id(100L)
                .email(sampleGoogleUser.email())
                .fullName(sampleGoogleUser.name())
                .password("hashed-uuid")
                .role(Role.TOURIST)
                .authProvider(AuthProvider.GOOGLE)
                .providerId(sampleGoogleUser.sub())
                .avatarUrl(sampleGoogleUser.picture())
                .active(true)
                .createdAt(Instant.now())
                .build();

        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(tokenProvider.generateAccessToken(eq(savedUser.getEmail()), eq(savedUser.getId())))
                .thenReturn("mock-access-token");
        when(tokenProvider.getAccessTokenExpirationMs()).thenReturn(900000L);

        RefreshToken refreshToken = RefreshToken.builder()
                .token("mock-refresh-token")
                .user(savedUser)
                .build();
        when(refreshTokenService.createRefreshToken(savedUser)).thenReturn(refreshToken);

        // Act
        AuthResponse response = authService.processGoogleAuth(request);

        // Assert
        assertNotNull(response);
        assertEquals("mock-access-token", response.accessToken());
        assertEquals("mock-refresh-token", response.refreshToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals("test.google@journeygo.com", response.user().email());
        assertEquals(AuthProvider.GOOGLE, response.user().authProvider());
        assertEquals("https://lh3.googleusercontent.com/avatar.jpg", response.user().avatarUrl());

        verify(userRepository).save(argThat(u ->
                u.getEmail().equals("test.google@journeygo.com") &&
                u.getAuthProvider() == AuthProvider.GOOGLE &&
                u.getProviderId().equals("google-sub-123")
        ));
    }

    @Test
    void processGoogleAuth_WhenUserExists_ShouldLoginAndUpdateProfile() {
        // Arrange
        GoogleAuthRequest request = new GoogleAuthRequest("valid-id-token", null);

        User existingUser = User.builder()
                .id(50L)
                .email(sampleGoogleUser.email())
                .fullName("Old Name")
                .role(Role.TOURIST)
                .authProvider(AuthProvider.LOCAL)
                .active(true)
                .createdAt(Instant.now())
                .build();

        when(googleTokenVerifierService.verify("valid-id-token")).thenReturn(sampleGoogleUser);
        when(userRepository.findByEmail(sampleGoogleUser.email())).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenReturn(existingUser);
        when(tokenProvider.generateAccessToken(eq(existingUser.getEmail()), eq(existingUser.getId())))
                .thenReturn("mock-access-token-2");
        when(tokenProvider.getAccessTokenExpirationMs()).thenReturn(900000L);

        RefreshToken refreshToken = RefreshToken.builder()
                .token("mock-refresh-token-2")
                .user(existingUser)
                .build();
        when(refreshTokenService.createRefreshToken(existingUser)).thenReturn(refreshToken);

        // Act
        AuthResponse response = authService.processGoogleAuth(request);

        // Assert
        assertNotNull(response);
        assertEquals("mock-access-token-2", response.accessToken());
        assertEquals(sampleGoogleUser.picture(), existingUser.getAvatarUrl());
        assertEquals(sampleGoogleUser.sub(), existingUser.getProviderId());
    }

    @Test
    void processGoogleAuth_WhenUserIsInactive_ShouldThrowUnauthorized() {
        // Arrange
        GoogleAuthRequest request = new GoogleAuthRequest("valid-id-token", null);

        User inactiveUser = User.builder()
                .id(50L)
                .email(sampleGoogleUser.email())
                .fullName("Inactive User")
                .active(false)
                .build();

        when(googleTokenVerifierService.verify("valid-id-token")).thenReturn(sampleGoogleUser);
        when(userRepository.findByEmail(sampleGoogleUser.email())).thenReturn(Optional.of(inactiveUser));

        // Act & Assert
        AppException ex = assertThrows(AppException.class, () -> authService.processGoogleAuth(request));
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("vô hiệu hóa"));
    }
}
