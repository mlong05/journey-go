package com.journeygo.modules.aiguide.service;

import java.util.List;

/**
 * Interface hợp đồng chung (Contract) cho dịch vụ Embedding.
 * Được Developer A triển khai và Developer B tái sử dụng để nhúng câu hỏi người dùng.
 */
public interface AiEmbeddingService {

    /**
     * Chuyển đổi một đoạn văn bản thành vector nhúng (768 chiều cho Gemini text-embedding-004).
     *
     * @param text Đoạn văn bản cần nhúng
     * @return Mảng float đại diện cho vector
     */
    float[] embed(String text);

    /**
     * Nhúng hàng loạt danh sách đoạn văn bản (Batch Embedding).
     *
     * @param texts Danh sách các đoạn văn bản
     * @return Danh sách các vector tương ứng
     */
    List<float[]> embedAll(List<String> texts);

    /**
     * Tiện ích chuyển đổi mảng float[] sang chuỗi vector cho PostgreSQL (dạng "[0.123, -0.456, ...]").
     */
    default String toVectorString(float[] vector) {
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
}

