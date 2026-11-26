package com.journeygo.modules.tourmerge.entity.enums;

import java.util.List;

/**
 * Vòng đời yêu cầu ghép đoàn B2B 1-1 giữa 2 Provider.
 */
public enum TourMergeStatus {
    /** Provider khởi tạo đã gửi yêu cầu, đang chờ Provider còn lại xác nhận. */
    PENDING_PROVIDER,
    /** Hai Provider đã đồng thuận, đang chờ Moderator kiểm tra và duyệt. */
    PENDING_MOD,
    /** Moderator đã duyệt ghép đoàn; 2 slot dùng chung trần sức chứa mergedCapacity. */
    APPROVED,
    /** Bị Provider còn lại hoặc Moderator từ chối. */
    REJECTED,
    /** Đã hủy ghép / tách đoàn; mỗi slot quay về vận hành độc lập. */
    CANCELLED;

    /** Các trạng thái đang chiếm quyền ghép 1-1 của một slot. */
    public static final List<TourMergeStatus> ACTIVE_STATUSES = List.of(
            PENDING_PROVIDER,
            PENDING_MOD,
            APPROVED
    );

    public boolean isActive() {
        return this == PENDING_PROVIDER || this == PENDING_MOD || this == APPROVED;
    }
}
