package com.journeygo.modules.experience.entity;

import com.journeygo.modules.experience.entity.enums.QuestionType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "question")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;


    /** Ảnh minh hoạ cho câu hỏi (URL https tải lên qua /upload/image). Không bắt buộc. */
    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "expected_text", length = 500)
    private String expectedText;

    /**
     * Địa điểm du khách phải check-in (GPS hoặc QR) để được trả lời câu hỏi này.
     * Chỉ dùng cho câu hỏi của nhiệm vụ loại "tương tác ngoài thực tế".
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "check_in_point_id")
    private CheckInPoint checkInPoint;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 20)
    @Builder.Default
    private QuestionType questionType = QuestionType.MULTIPLE_CHOICE;

    @Column(name = "sequence_order", nullable = false)
    @Builder.Default
    private Integer sequenceOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<Answer> answers = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
