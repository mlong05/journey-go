package com.journeygo.modules.community.dto;

import com.journeygo.modules.community.entity.CommunityPost;
import com.journeygo.modules.community.entity.enums.PostStatus;
import com.journeygo.modules.community.entity.enums.ReactionType;
import lombok.Builder;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Builder
public record PostResponse(
        Long id,
        Long authorId,
        String authorName,
        String authorAvatarUrl,
        String title,
        String content,
        Long tourId,
        Long destinationId,
        Long journeyId,
        PostStatus status,
        String moderationNote,
        Integer likesCount,
        Integer commentsCount,
        ReactionType myReaction,
        List<PostMediaResponse> mediaList,
        Instant createdAt,
        Instant updatedAt
) {
    public static PostResponse fromEntity(CommunityPost post, ReactionType myReaction) {
        List<PostMediaResponse> mediaResponses = post.getMediaList() != null
                ? post.getMediaList().stream().map(PostMediaResponse::fromEntity).toList()
                : Collections.emptyList();

        return PostResponse.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .authorName(post.getAuthorName())
                .authorAvatarUrl(post.getAuthorAvatarUrl())
                .title(post.getTitle())
                .content(post.getContent())
                .tourId(post.getTourId())
                .destinationId(post.getDestinationId())
                .journeyId(post.getJourneyId())
                .status(post.getStatus())
                .moderationNote(post.getModerationNote())
                .likesCount(post.getLikesCount())
                .commentsCount(post.getCommentsCount())
                .myReaction(myReaction)
                .mediaList(mediaResponses)
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }
}
