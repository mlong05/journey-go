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
  Upload,
  UserRound,
  Wallet,
  X,
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
import {
  PARTNER_TERMS_SECTIONS,
  PARTNER_TERMS_TITLE,
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_TITLE,
} from "@/features/partnerapplication/constants/legalDocuments";
import { BANKS } from "@/constants/banks";

const STEPS = [
  { id: 1, label: "Thông tin người đại diện", icon: UserRound },
  { id: 2, label: "Hồ sơ doanh nghiệp", icon: Building2 },
  { id: 3, label: "Thiết lập thanh toán", icon: Wallet },
  { id: 4, label: "Xác nhận & đồng ý", icon: ShieldCheck },
];

const PARTNER_TYPES = [
  {
    value: "TRAVEL_AGENCY",
    label: "Công ty Lữ hành",
    hint: "Yêu cầu Giấy phép lữ hành Quốc tế/Nội địa.",
  },
  {
    value: "EXPERIENCE_PROVIDER",
    label: "Đơn vị cung cấp Trải nghiệm / Điểm đến",
    hint: "Yêu cầu GPKD / Hộ kinh doanh.",
  },
];

const POSITIONS = [
  { value: "OWNER", label: "Chủ doanh nghiệp" },
  { value: "DIRECTOR", label: "Giám đốc" },
  { value: "MANAGER", label: "Quản lý" },
  { value: "LEGAL_REPRESENTATIVE", label: "Người đại diện pháp luật" },
  { value: "AUTHORIZED_EMPLOYEE", label: "Nhân viên được ủy quyền" },
  { value: "OTHER", label: "Khác" },
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
  district: "",
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
function validateStep(step, form) {
  const errors = {};

  if (step === 1) {
    if (!form.email.trim()) errors.email = "Email không được để trống";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errors.email = "Email không hợp lệ";
    if (!form.phone.trim()) errors.phone = "Số điện thoại không được để trống";
    else if (!/^0\d{9,10}$/.test(form.phone.trim()))
      errors.phone = "Số điện thoại không hợp lệ (10-11 chữ số, bắt đầu bằng 0)";
    if (!form.representativeName.trim())
      errors.representativeName = "Họ tên người đại diện không được để trống";
    if (!form.representativePosition)
      errors.representativePosition = "Vui lòng chọn chức vụ";
  }

  if (step === 2) {
    if (!form.businessName.trim())
      errors.businessName = "Tên doanh nghiệp / cơ sở không được để trống";
    if (!form.partnerType) errors.partnerType = "Vui lòng chọn loại hình đối tác";
    if (!form.taxCode.trim()) errors.taxCode = "Mã số thuế không được để trống";
    else if (!/^\d{10}$/.test(form.taxCode.trim()))
      errors.taxCode = "Mã số thuế phải gồm đúng 10 chữ số";
    if (!form.businessRegistrationInfo.trim())
      errors.businessRegistrationInfo = "Thông tin đăng ký kinh doanh không được để trống";
    if (!form.operationLicenseUrl)
      errors.operationLicenseUrl = "Giấy phép hoạt động là bắt buộc";
    if (!form.businessRegistrationUrl)
      errors.businessRegistrationUrl = "Giấy đăng ký kinh doanh / GPKD là bắt buộc";
    if (form.partnerType === "TRAVEL_AGENCY") {
      if (!form.travelScope)
        errors.travelScope = "Vui lòng chọn Giấy phép lữ hành Quốc tế hoặc Nội địa";
      if (!form.travelLicenseUrl)
        errors.travelLicenseUrl = "Giấy phép lữ hành là bắt buộc với Công ty Lữ hành";
      if (!form.signatureDocumentUrl)
        errors.signatureDocumentUrl = "Giấy ký quỹ là bắt buộc với Công ty Lữ hành";
    }
    if (!form.province.trim()) errors.province = "Vui lòng chọn Tỉnh/Thành";
    if (!form.district.trim()) errors.district = "Vui lòng chọn Quận/Huyện";
    if (!form.ward.trim()) errors.ward = "Vui lòng chọn Phường/Xã";
    if (!form.addressDetail.trim())
      errors.addressDetail = "Địa chỉ trụ sở không được để trống";
    if (!form.businessScope.trim())
      errors.businessScope = "Phạm vi hoạt động không được để trống";
  }

  if (step === 3) {
    if (!form.bankName) errors.bankName = "Vui lòng chọn ngân hàng thụ hưởng";
    if (!form.bankAccountNumber.trim())
      errors.bankAccountNumber = "Số tài khoản không được để trống";
    else if (!/^[0-9A-Z]{6,20}$/.test(form.bankAccountNumber.trim()))
      errors.bankAccountNumber = "Số tài khoản không hợp lệ";
    if (!form.bankAccountHolder.trim())
      errors.bankAccountHolder = "Tên chủ tài khoản không được để trống";
  }

  if (step === 4) {
    if (!form.confirmedAuthority)
      errors.confirmedAuthority = "Vui lòng xác nhận thẩm quyền đại diện";
    if (!form.agreedPartnerTerms)
      errors.agreedPartnerTerms = "Vui lòng đồng ý với Điều khoản hợp tác";
    if (!form.agreedPrivacyPolicy)
      errors.agreedPrivacyPolicy = "Vui lòng đồng ý với Chính sách bảo vệ dữ liệu cá nhân";
  }

  return errors;
}

/** Kiểm tra hợp lệ toàn bộ 4 giai đoạn. */
function validateAll(form) {
  return [1, 2, 3, 4].reduce(
    (acc, step) => ({ ...acc, ...validateStep(step, form) }),
    {}
  );
}

export default function PartnerRegisterPage() {
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
  const [emailExists, setEmailExists] = useState(false);

  const dirtyRef = useRef(false);
  const lastSavedRef = useRef("");
  const hydratedRef = useRef(false);

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
      district: form.district.trim(),
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
        if (!silent) showToast("success", "Đã lưu nháp hồ sơ đăng ký đối tác.");
        return true;
      } catch (err) {
        if (!silent)
          showToast("error", err?.message || "Không thể lưu nháp hồ sơ.");
        return false;
      } finally {
        setSavingDraft(false);
      }
    },
    [buildPayload, form.email, showToast, verificationToken]
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
      setErrors((p) => ({ ...p, email: "Email không được để trống" }));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((p) => ({ ...p, email: "Email không hợp lệ" }));
      return;
    }

    setOtpLoading(true);
    setOtpError("");
    try {
      await sendOtp(email);
      setOtpSent(true);
      setOtpCode("");
      showToast("success", "Mã xác thực 6 chữ số đã được gửi tới email của bạn.");
    } catch (err) {
      setOtpError(err?.message || "Không thể gửi mã xác thực. Vui lòng thử lại.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setOtpError("Mã OTP phải gồm đúng 6 chữ số.");
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
        showToast(
          "info",
          "Xác thực thành công. Email của bạn đã có tài khoản trên hệ thống. " +
            "Hệ thống đã tự động chuyển bạn sang màn hình Đăng nhập/Khôi phục mật khẩu."
        );
        setTimeout(() => router.push("/login"), 3500);
      } else {
        showToast("success", "Xác thực thành công. Vui lòng tiếp tục điền thông tin doanh nghiệp.");
      }
    } catch (err) {
      setOtpError(err?.message || "Mã xác thực không đúng hoặc đã hết hạn.");
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Upload giấy tờ ────────────────────────────────────────────────────────
  const handleUpload = async (field, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("error", "Dung lượng tệp tối đa cho phép là 10MB.");
      return;
    }
    if (!verificationToken) {
      showToast("error", "Vui lòng xác minh email bằng mã OTP trước khi tải lên giấy tờ.");
      return;
    }
    setUploadingField(field);
    try {
      const url = await uploadDocument(file, form.email.trim(), verificationToken);
      if (!url) throw new Error("Máy chủ không trả về đường dẫn tệp.");
      setField(field, url);
      showToast("success", "Đã tải lên giấy tờ thành công.");
    } catch (err) {
      showToast("error", err?.message || "Không thể tải lên tệp. Vui lòng thử lại.");
    } finally {
      setUploadingField("");
    }
  };

  // ── Điều hướng giữa các giai đoạn ─────────────────────────────────────────
  const goNext = async () => {
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors((p) => ({ ...p, ...stepErrors }));
      showToast("error", "Vui lòng hoàn thiện các trường bắt buộc ở giai đoạn này.");
      return;
    }
    if (step === 1 && !verificationToken) {
      setOtpError("Vui lòng xác minh email trước khi tiếp tục.");
      showToast("error", "Vui lòng xác minh email bằng mã OTP trước khi tiếp tục.");
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
    const allErrors = validateAll(form);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstStep = [1, 2, 3, 4].find((s) => Object.keys(validateStep(s, form)).length > 0);
      if (firstStep) setStep(firstStep);
      showToast("error", "Hồ sơ chưa đầy đủ. Vui lòng kiểm tra lại các trường được đánh dấu.");
      return;
    }
    if (!verificationToken) {
      setStep(1);
      showToast("error", "Email chưa được xác minh. Vui lòng xác minh lại.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitApplication(buildPayload());
      dirtyRef.current = false;
      setSubmitted(true);
      showToast("success", "Đã gửi đơn đăng ký đối tác. Hồ sơ đang chờ quản trị viên xét duyệt.");
      setTimeout(() => router.push("/partner-register/success"), 2500);
      return result;
    } catch (err) {
      showToast("error", err?.message || "Không thể gửi đơn. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const fieldClass = (field) =>
    `w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm text-slate-800 outline-none transition focus:ring-4 ${
      errors[field]
        ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
        : "border-slate-200 focus:border-teal-400 focus:ring-teal-100"
    }`;

  const Label = ({ children, required, htmlFor }) => (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-bold text-slate-700"
    >
      {children}
      {required && <span className="text-rose-500"> *</span>}
    </label>
  );

  const FieldError = ({ field }) =>
    errors[field] ? (
      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
        <CircleAlert size={12} /> {errors[field]}
      </p>
    ) : null;

  const DocumentField = ({ field, label, required }) => (
    <div>
      <Label required={required}>{label}</Label>
      {form[field] ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <a
            href={form[field]}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-xs font-semibold text-emerald-800 underline"
          >
            {form[field].split("/").pop()}
          </a>
          <button
            type="button"
            onClick={() => setField(field, "")}
            className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            aria-label="Xoá tệp"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label
          className={`flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 transition ${
            uploadingField === field
              ? "border-teal-400 bg-teal-50/60"
              : "border-slate-300 bg-slate-50/60 hover:border-teal-400 hover:bg-teal-50/40"
          }`}
        >
          {uploadingField === field ? (
            <Loader2 size={16} className="shrink-0 animate-spin text-teal-600" />
          ) : (
            <Upload size={16} className="shrink-0 text-teal-600" />
          )}
          <span className="text-xs font-semibold text-slate-600">
            {uploadingField === field
              ? "Đang tải lên…"
              : "Tải lên tệp (PNG, JPG, PDF)"}
          </span>
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            disabled={uploadingField === field}
            onChange={(e) => handleUpload(field, e.target.files?.[0])}
          />
        </label>
      )}
      <FieldError field={field} />
    </div>
  );

  const stepProgress = useMemo(() => ((step - 1) / 3) * 100, [step]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <ArrowLeft size={16} className="text-slate-400" />
            Về trang chủ
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
            Đăng ký đối tác
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col justify-center gap-4 px-4 py-4 sm:px-6">
        {/* Hero — thu gọn để mọi thứ vừa một màn hình */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-600/20">
            <Landmark size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Trở thành đối tác của JourneyGo
            </h1>
            <p className="mt-0.5 truncate text-xs leading-relaxed text-slate-500">
              Đồng hành cùng chúng tôi — đưa những giá trị lịch sử, văn hóa truyền thống đến gần
              hơn với du khách thông qua các trải nghiệm thực tế.
            </p>
          </div>
        </div>

        {/* Thanh tiến trình */}
        <div className="shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
          <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 transition-all duration-500"
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
                        ? "bg-teal-600 text-white ring-4 ring-teal-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isDone ? <Check size={15} /> : <Icon size={15} />}
                  </span>
                  <span
                    className={`hidden text-[11px] font-bold leading-tight sm:block ${
                      isActive ? "text-teal-700" : isDone ? "text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Thẻ form — chiều cao bám theo nội dung, tự co lại + cuộn nội bộ khi nội dung dài,
            trang ngoài không bao giờ bị scroll */}
        <div className="flex min-h-0 max-h-full shrink flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Vùng nội dung: cuộn nội bộ khi dài, co gọn khi ngắn */}
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
                  Giai đoạn 1 — Thông tin người đại diện
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Email phải được xác minh bằng mã OTP 6 chữ số trước khi tiếp tục.
                </p>
              </div>

              {/* Email + OTP */}
              <div>
                <Label required htmlFor="email">
                  Email
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      disabled={otpSent}
                      placeholder="doanhnghiep@example.com"
                      className={fieldClass("email")}
                    />
                    <FieldError field="email" />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading || otpSent}
                    className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-xs font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
                  >
                    {otpLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Mail size={15} />
                    )}
                    {otpSent ? "Đã gửi mã" : "Gửi mã OTP"}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
                  <Label required htmlFor="otp">
                    Mã xác thực 6 chữ số
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="otp"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className={`${fieldClass("otp")} flex-1 tracking-[0.5em] text-center font-mono text-lg`}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpLoading}
                      className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {otpLoading ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={15} />
                      )}
                      Xác minh
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Mã có hiệu lực 5 phút. Tối đa 3 lần gửi / ngày · 5 lần nhập sai. Mã mới sẽ
                    làm mã cũ mất hiệu lực.
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
                  Email đã được xác minh thành công.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label required htmlFor="phone">
                    Số điện thoại
                  </Label>
                  <div className="relative">
                    <Phone
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      placeholder="0901234567"
                      className={`${fieldClass("phone")} pl-10`}
                    />
                  </div>
                  <FieldError field="phone" />
                </div>

                <div>
                  <Label required htmlFor="representativeName">
                    Họ tên người đại diện
                  </Label>
                  <input
                    id="representativeName"
                    value={form.representativeName}
                    onChange={(e) => setField("representativeName", e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className={fieldClass("representativeName")}
                  />
                  <FieldError field="representativeName" />
                </div>
              </div>

              <div>
                <Label required htmlFor="representativePosition">
                  Chức vụ
                </Label>
                <select
                  id="representativePosition"
                  value={form.representativePosition}
                  onChange={(e) => setField("representativePosition", e.target.value)}
                  className={fieldClass("representativePosition")}
                >
                  <option value="">-- Chọn chức vụ --</option>
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <FieldError field="representativePosition" />
              </div>
            </section>
          )}

          {/* ── GIAI ĐOẠN 2 ── */}
          {step === 2 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Giai đoạn 2 — Xác minh hồ sơ doanh nghiệp
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Tài liệu bắt buộc sẽ thay đổi theo loại hình đối tác bạn chọn.
                </p>
              </div>

              <div>
                <Label required htmlFor="businessName">
                  Tên doanh nghiệp / cơ sở
                </Label>
                <input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => setField("businessName", e.target.value)}
                  placeholder="Công ty TNHH Du lịch & Nghỉ dưỡng ABC"
                  className={fieldClass("businessName")}
                />
                <FieldError field="businessName" />
              </div>

              <div>
                <Label required htmlFor="partnerType">
                  Loại hình đối tác
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PARTNER_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setField("partnerType", t.value)}
                      className={`rounded-xl border p-4 text-left transition ${
                        form.partnerType === t.value
                          ? "border-teal-500 bg-teal-50/60 ring-2 ring-teal-200"
                          : "border-slate-200 bg-white hover:border-teal-300"
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-900">{t.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t.hint}</p>
                    </button>
                  ))}
                </div>
                <FieldError field="partnerType" />
              </div>

              {form.partnerType === "TRAVEL_AGENCY" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <Label required htmlFor="travelScope">
                    Loại giấy phép lữ hành
                  </Label>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { value: "INTERNATIONAL", label: "Quốc tế" },
                      { value: "DOMESTIC", label: "Nội địa" },
                    ].map((s) => (
                      <label
                        key={s.value}
                        className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={form.travelScope === s.value}
                          onChange={() =>
                            setField(
                              "travelScope",
                              form.travelScope === s.value ? "" : s.value
                            )
                          }
                          className="h-4 w-4 accent-teal-600"
                        />
                        Giấy phép lữ hành {s.label}
                      </label>
                    ))}
                  </div>
                  <FieldError field="travelScope" />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label required htmlFor="taxCode">
                    Mã số thuế
                  </Label>
                  <input
                    id="taxCode"
                    value={form.taxCode}
                    onChange={(e) => setField("taxCode", e.target.value)}
                    placeholder="0101234567"
                    className={fieldClass("taxCode")}
                  />
                  <FieldError field="taxCode" />
                </div>
                <div>
                  <Label required htmlFor="businessRegistrationInfo">
                    Thông tin đăng ký kinh doanh
                  </Label>
                  <input
                    id="businessRegistrationInfo"
                    value={form.businessRegistrationInfo}
                    onChange={(e) => setField("businessRegistrationInfo", e.target.value)}
                    placeholder="Số GPKD / hộ kinh doanh, ngày cấp..."
                    className={fieldClass("businessRegistrationInfo")}
                  />
                  <FieldError field="businessRegistrationInfo" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <DocumentField
                  field="operationLicenseUrl"
                  label="Giấy phép hoạt động"
                  required
                />
                <DocumentField
                  field="businessRegistrationUrl"
                  label="Giấy đăng ký kinh doanh / GPKD / Hộ kinh doanh"
                  required
                />
              </div>

              {form.partnerType === "TRAVEL_AGENCY" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <DocumentField field="travelLicenseUrl" label="Giấy phép lữ hành" required />
                  <DocumentField field="signatureDocumentUrl" label="Giấy ký quỹ" required />
                </div>
              )}

              {/* Địa chỉ */}
              <PartnerAddressFields
                value={{
                  province: form.province,
                  district: form.district,
                  ward: form.ward,
                }}
                onChange={({ province, district, ward }) => {
                  setField("province", province ?? "");
                  setField("district", district ?? "");
                  setField("ward", ward ?? "");
                }}
                errors={errors}
              />

              <div>
                <Label required htmlFor="addressDetail">
                  Chi tiết địa chỉ trụ sở
                </Label>
                <input
                  id="addressDetail"
                  value={form.addressDetail}
                  onChange={(e) => setField("addressDetail", e.target.value)}
                  placeholder="Số nhà, tên đường, tòa nhà..."
                  className={fieldClass("addressDetail")}
                />
                <FieldError field="addressDetail" />
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                  <MapPin size={11} /> Địa chỉ gồm 3 cấp hành chính và chi tiết trụ sở.
                </p>
              </div>

              <div>
                <Label required htmlFor="businessScope">
                  Phạm vi hoạt động
                </Label>
                <textarea
                  id="businessScope"
                  rows={3}
                  value={form.businessScope}
                  onChange={(e) => setField("businessScope", e.target.value)}
                  placeholder="Mô tả phạm vi hoạt động, loại hình trải nghiệm / tuyến tour cung cấp..."
                  className={`${fieldClass("businessScope")} resize-none`}
                />
                <FieldError field="businessScope" />
              </div>
            </section>
          )}

          {/* ── GIAI ĐOẠN 3 ── */}
          {step === 3 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Giai đoạn 3 — Thiết lập thanh toán
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Thông tin tài khoản nhận hoàn tiền từ nền tảng.
                </p>
              </div>

              <div>
                <Label required htmlFor="bankName">
                  Ngân hàng thụ hưởng
                </Label>
                <select
                  id="bankName"
                  value={form.bankName}
                  onChange={(e) => setField("bankName", e.target.value)}
                  className={fieldClass("bankName")}
                >
                  <option value="">-- Chọn ngân hàng --</option>
                  {BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <FieldError field="bankName" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label required htmlFor="bankAccountNumber">
                    Số tài khoản
                  </Label>
                  <input
                    id="bankAccountNumber"
                    value={form.bankAccountNumber}
                    onChange={(e) => setField("bankAccountNumber", e.target.value)}
                    placeholder="0123456789"
                    className={fieldClass("bankAccountNumber")}
                  />
                  <FieldError field="bankAccountNumber" />
                </div>
                <div>
                  <Label required htmlFor="bankAccountHolder">
                    Tên chủ tài khoản
                  </Label>
                  <input
                    id="bankAccountHolder"
                    value={form.bankAccountHolder}
                    onChange={(e) => setField("bankAccountHolder", e.target.value)}
                    placeholder="NGUYEN VAN A"
                    className={fieldClass("bankAccountHolder")}
                  />
                  <FieldError field="bankAccountHolder" />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <Landmark size={18} className="mt-0.5 shrink-0 text-teal-600" />
                <p className="text-xs leading-relaxed text-slate-600">
                  Thông tin tài khoản ngân hàng sẽ được dùng để chuyển khoản doanh thu khi
                  nền tảng tất toán. Bạn có thể cập nhật lại trong Dashboard Đối tác sau khi
                  được duyệt.
                </p>
              </div>
            </section>
          )}

          {/* ── GIAI ĐOẠN 4 ── */}
          {step === 4 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Giai đoạn 4 — Xác nhận và đồng ý
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Vui lòng kiểm tra lại thông tin trước khi gửi đơn.
                </p>
              </div>

              {/* Tóm tắt */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tóm tắt hồ sơ
                </p>
                <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {[
                    ["Email", form.email],
                    ["Người đại diện", form.representativeName],
                    ["Doanh nghiệp", form.businessName],
                    [
                      "Loại hình",
                      PARTNER_TYPES.find((t) => t.value === form.partnerType)?.label || "—",
                    ],
                    ["Mã số thuế", form.taxCode],
                    ["Ngân hàng", form.bankName],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 border-b border-slate-200/70 py-1.5">
                      <dt className="shrink-0 text-[11px] font-semibold text-slate-500">{k}</dt>
                      <dd className="min-w-0 truncate text-xs font-bold text-slate-800">
                        {v || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Checkbox */}
              {[
                {
                  field: "confirmedAuthority",
                  label:
                    "Tôi xác nhận mình có thẩm quyền đại diện cho doanh nghiệp/cơ sở kinh doanh và các thông tin, tài liệu cung cấp là chính xác, hợp pháp.",
                },
                {
                  field: "agreedPartnerTerms",
                  label: (
                    <>
                      Tôi đã đọc, hiểu và đồng ý với{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLegalDoc("terms");
                        }}
                        className="font-bold text-teal-700 underline decoration-2 underline-offset-2 transition hover:text-teal-900"
                      >
                        Điều khoản hợp tác Đối tác của JourneyGo
                      </button>
                      .
                    </>
                  ),
                },
                {
                  field: "agreedPrivacyPolicy",
                  label: (
                    <>
                      Tôi đã được thông báo về loại dữ liệu cá nhân được thu thập, mục đích xử lý, đơn vị xử lý và quyền của mình; đồng ý cho JourneyGo xử lý dữ liệu cá nhân theo{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLegalDoc("privacy");
                        }}
                        className="font-bold text-teal-700 underline decoration-2 underline-offset-2 transition hover:text-teal-900"
                      >
                        Chính sách bảo vệ dữ liệu cá nhân
                      </button>
                      .
                    </>
                  ),
                },
              ].map((c) => (
                <div key={c.field}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-300">
                    <input
                      type="checkbox"
                      checked={form[c.field]}
                      onChange={(e) => setField(c.field, e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600"
                    />
                    <span className="text-xs leading-relaxed text-slate-700">{c.label}</span>
                  </label>
                  <FieldError field={c.field} />
                </div>
              ))}
            </section>
          )}

          </div>

          {/* ── Màn hình "đã gửi đơn" hiển thị tại chỗ (trước khi chuyển trang) ── */}
          {submitted && (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-100">
                <CheckCircle2 size={26} />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Đã gửi đơn đăng ký đối tác
              </h2>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
                Hồ sơ của bạn đang chờ quản trị viên xét duyệt. Chúng tôi sẽ gửi email thông báo
                kết quả ngay khi có quyết định.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft size={15} /> Về trang chủ
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-teal-700"
                >
                  Đăng nhập
                </Link>
              </div>
            </div>
          )}

          {/* ── Thanh điều hướng — ghim đáy, luôn nhìn thấy ── */}
          {!submitted && (
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft size={15} /> Quay lại
                </button>
              )}
              {savingDraft && (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <Loader2 size={12} className="animate-spin" /> Đang lưu nháp…
                </span>
              )}
            </div>

            {step < 4 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700"
              >
                Tiếp tục <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FileText size={15} />
                )}
                {submitting ? "Đang gửi đơn…" : "Gửi đơn đăng ký"}
              </button>
            )}
          </div>
          )}
        </div>

        {/* Link hỗ trợ */}
        <p className="shrink-0 text-center text-[11px] text-slate-400">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-bold text-teal-700 underline">
            Đăng nhập
          </Link>{" "}
          · Khôi phục mật khẩu?{" "}
          <Link href="/login" className="font-bold text-teal-700 underline">
            Quên mật khẩu
          </Link>
        </p>
      </main>

      {/* Modal văn bản pháp lý — Điều khoản hợp tác & Chính sách bảo vệ dữ liệu cá nhân */}
      <LegalDocumentModal
        open={legalDoc === "terms"}
        title={PARTNER_TERMS_TITLE}
        sections={PARTNER_TERMS_SECTIONS}
        onClose={() => setLegalDoc(null)}
      />
      <LegalDocumentModal
        open={legalDoc === "privacy"}
        title={PRIVACY_POLICY_TITLE}
        sections={PRIVACY_POLICY_SECTIONS}
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
