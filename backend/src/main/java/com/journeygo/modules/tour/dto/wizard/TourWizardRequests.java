package com.journeygo.modules.tour.dto.wizard;

import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.QuestionType;
import com.journeygo.modules.tour.entity.TourFormat;
import com.journeygo.modules.tour.entity.VideoSource;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Request của luồng tạo tour 5 bước.
 *
 * <p>Đây là dữ liệu <b>lưu nháp</b> (tự động lưu): chỉ giới hạn độ dài / miền giá trị, cho phép
 * thiếu trường. Điều kiện đầy đủ được kiểm tra khi gửi duyệt ({@code TourSubmissionValidator}).
 */
public final class TourWizardRequests {

    private TourWizardRequests() {}

    @Schema(description = "Tạo bản nháp tour mới")
    public record CreateDraft(
            @Schema(description = "Tên tour — không bắt buộc khi tạo bản nháp (điền ở bước 1, kiểm tra khi gửi duyệt)",
                    example = "Theo chân thợ mộc khám phá kiến trúc gỗ Hội An")
            @Size(max = 80, message = "Tên tour tối đa 80 ký tự")
            String title
    ) {}

    @Schema(description = "Bước 1 — Thông tin cơ bản")
    public record BasicInfo(
            @Size(max = 80, message = "Tên tour tối đa 80 ký tự") String title,
            @Schema(description = "DAY_TRIP (trong ngày) hoặc MULTI_DAY (nhiều ngày)") TourFormat tourFormat,
            @Schema(description = "Thời lượng tour trong ngày (phút), ví dụ 270 = 4 giờ 30 phút")
            @Min(value = 1, message = "Thời lượng phải lớn hơn 0") @Max(value = 1439, message = "Tour trong ngày phải dưới 24 giờ")
            Integer durationMinutes,
            @Min(value = 1, message = "Số ngày phải lớn hơn 0") @Max(value = 60) Integer durationDays,
            @Min(value = 0, message = "Số đêm không được âm") @Max(value = 60) Integer durationNights,
            @Schema(description = "ID khu vực (Admin quản lý)") Long regionId,
            @Schema(description = "ID chủ đề (Admin quản lý)") Long themeId,
            @Size(max = 10000) String description,
            @Schema(description = "3–5 điểm nổi bật")
            @Size(max = 5, message = "Tối đa 5 điểm nổi bật") List<@Size(max = 300) String> highlights,
            @Schema(description = "Ảnh của tour (ít nhất 5 ảnh khi gửi duyệt)")
            @Size(max = 30, message = "Tối đa 30 ảnh") List<@Size(max = 1000) String> images,
            @Schema(description = "Ảnh bìa — phải là một trong các ảnh ở trên")
            @Size(max = 1000) String coverImageUrl,
            @Schema(description = "Lịch trình theo ngày (tour trong ngày: 1 mục)")
            @Valid @Size(max = 60, message = "Tối đa 60 ngày") List<ItineraryDayItem> itinerary,
            @Schema(description = "Những thông tin cần lưu ý — Giá tour bao gồm")
            @Size(max = 5000) String priceIncludes,
            @Schema(description = "Những thông tin cần lưu ý — Giá tour không bao gồm")
            @Size(max = 5000) String priceExcludes,
            @Schema(description = "Những thông tin cần lưu ý — Trường hợp bất khả kháng")
            @Size(max = 5000) String forceMajeure,
            @Schema(description = "Những thông tin cần lưu ý — Chính sách hỗ trợ hoàn tiền")
            @Size(max = 5000) String refundPolicy,
            @Schema(description = "Những thông tin cần lưu ý — Liên hệ")
            @Size(max = 2000) String contactInfo
    ) {}

    @Schema(description = "Một ngày trong lịch trình (dạng chữ)")
    public record ItineraryDayItem(
            @Schema(description = "Chặng, ví dụ \"Sapa – Fansipan\"") @Size(max = 200) String title,
            @Schema(description = "Hoạt động chính") @Size(max = 500) String mainActivity,
            @Schema(description = "Nội dung: mỗi dòng một ý, **chữ** để in đậm") @Size(max = 5000) String content
    ) {}

    @Schema(description = "Bước 4 — Lịch trình theo ngày (tour trong ngày: 1 mục)")
    public record Itinerary(
            @Valid @Size(max = 60, message = "Tối đa 60 ngày") List<ItineraryDayItem> itinerary
    ) {}

    @Schema(description = "Giá của một loại khách")
    public record PriceItem(
            @NotNull(message = "Loại khách không được để trống") GuestType guestType,
            @DecimalMin(value = "0", message = "Giá không được âm") @Digits(integer = 10, fraction = 2) BigDecimal price,
            @Schema(description = "Loại khách này chiếm 1 chỗ trong slot") Boolean countsTowardSlot
    ) {}

    @Schema(description = "Bước 2 — Giá vé, số chỗ, chính sách hủy")
    public record Pricing(
            @Valid @Size(max = 4) List<PriceItem> prices,
            @Min(value = 1, message = "Số chỗ tối đa mỗi slot phải lớn hơn 0") @Max(value = 10000) Integer maxGuestsPerSlot,
            @Size(max = 5000) String cancellationPolicy
    ) {}

    @Schema(description = "Một đáp án")
    public record AnswerItem(
            @Size(max = 1000) String content,
            @Schema(description = "Đáp án đúng") Boolean correct
    ) {}

    @Schema(description = "Câu hỏi. Quiz luôn là trắc nghiệm; câu hỏi sau trải nghiệm luôn là nhập chữ (trường type bị bỏ qua)")
    public record QuestionItem(
            @Schema(description = "Không dùng — dạng câu hỏi cố định theo vị trí câu hỏi")
            QuestionType type,
            @Size(max = 2000) String content,
            @Schema(description = "Quiz (trắc nghiệm): đúng 4 đáp án, 1 đáp án đúng")
            @Valid @Size(max = 4, message = "Mỗi câu hỏi có đúng 4 đáp án") List<AnswerItem> answers,
            @Schema(description = "Câu hỏi sau trải nghiệm (nhập chữ): đáp án đúng; nhiều đáp án chấp nhận cách nhau bằng dấu ;")
            @Size(max = 2000) String referenceAnswer
    ) {}

    @Schema(description = "Cổ vật")
    public record ArtifactItem(
            @Size(max = 200) String name,
            @Size(max = 1000) String imageUrl,
            @Size(max = 2000) String shortDescription,
            @Size(max = 1000) String videoUrl,
            VideoSource videoSource
    ) {}

    @Schema(description = "Trải nghiệm thực tế")
    public record ExperienceItem(
            @Size(max = 200) String activityName,
            @DecimalMin(value = "-90") @DecimalMax(value = "90") BigDecimal checkpointLatitude,
            @DecimalMin(value = "-180") @DecimalMax(value = "180") BigDecimal checkpointLongitude,
            @Schema(description = "Bán kính checkpoint (mét), mặc định 50")
            @Min(value = 10, message = "Bán kính tối thiểu 10m") @Max(value = 500, message = "Bán kính tối đa 500m") Integer radiusMeters,
            @Schema(description = "Thời gian trải nghiệm (giây), hết giờ thì hiện câu hỏi")
            @Min(value = 1, message = "Thời gian trải nghiệm phải lớn hơn 0") @Max(value = 86400) Integer durationSeconds,
            @Schema(description = "Mã QR xác nhận hoàn thành (JGE- + 16 ký tự hex). Gửi lại mã cũ để giữ QR đã in; để trống thì sinh mã mới")
            @Size(max = 40) String qrToken,
            @Schema(description = "Câu hỏi sau trải nghiệm (nhập chữ)")
            @Valid QuestionItem question
    ) {}

    @Schema(description = "Một điểm đến của tour. Có id = cập nhật điểm đến đã có; không có id = thêm mới")
    public record StopItem(
            Long id,
            @Size(max = 200) String name,
            @Size(max = 2000) String shortDescription,
            @Size(max = 2000) String guestNote,
            @Size(max = 1000) String imageUrl,
            @Schema(description = "Video giới thiệu điểm đến (không bắt buộc)")
            @Size(max = 1000) String videoUrl,
            VideoSource videoSource,
            @Schema(description = "Nội dung văn hóa (câu chuyện) — chỉ mở cho khách sau khi check-in")
            @Size(max = 20000) String culturalContent,
            @Size(max = 20) List<@Size(max = 1000) String> culturalImages,
            @Valid @Size(max = 20) List<ArtifactItem> artifacts,
            @Schema(description = "Quiz — câu hỏi trắc nghiệm (1–4 câu khi gửi duyệt)")
            @Valid @Size(max = 4, message = "Quiz tối đa 4 câu") List<QuestionItem> quiz,
            @Schema(description = "Trải nghiệm thực tế (1–5 khi gửi duyệt)")
            @Valid @Size(max = 5, message = "Tối đa 5 trải nghiệm thực tế mỗi điểm đến") List<ExperienceItem> experiences
    ) {}

    @Schema(description = "Bước 3 — Danh sách điểm đến theo thứ tự (thứ tự trong mảng = thứ tự kéo thả)")
    public record Stops(
            @NotNull(message = "Danh sách điểm đến không được để trống")
            @Valid @Size(max = 30, message = "Tối đa 30 điểm đến") List<StopItem> stops
    ) {}

    @Schema(description = "Bước 4 — Các ngày khởi hành được chọn trên lịch")
    public record Schedule(
            @NotNull(message = "Danh sách ngày không được để trống")
            @Size(max = 400, message = "Tối đa 400 ngày khởi hành") List<@NotNull LocalDate> departureDates
    ) {}

    @Schema(description = "Bước 5 — Gửi duyệt")
    public record Submit(
            @Schema(description = "Cam kết quyền sử dụng hình ảnh, video, nội dung và nguồn lịch sử đáng tin cậy")
            Boolean contentRightsConfirmed
    ) {}
}
