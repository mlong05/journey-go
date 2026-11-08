package com.journeygo.modules.partnerprofileupdate.support;

import com.journeygo.modules.partnerapplication.entity.PartnerApplication;
import com.journeygo.modules.partnerprofileupdate.dto.request.PartnerProfileUpdateSubmitRequest;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Tập trung danh sách trường thông tin đối tác được phép đổi + nhãn tiếng Việt.
 *
 * <p>Dùng chung cho:
 * <ul>
 *   <li>Trích xuất snapshot "thông tin cũ" từ đơn đăng ký đã duyệt.</li>
 *   <li>Tạo "thông tin mới" từ form của đối tác.</li>
 *   <li>Tính danh sách trường thay đổi (để Admin so sánh song song).</li>
 * </ul>
 */
public final class PartnerProfileFields {

    private PartnerProfileFields() {
    }

    public static final String PHONE = "phone";
    public static final String REPRESENTATIVE_NAME = "representativeName";
    public static final String REPRESENTATIVE_POSITION = "representativePosition";
    public static final String BUSINESS_NAME = "businessName";
    public static final String TAX_CODE = "taxCode";
    public static final String BUSINESS_REGISTRATION_INFO = "businessRegistrationInfo";
    public static final String PROVINCE = "province";
    public static final String DISTRICT = "district";
    public static final String WARD = "ward";
    public static final String ADDRESS_DETAIL = "addressDetail";
    public static final String BUSINESS_SCOPE = "businessScope";
    public static final String BANK_NAME = "bankName";
    public static final String BANK_ACCOUNT_NUMBER = "bankAccountNumber";
    public static final String BANK_ACCOUNT_HOLDER = "bankAccountHolder";

    /** Thứ tự hiển thị + nhãn tiếng Việt của từng trường. */
    private static final Map<String, String> LABELS = new LinkedHashMap<>();

    static {
        LABELS.put(PHONE, "Số điện thoại");
        LABELS.put(REPRESENTATIVE_NAME, "Họ tên người đại diện");
        LABELS.put(REPRESENTATIVE_POSITION, "Chức vụ người đại diện");
        LABELS.put(BUSINESS_NAME, "Tên doanh nghiệp / Cơ sở");
        LABELS.put(TAX_CODE, "Mã số thuế");
        LABELS.put(BUSINESS_REGISTRATION_INFO, "Thông tin đăng ký kinh doanh");
        LABELS.put(PROVINCE, "Tỉnh / Thành");
        LABELS.put(DISTRICT, "Quận / Huyện");
        LABELS.put(WARD, "Phường / Xã");
        LABELS.put(ADDRESS_DETAIL, "Địa chỉ trụ sở");
        LABELS.put(BUSINESS_SCOPE, "Phạm vi hoạt động");
        LABELS.put(BANK_NAME, "Ngân hàng thụ hưởng");
        LABELS.put(BANK_ACCOUNT_NUMBER, "Số tài khoản");
        LABELS.put(BANK_ACCOUNT_HOLDER, "Tên chủ tài khoản");
    }

    public static Map<String, String> labels() {
        return LABELS;
    }

    public static String label(String key) {
        return LABELS.getOrDefault(key, key);
    }

    public static List<String> allKeys() {
        return new ArrayList<>(LABELS.keySet());
    }

    /** Trích xuất toàn bộ thông tin hiện tại của đối tác từ đơn đăng ký đã duyệt. */
    public static Map<String, String> fromApplication(PartnerApplication app) {
        Map<String, String> map = new LinkedHashMap<>();
        if (app == null) {
            return map;
        }
        map.put(PHONE, app.getPhone());
        map.put(REPRESENTATIVE_NAME, app.getRepresentativeName());
        map.put(REPRESENTATIVE_POSITION, app.getRepresentativePosition() == null
                ? null : app.getRepresentativePosition().getLabel());
        map.put(BUSINESS_NAME, app.getBusinessName());
        map.put(TAX_CODE, app.getTaxCode());
        map.put(BUSINESS_REGISTRATION_INFO, app.getBusinessRegistrationInfo());
        map.put(PROVINCE, app.getProvince());
        map.put(DISTRICT, app.getDistrict());
        map.put(WARD, app.getWard());
        map.put(ADDRESS_DETAIL, app.getAddressDetail());
        map.put(BUSINESS_SCOPE, app.getBusinessScope());
        map.put(BANK_NAME, app.getBankName());
        map.put(BANK_ACCOUNT_NUMBER, app.getBankAccountNumber());
        map.put(BANK_ACCOUNT_HOLDER, app.getBankAccountHolder());
        return map;
    }

    /**
     * Tạo map "thông tin mới" từ form của đối tác.
     *
     * <p>Chỉ những trường khác null mới được đưa vào map (null = giữ nguyên giá trị cũ).
     */
    public static Map<String, String> fromSubmitRequest(PartnerProfileUpdateSubmitRequest req) {
        Map<String, String> map = new LinkedHashMap<>();
        if (req == null) {
            return map;
        }
        putIfPresent(map, PHONE, req.phone());
        putIfPresent(map, REPRESENTATIVE_NAME, req.representativeName());
        putIfPresent(map, REPRESENTATIVE_POSITION, positionLabel(req.representativePosition()));
        putIfPresent(map, BUSINESS_NAME, req.businessName());
        putIfPresent(map, TAX_CODE, req.taxCode());
        putIfPresent(map, BUSINESS_REGISTRATION_INFO, req.businessRegistrationInfo());
        putIfPresent(map, PROVINCE, req.province());
        putIfPresent(map, DISTRICT, req.district());
        putIfPresent(map, WARD, req.ward());
        putIfPresent(map, ADDRESS_DETAIL, req.addressDetail());
        putIfPresent(map, BUSINESS_SCOPE, req.businessScope());
        putIfPresent(map, BANK_NAME, req.bankName());
        putIfPresent(map, BANK_ACCOUNT_NUMBER, req.bankAccountNumber());
        putIfPresent(map, BANK_ACCOUNT_HOLDER, req.bankAccountHolder());
        return map;
    }

    /**
     * Danh sách trường thực sự thay đổi giữa thông tin cũ và thông tin mới.
     *
     * <p>Chỉ so sánh các trường có trong {@code newData} (trường đối tác chỉnh sửa).
     */
    public static List<String> changedFields(Map<String, String> oldData, Map<String, String> newData) {
        List<String> changed = new ArrayList<>();
        if (newData == null) {
            return changed;
        }
        for (String key : LABELS.keySet()) {
            if (!newData.containsKey(key)) {
                continue;
            }
            String before = oldData == null ? null : oldData.get(key);
            String after = newData.get(key);
            if (!Objects.equals(normalize(before), normalize(after))) {
                changed.add(key);
            }
        }
        return changed;
    }

    /** Gộp thông tin mới vào bản gốc (giữ nguyên trường không được chỉnh sửa). */
    public static Map<String, String> merge(Map<String, String> oldData, Map<String, String> newData) {
        Map<String, String> merged = new LinkedHashMap<>();
        if (oldData != null) {
            merged.putAll(oldData);
        }
        if (newData != null) {
            merged.putAll(newData);
        }
        return merged;
    }

    private static void putIfPresent(Map<String, String> map, String key, String value) {
        if (value != null) {
            map.put(key, value.trim());
        }
    }

    /**
     * Chuẩn hoá chức vụ về nhãn tiếng Việt để so sánh với thông tin cũ.
     *
     * <p>Client có thể gửi cả mã enum (OWNER) lẫn nhãn (Chủ doanh nghiệp) — cả hai
     * đều được quy về nhãn để việc so sánh "trước / sau" không báo nhầm khác biệt.
     */
    private static String positionLabel(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        for (com.journeygo.modules.partnerapplication.entity.enums.RepresentativePosition p
                : com.journeygo.modules.partnerapplication.entity.enums.RepresentativePosition.values()) {
            if (p.name().equalsIgnoreCase(trimmed)) {
                return p.getLabel();
            }
        }
        return trimmed;
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
