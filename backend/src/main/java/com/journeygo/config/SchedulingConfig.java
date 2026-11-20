package com.journeygo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Bật cơ chế lập lịch của Spring cho các tác vụ nền của module tài chính:
 * <ul>
 *   <li>Quét Booking quá hạn thanh toán (10 phút) — {@code BookingExpiryScheduler}.</li>
 *   <li>Quét Payment quá hạn thanh toán (10 phút) — {@code PaymentExpiryScheduler}.</li>
 *   <li>Kiểm tra trạng thái Refund đang chờ kết quả cuối cùng từ VNPay — {@code RefundStatusScheduler}.</li>
 * </ul>
 *
 * <p>Tác vụ quét hết hạn KHÔNG tự quyết định thất bại cho giao dịch chưa rõ kết quả —
 * nó chuyển Booking sang EXPIRED và giải phóng slot; các Payment attempt chưa có kết quả
 * vẫn được giữ ở trạng thái chờ xác minh (UC-01, UC-03).
 *
 * <p>⚠️ Riêng Payment: {@code EXPIRED} KHÔNG phải "thất bại" — kết quả xác minh đến
 * muộn vẫn được áp dụng bình thường (không mất tiền khách).
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
