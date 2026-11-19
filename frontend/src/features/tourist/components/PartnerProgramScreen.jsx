"use client";
/* eslint-disable @next/next/no-img-element -- ảnh Wikimedia Commons (đã ghi nguồn ở cuối trang) */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, BookOpenText, Building2, CheckCircle2, ChevronDown, FileSpreadsheet, FileText, LayoutDashboard,
  LogIn, QrCode, ShieldCheck, Store, Wallet, Clock, Footprints, Info,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import { touristService } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";
import { durationLabel } from "../utils";

const TRUST = ["Miễn phí đăng ký", "Xét duyệt trong 1–3 ngày làm việc", "Không ràng buộc doanh thu"];

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
    icon: Building2, image: "/image/trangan-boats.jpg", local: true, title: "Công ty lữ hành",
    description: "Doanh nghiệp đã có giấy phép kinh doanh lữ hành, muốn đưa tour trải nghiệm văn hóa lên JourneyGo.",
    documents: ["Giấy phép kinh doanh lữ hành (quốc tế hoặc nội địa)", "Giấy xác nhận ký quỹ lữ hành", "Giấy chứng nhận đăng ký kinh doanh", "Giấy phép hoạt động"],
  },
  {
    icon: Store, image: IMG.batTrang, title: "Đơn vị trải nghiệm / điểm đến",
    description: "Làng nghề, nghệ nhân, homestay, bảo tàng, hộ kinh doanh… tổ chức hoạt động trải nghiệm tại địa phương.",
    documents: ["Giấy chứng nhận đăng ký kinh doanh hoặc đăng ký hộ kinh doanh", "Giấy phép hoạt động"],
  },
];
const COMMON_REQUIREMENTS = ["Email doanh nghiệp (xác minh bằng mã OTP)", "Mã số thuế 10 chữ số", "Tài khoản ngân hàng nhận doanh thu"];

const BENEFITS = [
  [BookOpenText, "Kể câu chuyện văn hóa, không chỉ bán vé", "Mỗi điểm dừng có nội dung văn hóa, cổ vật kèm ảnh và video. Câu chuyện mở khi khách đến nơi, giúp chuyến đi có chiều sâu hơn."],
  [QrCode, "Khách tương tác ngay tại điểm đến", "Quiz trắc nghiệm, hoạt động thực tế xác nhận bằng mã QR và vị trí GPS, kèm điểm thưởng trên ứng dụng JourneyGo."],
  [FileSpreadsheet, "Tạo tour nhanh, tự lưu nháp", "Tạo tour theo 5 bước có hướng dẫn, hoặc nhập cả tour từ file Excel mẫu. Giá vé và lịch khởi hành sửa được cả khi tour đang bán."],
  [Wallet, "Doanh thu và đối soát minh bạch", "Theo dõi đơn đặt, doanh thu, các kỳ đối soát và số dư ví ngay trên trang đối tác. Tiền được chuyển về tài khoản bạn đã đăng ký."],
];

/** Cùng 4 bước với khối "Mở tour trải nghiệm" ở trang chủ. */
const PROCESS = [
  ["Gửi hồ sơ đăng ký", "Điền 4 phần: người đại diện, hồ sơ doanh nghiệp, tài khoản nhận tiền và xác nhận điều khoản. Hồ sơ tự lưu nháp sau khi xác minh email."],
  ["Admin xét duyệt", "Đội ngũ quản trị kiểm tra trong 1–3 ngày làm việc. Nếu cần bổ sung, bạn nhận email nêu rõ lý do và có thể sửa rồi gửi lại."],
  ["Tạo tour 5 bước", "Khi hồ sơ được duyệt, bạn nhận email đặt mật khẩu, đăng nhập trang đối tác và tạo tour: thông tin, giá vé, điểm đến, lịch trình, lịch khởi hành."],
  ["Mở bán và nhận khách", "Mỗi tour được kiểm duyệt nội dung theo 5 tiêu chí trước khi mở bán. Tour được duyệt hiện trên web và trong app du khách."],
];

const FAQ = [
  ["Đăng ký làm đối tác có mất phí không?", "Không. Việc đăng ký và sử dụng trang đối tác hoàn toàn miễn phí, không ràng buộc doanh thu tối thiểu. JourneyGo thu hoa hồng trên mỗi đơn đặt thành công theo chính sách hoa hồng áp dụng cho đối tác."],
  ["Bao lâu thì tôi biết kết quả xét duyệt?", "Thông thường trong 1–3 ngày làm việc. Kết quả được gửi về email bạn đã xác minh khi đăng ký."],
  ["Tôi là hộ kinh doanh hoặc nghệ nhân, có đăng ký được không?", "Được. Hãy chọn loại hình \"Đơn vị trải nghiệm / điểm đến\" và tải lên giấy đăng ký hộ kinh doanh cùng giấy phép hoạt động."],
  ["Tôi đã có tài khoản du khách, có dùng để làm đối tác được không?", "Không. Tài khoản đối tác được tạo sau khi hồ sơ được duyệt và dùng email doanh nghiệp riêng. Bạn vẫn giữ tài khoản du khách để đặt tour như bình thường."],
  ["Hồ sơ bị yêu cầu bổ sung thì sao?", "Bạn sẽ nhận email nêu rõ phần cần bổ sung và lý do. Sau khi chỉnh sửa, bạn gửi lại hồ sơ để được xét duyệt tiếp."],
  ["Được duyệt rồi thì tour có được bán ngay không?", "Mỗi tour bạn tạo đều được kiểm duyệt nội dung trước khi mở bán. Khi tour được duyệt, khách có thể đặt theo các ngày khởi hành bạn đã chọn."],
  ["Sau này tôi có đổi được thông tin doanh nghiệp hoặc tài khoản ngân hàng không?", "Có. Bạn gửi yêu cầu thay đổi thông tin trong trang đối tác; thay đổi được áp dụng sau khi quản trị viên xác nhận."],
  ["Giấy tờ cần tải lên ở định dạng nào?", "Ảnh chụp (PNG, JPG) hoặc file PDF, mỗi tệp tối đa 10MB. Hãy chụp rõ nét, đủ bốn góc giấy tờ."],
];

/**
 * Nút chính theo vai trò người xem:
 *  • chưa đăng nhập / du khách → Đăng ký đối tác
 *  • đối tác đã đăng nhập      → Vào trang đối tác
 *  • admin / kiểm duyệt viên   → không hiện nút đăng ký
 */
function useCta() {
  const { ready, role, isStaff } = useTouristSession();
  if (!ready) return { kind: "loading" };
  if (role === "content_provider") return { kind: "provider", href: ROUTES.PROVIDER, label: "Vào trang đối tác", Icon: LayoutDashboard };
  if (isStaff) return { kind: "staff" };
  return { kind: "register", href: ROUTES.PARTNER_REGISTER, label: "Đăng ký đối tác", Icon: ArrowRight };
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

/** Thẻ tour thật đang bán (lấy từ API) — thay cho thẻ minh hoạ cố định trước đây. */
function LiveTourCard() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    let alive = true;
    touristService.publishedTours({ size: 60 }).then(async ({ items }) => {
      const pick = [...items].filter((t) => t.coverImageUrl)
        .sort((a, b) => (b.stopCount || 0) - (a.stopCount || 0) || b.tourId - a.tourId)[0];
      if (!pick) return;
      const detail = await touristService.tourDetail(pick.tourId).catch(() => null);
      const quiz = (detail?.stops || []).reduce((s, x) => s + (x.quizCount || 0), 0);
      if (alive) setInfo({ tour: pick, quiz, total: items.length });
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!info) return null;
  const { tour, quiz } = info;
  return (
    <Link href={ROUTES.TOUR_DETAIL(tour.tourId)}
      className="absolute -bottom-10 -left-2 z-10 w-60 rounded-2xl bg-white p-4 text-slate-900 shadow-[0_18px_40px_rgba(0,0,0,0.28)] hover:ring-2 hover:ring-orange-300 sm:-left-8">
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><ShieldCheck size={12} />Đã duyệt · Đang mở bán</span>
      <span className="mt-2 block text-sm font-bold leading-snug">{tour.title}</span>
      <span className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><Footprints size={12} />{tour.stopCount} điểm dừng</span>
        {quiz > 0 && <span className="inline-flex items-center gap-1"><QrCode size={12} />{quiz} câu quiz</span>}
        <span className="inline-flex items-center gap-1"><Clock size={12} />{durationLabel(tour)}</span>
      </span>
    </Link>
  );
}

function Hero() {
  const cta = useCta();
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(160deg,#0b5d56_0%,#0f766e_60%,#138a7f_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_380px_at_90%_-10%,rgba(234,106,18,0.25),transparent_60%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-teal-50">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-300" />Chương trình đối tác JourneyGo
          </p>
          <h1 className="mt-5 max-w-[18ch] text-[clamp(30px,4vw,46px)] font-extrabold leading-[1.1] tracking-tight text-balance">
            Đưa di sản và văn hoá địa phương đến gần hơn với du khách
          </h1>
          <p className="mt-4 max-w-xl text-teal-50/85">
            Dành cho công ty lữ hành, làng nghề, nghệ nhân và đơn vị trải nghiệm. Bạn tạo tour có câu chuyện, quiz và hoạt động
            check-in tại điểm đến; JourneyGo lo phần đặt chỗ, thanh toán và đối soát.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <CtaButton />
            <a href="#quy-trinh" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 text-[15px] font-bold text-white hover:bg-white/20">Xem quy trình</a>
          </div>
          {cta.kind === "register" && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-teal-50/75"><Info size={13} className="mt-px shrink-0" />Tài khoản đối tác dùng email doanh nghiệp riêng, khác tài khoản du khách.</p>
          )}
          {cta.kind === "staff" && (
            <p className="mt-3 text-sm text-teal-50/80">Bạn đang đăng nhập bằng tài khoản quản trị. Hồ sơ đối tác được duyệt tại trang Quản lý đối tác.</p>
          )}
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-teal-50/85">
            {TRUST.map((t) => <li key={t} className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-orange-300" />{t}</li>)}
          </ul>
        </div>
        <div className="relative mx-auto hidden w-full max-w-md sm:block lg:max-w-none">
          <div className="grid grid-cols-[1.25fr_1fr] gap-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border-4 border-white/90 shadow-2xl">
              <Image src="/image/vanmieu-khuevancac.jpg" alt="Khuê Văn Các, Văn Miếu – Quốc Tử Giám" fill priority sizes="(min-width: 1024px) 24vw, 50vw" className="object-cover" />
            </div>
            <div className="relative mt-12 aspect-[3/4] overflow-hidden rounded-3xl border-4 border-white/90 shadow-2xl">
              <Image src="/image/hoian-lanterns.jpg" alt="Đèn lồng phố cổ Hội An" fill sizes="(min-width: 1024px) 18vw, 40vw" className="object-cover" />
            </div>
          </div>
          <LiveTourCard />
        </div>
      </div>
    </section>
  );
}

function PartnerTypes() {
  return (
    <section id="doi-tuong" className="scroll-mt-32 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHead eyebrow="Ai có thể tham gia" title="Hai loại hình đối tác" description="Chuẩn bị sẵn giấy tờ theo loại hình của bạn trước khi đăng ký để hồ sơ được duyệt nhanh hơn." />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {PARTNER_TYPES.map((type) => (
            <article key={type.title} className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="relative h-48 bg-slate-100 sm:h-56">
                {type.local
                  ? <Image src={type.image} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
                  : <img src={type.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                <div className="absolute inset-x-5 bottom-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-teal-700"><type.icon size={20} /></span>
                  <h3 className="min-w-0 text-lg font-bold leading-snug text-white sm:text-xl">{type.title}</h3>
                </div>
              </div>
              <div className="flex-1 p-6">
                <p className="text-[15px] leading-relaxed text-slate-600">{type.description}</p>
                <p className="mt-5 text-sm font-bold text-slate-900">Giấy tờ cần chuẩn bị</p>
                <ul className="mt-3 space-y-2.5">
                  {type.documents.map((doc) => (
                    <li key={doc} className="flex items-start gap-2.5 text-[15px] text-slate-700"><FileText size={17} className="mt-0.5 shrink-0 text-teal-600" />{doc}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-5 md:flex-row md:items-center md:gap-8">
          <p className="shrink-0 text-sm font-bold text-teal-900">Cả hai loại hình đều cần</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {COMMON_REQUIREMENTS.map((r) => <li key={r} className="inline-flex items-center gap-2 text-[15px] text-slate-700"><CheckCircle2 size={16} className="text-teal-600" />{r}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section id="quyen-loi" className="scroll-mt-32 bg-[#f4f7f6] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHead eyebrow="Quyền lợi" title="Công cụ để tour của bạn có chiều sâu" description="JourneyGo được thiết kế cho du lịch văn hóa: không chỉ bán chỗ, mà giúp du khách hiểu và nhớ nơi họ đến." />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative min-h-[320px] overflow-hidden rounded-3xl bg-teal-900">
            <img src={IMG.chuaCau} alt="Chùa Cầu, phố cổ Hội An" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-teal-950/85 via-teal-950/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <p className="text-sm font-semibold text-teal-100">Chùa Cầu, Hội An</p>
              <p className="mt-2 max-w-md text-xl font-bold leading-snug text-white text-balance sm:text-2xl">Mỗi điểm dừng là một câu chuyện: du khách nghe, chơi và nhớ lâu hơn</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {BENEFITS.map(([Icon, title, text]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-600"><Icon size={21} /></span>
                <h3 className="mt-4 font-bold leading-snug text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Process() {
  return (
    <section id="quy-trinh" className="scroll-mt-32 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHead eyebrow="Quy trình" title="Bốn bước để bắt đầu" description="Toàn bộ thực hiện trực tuyến, không cần gửi giấy tờ bản cứng.">
          <CtaButton />
        </SectionHead>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map(([title, text], i) => (
            <li key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-600 font-extrabold tabular-nums text-white">{i + 1}</span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="hoi-dap" className="scroll-mt-32 bg-[#f4f7f6] py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHead eyebrow="Hỏi đáp" title="Câu hỏi thường gặp" description="Những điều đối tác thường hỏi trước khi gửi hồ sơ." />
        <div className="min-w-0 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border border-slate-200 bg-white px-5 open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                {q}<ChevronDown size={18} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="-mt-1 pb-5 text-[15px] leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const cta = useCta();
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl bg-[linear-gradient(160deg,#0b5d56_0%,#0f766e_70%)] px-6 py-14 text-center text-white sm:px-12">
          <h2 className="mx-auto max-w-2xl text-[28px] font-extrabold leading-tight tracking-tight text-balance sm:text-4xl">Sẵn sàng đưa điểm đến của bạn lên JourneyGo?</h2>
          <p className="mx-auto mt-4 max-w-xl text-teal-50/85">Gửi hồ sơ ngay hôm nay, kết quả được gửi qua email trong 1–3 ngày làm việc.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CtaButton tone="light" />
            {cta.kind === "register" && (
              <Link href={ROUTES.LOGIN} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 text-[15px] font-bold text-white hover:bg-white/20">
                <LogIn size={16} />Đã là đối tác? Đăng nhập
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
