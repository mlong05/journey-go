"use client";
/* eslint-disable @next/next/no-img-element -- ảnh Wikimedia Commons (đã ghi nguồn ở cuối trang) */

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, BookOpenText, Building2, CheckCircle2, ChevronDown, FileSpreadsheet, FileText, LayoutDashboard,
  LogIn, QrCode, Store, Wallet, Info,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import { useTouristSession } from "../hooks/useTouristSession";
import { useT } from "@/i18n";

const TRUST_KEYS = ["home.partner.trust.1", "home.partner.trust.2", "home.partner.trust.3"];

/**
 * Ảnh có nguồn rõ ràng (xem thêm public/image/CREDITS.md):
 *  • Khuê Văn Các · Daderot · CC0; Đèn lồng Hội An · Mig Gilbert · CC BY-SA 2.0; Thuyền Tràng An · Jakub Hałun · CC BY 4.0
 *  • Gốm Bát Tràng · Greenknight dv · CC BY-SA 4.0; Chùa Cầu Hội An · Steffen Schmitz · CC BY-SA 4.0 (Wikimedia Commons)
 */
const IMG = {
  batTrang: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG",
  chuaCau: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-02.jpg/960px-H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-02.jpg",
};

/** Khớp với điều kiện của biểu mẫu đăng ký (giai đoạn 2). */
const PARTNER_TYPES = [
  {
    id: "agency",
    icon: Building2, image: "/image/trangan-boats.jpg", local: true,
    titleKey: "home.partner.type.agency.title",
    descKey: "home.partner.type.agency.desc",
    docKeys: [
      "home.partner.type.agency.doc1",
      "home.partner.type.agency.doc2",
      "home.partner.type.agency.doc3",
      "home.partner.type.agency.doc4",
    ],
  },
  {
    id: "experience",
    icon: Store, image: IMG.batTrang,
    titleKey: "home.partner.type.experience.title",
    descKey: "home.partner.type.experience.desc",
    docKeys: [
      "home.partner.type.experience.doc1",
      "home.partner.type.experience.doc2",
    ],
  },
];
const COMMON_REQ_KEYS = [
  "home.partner.commonReq.1",
  "home.partner.commonReq.2",
  "home.partner.commonReq.3",
];

const BENEFITS = [
  [BookOpenText, "home.partner.benefit.1.title", "home.partner.benefit.1.text"],
  [QrCode, "home.partner.benefit.2.title", "home.partner.benefit.2.text"],
  [FileSpreadsheet, "home.partner.benefit.3.title", "home.partner.benefit.3.text"],
  [Wallet, "home.partner.benefit.4.title", "home.partner.benefit.4.text"],
];

/** Cùng 4 bước với khối "Mở tour trải nghiệm" ở trang chủ. */
const PROCESS = [
  ["home.partner.process.1.title", "home.partner.process.1.text"],
  ["home.partner.process.2.title", "home.partner.process.2.text"],
  ["home.partner.process.3.title", "home.partner.process.3.text"],
  ["home.partner.process.4.title", "home.partner.process.4.text"],
];

const FAQ = [
  ["home.partner.faq.1.q", "home.partner.faq.1.a"],
  ["home.partner.faq.2.q", "home.partner.faq.2.a"],
  ["home.partner.faq.3.q", "home.partner.faq.3.a"],
  ["home.partner.faq.4.q", "home.partner.faq.4.a"],
  ["home.partner.faq.5.q", "home.partner.faq.5.a"],
  ["home.partner.faq.6.q", "home.partner.faq.6.a"],
  ["home.partner.faq.7.q", "home.partner.faq.7.a"],
  ["home.partner.faq.8.q", "home.partner.faq.8.a"],
];

/**
 * Nút chính theo vai trò người xem:
 *  • chưa đăng nhập / du khách → Đăng ký đối tác
 *  • đối tác đã đăng nhập      → Vào trang đối tác
 *  • admin / kiểm duyệt viên   → không hiện nút đăng ký
 */
function useCta() {
  const t = useT();
  const { ready, role, isStaff } = useTouristSession();
  if (!ready) return { kind: "loading" };
  if (role === "content_provider") return { kind: "provider", href: ROUTES.PROVIDER, label: t("home.partner.cta.dashboard"), Icon: LayoutDashboard };
  if (isStaff) return { kind: "staff" };
  return { kind: "register", href: ROUTES.PARTNER_REGISTER, label: t("home.partner.cta.register"), Icon: ArrowRight };
}

function CtaButton({ tone = "orange", size = "md", className = "" }) {
  const cta = useCta();
  if (cta.kind === "loading") return <span className={`inline-block h-12 w-48 ${className}`} aria-hidden="true" />;
  if (cta.kind === "staff") return null;
  const cls = tone === "orange" ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-white text-teal-900 hover:bg-teal-50";
  const sz = size === "sm" ? "h-9 px-4 text-sm" : "h-12 px-6 text-[15px]";
  return (
    <Link href={cta.href} className={`group inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors ${sz} ${cls} ${className}`}>
      {cta.label}<cta.Icon size={16} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
    </Link>
  );
}

function SectionHead({ eyebrow, title, description, children }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-orange-600">{eyebrow}</p>
        <h2 className="mt-1 text-[26px] font-extrabold tracking-tight text-slate-900 text-balance sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Hero() {
  const t = useT();
  const cta = useCta();
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(160deg,#0b5d56_0%,#0f766e_60%,#138a7f_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_380px_at_90%_-10%,rgba(234,106,18,0.25),transparent_60%)]" />
      <div className="relative mx-auto grid max-w-page items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-teal-50">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-300" />{t("home.partner.hero.badge")}
          </p>
          <h1 className="mt-5 max-w-[18ch] text-[clamp(30px,4vw,46px)] font-extrabold leading-[1.1] tracking-tight text-balance">
            {t("home.partner.hero.title")}
          </h1>
          <p className="mt-4 max-w-xl text-teal-50/85">
            {t("home.partner.hero.desc")}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <CtaButton />
            <a href="#quy-trinh" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 text-[15px] font-bold text-white hover:bg-white/20">{t("home.partner.hero.viewProcess")}</a>
          </div>
          {cta.kind === "register" && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-teal-50/75"><Info size={13} className="mt-px shrink-0" />{t("home.partner.hero.emailNote")}</p>
          )}
          {cta.kind === "staff" && (
            <p className="mt-3 text-sm text-teal-50/80">{t("home.partner.hero.staffNote")}</p>
          )}
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-teal-50/85">
            {TRUST_KEYS.map((key) => <li key={key} className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-orange-300" />{t(key)}</li>)}
          </ul>
        </div>
        <div className="relative mx-auto hidden w-full max-w-md sm:block lg:max-w-none">
          <div className="grid grid-cols-[1.25fr_1fr] gap-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border-4 border-white/90 shadow-2xl">
              <Image src="/image/vanmieu-khuevancac.jpg" alt={t("home.partner.hero.altVanMieu")} fill priority sizes="(min-width: 1024px) 24vw, 50vw" className="object-cover" />
            </div>
            <div className="relative mt-12 aspect-[3/4] overflow-hidden rounded-3xl border-4 border-white/90 shadow-2xl">
              <Image src="/image/hoian-lanterns.jpg" alt={t("home.partner.hero.altHoiAn")} fill sizes="(min-width: 1024px) 18vw, 40vw" className="object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PartnerTypes() {
  const t = useT();
  return (
    <section id="doi-tuong" className="scroll-mt-32 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow={t("home.partner.types.eyebrow")} title={t("home.partner.types.title")} description={t("home.partner.types.desc")} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {PARTNER_TYPES.map((type) => (
            <article key={type.id} className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="relative h-48 bg-slate-100 sm:h-56">
                {type.local
                  ? <Image src={type.image} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
                  : <img src={type.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                <div className="absolute inset-x-5 bottom-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-teal-700"><type.icon size={20} /></span>
                  <h3 className="min-w-0 text-lg font-bold leading-snug text-white sm:text-xl">{t(type.titleKey)}</h3>
                </div>
              </div>
              <div className="flex-1 p-6">
                <p className="text-[15px] leading-relaxed text-slate-600">{t(type.descKey)}</p>
                <p className="mt-5 text-sm font-bold text-slate-900">{t("home.partner.types.docsTitle")}</p>
                <ul className="mt-3 space-y-2.5">
                  {type.docKeys.map((docKey) => (
                    <li key={docKey} className="flex items-start gap-2.5 text-[15px] text-slate-700"><FileText size={17} className="mt-0.5 shrink-0 text-teal-600" />{t(docKey)}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-5 md:flex-row md:items-center md:gap-8">
          <p className="shrink-0 text-sm font-bold text-teal-900">{t("home.partner.types.commonTitle")}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {COMMON_REQ_KEYS.map((key) => <li key={key} className="inline-flex items-center gap-2 text-[15px] text-slate-700"><CheckCircle2 size={16} className="text-teal-600" />{t(key)}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const t = useT();
  return (
    <section id="quyen-loi" className="scroll-mt-32 bg-[#f4f7f6] py-16 sm:py-20">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow={t("home.partner.benefits.eyebrow")} title={t("home.partner.benefits.title")} description={t("home.partner.benefits.desc")} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative min-h-[320px] overflow-hidden rounded-3xl bg-teal-900">
            <img src={IMG.chuaCau} alt={t("home.partner.benefits.altChuaCau")} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-teal-950/85 via-teal-950/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <p className="text-sm font-semibold text-teal-100">{t("home.partner.benefits.captionTitle")}</p>
              <p className="mt-2 max-w-md text-xl font-bold leading-snug text-white text-balance sm:text-2xl">{t("home.partner.benefits.captionText")}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {BENEFITS.map(([Icon, titleKey, textKey]) => (
              <div key={titleKey} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-600"><Icon size={21} /></span>
                <h3 className="mt-4 font-bold leading-snug text-slate-900">{t(titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{t(textKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Process() {
  const t = useT();
  return (
    <section id="quy-trinh" className="scroll-mt-32 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-8">
        <SectionHead eyebrow={t("home.partner.process.eyebrow")} title={t("home.partner.process.title")} description={t("home.partner.process.desc")}>
          <CtaButton />
        </SectionHead>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map(([titleKey, textKey], i) => (
            <li key={titleKey} className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-600 font-extrabold tabular-nums text-white">{i + 1}</span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{t(titleKey)}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{t(textKey)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Faq() {
  const t = useT();
  return (
    <section id="hoi-dap" className="scroll-mt-32 bg-[#f4f7f6] py-16 sm:py-20">
      <div className="mx-auto grid max-w-page grid-cols-1 gap-8 px-4 sm:px-6 lg:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHead eyebrow={t("home.partner.faq.eyebrow")} title={t("home.partner.faq.title")} description={t("home.partner.faq.desc")} />
        <div className="min-w-0 space-y-3">
          {FAQ.map(([qKey, aKey]) => (
            <details key={qKey} className="group rounded-2xl border border-slate-200 bg-white px-5 open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                {t(qKey)}<ChevronDown size={18} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="-mt-1 pb-5 text-[15px] leading-relaxed text-slate-600">{t(aKey)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const t = useT();
  const cta = useCta();
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[linear-gradient(160deg,#0b5d56_0%,#0f766e_70%)] px-6 py-14 text-center text-white sm:px-12">
          <h2 className="mx-auto max-w-2xl text-[28px] font-extrabold leading-tight tracking-tight text-balance sm:text-4xl">{t("home.partner.final.title")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-teal-50/85">{t("home.partner.final.desc")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CtaButton tone="light" />
            {cta.kind === "register" && (
              <Link href={ROUTES.LOGIN} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 text-[15px] font-bold text-white hover:bg-white/20">
                <LogIn size={16} />{t("home.partner.final.alreadyPartner")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Trang /partner-program — giới thiệu chương trình đối tác, dùng chung khung với trang du khách. */
export default function PartnerProgramScreen() {
  return (
    <TouristShell>
      <Hero />
      <PartnerTypes />
      <Benefits />
      <Process />
      <Faq />
      <FinalCta />
    </TouristShell>
  );
}
