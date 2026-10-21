package com.journeygo.modules.community.dto;

import com.journeygo.modules.community.entity.PostComment;
import lombok.Builder;

import java.time.Instant;

@Builder
public record CommentResponse(
        Long id,
        Long postId,
        Long authorId,
        String authorName,
        String authorAvatarUrl,
        String content,
        Instant createdAt
) {
    public static CommentResponse fromEntity(PostComment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .authorId(comment.getAuthorId())
                .authorName(comment.getAuthorName())
                .authorAvatarUrl(comment.getAuthorAvatarUrl())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
