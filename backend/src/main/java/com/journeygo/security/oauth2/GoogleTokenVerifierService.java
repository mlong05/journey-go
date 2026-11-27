package com.journeygo.security.oauth2;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
public class GoogleTokenVerifierService {

    private final RestClient restClient;

    /**
     * Client ID của ứng dụng Google (Web) — là "audience" của idToken.
     *
     * <p>⚠️ SECURITY (P1-2): nếu KHÔNG kiểm tra {@code aud}, attacker có thể lấy idToken
     * của một ứng dụng Google KHÁC (do attacker kiểm soát) rồi gửi sang API này ⇒
     * đăng nhập giả danh bất kỳ tài khoản Google nào. Vì vậy idToken chỉ được chấp nhận
     * khi {@code aud} (hoặc {@code azp}) khớp một client id hợp lệ của JourneyGo.
     *
     * <p>Cả Web lẫn Mobile đều dùng chung <b>Web Client ID</b> làm audience
     * (Mobile gọi {@code GoogleSignIn(serverClientId: GOOGLE_WEB_CLIENT_ID)}), nên
     * mặc định chỉ cần một client id. Có thể bổ sung bằng biến
     * {@code GOOGLE_ALLOWED_CLIENT_IDS} (phân tách bởi dấu phẩy) cho các client khác.
     */
    @Value("${spring.security.oauth2.client.registration.google.client-id:}")
    private String primaryClientId;

    @Value("${app.auth.google.allowed-client-ids:}")
    private String extraClientIds;

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

            // ⚠️ SECURITY (P1-2): token phải được cấp cho ứng dụng CỦA JourneyGo.
            verifyAudience(body);

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

    /**
     * Kiểm tra {@code aud} / {@code azp} của idToken có thuộc ứng dụng JourneyGo hay không.
     *
     * <p>Google trả về:
     * <ul>
     *   <li>{@code aud} — client id mà token được cấp (có thể là mảng JSON).</li>
     *   <li>{@code azp} — "authorized party" — client id thực sự yêu cầu token.</li>
     * </ul>
     * Nếu {@code aud} là mảng, token chỉ hợp lệ khi {@code azp} cũng nằm trong mảng đó.
     */
    private void verifyAudience(Map<String, Object> body) {
        Set<String> allowed = allowedClientIds();
        if (allowed.isEmpty()) {
            // Chưa cấu hình client id ⇒ không thể kiểm tra audience.
            // KHÔNG bỏ qua kiểm tra (sẽ mở lại lỗ hổng P1-2) ⇒ từ chối rõ ràng.
            log.error("[Google] Chưa cấu hình GOOGLE_CLIENT_ID — không thể kiểm tra audience của idToken.");
            throw new AppException(ErrorCode.INVALID_TOKEN,
                    "Máy chủ chưa cấu hình Google Client ID nên không thể xác thực token");
        }

        Object aud = body.get("aud");
        Object azp = body.get("azp");

        if (aud == null) {
            throw new AppException(ErrorCode.INVALID_TOKEN, "Google Token không chứa thông tin audience hợp lệ");
        }

        if (aud instanceof String audStr) {
            if (!allowed.contains(audStr)) {
                log.warn("[Google] idToken có aud={} không thuộc ứng dụng JourneyGo — từ chối.", audStr);
                throw new AppException(ErrorCode.INVALID_TOKEN,
                        "Google Token không được cấp cho ứng dụng này");
            }
        } else if (aud instanceof Iterable<?> audList) {
            boolean matched = false;
            for (Object item : audList) {
                if (allowed.contains(String.valueOf(item))) {
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                log.warn("[Google] idToken có aud={} không thuộc ứng dụng JourneyGo — từ chối.", audList);
                throw new AppException(ErrorCode.INVALID_TOKEN,
                        "Google Token không được cấp cho ứng dụng này");
            }
            // aud là mảng ⇒ azp bắt buộc phải nằm trong mảng đó.
            String azpStr = azp != null ? String.valueOf(azp) : null;
            if (azpStr == null || !allowed.contains(azpStr)) {
                log.warn("[Google] idToken có aud nhiều phần tử nhưng azp={} không hợp lệ — từ chối.", azpStr);
                throw new AppException(ErrorCode.INVALID_TOKEN,
                        "Google Token không được cấp cho ứng dụng này");
            }
        } else {
            throw new AppException(ErrorCode.INVALID_TOKEN, "Google Token không chứa thông tin audience hợp lệ");
        }
    }

    /** Danh sách client id được phép nhận idToken. */
    private Set<String> allowedClientIds() {
        Set<String> ids = new LinkedHashSet<>();
        if (primaryClientId != null && !primaryClientId.isBlank()
                && !primaryClientId.contains("your-google-client-id")) {
            ids.add(primaryClientId.trim());
        }
        if (extraClientIds != null && !extraClientIds.isBlank()) {
            Arrays.stream(extraClientIds.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty() && !s.contains("your-google-client-id"))
                    .forEach(ids::add);
        }
        return ids;
    }
}
