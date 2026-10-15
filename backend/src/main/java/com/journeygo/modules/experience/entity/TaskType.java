package com.journeygo.modules.experience.entity;

import com.journeygo.modules.experience.entity.enums.VerificationMethod;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Master data: loại task trong Experience.
 *
 * Theo CONTEXT §3 mới: chỉ 2 loại:
 *   - QUIZ: câu hỏi trắc nghiệm / text 4 phương án. has_questions=true, requires_location=false.
 *           verification: ANSWER_MATCH.
 *   - REAL_WORLD_INTERACTIVE: câu hỏi tương tác ngoài thực tế — Tourist phải đến vị trí (GPS check-in)
 *           thì mới được phép trả lời text answer. has_questions=true, requires_location=true.
 *           verification: ANSWER_MATCH (sau khi pass Location Verification).
 *
 * Seed 2 loại trong DataInitializer.
 */
@Entity
@Table(name = "task_type")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "has_questions", nullable = false)
    @Builder.Default
    private boolean hasQuestions = false;

    @Column(name = "requires_location", nullable = false)
    @Builder.Default
    private boolean requiresLocation = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_method", length = 50)
    private VerificationMethod verificationMethod;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
