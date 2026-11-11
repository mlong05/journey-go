package com.journeygo.modules.booking.dto.request;

import com.journeygo.modules.tour.entity.GuestType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Yêu cầu thay đổi một hành khách trong Booking (ví dụ: thay hành khách E bằng F).
 *
 * <p>Người đặt gửi yêu cầu → đối tác duyệt/từ chối. Không được thay đổi loại khách nếu
 * chênh lệch giá chưa được xử lý.
 */
@Schema(description = "Yêu cầu thay đổi hành khách trong booking")
public record ChangePassengerRequest(

        @Schema(description = "Họ và tên hành khách mới", example = "Nguyễn Văn F")
        @NotBlank(message = "Họ tên hành khách mới không được để trống")
        @Size(max = 120, message = "Họ tên không được vượt quá 120 ký tự")
        String fullName,

        @Schema(description = "Ngày sinh hành khách mới", example = "1995-05-20")
        @NotNull(message = "Ngày sinh không được để trống")
        @Past(message = "Ngày sinh phải nằm trong quá khứ")
        LocalDate birthDate,

        @Schema(description = "Giới tính: MALE | FEMALE | OTHER", example = "MALE")
        @NotBlank(message = "Giới tính không được để trống")
        @Pattern(regexp = "MALE|FEMALE|OTHER", message = "Giới tính không hợp lệ")
        String gender,

        @Schema(description = "Email hành khách mới (bắt buộc nếu là người lớn)")
        @Pattern(regexp = "^$|^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
                message = "Email không hợp lệ")
        String email,

        @Schema(description = "Loại khách mong muốn (nếu để trống sẽ tự tính từ ngày sinh)")
        GuestType guestType,

        @Schema(description = "Lý do thay đổi")
        @Size(max = 1000, message = "Lý do không được vượt quá 1000 ký tự")
        String reason
) {
}
