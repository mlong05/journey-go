package com.journeygo.modules.tour.entity;

/** Dạng câu hỏi của điểm đến. */
public enum QuestionType {
    /** Trắc nghiệm: đúng 4 đáp án, 1 đáp án đúng. */
    MULTIPLE_CHOICE,
    /** Tự luận: khách nhập câu trả lời bằng chữ; đối tác có thể ghi đáp án gợi ý. */
    TEXT,
    /** Chọn ảnh đúng: 4 đáp án là ảnh, 1 đáp án đúng. */
    IMAGE_CHOICE,
    /** Xếp thứ tự (vd. mốc thời gian): 3–5 mục, thứ tự đúng = thứ tự đối tác nhập. */
    ORDERING,
    /** Đoán số bằng thanh trượt (vd. năm, số đếm): khoảng [min, max], đúng khi lệch không quá sai số. */
    NUMBER,
    /** Nối cột A với cột B: 3–5 cặp đúng (cột A có thể kèm ảnh); đúng khi nối khớp toàn bộ. */
    MATCHING;

    /** Dạng được dùng cho quiz của điểm đến (câu sau trải nghiệm luôn là TEXT). */
    public boolean isQuizType() {
        return this != TEXT;
    }

    /** Dạng có danh sách đáp án lựa chọn. */
    public boolean hasOptions() {
        return this == MULTIPLE_CHOICE || this == IMAGE_CHOICE || this == ORDERING || this == MATCHING;
    }
}
