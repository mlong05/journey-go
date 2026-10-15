package com.journeygo.modules.experience.exception;

import lombok.Getter;

/**
 * Exception ném khi không tìm thấy entity theo id (hoặc theo điều kiện).
 *
 * Xử lý bởi {@link com.journeygo.common.exception.GlobalExceptionHandler} - trả về
 * HTTP 404 Not Found.
 *
 * Ví dụ: experienceRepository.findById(id) không có → ResourceNotFoundException("Experience", id).
 */
@Getter
public class ResourceNotFoundException extends RuntimeException {

    private final String resourceName;
    private final String identifier;

    public ResourceNotFoundException(String resourceName, Object identifier) {
        super(String.format("%s not found with %s = %s", resourceName, "id", identifier));
        this.resourceName = resourceName;
        this.identifier = String.valueOf(identifier);
    }

    public ResourceNotFoundException(String resourceName, String fieldName, Object value) {
        super(String.format("%s not found with %s = %s", resourceName, fieldName, value));
        this.resourceName = resourceName;
        this.identifier = String.valueOf(value);
    }
}