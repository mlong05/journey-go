package com.journeygo.modules.tour.entity;

import java.util.EnumMap;
import java.util.Map;

/**
 * Loại khách. Mã loại cố định (4 loại); tên hiển thị và độ tuổi do Admin cấu hình
 * (bảng {@code guest_type_configs}, xem {@code GuestTypeConfigService}).
 *
 * <p>Các hàm {@link #getLabel()}, {@link #getAgeRange()} và {@link #forAge(int)}
 * đọc cấu hình đang áp dụng; khi chưa nạp được cấu hình thì dùng giá trị mặc định bên dưới.
 *
 * <p>Giá (kể cả miễn phí = 0đ) và việc loại khách có chiếm chỗ trong slot hay không do <b>đối tác</b>
 * khai báo cho từng tour ({@link TourPrice}), không phải cấu hình nền tảng.
 */
public enum GuestType {
    ADULT("Người lớn", 12),
    CHILD("Trẻ em", 5),
    TODDLER("Trẻ nhỏ", 2),
    INFANT("Em bé", 0);

    /** Thứ tự theo tuổi tăng dần — khoảng tuổi của các loại liền nhau theo thứ tự này. */
    public static final GuestType[] BY_AGE = {INFANT, TODDLER, CHILD, ADULT};

    /** Cấu hình đang áp dụng của một loại khách. */
    public record Settings(String label, int minAge) {
    }

    private final Settings defaults;

    /** Cấu hình hiện hành (bất biến, thay nguyên khối khi Admin lưu) — volatile để mọi luồng thấy ngay. */
    private static volatile Map<GuestType, Settings> current = Map.of();

    GuestType(String label, int minAge) {
        this.defaults = new Settings(label, minAge);
    }

    /** Thay toàn bộ cấu hình (gọi từ GuestTypeConfigService khi khởi động / khi Admin lưu). */
    public static void applySettings(Map<GuestType, Settings> settings) {
        current = Map.copyOf(new EnumMap<>(settings));
    }

    public Settings settings() {
        return current.getOrDefault(this, defaults);
    }

    public String getLabel() { return settings().label(); }

    /** Tên mặc định ban đầu (vd. để đọc file Excel cũ sau khi Admin đổi tên). */
    public String getDefaultLabel() { return defaults.label(); }

    public int getMinAge() { return settings().minAge(); }

    /** Tuổi tối đa (null = không giới hạn, chỉ loại lớn tuổi nhất). */
    public Integer getMaxAge() {
        for (int i = 0; i < BY_AGE.length - 1; i++) {
            if (BY_AGE[i] == this) return BY_AGE[i + 1].getMinAge() - 1;
        }
        return null;
    }

    /** "Dưới 2 tuổi" / "2 – 4 tuổi" / "12 tuổi trở lên". */
    public String getAgeRange() {
        int min = getMinAge();
        Integer max = getMaxAge();
        if (max == null) return min + " tuổi trở lên";
        if (min == 0) return "Dưới " + (max + 1) + " tuổi";
        if (min == max) return min + " tuổi";
        return min + " – " + max + " tuổi";
    }

    /** Loại khách theo tuổi (tuổi tại ngày trải nghiệm). */
    public static GuestType forAge(int age) {
        for (int i = BY_AGE.length - 1; i >= 0; i--) {
            if (age >= BY_AGE[i].getMinAge()) return BY_AGE[i];
        }
        return INFANT;
    }
}
