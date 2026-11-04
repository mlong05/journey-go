import Image from "next/image";
import { MapPin } from "lucide-react";
import Reveal from "./Reveal";

const ROW_A = [
  { src: "/image/sapa-terraces.jpg", caption: "Ruộng bậc thang mùa nước đổ", place: "Sa Pa" },
  { src: "/image/hoian.jpg", caption: "Đèn lồng phố Hội lúc lên đèn", place: "Hội An" },
  { src: "/image/sup-kayak.jpg", caption: "Chèo kayak giữa vịnh lặng", place: "Quảng Ninh" },
  { src: "/image/vietnam-phin-coffee.jpg", caption: "Giọt phin sớm mai cao nguyên", place: "Đà Lạt" },
  { src: "/image/trangan.jpg", caption: "Thuyền nan len qua hang đá", place: "Ninh Bình" },
  { src: "/image/phuquoc-beach.jpg", caption: "Bãi cát trắng Nam Đảo", place: "Phú Quốc" },
];

const ROW_B = [
  { src: "/image/vanmieu.jpg", caption: "Khuê Văn Các rêu phong", place: "Hà Nội" },
  { src: "/image/trekking-adventure.jpg", caption: "Cung đường trekking trên mây", place: "Hà Giang" },
  { src: "/image/hoian-pottery-craft.jpg", caption: "Bàn xoay gốm làng Thanh Hà", place: "Hội An" },
  { src: "/image/dalat-lake.jpg", caption: "Hồ sương giữa rừng thông", place: "Đà Lạt" },
  { src: "/image/hagiang-nhoque.jpg", caption: "Dòng Nho Quế xanh ngọc", place: "Hà Giang" },
  { src: "/image/compass-real.jpg", caption: "Mỗi chuyến đi là một hướng mới", place: "Khắp Việt Nam" },
];

function Row({ items, reverse = false, duration }) {
  // Nhân đôi danh sách để vòng lặp nối liền; bản sao thứ hai ẩn với trình đọc màn hình.
  const doubled = [...items, ...items];
  return (
    <div className="jg-marquee-group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <ul
        className={`jg-marquee flex w-max gap-4 ${reverse ? "jg-marquee-reverse" : ""}`}
        style={{ "--jg-marquee-duration": duration }}
      >
        {doubled.map((item, i) => (
          <li
            key={`${item.src}-${i}`}
            aria-hidden={i >= items.length ? "true" : undefined}
            className="group relative w-64 sm:w-80 aspect-[4/3] shrink-0 rounded-2xl overflow-hidden bg-slate-800"
          >
            <Image
              src={item.src}
              alt={i >= items.length ? "" : item.caption}
              fill
              sizes="320px"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="flex items-center gap-1 text-xs font-medium text-emerald-300 leading-normal">
                <MapPin size={12} />
                {item.place}
              </p>
              <p className="mt-0.5 text-sm font-medium leading-normal">{item.caption}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MomentsMarquee() {
  return (
    <section className="py-20 sm:py-24 bg-slate-950 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-medium text-emerald-300 mb-2 leading-normal">Khoảnh khắc từ lữ khách</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-[1.25] text-balance">
            Từ núi rừng Tây Bắc đến biển đảo phương Nam
          </h2>
          <p className="mt-3 text-base text-white/70 leading-relaxed">
            Những khung hình được ghi lại trong các chuyến đi cùng host JourneyGo. Rê chuột để dừng lại ngắm kỹ hơn.
          </p>
        </Reveal>
      </div>

      <div className="space-y-4">
        <Row items={ROW_A} duration="70s" />
        <Row items={ROW_B} duration="80s" reverse />
      </div>
    </section>
  );
}
