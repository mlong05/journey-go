/**
 * Trang landing "Trở thành đối tác của JourneyGo".
 *
 *  Link "Trở thành đối tác" ở footer trang chủ dẫn tới đây. Trang giới thiệu đối tượng tham gia
 *  (kèm giấy tờ cần chuẩn bị), quyền lợi, quy trình, hỏi đáp và nút mở biểu mẫu đăng ký.
 *  Dùng chung thanh điều hướng / footer / phong cách với trang chủ (màu emerald).
 */
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Building2,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  LogIn,
  MapPinned,
  QrCode,
  ShieldCheck,
  Store,
  Wallet,
} from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import Reveal from "@/components/landing/Reveal";
import SectionHeading from "@/components/landing/SectionHeading";
import { ROUTES } from "@/constants/routes";

export const metadata = {
  title: "Trở thành đối tác | Journey Go",
  description:
    "Đăng ký trở thành đối tác JourneyGo: đưa tour trải nghiệm văn hóa, di sản và làng nghề của bạn đến với du khách. Miễn phí đăng ký, xét duyệt trong 1–3 ngày làm việc.",
};

const NAV_LINKS = [
  { href: "#doi-tuong", label: "Ai có thể tham gia" },
  { href: "#quyen-loi", label: "Quyền lợi" },
  { href: "#quy-trinh", label: "Quy trình" },
  { href: "#hoi-dap", label: "Hỏi đáp" },
];

const NAV_CTA = { href: ROUTES.PARTNER_REGISTER, label: "Đăng ký đối tác" };

const TRUST = ["Miễn phí đăng ký", "Xét duyệt trong 1–3 ngày làm việc", "Không ràng buộc doanh thu"];

/** Khớp với điều kiện của biểu mẫu đăng ký (giai đoạn 2). */
const PARTNER_TYPES = [
  {
    icon: Building2,
    image: "/image/sapa-terraces.jpg",
    title: "Công ty lữ hành",
    description: "Doanh nghiệp đã có giấy phép kinh doanh lữ hành, muốn đưa tour trải nghiệm văn hóa lên JourneyGo.",
    documents: [
      "Giấy phép kinh doanh lữ hành (quốc tế hoặc nội địa)",
      "Giấy xác nhận ký quỹ lữ hành",
      "Giấy chứng nhận đăng ký kinh doanh",
      "Giấy phép hoạt động",
    ],
  },
  {
    icon: Store,
    image: "/image/hoian-pottery-craft.jpg",
    title: "Đơn vị trải nghiệm / điểm đến",
    description: "Làng nghề, nghệ nhân, homestay, bảo tàng, hộ kinh doanh… tổ chức hoạt động trải nghiệm tại địa phương.",
    documents: [
      "Giấy chứng nhận đăng ký kinh doanh hoặc đăng ký hộ kinh doanh",
      "Giấy phép hoạt động",
    ],
  },
];

const COMMON_REQUIREMENTS = [
  "Email doanh nghiệp (xác minh bằng mã OTP)",
  "Mã số thuế 10 chữ số",
  "Tài khoản ngân hàng nhận doanh thu",
];

const BENEFITS = [
  {
    icon: BookOpenText,
    title: "Kể câu chuyện văn hóa, không chỉ bán vé",
    description:
      "Mỗi điểm đến có nội dung văn hóa, cổ vật kèm ảnh và video. Câu chuyện được mở khóa khi khách đến nơi, giúp chuyến đi có chiều sâu hơn.",
  },
  {
    icon: QrCode,
    title: "Khách tương tác ngay tại điểm đến",
    description:
      "Quiz trắc nghiệm, hoạt động thực tế xác nhận bằng mã QR và vị trí GPS, kèm điểm thưởng trên ứng dụng JourneyGo.",
  },
  {
    icon: FileSpreadsheet,
    title: "Tạo tour nhanh, tự lưu nháp",
    description:
      "Tạo tour theo 5 bước có hướng dẫn, hoặc nhập cả tour từ file Excel mẫu. Giá vé và lịch khởi hành sửa được cả khi tour đang bán.",
  },
  {
    icon: Wallet,
    title: "Doanh thu và đối soát minh bạch",
    description:
      "Theo dõi đơn đặt, doanh thu, các kỳ đối soát và số dư ví ngay trên trang đối tác. Tiền được chuyển về tài khoản bạn đã đăng ký.",
  },
];

const PROCESS = [
  {
    title: "Gửi hồ sơ trực tuyến",
    description:
      "Điền 4 phần: người đại diện, hồ sơ doanh nghiệp, tài khoản thanh toán và xác nhận điều khoản. Hồ sơ tự lưu nháp sau khi xác minh email.",
  },
  {
    title: "Xét duyệt hồ sơ",
    description:
      "Đội ngũ quản trị kiểm tra trong 1–3 ngày làm việc. Nếu cần bổ sung, bạn nhận email nêu rõ lý do và có thể sửa rồi gửi lại.",
  },
  {
    title: "Kích hoạt tài khoản",
    description: "Khi hồ sơ được duyệt, bạn nhận email đặt mật khẩu để đăng nhập trang đối tác.",
  },
  {
    title: "Tạo tour và mở bán",
    description:
      "Tạo tour trên trang đối tác. Mỗi tour được kiểm duyệt nội dung trước khi mở bán để giữ chất lượng chung.",
  },
];

const FAQ = [
  {
    q: "Đăng ký làm đối tác có mất phí không?",
    a: "Không. Việc đăng ký và sử dụng trang đối tác hoàn toàn miễn phí, không ràng buộc doanh thu tối thiểu.",
  },
  {
    q: "Bao lâu thì tôi biết kết quả xét duyệt?",
    a: "Thông thường trong 1–3 ngày làm việc. Kết quả được gửi về email bạn đã xác minh khi đăng ký.",
  },
  {
    q: "Tôi là hộ kinh doanh hoặc nghệ nhân, có đăng ký được không?",
    a: "Được. Hãy chọn loại hình \"Đơn vị cung cấp trải nghiệm / điểm đến\" và tải lên giấy đăng ký hộ kinh doanh cùng giấy phép hoạt động.",
  },
  {
    q: "Hồ sơ bị yêu cầu bổ sung thì sao?",
    a: "Bạn sẽ nhận email nêu rõ phần cần bổ sung và lý do. Sau khi chỉnh sửa, bạn gửi lại hồ sơ để được xét duyệt tiếp.",
  },
  {
    q: "Được duyệt rồi thì tour có được bán ngay không?",
    a: "Mỗi tour bạn tạo đều được kiểm duyệt nội dung trước khi mở bán. Khi tour được duyệt, khách có thể đặt theo các ngày khởi hành bạn đã chọn.",
  },
  {
    q: "Sau này tôi có đổi được thông tin doanh nghiệp hoặc tài khoản ngân hàng không?",
    a: "Có. Bạn gửi yêu cầu thay đổi thông tin trong trang đối tác; thay đổi được áp dụng sau khi quản trị viên xác nhận.",
  },
  {
    q: "Giấy tờ cần tải lên ở định dạng nào?",
    a: "Ảnh chụp (PNG, JPG) hoặc file PDF, mỗi tệp tối đa 10MB. Hãy chụp rõ nét, đủ bốn góc giấy tờ.",
  },
];

function PrimaryButton({ href, children, tone = "light" }) {
  const cls = tone === "light"
    ? "bg-white hover:bg-emerald-50 text-emerald-900 shadow-lg"
    : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs";
  return (
    <Link href={href}
      className={`group w-full sm:w-auto h-12 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 ${cls}`}>
      {children}
      <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

// ── Phần đầu trang ────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-emerald-950 pt-28 pb-20 sm:pt-32 lg:pt-36 lg:pb-28">
      <div aria-hidden="true" className="absolute -top-40 right-0 -z-10 h-[520px] w-[520px] rounded-full bg-emerald-500/20 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-48 -left-24 -z-10 h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-10 items-center">
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-emerald-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Chương trình đối tác JourneyGo
          </p>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold tracking-tight text-white leading-[1.15] text-balance">
            Đưa di sản và văn hóa địa phương đến gần hơn với du khách
          </h1>
          <p className="mt-6 max-w-xl text-base sm:text-lg text-emerald-50/80 leading-relaxed">
            Dành cho công ty lữ hành, làng nghề, nghệ nhân và đơn vị trải nghiệm. Tạo tour có câu chuyện,
            quiz và hoạt động check-in tại điểm đến — JourneyGo lo phần đặt chỗ, thanh toán và đối soát.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <PrimaryButton href={ROUTES.PARTNER_REGISTER}>Đăng ký đối tác</PrimaryButton>
            <a href="#quy-trinh"
              className="w-full sm:w-auto h-12 px-6 rounded-xl border border-white/25 bg-white/5 hover:bg-white/15 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              Xem quy trình
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-emerald-50/75">
            {TRUST.map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                {t}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.15} className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative grid grid-cols-[1.25fr_1fr] gap-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl ring-1 ring-white/10 shadow-2xl">
              <Image src="/image/vanmieu-khuevancac.jpg" alt="Khuê Văn Các, Văn Miếu – Quốc Tử Giám" fill priority
                sizes="(min-width: 1024px) 26vw, 55vw" className="object-cover" />
            </div>
            <div className="mt-14 relative aspect-[3/4] overflow-hidden rounded-3xl ring-1 ring-white/10 shadow-2xl">
              <Image src="/image/hoian-lanterns.jpg" alt="Đèn lồng phố cổ Hội An" fill
                sizes="(min-width: 1024px) 20vw, 45vw" className="object-cover" />
            </div>
          </div>

          {/* Thẻ minh họa tour trên JourneyGo */}
          <div className="absolute -left-3 sm:-left-8 bottom-10 w-60 rounded-2xl bg-white p-4 shadow-2xl shadow-emerald-950/40">
            <p className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck size={12} /> Đã duyệt · Đang mở bán
            </p>
            <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">Hà Nội nghìn năm văn hiến</p>
            <p className="mt-1 text-xs text-slate-500">4 điểm đến · 6 câu quiz · 5 giờ</p>
          </div>
          <div className="absolute -right-2 sm:-right-4 top-6 flex items-center gap-2.5 rounded-2xl bg-white/95 px-3.5 py-3 shadow-2xl shadow-emerald-950/40 backdrop-blur">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <QrCode size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-900">Check-in Văn Miếu</p>
              <p className="text-[11px] text-slate-500">Mở khóa câu chuyện</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Ai có thể tham gia ────────────────────────────────────────────────────────

function PartnerTypes() {
  return (
    <section id="doi-tuong" className="py-20 sm:py-24 bg-white scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Ai có thể tham gia"
          title="Hai loại hình đối tác"
          description="Chuẩn bị sẵn giấy tờ theo loại hình của bạn trước khi đăng ký để hồ sơ được duyệt nhanh hơn."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {PARTNER_TYPES.map((type, i) => (
            <Reveal key={type.title} delay={i * 0.08} className="h-full">
              <article className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col">
                <div className="relative h-44 sm:h-52">
                  <Image src={type.image} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                  <div className="absolute bottom-4 left-5 right-5 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow">
                      <type.icon size={20} />
                    </span>
                    <h3 className="min-w-0 text-lg sm:text-xl font-semibold leading-snug text-white">{type.title}</h3>
                  </div>
                </div>
                <div className="flex-1 p-6">
                  <p className="text-[15px] text-slate-600 leading-relaxed">{type.description}</p>
                  <p className="mt-5 text-sm font-semibold text-slate-900">Giấy tờ cần chuẩn bị</p>
                  <ul className="mt-3 space-y-2.5">
                    {type.documents.map((doc) => (
                      <li key={doc} className="flex items-start gap-2.5 text-[15px] text-slate-700">
                        <FileText size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <p className="text-sm font-semibold text-emerald-900 shrink-0">Cả hai loại hình đều cần</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {COMMON_REQUIREMENTS.map((r) => (
                <li key={r} className="inline-flex items-center gap-2 text-[15px] text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Quyền lợi ────────────────────────────────────────────────────────────────

function Benefits() {
  return (
    <section id="quyen-loi" className="py-20 sm:py-24 bg-slate-50 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Quyền lợi"
          title="Công cụ để tour của bạn có chiều sâu"
          description="JourneyGo được thiết kế cho du lịch văn hóa: không chỉ bán chỗ, mà giúp du khách hiểu và nhớ nơi họ đến."
        />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Reveal className="h-full">
            <div className="relative h-full min-h-[340px] overflow-hidden rounded-2xl">
              <Image src="/image/trangan-boats.jpg" alt="Du khách đi thuyền giữa núi đá Tràng An"
                fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover object-bottom" />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-emerald-950/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <p className="text-sm font-medium text-emerald-200">Tràng An, Ninh Bình</p>
                <p className="mt-2 max-w-md text-xl sm:text-2xl font-semibold text-white leading-snug text-balance">
                  Mỗi điểm dừng là một câu chuyện — du khách nghe, chơi và nhớ lâu hơn
                </p>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.06} className="h-full">
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <b.icon size={21} />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900 leading-snug">{b.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{b.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Quy trình ─────────────────────────────────────────────────────────────────

function Process() {
  return (
    <section id="quy-trinh" className="py-20 sm:py-24 bg-white scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Quy trình"
          title="Bốn bước để bắt đầu"
          description="Toàn bộ thực hiện trực tuyến, không cần gửi giấy tờ bản cứng."
        >
          <PrimaryButton href={ROUTES.PARTNER_REGISTER} tone="dark">Bắt đầu đăng ký</PrimaryButton>
        </SectionHeading>

        <div className="relative">
        <div aria-hidden="true" className="hidden lg:block absolute left-6 right-6 top-6 h-px bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200" />
        <ol className="relative grid gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {PROCESS.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.08} className="relative">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-700 text-base font-semibold text-white ring-8 ring-white tabular-nums">
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{p.title}</h3>
              <p className="mt-2 text-[15px] text-slate-600 leading-relaxed">{p.description}</p>
            </Reveal>
          ))}
        </ol>
        </div>
      </div>
    </section>
  );
}

// ── Hỏi đáp ──────────────────────────────────────────────────────────────────

function Faq() {
  return (
    <section id="hoi-dap" className="py-20 sm:py-24 bg-slate-50 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeading
            eyebrow="Hỏi đáp"
            title="Câu hỏi thường gặp"
            description="Những điều đối tác thường hỏi trước khi gửi hồ sơ."
          />
          <Reveal className="hidden lg:block">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image src="/image/vietnam-phin-coffee.jpg" alt="" fill sizes="30vw" className="object-cover" />
            </div>
          </Reveal>
        </div>

        <Reveal className="space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-slate-200 bg-white px-5 open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown size={18} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-5 -mt-1 text-[15px] text-slate-600 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// ── Kêu gọi cuối trang ───────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-3xl bg-emerald-950 px-6 py-16 sm:px-12 sm:py-20 text-center">
          <Image src="/image/hagiang-nhoque.jpg" alt="" fill sizes="100vw" className="-z-20 object-cover" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-950/85 via-emerald-950/75 to-emerald-950/90" />
          <Reveal className="relative max-w-2xl mx-auto">
            <MapPinned size={28} className="mx-auto text-emerald-300" />
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-[1.2] text-balance">
              Sẵn sàng đưa điểm đến của bạn lên JourneyGo?
            </h2>
            <p className="mt-5 text-base sm:text-lg text-emerald-50/85 leading-relaxed">
              Gửi hồ sơ ngay hôm nay — chúng tôi phản hồi kết quả qua email trong 1–3 ngày làm việc.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <PrimaryButton href={ROUTES.PARTNER_REGISTER}>Đăng ký đối tác</PrimaryButton>
              <Link href={ROUTES.LOGIN}
                className="w-full sm:w-auto h-12 px-6 rounded-xl border border-white/30 bg-white/5 hover:bg-white/15 backdrop-blur-sm text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                <LogIn size={16} /> Đã là đối tác? Đăng nhập
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default function PartnerProgramPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-600 selection:text-white">
      <LandingNavbar links={NAV_LINKS} cta={NAV_CTA} />
      <main className="flex-1">
        <Hero />
        <PartnerTypes />
        <Benefits />
        <Process />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
