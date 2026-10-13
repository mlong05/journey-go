package com.journeygo.security.oauth2;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;

@Slf4j
@Service
public class GoogleTokenVerifierService {

    private final RestClient restClient;

    public GoogleTokenVerifierService() {
        this.restClient = RestClient.builder()
                .baseUrl("https://oauth2.googleapis.com")
                .build();
    }

    public GoogleUserInfo verify(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Google ID Token không được để trống");
        }

        try {
            Map<String, Object> body = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/tokeninfo")
                            .queryParam("id_token", idToken.trim())
                            .build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (body == null) {
                throw new AppException(ErrorCode.INVALID_TOKEN, "Không thể xác thực Google ID Token");
            }

            String email = (String) body.get("email");
            if (email == null || email.isBlank()) {
                throw new AppException(ErrorCode.INVALID_TOKEN, "Google Token không chứa thông tin email hợp lệ");
            }

            String emailVerifiedVal = String.valueOf(body.get("email_verified"));
            boolean emailVerified = Boolean.parseBoolean(emailVerifiedVal);
            if (!emailVerified) {
                throw new AppException(ErrorCode.UNAUTHENTICATED, "Tài khoản email Google chưa được xác thực");
            }

            String sub = (String) body.get("sub");
            String name = (String) body.get("name");
            String picture = (String) body.get("picture");

            return GoogleUserInfo.builder()
                    .sub(sub)
                    .email(email.toLowerCase().trim())
                    .emailVerified(true)
                    .name(name)
                    .picture(picture)
                    .build();

        } catch (RestClientResponseException ex) {
            log.error("Lỗi khi xác thực token với Google OAuth2 API: status={}, body={}",
                    ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new AppException(ErrorCode.INVALID_TOKEN, "Google ID Token không hợp lệ hoặc đã hết hạn");
        } catch (AppException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Lỗi hệ thống khi gọi Google Tokeninfo: {}", ex.getMessage(), ex);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Lỗi khi xác thực tài khoản Google: " + ex.getMessage());
        }
    }
}
