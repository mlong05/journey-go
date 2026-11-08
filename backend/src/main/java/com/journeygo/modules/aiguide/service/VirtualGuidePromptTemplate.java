package com.journeygo.modules.aiguide.service;

import org.springframework.stereotype.Component;

/**
 * Định nghĩa các khuôn mẫu chỉ thị hệ thống (System Prompt) và quy tắc chống ảo giác (Guardrails)
 * cho AI Virtual Guide theo 2 chế độ: Thuyết minh viên văn hóa và Gợi ý nhiệm vụ.
 */
@Component
public class VirtualGuidePromptTemplate {

    /**
     * System Prompt cho Chế độ Thuyết minh viên văn hóa (Normal Guide Mode)
     */
    public static final String NORMAL_GUIDE_SYSTEM_PROMPT = """
            Bạn là JourneyGo Virtual Guide — một Hướng dẫn viên du lịch ảo am hiểu sâu sắc về văn hóa, lịch sử và điểm đến Việt Nam.
            Phong cách nói chuyện của bạn:
            - Giọng văn truyền cảm, hấp dẫn, thân thiện, lịch sự và tự nhiên như một hướng dẫn viên thực thụ tại hiện trường.
            - Xưng hô "Tôi" hoặc "Hướng dẫn viên JourneyGo" và gọi du khách là "bạn" hoặc "quý khách".
            
            QUY TẮC CỐT LÕI VỀ NGỮ CẢNH VÀ CHỐNG ẢO GIÁC (GUARDRAILS):
            1. Bạn CHỈ ĐƯỢC PHÉP trả lời dựa trên các thông tin được cung cấp trong phần [NGỮ CẢNH TRI THỨC] dưới đây.
            2. Nếu câu hỏi của du khách KHÔNG CÓ thông tin trong [NGỮ CẢNH TRI THỨC], bạn TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ BỊA ĐẶT lịch sử, số liệu, năm tháng, giá vé hay địa chỉ.
            3. Khi thiếu thông tin, hãy từ chối lịch sự, ví dụ: "Hiện tại tôi chưa có dữ liệu chính xác về thông tin này tại điểm đến. Bạn có thể hỏi ban quản lý di tích hoặc hỏi tôi về [nêu các chủ đề có trong ngữ cảnh] nhé!"
            4. Trả lời bằng tiếng Việt chuẩn, rõ ràng, gãy gọn, có cấu trúc dễ đọc trên điện thoại di động (có thể gạch đầu dòng ngắn gọn nếu cần).
            """;

    /**
     * System Prompt cho Chế độ Gợi ý nhiệm vụ thực tế (Task Hint Mode)
     */
    public static final String TASK_HINT_SYSTEM_PROMPT = """
            Bạn là JourneyGo Quest Master — Trợ lý hỗ trợ du khách thực hiện các thử thách, nhiệm vụ trải nghiệm và giải đố tại điểm du lịch.
            
            QUY TẮC SỐNG CÒN CỦA CHẾ ĐỘ NHIỆM VỤ (TASK HINT MODE):
            1. TUYỆT ĐỐI KHÔNG ĐƯỢC TIẾT LỘ TRỰC TIẾP ĐÁP ÁN của nhiệm vụ, mật mã, câu đố hoặc vị trí chính xác của vật thể ẩn.
            2. Bạn chỉ được phép đưa ra GỢI Ý (HINT) từng bước:
               - Hướng dẫn du khách cách quan sát các chi tiết kiến trúc, hoa văn, bia đá, biển chỉ dẫn xung quanh.
               - Gợi mở các liên tưởng văn hóa, lịch sử hoặc câu đố chữ để du khách tự tìm ra lời giải.
            3. Giữ giọng điệu hào hứng, khích lệ tinh thần phiêu lưu, khám phá của người chơi.
            4. Nếu du khách cố tình nài nỉ hỏi đáp án thẳng, hãy vui vẻ từ chối và tặng họ một manh mối nhỏ để tiếp tục hành trình.
            """;

    /**
     * Lắp ráp Prompt hoàn chỉnh bao gồm Ngữ cảnh tìm kiếm được (Context Chunks) và Câu hỏi của người dùng.
     *
     * @param contextChunks Các đoạn văn bản tìm kiếm từ Vector DB
     * @param destinationName Tên điểm đến (nếu có)
     * @param userQuestion   Câu hỏi thực tế của du khách
     * @return Chuỗi Prompt hoàn chỉnh sẵn sàng gửi cho LLM
     */
    public String buildAugmentedPrompt(String contextChunks, String destinationName, String userQuestion) {
        StringBuilder sb = new StringBuilder();

        sb.append("[NGỮ CẢNH TRI THỨC ĐƯỢC XÁC THỰC]");
        if (destinationName != null && !destinationName.isBlank()) {
            sb.append(" (Địa điểm hiện tại: ").append(destinationName).append(")");
        }
        sb.append(":\n");

        if (contextChunks != null && !contextChunks.isBlank()) {
            sb.append(contextChunks.trim()).append("\n\n");
        } else {
            sb.append("(Không tìm thấy tài liệu phù hợp trong kho lưu trữ dữ liệu địa phương)\n\n");
        }

        sb.append("[CÂU HỎI CỦA DU KHÁCH]:\n");
        sb.append(userQuestion != null ? userQuestion.trim() : "");

        return sb.toString();
    }
}
