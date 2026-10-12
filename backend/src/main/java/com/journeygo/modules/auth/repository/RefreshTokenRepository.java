package com.journeygo.modules.auth.repository;

import com.journeygo.modules.auth.entity.RefreshToken;
import com.journeygo.modules.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.revoked = true WHERE r.user = :user AND r.revoked = false")
    int revokeAllUserTokens(@Param("user") User user);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.revoked = true WHERE r.token = :token")
    int revokeByToken(@Param("token") String token);

    @Modifying
    @Query("DELETE FROM RefreshToken r WHERE r.expiryDate < :now OR r.revoked = true")
    int deleteExpiredOrRevokedTokens(@Param("now") Instant now);
}
