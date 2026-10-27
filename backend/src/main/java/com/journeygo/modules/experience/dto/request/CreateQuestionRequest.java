package com.journeygo.modules.experience.dto.request;

import com.journeygo.modules.experience.entity.enums.QuestionType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

@Schema(description = "Yêu cầu tạo Question cho Task")
public record CreateQuestionRequest(

        @Schema(description = "Nội dung câu hỏi")
        @NotBlank(message = "Nội dung câu hỏi không được để trống")
        String content,

        @Schema(description = "Loại câu hỏi (MULTIPLE_CHOICE / TEXT)")
        @NotNull(message = "Question type không được để trống")
        QuestionType questionType,

        @Schema(description = "Thứ tự trong Task")
        @NotNull
        @Min(0)
        Integer sequenceOrder,

        @Schema(description = "Đáp án cho câu TEXT (so sánh không phân biệt hoa/thường)")
        @Size(max = 500)
        String expectedText,

        @Schema(description = "ID CheckInPoint nơi du khách phải check-in để trả lời. Bắt buộc với câu hỏi của nhiệm vụ tương tác ngoài thực tế")
        Long checkInPointId
) {}
