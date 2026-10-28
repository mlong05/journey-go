package com.journeygo.modules.booking.service;

import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.ExperienceSlot;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.ExperienceSlotRepository;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourDestination;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Tra cứu thông tin giá và slot của một Tour phục vụ luồng Booking.
 *
 * <p>Giá tour được tính động từ các Experience thuộc các điểm đến trong hành trình
 * (giống {@code TourRepository.calculateTotalPriceByTourId}) — nhưng ở đây trả về danh sách
 * chi tiết để Booking có thể chốt giá từng Experience và giữ slot tương ứng.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TourBookingCatalogService {

    private final ExperienceRepository experienceRepository;
    private final ExperienceSlotRepository slotRepository;

    /**
     * Một Experience kèm giá và slot tương ứng với ngày trải nghiệm.
     */
    public record ExperienceQuote(Long experienceId, String title, BigDecimal price,
                                   ExperienceSlot slot, boolean hasCapacity) {}

    /**
     * Lấy danh sách Experience của tour kèm giá và slot theo ngày.
     */
    @Transactional(readOnly = true)
    public List<ExperienceQuote> quoteExperiences(Tour tour, LocalDate experienceDate) {
        List<Long> destinationIds = tour.getTourDestinations() == null
                ? List.of()
                : tour.getTourDestinations().stream()
                        .map(TourDestination::getDestination)
                        .filter(d -> d != null)
                        .map(d -> d.getId())
                        .toList();

        if (destinationIds.isEmpty()) {
            return List.of();
        }

        List<Experience> experiences = experienceRepository
                .findByDestination_IdInOrderById(destinationIds);

        List<ExperienceQuote> quotes = new ArrayList<>();
        for (Experience exp : experiences) {
            if (exp.getStatus() == ExperienceStatus.INACTIVE) {
                continue;
            }
            ExperienceSlot slot = slotRepository
                    .findByExperienceIdAndSlotDate(exp.getId(), experienceDate)
                    .orElse(null);

            boolean hasCapacity = slot != null
                    && slot.getMaxTourPerDay() != null
                    && slot.getMaxTourPerDay() > 0
                    && slot.getBookedTourCount() != null
                    && slot.getBookedTourCount() < slot.getMaxTourPerDay();

            quotes.add(new ExperienceQuote(exp.getId(), exp.getTitle(),
                    exp.getPrice() != null ? exp.getPrice() : BigDecimal.ZERO,
                    slot, hasCapacity));
        }

        quotes.sort(Comparator.comparing(ExperienceQuote::experienceId));
        return quotes;
    }

    /**
     * Tổng giá tour tại ngày trải nghiệm — cơ sở để chốt giá khi tạo Booking.
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateTotalPrice(Tour tour, LocalDate experienceDate) {
        return quoteExperiences(tour, experienceDate).stream()
                .map(ExperienceQuote::price)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
