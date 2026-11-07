package com.journeygo.modules.partnerapplication.repository;

import com.journeygo.modules.partnerapplication.entity.PartnerApplicationOtp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PartnerApplicationOtpRepository extends JpaRepository<PartnerApplicationOtp, Long> {

    Optional<PartnerApplicationOtp> findTopByEmailIgnoreCaseAndUsedFalseOrderByCreatedAtDesc(String email);

    /** Số lần gửi OTP cho email trong khoảng thời gian (giới hạn 3 lần/ngày). */
    long countByEmailIgnoreCaseAndCreatedAtBetween(String email, Instant from, Instant to);

    List<PartnerApplicationOtp> findByEmailIgnoreCase(String email);
}
