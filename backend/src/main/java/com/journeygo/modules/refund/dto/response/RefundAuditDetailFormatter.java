package com.journeygo.modules.refund.dto.response;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Chuẩn hoá nội dung nhật ký kiểm toán Refund để NGƯỜI DÙNG ĐỌC ĐƯỢC.
 *
 * ── Vì sao cần? ──
 * Bảng {@code refund_audit_logs} là append-only — những dòng đã ghi từ phiên bản
 * cũ vẫn còn nguyên trong DB và chứa thông tin kỹ thuật thô:
 * <ul>
 *   <li>{@code "Tourist gửi yêu cầu hoàn tiền. Nguyên nhân: TOURIST_FAULT. Số tiền đề xuất: 750000.00"}</li>
 *   <li>{@code "Phản hồi VNPay: {vnp_ResponseId=5e5c…, vnp_Command=refund, vnp_SecureHash=…}"}</li>
 *   <li>{@code "Kiểm tra trạng thái từ VNPay: {vnp_ResponseId=…, vnp_SecureHash=…}"}</li>
 *   <li>{@code "Admin phê duyệt hoàn 750000.00 — nguyên nhân: TOURIST_FAULT, phương thức: VNPAY_API. Ghi chú: …"}</li>
 * </ul>
 *
 * Ba vấn đề:
 * <ol>
 *   <li><b>Lộ tham số kỹ thuật</b> — {@code vnp_SecureHash}, {@code vnp_TmnCode}… vô nghĩa
 *       với người dùng và có thể gây hiểu nhầm là mã tham chiếu tài chính.</li>
 *   <li><b>Lộ mã enum</b> — {@code TOURIST_FAULT} / {@code PLATFORM_FAULT} / {@code VNPAY_API}
 *       là thuật ngữ kỹ thuật, phải dịch sang tiếng Việt.</li>
 *   <li><b>Lặp thông tin</b> — số tiền đã có ở cột {@code amount} và hiển thị riêng trên UI
 *       ⇒ không cần nhắc lại trong câu mô tả.</li>
 * </ol>
 *
 * <p>Việc chuẩn hoá thực hiện LÚC ĐỌC (không sửa dữ liệu gốc) ⇒ nhật ký cũ cũng được
 * hiển thị đúng ngay mà không cần migrate DB. Các dòng mới ghi ra đã sạch sẵn nên
 * hàm này là "no-op" với chúng.
 *
 * <p><b>⚠️ Lưu ý quan trọng về an toàn khởi tạo:</b> nếu một {@link Pattern} hỏng
 * (regex sai) thì {@code <clinit>} ném {@code ExceptionInInitializerError} ⇒ lần gọi
 * sau sẽ ném {@code NoClassDefFoundError} và MỌI request có đọc nhật ký refund đều
 * hỏng (500). Vì vậy toàn bộ pattern được biên dịch qua {@link #compile(String, Pattern)}
 * — luôn trả về pattern dự phòng thay vì ném lỗi.
 */
public final class RefundAuditDetailFormatter {

    private static final Logger LOG = LoggerFactory.getLogger(RefundAuditDetailFormatter.class);

    private RefundAuditDetailFormatter() {
    }

    /**
     * Biên dịch regex — KHÔNG BAO GIỜ ném lỗi.
     *
     * <p>Nếu regex không hợp lệ thì dùng {@code fallback} (một pattern vô hại,
     * không khớp gì) và ghi log cảnh báo. Nhờ vậy class luôn khởi tạo được ⇒ không
     * bao giờ có {@code NoClassDefFoundError} khi bấm "Chi tiết yêu cầu hoàn tiền".
     */
    private static Pattern compile(String regex, Pattern fallback) {
        try {
            return Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
        } catch (PatternSyntaxException ex) {
            LOG.error("Regex không hợp lệ trong RefundAuditDetailFormatter: {}", regex, ex);
            return fallback;
        }
    }

    /** Pattern vô hại — không khớp bất cứ chuỗi nào (dùng làm fallback). */
    private static final Pattern NEVER = Pattern.compile("(?!)");

    // ── Quy tắc theo TIỀN TỐ (áp dụng trước, cho kết quả đúng nhất) ──────────

    /**
     * "Tourist gửi yêu cầu hoàn tiền" + phần thừa ⇒ chỉ giữ câu đầu.
     *
     * <p>⚠️ Không dùng escape unicode trong regex cho ký tự tiếng Việt: Java xử lý
     * escape unicode ở tầng lexer và BẮT BUỘC phải có đúng 4 chữ số hex — escape thiếu
     * số sẽ làm hỏng regex (và kéo theo lỗi 500 toàn hệ thống).
     */
    private static final Pattern PREFIX_TOURIST_REQUEST = compile(
            "^(?:Tourist|Khách du lịch)\\s+gửi\\s+yêu\\s+cầu\\s+hoàn\\s+tiền[^.]*\\.?",
            NEVER);

    /** "Phản hồi VNPay: {vnp_…}" ⇒ câu tự nhiên. */
    private static final Pattern PREFIX_VNPAY_RESPONSE = compile(
            "Phản\\s+hồi\\s+VNPay\\s*:\\s*\\{[^{}]*\\}",
            NEVER);

    /** "Kiểm tra trạng thái từ VNPay: {vnp_…}" ⇒ câu tự nhiên. */
    private static final Pattern PREFIX_VNPAY_QUERY = compile(
            "Kiểm\\s+tra\\s+trạng\\s+thái\\s+từ\\s+VNPay\\s*:\\s*\\{[^{}]*\\}",
            NEVER);

    /** "Admin phê duyệt hoàn 750000.00 — …" ⇒ "Quản trị viên phê duyệt hoàn tiền …". */
    private static final Pattern PREFIX_ADMIN_APPROVED = compile(
            "^(?:Admin|Quản trị viên)\\s+phê\\s+duyệt\\s+hoàn(?:\\s+tiền)?\\s+[\\d.,]+\\s*₫?",
            NEVER);

    /** "phương thức: VNPay" ⇒ "phương thức VNPay" (bỏ dấu hai chấm thô). */
    private static final Pattern METHOD_COLON = compile(
            "phương\\s+thức\\s*:\\s*", NEVER);

    // ── Quy tắc chung ────────────────────────────────────────────────────────

    /** Map thô kiểu {@code {vnp_ResponseId=…, vnp_SecureHash=…}} (không có tiền tố). */
    private static final Pattern RAW_MAP = compile(
            "\\{[^{}]*vnp_[^{}]*}", NEVER);

    /** "Nguyên nhân: PERSONAL." / "nguyên nhân: PLATFORM_FAULT," */
    private static final Pattern REASON_CLAUSE = compile(
            "[,.]?\\s*[Nn]guyên\\s+nhân\\s*:\\s*(?:PERSONAL|PLATFORM_FAULT|PROVIDER_FAULT|FORCE_MAJEURE|TOURIST_FAULT)\\s*[.,]?",
            NEVER);

    /** "Số tiền đề xuất: 750000.00" */
    private static final Pattern PROPOSED_AMOUNT_CLAUSE = compile(
            "[,.]?\\s*Số\\s+tiền\\s+đề\\s+xuất\\s*:\\s*[\\d.,]+\\s*[.,]?",
            NEVER);

    /** "hoàn 750000.00 —" — số tiền thô sau chữ "hoàn" (đã có ở cột amount). */
    private static final Pattern RAW_AMOUNT_AFTER_HOAN = compile(
            "(?<=\\shoàn\\s)\\d+(?:[.,]\\d+)?(?=\\s*[-–—.,]|$)",
            NEVER);

    /** Mã enum còn sót lại trong câu mô tả. */
    private static final Pattern ENUM_TOURIST_FAULT = compile("\\bTOURIST_FAULT\\b", NEVER);
    private static final Pattern ENUM_PERSONAL = compile("\\bPERSONAL\\b", NEVER);
    private static final Pattern ENUM_PLATFORM_FAULT = compile("\\bPLATFORM_FAULT\\b", NEVER);
    private static final Pattern ENUM_PROVIDER_FAULT = compile("\\bPROVIDER_FAULT\\b", NEVER);
    private static final Pattern ENUM_FORCE_MAJEURE = compile("\\bFORCE_MAJEURE\\b", NEVER);
    private static final Pattern ENUM_VNPAY_API = compile("\\bVNPAY_API\\b", NEVER);
    private static final Pattern ENUM_MANUAL_TRANSFER = compile("\\bMANUAL_BANK_TRANSFER\\b", NEVER);

    private static final Pattern MULTI_SPACE = compile("\\s{2,}", NEVER);

    /**
     * Trả về nội dung nhật ký đã chuẩn hoá, an toàn để hiển thị cho người dùng.
     *
     * @param detail nội dung gốc trong DB (có thể null)
     * @return nội dung đã làm sạch; chuỗi rỗng nếu không còn nội dung đáng hiển thị
     */
    public static String format(String detail) {
        if (detail == null || detail.isBlank()) {
            return "";
        }

        String text = detail.trim();

        // 1. Quy tắc theo tiền tố — thay bằng câu tự nhiên, bỏ hẳn phần thừa.
        text = replaceFirst(PREFIX_TOURIST_REQUEST, text, "Tourist gửi yêu cầu hoàn tiền.");
        text = replaceFirst(PREFIX_VNPAY_RESPONSE, text, "VNPay đã phản hồi yêu cầu hoàn tiền.");
        text = replaceFirst(PREFIX_VNPAY_QUERY, text, "Đã kiểm tra lại trạng thái hoàn tiền với VNPay.");
        text = replaceFirst(PREFIX_ADMIN_APPROVED, text, "Quản trị viên phê duyệt hoàn tiền");
        text = METHOD_COLON.matcher(text).replaceAll("phương thức ");

        // 2. Map thô không có tiền tố (trường hợp phòng thủ) — gỡ hẳn.
        text = RAW_MAP.matcher(text).replaceAll("");

        // 3. Bỏ lý do (mã enum) — lý do đã hiển thị ở cột "Nguyên nhân" của bảng chính.
        text = REASON_CLAUSE.matcher(text).replaceAll(" ");

        // 4. Bỏ "Số tiền đề xuất: ..." — số tiền đã hiển thị riêng.
        text = PROPOSED_AMOUNT_CLAUSE.matcher(text).replaceAll(" ");

        // 5. Dịch mã enum còn sót.
        text = ENUM_TOURIST_FAULT.matcher(text).replaceAll("lỗi khách du lịch");
        text = ENUM_PERSONAL.matcher(text).replaceAll("lỗi khách hàng");
        text = ENUM_PLATFORM_FAULT.matcher(text).replaceAll("lỗi nền tảng");
        text = ENUM_PROVIDER_FAULT.matcher(text).replaceAll("lỗi đối tác");
        text = ENUM_FORCE_MAJEURE.matcher(text).replaceAll("lỗi bất khả kháng");
        text = ENUM_VNPAY_API.matcher(text).replaceAll("VNPay");
        text = ENUM_MANUAL_TRANSFER.matcher(text).replaceAll("chuyển khoản thủ công");

        // 6. Bỏ số tiền thô đứng sau chữ "hoàn" — số tiền đã hiển thị ở cột riêng.
        text = RAW_AMOUNT_AFTER_HOAN.matcher(text).replaceAll("");

        // 7. Dọn khoảng trắng & dấu câu thừa ở đầu/cuối.
        // Em-dash luôn có khoảng trắng hai bên ("hoàn tiền — phương thức VNPay").
        text = text.replace("—", " — ");
        text = MULTI_SPACE.matcher(text).replaceAll(" ");
        text = text.replaceAll("\\s+([.,;:])", "$1");
        text = text.replaceAll("^[\\s.,;:]+", "");
        text = text.replaceAll("[\\s]+$", "");
        text = text.replaceAll("[.,;:]\\s*$", ".");

        return text.trim();
    }

    /** Thay chỉ lần xuất hiện đầu tiên của pattern (pattern được neo ở đầu chuỗi). */
    private static String replaceFirst(Pattern pattern, String text, String replacement) {
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.replaceFirst(Matcher.quoteReplacement(replacement)) : text;
    }
}
