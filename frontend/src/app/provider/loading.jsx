import { Loader2 } from "lucide-react";

/** Hiện trong lúc chuyển trang của Đối tác (thay vì đứng yên rồi bật trang mới). */
export default function ProviderLoading() {
  return (
    <div className="flex-1 py-24 flex items-center justify-center gap-2 text-slate-500 text-sm animate-in fade-in duration-200">
      <Loader2 size={18} className="animate-spin" />
      Đang tải trang…
    </div>
  );
}
