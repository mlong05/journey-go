"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Lock, MapPin, QrCode, Crosshair, Award, SkipForward, ListChecks } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { getDevicePosition, describeGeoError } from "@/lib/geolocation";
import { journeyService, QrDialog, RewardModal, CulturalStories } from "@/features/journey";

const DONE = new Set(["COMPLETED", "SKIPPED"]);

function taskLabel(task) {
  if (task.status === "COMPLETED") return `Hoàn thành · +${task.pointsEarned ?? 0} điểm`;
  if (task.status === "FAILED") return "Đã hết lượt làm";
  if ((task.attempts ?? 0) > 0) return `Đã làm ${task.attempts} lượt · làm lại`;
  return "Bấm để bắt đầu";
}

export default function JourneyPage() {
  const { journeyId } = useParams();
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [qrFor, setQrFor] = useState(null);
  const [reward, setReward] = useState(null);

  const reload = useCallback(async () => {
    const data = await journeyService.getById(journeyId);
    setJourney(data);
    return data;
  }, [journeyId]);

  useEffect(() => {
    let active = true;
    journeyService
      .getById(journeyId)
      .then((data) => active && setJourney(data))
      .catch((err) => active && setError(err?.message || "Không thể tải hành trình."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [journeyId]);

  async function afterCheckIn(result, destination) {
    await reload().catch(() => {});
    if (result.badgeAwarded) {
      setReward({
        title: "Check-in thành công!",
        subtitle: `Bạn đã mở khóa nội dung văn hóa tại ${destination.destinationName} và nhận huy hiệu di sản.`,
        badgeName: result.badgeName,
        badgeIconUrl: result.badgeIconUrl,
        buttonLabel: "Bắt đầu nhiệm vụ",
      });
    }
  }

  async function checkInGps(destination) {
    setBusyId(destination.destinationId);
    setError("");
    try {
      const position = await getDevicePosition();
      const result = await journeyService.checkInGps(journey.id, destination.destinationId, position);
      await afterCheckIn(result, destination);
    } catch (err) {
      // Lỗi định vị có `code` số; lỗi API là Error thường.
      setError(err?.code !== undefined && err?.status === undefined ? describeGeoError(err) : err?.message);
    } finally {
      setBusyId(null);
    }
  }

  async function checkInQr(destination, value) {
    setQrFor(null);
    setBusyId(destination.destinationId);
    setError("");
    try {
      const result = await journeyService.checkInQr(journey.id, destination.destinationId, value);
      await afterCheckIn(result, destination);
    } catch (err) {
      setError(err?.message || "Mã QR không hợp lệ.");
    } finally {
      setBusyId(null);
    }
  }

  async function skip(destination) {
    if (!window.confirm(`Bỏ qua ${destination.destinationName}? Bạn sẽ không nhận huy hiệu và điểm tại đây.`)) {
      return;
    }
    setBusyId(destination.destinationId);
    setError("");
    try {
      await journeyService.skipDestination(journey.id, destination.destinationId);
      await reload();
    } catch (err) {
      setError(err?.message || "Không thể bỏ qua điểm đến.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />;
  if (!journey) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || "Không tìm thấy hành trình."}
      </div>
    );
  }

  const destinations = [...(journey.destinations ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
  const doneCount = destinations.filter((d) => DONE.has(d.status)).length;
  const total = journey.totalDestinations || destinations.length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  const points = destinations.reduce(
    (sum, d) => sum + (d.tasks ?? []).reduce((s, t) => s + (t.pointsEarned ?? 0), 0),
    0,
  );
  const completed = journey.status === "COMPLETED";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={ROUTES.JOURNEYS} className="text-sm text-blue-600 hover:underline">
        ← Hành trình của tôi
      </Link>

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-sky-600 p-6 text-white shadow-lg">
        <p className="text-xs font-bold tracking-widest text-white/70">
          {completed ? "ĐÃ HOÀN THÀNH" : "ĐANG TRẢI NGHIỆM"}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight">{journey.tourName}</h1>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-white/20 px-3 py-1">
            {doneCount}/{total} điểm đến
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1">{points} điểm</span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-white/80">{percent}% hoàn thành</p>
      </section>

      {completed && (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Chúc mừng! Bạn đã đi trọn hành trình này và nhận thêm 50 điểm thưởng hoàn thành.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <ol className="space-y-4">
        {destinations.map((d, index) => {
          const done = DONE.has(d.status);
          const current = d.status === "IN_PROGRESS";
          const locked = d.status === "NOT_STARTED";
          const busy = busyId === d.destinationId;
          return (
            <li key={d.destinationId} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                    done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : current
                        ? "border-sky-600 bg-sky-600 text-white"
                        : "border-gray-300 bg-white text-gray-400"
                  }`}
                >
                  {done ? d.status === "SKIPPED" ? <SkipForward className="h-4 w-4" /> : <Check className="h-4 w-4" /> : d.orderIndex}
                </div>
                {index < destinations.length - 1 && (
                  <div className={`mt-1 w-0.5 flex-1 ${done ? "bg-emerald-300" : "bg-gray-200"}`} />
                )}
              </div>

              <div
                className={`mb-1 flex-1 rounded-2xl border p-4 ${
                  current ? "border-emerald-500 bg-white shadow-md" : locked ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className={`font-bold ${locked ? "text-gray-500" : "text-gray-900"}`}>{d.destinationName}</h2>
                  {d.badgeAwarded && <Award className="h-5 w-5 shrink-0 text-amber-500" />}
                  {locked && <Lock className="h-4 w-4 shrink-0 text-gray-400" />}
                </div>

                {locked && <p className="mt-1 text-sm text-gray-500">Hoàn thành điểm đến trước để mở khóa.</p>}
                {d.status === "SKIPPED" && <p className="mt-1 text-sm text-gray-500">Bạn đã bỏ qua điểm đến này.</p>}

                {!locked && d.status !== "SKIPPED" && !d.checkedIn && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-gray-500">
                      Hãy đến địa điểm này và check-in để mở khóa nhiệm vụ và nhận huy hiệu di sản.
                    </p>
                    <button
                      onClick={() => checkInGps(d)}
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <Crosshair className="h-5 w-5" />
                      {busy ? "Đang xác định vị trí..." : "Check-in bằng GPS"}
                    </button>
                    <button
                      onClick={() => setQrFor(d)}
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 py-3 font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      <QrCode className="h-5 w-5" /> Quét mã QR
                    </button>
                    <button
                      onClick={() => skip(d)}
                      disabled={busy}
                      className="w-full text-center text-sm text-gray-500 hover:underline"
                    >
                      Bỏ qua điểm này
                    </button>
                    <div className="border-t border-gray-100 pt-3">
                      <CulturalStories destinationId={d.destinationId} compact />
                    </div>
                  </div>
                )}

                {d.checkedIn && (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">Đã check-in</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
                        <ListChecks className="h-3.5 w-3.5" />
                        {d.tasksCompleted}/{d.totalTasks} nhiệm vụ
                      </span>
                    </div>
                    <div className="pb-1">
                      <p className="mb-2 text-xs font-bold tracking-wider text-gray-500">CÂU CHUYỆN VĂN HÓA</p>
                      <CulturalStories destinationId={d.destinationId} unlocked />
                    </div>
                    {(d.tasks ?? []).length > 0 && (
                      <p className="pt-1 text-xs font-bold tracking-wider text-gray-500">NHIỆM VỤ</p>
                    )}
                    {(d.tasks ?? []).map((task) => (
                      <Link
                        key={task.taskId}
                        href={ROUTES.JOURNEY_TASK(journey.id, task.taskId)}
                        className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                          task.status === "COMPLETED"
                            ? "bg-emerald-50 hover:bg-emerald-100"
                            : task.status === "FAILED"
                              ? "bg-red-50 hover:bg-red-100"
                              : "bg-sky-50 hover:bg-sky-100"
                        }`}
                      >
                        <MapPin className="h-5 w-5 shrink-0 text-sky-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-gray-900">{task.taskName}</span>
                          <span className="block text-xs text-gray-600">{taskLabel(task)}</span>
                        </span>
                        <span className="text-gray-400">›</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {qrFor && (
        <QrDialog
          title="Check-in bằng QR"
          hint={`Quét mã QR tại ${qrFor.destinationName}`}
          onClose={() => setQrFor(null)}
          onResult={(value) => checkInQr(qrFor, value)}
        />
      )}
      {reward && <RewardModal {...reward} onClose={() => setReward(null)} />}
    </div>
  );
}
