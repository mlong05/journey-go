package com.journeygo.modules.auth.service;

import com.journeygo.modules.auth.entity.InvalidatedToken;
import com.journeygo.modules.auth.repository.InvalidatedTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private final InvalidatedTokenRepository invalidatedTokenRepository;

    @Transactional
    public void blacklistToken(String token, Instant expiryTime) {
        if (token == null || token.isBlank()) {
            return;
        }

        if (expiryTime == null || expiryTime.isBefore(Instant.now())) {
            return;
        }

        InvalidatedToken invalidatedToken = InvalidatedToken.builder()
                .id(token)
                .expiryTime(expiryTime)
                .build();

        invalidatedTokenRepository.save(invalidatedToken);
        log.info("Access Token đã được đưa vào blacklist thành công");
    }

    @Transactional(readOnly = true)
    public boolean isBlacklisted(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        return invalidatedTokenRepository.existsById(token);
    }
}
