package com.journeygo.modules.tour.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

/**
 * Lịch khởi hành của các tour đã xuất bản, gom theo từng ngày — cho màn "Xem tour theo ngày" của du khách.
 *
 * <p>Chỉ gồm những ngày có ít nhất một tour mở bán; mỗi ngày liệt kê các tour khởi hành ngày đó
 * kèm số chỗ còn (cùng cách tính với {@code GET /tours/{id}/availability}).
 */
@Builder
@Schema(description = "Lịch khởi hành theo ngày của các tour đã xuất bản")
public record TourDeparturesResponse(
        @Schema(description = "Ngày bắt đầu khoảng (đã kẹp về hôm nay nếu nhỏ hơn)") LocalDate from,
        @Schema(description = "Ngày kết thúc khoảng") LocalDate to,
        @Schema(description = "Các ngày có tour khởi hành, sắp tăng dần") List<DepartureDay> days
) {

    @Builder
    @Schema(description = "Một ngày và các tour khởi hành trong ngày")
    public record DepartureDay(
            LocalDate date,
            @Schema(description = "Tour khởi hành ngày này, còn chỗ trước, hết chỗ sau") List<DepartureTour> tours
    ) {
    }

    /**
     * @param tour      thông tin thẻ tour (giống danh sách tour đã xuất bản)
     * @param capacity  tổng số chỗ của ngày
     * @param remaining số chỗ còn
     * @param available đặt được ngày này không (còn chỗ và slot đang mở)
     */
    @Builder
    @Schema(description = "Một tour khởi hành trong ngày kèm số chỗ còn")
    public record DepartureTour(
            TourResponse tour,
            Integer capacity,
            Integer remaining,
            boolean available
    ) {
    }
}
