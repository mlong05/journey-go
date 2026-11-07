package com.journeygo.modules.reward.service;

import com.journeygo.modules.reward.dto.RewardSettingResponse;
import com.journeygo.modules.reward.entity.RewardSetting;
import com.journeygo.modules.reward.entity.RewardSettingCode;
import com.journeygo.modules.reward.repository.RewardSettingRepository;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RewardSettingService {

    private final RewardSettingRepository repository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<RewardSettingResponse> getAll() {
        return Arrays.stream(RewardSettingCode.values()).map(this::toResponse).toList();
    }

    /** Số điểm hiện hành; chưa cấu hình thì dùng giá trị mặc định của mã. */
    @Transactional(readOnly = true)
    public int pointsFor(RewardSettingCode code) {
        return repository.findById(code)
                .map(RewardSetting::getPoints)
                .orElse(code.getDefaultPoints());
    }

    @Transactional
    public RewardSettingResponse update(RewardSettingCode code, int points, Long adminId) {
        RewardSetting setting = repository.findById(code)
                .orElseGet(() -> RewardSetting.builder().code(code).build());
        setting.setPoints(points);
        setting.setUpdatedBy(userRepository.findById(adminId).orElse(null));
        repository.save(setting);
        log.info("[RewardSetting] admin={} đặt {} = {} điểm", adminId, code, points);
        return toResponse(code);
    }

    private RewardSettingResponse toResponse(RewardSettingCode code) {
        return repository.findById(code)
                .map(s -> new RewardSettingResponse(code, code.getLabel(), s.getPoints(),
                        s.getUpdatedBy() != null ? s.getUpdatedBy().getFullName() : null, s.getUpdatedAt()))
                .orElse(new RewardSettingResponse(code, code.getLabel(), code.getDefaultPoints(), null, null));
    }
}
