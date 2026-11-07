package com.journeygo.modules.tour.entity;

/**
 * Loại khách và độ tuổi do nền tảng quy định — đối tác không sửa được.
 */
public enum GuestType {
    ADULT("Người lớn", "12 tuổi trở lên", false),
    CHILD("Trẻ em", "5 – 11 tuổi", false),
    TODDLER("Trẻ nhỏ", "2 – 4 tuổi", false),
    /** Em bé luôn miễn phí. */
    INFANT("Em bé", "Dưới 2 tuổi", true);

    private final String label;
    private final String ageRange;
    private final boolean alwaysFree;

    GuestType(String label, String ageRange, boolean alwaysFree) {
        this.label = label;
        this.ageRange = ageRange;
        this.alwaysFree = alwaysFree;
    }

    public String getLabel() { return label; }

    public String getAgeRange() { return ageRange; }

    public boolean isAlwaysFree() { return alwaysFree; }
}
