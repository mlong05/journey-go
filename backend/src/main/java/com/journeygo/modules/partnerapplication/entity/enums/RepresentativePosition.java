package com.journeygo.modules.partnerapplication.entity.enums;

/**
 * Chức vụ của người đại diện doanh nghiệp (Giai đoạn 1 — dropdown).
 */
public enum RepresentativePosition {
    OWNER("Chủ doanh nghiệp"),
    DIRECTOR("Giám đốc"),
    MANAGER("Quản lý"),
    LEGAL_REPRESENTATIVE("Người đại diện pháp luật"),
    AUTHORIZED_EMPLOYEE("Nhân viên được ủy quyền"),
    OTHER("Khác");

    private final String label;

    RepresentativePosition(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
