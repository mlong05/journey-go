import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

/**
 * Logo thương hiệu — cùng bộ ảnh với trang đăng nhập và thanh bên dashboard
 * (biểu tượng + chữ "JourneyGo!" kèm khẩu hiệu).
 * Dùng bản ảnh nền trong suốt (`*-clear.png`) để hoà vào header.
 * `light`: nằm trên nền tối ⇒ dùng bản chữ sáng (chữ trắng, giữ "Go!" màu cam).
 * `compact`: màn hẹp chỉ hiện biểu tượng, từ `sm` trở lên mới hiện chữ.
 */
export default function BrandLogo({ light = false, compact = false }) {
  return (
    <Link href={ROUTES.HOME} title="Về trang chủ JourneyGo" className="flex shrink-0 items-center gap-1.5 min-w-0">
      <Image src="/image/logo-emblem-clear.png" alt="JourneyGo" width={372} height={380} priority className="h-10 w-auto shrink-0" />
      <Image
        src={light ? "/image/logo-wordmark-light.png" : "/image/logo-wordmark-clear.png"}
        alt="JourneyGo - đồng hành cùng bạn trong chuyến đi"
        width={424}
        height={104}
        priority
        className={`h-8 w-auto min-w-0 ${compact ? "hidden sm:block" : ""}`}
      />
    </Link>
  );
}
