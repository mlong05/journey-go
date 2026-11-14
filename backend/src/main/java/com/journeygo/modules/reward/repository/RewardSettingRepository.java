package com.journeygo.modules.reward.repository;

import com.journeygo.modules.reward.entity.RewardSetting;
import com.journeygo.modules.reward.entity.RewardSettingCode;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RewardSettingRepository extends JpaRepository<RewardSetting, RewardSettingCode> {
}
