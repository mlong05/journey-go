package com.journeygo.modules.moderation.service;

import com.journeygo.modules.auth.service.EmailService;
import com.journeygo.modules.moderation.entity.TourReviewNote;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.util.HtmlUtils;

import java.util.List;

/**
 * Email gửi đối tác sau khi Moderator ra quyết định (mục 9.2 – 9.4).
 * Gửi SAU KHI transaction commit, lỗi gửi mail không làm hỏng thao tác kiểm duyệt.
 */
@Component
@RequiredArgsConstructor
public class TourModerationMailer {

    private final EmailService emailService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${app.support-email:}")
    private String supportEmail;

    public void sendApproved(Tour tour) {
        String link = frontendUrl + "/tours/" + tour.getTourId();
        String body = "<p>Tour <b>" + esc(tour.getTitle()) + "</b> của bạn đã được duyệt và đang mở bán trên JourneyGo.</p>"
                + "<p><a href=\"" + esc(link) + "\">Xem trang tour</a></p>";
        send(tour.getCreatedBy(), "Tour đã được duyệt trên JourneyGo", body);
    }

    public void sendChangesRequested(Tour tour, String generalNote, List<TourReviewNote> notes) {
        StringBuilder list = new StringBuilder("<ul>");
        for (TourReviewNote note : notes) {
            list.append("<li><b>").append(esc(stepLabel(note.getStep().name()))).append("</b>");
            if (note.getField() != null) list.append(" – ").append(esc(note.getField()));
            list.append(": ").append(esc(note.getNote())).append("</li>");
        }
        list.append("</ul>");
        String body = "<p>Tour <b>" + esc(tour.getTitle()) + "</b> cần chỉnh sửa trước khi được duyệt.</p>"
                + (generalNote == null || generalNote.isBlank() ? "" : "<p>" + esc(generalNote) + "</p>")
                + "<p>Danh sách ghi chú của Moderator:</p>" + list
                + "<p>Vui lòng sửa theo ghi chú rồi gửi duyệt lại.</p>";
        send(tour.getCreatedBy(), "Yêu cầu chỉnh sửa tour trên JourneyGo", body);
    }

    public void sendRejected(Tour tour, String reasonText) {
        String contact = supportEmail == null || supportEmail.isBlank() ? emailService.getFromEmail() : supportEmail;
        String body = "<p>Rất tiếc, tour <b>" + esc(tour.getTitle()) + "</b> không được duyệt.</p>"
                + "<p><b>Lý do từ chối:</b> " + esc(reasonText) + "</p>"
                + "<p>Nếu cần hỗ trợ, vui lòng liên hệ: <a href=\"mailto:" + esc(contact) + "\">" + esc(contact) + "</a>.</p>";
        send(tour.getCreatedBy(), "Thông báo từ chối tour trên JourneyGo", body);
    }

    private void send(User recipient, String subject, String innerHtml) {
        if (recipient == null) return;
        String to = recipient.getEmail();
        String name = recipient.getFullName() == null ? "Quý đối tác" : recipient.getFullName();
        String html = "<!DOCTYPE html><html lang=\"vi\"><head><meta charset=\"UTF-8\"></head>"
                + "<body style=\"font-family:Segoe UI,Arial,sans-serif;color:#334155;line-height:1.6\">"
                + "<h2 style=\"color:#0f766e\">JourneyGo</h2>"
                + "<p>Xin chào " + esc(name) + ",</p>" + innerHtml
                + "<p style=\"color:#94a3b8;font-size:12px\">Email được gửi tự động từ JourneyGo.</p>"
                + "</body></html>";
        Runnable task = () -> emailService.sendHtml(to, subject, html);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }

    private static String stepLabel(String step) {
        return switch (step) {
            case "BASIC_INFO" -> "Bước 1 – Thông tin cơ bản";
            case "PRICING" -> "Bước 2 – Giá vé";
            case "STOPS" -> "Bước 3 – Điểm đến";
            case "ITINERARY" -> "Bước 4 – Lịch trình";
            case "SCHEDULE" -> "Bước 5 – Lịch khởi hành";
            default -> step;
        };
    }

    private static String esc(String value) {
        return value == null ? "" : HtmlUtils.htmlEscape(value);
    }
}
