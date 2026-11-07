package com.journeygo.modules.aiguide.repository;

import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiKnowledgeChunkRepository extends JpaRepository<AiKnowledgeChunk, UUID> {

    /**
     * Tìm kiếm Top-K chunks tương đồng nhất theo Cosine Distance (<=>) tại một địa điểm cụ thể.
     * Có thể lọc thêm theo contentType ('CULTURAL_STORY', 'TASK_HINT', v.v.).
     *
     * @param destinationId ID của địa điểm
     * @param contentType   Loại nội dung (có thể null nếu lấy tất cả)
     * @param queryVector   Chuỗi vector dạng "[0.123, -0.456, ...]"
     * @param topK          Số lượng kết quả tối đa
     */
    @Query(value = """
            SELECT * FROM ai_knowledge_chunks
            WHERE destination_id = :destinationId
              AND (:contentType IS NULL OR content_type = :contentType)
            ORDER BY embedding <=> cast(:queryVector as vector)
            LIMIT :topK
            """, nativeQuery = true)
    List<AiKnowledgeChunk> searchSimilar(
            @Param("destinationId") Long destinationId,
            @Param("contentType") String contentType,
            @Param("queryVector") String queryVector,
            @Param("topK") int topK
    );

    /**
     * Tìm kiếm Top-K chunks tương đồng toàn hệ thống (không giới hạn địa điểm).
     */
    @Query(value = """
            SELECT * FROM ai_knowledge_chunks
            ORDER BY embedding <=> cast(:queryVector as vector)
            LIMIT :topK
            """, nativeQuery = true)
    List<AiKnowledgeChunk> searchGlobalSimilar(
            @Param("queryVector") String queryVector,
            @Param("topK") int topK
    );

    /**
     * Lấy danh sách chunks theo nguồn gốc dữ liệu.
     */
    List<AiKnowledgeChunk> findBySourceId(String sourceId);

    /**
     * Đếm số lượng chunks của một nguồn gốc dữ liệu.
     */
    long countBySourceId(String sourceId);

    /**
     * Xóa sạch các vector chunks cũ khi bài viết bị sửa/xóa/hủy duyệt.
     */
    @Modifying
    @Query("DELETE FROM AiKnowledgeChunk c WHERE c.sourceId = :sourceId")
    void deleteBySourceId(@Param("sourceId") String sourceId);

    /**
     * Xóa toàn bộ chunks của một địa điểm khi địa điểm bị xóa.
     */
    @Modifying
    @Query("DELETE FROM AiKnowledgeChunk c WHERE c.destinationId = :destinationId")
    void deleteByDestinationId(@Param("destinationId") Long destinationId);
}
