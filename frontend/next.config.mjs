/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // ── Docker: sinh sẵn .next/standalone (node_modules tối thiểu) để image runtime
  //    không cần cài lại dependencies. Xem frontend/Dockerfile.
  output: "standalone",
  experimental: {
    agentFeedback: true,
    // Đánh dấu app đã được nâng cấp Next.js theo hướng "security"
    // (16.4.0 → 16.4.3) để các lần nâng cấp agent sau không lặp lại công việc.
    agentUpgrade: "security",
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // Trang "Tất cả tour" đã gộp vào trang chủ: link cũ /tours?... chuyển về / (query giữ nguyên).
  async redirects() {
    return [{ source: "/tours", destination: "/", permanent: false }];
  },
    turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Ảnh / video bằng chứng hoàn tiền & ảnh upload từ Cloudinary.
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
