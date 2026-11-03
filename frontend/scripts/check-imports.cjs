/**
 * Quét toàn bộ source frontend để tìm named import không tồn tại trong module đích.
 * Dùng để bắt lỗi build Next.js kiểu "Export X doesn't exist in target module".
 */
const fs = require("fs");
const path = require("path");

const root = process.argv[2] || "src";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return p.endsWith(".js") || p.endsWith(".jsx") ? [p] : [];
  });
}

const files = walk(root);

function exportsOf(file) {
  const src = fs.readFileSync(file, "utf8");
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    m[1]
      .split(",")
      .forEach((x) => {
        const n = x.split(/\s+as\s+/).pop().trim();
        if (n) names.add(n);
      });
  }
  // `export * from "./x"` — không liệt kê tên, nên không thể kiểm tra tĩnh → bỏ qua module này.
  if (/export\s*\*\s*from/.test(src)) return null;
  return names;
}

const exportMap = new Map();
for (const f of files) exportMap.set(path.resolve(f), exportsOf(f));

function resolveSpec(spec, fromFile) {
  let target = null;
  if (spec.startsWith("@/")) target = path.join(root, spec.slice(2));
  else if (spec.startsWith(".")) target = path.normalize(path.join(path.dirname(fromFile), spec));
  else return null;
  const cands = [target, target + ".js", target + ".jsx", path.join(target, "index.js"), path.join(target, "index.jsx")];
  for (const c of cands) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return path.resolve(c);
  }
  return null;
}

let issues = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const re = /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const target = resolveSpec(m[2], f);
    if (!target) continue;
    const avail = exportMap.get(target);
    if (!avail) continue; // module dùng `export *` → không kiểm tra tĩnh được
    for (const raw of m[1].split(",")) {
      const n = raw.trim();
      if (!n) continue;
      const name = n.split(/\s+as\s+/)[0].trim();
      if (!avail.has(name)) {
        console.log(`MISSING "${name}"  <-  ${m[2]}   (in ${f})`);
        issues++;
      }
    }
  }
}
console.log(`TOTAL ISSUES: ${issues}`);
