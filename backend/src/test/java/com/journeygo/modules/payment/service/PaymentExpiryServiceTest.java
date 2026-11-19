package com.journeygo.modules.payment.service;

import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.payment.entity.Payment;
import com.journeygo.modules.payment.entity.enums.PaymentStatus;
import com.journeygo.modules.payment.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tác vụ quét Payment quá hạn thanh toán (UC-01 — Timeout).
 *
 * <p>── Bối cảnh ──
 * Giao dịch VNPay có hạn thanh toán 10 phút. Nếu khách không hoàn tất thanh toán,
 * giao dịch treo ở PENDING/PROCESSING. Trước đây KHÔNG có code nào đóng các giao
 * dịch này (QueryDR trên Sandbox luôn trả 99) ⇒ chúng hiển thị "Đang xử lý" vô thời
 * hạn trên trang Quản trị Tài chính.
 *
 * <p>⚠️ Ràng buộc tài chính quan trọng nhất: {@code EXPIRED} KHÔNG phải "thất bại" —
 * kết quả xác minh đến muộn vẫn được áp dụng ⇒ KHÔNG mất tiền khách.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PaymentExpiryServiceTest {

    @Mock private PaymentRepository paymentRepository;

    @Mock private com.journeygo.modules.refund.repository.RefundRequestRepository refundRepository;

    @Mock private com.journeygo.modules.booking.repository.BookingRepository bookingRepository;

    @Mock private com.journeygo.modules.booking.service.BookingService bookingService;

    @Mock private com.journeygo.modules.notification.service.NotificationPublisher notifications;

    @Mock private com.journeygo.modules.payment.config.VnPayProperties vnPayProperties;

    @Mock private com.journeygo.modules.payment.service.VnPayClient vnPayClient;

    @Mock private com.journeygo.modules.providerrevenue.service.ProviderRevenueService providerRevenueService;

    @Mock private com.journeygo.modules.payment.service.PaymentMethodService paymentMethodService;

    @InjectMocks private PaymentService service;

    private FinanceProperties financeProperties;

    @BeforeEach
    void setUp() {
        financeProperties = new FinanceProperties();
        financeProperties.setPaymentExpiryGraceSeconds(900);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "financeProperties", financeProperties);
    }

    private Payment payment(Long id, PaymentStatus status, Instant expiresAt) {
        Payment p = new Payment();
        p.setId(id);
        p.setTxnRef("JG" + id + "-TEST");
        p.setStatus(status);
        p.setExpiresAt(expiresAt);
        p.setAmount(new java.math.BigDecimal("1000000"));
        p.setCreatedAt(Instant.now().minusSeconds(3600));
        return p;
    }

    @Test
    void expiresStuckPaymentPastDeadline() {
        Instant past = Instant.now().minusSeconds(3600); // quá hạn 1 giờ (> grace 15 phút)
        Payment p = payment(1L, PaymentStatus.PROCESSING, past);

        when(paymentRepository.findExpiredPendingPayments(anyList(), any()))
                .thenReturn(List.of(p));
        when(paymentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(p));

        int expired = service.expireOverduePayments();

        assertEquals(1, expired);
        assertEquals(PaymentStatus.EXPIRED, p.getStatus());
        assertNotNull(p.getResolvedAt());
        verify(paymentRepository).save(p);
    }

    @Test
    void keepsPaymentWithinGraceWindow() {
        // Quá hạn 5 phút — còn trong khoảng lướt an toàn 15 phút ⇒ chưa đóng.
        Instant slightlyPast = Instant.now().minusSeconds(300);
        Payment p = payment(2L, PaymentStatus.PROCESSING, slightlyPast);

        when(paymentRepository.findExpiredPendingPayments(anyList(), any()))
                .thenReturn(List.of(p));
        when(paymentRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(p));

        int expired = service.expireOverduePayments();

        assertEquals(0, expired);
        assertEquals(PaymentStatus.PROCESSING, p.getStatus());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void doesNotOverwritePaymentThatJustSucceeded() {
        // Một luồng khác (IPN) vừa xác minh thành công trước khi tác vụ quét tới
        // ⇒ KHÔNG được ghi đè thành EXPIRED.
        Instant past = Instant.now().minusSeconds(3600);
        Payment p = payment(3L, PaymentStatus.SUCCESS, past);

        when(paymentRepository.findExpiredPendingPayments(anyList(), any()))
                .thenReturn(List.of(p));
        when(paymentRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(p));

        int expired = service.expireOverduePayments();

        assertEquals(0, expired);
        assertEquals(PaymentStatus.SUCCESS, p.getStatus());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void expiredIsNotFinalSoLateCallbackIsStillApplied() {
        // ⚠️ AN TOÀN TÀI CHÍNH: EXPIRED không nằm trong isFinal() ⇒ callback/IPN
        // đến muộn vẫn được áp dụng ⇒ không mất tiền khách.
        assertEquals(false, PaymentStatus.EXPIRED.isFinal());
        assertEquals(false, PaymentStatus.EXPIRED.isVerifiedFailure());
    }

    @Test
    void markProcessingDoesNotReopenExpiredPayment() {
        // Một lượt QueryDR không xác minh được kết quả KHÔNG được mở lại giao dịch
        // đã hết hạn ⇒ tránh nhấp nháy "Đang xử lý" ⇄ "Đã hết hạn".
        Payment p = payment(4L, PaymentStatus.EXPIRED, Instant.now().minusSeconds(3600));

        p.markProcessing();

        assertEquals(PaymentStatus.EXPIRED, p.getStatus());
    }

    @Test
    void markSuccessStillAppliesToExpiredPayment() {
        // Callback đến muộn VÀ giao dịch ĐÃ hết hạn ⇒ vẫn ghi nhận thành công.
        Payment p = payment(5L, PaymentStatus.EXPIRED, Instant.now().minusSeconds(3600));

        p.markSuccess(Instant.now(), "VNP001", "BANK01", "VNBANK", "00", "00", "ok");

        assertEquals(PaymentStatus.SUCCESS, p.getStatus());
    }
}
