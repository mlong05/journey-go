package com.journeygo.modules.booking.support;

import com.journeygo.modules.tour.entity.GuestType;

import java.time.LocalDate;
import java.time.Period;

/**
 * Quy tắc xác định loại khách theo TUỔI TẠI NGÀY TRẢI NGHIỆM.
 *
 * <p>⚠️ Vì sao tính theo ngày trải nghiệm chứ không theo ngày đặt?
 * <p>Trong nhóm khách có thể có người chuyển nhóm giá do sinh nhật giữa hai thời điểm
 * (đặt hôm nay, đi tour 3 tháng sau ⇒ trẻ em thành người lớn). Tính theo ngày đặt sẽ tính
 * sai giá. Vì vậy tuổi luôn được tính tại {@code experienceDate} — ngày khởi hành thực tế.
 *
 * <p>Khoảng tuổi theo nền tảng quy định (trùng {@link GuestType}):
 * <ul>
 *   <li>Người lớn: từ 12 tuổi</li>
 *   <li>Trẻ em: 5 – 11 tuổi</li>
 *   <li>Trẻ nhỏ: 2 – 4 tuổi</li>
 *   <li>Em bé: dưới 2 tuổi (luôn miễn phí)</li>
 * </ul>
 */
public final class GuestAgeResolver {

    private GuestAgeResolver() {
    }

    /**
     * Tính số tuổi (đủ tháng) tại một ngày cụ thể.
     *
     * @param birthDate ngày sinh
     * @param onDate    ngày cần tính tuổi (ngày trải nghiệm)
     * @return số tuổi, hoặc {@code null} nếu thiếu ngày sinh
     */
    public static Integer ageAt(LocalDate birthDate, LocalDate onDate) {
        if (birthDate == null || onDate == null) {
            return null;
        }
        if (birthDate.isAfter(onDate)) {
            return null;
        }
        Period period = Period.between(birthDate, onDate);
        return period.getYears();
    }

    /**
     * Xác định loại khách theo tuổi tại ngày trải nghiệm.
     *
     * @param birthDate      ngày sinh hành khách
     * @param experienceDate ngày trải nghiệm
     * @return loại khách tương ứng, hoặc {@code null} nếu không xác định được
     */
    public static GuestType resolveGuestType(LocalDate birthDate, LocalDate experienceDate) {
        Integer age = ageAt(birthDate, experienceDate);
        if (age == null) {
            return null;
        }
        if (age >= 12) {
            return GuestType.ADULT;
        }
        if (age >= 5) {
            return GuestType.CHILD;
        }
        if (age >= 2) {
            return GuestType.TODDLER;
        }
        return GuestType.INFANT;
    }

    /**
     * Xác định loại khách, có fallback về {@link GuestType#ADULT} khi thiếu ngày sinh.
     *
     * <p>Thiếu ngày sinh chỉ chấp nhận được với hành khách <b>trưởng thành</b> đã xác nhận
     * loại khách thủ công; nếu không, coi như người lớn (giá cao nhất ⇒ an toàn cho đối tác).
     */
    public static GuestType resolveGuestTypeOrAdult(LocalDate birthDate, LocalDate experienceDate) {
        GuestType resolved = resolveGuestType(birthDate, experienceDate);
        return resolved != null ? resolved : GuestType.ADULT;
    }
}
