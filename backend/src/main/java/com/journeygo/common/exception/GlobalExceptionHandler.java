package com.journeygo.common.exception;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.mapping.PropertyReferenceException;
import org.springframework.http.HttpStatus;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Object>> handleAppException(AppException ex) {
        ErrorCode errorCode = ex.getErrorCode();
        ApiResponse<Object> response = ApiResponse.builder()
                .code(errorCode.getHttpStatus().value())
                .message(ex.getMessage() != null ? ex.getMessage() : errorCode.getMessage())
                .build();
        return ResponseEntity.status(errorCode.getHttpStatus()).body(response);
    }

    // ── Experience module exceptions ──────────────────────────────────────────────

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleResourceNotFound(ResourceNotFoundException ex) {
        ApiResponse<Object> response = ApiResponse.builder()
                .code(HttpStatus.NOT_FOUND.value())
                .message(ex.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Object>> handleBusinessException(BusinessException ex) {
        // Phân biệt mã lỗi để map HTTP status cho chuẩn:
        //   - UNAUTH-*  → 401 Unauthorized
        //   - FORBIDDEN-* → 403 Forbidden
        //   - còn lại   → 400 Bad Request (lỗi nghiệp vụ thông thường)
        String code = ex.getCode();
        HttpStatus status;
        if (code != null) {
            if (code.startsWith("UNAUTH-")) {
                status = HttpStatus.UNAUTHORIZED;
            } else if (code.startsWith("FORBIDDEN-")) {
                status = HttpStatus.FORBIDDEN;
            } else {
                status = HttpStatus.BAD_REQUEST;
            }
        } else {
            status = HttpStatus.BAD_REQUEST;
        }

        ApiResponse<Object> response = ApiResponse.builder()
                .code(status.value())
                .message(ex.getMessage())
                .build();
        return ResponseEntity.status(status).body(response);
    }

    /**
     * Maps database integrity violations to concise client-facing errors.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        String rootMessage = ex.getMostSpecificCause() != null
                ? ex.getMostSpecificCause().getMessage()
                : ex.getMessage();
        String lower = rootMessage != null ? rootMessage.toLowerCase() : "";

        String code;
        String message;

        if (rootMessage != null && rootMessage.contains("uk_task_experience_sequence")) {
            code = "BR-TASK-2";
            message = "Sequence order đã tồn tại trong Experience (BR-TASK-2).";
        } else if (rootMessage != null && rootMessage.contains("uk_check_in_point_qr_token")) {
            code = "BR-CIP-1";
            message = "qrToken đã tồn tại trong hệ thống (BR-CIP-1).";
        } else if (rootMessage != null && rootMessage.contains("uk_user_check_in_point")) {
            code = "BR-UCIP-1";
            message = "User đã check-in tại CheckInPoint này rồi (BR-UCIP-1).";
        } else if (rootMessage != null
                && (rootMessage.contains("task_type.code") || lower.contains("uk_task_type_code"))) {
            code = "BR-TT-UNIQUE";
            message = "TaskType code đã tồn tại (BR-TT-UNIQUE).";
        } else if (rootMessage != null
                && (rootMessage.contains("unlock_condition") || lower.contains("uk_unlock_condition_task"))) {
            code = "BR-UC-UNIQUE";
            message = "Mỗi Task chỉ có một UnlockCondition (BR-UC-UNIQUE).";
        } else if (lower.contains("unique") || lower.contains("duplicate")) {
            code = "INTEGRITY-UNIQUE";
            message = "Dữ liệu bị trùng lặp, vi phạm ràng buộc duy nhất trong cơ sở dữ liệu.";
        } else {
            code = "INTEGRITY-002";
            message = "Vi phạm ràng buộc dữ liệu: "
                    + (rootMessage != null ? rootMessage : "không xác định");
        }

        log.warn("DataIntegrityViolation: code={} cause={}", code, rootMessage);

        ApiResponse<Object> response = ApiResponse.builder()
                .code(HttpStatus.BAD_REQUEST.value())
                .message(message)
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        ApiResponse<Map<String, String>> response = ApiResponse.<Map<String, String>>builder()
                .code(HttpStatus.BAD_REQUEST.value())
                .message("Dữ liệu đầu vào không hợp lệ")
                .data(errors)
                .build();
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadCredentialsException(BadCredentialsException ex) {
        ApiResponse<Object> response = ApiResponse.builder()
                .code(HttpStatus.UNAUTHORIZED.value())
                .message("Email hoặc mật khẩu không chính xác")
                .build();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Object>> handleAuthenticationException(AuthenticationException ex) {
        ApiResponse<Object> response = ApiResponse.builder()
                .code(HttpStatus.UNAUTHORIZED.value())
                .message("Xác thực thất bại: " + ex.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDeniedException(AccessDeniedException ex) {
        ApiResponse<Object> response = ApiResponse.builder()
                .code(HttpStatus.FORBIDDEN.value())
                .message("Bạn không có quyền truy cập chức năng này")
                .build();
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    // ── Pagination / Sort / Param parsing ─────────────────────────────────

    /**
     * Lỗi khi Spring Data parse `?sort=...` tham chiếu field không tồn tại trên entity.
     * VD: ?sort=foo → "No property 'foo' found for type 'Experience'; Did you mean 'id'"
     */
    @ExceptionHandler(PropertyReferenceException.class)
    public ResponseEntity<ApiResponse<Object>> handlePropertyReference(PropertyReferenceException ex) {
        String msg = ex.getMessage() != null
                ? ex.getMessage().replace("\"", "'")
                : "Trường sort không hợp lệ";
        ApiResponse<Object> response = ApiResponse.builder()
                .code(HttpStatus.BAD_REQUEST.value())
                .message("Tham số sort không hợp lệ: " + msg)
                .build();
        return ResponseEntity.badRequest().body(response);
    }

    /**
     * Bắt IllegalArgumentException phát sinh từ việc truyền sort không hợp lệ trên truy vấn JPA hoặc đối số sai.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Object>> handleIllegalArgumentException(IllegalArgumentException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "Tham số yêu cầu không hợp lệ";
        ApiResponse<Object> response = ApiResponse.builder()
                .code(HttpStatus.BAD_REQUEST.value())
                .message("Tham số không hợp lệ: " + msg)
                .build();
        return ResponseEntity.badRequest().body(response);
    }

    /**
     * Lỗi khi query param sai kiểu (VD Swagger gửi sort=["id"] mảng JSON thay vì chuỗi "id,asc").
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String requiredType = ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown";
        String msg = String.format(
                "Tham số '%s' không đúng định dạng. Giá trị nhận: '%s'. Kiểu yêu cầu: %s",
                ex.getName(), String.valueOf(ex.getValue()), requiredType);
        ApiResponse<Object> response = ApiResponse.builder()
                .code(HttpStatus.BAD_REQUEST.value())
                .message(msg)
                .build();
        return ResponseEntity.badRequest().body(response);
    }

    /**
     * Thiếu query param bắt buộc.
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Object>> handleMissingParam(MissingServletRequestParameterException ex) {
        ApiResponse<Object> response = ApiResponse.builder()
                .code(HttpStatus.BAD_REQUEST.value())
                .message("Thiếu tham số bắt buộc: " + ex.getParameterName())
                .build();
        return ResponseEntity.badRequest().body(response);
    }

    /**
     * Vi phạm validation ở @RequestParam / @PathVariable (annotation như @Positive, @Min, ...).
     * Khác với MethodArgumentNotValidException (validation cho @RequestBody).
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleConstraintViolation(ConstraintViolationException ex) {
        Map<String, String> errors = ex.getConstraintViolations().stream()
                .collect(Collectors.toMap(
                        v -> v.getPropertyPath().toString(),
                        ConstraintViolation::getMessage,
                        (a, b) -> a
                ));
        ApiResponse<Map<String, String>> response = ApiResponse.<Map<String, String>>builder()
                .code(HttpStatus.BAD_REQUEST.value())
                .message("Tham số không hợp lệ")
                .data(errors)
                .build();
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Object>> handleUnsupportedMediaType(HttpMediaTypeNotSupportedException ex) {
        ApiResponse<Object> response = ApiResponse.builder()
                .code(HttpStatus.UNSUPPORTED_MEDIA_TYPE.value())
                .message("Content-Type không được hỗ trợ cho endpoint này")
                .build();
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGeneralException(Exception ex) {
        ApiResponse<Object> response = ApiResponse.builder()
                .code(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .message("Đã xảy ra lỗi máy chủ: " + ex.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
