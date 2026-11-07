"use client";

/**
 * Trang landing "Trở thành đối tác của JourneyGo".
 *
 *  Theo đặc tả: link đăng ký đối tác nằm ở footer trang chủ. Khi người dùng bấm vào,
 *  hiển thị các QUYỀN LỢI khi hợp tác + nút "Bắt đầu" để mở biểu mẫu đăng ký.
 */
import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Globe2,
  HandCoins,
  LineChart,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

const BENEFITS = [
  {
    icon: Store,
    title: "Kênh bán nội dung riêng",
    description:
      "Tự đăng ký và quản lý tour, điểm đến, trải nghiệm, nhiệm vụ và nội dung văn hóa trên JourneyGo — trọn quyền kiểm soát nội dung và lịch mở bán.",
  },
  {
    icon: HandCoins,
    title: "Doanh thu minh bạch",
    description:
      "Theo dõi doanh thu, hoa hồng nền tảng và số tiền thực nhận theo từng kỳ trên Dashboard đối tác. Mọi giao dịch đều ghi nhận rõ ràng.",
  },
  {
    icon: BadgePercent,
    title: "Chính sách hoa hồng rõ ràng",
    description:
      "Tỷ lệ hoa hồng được công bố công khai theo từng giai đoạn hiệu lực, không thay đổi hồi tố cho các đơn đã phát sinh.",
  },
  {
    icon: Users,
    title: "Tiếp cận khách du lịch",
    description:
      "Tiếp cận lượng khách quan tâm du lịch trải nghiệm văn hóa — đặc biệt là các điểm đến còn ít thông tin và chưa được khai thác.",
  },
  {
    icon: Globe2,
    title: "Đồng hành cùng hệ sinh thái",
    description:
      "Kết nối với cộng đồng đối tác, cơ quan quản lý địa phương và các đơn vị du lịch để mở rộng sản phẩm trải nghiệm.",
  },
  {
    icon: ShieldCheck,
    title: "Hồ sơ được bảo vệ",
    description:
      "Hồ sơ đăng ký được kiểm duyệt bởi đội ngũ quản trị viên, mọi quyết định đều có lý do và lịch sử kiểm duyệt rõ ràng.",
  },
];

const PROCESS = [
  {
    step: "01",
    title: "Gửi hồ sơ đăng ký",
    description:
      "Điền thông tin người đại diện, hồ sơ doanh nghiệp, thiết lập thanh toán và xác nhận các điều khoản hợp tác.",
  },
  {
    step: "02",
    title: "Đội ngũ quản trị xét duyệt",
    description:
      "Hồ sơ được kiểm tra hợp lệ. Nếu cần bổ sung, bạn sẽ nhận email nêu rõ lý do và có thể sửa gửi lại.",
  },
  {
    step: "03",
    title: "Kích hoạt tài khoản đối tác",
    description:
      "Sau khi được duyệt, bạn nhận email thiết lập mật khẩu và đăng nhập để bắt đầu đăng ký nội dung.",
  },
  {
    step: "04",
    title: "Đăng ký nội dung & nhận doanh thu",
    description:
      "Tạo tour, điểm đến, trải nghiệm; bán trên nền tảng và theo dõi doanh thu trực tiếp trên Dashboard.",
  },
];

export default function PartnerBenefitsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-teal-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -top-24 -left-32 h-[320px] w-[320px] rounded-full bg-amber-200/30 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-14 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-xs font-bold tracking-wide text-teal-700">
              <Sparkles size={14} />
              CHƯƠNG TRÌNH HỢP TÁC ĐỐI TÁC
            </span>

            <h1 className="mt-6 text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Trở thành đối tác của{" "}
              <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                JourneyGo
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Đồng hành cùng chúng tôi — đưa những giá trị lịch sử, văn hóa truyền thống đến
              gần hơn với du khách thông qua các trải nghiệm thực tế.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={ROUTES.PARTNER_REGISTER}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700 sm:w-auto"
              >
                Bắt đầu
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <a
                href="#quyen-loi"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-8 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                <LineChart size={17} />
                Xem quyền lợi hợp tác
              </a>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Hồ sơ được xét duyệt trong 1–3 ngày làm việc · Miễn phí đăng ký
            </p>
          </div>
        </div>
      </section>

      {/* Quyền lợi */}
      <section id="quyen-loi" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Quyền lợi khi hợp tác
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
            JourneyGo đồng hành cùng đối tác trên toàn bộ chuỗi giá trị: sản phẩm, phân phối,
            thanh toán và đối soát doanh thu.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition group-hover:bg-teal-600 group-hover:text-white">
                <b.icon size={20} />
              </span>
              <h3 className="mt-4 text-sm font-bold text-slate-900">{b.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {b.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quy trình */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">
              Quy trình hợp tác
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
              Bốn bước đơn giản để trở thành đối tác chính thức của JourneyGo.
            </p>
          </div>

          <ol className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((p) => (
              <li
                key={p.step}
                className="relative rounded-2xl border border-slate-200 bg-slate-50/60 p-6"
              >
                <span className="text-3xl font-black text-teal-600/25">
                  {p.step}
                </span>
                <h3 className="mt-2 text-sm font-bold text-slate-900">{p.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {p.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-teal-600 to-emerald-700 px-6 py-12 text-center shadow-xl sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Sẵn sàng đồng hành cùng JourneyGo?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/85">
            Gửi hồ sơ đăng ký trong hôm nay. Chúng tôi sẽ phản hồi kết quả xét duyệt qua
            email trong 1–3 ngày làm việc.
          </p>
          <Link
            href={ROUTES.PARTNER_REGISTER}
            className="group mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-bold text-teal-700 shadow-lg transition hover:bg-slate-50"
          >
            Bắt đầu đăng ký đối tác
            <ArrowRight
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/80">
            {[
              "Miễn phí đăng ký",
              "Không ràng buộc doanh thu",
              "Thanh toán định kỳ rõ ràng",
            ].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}