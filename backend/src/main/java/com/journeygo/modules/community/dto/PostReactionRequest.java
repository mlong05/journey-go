package com.journeygo.modules.community.dto;

import com.journeygo.modules.community.entity.enums.ReactionType;
import jakarta.validation.constraints.NotNull;

public record PostReactionRequest(
        @NotNull(message = "Loại tương tác không được để trống")
        ReactionType reactionType
) {
}
