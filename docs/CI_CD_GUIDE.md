# CI/CD — GitHub Actions

Tài liệu này mô tả pipeline CI/CD của dự án **JourneyGo** (backend Spring Boot · frontend Next.js · mobile Flutter).

---

## 1. Tổng quan

| Workflow | File | Trigger | Việc làm |
|---|---|---|---|
| **CI Backend** | `.github/workflows/backend.yml` | PR + push `main` (path `backend/**`) | `mvn clean compile` → `mvn test` → `mvn package`, upload JAR |
| **CI Frontend** | `.github/workflows/frontend.yml` | PR + push `main` (path `frontend/**`) | `npm ci` → kiểm tra named import → `npm run lint` → `npm run build` |
| **CI Mobile** | `.github/workflows/mobile.yml` | PR + push `main` (path `mobile/**`) | `flutter pub get` → `flutter analyze` → `flutter test` |
| **CD Docker Images** | `.github/workflows/docker-publish.yml` | push tag `v*` hoặc chạy tay | Build & push image backend lên **GitHub Container Registry (GHCR)** |

### Nguyên tắc thiết kế

- **Path filter** — mỗi workflow chỉ chạy khi thư mục tương ứng có thay đổi ⇒ PR không liên quan không bị chặn.
- **Concurrency** — job cùng nhánh được hủy bỏ (CI) hoặc giữ nguyên (CD) tránh chạy chồng.
- **Timeout** — mọi job có `timeout-minutes` để tránh treo runner.
- **Cache** — Maven (`~/.m2`), npm (theo `package-lock.json`), Pub (`~/.pub-cache`).

---

## 2. CI Backend

```yaml
runs-on: ubuntu-latest
defaults:
  run:
    working-directory: backend
```

Các bước:

1. `actions/setup-java@v4` — Temurin JDK 21 (khớp `<java.version>21</java.version>` trong `pom.xml`), cache Maven.
2. `chmod +x mvnw` — wrapper Maven cần quyền thực thi (file trong repo không có bit `+x`).
3. `./mvnw -B -ntp clean compile` — biên dịch.
4. `./mvnw -B -ntp test` — **211 unit test** (toàn bộ test hiện tại là Mockito unit test, **không** cần database).
5. `./mvnw -B -ntp clean package -DskipTests` — đóng gói JAR.
6. Upload `backend/target/*.jar` làm artifact (giữ 7 ngày).

> **Lưu ý**: khi thêm integration test cần PostgreSQL, hãy dùng
> [Testcontainers](https://testcontainers.com) thay vì service container thủ công.

---

## 3. CI Frontend

```yaml
runs-on: ubuntu-latest
defaults:
  run:
    working-directory: frontend
```

Các bước:

1. `actions/setup-node@v4` — Node 22 (Next.js 16 yêu cầu `>=20.9.0`), cache npm.
2. `npm ci` — cài đúng dependency theo `package-lock.json`.
3. `node scripts/check-imports.cjs src` — script có sẵn, bắt lỗi
   *"Export X doesn't exist in target module"* trước khi Next.js build.
4. `npm run lint` — ESLint (`eslint-config-next`). **0 error** là đủ; warning `<img>` cố ý được giữ nguyên
   (avatar / bằng chứng chuyển khoản cần fallback `onError` và URL động ⇒ không dùng được `next/image`).
5. `npm run build` — build production với biến môi trường CI:

   ```yaml
   NEXT_PUBLIC_API_URL: http://localhost:8088/api/v1
   NEXT_PUBLIC_GOOGLE_CLIENT_ID: ci-placeholder
   NEXT_PUBLIC_GOONG_MAPTILES_KEY: ci-placeholder
   NEXT_PUBLIC_MOCK_PAYMENT: "true"
   ```

> ⚠️ **Bắt buộc** khai báo `NEXT_PUBLIC_*` ở bước build — Next.js inline giá trị lúc build,
> không đọc được biến chỉ set ở runtime.

---

## 4. CI Mobile

```yaml
runs-on: ubuntu-latest
defaults:
  run:
    working-directory: mobile
```

Các bước:

1. `subosito/flutter-action@v2` — Flutter **3.47.9** (stable), có cache SDK.
2. `actions/setup-java@v4` — JDK 21 (Android Gradle toolchain).
3. `flutter pub get`.
4. **Tạo `.env` từ `.env.example`** — `.env` là **asset bắt buộc** (khai báo trong `pubspec.yaml`),
   nếu thiếu thì `flutter test` fail với *"No file or variants found for asset: .env"*.
   File này **không commit** (chứa bí mật) nên CI phải tự sinh:

   ```bash
   cp .env.example .env
   sed -i 's|^API_BASE_URL=.*|API_BASE_URL=|' .env
   sed -i 's|^GOOGLE_ANDROID_CLIENT_ID=.*|GOOGLE_ANDROID_CLIENT_ID=ci-placeholder|' .env
   sed -i 's|^GOOGLE_WEB_CLIENT_ID=.*|GOOGLE_WEB_CLIENT_ID=ci-placeholder|' .env
   sed -i 's|^GOONG_MAPTILES_KEY=.*|GOONG_MAPTILES_KEY=ci-placeholder|' .env
   ```

5. `flutter analyze --no-fatal-infos` — phân tích tĩnh (hiện **0 issue**).
6. `flutter test --reporter=expanded` — **28 test**.

---

## 5. CD — Docker Image lên GHCR

```bash
# Tạo tag để kích hoạt tự động
git tag v1.0.0 && git push origin v1.0.0

# Hoặc chạy tay: tab Actions → "CD Docker Images" → Run workflow
```

Image được push lên `ghcr.io/<owner>/journeygo-backend` với tag theo git tag.

### Deploy lên server (VPS)

```bash
# Trên server, trong thư mục deploy
docker compose pull
docker compose up -d
```

### Đăng nhập GHCR khi pull (nếu image private)

```bash
echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u <github-actor> --password-stdin
```

> Dự án hiện dùng `docker-compose.yml` với `postgres` + `redis` + `backend` (port 8088).

---

## 6. Bảo mật & secrets

| Secret | Dùng ở đâu | Ghi chú |
|---|---|---|
| `GITHUB_TOKEN` | `docker-publish.yml` | Có sẵn, tự động cấp cho job có `permissions: packages: write` |

- Workflow **CI** không cần secret nào — toàn bộ test chạy offline với dữ liệu giả (Mockito).
- **Không** commit `.env`, `.env.local`, `backend/.env` — đã nằm trong `.gitignore`.
- Workflow `docker-publish.yml` chỉ có `permissions: contents: read` + `packages: write` (không có `write-all`).

---

## 7. Bảo trì

### Thêm biến môi trường mới cho frontend

1. Thêm vào `frontend/.env.example`.
2. Thêm vào khối `env:` của bước `npm run build` trong `frontend.yml` — nếu quên, giá trị sẽ là `undefined` trong production.

### Thêm test cho backend

```bash
cd backend
./mvnw test -Dtest=TenTestMoi
```

### Chạy lại CI cho một commit cũ

```bash
# Xoá workflow run cũ và chạy lại từ UI:
# Actions → chọn workflow → Re-run all jobs
```

### Kiểm tra workflow syntax trước khi push

```bash
# Dùng actionlint (khuyến nghị)
docker run --rm -v "$PWD:/repo" rhysd/actionlint:latest
```

---

## 8. Nâng cấp phiên bản

| Thành phần | Phiên bản hiện tại | Ghi chú |
|---|---|---|
| JDK | 21 | Khớp `pom.xml` (`java.version`) |
| Maven | 3.9.9 (qua `mvnw`) | Wrapper có sẵn trong repo |
| Node.js | 22 | Next.js 16 yêu cầu `>=20.9.0` |
| Next.js | 16.4.6 | ≥ 16.4.4 — bản cũ bị Next.js chặn build vì lỗ hổng bảo mật |
| Flutter | 3.47.9 (Dart 3.13.7) | Khớp `mobile/pubspec.yaml` (`sdk: ^3.11.5`) |
