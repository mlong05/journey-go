package com.journeygo.modules.aiguide.listener;

import com.journeygo.modules.aiguide.event.DestinationInvalidatedEvent;
import com.journeygo.modules.aiguide.event.DestinationSyncedEvent;
import com.journeygo.modules.aiguide.service.DocumentIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Event Listener tự động đồng bộ hoặc thu hồi Vector Chunks khi Điểm đến thay đổi trạng thái/thông tin.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DestinationAiEventListener {

    private final DocumentIngestionService ingestionService;

    @Async("aiTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleDestinationSynced(DestinationSyncedEvent event) {
        log.info("Nhận sự kiện DestinationSyncedEvent: destinationId={}, name={}",
                event.destinationId(), event.name());
        try {
            ingestionService.ingestDestinationSummary(
                    event.destinationId(),
                    event.name(),
                    event.description(),
                    event.address()
            );
        } catch (Exception ex) {
            log.error("Lỗi đồng bộ vector tự động cho điểm đến id={}: {}",
                    event.destinationId(), ex.getMessage(), ex);
        }
    }

    @Async("aiTaskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleDestinationInvalidated(DestinationInvalidatedEvent event) {
        log.info("Nhận sự kiện DestinationInvalidatedEvent: destinationId={}, reason={}, removeAll={}",
                event.destinationId(), event.reason(), event.removeAllDestinationChunks());
        try {
            if (event.removeAllDestinationChunks()) {
                ingestionService.invalidateDestination(event.destinationId());
            } else {
                ingestionService.invalidateContent("DESTINATION:" + event.destinationId());
            }
        } catch (Exception ex) {
            log.error("Lỗi thu hồi vector cho điểm đến id={}: {}",
                    event.destinationId(), ex.getMessage(), ex);
        }
    }
}
