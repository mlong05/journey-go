package com.journeygo.modules.moderation.dto;

import com.journeygo.modules.moderation.entity.enums.TourReviewStep;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Quyết định của Moderator: dùng chung cho Đồng ý / Yêu cầu chỉnh sửa / Từ chối.
 */
public record TourReviewDecisionRequest(
        @Schema(description = "Ghi chú chung kèm quyết định (bắt buộc khi từ chối nếu không chọn mã lý do)",
                example = "Vui lòng xác minh lại lịch trình")
        @Size(max = 1000) String note,

        @Schema(description = "Mã lý do từ chối dạng checkbox, phân cách bằng dấu phẩy",
                example = "INCOMPLETE_INFORMATION,OTHER")
        @Size(max = 500) String reason,

        @Schema(description = "Nội dung lý do khác; bắt buộc nếu reason có mã OTHER")
        @Size(max = 500) String otherReason,

        @Schema(description = "5 tiêu chí kiểm duyệt — bắt buộc với tour tạo theo luồng 5 bước (cả khi đồng ý lẫn từ chối)")
        @Valid ReviewCriteria criteria,

        @Schema(description = "Ghi chú gắn cờ theo bước / điểm đến. Bắt buộc ít nhất 1 khi yêu cầu chỉnh sửa; "
                + "phải để trống khi đồng ý")
        @Valid @Size(max = 100) List<NoteItem> notes
) {

    @Schema(description = "5 tiêu chí; tour cần đạt tối thiểu 3/5 để được duyệt")
    public record ReviewCriteria(
            @Schema(description = "Tính tương tác: khách được thực hành, chạm, thử nghiệm")
            @NotNull(message = "Vui lòng đánh giá tiêu chí Tính tương tác") Boolean interactive,
            @Schema(description = "Tính bản địa: người dẫn / chia sẻ có chuyên môn hoặc là người địa phương")
            @NotNull(message = "Vui lòng đánh giá tiêu chí Tính bản địa") Boolean localExpertise,
            @Schema(description = "Tính câu chuyện: lịch trình có chủ đề rõ ràng")
            @NotNull(message = "Vui lòng đánh giá tiêu chí Tính câu chuyện") Boolean storytelling,
            @Schema(description = "Tỷ trọng văn hóa > 50%, không lồng ghép điểm mua sắm đại trà")
            @NotNull(message = "Vui lòng đánh giá tiêu chí Tỷ trọng văn hóa") Boolean culturalRatio,
            @Schema(description = "Hình ảnh / video tập trung vào con người, hoạt động; không dùng ảnh mạng")
            @NotNull(message = "Vui lòng đánh giá tiêu chí Hình ảnh / video") Boolean authenticMedia
    ) {
        public int passedCount() {
            int count = 0;
            for (Boolean value : new Boolean[]{interactive, localExpertise, storytelling, culturalRatio, authenticMedia}) {
                if (Boolean.TRUE.equals(value)) count++;
            }
            return count;
        }
    }

    @Schema(description = "Ghi chú gắn vào một vị trí của tour")
    public record NoteItem(
            @Schema(description = "BASIC_INFO | PRICING | STOPS | SCHEDULE")
            @NotNull(message = "Vui lòng chọn bước gắn ghi chú") TourReviewStep step,
            @Schema(description = "ID điểm đến (tour_stops) khi ghi chú thuộc bước 3") Long stopId,
            @Schema(description = "Trường bị gắn cờ, ví dụ quiz[1], images") @Size(max = 100) String field,
            @Schema(description = "Nội dung ghi chú", example = "Câu hỏi quiz số 2 có hai đáp án đúng")
            @NotBlank(message = "Nội dung ghi chú không được để trống") @Size(max = 2000) String note
    ) {}
}
