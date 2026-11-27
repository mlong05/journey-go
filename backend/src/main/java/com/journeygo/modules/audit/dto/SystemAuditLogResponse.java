package com.journeygo.modules.audit.dto;

import com.journeygo.modules.audit.entity.SystemAuditLog;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Một dòng nhật ký kiểm toán hệ thống trả về cho Admin.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Một dòng nhật ký kiểm toán hệ thống")
public class SystemAuditLogResponse {

    @Schema(description = "ID dòng nhật ký")
    private Long id;

    @Schema(description = "ID người thực hiện (null = thao tác hệ thống)")
    private Long actorId;

    @Schema(description = "Email người thực hiện")
    private String actorEmail;

    @Schema(description = "Role của người thực hiện")
    private String actorRole;

    @Schema(description = "Nhóm thao tác")
    private String category;

    @Schema(description = "Hành động cụ thể")
    private String action;

    @Schema(description = "Loại đối tượng bị tác động")
    private String entityType;

    @Schema(description = "ID đối tượng bị tác động")
    private String entityId;

    @Schema(description = "IP nguồn")
    private String ipAddress;

    @Schema(description = "Kết quả: SUCCESS / FAILURE / DENIED")
    private String outcome;

    @Schema(description = "Chi tiết thao tác")
    private String detail;

    @Schema(description = "Thời điểm ghi nhận")
    private Instant createdAt;

    public static SystemAuditLogResponse fromEntity(SystemAuditLog log) {
        return SystemAuditLogResponse.builder()
                .id(log.getId())
                .actorId(log.getActor() != null ? log.getActor().getId() : null)
                .actorEmail(log.getActorEmail())
                .actorRole(log.getActorRole())
                .category(log.getCategory() != null ? log.getCategory().name() : null)
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .ipAddress(log.getIpAddress())
                .outcome(log.getOutcome() != null ? log.getOutcome().name() : null)
                .detail(log.getDetail())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
