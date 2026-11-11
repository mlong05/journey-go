package com.journeygo.modules.booking.repository;

import com.journeygo.modules.booking.entity.BookingPassengerInvitation;
import com.journeygo.modules.booking.entity.enums.InvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingPassengerInvitationRepository extends JpaRepository<BookingPassengerInvitation, Long> {

    Optional<BookingPassengerInvitation> findByInvitationTokenHash(String tokenHash);

    List<BookingPassengerInvitation> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    List<BookingPassengerInvitation> findByPassenger_IdOrderByCreatedAtDesc(Long passengerId);

    /** Lời mời đang chờ xác nhận của một hành khách (dùng để chặn tạo trùng). */
    List<BookingPassengerInvitation> findByPassenger_IdAndStatus(Long passengerId, InvitationStatus status);

    /** Lời mời đang chờ xác nhận của một booking (dùng để vô hiệu hóa khi hủy booking). */
    List<BookingPassengerInvitation> findByBooking_IdAndStatus(Long bookingId, InvitationStatus status);

    /**
     * Các lời mời đang chờ xác nhận gửi tới một EMAIL.
     *
     * <p>Dùng để tìm lời mời cho người dùng vừa đăng ký / đăng nhập: họ có thể
     * không có tài khoản lúc được mời (email mới), nên không có notification nào
     * gửi được ⇒ phải tra cứu theo email khi họ vào app.
     */
    @Query("""
            select i from BookingPassengerInvitation i
            where lower(i.invitedEmail) = lower(:email)
              and i.status = :status
            order by i.createdAt desc
            """)
    List<BookingPassengerInvitation> findByInvitedEmailAndStatus(
            @Param("email") String email,
            @Param("status") InvitationStatus status);

    /** Lời mời theo id (dùng cho luồng xác nhận trong app, không cần deep link). */
    @Query("""
            select i from BookingPassengerInvitation i
            where i.id = :id
            """)
    Optional<BookingPassengerInvitation> findByIdWithRelations(@Param("id") Long id);
}
