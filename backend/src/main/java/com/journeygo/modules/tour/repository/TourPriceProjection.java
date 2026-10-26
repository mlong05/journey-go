package com.journeygo.modules.tour.repository;

import java.math.BigDecimal;

/**
 * Kết quả tổng hợp giá tour.
 *
 * Giá của một tour KHÔNG được lưu trong DB mà tính động:
 * tổng giá của tất cả Experience thuộc các điểm đến nằm trong hành trình tour.
 *
 * @param tourId     ID tour
 * @param totalPrice Tổng giá các Experience của các điểm đến trong tour
 */
public record TourPriceProjection(Long tourId, BigDecimal totalPrice) {
}
