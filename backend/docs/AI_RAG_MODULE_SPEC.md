# TÀI LIỆU KỸ THUẬT: TÍNH NĂNG AI VIRTUAL GUIDE (RAG)
**Kiến trúc hệ thống:** Modular Monolith  
**Vai trò của tài liệu:** Làm ngữ cảnh gốc (Context/Spec) cho đội ngũ phát triển và cho AI Coding Assistant trên IDE (Antigravity).

---

## PHẦN 1: HƯỚNG DẪN ĐƯA NGỮ CẢNH NÀY QUA IDE ANTIGRAVITY

Để AI trong IDE Antigravity nắm bắt toàn bộ cuộc trò chuyện này và viết code đúng chuẩn **Modular Monolith** của nhóm bạn, hãy làm theo 3 bước đơn giản sau:

### Bước 1: Lưu file này vào thư mục gốc của Project
1. Bấm nút **Copy** hoặc **Download/Export** ở góc trên bên phải của trình soạn thảo này.
2. Lưu thành file có tên `AI_RAG_MODULE_SPEC.md` ngay tại thư mục gốc (root) hoặc thư mục `docs/` của source code dự án.

### Bước 2: Gắn vào Context của IDE Antigravity
Khi mở dự án trên Antigravity, bạn mở khung Chat/Agent lên và đính kèm file này bằng cú pháp `@AI_RAG_MODULE_SPEC.md`, sau đó gửi câu lệnh khởi động (Initial Prompt) dưới đây:

> **Prompt mẫu để paste vào Antigravity:**
> *"Hãy đọc kỹ file `@AI_RAG_MODULE_SPEC.md` để nắm toàn bộ kiến trúc tính năng RAG (AI Virtual Guide) mà nhóm mình đang xây dựng theo mô hình Modular Monolith. Hãy kiểm tra cấu trúc thư mục hiện tại của project, xác nhận ngôn ngữ/framework đang dùng, và bắt đầu hỗ trợ mình code từ **Phase 1 (Foundation & Manual RAG)** theo đúng các quy tắc kỹ thuật đã nêu trong file."*

---

## PHẦN 2: TỔNG QUAN KIẾN TRÚC & TECH STACK

### 1. Mục tiêu nghiệp vụ
Xây dựng tính năng **AI Virtual Guide (Hướng dẫn viên du lịch ảo)** ứng dụng kỹ thuật RAG (Retrieval-Augmented Generation) cho ứng dụng du lịch trải nghiệm:
- Giải đáp thông tin văn hóa, lịch sử, kiến trúc gắn liền với vị trí thực tế của du khách (qua GPS hoặc quét mã QR tại điểm đến).
- Hỗ trợ đưa ra gợi ý (Hints) khi du khách đang làm nhiệm vụ thực tế (Task/Quest) tại điểm tham quan mà không làm lộ đáp án.
- Tự động đồng bộ kiến thức mới ngay khi Content Moderator bấm duyệt (Approve) bài viết.

### 2. Lựa chọn Tech Stack (Tối ưu cho Modular Monolith)
- **Kiến trúc:** Tạo một module độc lập tên là `ai-guide-module` (hoặc `rag-module`) nằm ngang hàng với các module nghiệp vụ khác (`content-moderation-module`, `destination-module`).
- **Database & Vector Store:** Sử dụng chung cụm **PostgreSQL** hiện tại của hệ thống, cài đặt thêm extension **`pgvector`** (Image Docker: `pgvector/pgvector:pg16`). Không dựng Vector DB rời bên ngoài để tiết kiệm tài nguyên và dễ quản lý.
- **Framework tích hợp AI:**
  - Nếu project dùng **Java (Spring Boot):** Sử dụng `Spring AI` hoặc `LangChain4j`.
  - Nếu project dùng **.NET Core:** Sử dụng `Semantic Kernel` + `Pgvector.EntityFrameworkCore`.
- **Giao tiếp liên Module (In-process):** Dùng Domain Events nội bộ (`Spring ApplicationEvent` hoặc `MediatR`) để lắng nghe sự kiện duyệt bài viết.
- **Mô hình AI (Cloud API):**
  - **Embedding Model:** Google `text-embedding-004` (768 chiều) hoặc OpenAI `text-embedding-3-small` (1536 chiều).
  - **Chat/Generation LLM:** `gemini-2.5-flash` hoặc `gpt-4o-mini` (tốc độ phản hồi nhanh cho Mobile App, xử lý tiếng Việt tự nhiên).

---

## PHẦN 3: 4 QUY TẮC KỸ THUẬT BẮT BUỘC (ARCHITECTURE GUIDELINES)

*(Lưu ý cho AI Agent trên IDE: Bắt buộc tuân thủ 4 quy tắc dưới đây khi sinh code)*

### Quy tắc 1: Cô lập Database (Database Isolation)
- **Tuyệt đối không JOIN chéo:** `ai-guide-module` chỉ được phép truy vấn trên các bảng của chính nó (`ai_knowledge_chunks`, `ai_chat_sessions`, `ai_chat_messages`).
- **Self-contained Metadata:** Khi nhận sự kiện từ module Quản lý Địa điểm/Duyệt nội dung, module AI phải tự lưu bản sao `destination_name`, `destination_id` và `category` vào cột `metadata` (JSONB) của bảng vector để tự chủ hoàn toàn khi truy xuất.

### Quy tắc 2: Chiến lược Chia nhỏ văn bản (Chunking Strategy)
- **Không cắt theo số ký tự cố định:** Sử dụng Recursive Character / Markdown Splitting (ưu tiên cắt theo đoạn văn `\n\n` hoặc tiêu đề `##`).
- **Kích thước chuẩn:** Mỗi chunk dài khoảng **300 – 500 từ**, độ gối (overlap) giữa 2 chunk liên tiếp là **50 từ**.
- **Kỹ thuật Context Prefix:** Trước khi gọi API Embedding, luôn tự động nối thêm thông tin địa điểm vào đầu mỗi chunk:
  - *Định dạng:* `"[Địa điểm: {destinationName} - Danh mục: {category}] {chunkContent}"`

### Quy tắc 3: Đồng bộ Bất đồng bộ (Async Ingestion)
- Event Listener lắng nghe sự kiện `ContentApprovedEvent` **bắt buộc phải chạy bất đồng bộ** (`@Async` hoặc Background Queue) để không làm chậm thao tác bấm nút "Approve" của Moderator trên Web Portal.
- Khi bài viết gốc bị sửa hoặc xóa/hủy duyệt, phải xóa các dòng vector cũ theo `source_id` trước khi chèn vector mới.

### Quy tắc 4: Nhận diện Ngữ cảnh Thực tế (Location & Task Awareness)
- **Chế độ Thuyết minh (`Normal Guide Mode`):** Khi `destinationId` có giá trị và `taskId == null` -> AI đóng vai hướng dẫn viên kể chuyện văn hóa, lịch sử dựa trên các chunk của `destinationId` đó.
- **Chế độ Hỗ trợ Nhiệm vụ (`Task Hint Mode`):** Khi `taskId != null` -> AI chỉ lọc các chunk có `content_type = 'TASK_HINT'` và được cấu hình System Prompt **tuyệt đối không tiết lộ thẳng đáp án**, chỉ gợi mở hướng suy luận.
- **Chống ảo giác (Anti-Hallucination):** Chỉ trả lời dựa trên dữ liệu có trong `[Ngữ cảnh]`. Nếu không có thông tin trong DB, AI phải trả lời lịch sự là chưa có dữ liệu chính xác, không tự bịa đặt sự kiện lịch sử hoặc giá vé.

---

## PHẦN 4: THIẾT KẾ CƠ SỞ DỮ LIỆU & LUỒNG DỮ LIỆU

### 1. Schema Database cho `ai-guide-module` (PostgreSQL + pgvector)

```sql
-- Bật extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Bảng lưu trữ kiến thức đã cắt nhỏ và Vector
CREATE TABLE ai_knowledge_chunks (
    id UUID PRIMARY KEY,
    source_id VARCHAR(50) NOT NULL,      -- ID của bài viết/địa điểm gốc từ module duyệt bài
    destination_id VARCHAR(50) NOT NULL, -- ID địa điểm (dùng để Pre-filter theo GPS/QR)
    content_type VARCHAR(30) NOT NULL,   -- VD: 'CULTURAL_STORY', 'TOUR_INFO', 'TASK_HINT'
    chunk_text TEXT NOT NULL,            -- Đoạn văn bản đã gắn Context Prefix (300-500 từ)
    metadata JSONB,                      -- Lưu: {"title": "...", "destination_name": "...", "lat": 10.76, "lng": 106.66}
    embedding vector(768),               -- 768 chiều (Gemini text-embedding-004)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index tăng tốc truy vấn
CREATE INDEX idx_ai_chunks_embedding ON ai_knowledge_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_ai_chunks_destination ON ai_knowledge_chunks(destination_id);
CREATE INDEX idx_ai_chunks_source ON ai_knowledge_chunks(source_id);

-- 2. Bảng quản lý phiên hội thoại của du khách
CREATE TABLE ai_chat_sessions (
    id UUID PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    current_destination_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng lưu lịch sử tin nhắn (dùng để lấy 6-10 tin nhắn gần nhất làm Memory)
CREATE TABLE ai_chat_messages (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,           -- 'USER' hoặc 'ASSISTANT'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Cấu trúc Package / Thư mục chuẩn trong `ai-guide-module`
```text
ai-guide-module/
├── api/
│   ├── controller/       # AiGuideChatController (POST /api/v1/ai-guide/chat)
│   └── dto/              # ChatRequest, ChatResponse
├── domain/
│   ├── entity/           # AiKnowledgeChunk, AiChatSession, AiChatMessage
│   └── repository/       # AiKnowledgeChunkRepository (chứa câu query Cosine Similarity)
└── internal/
    ├── listener/         # ContentModerationEventListener (hứng ContentApprovedEvent, ContentDeletedEvent)
    ├── service/
    │   ├── DocumentIngestionService   # Xử lý Clean HTML -> Chunking -> Embedding -> Save DB
    │   ├── TextChunkerHelper          # Thuật toán cắt đoạn 300-500 từ + Overlap 50 từ
    │   └── VirtualGuideChatService    # Luồng RAG: Embed câu hỏi -> Search Top 4 -> Ghép Prompt -> Gọi LLM
    └── config/           # Cấu hình AI Client, Async ThreadPool, System Prompts
```

### 3. Sơ đồ luồng hoạt động (Data Flow)
```text
[LUỒNG 1: NẠP KIẾN THỨC TỰ ĐỘNG - INGESTION FLOW]
Content Provider tạo bài -> Content Moderator bấm "Approve" 
  ──(1. Publish ContentApprovedEvent)──> [AI Guide Module] (@Async Listener)
  ──(2. Clean HTML & Chunking 400 từ)──> Gắn Prefix "[Địa điểm: ...]"
  ──(3. Call Embedding API)────────────> Nhận Vector (768 chiều)
  ──(4. Upsert vào PostgreSQL)─────────> Bảng ai_knowledge_chunks

[LUỒNG 2: DU KHÁCH HỎI ĐÁP THỰC TẾ - RETRIEVAL & GENERATION FLOW]
Tourist (Quét QR / Bật GPS tại điểm đến) -> Nhập câu hỏi trên App
  ──(1. POST /chat kèm destinationId)──> [AI Guide Module]
  ──(2. Embed câu hỏi thành Vector)────> Truy vấn pgvector (Filter theo destinationId + Top 4 Cosine)
  ──(3. Lấy 6 tin nhắn gần nhất)───────> Ghép: System Prompt + Lịch sử Chat + 4 Chunks kiến thức + Câu hỏi
  ──(4. Call LLM API)──────────────────> Trả câu trả lời về Mobile App & Lưu lịch sử
```

---

## PHẦN 5: CHECKLIST CHUẨN BỊ & LỘ TRÌNH 4 GIAI ĐOẠN (ROADMAP)

### Checklist chuẩn bị trước khi code
- [ ] **Hạ tầng:** Đổi image PostgreSQL trong `docker-compose.yml` sang `pgvector/pgvector:pg16`.
- [ ] **API Key:** Tạo `GEMINI_API_KEY` từ Google AI Studio và cấu hình vào biến môi trường.
- [ ] **Thư viện:** Cài đặt dependency AI vào `ai-guide-module`.
- [ ] **Dữ liệu mẫu:** Chuẩn bị Golden Dataset cho 2-3 địa điểm văn hóa (Lịch sử, kiến trúc, lưu ý tham quan, gợi ý nhiệm vụ).
- [ ] **Event Contract:** Chốt DTO `ContentApprovedEvent(sourceId, destinationId, destinationName, category, rawContent)` với module duyệt nội dung.

### Lộ trình triển khai (4 Phases)
1. **Phase 1 - Foundation & Manual RAG:**
   - Lên Docker `pgvector`, chạy script migration tạo bảng `ai_knowledge_chunks`.
   - Viết service kết nối Embedding API và thực hiện truy vấn Cosine Similarity trên PostgreSQL.
   - Tạo API test nạp thủ công 1 đoạn văn bản và tìm kiếm ra Top 3 đoạn tương đồng nhất.
2. **Phase 2 - Automated Ingestion Pipeline:**
   - Viết bộ `TextChunkerHelper` cắt văn bản theo đoạn và gắn Context Prefix.
   - Kết nối `ContentModerationEventListener` chạy `@Async` để tự động băm nhỏ và tạo vector khi Moderator duyệt bài.
   - Xử lý xóa vector cũ khi bài viết bị cập nhật hoặc gỡ bỏ.
3. **Phase 3 - Context-Aware Chat & Memory:**
   - Xây dựng quản lý lịch sử phiên chat (`ai_chat_sessions`, `ai_chat_messages`).
   - Viết câu query kết hợp lọc cứng `WHERE destination_id = :destId` với khoảng cách Cosine `<=>`.
   - Tích hợp 2 mẫu System Prompt cho chế độ Thuyết minh (`Normal Guide Mode`) và chế độ Gợi ý nhiệm vụ (`Task Hint Mode`).
4. **Phase 4 - Optimization & Guardrails:**
   - Bổ sung Streaming Response (SSE) nếu cần hiển thị chữ chạy dần trên Mobile App.
   - Thêm Rate Limiting chống spam API và kiểm thử các câu hỏi bẫy (Prompt Injection / hỏi ngoài lề).

