package com.journeygo.modules.aiguide.listener;

import com.journeygo.modules.aiguide.event.ContentApprovedEvent;
import com.journeygo.modules.aiguide.event.ContentInvalidatedEvent;
import com.journeygo.modules.aiguide.service.DocumentIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Event Listener lắng nghe các sự kiện kiểm duyệt nội dung văn hóa.
 * Chạy bất đồng bộ (@Async) sau khi transaction nguồn commit thành công (AFTER_COMMIT).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ContentModerationAiEventListener {

    private final DocumentIngestionService ingestionService;

    @Async("aiTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleContentApproved(ContentApprovedEvent event) {
        log.info("Nhận sự kiện ContentApprovedEvent: contentId={}, destination={}",
                event.contentId(), event.destinationName());
        try {
            ingestionService.ingestCulturalContent(
                    event.contentId(),
                    event.destinationId(),
                    event.destinationName(),
                    event.category(),
                    event.title(),
                    event.contentText()
            );
        } catch (Exception ex) {
            log.error("Lỗi khi xử lý nạp vector tự động cho contentId={}: {}", event.contentId(), ex.getMessage(), ex);
        }
    }

    @Async("aiTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleContentInvalidated(ContentInvalidatedEvent event) {
        log.info("Nhận sự kiện ContentInvalidatedEvent: contentId={}, reason={}",
                event.contentId(), event.reason());
        try {
            ingestionService.invalidateContent("CULTURAL_CONTENT:" + event.contentId());
        } catch (Exception ex) {
            log.error("Lỗi khi thu hồi vector cho contentId={}: {}", event.contentId(), ex.getMessage(), ex);
        }
    }
}

