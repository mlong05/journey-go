package com.journeygo.modules.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.payment.config.VnPayProperties;
import com.journeygo.modules.payment.dto.response.VnPayBank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/**
 * Client tích hợp VNPay (Sandbox) — phiên bản API {@code 2.1.0} + {@code HMACSHA512}.
 *
 * <p>Triển khai theo tài liệu chính thức VNPay
 * (<a href="https://sandbox.vnpayment.vn/apis/docs/chuyen-doi-thuat-toan/changeTypeHash.html">
 * Tạo URL thanh toán</a> và
 * <a href="https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr&amp;refund.html">
 * QueryDR / Refund</a>):
 *
 * <ul>
 *   <li><b>Tạo URL thanh toán</b>: sắp xếp key tăng dần, bỏ qua giá trị rỗng.
 *       Chuỗi tính hash (2.1.0) là {@code key=urlencode(value)} nối bằng {@code &} —
 *       <b>tên tham số KHÔNG encode, chỉ giá trị được encode</b>; query string thì encode cả hai.
 *       Checksum = {@code HMACSHA512(hashData, secretKey)} hex lowercase.</li>
 *   <li><b>Kiểm tra chữ ký IPN / Return</b>: loại {@code vnp_SecureHash} và
 *       {@code vnp_SecureHashType} khỏi tập tham số, sắp xếp key, dựng lại hashData
 *       theo đúng quy tắc 2.1.0 rồi so sánh constant-time.</li>
 *   <li><b>QueryDR / Refund</b>: {@code POST} {@code /merchant_webapi/api/transaction}
 *       với {@code Content-Type: application/json}; checksum trên chuỗi nối bằng {@code |}
 *       theo đúng thứ tự tham số trong tài liệu.</li>
 *   <li><b>Phản hồi từ merchant API</b> cũng kèm {@code vnp_SecureHash} — được kiểm tra
 *       bằng chuỗi {@code vnp_ResponseId|...|vnp_PromotionAmount}.</li>
 * </ul>
 *
 * <p>Lưu ý nghiệp vụ quan trọng: phản hồi {@code vnp_ResponseCode=00} cho lệnh {@code refund}
 * chỉ có nghĩa "yêu cầu đã được tiếp nhận" — KHÔNG có nghĩa tiền đã về tài khoản.
 * Việc phân biệt được xử lý ở {@code RefundService}.
 */
@Slf4j
@Service
public class VnPayClient {

    private static final DateTimeFormatter VNPAY_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final VnPayProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public VnPayClient(VnPayProperties properties, RestClient.Builder restClientBuilder, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) properties.apiTimeout().toMillis());
        factory.setReadTimeout((int) properties.apiTimeout().toMillis());
        this.restClient = restClientBuilder.requestFactory(factory).build();
    }

    // ── Payment URL ───────────────────────────────────────────────────────────

    /**
     * Tạo URL thanh toán VNPay cho một giao dịch.
     *
     * @param txnRef     mã tham chiếu (vnp_TxnRef) — duy nhất
     * @param amount     số tiền VND (sẽ nhân 100)
     * @param orderInfo  mô tả đơn hàng
     * @param createDate thời điểm khởi tạo
     * @param expireDate thời điểm hết hạn thanh toán
     * @param clientIp   IP của client
     */
    public String buildPaymentUrl(String txnRef, BigDecimal amount, String orderInfo,
                                  LocalDateTime createDate, LocalDateTime expireDate, String clientIp) {
        return buildPaymentUrl(txnRef, amount, orderInfo, createDate, expireDate, clientIp, null);
    }

    /**
     * Tạo URL thanh toán VNPay cho một giao dịch, có thể chỉ định phương thức thanh toán.
     *
     * <p>Hành vi của {@code vnp_BankCode} theo tài liệu chính thức VNPay:
     * <ul>
     *   <li><b>Không gửi</b> {@code vnp_BankCode} → VNPay chuyển khách hàng tới trang
     *       CHỌN phương thức thanh toán (Ứng dụng ngân hàng & ví điện tử / Thẻ nội địa &
     *       tài khoản ngân hàng / Thẻ quốc tế) — đây là hành vi mặc định mong muốn
     *       khi khách hàng cần nhiều lựa chọn.</li>
     *   <li>Gửi {@code vnp_BankCode=VNPAYQR} → mở thẳng màn hình quét mã QR.</li>
     *   <li>Gửi {@code vnp_BankCode=VNBANK} → mở thẳng thẻ ATM / tài khoản nội địa.</li>
     *   <li>Gửi {@code vnp_BankCode=VISA} → mở thẳng form thẻ quốc tế (nhận cả Visa/MC/JCB).</li>
     *   <li>Gửi mã ngân hàng cụ thể (VD {@code MB}, {@code VCB}) → mở thẳng ngân hàng đó.
     *       Danh sách mã lấy từ API {@code get_bank_list}.</li>
     * </ul>
     *
     * @param bankCode mã phương thức/ngân hàng; null hoặc rỗng → KHÔNG gửi tham số
     *                 {@code vnp_BankCode} để khách tự chọn trên trang VNPay.
     */
    public String buildPaymentUrl(String txnRef, BigDecimal amount, String orderInfo,
                                  LocalDateTime createDate, LocalDateTime expireDate, String clientIp,
                                  String bankCode) {
        return buildPaymentUrl(txnRef, amount, orderInfo, createDate, expireDate, clientIp,
                bankCode, false);
    }

    /**
     * Tạo URL thanh toán VNPay — bản mở rộng cho phép gắn cờ chuyển hướng về app.
     *
     * <p>{@code vnp_ReturnUrl} được dựng RIÊNG cho từng giao dịch ⇒ có thể cho WEB và
     * MOBILE dùng hai Return URL khác nhau mà không cần đổi cấu hình toàn cục:
     * <ul>
     *   <li>WEB: Return URL thường → trình duyệt hiển thị trang kết quả.</li>
     *   <li>MOBILE: Return URL + {@code app_redirect=1} → trang
     *       {@code /payments/return-page} tự chuyển hướng về scheme của app
     *       ({@code journeygo://payment/return?...}) ⇒ app mở lại và hiện màn kết quả.</li>
     * </ul>
     *
     * <p>⚠️ Tham số {@code app_redirect} KHÔNG nằm trong chuỗi hash của VNPay (chỉ
     * {@code vnp_*} mới được hash) ⇒ thêm sau khi ký vẫn an toàn. Backend cũng phải
     * bỏ qua mọi tham số không phải {@code vnp_*} khi xác minh chữ ký.
     *
     * @param appRedirect true = gắn {@code app_redirect=1} vào Return URL (deep link về app)
     */
    public String buildPaymentUrl(String txnRef, BigDecimal amount, String orderInfo,
                                  LocalDateTime createDate, LocalDateTime expireDate, String clientIp,
                                  String bankCode, boolean appRedirect) {
        requireConfigured();

        Map<String, String> params = new LinkedHashMap<>();
        params.put("vnp_Version", properties.getVersion());
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", properties.getTmnCode());
        params.put("vnp_Amount", String.valueOf(VnPayProperties.toVnPayAmount(amount)));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", properties.getOrderType());
        params.put("vnp_Locale", properties.getLocale());
        params.put("vnp_ReturnUrl", buildReturnUrl(appRedirect));
        params.put("vnp_IpAddr", clientIp != null && !clientIp.isBlank() ? clientIp : properties.getIpAddr());
        params.put("vnp_CreateDate", formatDate(createDate));
        params.put("vnp_ExpireDate", formatDate(expireDate));

        // Ưu tiên bankCode truyền vào; nếu không có thì dùng cấu hình mặc định (có thể rỗng
        // → KHÔNG gửi vnp_BankCode → khách tự chọn phương thức trên trang VNPay).
        String effectiveBankCode = (bankCode != null && !bankCode.isBlank())
                ? bankCode.trim()
                : properties.getBankCode();
        if (effectiveBankCode != null && !effectiveBankCode.isBlank()) {
            params.put("vnp_BankCode", effectiveBankCode);
        }

        String hashData = buildHashData(params);
        String query = buildQueryString(params);
        String secureHash = hmacSha512(hashData, properties.getHashSecret());

        return properties.getPaymentUrl() + "?" + query + "&vnp_SecureHash=" + secureHash;
    }

    // ── Signature verification ────────────────────────────────────────────────

    /**
     * Return URL gửi lên VNPay.
     *
     * <p>3 chế độ (theo thứ tự ưu tiên):
     * <ul>
     *   <li><b>MOBILE</b> ({@code appRedirect=true}) + {@code appReturnUrl} được cấu hình
     *       → Return URL là CUSTOM SCHEME ({@code journeygo://payment/return}).
     *       VNPay chuyển hướng trình duyệt thẳng về app, kèm TOÀN BỘ tham số kết quả
     *       ĐÃ KÝ ({@code vnp_SecureHash}) ⇒ app nhận kết quả ngay, KHÔNG CẦN tunnel.</li>
     *   <li><b>MOBILE</b> ({@code appRedirect=true}) không có {@code appReturnUrl}
     *       → Return URL của backend ({@code /payments/return-page}) + {@code app_redirect=1}
     *       → trang kết quả tự chuyển hướng trình duyệt về app (CẦN tunnel còn sống).</li>
     *   <li><b>WEB</b> ({@code appRedirect=false}) nếu {@code webReturnUrl} được cấu hình
     *       → redirect thẳng về trang kết quả của frontend.</li>
     *   <li><b>WEB</b> (mặc định) → Return URL của backend ({@code /payments/return-page}),
     *       hiển thị trang kết quả tĩnh, không chuyển hướng về app.</li>
     * </ul>
     *
     * <p>⚠️ Tham số {@code app_redirect} KHÔNG nằm trong chuỗi hash của VNPay (chỉ
     * {@code vnp_*} mới được hash) ⇒ thêm/sửa sau khi ký vẫn an toàn. Xem
     * {@link #isValidSignature(Map)}.
     */
    private String buildReturnUrl(boolean appRedirect) {
        if (appRedirect) {
            // Ưu tiên custom scheme ⇒ app nhận kết quả đã ký, không cần tunnel.
            String appSchemeUrl = properties.getAppReturnUrl();
            if (appSchemeUrl != null && !appSchemeUrl.isBlank()) {
                return appSchemeUrl;
            }
        }

        if (!appRedirect) {
            String web = properties.getWebReturnUrl();
            if (web != null && !web.isBlank()) {
                return web;
            }
        }

        String base = properties.getReturnUrl();
        if (base == null || base.isBlank()) {
            return base;
        }
        if (!appRedirect) {
            return base;
        }
        String separator = base.contains("?") ? "&" : "?";
        return base + separator + "app_redirect=1";
    }

    /**
     * Kiểm tra chữ ký của IPN / Return URL.
     *
     * <p>Loại {@code vnp_SecureHash} và {@code vnp_SecureHashType} khỏi tập tham số, sắp xếp
     * key tăng dần, dựng lại hashData theo quy tắc 2.1.0 rồi so sánh constant-time.
     *
     * <p>⚠️ CHỈ lấy các tham số có tiền tố {@code vnp_} khi dựng hashData — đúng như
     * quy định của VNPay 2.1.0. Nếu lấy cả tham số không phải {@code vnp_} (VD
     * {@code app_redirect} mà ta tự thêm vào Return URL) thì hash tính ra KHÔNG khớp
     * với {@code vnp_SecureHash} của VNPay ⇒ mọi lần trả kết quả sẽ bị coi là chữ ký
     * không hợp lệ.
     *
     * @return true nếu chữ ký hợp lệ
     */
    public boolean isValidSignature(Map<String, String> params) {
        if (!properties.isVerifySignature()) {
            log.warn("[VNPay] verifySignature đang TẮT — chỉ chấp nhận trong môi trường dev, KHÔNG dùng production");
            return true;
        }
        if (params == null || params.isEmpty()) {
            return false;
        }
        String receivedHash = params.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank()) {
            return false;
        }

        Map<String, String> filtered = new TreeMap<>();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (key == null || "vnp_SecureHash".equals(key) || "vnp_SecureHashType".equals(key)) {
                continue;
            }
            // Chỉ tham số vnp_ mới nằm trong chuỗi hash của VNPay.
            if (!key.startsWith("vnp_")) {
                continue;
            }
            if (value == null || value.isEmpty()) {
                continue;
            }
            filtered.put(key, value);
        }

        String expected = hmacSha512(buildHashData(filtered), properties.getHashSecret());
        boolean valid = constantTimeEquals(expected, receivedHash);
        if (!valid) {
            log.warn("[VNPay] Chữ ký KHÔNG hợp lệ cho txnRef={}", params.get("vnp_TxnRef"));
        }
        return valid;
    }

    // ── QueryDR ───────────────────────────────────────────────────────────────

    /**
     * Truy vấn kết quả thanh toán (vnp_Command=querydr).
     *
     * <p>Dùng để xác minh giao dịch khi: kết quả chưa rõ, cần thử lại thanh toán, hoặc
     * thanh toán đến muộn (UC-03, UC-05).
     *
     * <p>Quan trọng: {@code vnp_TransactionDate} phải là thời điểm tạo giao dịch thanh toán
     * GỐC (giống {@code vnp_CreateDate} của lệnh {@code pay}) — nếu sai, VNPay sẽ trả về
     * {@code vnp_ResponseCode=91} (không tìm thấy giao dịch).
     *
     * @param txnRef          mã tham chiếu giao dịch gốc
     * @param transactionNo   mã giao dịch VNPay gốc (tuỳ chọn)
     * @param transactionDate thời điểm tạo giao dịch gốc (yyyyMMddHHmmss)
     * @param orderInfo       mô tả đơn hàng
     * @param ipAddr          IP server
     * @return kết quả trả về từ VNPay dưới dạng map tham số; map RỖNG nghĩa là
     *         không xác định được kết quả (timeout / lỗi mạng) — KHÔNG được coi là thất bại.
     */
    public Map<String, String> queryTransaction(String txnRef, String transactionNo, String transactionDate,
                                                 String orderInfo, String ipAddr) {
        requireConfigured();

        LocalDateTime now = nowVnPay();
        Map<String, String> params = new LinkedHashMap<>();
        params.put("vnp_RequestId", generateRequestId());
        params.put("vnp_Version", properties.getVersion());
        params.put("vnp_Command", "querydr");
        params.put("vnp_TmnCode", properties.getTmnCode());
        params.put("vnp_TxnRef", txnRef);
        if (transactionNo != null && !transactionNo.isBlank()) {
            params.put("vnp_TransactionNo", transactionNo);
        }
        params.put("vnp_OrderInfo", orderInfo != null && !orderInfo.isBlank() ? orderInfo : "Truy van giao dich " + txnRef);
        params.put("vnp_TransactionDate",
                transactionDate != null && !transactionDate.isBlank() ? transactionDate : formatDate(now));
        params.put("vnp_CreateDate", formatDate(now));
        params.put("vnp_IpAddr", ipAddr != null && !ipAddr.isBlank() ? ipAddr : properties.getIpAddr());

        // Thứ tự tham số trong chuỗi checksum theo tài liệu QueryDR:
        // RequestId|Version|Command|TmnCode|TxnRef|TransactionDate|CreateDate|IpAddr|OrderInfo
        String data = String.join("|",
                params.get("vnp_RequestId"),
                params.get("vnp_Version"),
                params.get("vnp_Command"),
                params.get("vnp_TmnCode"),
                params.get("vnp_TxnRef"),
                params.get("vnp_TransactionDate"),
                params.get("vnp_CreateDate"),
                params.get("vnp_IpAddr"),
                params.get("vnp_OrderInfo"));

        params.put("vnp_SecureHash", hmacSha512(data, properties.getHashSecret()));

        return postToMerchantApi(params);
    }

    /** Overload giữ tương thích: truy vấn không cần mã giao dịch VNPay. */
    public Map<String, String> queryTransaction(String txnRef, String orderInfo, String ipAddr) {
        return queryTransaction(txnRef, null, null, orderInfo, ipAddr);
    }

    // ── Refund ────────────────────────────────────────────────────────────────

    /**
     * Gửi yêu cầu hoàn tiền tới VNPay (vnp_Command=refund).
     *
     * <p>Lưu ý quan trọng: phản hồi "yêu cầu thành công" (vnp_ResponseCode=00) KHÔNG có nghĩa
     * tiền đã về tài khoản — trạng thái giao dịch phải được theo dõi riêng
     * ({@code vnp_TransactionStatus} = 05 "đang xử lý", 06 "đã gửi yêu cầu tới ngân hàng",
     * 00 "thành công", 09 "bị từ chối").
     *
     * @param txnRef           mã giao dịch thanh toán gốc
     * @param amount           số tiền hoàn (VND)
     * @param transactionNo    mã giao dịch VNPay gốc (tuỳ chọn)
     * @param transactionDate  thời điểm tạo giao dịch gốc (yyyyMMddHHmmss)
     * @param createdBy        người khởi tạo hoàn tiền
     * @param fullRefund       true = hoàn trả toàn phần (vnp_TransactionType=02), false = hoàn một phần (03)
     */
    public Map<String, String> requestRefund(String txnRef, BigDecimal amount, String transactionNo,
                                             String transactionDate, String createdBy, boolean fullRefund) {
        requireConfigured();

        LocalDateTime now = nowVnPay();
        Map<String, String> params = new LinkedHashMap<>();
        params.put("vnp_RequestId", generateRequestId());
        params.put("vnp_Version", properties.getVersion());
        params.put("vnp_Command", "refund");
        params.put("vnp_TmnCode", properties.getTmnCode());
        params.put("vnp_TransactionType", fullRefund ? "02" : "03");
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_Amount", String.valueOf(VnPayProperties.toVnPayAmount(amount)));
        params.put("vnp_OrderInfo", "Hoan tien don hang " + txnRef);
        if (transactionNo != null && !transactionNo.isBlank()) {
            params.put("vnp_TransactionNo", transactionNo);
        }
        params.put("vnp_TransactionDate", transactionDate != null && !transactionDate.isBlank()
                ? transactionDate : formatDate(now));
        params.put("vnp_CreateBy", createdBy != null && !createdBy.isBlank() ? createdBy : "journeygo");
        params.put("vnp_CreateDate", formatDate(now));
        params.put("vnp_IpAddr", properties.getIpAddr());

        // Thứ tự tham số trong chuỗi checksum theo tài liệu Refund:
        // RequestId|Version|Command|TmnCode|TransactionType|TxnRef|Amount|TransactionNo|
        // TransactionDate|CreateBy|CreateDate|IpAddr|OrderInfo
        String data = String.join("|",
                params.get("vnp_RequestId"),
                params.get("vnp_Version"),
                params.get("vnp_Command"),
                params.get("vnp_TmnCode"),
                params.get("vnp_TransactionType"),
                params.get("vnp_TxnRef"),
                params.get("vnp_Amount"),
                params.get("vnp_TransactionNo") != null ? params.get("vnp_TransactionNo") : "",
                params.get("vnp_TransactionDate"),
                params.get("vnp_CreateBy"),
                params.get("vnp_CreateDate"),
                params.get("vnp_IpAddr"),
                params.get("vnp_OrderInfo"));

        params.put("vnp_SecureHash", hmacSha512(data, properties.getHashSecret()));

        return postToMerchantApi(params);
    }

    // ── Bank list ─────────────────────────────────────────────────────────────

    /**
     * Lấy danh sách ngân hàng / ví điện tử / loại thẻ mà VNPay hỗ trợ.
     *
     * <p>API chính thức: {@code POST https://sandbox.vnpayment.vn/qrpayauth/api/merchant/get_bank_list}
     * với {@code Content-Type: application/x-www-form-urlencoded} và body {@code tmn_code=...}.
     *
     * <p>Phản hồi là JSON array, mỗi phần tử có: {@code bank_code}, {@code bank_name},
     * {@code logo_link}, {@code bank_type}, {@code display_order}.
     *
     * <p>Đây là nguồn danh sách CHÍNH THỨC — không hardcode danh sách ngân hàng.
     *
     * @return danh sách ngân hàng; danh sách rỗng nếu gọi lỗi / chưa cấu hình
     */
    public List<VnPayBank> fetchBankList() {
        if (!properties.isConfigured()) {
            log.warn("[VNPay] Chưa cấu hình tmnCode/hashSecret — không lấy được danh sách ngân hàng.");
            return List.of();
        }

        try {
            String body = "tmn_code=" + properties.getTmnCode();

            String raw = restClient.post()
                    .uri(properties.getBankListUrl())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body)
                    .retrieve()
                    .onStatus(status -> true, (request, response) -> {
                        log.warn("[VNPay] get_bank_list trả HTTP {}", response.getStatusCode());
                    })
                    .body(String.class);

            JsonNode root = objectMapper.readTree(raw == null ? "" : raw);
            List<VnPayBank> banks = new ArrayList<>();
            if (root != null && root.isArray()) {
                for (JsonNode node : root) {
                    banks.add(new VnPayBank(
                            node.path("bank_code").asText(null),
                            node.path("bank_name").asText(null),
                            node.path("logo_link").asText(null),
                            node.path("bank_type").asInt(0),
                            node.path("display_order").asInt(0)));
                }
            }
            log.info("[VNPay] Đã lấy danh sách {} ngân hàng / phương thức thanh toán", banks.size());
            return banks;
        } catch (Exception e) {
            log.error("[VNPay] Lỗi khi lấy danh sách ngân hàng: {}", e.getMessage());
            return List.of();
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private Map<String, String> postToMerchantApi(Map<String, String> params) {
        try {
            String body = objectMapper.writeValueAsString(params);
            log.info("[VNPay] Gọi merchant API command={} txnRef={}", params.get("vnp_Command"), params.get("vnp_TxnRef"));

            String rawResponse = restClient.post()
                    .uri(properties.getMerchantApiUrl())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .onStatus(status -> status.isError(), (request, response) -> {
                        // Chỉ cảnh báo khi HTTP thực sự lỗi (4xx/5xx).
                        // HTTP 200 là trạng thái BÌNH THƯỜNG của merchant API — trước đây
                        // điều kiện `status -> true` khiến mọi lần gọi thành công đều bị
                        // ghi ở mức WARN, gây nhiễu log.
                        log.warn("[VNPay] Merchant API trả HTTP {} (lỗi) cho command={} txnRef={}",
                                response.getStatusCode(), params.get("vnp_Command"), params.get("vnp_TxnRef"));
                    })
                    .body(String.class);

            Map<String, String> parsed = parseResponse(rawResponse);
            if (!parsed.isEmpty()) {
                verifyMerchantResponseSignature(parsed);
            }
            return parsed;
        } catch (Exception e) {
            log.error("[VNPay] Lỗi khi gọi merchant API: {}", e.getMessage());
            // Timeout / mất kết mạch: KHÔNG kết luận thất bại — trả map rỗng để caller giữ
            // trạng thái chờ xác minh.
            return Map.of();
        }
    }

    /**
     * Kiểm tra chữ ký của phản hồi từ merchant API.
     *
     * <p>Chuỗi checksum của phản hồi (theo tài liệu QueryDR/Refund):
     * {@code vnp_ResponseId|vnp_Command|vnp_ResponseCode|vnp_Message|vnp_TmnCode|vnp_TxnRef|
     * vnp_Amount|vnp_BankCode|vnp_PayDate|vnp_TransactionNo|vnp_TransactionType|
     * vnp_TransactionStatus|vnp_OrderInfo|vnp_PromotionCode|vnp_PromotionAmount}
     *
     * <p>Nếu phản hồi không có {@code vnp_SecureHash} thì bỏ qua kiểm tra (một số phiên bản
     * sandbox không trả về trường này) — nhưng ghi cảnh báo để đối soát.
     */
    private void verifyMerchantResponseSignature(Map<String, String> response) {
        String received = response.get("vnp_SecureHash");
        if (received == null || received.isBlank()) {
            // Sandbox thường KHÔNG trả vnp_SecureHash cho merchant API ⇒ đây là hành vi
            // bình thường, chỉ ghi ở mức DEBUG để không làm nhiễu log (trước đây mỗi lần
            // gọi đều in 1 dòng WARN).
            log.debug("[VNPay] Phản hồi merchant API không kèm vnp_SecureHash — bỏ qua kiểm tra chữ ký.");
            return;
        }
        String data = String.join("|",
                nz(response.get("vnp_ResponseId")),
                nz(response.get("vnp_Command")),
                nz(response.get("vnp_ResponseCode")),
                nz(response.get("vnp_Message")),
                nz(response.get("vnp_TmnCode")),
                nz(response.get("vnp_TxnRef")),
                nz(response.get("vnp_Amount")),
                nz(response.get("vnp_BankCode")),
                nz(response.get("vnp_PayDate")),
                nz(response.get("vnp_TransactionNo")),
                nz(response.get("vnp_TransactionType")),
                nz(response.get("vnp_TransactionStatus")),
                nz(response.get("vnp_OrderInfo")),
                nz(response.get("vnp_PromotionCode")),
                nz(response.get("vnp_PromotionAmount")));

        String expected = hmacSha512(data, properties.getHashSecret());
        if (!constantTimeEquals(expected, received)) {
            log.error("[VNPay] Chữ ký phản hồi merchant API KHÔNG hợp lệ (txnRef={}) — coi như chưa xác minh được kết quả.",
                    response.get("vnp_TxnRef"));
            response.remove("vnp_ResponseCode");
            response.remove("vnp_TransactionStatus");
        }
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }

    private Map<String, String> parseResponse(String response) {
        if (response == null || response.isBlank()) {
            return Map.of();
        }
        try {
            JsonNode node = objectMapper.readTree(response);
            Map<String, String> result = new LinkedHashMap<>();
            node.fields().forEachRemaining(entry -> result.put(entry.getKey(),
                    entry.getValue().isNull() ? "" : entry.getValue().asText()));
            return result;
        } catch (Exception e) {
            log.warn("[VNPay] Không parse được response: {}", e.getMessage());
            return Map.of();
        }
    }

    /**
     * Dựng chuỗi tính hash (chuỗi hashData) theo chuẩn VNPay 2.1.0.
     *
     * <p>Quy tắc: sắp xếp key tăng dần, bỏ qua giá trị rỗng, mỗi cặp là
     * {@code key=urlencode(value)} nối bằng {@code &} — tên tham số KHÔNG encode.
     */
    private String buildHashData(Map<String, String> params) {
        Map<String, String> sorted = new TreeMap<>(params);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : sorted.entrySet()) {
            String value = entry.getValue();
            if (value == null || value.isEmpty()) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append('&');
            }
            sb.append(entry.getKey()).append('=').append(encode(value));
        }
        return sb.toString();
    }

    /**
     * Dựng query string gửi đi — encode CẢ tên tham số và giá trị.
     */
    private String buildQueryString(Map<String, String> params) {
        Map<String, String> sorted = new TreeMap<>(params);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : sorted.entrySet()) {
            String value = entry.getValue();
            if (value == null || value.isEmpty()) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append('&');
            }
            sb.append(encode(entry.getKey())).append('=').append(encode(value));
        }
        return sb.toString();
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    /** HMACSHA512 theo chuẩn VNPay (hex lowercase). */
    public static String hmacSha512(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] result = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception e) {
            log.error("[VNPay] Không tính được HMACSHA512: {}", e.getMessage());
            throw new IllegalStateException("Không thể tạo checksum HMACSHA512", e);
        }
    }

    /** SHA256 (hỗ trợ cho merchant cấu hình hashSecret dạng SHA256 cũ). */
    public static String sha256(String data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Không thể tạo checksum SHA256", e);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private void requireConfigured() {
        if (!properties.isConfigured()) {
            throw new BusinessException("VNPAY-NOT-CONFIGURED",
                    "Tích hợp VNPay chưa được cấu hình. Vui lòng thiết lập VNPAY_TMN_CODE và VNPAY_HASH_SECRET.");
        }
    }

    /** Thời điểm hiện tại theo múi giờ VNPay. */
    public LocalDateTime nowVnPay() {
        return LocalDateTime.ofInstant(Instant.now(), ZoneId.of(properties.getTimezone()));
    }

    /** Định dạng ngày giờ theo chuẩn VNPay (yyyyMMddHHmmss). */
    public String formatDate(LocalDateTime dateTime) {
        return dateTime.format(VNPAY_DATE_FORMAT);
    }

    /** Sinh mã request id duy nhất (tối đa 32 ký tự alphanumeric). */
    private String generateRequestId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 32);
    }
}
