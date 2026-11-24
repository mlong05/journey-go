"use client";

/**
 * Biểu mẫu đăng ký trở thành đối tác của JourneyGo — 4 giai đoạn theo đặc tả.
 *
 *  Giai đoạn 1 — Thông tin người đại diện (email + OTP 6 số, sđt, họ tên, chức vụ)
 *  Giai đoạn 2 — Xác minh hồ sơ doanh nghiệp (tên, loại hình, MST, giấy tờ, địa chỉ, phạm vi)
 *  Giai đoạn 3 — Thiết lập thanh toán (ngân hàng, số tài khoản, chủ tài khoản)
 *  Giai đoạn 4 — Xác nhận & đồng ý (3 checkbox bắt buộc)
 *
 *  Đặc tả:
 *   • Lưu nháp tự động khi điền nhiều giai đoạn; có thể quay lại giai đoạn trước để sửa.
 *   • Chỉ cho phép gửi đơn khi tất cả dữ liệu bắt buộc hợp lệ.
 *   • Cảnh báo khi rời trang mà còn thay đổi chưa được lưu.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";
import { ROUTES } from "@/constants/routes";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleAlert,
  FileText,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  saveDraft,
  sendOtp,
  submitApplication,
  uploadDocument,
  verifyOtp,
} from "@/features/partnerapplication/services/partnerApplicationService";
import PartnerAddressFields from "@/features/partnerapplication/components/PartnerAddressFields";
import LegalDocumentModal from "@/features/partnerapplication/components/LegalDocumentModal";
import { Tooltip } from "@/components/ui";
import {
  CheckRow,
  Field,
  FileField,
  OptionCard,
  Select,
  TextArea,
  TextInput,
  buttonCls,
} from "@/features/partnerapplication/components/PartnerFormKit";
import {
  getPartnerTerms,
  getPrivacyPolicy,
} from "@/features/partnerapplication/constants/legalDocuments";
import { BANKS } from "@/constants/banks";
import { useT } from "@/i18n";

const STEPS = [
  { id: 1, labelKey: "home.pr.step.1", icon: UserRound },
  { id: 2, labelKey: "home.pr.step.2", icon: Building2 },
  { id: 3, labelKey: "home.pr.step.3", icon: Wallet },
  { id: 4, labelKey: "home.pr.step.4", icon: ShieldCheck },
];

const PARTNER_TYPES = [
  {
    value: "TRAVEL_AGENCY",
    labelKey: "home.pr.type.TRAVEL_AGENCY.label",
    hintKey: "home.pr.type.TRAVEL_AGENCY.hint",
  },
  {
    value: "EXPERIENCE_PROVIDER",
    labelKey: "home.pr.type.EXPERIENCE_PROVIDER.label",
    hintKey: "home.pr.type.EXPERIENCE_PROVIDER.hint",
  },
];

const POSITIONS = [
  { value: "OWNER", labelKey: "home.pr.pos.OWNER" },
  { value: "DIRECTOR", labelKey: "home.pr.pos.DIRECTOR" },
  { value: "MANAGER", labelKey: "home.pr.pos.MANAGER" },
  { value: "LEGAL_REPRESENTATIVE", labelKey: "home.pr.pos.LEGAL_REPRESENTATIVE" },
  { value: "AUTHORIZED_EMPLOYEE", labelKey: "home.pr.pos.AUTHORIZED_EMPLOYEE" },
  { value: "OTHER", labelKey: "home.pr.pos.OTHER" },
];

const EMPTY_FORM = {
  email: "",
  phone: "",
  representativeName: "",
  representativePosition: "",
  businessName: "",
  partnerType: "",
  travelScope: "",
  taxCode: "",
  businessRegistrationInfo: "",
  operationLicenseUrl: "",
  travelLicenseUrl: "",
  signatureDocumentUrl: "",
  businessRegistrationUrl: "",
  province: "",
  ward: "",
  addressDetail: "",
  businessScope: "",
  bankName: "",
  bankAccountNumber: "",
  bankAccountHolder: "",
  confirmedAuthority: false,
  agreedPartnerTerms: false,
  agreedPrivacyPolicy: false,
};

/** Kiểm tra hợp lệ theo giai đoạn — trả về map field → lỗi. */
function validateStep(step, form, t) {
  const errors = {};

  if (step === 1) {
    if (!form.email.trim()) errors.email = t("home.pr.err.emailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errors.email = t("home.pr.err.emailInvalid");
    if (!form.phone.trim()) errors.phone = t("home.pr.err.phoneRequired");
    else if (!/^0\d{9,10}$/.test(form.phone.trim()))
      errors.phone = t("home.pr.err.phoneInvalid");
    if (!form.representativeName.trim())
      errors.representativeName = t("home.pr.err.repNameRequired");
    if (!form.representativePosition)
      errors.representativePosition = t("home.pr.err.repPosRequired");
  }

  if (step === 2) {
    if (!form.businessName.trim())
      errors.businessName = t("home.pr.err.businessNameRequired");
    if (!form.partnerType) errors.partnerType = t("home.pr.err.partnerTypeRequired");
    if (!form.taxCode.trim()) errors.taxCode = t("home.pr.err.taxCodeRequired");
    else if (!/^\d{10}$/.test(form.taxCode.trim()))
      errors.taxCode = t("home.pr.err.taxCodeInvalid");
    if (!form.businessRegistrationInfo.trim())
      errors.businessRegistrationInfo = t("home.pr.err.bizRegInfoRequired");
    if (!form.operationLicenseUrl)
      errors.operationLicenseUrl = t("home.pr.err.opLicenseRequired");
    if (!form.businessRegistrationUrl)
      errors.businessRegistrationUrl = t("home.pr.err.bizRegDocRequired");
    if (form.partnerType === "TRAVEL_AGENCY") {
      if (!form.travelScope)
        errors.travelScope = t("home.pr.err.travelScopeRequired");
      if (!form.travelLicenseUrl)
        errors.travelLicenseUrl = t("home.pr.err.travelLicenseRequired");
      if (!form.signatureDocumentUrl)
        errors.signatureDocumentUrl = t("home.pr.err.signatureDocRequired");
    }
    if (!form.province.trim()) errors.province = t("home.pr.err.provinceRequired");
    if (!form.ward.trim()) errors.ward = t("home.pr.err.wardRequired");
    if (!form.addressDetail.trim())
      errors.addressDetail = t("home.pr.err.addressDetailRequired");
    if (!form.businessScope.trim())
      errors.businessScope = t("home.pr.err.businessScopeRequired");
  }

  if (step === 3) {
    if (!form.bankName) errors.bankName = t("home.pr.err.bankNameRequired");
    if (!form.bankAccountNumber.trim())
      errors.bankAccountNumber = t("home.pr.err.bankAccRequired");
    else if (!/^[0-9A-Z]{6,20}$/.test(form.bankAccountNumber.trim()))
      errors.bankAccountNumber = t("home.pr.err.bankAccInvalid");
    if (!form.bankAccountHolder.trim())
      errors.bankAccountHolder = t("home.pr.err.bankHolderRequired");
  }

  if (step === 4) {
    if (!form.confirmedAuthority)
      errors.confirmedAuthority = t("home.pr.err.confirmedAuthority");
    if (!form.agreedPartnerTerms)
      errors.agreedPartnerTerms = t("home.pr.err.agreedPartnerTerms");
    if (!form.agreedPrivacyPolicy)
      errors.agreedPrivacyPolicy = t("home.pr.err.agreedPrivacyPolicy");
  }

  return errors;
}

/** Kiểm tra hợp lệ toàn bộ 4 giai đoạn. */
function validateAll(form, t) {
  return [1, 2, 3, 4].reduce(
    (acc, step) => ({ ...acc, ...validateStep(step, form, t) }),
    {}
  );
}

export default function PartnerRegisterPage() {
  const t = useT();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ── Văn bản pháp lý (Giai đoạn 4) ─────────────────────────────────────────
  const [legalDoc, setLegalDoc] = useState(null); // "terms" | "privacy" | null

  // ── Giai đoạn 1: OTP ───────────────────────────────────────────────────────
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [, setEmailExists] = useState(false);

  const dirtyRef = useRef(false);
  const lastSavedRef = useRef("");

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const setField = useCallback((key, value) => {
    dirtyRef.current = true;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // ── Tự động lưu nháp ───────────────────────────────────────────────────────
  const buildPayload = useCallback(
    (overrides = {}) => ({
      email: form.email.trim(),
      emailVerified: Boolean(verificationToken),
      verificationToken: verificationToken || null,
      phone: form.phone.trim(),
      representativeName: form.representativeName.trim(),
      representativePosition: form.representativePosition || null,
      businessName: form.businessName.trim(),
      partnerType: form.partnerType || null,
      travelScope: form.partnerType === "TRAVEL_AGENCY" ? form.travelScope || null : null,
      taxCode: form.taxCode.trim(),
      businessRegistrationInfo: form.businessRegistrationInfo.trim(),
      operationLicenseUrl: form.operationLicenseUrl || null,
      travelLicenseUrl: form.travelLicenseUrl || null,
      signatureDocumentUrl: form.signatureDocumentUrl || null,
      businessRegistrationUrl: form.businessRegistrationUrl || null,
      province: form.province.trim(),
      ward: form.ward.trim(),
      addressDetail: form.addressDetail.trim(),
      businessScope: form.businessScope.trim(),
      bankName: form.bankName || null,
      bankAccountNumber: form.bankAccountNumber.trim(),
      bankAccountHolder: form.bankAccountHolder.trim(),
      confirmedAuthority: form.confirmedAuthority,
      agreedPartnerTerms: form.agreedPartnerTerms,
      agreedPrivacyPolicy: form.agreedPrivacyPolicy,
      ...overrides,
    }),
    [form, verificationToken]
  );

  const persistDraft = useCallback(
    async (silent = true) => {
      // Chỉ lưu nháp khi đã verify email — backend yêu cầu bằng chứng xác minh.
      if (!verificationToken || !form.email.trim()) return false;
      const payload = JSON.stringify(buildPayload());
      if (payload === lastSavedRef.current) return true;

      setSavingDraft(true);
      try {
        await saveDraft(buildPayload());
        lastSavedRef.current = payload;
        dirtyRef.current = false;
        if (!silent) showToast("success", t("home.pr.toast.draftSaved"));
        return true;
      } catch (err) {
        if (!silent)
          showToast("error", err?.message || t("home.pr.toast.draftFailed"));
        return false;
      } finally {
        setSavingDraft(false);
      }
    },
    [buildPayload, form.email, showToast, t, verificationToken]
  );

  // Cảnh báo khi rời trang mà còn thay đổi chưa lưu.
  useEffect(() => {
    const handler = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── Giai đoạn 1: gửi & xác minh OTP ───────────────────────────────────────
  const handleSendOtp = async () => {
    const email = form.email.trim();
    if (!email) {
      setErrors((p) => ({ ...p, email: t("home.pr.err.emailRequired") }));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((p) => ({ ...p, email: t("home.pr.err.emailInvalid") }));
      return;
    }

    setOtpLoading(true);
    setOtpError("");
    try {
      await sendOtp(email);
      setOtpSent(true);
      setOtpCode("");
      showToast("success", t("home.pr.toast.otpSent"));
    } catch (err) {
      setOtpError(err?.message || t("home.pr.err.otpSendFailed"));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setOtpError(t("home.pr.err.otpFormat"));
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await verifyOtp(form.email.trim(), otpCode.trim());
      setVerificationToken(res?.verificationToken || "");
      setEmailExists(Boolean(res?.accountExists));
      dirtyRef.current = true;

      if (res?.accountExists) {
        showToast("info", t("home.pr.toast.otpVerifiedExists"));
        setTimeout(() => router.push("/login"), 3500);
      } else {
        showToast("success", t("home.pr.toast.otpVerified"));
      }
    } catch (err) {
      setOtpError(err?.message || t("home.pr.err.otpInvalid"));
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Upload giấy tờ ────────────────────────────────────────────────────────
  const handleUpload = async (field, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("error", t("home.pr.toast.fileTooLarge"));
      return;
    }
    if (!verificationToken) {
      showToast("error", t("home.pr.toast.verifyBeforeUpload"));
      return;
    }
    setUploadingField(field);
    try {
      const url = await uploadDocument(file, form.email.trim(), verificationToken);
      if (!url) throw new Error(t("home.pr.err.uploadNoUrl"));
      setField(field, url);
      showToast("success", t("home.pr.toast.uploadSuccess"));
    } catch (err) {
      showToast("error", err?.message || t("home.pr.toast.uploadFailed"));
    } finally {
      setUploadingField("");
    }
  };

  // ── Điều hướng giữa các giai đoạn ─────────────────────────────────────────
  const goNext = async () => {
    const stepErrors = validateStep(step, form, t);
    if (Object.keys(stepErrors).length > 0) {
      setErrors((p) => ({ ...p, ...stepErrors }));
      showToast("error", t("home.pr.toast.stepIncomplete"));
      return;
    }
    if (step === 1 && !verificationToken) {
      setOtpError(t("home.pr.err.verifyEmailFirst"));
      showToast("error", t("home.pr.toast.verifyEmailFirst"));
      return;
    }

    setErrors({});
    // Tự động lưu nháp khi rời giai đoạn.
    await persistDraft(true);
    setStep((s) => Math.min(4, s + 1));
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  // ── Gửi đơn ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const allErrors = validateAll(form, t);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstStep = [1, 2, 3, 4].find((s) => Object.keys(validateStep(s, form, t)).length > 0);
      if (firstStep) setStep(firstStep);
      showToast("error", t("home.pr.toast.formIncomplete"));
      return;
    }
    if (!verificationToken) {
      setStep(1);
      showToast("error", t("home.pr.toast.emailNotVerified"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitApplication(buildPayload());
      dirtyRef.current = false;
      setSubmitted(true);
      showToast("success", t("home.pr.toast.submitSuccess"));
      setTimeout(() => router.push("/partner-register/success"), 2500);
      return result;
    } catch (err) {
      showToast("error", err?.message || t("home.pr.toast.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  /*
   * Mọi kiểu dùng của form đều lấy từ PartnerFormKit để 4 giai đoạn có cùng
   * chiều cao ô nhập, cùng kiểu nhãn và cùng kiểu lỗi.
   */

  const stepProgress = useMemo(() => ((step - 1) / 3) * 100, [step]);
  const partnerTermsDoc = useMemo(() => getPartnerTerms(t), [t]);
  const privacyPolicyDoc = useMemo(() => getPrivacyPolicy(t), [t]);
  const selectedPartnerType = PARTNER_TYPES.find((item) => item.value === form.partnerType);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <BrandLogo compact />
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-bold uppercase tracking-wider text-emerald-700 sm:inline">
              {t("home.pr.header.badge")}
            </span>
            <Link href={ROUTES.PARTNER_PROGRAM} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 hover:border-teal-300">
              <ArrowLeft size={15} className="text-slate-400" />
              {t("home.pr.header.backPartner")}
            </Link>
          </div>
        </div>
      </header>

      {/*
        main — chiếm đúng phần chiều cao còn lại của màn hình.
        `min-h-0` là mấu chốt: nó cho phép vùng cuộn bên trong co lại đúng bằng
        chiều cao khung thay vì đẩy trang dài ra ngoài viewport.
      */}
      <main className="mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col px-4 py-3 sm:px-6 sm:py-4">
        {/* Hero — thu gọn để mọi thứ vừa một màn hình */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-lg shadow-emerald-600/20">
            <Landmark size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              {t("home.pr.hero.title")}
            </h1>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              {t("home.pr.hero.desc")}
            </p>
          </div>
        </div>

        {/* Thanh tiến trình */}
        <div className="mt-3 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <div className="mb-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isDone = step > s.id;
              const isActive = step === s.id;
              return (
                <li key={s.id} className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isActive
                        ? "bg-emerald-700 text-white ring-4 ring-emerald-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isDone ? <Check size={15} /> : <Icon size={15} />}
                  </span>
                  <span
                    className={`hidden text-[11px] font-semibold leading-tight sm:block ${
                      isActive
                        ? "text-emerald-700"
                        : isDone
                        ? "text-slate-700"
                        : "text-slate-400"
                    }`}
                  >
                    {t(s.labelKey)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/*
          Thẻ form — luôn cùng một bề rộng và cùng một cấu trúc ở cả 4 giai đoạn.

          `min-h-0 flex-1` cho phép khung co giãn theo phần chiều cao còn lại của
          màn hình, còn `overflow-hidden` trên khung + `overflow-y-auto` trên vùng
          nội dung ⇒ nội dung dài cuộn BÊN TRONG khung, trang ngoài không bao giờ
          phải cuộn. Nhờ vậy cả 4 giai đoạn có cùng chiều cao và bề rộng, không
          còn tình trạng giai đoạn 1 co lại còn giai đoạn 2 tràn rộng.
        */}
        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Vùng nội dung: cuộn nội bộ khi nội dung dài hơn khung */}
          <div
            className={`min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 ${
              submitted ? "hidden" : ""
            }`}
          >
          {/* ── GIAI ĐOẠN 1 ── */}
          {step === 1 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {t("home.pr.s1.title")}
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {t("home.pr.s1.desc")}
                </p>
              </div>

              {/* Email + OTP */}
              <Field label={t("home.pr.s1.email")} required htmlFor="email" error={errors.email}>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <TextInput
                      id="email"
                      limit={150} counter="never"
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      disabled={otpSent}
                      placeholder={t("home.pr.s1.emailPlaceholder")}
                      error={errors.email}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading || otpSent}
                    className={buttonCls("primary")}
                  >
                    {otpLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Mail size={15} />
                    )}
                    {otpSent ? t("home.pr.s1.otpSentBtn") : t("home.pr.s1.sendOtpBtn")}
                  </button>
                </div>
              </Field>

              {otpSent && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <Field label={t("home.pr.s1.otpLabel")} required htmlFor="otp">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <TextInput
                        id="otp"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="flex-1 text-center font-mono text-lg tracking-[0.5em]"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpLoading}
                        className={buttonCls("success")}
                      >
                        {otpLoading ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <ShieldCheck size={15} />
                        )}
                        {t("home.pr.s1.verifyBtn")}
                      </button>
                    </div>
                  </Field>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                    {t("home.pr.s1.otpHint")}
                  </p>
                </div>
              )}

              {/* Lỗi gửi mã OTP — hiển thị NGAY cả khi chưa hiện box OTP
                  (trường hợp đã gửi đủ 3 lần/ngày ⇒ server trả 429) */}
              {otpError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-semibold leading-relaxed text-rose-700">
                  <CircleAlert size={13} className="mt-px shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              {verificationToken && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 size={16} className="shrink-0" />
                  {t("home.pr.s1.emailVerified")}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("home.pr.s1.phone")} required htmlFor="phone" error={errors.phone}>
                  <div className="relative">
                    <Phone
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <TextInput
                      id="phone"
                      limit={20} counter="never"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      placeholder="0901234567"
                      error={errors.phone}
                      className="pl-10"
                    />
                  </div>
                </Field>

                <Field
                  label={t("home.pr.s1.repName")}
                  required
                  htmlFor="representativeName"
                  error={errors.representativeName}
                >
                  <TextInput
                    id="representativeName"
                    limit={150}
                    value={form.representativeName}
                    onChange={(e) => setField("representativeName", e.target.value)}
                    placeholder={t("home.pr.s1.repNamePlaceholder")}
                    error={errors.representativeName}
                  />
                </Field>
              </div>

              <Field
                label={t("home.pr.s1.position")}
                required
                htmlFor="representativePosition"
                error={errors.representativePosition}
              >
                <Select
                  id="representativePosition"
                  value={form.representativePosition}
                  onChange={(e) => setField("representativePosition", e.target.value)}
                  error={errors.representativePosition}
                >
                  <option value="">{t("home.pr.s1.positionPlaceholder")}</option>
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {t(p.labelKey)}
                    </option>
                  ))}
                </Select>
              </Field>
            </section>
          )}

          {/* ── GIAI ĐOẠN 2 ── */}
          {step === 2 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {t("home.pr.s2.title")}
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {t("home.pr.s2.desc")}
                </p>
              </div>

              <Field
                label={t("home.pr.s2.businessName")}
                required
                htmlFor="businessName"
                error={errors.businessName}
              >
                <TextInput
                  id="businessName"
                  limit={200}
                  value={form.businessName}
                  onChange={(e) => setField("businessName", e.target.value)}
                  placeholder={t("home.pr.s2.businessNamePlaceholder")}
                  error={errors.businessName}
                />
              </Field>

              <Field label={t("home.pr.s2.partnerType")} required error={errors.partnerType}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PARTNER_TYPES.map((item) => (
                    <OptionCard
                      key={item.value}
                      selected={form.partnerType === item.value}
                      onClick={() => setField("partnerType", item.value)}
                      title={t(item.labelKey)}
                      hint={t(item.hintKey)}
                    />
                  ))}
                </div>
              </Field>

              {form.partnerType === "TRAVEL_AGENCY" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <Field
                    label={t("home.pr.s2.travelScope")}
                    required
                    error={errors.travelScope}
                  >
                    <div className="flex flex-wrap gap-4">
                      {["INTERNATIONAL", "DOMESTIC"].map((scopeVal) => (
                        <label
                          key={scopeVal}
                          className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={form.travelScope === scopeVal}
                            onChange={() =>
                              setField(
                                "travelScope",
                                form.travelScope === scopeVal ? "" : scopeVal
                              )
                            }
                            className="h-4 w-4 accent-emerald-600"
                          />
                          {t(`home.pr.s2.travelScope.${scopeVal}`)}
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("home.pr.s2.taxCode")} required htmlFor="taxCode" error={errors.taxCode}>
                  <TextInput
                    id="taxCode"
                    limit={10} counter="never"
                    value={form.taxCode}
                    onChange={(e) => setField("taxCode", e.target.value)}
                    placeholder="0101234567"
                    error={errors.taxCode}
                    className="tabular-nums"
                  />
                </Field>
                <Field
                  label={t("home.pr.s2.bizRegInfo")}
                  required
                  htmlFor="businessRegistrationInfo"
                  error={errors.businessRegistrationInfo}
                >
                  <TextInput
                    id="businessRegistrationInfo"
                    limit={500}
                    value={form.businessRegistrationInfo}
                    onChange={(e) => setField("businessRegistrationInfo", e.target.value)}
                    placeholder={t("home.pr.s2.bizRegInfoPlaceholder")}
                    error={errors.businessRegistrationInfo}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FileField
                  t={t}
                  label={t("home.pr.s2.opLicense")}
                  required
                  field="operationLicenseUrl"
                  value={form.operationLicenseUrl}
                  fileName={
                    form.operationLicenseUrl
                      ? form.operationLicenseUrl.split("/").pop()
                      : ""
                  }
                  uploading={uploadingField === "operationLicenseUrl"}
                  onSelect={(file) => handleUpload("operationLicenseUrl", file)}
                  onClear={() => setField("operationLicenseUrl", "")}
                  error={errors.operationLicenseUrl}
                />
                <FileField
                  t={t}
                  label={t("home.pr.s2.bizRegDoc")}
                  required
                  field="businessRegistrationUrl"
                  value={form.businessRegistrationUrl}
                  fileName={
                    form.businessRegistrationUrl
                      ? form.businessRegistrationUrl.split("/").pop()
                      : ""
                  }
                  uploading={uploadingField === "businessRegistrationUrl"}
                  onSelect={(file) => handleUpload("businessRegistrationUrl", file)}
                  onClear={() => setField("businessRegistrationUrl", "")}
                  error={errors.businessRegistrationUrl}
                />
              </div>

              {form.partnerType === "TRAVEL_AGENCY" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FileField
                    t={t}
                    label={t("home.pr.s2.travelLicense")}
                    required
                    field="travelLicenseUrl"
                    value={form.travelLicenseUrl}
                    fileName={
                      form.travelLicenseUrl ? form.travelLicenseUrl.split("/").pop() : ""
                    }
                    uploading={uploadingField === "travelLicenseUrl"}
                    onSelect={(file) => handleUpload("travelLicenseUrl", file)}
                    onClear={() => setField("travelLicenseUrl", "")}
                    error={errors.travelLicenseUrl}
                  />
                  <FileField
                    t={t}
                    label={t("home.pr.s2.signatureDoc")}
                    required
                    field="signatureDocumentUrl"
                    value={form.signatureDocumentUrl}
                    fileName={
                      form.signatureDocumentUrl
                        ? form.signatureDocumentUrl.split("/").pop()
                        : ""
                    }
                    uploading={uploadingField === "signatureDocumentUrl"}
                    onSelect={(file) => handleUpload("signatureDocumentUrl", file)}
                    onClear={() => setField("signatureDocumentUrl", "")}
                    error={errors.signatureDocumentUrl}
                  />
                </div>
              )}

              {/* Địa chỉ */}
              <PartnerAddressFields
                t={t}
                accent="emerald"
                value={{
                  province: form.province,
                  ward: form.ward,
                }}
                onChange={({ province, ward }) => {
                  setField("province", province ?? "");
                  setField("ward", ward ?? "");
                }}
                errors={errors}
              />

              <Field
                label={t("home.pr.s2.addressDetail")}
                required
                htmlFor="addressDetail"
                error={errors.addressDetail}
                hint={
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {t("home.pr.s2.addressDetailHint")}
                  </span>
                }
              >
                <TextInput
                  id="addressDetail"
                  limit={255}
                  value={form.addressDetail}
                  onChange={(e) => setField("addressDetail", e.target.value)}
                  placeholder={t("home.pr.s2.addressDetailPlaceholder")}
                  error={errors.addressDetail}
                />
              </Field>

              <Field
                label={t("home.pr.s2.businessScope")}
                required
                htmlFor="businessScope"
                error={errors.businessScope}
              >
                <TextArea
                  id="businessScope"
                  limit={1000}
                  rows={3}
                  value={form.businessScope}
                  onChange={(e) => setField("businessScope", e.target.value)}
                  placeholder={t("home.pr.s2.businessScopePlaceholder")}
                  error={errors.businessScope}
                  className="resize-none"
                />
              </Field>
            </section>
          )}

          {/* ── GIAI ĐOẠN 3 ── */}
          {step === 3 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {t("home.pr.s3.title")}
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {t("home.pr.s3.desc")}
                </p>
              </div>

              <Field
                label={t("home.pr.s3.bankName")}
                required
                htmlFor="bankName"
                error={errors.bankName}
              >
                <Select
                  id="bankName"
                  value={form.bankName}
                  onChange={(e) => setField("bankName", e.target.value)}
                  error={errors.bankName}
                >
                  <option value="">{t("home.pr.s3.bankPlaceholder")}</option>
                  {BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("home.pr.s3.bankAccount")}
                  required
                  htmlFor="bankAccountNumber"
                  error={errors.bankAccountNumber}
                >
                  <TextInput
                    id="bankAccountNumber"
                    limit={20} counter="never"
                    value={form.bankAccountNumber}
                    onChange={(e) => setField("bankAccountNumber", e.target.value)}
                    placeholder="0123456789"
                    error={errors.bankAccountNumber}
                    className="tabular-nums"
                  />
                </Field>
                <Field
                  label={t("home.pr.s3.bankHolder")}
                  required
                  htmlFor="bankAccountHolder"
                  error={errors.bankAccountHolder}
                >
                  <TextInput
                    id="bankAccountHolder"
                    limit={150}
                    value={form.bankAccountHolder}
                    onChange={(e) => setField("bankAccountHolder", e.target.value)}
                    placeholder="NGUYEN VAN A"
                    error={errors.bankAccountHolder}
                  />
                </Field>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <Landmark size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                <p className="text-xs leading-relaxed text-slate-600">
                  {t("home.pr.s3.bankNote")}
                </p>
              </div>
            </section>
          )}

          {/* ── GIAI ĐOẠN 4 ── */}
          {step === 4 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {t("home.pr.s4.title")}
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {t("home.pr.s4.desc")}
                </p>
              </div>

              {/* Tóm tắt */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("home.pr.s4.summaryTitle")}
                </p>
                <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {[
                    [t("home.pr.s4.summary.email"), form.email],
                    [t("home.pr.s4.summary.rep"), form.representativeName],
                    [t("home.pr.s4.summary.business"), form.businessName],
                    [
                      t("home.pr.s4.summary.type"),
                      selectedPartnerType ? t(selectedPartnerType.labelKey) : "—",
                    ],
                    [t("home.pr.s4.summary.taxCode"), form.taxCode],
                    [t("home.pr.s4.summary.bank"), form.bankName],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 border-b border-slate-200/70 py-1.5">
                      <dt className="shrink-0 text-[11px] font-semibold text-slate-500">{k}</dt>
                      <dd className="min-w-0 truncate text-xs font-bold text-slate-800">
                        {/* Rê chuột lên giá trị bị cắt để xem toàn bộ nội dung. */}
                        <Tooltip content={v || "—"} className="block">
                          <span className="block truncate">{v || "—"}</span>
                        </Tooltip>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Checkbox */}
              {[
                {
                  field: "confirmedAuthority",
                  label: t("home.pr.s4.confirmAuthority"),
                },
                {
                  field: "agreedPartnerTerms",
                  label: (
                    <>
                      {t("home.pr.s4.agreeTermsBefore")}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLegalDoc("terms");
                        }}
                        className="font-bold text-emerald-700 underline decoration-2 underline-offset-2 transition hover:text-emerald-900"
                      >
                        {t("home.pr.s4.agreeTermsLink")}
                      </button>
                      {t("home.pr.s4.agreeTermsAfter")}
                    </>
                  ),
                },
                {
                  field: "agreedPrivacyPolicy",
                  label: (
                    <>
                      {t("home.pr.s4.agreePrivacyBefore")}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLegalDoc("privacy");
                        }}
                        className="font-bold text-emerald-700 underline decoration-2 underline-offset-2 transition hover:text-emerald-900"
                      >
                        {t("home.pr.s4.agreePrivacyLink")}
                      </button>
                      {t("home.pr.s4.agreePrivacyAfter")}
                    </>
                  ),
                },
              ].map((c) => (
                <div key={c.field}>
                  <CheckRow
                    checked={form[c.field]}
                    onChange={(e) => setField(c.field, e.target.checked)}
                  >
                    {c.label}
                  </CheckRow>
                  {errors[c.field] && (
                    <p className="mt-1.5 flex items-start gap-1 text-[11px] font-semibold leading-relaxed text-rose-600">
                      <CircleAlert size={12} className="mt-px shrink-0" />
                      <span>{errors[c.field]}</span>
                    </p>
                  )}
                </div>
              ))}
            </section>
          )}

          </div>

          {/* ── Màn hình "đã gửi đơn" hiển thị tại chỗ (trước khi chuyển trang) ── */}
          {submitted && (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-100">
                <CheckCircle2 size={26} />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {t("home.pr.submitted.title")}
              </h2>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
                {t("home.pr.submitted.desc")}
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft size={15} /> {t("home.pr.submitted.backHome")}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-xs font-bold text-white transition hover:bg-emerald-800"
                >
                  {t("common.login")}
                </Link>
              </div>
            </div>
          )}

          {/* ── Thanh điều hướng — ghim đáy khung form, luôn nhìn thấy ── */}
          {!submitted && (
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button type="button" onClick={goBack} className={buttonCls("outline")}>
                  <ArrowLeft size={15} /> {t("home.pr.nav.back")}
                </button>
              )}
              {savingDraft && (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <Loader2 size={12} className="animate-spin" /> {t("home.pr.nav.savingDraft")}
                </span>
              )}
            </div>

            {step < 4 ? (
              <button type="button" onClick={goNext} className={buttonCls("primary")}>
                {t("home.pr.nav.next")} <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={buttonCls("success")}
              >
                {submitting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FileText size={15} />
                )}
                {submitting ? t("home.pr.nav.submitting") : t("home.pr.nav.submit")}
              </button>
            )}
          </div>
          )}
        </div>

        {/* Link hỗ trợ */}
        <p className="mt-2.5 shrink-0 text-center text-[11px] text-slate-400">
          {t("home.pr.footer.haveAccount")}{" "}
          <Link href="/login" className="font-bold text-emerald-700 underline">
            {t("common.login")}
          </Link>{" "}
          · {t("home.pr.footer.recoverPassword")}{" "}
          <Link href="/login" className="font-bold text-emerald-700 underline">
            {t("home.pr.footer.forgotPassword")}
          </Link>
        </p>
      </main>

      {/* Modal văn bản pháp lý — Điều khoản hợp tác & Chính sách bảo vệ dữ liệu cá nhân */}
      <LegalDocumentModal
        open={legalDoc === "terms"}
        title={partnerTermsDoc.title}
        sections={partnerTermsDoc.sections}
        onClose={() => setLegalDoc(null)}
      />
      <LegalDocumentModal
        open={legalDoc === "privacy"}
        title={privacyPolicyDoc.title}
        sections={privacyPolicyDoc.sections}
        onClose={() => setLegalDoc(null)}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex max-w-md items-center gap-2.5 rounded-2xl px-4 py-3 text-xs font-bold text-white shadow-xl ${
            toast.type === "error"
              ? "bg-rose-600"
              : toast.type === "info"
              ? "bg-slate-800"
              : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? (
            <CircleAlert size={16} className="shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
