package com.journeygo.modules.tour.repository;

import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TourSlotRepository extends JpaRepository<TourSlot, Long> {

    List<TourSlot> findByTour_TourIdOrderBySlotDateAsc(Long tourId);

    Optional<TourSlot> findByTour_TourIdAndSlotDate(Long tourId, LocalDate slotDate);

    List<TourSlot> findByTour_TourIdAndSlotDateInAndStatus(Long tourId, List<LocalDate> dates, TourSlotStatus status);

    /**
     * Lấy slot kèm khóa pessimistic write — dùng khi cần đảm bảo tính nguyên tử khi
     * nhiều người đặt cùng một ngày.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM TourSlot s WHERE s.tour.tourId = :tourId AND s.slotDate = :slotDate")
    Optional<TourSlot> findByTourAndDateForUpdate(@Param("tourId") Long tourId,
                                                   @Param("slotDate") LocalDate slotDate);

    /**
     * Giữ chỗ N slot trên một {@link TourSlot} bằng một câu UPDATE có điều kiện.
     *
     * <p>Trả về số hàng được cập nhật: {@code 1} = giữ chỗ thành công, {@code 0} = không
     * đủ chỗ (slot đã hết hoặc đã đóng). Nhờ điều kiện {@code booked_count + :n <= capacity}
     * nằm ngay trong câu UPDATE ⇒ không thể overselling kể cả khi nhiều request chạy song song.
     *
     * <p>⚠️ {@code clearAutomatically = false} là BẮT BUỘC: nếu để {@code true}, Hibernate sẽ
     * DETACH mọi entity đang được quản lý trong PersistenceContext — trong đó có
     * {@code Booking} — giữa transaction. Sau đó {@code BookingResponse.fromEntity(booking)}
     * truy cập collection lazy {@code booking.getSlotHolds()} sẽ ném
     * {@code LazyInitializationException: could not initialize proxy - no Session}.
     */
    @Modifying(clearAutomatically = false, flushAutomatically = true)
    @Query("""
            UPDATE TourSlot s
            SET s.bookedCount = s.bookedCount + :count
            WHERE s.id = :slotId
              AND s.status = com.journeygo.modules.tour.entity.TourSlotStatus.OPEN
              AND s.capacity > 0
              AND s.bookedCount + :count <= s.capacity
            """)
    int atomicReserveSlots(@Param("slotId") Long slotId, @Param("count") int count);

    /**
     * Giải phóng N slot trên một {@link TourSlot} — chỉ giảm khi còn chỗ đã đặt.
     *
     * <p>⚠️ {@code clearAutomatically = false} — xem giải thích ở {@link #atomicReserveSlots}.
     *
     * @return số hàng được cập nhật (0 nghĩa là slot đã ở trạng thái 0 — không âm số dư)
     */
    @Modifying(clearAutomatically = false, flushAutomatically = true)
    @Query("""
            UPDATE TourSlot s
            SET s.bookedCount = s.bookedCount - :count
            WHERE s.id = :slotId
              AND s.bookedCount > 0
            """)
    int atomicReleaseSlots(@Param("slotId") Long slotId, @Param("count") int count);
}
