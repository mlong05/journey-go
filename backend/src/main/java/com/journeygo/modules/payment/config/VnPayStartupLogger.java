package com.journeygo.modules.payment.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * In cấu hình VNPay quan trọng khi ứng dụng khởi động.
 *
 * <p>Mục đích: phát hiện sớm các lỗi cấu hình hay gặp khi test Sandbox —
 * đặc biệt là {@code VNPAY_IPN_URL} bị rỗng (IPN không tới → Payment kẹt PROCESSING)
 * hoặc {@code VNPAY_RETURN_URL} còn trỏ về {@code localhost}.
 *
 * <p>KHÔNG in {@code hashSecret}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VnPayStartupLogger {

    private final VnPayProperties properties;

    @EventListener(ApplicationReadyEvent.class)
    public void logConfiguration() {
        if (!properties.isEnabled()) {
            log.info("[VNPay] Tích hợp VNPay đang TẮT (app.vnpay.enabled=false).");
            return;
        }

        log.info("[VNPay] Cấu hình: tmnCode={}, version=2.1.0, verifySignature={}, bankCode={}",
                properties.getTmnCode(),
                properties.isVerifySignature(),
                properties.getBankCode() == null || properties.getBankCode().isBlank()
                        ? "(trống — khách tự chọn trên trang VNPay)"
                        : properties.getBankCode());

        log.info("[VNPay] IPN URL    = {}", properties.getIpnUrl());
        log.info("[VNPay] Return URL = {}", properties.getReturnUrl());

        if (properties.getIpnUrl() == null || properties.getIpnUrl().isBlank()) {
            log.warn("""

                    ⚠️ [VNPay] VNPAY_IPN_URL CHƯA ĐƯỢC CẤU HÌNH.
                       VNPay sẽ KHÔNG gọi được webhook → Payment kẹt ở PROCESSING.
                       Hãy đặt URL public (vd ngrok: ngrok http 8088) rồi restart app.
                    """);
        } else if (!properties.getIpnUrl().startsWith("https://")) {
            log.warn("⚠️ [VNPay] VNPAY_IPN_URL không phải HTTPS — VNPay có thể từ chối webhook.");
        } else if (properties.getIpnUrl().contains("localhost")) {
            log.warn("⚠️ [VNPay] VNPAY_IPN_URL chứa 'localhost' — VNPay KHÔNG gọi được localhost.");
        }

        if (properties.getReturnUrl() == null || properties.getReturnUrl().isBlank()) {
            log.warn("⚠️ [VNPay] VNPAY_RETURN_URL chưa được cấu hình — khách sẽ không được chuyển hướng về hệ thống.");
        }
    }
}
