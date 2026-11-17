package com.journeygo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Cấu hình xử lý bất đồng bộ (@Async) cho toàn bộ hệ thống,
 * đặc biệt phục vụ việc nạp vector AI (Ingestion Pipeline) không làm nghẽn luồng kiểm duyệt nội dung.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "aiTaskExecutor")
    public Executor aiTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("AI-Ingest-");
        executor.initialize();
        return executor;
    }
}

