"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Compass, HelpCircle, Lightbulb, MapPin, QrCode, Star, RotateCcw, Crosshair } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { getDevicePosition, describeGeoError } from "@/lib/geolocation";
import { journeyService, QrDialog } from "@/features/journey";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function isGeoError(err) {
  // Lỗi API có `status`; lỗi định vị chỉ có `code` số.
  return err?.code !== undefined && err?.status === undefined;
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 text-center dark:border-gray-800 dark:bg-gray-900">
      <Icon className="mx-auto h-5 w-5 text-emerald-600" />
      <p className="mt-1 text-lg font-extrabold">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

export default function TaskPage() {
  const { journeyId, taskId } = useParams();

  const [phase, setPhase] = useState("loading"); // loading | intro | locked | quiz | result | error
  const [task, setTask] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState(null);
  const [qr, setQr] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [clue, setClue] = useState("");
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState({});
  const [texts, setTexts] = useState({});

  useEffect(() => {
    let active = true;
    journeyService
      .getTask(journeyId, taskId)
      .then((content) => {
        if (!active) return;
        setTask(content);
        setPhase("intro");
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Không tải được nhiệm vụ.");
        setPhase("error");
      });
    return () => {
      active = false;
    };
  }, [journeyId, taskId]);

  const finished = task && (task.status === "COMPLETED" || task.status === "FAILED");

  function resetAnswers() {
    setChoices({});
    setTexts({});
    setIndex(0);
    setQr(null);
    setResult(null);
  }

  /** Mở khóa câu hỏi bằng vị trí hiện tại (hoặc mã QR đã quét). */
  async function unlock(qrValue) {
    setBusy(true);
    setError("");
    setLocationMessage("");
    try {
      let pos = position;
      if (!qrValue) {
        pos = await getDevicePosition();
        setPosition(pos);
      }
      const content = await journeyService.getTask(
        journeyId,
        taskId,
        qrValue ? { qrValue } : { latitude: pos.latitude, longitude: pos.longitude },
      );
      setTask(content);
      setQr(qrValue && content.unlocked ? qrValue : null);
      if (qrValue && !content.unlocked && content.status !== "COMPLETED" && content.status !== "FAILED") {
        setError("Mã QR không khớp với trạm này. Hãy thử lại.");
      }
      setIndex(0);
      setPhase(
        content.status === "COMPLETED" || content.status === "FAILED"
          ? "intro"
          : content.unlocked
            ? "quiz"
            : "locked",
      );
    } catch (err) {
      if (isGeoError(err)) {
        setLocationMessage(describeGeoError(err));
        setPhase((p) => (p === "intro" ? "locked" : p));
      } else {
        setError(err?.message || "Không thể kiểm tra vị trí.");
      }
    } finally {
      setBusy(false);
    }
  }

  function start() {
    if (task.requiresLocation) {
      unlock();
    } else {
      setPhase("quiz");
      setIndex(0);
    }
  }

  async function showClue() {
    setBusy(true);
    try {
      const data = await journeyService.getClue(journeyId, taskId);
      setClue(data.clue);
    } catch (err) {
      setError(err?.message || "Không lấy được manh mối.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      let location = {};
      if (task.requiresLocation) {
        if (qr) {
          location = { qrValue: qr };
        } else {
          try {
            location = await getDevicePosition();
          } catch {
            location = position ?? {};
          }
        }
      }
      const answers = task.questions.map((q) =>
        q.questionType === "TEXT"
          ? { questionId: q.id, text: (texts[q.id] ?? "").trim() }
          : { questionId: q.id, answerId: choices[q.id] },
      );
      const data = await journeyService.submitTask(journeyId, taskId, answers, location);
      setResult(data);
      setPhase("result");
    } catch (err) {
      setError(err?.message || "Không thể nộp bài. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function reloadIntro() {
    setPhase("loading");
    resetAnswers();
    try {
      setTask(await journeyService.getTask(journeyId, taskId));
      setPhase("intro");
    } catch (err) {
      setError(err?.message || "Không tải được nhiệm vụ.");
      setPhase("error");
    }
  }

  async function nextStation() {
    resetAnswers();
    await unlock();
  }

  const back = (
    <Link href={ROUTES.JOURNEY(journeyId)} className="text-sm text-blue-600 hover:underline">
      ← Về hành trình
    </Link>
  );

  if (phase === "loading") {
    return <div className="mx-auto h-64 max-w-xl animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />;
  }

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-xl space-y-3">
        {back}
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  const errorBox = error && (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {error}
    </p>
  );

  // ── Giới thiệu ───────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        {back}
        <section className="rounded-3xl bg-gradient-to-br from-emerald-500 to-sky-600 p-6 text-white shadow-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            {task.requiresLocation ? <Compass className="h-6 w-6" /> : <HelpCircle className="h-6 w-6" />}
          </div>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight">{task.taskName}</h1>
          {task.description && <p className="mt-2 text-sm leading-relaxed text-white/90">{task.description}</p>}
        </section>

        <div className="grid grid-cols-3 gap-3">
          <Stat icon={HelpCircle} value={task.totalQuestions} label="câu hỏi" />
          <Stat icon={Star} value={`+${task.pointsReward}`} label="điểm thưởng" />
          <Stat icon={RotateCcw} value={`${task.attemptsRemaining}/${task.maxAttempts}`} label="lượt còn lại" />
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-2 font-bold text-gray-900 dark:text-white">Thể lệ</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Trả lời đúng tất cả câu hỏi để nhận trọn điểm thưởng (chỉ một lần).</li>
            {task.requiresLocation ? (
              <>
                <li>Mỗi câu hỏi gắn với một địa điểm: bạn cần đứng trong bán kính của trạm để mở câu hỏi.</li>
                <li>Trả lời sai một câu, bạn phải làm lại từ câu đầu.</li>
              </>
            ) : (
              <li>Chưa đúng hết, bạn có thể làm lại nếu còn lượt (tối đa {task.maxAttempts} lượt).</li>
            )}
          </ul>
        </section>

        {errorBox}

        {task.status === "COMPLETED" ? (
          <p className="rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800">
            Bạn đã hoàn thành nhiệm vụ này.
          </p>
        ) : task.status === "FAILED" ? (
          <p className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">
            Bạn đã hết lượt làm nhiệm vụ này.
          </p>
        ) : (
          <button
            onClick={start}
            disabled={busy}
            className="w-full rounded-xl bg-emerald-600 py-3.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Đang xác định vị trí..." : task.attempts > 0 ? "Làm lại nhiệm vụ" : "Bắt đầu nhiệm vụ"}
          </button>
        )}
      </div>
    );
  }

  // ── Dẫn đường tới trạm ───────────────────────────────────────────────────
  if (phase === "locked") {
    const station = task.station;
    const radius = station?.radiusMeters ?? 50;
    const distance = task.distanceMeters;
    const closeness = distance == null ? 0 : Math.min(1, radius / Math.max(distance, 1));
    return (
      <div className="mx-auto max-w-xl space-y-4">
        {back}
        {task.totalQuestions > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
              Câu {task.questionIndex + 1}/{task.totalQuestions}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${(task.questionIndex / task.totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        )}

        <section className="rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-100">
            <MapPin className="h-9 w-9 text-sky-600" />
          </div>
          <p className="mt-3 text-sm text-gray-500">Hãy đến trạm tiếp theo</p>
          <h1 className="text-xl font-extrabold">{station?.name ?? "Địa điểm kế tiếp"}</h1>
          {distance != null ? (
            <>
              <p className="mt-4 text-4xl font-black text-sky-700">
                {distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`}
              </p>
              <p className="text-xs text-gray-500">còn cách bạn</p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${closeness * 100}%` }} />
              </div>
              <p className="mt-2 text-xs text-gray-500">Cần ở trong bán kính {radius} m để mở câu hỏi</p>
            </>
          ) : (
            <p className="mt-4 text-sm text-gray-500">Bật định vị để biết bạn còn cách trạm bao xa.</p>
          )}
          {locationMessage && (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-left text-sm text-amber-800">{locationMessage}</p>
          )}
        </section>

        {errorBox}

        <button
          onClick={() => unlock()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          <Crosshair className="h-5 w-5" />
          {busy ? "Đang xác định vị trí..." : "Cập nhật vị trí của tôi"}
        </button>
        <button
          onClick={() => setQrOpen(true)}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 py-3.5 font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
        >
          <QrCode className="h-5 w-5" /> Quét QR tại trạm
        </button>
        <button
          onClick={showClue}
          disabled={busy}
          className="mx-auto flex items-center gap-2 text-sm text-gray-600 hover:underline"
        >
          <Lightbulb className="h-4 w-4" /> Xem manh mối
        </button>
        {clue && <p className="rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">{clue}</p>}

        {qrOpen && (
          <QrDialog
            title="Quét QR tại trạm"
            hint={station ? `Quét mã QR tại ${station.name}` : undefined}
            onClose={() => setQrOpen(false)}
            onResult={(value) => {
              setQrOpen(false);
              unlock(value);
            }}
          />
        )}
      </div>
    );
  }

  // ── Làm bài ──────────────────────────────────────────────────────────────
  if (phase === "quiz") {
    const questions = task.questions ?? [];
    if (questions.length === 0) {
      return (
        <div className="mx-auto max-w-xl space-y-3">
          {back}
          <p className="rounded-xl bg-gray-100 p-4 text-gray-600">Nhiệm vụ này chưa có câu hỏi.</p>
        </div>
      );
    }
    const i = Math.min(index, questions.length - 1);
    const q = questions[i];
    const isText = q.questionType === "TEXT";
    const answered = (question) =>
      question.questionType === "TEXT"
        ? (texts[question.id] ?? "").trim().length > 0
        : choices[question.id] != null;
    const allAnswered = questions.every(answered);
    const isLast = i === questions.length - 1;
    // Nhiệm vụ thực địa (tuần tự hoặc tự do) làm từng câu tại từng trạm
    const stepwise = task.sequential || task.freeOrder;
    const shownNumber = stepwise ? task.questionIndex + 1 : i + 1;
    const shownTotal = stepwise ? task.totalQuestions : questions.length;

    return (
      <div className="mx-auto max-w-xl space-y-4">
        {back}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">
              Câu {shownNumber} / {shownTotal}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              +{task.pointsReward} điểm
            </span>
          </div>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: shownTotal }).map((_, n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full ${n < shownNumber ? "bg-emerald-500" : "bg-gray-200"}`}
              />
            ))}
          </div>
        </div>

        {stepwise && task.station && (
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <MapPin className="h-4 w-4" /> Tại: {task.station.name}
          </p>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {q.imageUrl && (
            <a href={q.imageUrl} target="_blank" rel="noopener noreferrer" className="mb-4 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={q.imageUrl}
                alt="Ảnh minh hoạ câu hỏi"
                className="max-h-72 w-full rounded-xl object-cover"
              />
            </a>
          )}
          <h1 className="text-lg font-extrabold leading-snug">{q.content}</h1>
        </section>

        {isText ? (
          <textarea
            value={texts[q.id] ?? ""}
            onChange={(e) => setTexts((prev) => ({ ...prev, [q.id]: e.target.value }))}
            rows={4}
            placeholder="Nhập câu trả lời của bạn..."
            disabled={busy}
            className="w-full rounded-2xl border border-gray-300 p-4 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
          />
        ) : q.options.some((o) => o.imageUrl) ? (
          // Câu hỏi "chọn ảnh đúng": phương án hiện thành lưới ảnh 2 cột
          <div className="grid grid-cols-2 gap-2.5">
            {q.options.map((option, n) => {
              const selected = choices[q.id] === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setChoices((prev) => ({ ...prev, [q.id]: option.id }))}
                  disabled={busy}
                  className={`relative overflow-hidden rounded-2xl border-2 text-left transition-colors ${
                    selected
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 bg-white hover:border-emerald-300 dark:border-gray-800 dark:bg-gray-900"
                  }`}
                >
                  {option.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={option.imageUrl} alt={`Phương án ${LETTERS[n] ?? n + 1}`} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-gray-50 p-3 text-center text-[15px] dark:bg-gray-800">
                      {option.content}
                    </div>
                  )}
                  <span
                    className={`absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow ${
                      selected ? "bg-emerald-500 text-white" : "bg-white/90 text-gray-600"
                    }`}
                  >
                    {selected ? "✓" : (LETTERS[n] ?? n + 1)}
                  </span>
                  {option.imageUrl && option.content && (
                    <span className="block px-3 py-2 text-sm leading-snug">{option.content}</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2.5">
            {q.options.map((option, n) => {
              const selected = choices[q.id] === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setChoices((prev) => ({ ...prev, [q.id]: option.id }))}
                  disabled={busy}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
                    selected
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 bg-white hover:border-emerald-300 dark:border-gray-800 dark:bg-gray-900"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      selected ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {selected ? "✓" : (LETTERS[n] ?? n + 1)}
                  </span>
                  <span className="text-[15px] leading-snug">{option.content}</span>
                </button>
              );
            })}
          </div>
        )}

        {errorBox}

        <div className="flex gap-2 pt-1">
          {!stepwise && i > 0 && (
            <button
              onClick={() => setIndex(i - 1)}
              disabled={busy}
              className="rounded-xl border border-gray-300 px-5 py-3 font-bold hover:bg-gray-50"
            >
              ←
            </button>
          )}
          {stepwise || isLast ? (
            <button
              onClick={submit}
              disabled={busy || (stepwise ? !answered(q) : !allAnswered)}
              className="flex-1 rounded-xl bg-emerald-600 py-3.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? "Đang gửi..." : stepwise ? "Xác nhận câu trả lời" : "Nộp bài"}
            </button>
          ) : (
            <button
              onClick={() => setIndex(i + 1)}
              disabled={!answered(q)}
              className="flex-1 rounded-xl bg-emerald-600 py-3.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Câu tiếp theo
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Kết quả ──────────────────────────────────────────────────────────────
  const success = result.status === "COMPLETED";
  const stepCorrect = !success && result.lastAnswerCorrect === true;
  const exhausted = result.status === "FAILED" || (result.attemptsRemaining ?? 0) <= 0;

  const view = success
    ? {
        tone: "text-emerald-600 bg-emerald-100",
        title: "Xuất sắc!",
        body: `Bạn đã hoàn thành nhiệm vụ "${task.taskName}".`,
      }
    : stepCorrect
      ? {
          tone: "text-emerald-600 bg-emerald-100",
          title: "Chính xác!",
          body: `Bạn đã trả lời đúng ${result.questionIndex}/${result.totalQuestions} câu. Hãy đến địa điểm kế tiếp để mở câu hỏi tiếp theo.`,
        }
      : {
          tone: "text-red-600 bg-red-100",
          title: "Chưa chính xác",
          body: exhausted
            ? "Bạn đã hết lượt làm nhiệm vụ này."
            : `Bạn đúng ${result.correctCount}/${result.totalQuestions} câu. Cần đúng tất cả để nhận điểm. Còn ${result.attemptsRemaining} lượt làm lại.`,
        };
  const earned = result.pointsEarned > 0 ? result.pointsEarned : task.pointsReward;

  return (
    <div className="mx-auto max-w-xl space-y-5 pt-6 text-center">
      <div className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full text-5xl ${view.tone}`}>
        {success ? "🏆" : stepCorrect ? "✓" : "✗"}
      </div>
      <h1 className="text-3xl font-black">{view.title}</h1>
      <p className="text-gray-600">{view.body}</p>
      {success && earned > 0 && (
        <span className="inline-block rounded-full bg-amber-100 px-4 py-1.5 font-bold text-amber-800">
          +{earned} điểm thưởng
        </span>
      )}
      {errorBox}
      <div className="space-y-2 pt-4">
        {stepCorrect && (
          <button
            onClick={nextStation}
            disabled={busy}
            className="w-full rounded-xl bg-emerald-600 py-3.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Đang xác định vị trí..." : "Đến địa điểm kế tiếp"}
          </button>
        )}
        {!success && !stepCorrect && !exhausted && (
          <button
            onClick={reloadIntro}
            className="w-full rounded-xl bg-emerald-600 py-3.5 font-bold text-white hover:bg-emerald-700"
          >
            Làm lại
          </button>
        )}
        <Link
          href={ROUTES.JOURNEY(journeyId)}
          className="block w-full rounded-xl border border-gray-300 py-3.5 font-bold hover:bg-gray-50"
        >
          Về hành trình
        </Link>
      </div>
    </div>
  );
}
