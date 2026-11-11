package com.journeygo.modules.booking.service;

import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourPrice;
import com.journeygo.modules.tour.repository.TourPriceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Tra cứu bảng giá và quy tắc slot của một Tour phục vụ luồng Booking.
 *
 * <p>⚠️ Vì sao KHÔNG dùng giá của Experience nữa?
 * <p>Cấu trúc tour đã được hội đồng review đổi: tour luồng 5 bước định nghĩa giá theo
 * <b>loại khách</b> trong {@code tour_prices} ({@link TourPrice}) chứ không phải theo trải
 * nghiệm. Booking cũ lấy giá = tổng giá Experience của các điểm đến ⇒ không còn khớp với
 * bảng giá đối tác khai báo và cho tour mới không đặt được.
 *
 * <p>Bảng giá theo loại khách được đọc từ {@code tour_prices}:
 * <ul>
 *   <li>{@code price} — giá vé của loại khách đó.</li>
 *   <li>{@code countsTowardSlot} — loại khách này có chiếm 1 chỗ trong slot hay không
 *       (em bé thường không chiếm).</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TourBookingCatalogService {

    private final TourPriceRepository tourPriceRepository;
    private final com.journeygo.modules.tour.repository.TourRepository tourRepository;

    /**
     * Bảng giá của một tour theo loại khách.
     *
     * @param prices map {@link GuestType} → {@link TourPrice}
     */
    public record PriceTable(Map<GuestType, TourPrice> prices) {

        /** Giá của một loại khách (0 nếu tour không bán loại khách đó). */
        public BigDecimal priceOf(GuestType guestType) {
            TourPrice p = prices.get(guestType);
            return p == null || p.getPrice() == null ? BigDecimal.ZERO : p.getPrice();
        }

        /** Loại khách này có chiếm slot hay không (mặc định: có). */
        public boolean countsTowardSlot(GuestType guestType) {
            // Em bé luôn miễn phí và không chiếm chỗ — bất kể đối tác khai báo thế nào.
            if (guestType != null && guestType.isAlwaysFree()) {
                return false;
            }
            TourPrice p = prices.get(guestType);
            return p == null || p.isCountsTowardSlot();
        }

        /** Tour có bán loại khách này không. */
        public boolean sells(GuestType guestType) {
            return prices.containsKey(guestType);
        }

        /** Các loại khách tour đang bán. */
        public List<GuestType> soldGuestTypes() {
            return prices.keySet().stream().sorted(java.util.Comparator.comparing(Enum::ordinal)).toList();
        }
    }

    /**
     * Đọc bảng giá của tour.
     *
     * <p>Tour luồng 5 bước có {@code tour_prices}; tour cũ (không có) coi như một bảng
     * rỗng ⇒ phần giá sẽ do tầng trên xử lý.
     */
    @Transactional(readOnly = true)
    public PriceTable priceTable(Tour tour) {
        Map<GuestType, TourPrice> map = new EnumMap<>(GuestType.class);
        if (tour == null || tour.getTourId() == null) {
            return new PriceTable(map);
        }
        List<TourPrice> rows = tourPriceRepository.findByTour_TourId(tour.getTourId());
        for (TourPrice p : rows) {
            if (p.getGuestType() != null) {
                map.put(p.getGuestType(), p);
            }
        }
        return new PriceTable(map);
    }

    /**
     * Bảng giá mặc định khi tour KHÔNG khai báo giá theo loại khách (tour luồng cũ).
     *
     * <p>Mọi loại khách có cùng một mức giá — giá trả trước đây của tour. Giá này do
     * {@code TourPricingService} tính từ tổng giá các Experience PUBLISHED của các điểm đến
     * trong tour.
     */
    public PriceTable legacyFlatPriceTable(BigDecimal flatPrice) {        Map<GuestType, TourPrice> map = new EnumMap<>(GuestType.class);
        BigDecimal value = flatPrice == null ? BigDecimal.ZERO : flatPrice;
        for (GuestType g : GuestType.values()) {
            map.put(g, TourPrice.builder()
                    .guestType(g)
                    .price(value)
                    // Em bé luôn miễn phí và KHÔNG chiếm chỗ (theo quy định nền tảng).
                    .countsTowardSlot(!g.isAlwaysFree())
                    .build());
        }
        return new PriceTable(map);
    }

    /**
     * Giá trả trước đây của tour luồng cũ = tổng giá các Experience PUBLISHED trong hành trình.
     *
     * <p>Tour luồng 5 bước không dùng hàm này (giá lấy từ {@code tour_prices}).
     */
    @Transactional(readOnly = true)
    public BigDecimal flatPriceOf(Tour tour) {
        if (tour == null || tour.getTourId() == null) {
            return BigDecimal.ZERO;
        }
        return tourRepository.sumExperiencePricesByTourIds(List.of(tour.getTourId())).stream()
                .findFirst()
                .map(com.journeygo.modules.tour.repository.TourPriceProjection::totalPrice)
                .orElse(BigDecimal.ZERO);
    }

    /**
     * Ngày khởi hành còn mở của tour (đã cấu hình trong bước 4 của luồng tạo tour).
     *
     * <p>Dùng để kiểm tra ngày trải nghiệm có hợp lệ không.
     */
    @Transactional(readOnly = true)
    public Optional<LocalDate> findDepartureDate(Tour tour, LocalDate date) {
        if (tour == null || tour.getDepartureDates() == null) {
            return Optional.empty();
        }
        return tour.getDepartureDates().stream()
                .map(d -> d.getDepartureDate())
                .filter(d -> d != null && d.equals(date))
                .findFirst();
    }
}
