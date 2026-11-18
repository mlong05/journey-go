package com.journeygo.modules.achievement.dto;

import com.journeygo.modules.achievement.entity.enums.AchievementCategory;
import com.journeygo.modules.achievement.entity.enums.AchievementTier;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminAchievementRequest(
        @NotBlank(message = "Mã thành tựu không được để trống")
        @Size(max = 100, message = "Mã thành tựu tối đa 100 ký tự")
        String code,

        @NotBlank(message = "Tên thành tựu không được để trống")
        @Size(max = 150, message = "Tên thành tựu tối đa 150 ký tự")
        String name,

        @NotBlank(message = "Mô tả thành tựu không được để trống")
        String description,

        @NotNull(message = "Danh mục thành tựu không được để trống")
        AchievementCategory category,

        @NotNull(message = "Cấp bậc thành tựu không được để trống")
        AchievementTier tier,

        @NotNull(message = "Giá trị mục tiêu không được để trống")
        @Min(value = 1, message = "Giá trị mục tiêu tối thiểu là 1")
        Integer targetValue,

        @NotNull(message = "Điểm thưởng không được để trống")
        @Min(value = 0, message = "Điểm thưởng không được âm")
        Integer pointsReward,

        String badgeName,

        String badgeIcon,

        Long badgeId,

        Boolean active
) {
}

