package com.journeygo.modules.destination.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Mã QR check-in của điểm đến (chỉ chủ điểm đến / ADMIN / MODERATOR)")
public record DestinationQrResponse(
        @Schema(description = "ID điểm đến") Long destinationId,
        @Schema(description = "Tên điểm đến") String destinationName,
        @Schema(description = "Nội dung mã QR; du khách quét hoặc nhập tay để check-in", example = "JGD-3F9A1C7E52B04D18")
        String qrToken
) {}
