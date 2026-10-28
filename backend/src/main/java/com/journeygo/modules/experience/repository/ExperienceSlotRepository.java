package com.journeygo.modules.experience.repository;

import com.journeygo.modules.experience.entity.ExperienceSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExperienceSlotRepository extends JpaRepository<ExperienceSlot, Long> {

    List<ExperienceSlot> findByExperienceIdOrderBySlotDateAsc(Long experienceId);

    Optional<ExperienceSlot> findByExperienceIdAndSlotDate(Long experienceId, LocalDate slotDate);

    @Query("""
            SELECT s FROM ExperienceSlot s
            JOIN FETCH s.experience e
            JOIN FETCH e.createdBy
            WHERE s.id = :id
            """)
    Optional<ExperienceSlot> findByIdWithOwner(@Param("id") Long id);

    // ── Nguyên tử (atomic) cho luồng giữ chỗ / giải phóng slot ──────────────────

    /**
     * Giữ chỗ MỘT CÁCH NGUYÊN TỬ trên một slot.
     *
     * <p>Thực hiện bằng một câu {@code UPDATE ... WHERE booked_tour_count < max_tour_per_day}
     * — hai request đồng thời không thể cùng chiếm slot cuối cùng (chống overselling).
     *
     * @return số hàng được cập nhật (1 = giữ chỗ thành công, 0 = hết chỗ / không hợp lệ)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE ExperienceSlot s
            SET s.bookedTourCount = s.bookedTourCount + 1
            WHERE s.id = :slotId
              AND s.maxTourPerDay > 0
              AND s.bookedTourCount < s.maxTourPerDay
            """)
    int atomicReserveSlot(@Param("slotId") Long slotId);

    /**
     * Giải phóng chỗ trên một slot — chỉ giảm khi còn chỗ đã đặt.
     *
     * @return số hàng được cập nhật (0 nghĩa là slot đã ở trạng thái 0 — không âm số dư)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE ExperienceSlot s
            SET s.bookedTourCount = s.bookedTourCount - 1
            WHERE s.id = :slotId
              AND s.bookedTourCount > 0
            """)
    int atomicReleaseSlot(@Param("slotId") Long slotId);

    /**
     * Lấy các slot của một Experience theo ngày — dùng khi tổng hợp slot cần giữ cho Booking.
     */
    @Query("""
            SELECT s FROM ExperienceSlot s
            WHERE s.experience.id IN :experienceIds
              AND s.slotDate = :slotDate
            """)
    List<ExperienceSlot> findByExperienceIdsAndDate(@Param("experienceIds") List<Long> experienceIds,
                                                    @Param("slotDate") LocalDate slotDate);
}
