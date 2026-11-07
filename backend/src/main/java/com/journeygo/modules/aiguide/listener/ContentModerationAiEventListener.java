package com.journeygo.modules.aiguide.listener;

import com.journeygo.modules.aiguide.event.ContentApprovedEvent;
import com.journeygo.modules.aiguide.event.ContentInvalidatedEvent;
import com.journeygo.modules.aiguide.service.DocumentIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Event Listener lắng nghe các sự kiện kiểm duyệt nội dung văn hóa.
 * Chạy hoàn toàn bất đồng bộ (@Async) trên aiTaskExecutor để không làm chậm luồng của người dùng.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ContentModerationAiEventListener {

    private final DocumentIngestionService ingestionService;

    @Async("aiTaskExecutor")
    @EventListener
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
    @EventListener
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
