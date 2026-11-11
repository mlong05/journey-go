package com.journeygo.modules.booking.dto.request;

import com.journeygo.modules.tour.entity.GuestType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * Yêu cầu đặt tour — có thể đặt cho bản thân hoặc cho cả nhóm.
 *
 * <p>Luồng: Người dùng chọn tour → Chọn ngày trải nghiệm → Chọn số hành khách theo loại
 * (Người lớn / Trẻ em / Trẻ nhỏ / Em bé — tùy theo đối tác thiết lập cho tour) → Nhập thông
 * tin hành khách → Thanh toán → Hoàn tất.
 *
 * <p>Hành khách Người lớn: đầy đủ Họ tên, Ngày sinh, Giới tính, Email.
 * Trẻ em / Trẻ nhỏ / Em bé: chỉ cần Họ tên, Ngày sinh, Giới tính.
 */
@Schema(description = "Yêu cầu đặt tour (có thể đặt cho cả nhóm)")
public record CreateBookingRequest(

        @Schema(description = "ID tour cần đặt", example = "1")
        @NotNull(message = "Tour không được để trống")
        Long tourId,

        @Schema(description = "Ngày trải nghiệm — dùng để tính tuổi hành khách và kiểm tra slot",
                example = "2026-11-20")
        @NotNull(message = "Ngày trải nghiệm không được để trống")
        LocalDate experienceDate,

        @Schema(description = "Danh sách hành khách trong nhóm. Người đặt cũng phải có trong danh sách này.")
        @NotEmpty(message = "Vui lòng nhập thông tin ít nhất một hành khách")
        @Valid
        List<PassengerRequest> passengers,

        @Schema(description = "Ghi chú của người đặt (không bắt buộc)")
        @Size(max = 1000)
        String note
) {

    /**
     * Thông tin một hành khách.
     *
     * @param fullName  họ và tên — bắt buộc
     * @param birthDate ngày sinh — bắt buộc (dùng tính loại khách theo ngày trải nghiệm)
     * @param gender   giới tính — bắt buộc
     * @param email    email — bắt buộc với Người lớn (để nhận vé / lời mời)
     * @param guestType loại khách — để trống thì hệ thống tự tính từ ngày sinh
     */
    @Schema(description = "Thông tin một hành khách")
    public record PassengerRequest(

            @Schema(description = "Họ và tên", example = "Nguyễn Văn A")
            @NotBlank(message = "Họ và tên không được để trống")
            @Size(max = 200)
            String fullName,

            @Schema(description = "Ngày sinh (yyyy-MM-dd)", example = "1990-05-20")
            @NotNull(message = "Ngày sinh không được để trống")
            LocalDate birthDate,

            @Schema(description = "Giới tính: MALE | FEMALE | OTHER", example = "MALE")
            @NotBlank(message = "Giới tính không được để trống")
            @Size(max = 20)
            String gender,

            @Schema(description = "Email — bắt buộc với Người lớn", example = "a@gmail.com")
            @Email(message = "Email không hợp lệ")
            @Size(max = 255)
            String email,

            @Schema(description = "Loại khách — để trống thì hệ thống tự tính theo tuổi tại ngày trải nghiệm")
            GuestType guestType
    ) {
    }
}
