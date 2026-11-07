package com.journeygo.modules.partnerapplication.repository;

import com.journeygo.modules.partnerapplication.entity.PartnerActivationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PartnerActivationTokenRepository extends JpaRepository<PartnerActivationToken, Long> {

    Optional<PartnerActivationToken> findByTokenAndUsedFalse(String token);

    Optional<PartnerActivationToken> findTopByUser_IdAndUsedFalseOrderByCreatedAtDesc(Long userId);
}
