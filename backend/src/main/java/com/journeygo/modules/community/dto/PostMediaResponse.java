package com.journeygo.modules.community.dto;

import com.journeygo.modules.community.entity.PostMedia;
import lombok.Builder;

@Builder
public record PostMediaResponse(
        Long id,
        String mediaUrl,
        String mediaType,
        Integer orderIndex
) {
    public static PostMediaResponse fromEntity(PostMedia media) {
        return PostMediaResponse.builder()
                .id(media.getId())
                .mediaUrl(media.getMediaUrl())
                .mediaType(media.getMediaType())
                .orderIndex(media.getOrderIndex())
                .build();
    }
}
