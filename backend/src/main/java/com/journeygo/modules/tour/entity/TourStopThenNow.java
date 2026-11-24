package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

/** Cặp ảnh "xưa và nay" của điểm đến: du khách kéo thanh trượt để so sánh. */
@Entity
@Table(name = "tour_stop_then_now")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourStopThenNow {

    public static final int MAX_PER_STOP = 3;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stop_id", nullable = false)
    private TourStop stop;

    @Column(name = "sequence_order", nullable = false)
    private int sequenceOrder;

    /** Ảnh tư liệu. */
    @Column(name = "then_image_url", length = 1000)
    private String thenImageUrl;

    /** Ảnh hiện tại, chụp cùng góc. */
    @Column(name = "now_image_url", length = 1000)
    private String nowImageUrl;

    /** Nhãn thời điểm của ảnh tư liệu, vd. "1975". */
    @Column(name = "then_label", length = 50)
    private String thenLabel;

    @Column(name = "caption", columnDefinition = "TEXT")
    private String caption;

    /** Nguồn / bản quyền ảnh tư liệu (bắt buộc khi gửi duyệt). */
    @Column(name = "credit", length = 300)
    private String credit;
}
