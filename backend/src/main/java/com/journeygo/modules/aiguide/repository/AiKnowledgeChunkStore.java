package com.journeygo.modules.aiguide.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import com.pgvector.PGvector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

/**
 * Lớp truy cập Dual-Mode cho {@link AiKnowledgeChunk}:
 * <ul>
 *   <li>Môi trường có pgvector (Docker / Production): ghi CAST(? AS vector) và truy vấn HNSW Cosine Distance (&lt;=&gt;).</li>
 *   <li>Môi trường local Windows chưa cài pgvector (cột TEXT) hoặc H2 test: lưu chuỗi vector và tính Cosine Similarity chính xác trong Java.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AiKnowledgeChunkStore {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final AiKnowledgeChunkRepository chunkRepository;

    private volatile Boolean cachedPgVector;
    private volatile Boolean cachedJsonb;

    /**
     * Kiểm tra cột {@code embedding} có đang dùng kiểu {@code vector} của pgvector hay không.
     */
    public boolean isPgVectorEnabled() {
        detectColumnTypesIfNeeded();
        return Boolean.TRUE.equals(cachedPgVector);
    }

    private boolean isJsonbEnabled() {
        detectColumnTypesIfNeeded();
        return Boolean.TRUE.equals(cachedJsonb);
    }

    private void detectColumnTypesIfNeeded() {
        if (cachedPgVector != null && cachedJsonb != null) {
            return;
        }
        synchronized (this) {
            if (cachedPgVector != null && cachedJsonb != null) {
                return;
            }
            boolean pgVector = false;
            boolean jsonb = false;
            try {
                List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                        SELECT LOWER(column_name) AS col, LOWER(udt_name) AS udt
                        FROM information_schema.columns
                        WHERE LOWER(table_name) = 'ai_knowledge_chunks'
                          AND LOWER(column_name) IN ('embedding', 'metadata')
                        """);
                for (Map<String, Object> row : rows) {
                    String col = String.valueOf(row.get("col"));
                    String udt = String.valueOf(row.get("udt"));
                    if ("embedding".equals(col) && "vector".equals(udt)) {
                        pgVector = true;
                    }
                    if ("metadata".equals(col) && "jsonb".equals(udt)) {
                        jsonb = true;
                    }
                }
            } catch (Exception e) {
                log.debug("Không kiểm tra được metadata bảng ai_knowledge_chunks (fallback chế độ TEXT): {}", e.getMessage());
            }
            cachedPgVector = pgVector;
            cachedJsonb = jsonb;
            log.info("AI Vector Store mode: pgvector={}, jsonb={}", pgVector, jsonb);
        }
    }

    /**
     * Lưu danh sách chunks vào database, tự động tương thích cả cột {@code vector} lẫn cột {@code TEXT}.
     */
    public void saveChunks(List<AiKnowledgeChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return;
        }

        boolean pgVector = isPgVectorEnabled();
        boolean jsonb = isJsonbEnabled();
        String metadataExpr = jsonb ? "CAST(? AS jsonb)" : "?";
        String embeddingExpr = pgVector ? "CAST(? AS vector)" : "?";

        String sql = "INSERT INTO ai_knowledge_chunks "
                + "(id, source_id, destination_id, content_type, chunk_text, metadata, embedding, created_at, updated_at) "
                + "VALUES (?, ?, ?, ?, ?, " + metadataExpr + ", " + embeddingExpr + ", ?, ?)";

        Instant now = Instant.now();
        List<Object[]> batchArgs = new ArrayList<>(chunks.size());

        for (AiKnowledgeChunk chunk : chunks) {
            UUID id = chunk.getId() != null ? chunk.getId() : UUID.randomUUID();
            chunk.setId(id);
            Instant createdAt = chunk.getCreatedAt() != null ? chunk.getCreatedAt() : now;
            Instant updatedAt = chunk.getUpdatedAt() != null ? chunk.getUpdatedAt() : now;
            chunk.setCreatedAt(createdAt);
            chunk.setUpdatedAt(updatedAt);

            String metadataJson = serializeMetadata(chunk.getMetadata());
            String vectorStr = toVectorString(chunk.getEmbedding());

            batchArgs.add(new Object[]{
                    id,
                    chunk.getSourceId(),
                    chunk.getDestinationId(),
                    chunk.getContentType(),
                    chunk.getChunkText(),
                    metadataJson,
                    vectorStr,
                    Timestamp.from(createdAt),
                    Timestamp.from(updatedAt)
            });
        }

        jdbcTemplate.batchUpdate(sql, batchArgs);
    }

    /**
     * Tìm Top-K chunks tương đồng nhất. Hỗ trợ lọc theo {@code destinationId} và {@code contentType} (tùy chọn).
     */
    public List<AiKnowledgeChunk> searchSimilar(Long destinationId,
                                              String contentType,
                                              float[] queryVector,
                                              String queryVectorStr,
                                              int topK) {
        if (topK <= 0) {
            return Collections.emptyList();
        }

        if (isPgVectorEnabled()) {
            return searchViaPgVector(destinationId, contentType, queryVectorStr, topK);
        }
        return searchInMemoryFallback(destinationId, contentType, queryVector, topK);
    }

    private List<AiKnowledgeChunk> searchViaPgVector(Long destinationId,
                                                     String contentType,
                                                     String queryVectorStr,
                                                     int topK) {
        StringBuilder sql = new StringBuilder("""
                SELECT id, source_id, destination_id, content_type, chunk_text,
                       metadata::text AS metadata_json, embedding::text AS embedding_str,
                       created_at, updated_at
                FROM ai_knowledge_chunks
                WHERE 1=1
                """);
        List<Object> params = new ArrayList<>();

        if (destinationId != null) {
            sql.append(" AND destination_id = ?");
            params.add(destinationId);
        }
        if (StringUtils.hasText(contentType)) {
            sql.append(" AND content_type = ?");
            params.add(contentType);
        }

        sql.append(" ORDER BY embedding <=> CAST(? AS vector) LIMIT ?");
        params.add(queryVectorStr);
        params.add(topK);

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> AiKnowledgeChunk.builder()
                .id(UUID.fromString(rs.getString("id")))
                .sourceId(rs.getString("source_id"))
                .destinationId(rs.getLong("destination_id"))
                .contentType(rs.getString("content_type"))
                .chunkText(rs.getString("chunk_text"))
                .metadata(deserializeMetadata(rs.getString("metadata_json")))
                .embedding(parseVectorString(rs.getString("embedding_str")))
                .createdAt(toInstant(rs.getTimestamp("created_at")))
                .updatedAt(toInstant(rs.getTimestamp("updated_at")))
                .build(), params.toArray());
    }

    private List<AiKnowledgeChunk> searchInMemoryFallback(Long destinationId,
                                                          String contentType,
                                                          float[] queryVector,
                                                          int topK) {
        List<AiKnowledgeChunk> candidates;
        if (destinationId != null && StringUtils.hasText(contentType)) {
            candidates = chunkRepository.findByDestinationIdAndContentType(destinationId, contentType);
        } else if (destinationId != null) {
            candidates = chunkRepository.findByDestinationId(destinationId);
        } else if (StringUtils.hasText(contentType)) {
            candidates = chunkRepository.findAll().stream()
                    .filter(c -> contentType.equals(c.getContentType()))
                    .toList();
        } else {
            candidates = chunkRepository.findAll();
        }

        if (candidates.isEmpty()) {
            return Collections.emptyList();
        }

        return candidates.stream()
                .sorted(Comparator.comparingDouble(
                        (AiKnowledgeChunk c) -> cosineSimilarity(queryVector, c.getEmbedding())).reversed())
                .limit(topK)
                .toList();
    }

    /**
     * Tính Cosine Similarity trong khoảng [-1.0, 1.0]. Trả về 0 nếu một trong hai vector rỗng hoặc chuẩn bằng 0.
     */
    public static double cosineSimilarity(float[] a, float[] b) {
        if (a == null || b == null || a.length == 0 || b.length == 0) {
            return 0.0;
        }
        int len = Math.min(a.length, b.length);
        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < len; i++) {
            dot += (double) a[i] * b[i];
            normA += (double) a[i] * a[i];
            normB += (double) b[i] * b[i];
        }
        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private String serializeMetadata(Map<String, Object> metadata) {
        try {
            return objectMapper.writeValueAsString(metadata != null ? metadata : Collections.emptyMap());
        } catch (Exception e) {
            return "{}";
        }
    }

    private Map<String, Object> deserializeMetadata(String json) {
        if (!StringUtils.hasText(json)) {
            return new HashMap<>();
        }
        try {
            return objectMapper.readValue(json, MAP_TYPE);
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    private float[] parseVectorString(String vectorStr) {
        if (!StringUtils.hasText(vectorStr)) {
            return new float[0];
        }
        try {
            return new PGvector(vectorStr).toArray();
        } catch (Exception e) {
            return new float[0];
        }
    }

    private static String toVectorString(float[] vector) {
        if (vector == null || vector.length == 0) {
            return "[]";
        }
        StringBuilder sb = new StringBuilder(vector.length * 8);
        sb.append('[');
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(vector[i]);
        }
        sb.append(']');
        return sb.toString();
    }

    private static Instant toInstant(Timestamp ts) {
        return ts != null ? ts.toInstant() : null;
    }
}
