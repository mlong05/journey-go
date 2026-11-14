package com.journeygo.modules.tour.importer;

import com.journeygo.modules.tour.entity.GuestType;

import java.util.List;
import java.util.Locale;

/**
 * Bố cục file Excel nhập tour — dùng chung cho file mẫu ({@link TourImportTemplateBuilder})
 * và bộ đọc ({@link TourExcelParser}) để hai bên luôn khớp tên sheet / cột.
 */
final class TourImportLayout {

    private TourImportLayout() {}

    static final String SHEET_GUIDE = "Hướng dẫn";
    static final String SHEET_GENERAL = "Thông tin chung";
    static final String SHEET_IMAGES = "Ảnh tour";
    static final String SHEET_PRICES = "Giá vé";
    static final String SHEET_ITINERARY = "Lịch trình";
    static final String SHEET_STOPS = "Điểm đến";
    static final String SHEET_QUIZ = "Quiz";
    static final String SHEET_EXPERIENCES = "Trải nghiệm";
    static final String SHEET_ARTIFACTS = "Cổ vật";
    static final String SHEET_DATES = "Ngày khởi hành";
    static final String SHEET_LISTS = "Danh mục";

    /** Số dòng dữ liệu tối đa được đọc ở mỗi sheet dạng bảng. */
    static final int MAX_ROWS_PER_SHEET = 500;

    static final String YES = "Có";
    static final String NO = "Không";
    static final String FORMAT_DAY_TRIP = "Trong ngày";
    static final String FORMAT_MULTI_DAY = "Nhiều ngày";
    static final List<String> ANSWER_LETTERS = List.of("A", "B", "C", "D");

    // ── Sheet "Thông tin chung": cột A = trường, B = giá trị, C = ghi chú ──────

    enum Field {
        TITLE("Tên tour", "Tối đa 80 ký tự. Không dùng các từ: rẻ nhất, độc quyền, tốt nhất, số 1."),
        FORMAT("Hình thức", "Chọn: Trong ngày / Nhiều ngày."),
        DURATION_HOURS("Thời lượng (giờ)", "Tour trong ngày: số giờ, ví dụ 4."),
        DURATION_MINUTES("Thời lượng (phút)", "Tour trong ngày: số phút lẻ, ví dụ 30 → 4 giờ 30 phút."),
        DAYS("Số ngày", "Tour nhiều ngày: từ 2 ngày trở lên."),
        NIGHTS("Số đêm", "Tour nhiều ngày: không lớn hơn số ngày."),
        REGION("Khu vực", "Chọn trong danh sách."),
        THEME("Chủ đề", "Chọn trong danh sách."),
        DESCRIPTION("Mô tả tour", "Giới thiệu tổng quan về tour."),
        HIGHLIGHT_1("Điểm nổi bật 1", "Cần 3–5 điểm nổi bật."),
        HIGHLIGHT_2("Điểm nổi bật 2", ""),
        HIGHLIGHT_3("Điểm nổi bật 3", ""),
        HIGHLIGHT_4("Điểm nổi bật 4", "Không bắt buộc."),
        HIGHLIGHT_5("Điểm nổi bật 5", "Không bắt buộc."),
        MAX_GUESTS("Số chỗ tối đa mỗi slot", "Số khách tối đa cho một ngày khởi hành."),
        CANCELLATION("Chính sách hủy", ""),
        PRICE_INCLUDES("Giá tour bao gồm", "Mỗi dòng một ý (Alt+Enter để xuống dòng trong ô)."),
        PRICE_EXCLUDES("Giá tour không bao gồm", ""),
        FORCE_MAJEURE("Trường hợp bất khả kháng", ""),
        REFUND_POLICY("Chính sách hỗ trợ hoàn tiền", ""),
        CONTACT("Liên hệ", "Số điện thoại / email hỗ trợ khách.");

        final String label;
        final String note;

        Field(String label, String note) {
            this.label = label;
            this.note = note;
        }

        static Field byLabel(String label) {
            if (label == null) return null;
            String key = normalize(label);
            for (Field f : values()) {
                if (normalize(f.label).equals(key)) return f;
            }
            return null;
        }
    }

    static final int GENERAL_FIRST_ROW = 1;

    // ── Sheet dạng bảng: dòng 1 = tiêu đề ─────────────────────────────────────

    static final String[] IMAGE_COLUMNS = {"Đường dẫn ảnh (https)", "Ảnh bìa (Có / để trống)"};
    static final String[] PRICE_COLUMNS = {"Loại khách", "Giá (VNĐ)", "Tính vào số chỗ (Có / Không)"};
    static final String[] ITINERARY_COLUMNS = {"Ngày", "Chặng", "Hoạt động chính", "Nội dung"};
    static final String[] STOP_COLUMNS = {"Mã điểm đến", "Tên điểm đến", "Mô tả ngắn", "Lưu ý cho khách",
            "Ảnh (https)", "Video giới thiệu (YouTube / MP4)", "Nội dung văn hóa (câu chuyện)"};
    static final String[] QUIZ_COLUMNS = {"Mã điểm đến", "Câu hỏi", "Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D",
            "Đáp án đúng (A–D)"};
    static final String[] EXPERIENCE_COLUMNS = {"Mã điểm đến", "Tên hoạt động", "Vĩ độ", "Kinh độ",
            "Bán kính (mét)", "Thời gian trải nghiệm (phút)", "Câu hỏi sau trải nghiệm",
            "Đáp án đúng (nhiều đáp án cách nhau bằng ;)"};
    static final String[] ARTIFACT_COLUMNS = {"Mã điểm đến", "Tên cổ vật", "Ảnh (https)", "Mô tả ngắn",
            "Video (YouTube / MP4)"};
    static final String[] DATE_COLUMNS = {"Ngày khởi hành (dd/mm/yyyy)"};

    static GuestType guestTypeByLabel(String value) {
        if (value == null) return null;
        String key = normalize(value);
        for (GuestType t : GuestType.values()) {
            if (normalize(t.getLabel()).equals(key) || t.name().equalsIgnoreCase(value.trim())) return t;
        }
        return null;
    }

    /** So khớp không phân biệt hoa thường, khoảng trắng thừa và dấu * đánh dấu bắt buộc. */
    static String normalize(String value) {
        return value.replace("*", "").trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
