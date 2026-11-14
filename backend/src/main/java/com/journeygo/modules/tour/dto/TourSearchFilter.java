package com.journeygo.modules.tour.dto;

import com.journeygo.modules.tour.entity.TourFormat;

/**
 * Bộ lọc danh sách tour công khai.
 *
 * @param q        từ khóa (tên tour, vùng miền, chủ đề), không phân biệt dấu và hoa thường
 * @param regionId vùng miền
 * @param themeId  chủ đề
 * @param format   DAY_TRIP / MULTI_DAY
 * @param order    thứ tự sắp xếp, mặc định mới nhất
 */
public record TourSearchFilter(String q, Long regionId, Long themeId, TourFormat format, Order order) {

    public enum Order {
        /** Mới xuất bản trước. */
        NEWEST,
        /** Giá thấp đến cao. */
        PRICE_ASC,
        /** Giá cao đến thấp. */
        PRICE_DESC,
        /** Ngày khởi hành gần nhất trước; tour không còn ngày khởi hành xếp cuối. */
        DEPARTURE
    }

    public TourSearchFilter {
        q = q == null || q.isBlank() ? null : q.trim();
        order = order == null ? Order.NEWEST : order;
    }

    public static TourSearchFilter none() {
        return new TourSearchFilter(null, null, null, null, Order.NEWEST);
    }

    /** Lọc được hoàn toàn trong DB và sắp theo cột có sẵn. */
    public boolean databaseOnly() {
        return q == null && order == Order.NEWEST;
    }
}
