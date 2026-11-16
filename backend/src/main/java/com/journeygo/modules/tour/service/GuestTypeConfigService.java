package com.journeygo.modules.tour.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.tour.dto.GuestTypeConfigResponse;
import com.journeygo.modules.tour.dto.UpdateGuestTypeConfigsRequest;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.GuestTypeConfig;
import com.journeygo.modules.tour.repository.GuestTypeConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Cấu hình loại khách & độ tuổi (Admin).
 *
 * <p>Cấu hình được nạp vào {@link GuestType} (bộ nhớ) khi khởi động, khi Admin lưu, và làm mới mỗi phút
 * (để nhiều instance backend dùng chung một DB vẫn đồng bộ). Đơn đã đặt không bị ảnh hưởng vì mỗi hành khách
 * đã lưu loại khách tại thời điểm đặt; cấu hình mới chỉ áp dụng cho đơn đặt sau đó.
 *
 * <p>Quy tắc khi lưu (4 loại theo tuổi tăng dần: Em bé &lt; Trẻ nhỏ &lt; Trẻ em &lt; Người lớn):
 * loại nhỏ tuổi nhất bắt đầu từ 0 tuổi; tuổi bắt đầu tăng dần (mỗi loại ít nhất 1 năm tuổi) — khoảng tuổi
 * vì vậy luôn liền nhau, không chồng, không hở; Người lớn (không giới hạn trên) không được miễn phí.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GuestTypeConfigService {

    private final GuestTypeConfigRepository repository;

    @EventListener(ApplicationReadyEvent.class)
    public void loadOnStartup() {
        reload();
    }

    @Scheduled(fixedDelay = 60_000, initialDelay = 60_000)
    public void refresh() {
        reload();
    }

    @Transactional(readOnly = true)
    public void reload() {
        try {
            Map<GuestType, GuestType.Settings> map = new EnumMap<>(GuestType.class);
            for (GuestTypeConfig c : repository.findAll()) {
                map.put(c.getGuestType(), new GuestType.Settings(c.getLabel(), c.getMinAge(), c.isAlwaysFree()));
            }
            if (map.size() == GuestType.values().length) GuestType.applySettings(map);
        } catch (RuntimeException e) {
            log.warn("[GuestType] Không nạp được cấu hình loại khách, dùng giá trị hiện tại: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<GuestTypeConfigResponse> getAll() {
        Map<GuestType, GuestTypeConfig> rows = new EnumMap<>(GuestType.class);
        repository.findAll().forEach(c -> rows.put(c.getGuestType(), c));
        List<GuestTypeConfigResponse> out = new ArrayList<>();
        for (int i = 0; i < GuestType.BY_AGE.length; i++) {
            GuestType t = GuestType.BY_AGE[i];
            GuestTypeConfig row = rows.get(t);
            out.add(GuestTypeConfigResponse.of(t, i, row != null ? row.getUpdatedAt() : null));
        }
        return out;
    }

    @Transactional
    public List<GuestTypeConfigResponse> update(UpdateGuestTypeConfigsRequest request, Long adminId) {
        Map<GuestType, UpdateGuestTypeConfigsRequest.Item> byType = new EnumMap<>(GuestType.class);
        for (UpdateGuestTypeConfigsRequest.Item item : request.items()) {
            if (byType.put(item.guestType(), item) != null) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Loại khách " + item.guestType() + " bị gửi trùng");
            }
        }
        if (byType.size() != GuestType.values().length) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Cần gửi đủ 4 loại khách");
        }

        int prevMin = -1;
        Set<String> labels = new HashSet<>();
        for (int i = 0; i < GuestType.BY_AGE.length; i++) {
            UpdateGuestTypeConfigsRequest.Item it = byType.get(GuestType.BY_AGE[i]);
            String label = it.label().trim();
            if (!labels.add(label.toLowerCase(Locale.ROOT))) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên loại khách \"" + label + "\" bị trùng");
            }
            if (i == 0 && it.minAge() != 0) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "\"" + label + "\" là loại nhỏ tuổi nhất nên phải bắt đầu từ 0 tuổi");
            }
            if (i > 0 && it.minAge() <= prevMin) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Tuổi bắt đầu của \"" + label + "\" phải lớn hơn " + prevMin + " (loại trước đó)");
            }
            prevMin = it.minAge();
        }
        UpdateGuestTypeConfigsRequest.Item adult = byType.get(GuestType.ADULT);
        if (adult.alwaysFree()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "\"" + adult.label().trim() + "\" không được đặt là miễn phí");
        }

        for (GuestType t : GuestType.values()) {
            UpdateGuestTypeConfigsRequest.Item it = byType.get(t);
            GuestTypeConfig row = repository.findById(t).orElseGet(() -> GuestTypeConfig.builder().guestType(t).build());
            row.setLabel(it.label().trim());
            row.setMinAge(it.minAge());
            row.setAlwaysFree(it.alwaysFree());
            row.setUpdatedBy(adminId);
            repository.save(row);
        }
        repository.flush();
        reload();
        log.info("[GuestType] Admin {} cập nhật cấu hình loại khách", adminId);
        return getAll();
    }
}
