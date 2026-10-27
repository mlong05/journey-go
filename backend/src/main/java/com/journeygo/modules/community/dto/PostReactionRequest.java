package com.journeygo.modules.community.dto;

import com.journeygo.modules.community.entity.enums.ReactionType;

public record PostReactionRequest(
        // Chỉ hỗ trợ thả tim (LOVE); bỏ trống thì mặc định là LOVE.
        ReactionType reactionType
) {
}
