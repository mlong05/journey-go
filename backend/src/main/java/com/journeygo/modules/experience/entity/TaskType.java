package com.journeygo.modules.experience.entity;

import com.journeygo.modules.experience.entity.enums.VerificationMethod;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

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
