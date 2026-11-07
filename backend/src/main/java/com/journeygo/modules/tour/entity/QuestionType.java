package com.journeygo.modules.tour.entity;

/** Dạng câu hỏi của điểm đến. */
public enum QuestionType {
    /** Trắc nghiệm: đúng 4 đáp án, 1 đáp án đúng. */
    MULTIPLE_CHOICE,
    /** Tự luận: khách nhập câu trả lời bằng chữ; đối tác có thể ghi đáp án gợi ý. */
    TEXT
}
