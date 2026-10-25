"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Pencil,
  AlertCircle,
  Loader2,
  Sparkles,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Check,
  FileQuestion,
  Lightbulb,
} from "lucide-react";
import { questionService } from "../services/questionService";
import { answerService } from "../services/answerService";

const INITIAL_QUESTION_FORM = {
  content: "",
  questionType: "MULTIPLE_CHOICE",
  points: 10,
  sequenceOrder: 0,
  expectedText: "",
  // Các phương án trắc nghiệm ban đầu
  initialAnswers: [
    { content: "", isCorrect: true, explanation: "" },
    { content: "", isCorrect: false, explanation: "" },
  ],
};

/**
 * Modal Quản Lý Bộ Câu Hỏi & Thử Thách (Question & Answer) cho Nhiệm Vụ
 * Phục vụ cả 3 Role:
 *  - Provider: Tạo, sửa đáp án, xóa câu hỏi khi Task ở trạng thái DRAFT
 *  - Admin: Toàn quyền quản lý, kiểm duyệt câu hỏi
 *  - Moderator: Thẩm định, xem trước câu hỏi và lời giải thích (Chế độ Read-only)
 */
export default function QuestionManagerModal({
  isOpen,
  onClose,
  task,
  experience,
  canEdit = true,
  isModerator = false,
  onQuestionsUpdated,
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Form thêm câu hỏi mới
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(INITIAL_QUESTION_FORM);
  const [formErrors, setFormErrors] = useState({});

  // Chỉnh sửa expectedText của câu hỏi TEXT
  const [editingExpectedTextId, setEditingExpectedTextId] = useState(null);
  const [tempExpectedText, setTempExpectedText] = useState("");

  // Thêm phương án trả lời mới vào câu hỏi MULTIPLE_CHOICE có sẵn
  const [addingAnswerQuestionId, setAddingAnswerQuestionId] = useState(null);
  const [newAnswerForm, setNewAnswerForm] = useState({
    content: "",
    isCorrect: false,
    explanation: "",
  });

  // Xác nhận xóa câu hỏi
  const [deletingQuestion, setDeletingQuestion] = useState(null);

  // Mở rộng/thu gọn câu hỏi
  const [expandedQuestions, setExpandedQuestions] = useState({});

  const taskId = task?.id;
  const isDraft = task?.status === "DRAFT" || experience?.status === "DRAFT";
  const allowManage = canEdit && isDraft && !isModerator;

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  }, []);

  // Tải danh sách câu hỏi
  const loadQuestions = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setErrorMessage("");
    try {
      // Đối với Provider/Admin/Moderator, truyền forTourist = false để xem đầy đủ đáp án & lời giải
      const data = await questionService.listByTask(taskId, false);
      setQuestions(data || []);
      // Mặc định mở rộng câu hỏi đầu tiên
      if (Array.isArray(data) && data.length > 0) {
        setExpandedQuestions({ [data[0].id]: true });
      }
    } catch (err) {
      console.error("[QuestionManager] load error", err);
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Không thể tải danh sách câu hỏi."
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!isOpen || !taskId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        loadQuestions();
        setShowAddForm(false);
        setEditingExpectedTextId(null);
        setAddingAnswerQuestionId(null);
        setDeletingQuestion(null);
        setForm({
          ...INITIAL_QUESTION_FORM,
          sequenceOrder: 0,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, taskId, loadQuestions]);

  // Khóa cuộn trang nền khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Toggle thu gọn/mở rộng câu hỏi
  const toggleExpand = (qId) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  // Validate form tạo câu hỏi
  const validateQuestionForm = () => {
    const errs = {};
    if (!form.content.trim()) errs.content = "Nội dung câu hỏi không được để trống.";
    if (form.points === "" || Number(form.points) < 0) {
      errs.points = "Điểm thưởng phải lớn hơn hoặc bằng 0.";
    }
    if (form.questionType === "TEXT") {
      if (!form.expectedText.trim()) {
        errs.expectedText = "Vui lòng nhập đáp án mẫu mong đợi cho câu tự luận.";
      }
    } else if (form.questionType === "MULTIPLE_CHOICE") {
      const validAnswers = form.initialAnswers.filter((a) => a.content.trim());
      if (validAnswers.length < 2) {
        errs.answers = "Cần ít nhất 2 phương án trả lời cho câu trắc nghiệm.";
      } else {
        const correctCount = validAnswers.filter((a) => a.isCorrect).length;
        if (correctCount !== 1) {
          errs.answers = "Phải chọn đúng 1 đáp án chính xác.";
        }
      }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Tạo câu hỏi mới
  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!validateQuestionForm()) return;

    setActionLoading(true);
    try {
      const qData = {
        content: form.content.trim(),
        questionType: form.questionType,
        points: Number(form.points) || 10,
        sequenceOrder: Number(form.sequenceOrder) || questions.length,
        expectedText: form.questionType === "TEXT" ? form.expectedText.trim() : null,
      };

      const createdQ = await questionService.create(taskId, qData);

      // Nếu là trắc nghiệm, tạo các phương án trả lời kèm theo
      if (form.questionType === "MULTIPLE_CHOICE" && createdQ?.id) {
        const validAnswers = form.initialAnswers.filter((a) => a.content.trim());
        for (let i = 0; i < validAnswers.length; i++) {
          const ans = validAnswers[i];
          await answerService.create(createdQ.id, {
            content: ans.content.trim(),
            isCorrect: ans.isCorrect,
            sequenceOrder: i,
            explanation: ans.explanation?.trim() || null,
          });
        }
      }

      showToast("Đã tạo câu hỏi thành công.");
      setShowAddForm(false);
      setForm({
        ...INITIAL_QUESTION_FORM,
        sequenceOrder: questions.length + 1,
      });
      await loadQuestions();
      onQuestionsUpdated?.();
    } catch (err) {
      console.error("[QuestionManager] create error", err);
      showToast(err?.response?.data?.message || err?.message || "Lỗi tạo câu hỏi.");
    } finally {
      setActionLoading(false);
    }
  };

  // Cập nhật expectedText của câu hỏi TEXT
  const handleSaveExpectedText = async (qId) => {
    if (!tempExpectedText.trim()) {
      showToast("Đáp án không được để trống.");
      return;
    }
    setActionLoading(true);
    try {
      await questionService.updateExpectedText(qId, tempExpectedText.trim());
      showToast("Đã cập nhật đáp án tự luận.");
      setEditingExpectedTextId(null);
      await loadQuestions();
      onQuestionsUpdated?.();
    } catch (err) {
      console.error("[QuestionManager] update expectedText error", err);
      showToast(err?.response?.data?.message || err?.message || "Lỗi cập nhật đáp án.");
    } finally {
      setActionLoading(false);
    }
  };

  // Thêm phương án trả lời mới vào câu hỏi MULTIPLE_CHOICE có sẵn
  const handleAddAnswer = async (qId, currentAnswers = []) => {
    if (!newAnswerForm.content.trim()) {
      showToast("Vui lòng nhập nội dung đáp án.");
      return;
    }
    setActionLoading(true);
    try {
      await answerService.create(qId, {
        content: newAnswerForm.content.trim(),
        isCorrect: Boolean(newAnswerForm.isCorrect),
        sequenceOrder: currentAnswers.length,
        explanation: newAnswerForm.explanation?.trim() || null,
      });
      showToast("Đã thêm phương án trả lời.");
      setAddingAnswerQuestionId(null);
      setNewAnswerForm({ content: "", isCorrect: false, explanation: "" });
      await loadQuestions();
      onQuestionsUpdated?.();
    } catch (err) {
      console.error("[QuestionManager] add answer error", err);
      showToast(err?.response?.data?.message || err?.message || "Lỗi thêm đáp án.");
    } finally {
      setActionLoading(false);
    }
  };

  // Đổi đáp án đúng cho câu hỏi trắc nghiệm
  const handleSetCorrectAnswer = async (q, targetAnswer) => {
    if (!allowManage) return;
    setActionLoading(true);
    try {
      // Đặt targetAnswer thành true
      await answerService.update(targetAnswer.id, { isCorrect: true });
      // Đặt các câu khác thành false
      const others = (q.answers || []).filter((a) => a.id !== targetAnswer.id && a.isCorrect);
      for (const other of others) {
        await answerService.update(other.id, { isCorrect: false });
      }
      showToast("Đã cập nhật đáp án đúng.");
      await loadQuestions();
      onQuestionsUpdated?.();
    } catch (err) {
      console.error("[QuestionManager] set correct answer error", err);
      showToast(err?.response?.data?.message || err?.message || "Lỗi cập nhật đáp án đúng.");
    } finally {
      setActionLoading(false);
    }
  };

  // Xóa phương án trả lời
  const handleDeleteAnswer = async (ansId) => {
    if (!allowManage) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa phương án này?")) return;
    setActionLoading(true);
    try {
      await answerService.delete(ansId);
      showToast("Đã xóa phương án trả lời.");
      await loadQuestions();
      onQuestionsUpdated?.();
    } catch (err) {
      console.error("[QuestionManager] delete answer error", err);
      showToast(err?.response?.data?.message || err?.message || "Lỗi xóa đáp án.");
    } finally {
      setActionLoading(false);
    }
  };

  // Xác nhận xóa câu hỏi
  const handleDeleteQuestionConfirm = async () => {
    if (!deletingQuestion) return;
    setActionLoading(true);
    try {
      await questionService.delete(deletingQuestion.id);
      showToast("Đã xóa câu hỏi thành công.");
      setDeletingQuestion(null);
      await loadQuestions();
      onQuestionsUpdated?.();
    } catch (err) {
      console.error("[QuestionManager] delete question error", err);
      showToast(err?.response?.data?.message || err?.message || "Lỗi xóa câu hỏi.");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col h-[700px] max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/25">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm flex items-center justify-center text-white shrink-0">
              <FileQuestion size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-slate-900 text-sm sm:text-base">
                  Bộ Câu Hỏi & Thử Thách
                </h3>
                <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {questions.length} câu hỏi
                </span>
                {isDraft ? (
                  <span className="text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    Bản nháp
                  </span>
                ) : (
                  <span className="text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Đã xuất bản
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-lg">
                Nhiệm vụ: <strong className="text-slate-800">{task?.title}</strong>
                {experience?.title && ` • Tour: ${experience.title}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thanh thông báo role & trạng thái */}
        {isModerator && (
          <div className="shrink-0 px-6 py-2.5 bg-amber-50/70 border-b border-amber-200/60 flex items-center gap-2 text-xs font-semibold text-amber-800">
            <ShieldCheck size={15} className="text-amber-600 shrink-0" />
            <span>
              Chế độ Kiểm Duyệt (Moderator) — Bạn đang xem thẩm định nội dung câu hỏi và đáp án ở chế
              độ chỉ đọc.
            </span>
          </div>
        )}

        {!isDraft && !isModerator && (
          <div className="shrink-0 px-6 py-2 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-2">
            <AlertCircle size={14} className="text-slate-500 shrink-0" />
            <span>
              Nhiệm vụ đã xuất bản. Theo quy tắc nghiệp vụ, bạn chỉ có thể chỉnh sửa hoặc xóa câu hỏi
              khi tour ở trạng thái Bản nháp (DRAFT).
            </span>
          </div>
        )}

        {/* Toast thông báo */}
        {toastMessage && (
          <div className="shrink-0 mx-6 mt-3 p-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="shrink-0 mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Thân Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
              <p className="text-xs font-bold">Đang tải bộ câu hỏi...</p>
            </div>
          ) : showAddForm ? (
            /* Form Tạo Câu Hỏi Mới */
            <form
              onSubmit={handleCreateQuestion}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    +
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Thêm Câu Hỏi Thử Thách Mới</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Hủy thao tác
                </button>
              </div>

              {/* Loại câu hỏi */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Định dạng câu hỏi <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, questionType: "MULTIPLE_CHOICE" })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      form.questionType === "MULTIPLE_CHOICE"
                        ? "bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-100"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        form.questionType === "MULTIPLE_CHOICE"
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {form.questionType === "MULTIPLE_CHOICE" && <Check size={12} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Trắc nghiệm (A, B, C, D)</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Có nhiều phương án lựa chọn, đúng duy nhất 1 đáp án
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, questionType: "TEXT" })}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      form.questionType === "TEXT"
                        ? "bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-100"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        form.questionType === "TEXT"
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {form.questionType === "TEXT" && <Check size={12} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Tự luận / Điền từ (Text)</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Du khách tự gõ câu trả lời, so khớp với đáp án mẫu
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Nội dung câu hỏi */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Nội dung câu hỏi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Ví dụ: Chùa Một Cột được khởi công xây dựng dưới triều vua nào trong lịch sử Việt Nam?"
                  className={`w-full px-3.5 py-2.5 text-xs font-medium bg-white border rounded-xl outline-hidden transition-all ${
                    formErrors.content
                      ? "border-rose-300 ring-2 ring-rose-100"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  }`}
                />
                {formErrors.content && (
                  <p className="text-[11px] text-rose-600 font-medium">{formErrors.content}</p>
                )}
              </div>

              {/* Điểm thưởng & Thứ tự */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Điểm thưởng khi trả lời đúng <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={form.points}
                      onChange={(e) => setForm({ ...form, points: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs font-mono bg-white border border-slate-200 rounded-xl outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 pr-14"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      điểm
                    </span>
                  </div>
                  {formErrors.points && (
                    <p className="text-[11px] text-rose-600 font-medium">{formErrors.points}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Thứ tự câu hỏi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.sequenceOrder}
                    onChange={(e) => setForm({ ...form, sequenceOrder: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-white border border-slate-200 rounded-xl outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                  />
                </div>
              </div>

              {/* Nhập đáp án mẫu nếu dạng TEXT */}
              {form.questionType === "TEXT" && (
                <div className="space-y-1.5 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Lightbulb size={14} className="text-indigo-600" />
                    <span>Đáp án mẫu mong đợi (Expected Text)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.expectedText}
                    onChange={(e) => setForm({ ...form, expectedText: e.target.value })}
                    placeholder="Ví dụ: Vua Lý Thái Tông"
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-white border rounded-xl outline-hidden transition-all ${
                      formErrors.expectedText
                        ? "border-rose-300 ring-2 ring-rose-100"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                    }`}
                  />
                  <p className="text-[10.5px] text-indigo-700/80">
                    Hệ thống sẽ đối chiếu câu trả lời của du khách mà không phân biệt chữ hoa hay chữ
                    thường.
                  </p>
                  {formErrors.expectedText && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      {formErrors.expectedText}
                    </p>
                  )}
                </div>
              )}

              {/* Nhập phương án lựa chọn nếu dạng MULTIPLE_CHOICE */}
              {form.questionType === "MULTIPLE_CHOICE" && (
                <div className="space-y-2.5 bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Các phương án trả lời trắc nghiệm (Chọn 1 đáp án đúng)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          initialAnswers: [
                            ...form.initialAnswers,
                            { content: "", isCorrect: false, explanation: "" },
                          ],
                        })
                      }
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus size={12} />
                      <span>Thêm phương án</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {form.initialAnswers.map((ans, idx) => {
                      const labelChar = String.fromCharCode(65 + idx); // A, B, C, D...
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                            ans.isCorrect
                              ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-100"
                              : "bg-slate-50/50 border-slate-200"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const updated = form.initialAnswers.map((a, i) => ({
                                ...a,
                                isCorrect: i === idx,
                              }));
                              setForm({ ...form, initialAnswers: updated });
                            }}
                            className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                              ans.isCorrect
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                            title={
                              ans.isCorrect ? "Đây là đáp án đúng" : "Bấm để chọn làm đáp án đúng"
                            }
                          >
                            {ans.isCorrect ? <Check size={14} /> : labelChar}
                          </button>

                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              value={ans.content}
                              onChange={(e) => {
                                const updated = [...form.initialAnswers];
                                updated[idx].content = e.target.value;
                                setForm({ ...form, initialAnswers: updated });
                              }}
                              placeholder={`Nội dung phương án ${labelChar}...`}
                              className="w-full px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg outline-hidden focus:border-indigo-500"
                            />
                            <input
                              type="text"
                              value={ans.explanation}
                              onChange={(e) => {
                                const updated = [...form.initialAnswers];
                                updated[idx].explanation = e.target.value;
                                setForm({ ...form, initialAnswers: updated });
                              }}
                              placeholder="Lời giải thích vì sao đúng/sai (tùy chọn)..."
                              className="w-full px-3 py-1 text-[11px] text-slate-500 bg-white border border-slate-100 rounded-lg outline-hidden"
                            />
                          </div>

                          {form.initialAnswers.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = form.initialAnswers.filter((_, i) => i !== idx);
                                setForm({ ...form, initialAnswers: updated });
                              }}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                              title="Xóa phương án này"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {formErrors.answers && (
                    <p className="text-[11px] text-rose-600 font-medium">{formErrors.answers}</p>
                  )}
                </div>
              )}

              {/* Nút submit */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Tạo câu hỏi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : questions.length === 0 ? (
            /* Empty State */
            <div className="py-16 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-sm">
                <FileQuestion size={32} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  Chưa có câu hỏi nào trong nhiệm vụ
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tạo các câu hỏi trắc nghiệm hoặc câu đố tự luận để du khách tìm hiểu lịch sử, danh
                  thắng và nhận điểm thưởng khi tham gia tour.
                </p>
              </div>

              {allowManage && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Plus size={15} />
                  <span>Thêm câu hỏi đầu tiên</span>
                </button>
              )}
            </div>
          ) : (
            /* Danh Sách Các Câu Hỏi */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Danh sách câu hỏi thử thách ({questions.length})
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Câu hỏi được sắp xếp theo thứ tự hiển thị cho du khách
                  </p>
                </div>

                {allowManage && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Thêm câu hỏi</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => {
                  const isExpanded = Boolean(expandedQuestions[q.id]);
                  const isTextType = q.questionType === "TEXT";

                  return (
                    <div
                      key={q.id}
                      className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-2xs transition-all"
                    >
                      {/* Tiêu đề câu hỏi */}
                      <div
                        onClick={() => toggleExpand(q.id)}
                        className="p-4 flex items-center justify-between gap-3 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 font-mono font-black text-xs flex items-center justify-center shrink-0">
                            #{q.sequenceOrder !== null ? q.sequenceOrder : idx + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  isTextType
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                }`}
                              >
                                {isTextType ? "Tự luận (Text)" : "Trắc nghiệm"}
                              </span>
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Award size={10} />
                                <span>+{q.points || 10} điểm</span>
                              </span>
                            </div>
                            <h5 className="font-bold text-slate-900 text-xs sm:text-sm mt-1 truncate max-w-xl">
                              {q.content}
                            </h5>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {allowManage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingQuestion(q);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa câu hỏi này"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <div className="p-1 text-slate-400">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {/* Chi tiết nội dung khi mở rộng */}
                      {isExpanded && (
                        <div className="p-4 pt-2 border-t border-slate-100 space-y-3 bg-white">
                          {/* Câu hỏi TEXT: Hiển thị và sửa expectedText */}
                          {isTextType ? (
                            <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                  <Lightbulb size={13} className="text-indigo-600" />
                                  <span>Đáp án mẫu (Expected Text):</span>
                                </span>

                                {allowManage && editingExpectedTextId !== q.id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingExpectedTextId(q.id);
                                      setTempExpectedText(q.expectedText || "");
                                    }}
                                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Pencil size={11} />
                                    <span>Chỉnh sửa đáp án</span>
                                  </button>
                                )}
                              </div>

                              {editingExpectedTextId === q.id ? (
                                <div className="flex items-center gap-2 pt-1">
                                  <input
                                    type="text"
                                    value={tempExpectedText}
                                    onChange={(e) => setTempExpectedText(e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-xs font-semibold bg-white border border-indigo-300 rounded-lg outline-hidden"
                                    placeholder="Nhập đáp án mẫu..."
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveExpectedText(q.id)}
                                    disabled={actionLoading}
                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                                  >
                                    Lưu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingExpectedTextId(null)}
                                    className="px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <p className="text-xs font-mono font-bold text-indigo-950 bg-white px-3 py-2 rounded-lg border border-indigo-200/80">
                                  {q.expectedText || "(Chưa có đáp án mẫu)"}
                                </p>
                              )}
                            </div>
                          ) : (
                            /* Câu hỏi MULTIPLE_CHOICE: Danh sách các Answer A, B, C, D */
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700">
                                  Các phương án trả lời ({q.answers?.length || 0}):
                                </span>

                                {allowManage && addingAnswerQuestionId !== q.id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddingAnswerQuestionId(q.id);
                                      setNewAnswerForm({
                                        content: "",
                                        isCorrect: false,
                                        explanation: "",
                                      });
                                    }}
                                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus size={12} />
                                    <span>Thêm phương án</span>
                                  </button>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                {(q.answers || []).map((ans, aIdx) => {
                                  const labelChar = String.fromCharCode(65 + aIdx);

                                  return (
                                    <div
                                      key={ans.id}
                                      className={`p-2.5 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                                        ans.isCorrect
                                          ? "bg-emerald-50/70 border-emerald-300"
                                          : "bg-slate-50/60 border-slate-200"
                                      }`}
                                    >
                                      <div className="flex items-start gap-2.5 min-w-0">
                                        <button
                                          type="button"
                                          disabled={!allowManage || actionLoading}
                                          onClick={() => handleSetCorrectAnswer(q, ans)}
                                          className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                            ans.isCorrect
                                              ? "bg-emerald-600 text-white shadow-2xs"
                                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                          }`}
                                          title={
                                            ans.isCorrect
                                              ? "Đáp án đúng"
                                              : "Bấm để chọn làm đáp án đúng"
                                          }
                                        >
                                          {ans.isCorrect ? <Check size={12} /> : labelChar}
                                        </button>

                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p
                                              className={`text-xs font-semibold ${
                                                ans.isCorrect ? "text-emerald-950" : "text-slate-800"
                                              }`}
                                            >
                                              {ans.content}
                                            </p>
                                            {ans.isCorrect && (
                                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                                                Đáp án đúng
                                              </span>
                                            )}
                                          </div>
                                          {ans.explanation && (
                                            <p className="text-[11px] text-slate-500 mt-0.5 italic">
                                              Giải thích: {ans.explanation}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      {allowManage && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteAnswer(ans.id)}
                                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer shrink-0"
                                          title="Xóa phương án này"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Form thêm nhanh phương án trả lời mới */}
                              {addingAnswerQuestionId === q.id && (
                                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2 mt-2">
                                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                                    <span>Thêm phương án mới</span>
                                    <button
                                      type="button"
                                      onClick={() => setAddingAnswerQuestionId(null)}
                                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={newAnswerForm.content}
                                    onChange={(e) =>
                                      setNewAnswerForm({
                                        ...newAnswerForm,
                                        content: e.target.value,
                                      })
                                    }
                                    placeholder="Nội dung phương án..."
                                    className="w-full px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg outline-hidden"
                                  />
                                  <input
                                    type="text"
                                    value={newAnswerForm.explanation}
                                    onChange={(e) =>
                                      setNewAnswerForm({
                                        ...newAnswerForm,
                                        explanation: e.target.value,
                                      })
                                    }
                                    placeholder="Lời giải thích (tùy chọn)..."
                                    className="w-full px-3 py-1 text-[11px] text-slate-500 bg-white border border-slate-200 rounded-lg outline-hidden"
                                  />
                                  <div className="flex items-center justify-between pt-1">
                                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={newAnswerForm.isCorrect}
                                        onChange={(e) =>
                                          setNewAnswerForm({
                                            ...newAnswerForm,
                                            isCorrect: e.target.checked,
                                          })
                                        }
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <span>Đặt làm đáp án chính xác</span>
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => handleAddAnswer(q.id, q.answers)}
                                      disabled={actionLoading}
                                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                                    >
                                      Thêm phương án
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Quy tắc: MULTIPLE_CHOICE có duy nhất 1 đáp án đúng • TEXT so khớp không phân biệt hoa thường.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Dialog xác nhận xóa câu hỏi */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-80 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 size={18} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Xóa câu hỏi này?</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Bạn có chắc chắn muốn xóa câu hỏi &quot;
                <strong className="text-slate-800">{deletingQuestion.content}</strong>&quot;? Các
                đáp án liên quan cũng sẽ bị xóa vĩnh viễn.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteQuestionConfirm}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
