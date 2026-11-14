package com.journeygo.modules.tour.repository;

import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.TourPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface TourPriceRepository extends JpaRepository<TourPrice, Long> {

    /** Giá theo một loại khách cho nhiều tour cùng lúc (tránh N+1 khi dựng danh sách tour). */
    @Query("SELECT p FROM TourPrice p WHERE p.tour.tourId IN :tourIds AND p.guestType = :guestType")
    List<TourPrice> findByTourIdsAndGuestType(@Param("tourIds") Collection<Long> tourIds,
                                              @Param("guestType") GuestType guestType);

    /** Toàn bộ bảng giá của một tour (mọi loại khách) — dùng khi chốt giá Booking. */
    List<TourPrice> findByTour_TourId(Long tourId);
}
