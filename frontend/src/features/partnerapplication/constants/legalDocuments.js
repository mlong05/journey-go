/**
 * Nội dung văn bản pháp lý dùng cho màn hình đăng ký đối tác.
 * Nguồn hiển thị: Giai đoạn 4 — Xác nhận & đồng ý.
 */

const TERMS_SPEC = [
  ["s1", 3],
  ["s2", 3],
  ["s3", 4],
  ["s4", 3],
  ["s5", 3],
  ["s6", 2],
  ["s7", 3],
  ["s8", 2],
  ["s9", 2],
];

const PRIVACY_SPEC = [
  ["s1", 3],
  ["s2", 5],
  ["s3", 1],
  ["s4", 2],
  ["s5", 2],
  ["s6", 2],
  ["s7", 3],
  ["s8", 1],
  ["s9", 1],
  ["s10", 1],
];

function buildSections(t, prefix, spec) {
  return spec.map(([id, count]) => ({
    heading: t(`${prefix}.${id}.h`),
    paragraphs: Array.from({ length: count }, (_, i) => t(`${prefix}.${id}.p${i + 1}`)),
  }));
}

export function getPartnerTerms(t) {
  return {
    title: t("home.pr.terms.title"),
    sections: buildSections(t, "home.pr.terms", TERMS_SPEC),
  };
}

export function getPrivacyPolicy(t) {
  return {
    title: t("home.pr.privacy.title"),
    sections: buildSections(t, "home.pr.privacy", PRIVACY_SPEC),
  };
}
