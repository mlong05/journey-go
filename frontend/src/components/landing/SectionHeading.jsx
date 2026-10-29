/** Tiêu đề mục dùng chung cho các phần của trang chủ. */
export default function SectionHeading({ eyebrow, title, description, align = "left", children }) {
  const centered = align === "center";
  return (
    <div
      className={`flex flex-col gap-4 mb-10 ${
        centered ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"
      }`}
    >
      <div className={centered ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow && (
          <p className="text-sm font-medium text-emerald-700 mb-2">{eyebrow}</p>
        )}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-base text-slate-600 leading-relaxed">{description}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
