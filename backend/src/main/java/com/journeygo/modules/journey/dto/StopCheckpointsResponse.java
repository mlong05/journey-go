package com.journeygo.modules.journey.dto;

import com.journeygo.modules.journey.entity.enums.TaskProgressStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;

/**
 * Bản đồ checkpoint của một trạm (chỉ mở sau khi check-in): vùng check-in của điểm đến và vị trí
 * từng hoạt động thực địa, để du khách thấy cả các điểm cần đi trước khi chọn hoạt động.
 * Không kèm mã QR hay đáp án.
 */
@Schema(description = "Vùng check-in của trạm và checkpoint các hoạt động thực địa")
public record StopCheckpointsResponse(
        Long destinationId,
        String destinationName,
        @Schema(description = "Vị trí check-in trạm") BigDecimal latitude,
        BigDecimal longitude,
        @Schema(description = "Bán kính check-in trạm (mét)") Integer checkInRadiusMeters,
        List<Checkpoint> checkpoints
) {
    @Schema(description = "Checkpoint của một hoạt động thực địa")
    public record Checkpoint(
            @Schema(description = "Id nhiệm vụ (khớp taskId trong tiến độ hành trình)") Long taskId,
            String name,
            Integer orderIndex,
            BigDecimal latitude,
            BigDecimal longitude,
            Integer radiusMeters,
            @Schema(description = "Trạng thái nhiệm vụ của du khách") TaskProgressStatus status
    ) {}
}
