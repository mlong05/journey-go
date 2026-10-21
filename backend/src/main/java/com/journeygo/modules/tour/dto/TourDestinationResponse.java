package com.journeygo.modules.tour.dto;

import com.journeygo.modules.tour.entity.TourDestination;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "Một điểm đến trong hành trình tour")
public record TourDestinationResponse(

        @Schema(description = "ID bản ghi liên kết") Long id,
        @Schema(description = "Thứ tự trong hành trình") int sequenceOrder,
        @Schema(description = "ID điểm đến") Long destinationId,
        @Schema(description = "Tên điểm đến") String destinationName,
        @Schema(description = "Địa chỉ điểm đến") String destinationAddress
) {
    public static TourDestinationResponse fromEntity(TourDestination td) {
        if (td == null) return null;
        return TourDestinationResponse.builder()
                .id(td.getId())
                .sequenceOrder(td.getSequenceOrder())
                .destinationId(td.getDestination() != null ? td.getDestination().getId() : null)
                .destinationName(td.getDestination() != null ? td.getDestination().getName() : null)
                .destinationAddress(td.getDestination() != null ? td.getDestination().getAddress() : null)
                .build();
    }
}
