package com.journeygo.modules.moderation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "Yêu cầu đối tác (Partner) gửi đề xuất điểm đến mới (thông tin liên hệ tên, số điện thoại, email được lấy tự động từ tài khoản đăng nhập)")
public record CreateDestinationProposalRequest(

        @Schema(description = "Tên điểm đến đề xuất", example = "Chùa Thiên Mụ")
        @NotBlank(message = "Tên điểm đến không được để trống")
        @Size(max = 255, message = "Tên điểm đến tối đa 255 ký tự")
        String destinationName,

        @Schema(description = "Địa điểm / Tỉnh / Thành phố", example = "Huế, Việt Nam")
        @NotBlank(message = "Địa điểm không được để trống")
        @Size(max = 255, message = "Địa điểm tối đa 255 ký tự")
        String location,

        @Schema(description = "Địa chỉ chi tiết của điểm đến", example = "Đồi Hà Khê, Kim Long, TP. Huế")
        @NotBlank(message = "Địa chỉ không được để trống")
        String address,

        @Schema(description = "Giới thiệu sơ bộ về điểm đến", example = "Ngôi chùa cổ kính nổi tiếng bên bờ sông Hương...")
        String description,

        @Schema(description = "Danh sách URL hình ảnh điểm đến (nếu đã tải lên Cloudinary trước đó)")
        List<String> images,

        @Schema(description = "Tài liệu hoặc đường dẫn chứng minh thông tin / liên kết giới thiệu")
        String supportingDocuments,

        @Schema(description = "Thông tin liên hệ bổ sung (nếu có, ví dụ: giờ tiếp đón, chức vụ đại diện...)")
        String contactInfo,

        @Schema(description = "Ghi chú của đối tác khi gửi đề xuất", example = "Muốn giới thiệu văn hóa lịch sử Cố đô Huế tới du khách trẻ...")
        String note
) {}
