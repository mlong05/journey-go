package com.journeygo.modules.aiguide.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GeminiChatClientTest {

    @Test
    @DisplayName("Mặc định sử dụng gemini-3.5-flash-lite và không gửi temperature cho dòng Gemini 3.x")
    void gemini3OmitsTemperatureAndUsesHeaderKey() {
        GeminiAiProperties props = new GeminiAiProperties();
        assertThat(props.getChatModel()).isEqualTo("gemini-3.5-flash-lite");

        props.setApiKey("secret-gemini-key");
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GeminiChatClient client = new GeminiChatClient(props, builder, new ObjectMapper());

        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"))
                .andExpect(header("x-goog-api-key", "secret-gemini-key"))
                .andExpect(content().string(not(containsString("temperature"))))
                .andExpect(content().string(containsString("maxOutputTokens")))
                .andRespond(withSuccess(
                        "{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\"Chào bạn từ Huế!\"}]}}]}",
                        MediaType.APPLICATION_JSON));

        String reply = client.generateReply("System", List.of(), "Giới thiệu cố đô", 0.3, 512);

        server.verify();
        assertThat(reply).isEqualTo("Chào bạn từ Huế!");
    }

    @Test
    @DisplayName("Dòng gemini-2.5-flash vẫn gửi temperature trong generationConfig")
    void legacyGemini25IncludesTemperature() {
        GeminiAiProperties props = new GeminiAiProperties();
        props.setApiKey("secret-gemini-key");
        props.setChatModel("gemini-2.5-flash");

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GeminiChatClient client = new GeminiChatClient(props, builder, new ObjectMapper());

        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"))
                .andExpect(content().string(containsString("\"temperature\":0.3")))
                .andRespond(withSuccess(
                        "{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\"OK\"}]}}]}",
                        MediaType.APPLICATION_JSON));

        String reply = client.generateReply("System", List.of(), "Hỏi", 0.3, 256);

        server.verify();
        assertThat(reply).isEqualTo("OK");
    }

    @Test
    @DisplayName("Chuẩn hóa lượt chat: bỏ model mở đầu, gộp các lượt trùng vai trò và luôn kết thúc bằng user")
    void normalizeTurnsMaintainsAlternatingUserTurns() {
        GeminiChatClient client = new GeminiChatClient(new GeminiAiProperties(), RestClient.builder(), new ObjectMapper());

        List<GeminiChatClient.ChatTurn> history = List.of(
                new GeminiChatClient.ChatTurn("ASSISTANT", "Lời chào thừa"),
                new GeminiChatClient.ChatTurn("USER", "Câu 1"),
                new GeminiChatClient.ChatTurn("USER", "Câu 1b"),
                new GeminiChatClient.ChatTurn("ASSISTANT", "Đáp 1"),
                new GeminiChatClient.ChatTurn("USER", "Câu 2")
        );

        List<GeminiChatClient.ChatTurn> normalized = client.normalizeTurns(history, "Câu hiện tại");

        assertThat(normalized).hasSize(3);
        assertThat(normalized.get(0).role()).isEqualTo("user");
        assertThat(normalized.get(0).text()).isEqualTo("Câu 1\n\nCâu 1b");
        assertThat(normalized.get(1).role()).isEqualTo("model");
        assertThat(normalized.get(1).text()).isEqualTo("Đáp 1");
        assertThat(normalized.get(2).role()).isEqualTo("user");
        assertThat(normalized.get(2).text()).isEqualTo("Câu 2\n\nCâu hiện tại");
    }

    @Test
    @DisplayName("Xử lý an toàn khi bị chặn bởi SAFETY finishReason")
    void handlesSafetyFinishReasonGracefully() {
        GeminiAiProperties props = new GeminiAiProperties();
        props.setApiKey("secret-gemini-key");

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GeminiChatClient client = new GeminiChatClient(props, builder, new ObjectMapper());

        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"))
                .andRespond(withSuccess(
                        "{\"candidates\":[{\"finishReason\":\"SAFETY\"}]}",
                        MediaType.APPLICATION_JSON));

        String reply = client.generateReply("System", List.of(), "Câu hỏi nhạy cảm", 0.3, 512);

        assertThat(reply).contains("Xin lỗi");
    }

    @Test
    @DisplayName("Chế độ mock trả về phản hồi giả lập")
    void mockModeReturnsMockReply() {
        GeminiAiProperties props = new GeminiAiProperties();
        props.setApiKey("mock");
        GeminiChatClient client = new GeminiChatClient(props, RestClient.builder(), new ObjectMapper());

        String reply = client.generateReply("System", List.of(), "Xin chào", 0.3, 512);

        assertThat(reply).contains("Mock Response").contains("Xin chào");
    }
}
