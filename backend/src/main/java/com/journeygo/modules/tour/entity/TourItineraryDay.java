package com.journeygo.modules.tour.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

/**
 * Bước 1 — một ngày trong lịch trình (dạng chữ, không gắn với điểm đến).
 * Thứ tự ngày = vị trí trong danh sách của tour.
 */
@Embeddable
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourItineraryDay {

    /**
     * Ngày thứ mấy (1, 2, …) — luôn có giá trị. Nhờ cột bắt buộc này, ngày bỏ trống không bị Hibernate
     * coi là phần tử null (mọi cột null) rồi INSERT trùng khóa (tour_id, position) khi lưu lại.
     */
    @Column(name = "day_number", nullable = false)
    private int dayNumber;

    /** Chặng, ví dụ "Sapa – Fansipan". */
    @Column(name = "title", length = 200)
    private String title;

    /** Hoạt động chính — hiển thị nổi bật. */
    @Column(name = "main_activity", length = 500)
    private String mainActivity;

    /** Nội dung: mỗi dòng một ý; **chữ** được in đậm khi hiển thị. */
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;
}
