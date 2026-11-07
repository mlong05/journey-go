package com.journeygo.modules.partnerapplication.repository;

import com.journeygo.modules.partnerapplication.entity.PartnerVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PartnerVerificationTokenRepository extends JpaRepository<PartnerVerificationToken, Long> {

    Optional<PartnerVerificationToken> findByTokenAndUsedFalse(String token);

    List<PartnerVerificationToken> findByEmailIgnoreCaseAndUsedFalse(String email);
}
