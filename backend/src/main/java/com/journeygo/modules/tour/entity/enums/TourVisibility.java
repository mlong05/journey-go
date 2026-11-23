package com.journeygo.modules.tour.entity.enums;

/**
 * Quyền xem tour:
 * ALL: Công khai cho mọi người
 * SPECIFIC_USER: Chỉ người dùng được chỉ định (theo email) mới thấy và đặt mua
 */
public enum TourVisibility {
    /** Tour công khai — tất cả người dùng đều thấy. */
    ALL,
    /** Tour riêng — chỉ người dùng được chỉ định (theo email) mới thấy. */
    SPECIFIC_USER
}
