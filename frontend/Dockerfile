# syntax=docker/dockerfile:1
# =====================================================================================
#  Frontend (Next.js) — multi-stage build, kết quả chạy bằng `output: 'standalone'`
#  ⇒ image nhỏ gọn, không cần node_modules trong image cuối.
# =====================================================================================

# ── Stage 1: dependencies ───────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
# Chỉ copy manifest trước để cache layer npm ci theo lockfile.
COPY package.json package-lock.json ./
# Cache mount giữ ~/.npm giữa các lần build ⇒ đổi lockfile cũng không tải lại toàn bộ gói.
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ── Stage 2: build ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ⚠️ Next.js INLINE giá trị `NEXT_PUBLIC_*` vào bundle lúc BUILD.
#    Vì vậy các biến này PHẢI có sẵn khi chạy `docker compose build frontend`
#    (Compose truyền chúng qua `build.args`).
ARG NEXT_PUBLIC_API_URL=http://localhost:8088/api/v1
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ARG NEXT_PUBLIC_GOONG_MAPTILES_KEY=
ARG NEXT_PUBLIC_MOCK_PAYMENT=false
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_PUBLIC_GOONG_MAPTILES_KEY=$NEXT_PUBLIC_GOONG_MAPTILES_KEY \
    NEXT_PUBLIC_MOCK_PAYMENT=$NEXT_PUBLIC_MOCK_PAYMENT \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Next 16 ghi cache Turbopack vào .next/cache, nhưng mỗi lần build Docker bắt đầu từ layer sạch
# nên cache bị bỏ đi. Cache mount (BuildKit) giữ thư mục này giữa các lần build ⇒ build sau
# chỉ biên dịch lại phần code đã đổi.
RUN --mount=type=cache,target=/app/.next/cache npm run build

# ── Stage 3: runtime ────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Chạy bằng user không phải root (an toàn hơn).
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

# `output: 'standalone'` sinh sẵn .next/standalone chứa node_modules tối thiểu.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
