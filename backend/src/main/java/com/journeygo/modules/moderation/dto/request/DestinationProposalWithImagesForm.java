package com.journeygo.modules.moderation.dto.request;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(name = "DestinationProposalWithImagesForm", description = "Đề xuất điểm đến và tệp ảnh tải lên Cloudinary cùng lúc")
public record DestinationProposalWithImagesForm(

        @Schema(description = "Thông tin đề xuất điểm đến dạng JSON")
        CreateDestinationProposalRequest request,

        @Schema(description = "File ảnh JPG, PNG, WEBP hoặc AVIF", type = "string", format = "binary")
        String image,

        @ArraySchema(schema = @Schema(type = "string", format = "binary", description = "Danh sách tệp ảnh JPG, PNG, WEBP"))
        List<String> images
) {}
