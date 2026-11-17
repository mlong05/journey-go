# =====================================================================================
#  JourneyGo — Tài liệu vận hành (Self-hosted Deployment)
#
#  Kiến trúc:
#    Internet ──Cloudflare Edge──► cloudflared ──► nginx:80
#                                                   ├─ /api/…  → backend:8088
#                                                   ├─ /ws     → backend:8088 (WebSocket)
#                                                   └─ /       → frontend:3000
#
#  Tất cả service giao tiếp qua Docker network `journeygo-network`.
#  PostgreSQL / Redis KHÔNG được publish ra host ⇒ không thể truy cập từ Internet.
# =====================================================================================

## 1. Yêu cầu

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Docker Desktop | 4.x trở lên | Bật **WSL 2 backend** |
| Docker Compose | v2.20+ | Đi kèm Docker Desktop |
| RAM | Tối thiểu 8GB (khuyến nghị 16GB) | Backend + Frontend + Postgres + Redis + Nginx + cloudflared |
| Disk | Tối thiểu 10GB free | Dành cho images + volumes + backups |
| Domain | Đã trỏ CNAME về `<tunnel-id>.cfargotunnel.com` | Cloudflare quản lý tự động |

## 2. Cấu hình lần đầu

```bash
# 2.1. Tạo file .env từ template
cp .env.example .env          # Windows: copy .env.example .env

# 2.2. Điền các giá trị BẮT BUỘC trong .env:
#     - POSTGRES_PASSWORD          : sinh bằng  openssl rand -base64 32
#     - JWT_SECRET                 : sinh bằng  openssl rand -base64 48
#     - CLOUDFLARE_TUNNEL_TOKEN    : xem mục 3
#     - SPRING_MAIL_USERNAME / SPRING_MAIL_PASSWORD  (Gmail App Password)
#     - CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET
#     - VNPAY_TMN_CODE / VNPAY_HASH_SECRET
#     - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
#     - NEXT_PUBLIC_API_URL        : https://<domain>/api/v1
#     - NEXT_PUBLIC_GOOGLE_CLIENT_ID

# 2.3. Build + khởi động
docker compose up -d --build

# 2.4. Kiểm tra
docker compose ps          # tất cả phải "healthy"
curl http://127.0.0.1:8080/actuator/health/liveness
```

## 3. Lấy Cloudflare Tunnel Token

Tunnel đã tạo sẵn (`journeygo-tunnel`, Public Hostname → `http://nginx:80`).
Tunnel ID: `69029562-7567-4f58-ac76-aaec8ed04892`.

1. Cloudflare Zero Trust → **Networks** → **Tunnels** → `journeygo-tunnel`
2. Nhấn **Configure** → tab **Install and run a connector**
3. Chọn **Docker** → copy chuỗi:

```
docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token eyJhIjoiXXXX...
```

4. Lấy phần sau `--token` → điền vào `CLOUDFLARE_TUNNEL_TOKEN` trong `.env`
5. `docker compose up -d cloudflared`

Hoặc dùng script tự động (login trình duyệt → lấy token → ghi `.env` → tạo CNAME):

```powershell
.\scripts\cloudflare\setup-tunnel.ps1 `
  -TunnelId "69029562-7567-4f58-ac76-aaec8ed04892" `
  -Hostname "journeygo.id.vn"
```

> Token được truyền qua biến môi trường `TUNNEL_TOKEN` trong container
> ⇒ KHÔNG xuất hiện trong `docker inspect` hay `docker compose config` output.

### 3.1. DNS record cho tunnel

Trong Cloudflare Dashboard → zone `journeygo.id.vn` → **DNS** → **Add record**:

| Trường | Giá trị |
|---|---|
| Type | **CNAME** (hoặc chọn **Tunnel** → chọn `journeygo-tunnel`) |
| Name | `@` |
| Target | `69029562-7567-4f58-ac76-aaec8ed04892.cfargotunnel.com` |
| Proxy status | **Proxied** |
| TTL | **Auto** |

> Khi chọn type **Tunnel**, Cloudflare tự quản lý CNAME record ⇒ không được
> tự tạo CNAME trỏ thẳng tới `cfargotunnel.com` (sẽ bị lỗi
> "CNAME Cross-User Banned").
>
> ⚠️ Zone `journeygo.id.vn` phải nằm trong Cloudflare account (đã chuyển NS sang
> `*.ns.cloudflare.com`) để Cloudflare cấp được chứng chỉ SSL cho domain.
> Nếu DNS do nhà cung cấp khác quản lý, Cloudflare **không cấp SSL** cho
> domain đó qua Tunnel.

### 3.2. Kiểm tra tunnel đã hoạt động

```powershell
# 4 connector đã đăng ký tới Cloudflare Edge
docker compose logs cloudflared | Select-String "Registered tunnel connection"

# Healthcheck dùng `cloudflared tunnel ready` (image distroless không có shell)
docker compose ps cloudflared    # phải "healthy"

# Truy cập public
curl.exe -I https://journeygo.id.vn
curl.exe -I https://journeygo.id.vn/api/v1/destinations
```

## 4. Đăng ký địa chỉ callback ở bên thứ ba

| Dịch vụ | Cần đăng ký |
|---|---|
| **Google Cloud Console** | Authorized redirect URIs: `https://<domain>/oauth2/redirect`<br>Authorized JavaScript origins: `https://<domain>` |
| **VNPay (Sandbox)** | `VNPAY_IPN_URL` = `https://<domain>/api/v1/payments/ipn`<br>`VNPAY_RETURN_URL` = `https://<domain>/api/v1/payments/return-page` |
| **Cloudinary** | Whitelist domain nếu bật "Allowed domains" |

## 5. Các lệnh vận hành thường dùng

```bash
# Xem trạng thái
docker compose ps

# Xem log
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f cloudflared

# Restart 1 service (KHÔNG mất dữ liệu)
docker compose restart backend

# Deploy phiên bản mới (build + recreate, GIỮ volume)
docker compose up -d --build backend frontend
docker compose up -d --build     # toàn bộ

# Dừng (GIỮ dữ liệu)
docker compose down

# KHÔNG BAO GIỜ dùng trong quy trình deploy:
# docker compose down -v            # XOÁ toàn bộ volume ⇒ MẤT dữ liệu
```

## 6. Sao lưu & khôi phục

### 6.1. Sao lưu thủ công

```powershell
# Windows
.\scripts\backup\backup-postgres.ps1
.\scripts\backup\backup-postgres.ps1 -Retention 30
```

```bash
# Linux / GitHub Actions
./scripts/backup/backup-postgres.sh
./scripts/backup/backup-postgres.sh --retention 30 --output-dir /var/backups/journeygo
```

File backup nằm ở `backups/journeygo-journeygo_db-<timestamp>.dump` (đã gitignore).

### 6.2. Sao lưu tự động (Windows Task Scheduler)

Script tự đăng ký task chạy mỗi đêm 03:00 (tài khoản `SYSTEM` ⇒ chạy cả khi
không ai đăng nhập):

```powershell
.\scripts\backup\schedule-backup.ps1              # mặc định 03:00
.\scripts\backup\schedule-backup.ps1 -Time 02:30 # đổi giờ
```

Kiểm tra / chạy thử:

```powershell
Get-ScheduledTask -TaskName "JourneyGo - Backup PostgreSQL" | Get-ScheduledTaskInfo
Start-ScheduledTask -TaskName "JourneyGo - Backup PostgreSQL"
Get-Content backups\logs\backup.log -Tail 20
```

> ⚠️ Task chạy dưới `SYSTEM` nên không có `PATH`/`DOCKER_CONFIG` của user đăng nhập.
> Script `schedule-backup.ps1` tự truyền `-DockerBin` (đường dẫn `docker.exe`) và
> `run-backup-task.ps1` tự dùng `docker-compose.exe` standalone (bằng đường dẫn
> tuyệt đối) vì `docker compose` là CLI plugin cần plugin-discovery.
>
> Nếu Docker Desktop cài ở vị trí khác, sửa `$dockerBins` trong
> `scripts\backup\run-backup-task.ps1`.

### 6.3. Khôi phục

```powershell
# Khôi phục bản mới nhất (có xác nhận)
.\scripts\backup\restore-postgres.ps1

# Khôi phục bản cụ thể, không hỏi
.\scripts\backup\restore-postgres.ps1 -File "backups\journeygo-journeygo_db-20261117-184159.dump" -Force
```

Quy trình khôi phục: backup bản hiện tại → dừng backend/frontend → `pg_restore --clean --if-exists` → khởi động lại.

> ⚠️ Script backup **không** redirect stdout của `pg_dump` bằng `>` trong PowerShell
> (PowerShell 5.1 ghi UTF-16 ⇒ file `.dump` hỏng, `pg_restore` báo
> *"input file does not appear to be a valid archive"*).
> Script cho `pg_dump` ghi file bên trong container rồi `docker cp` ra host,
> và kiểm tra chữ ký `PGDMP` trước khi chấp nhận file backup.

### 6.4. Quy trình khôi phục sau sự cố máy chủ

1. Cài Docker Desktop + clone repo
2. `cp .env.example .env` → điền lại secrets
3. `docker compose up -d postgres redis`
4. `docker cp <file>.dump journeygo-postgres:/tmp/restore.dump`
5. `docker compose exec -T postgres pg_restore -U journeygo -d journeygo_db --clean --if-exists --no-owner --no-privileges /tmp/restore.dump`
6. `docker compose up -d`

## 7. Bảo mật

- `.env` đã được `.gitignore` ⇒ **KHÔNG BAO GIỜ commit**. Kiểm tra trước khi commit:
  `git status --short` không được hiện `.env`.
- PostgreSQL / Redis **không publish port** ra host ⇒ không thể truy cập từ Internet.
  Chỉ truy cập được trong Docker network:

```bash
docker compose exec postgres psql -U journeygo -d journeygo_db
```

- Nginx chỉ bind `127.0.0.1:8080` ⇒ không nhận traffic trực tiếp từ Internet,
  mọi request đi qua Cloudflare Tunnel (có WAF, SSL, rate-limit).
- Đổi `POSTGRES_PASSWORD` / `JWT_SECRET` nếu bị lộ. Xoá thư mục `.next` cache nếu
  `NEXT_PUBLIC_*` bị nhầm.
- **Rotate các secret đã từng commit lên Git** (xem mục 10).

## 8. Khởi động tự động (Windows)

### 8.1. Docker Desktop tự khởi động

Docker Desktop → **Settings** → **General** → tick **Start Docker Desktop when you sign in**

Hoặc chạy lệnh (áp dụng cho toàn hệ thống):

```powershell
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" `
  -Name "Docker Desktop" -Value '"C:\Program Files\Docker\Docker\Docker Desktop.exe"'
```

### 8.2. Container tự khởi động

Các service đã có `restart: unless-stopped` ⇒ Docker Desktop tự khởi động lại chúng
khi Docker Engine chạy. Kiểm tra:

```bash
docker compose ps     # tất cả "healthy"
```

### 8.3. Không cho máy ngủ

Máy đang dùng **Modern Standby (S0)** ⇒ cần tắt sleep khi cắm nguồn:

```powershell
# Xem trạng thái hiện tại
powercfg /a

# Tắt sleep (AC = cắm nguồn, DC = dùng pin)
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 0
powercfg /change hibernate-timeout-ac 0
powercfg /change hibernate-timeout-dc 0

# Tắt Fast Startup (cần cho việc khởi động lại sạch)
powercfg /h off
```

> Với laptop chạy bằng PIN, cắm sạc là bắt buộc — nếu hết PIN, Windows vẫn cho ngủ.
> Nên dùng máy desktop hoặc laptop có nguồn dự phòng (UPS).

## 9. Khôi phục khi container bị dừng đột ngột

| Tình huống | Xử lý |
|---|---|
| Container crash | `restart: unless-stopped` ⇒ Docker tự khởi động lại trong vài giây |
| Docker Desktop bị kill | Mở lại Docker Desktop ⇒ containers tự chạy |
| Máy mất điện | Bật máy ⇒ Docker Desktop tự chạy (nếu bật auto-start) ⇒ containers tự chạy |
| **Mất dữ liệu PostgreSQL** | `docker compose up -d postgres` ⇒ volume `postgres_data` giữ nguyên dữ liệu |

Kiểm tra dữ liệu còn nguyên sau khi restart:

```bash
docker compose restart postgres
docker compose exec postgres psql -U journeygo -d journeygo_db -c "select count(*) from users;"
```

## 10. Secrets đã từng bị commit lên Git — CẦN ROTATE

Các giá trị dưới đây từng nằm trong `backend/.env.example` / `mobile/.env.example`
đã được commit. Đã được thay bằng placeholder trong code, nhưng **vẫn còn trong lịch sử Git**
⇒ phải **đổi mới (rotate)** tại nguồn:

| Secret | Nơi rotate |
|---|---|
| Gmail App Password | https://myaccount.google.com/apppasswords (xoá & tạo mới) |
| Cloudinary API Secret | https://cloudinary.com/console → Settings → API Keys |
| VNPay Hash Secret / TMN Code | VNPay Merchant Admin (Sandbox) |
| Google OAuth Client Secret | Google Cloud Console → Credentials |
| JWT Secret | tự sinh mới bằng `openssl rand -base64 48` |
| Goong Maptiles / REST Key | https://account.goong.io → Keys |

Xoá lịch sử Git (nếu repo chưa public, có thể bỏ qua — nhưng nên làm):

```bash
git filter-repo --path backend/.env.example --invert-paths
git filter-repo --path mobile/.env.example --invert-paths
git push --force --mirror
```

## 11. Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách kiểm tra |
|---|---|---|
| `journeygo.id.vn` không mở | Tunnel token sai / container cloudflared restart loop | `docker compose logs cloudflared` |
| API trả 502 | Backend chưa healthy | `docker compose logs backend --tail 50` |
| Frontend trả 500 | Lỗi build-time env | `docker compose logs frontend --tail 50` |
| `401` khi gọi API | CORS sai domain | Kiểm tra `CORS_ALLOWED_ORIGINS` trong `.env` |
| WebSocket không kết nối | `WEBSOCKET_ALLOWED_ORIGINS` sai | `docker compose logs backend \| grep WebSocket` |
| Database không kết nối | Sai `POSTGRES_PASSWORD` / volume cũ | `docker compose logs postgres --tail 20` |
| Mail không gửi được | Sai App Password | `docker compose logs backend \| grep -i mail` |
| Flyway lỗi checksum | Đã sửa file migration cũ | Xem mục 12 |
| Port 5432 bị chiếm | PostgreSQL native trên Windows | `docker compose exec postgres psql ...` (không cần port) |

## 12. Ghi chú về Flyway & checksum

Các file trong `backend/src/main/resources/db/migration/` **không được sửa nội dung**
sau khi đã áp dụng lên database ⇒ Flyway sẽ báo "checksum mismatch".

Khi cần sửa migration đã chạy, hãy **tạo file migration mới** (V41, V42, ...) thay vì
sửa file cũ.

Ngoại lệ đã áp dụng trong dự án: `V5__merge_partner_provider_roles_and_rename_provider_profile.sql`
được sửa (thêm chuyển user trước khi xoá role) để sửa lỗi foreign key.
Database mới (chưa chạy V5) không bị ảnh hưởng. Nếu database của bạn đã chạy V5 với
checksum cũ, cần chạy:

```bash
docker compose exec -T postgres psql -U journeygo -d journeygo_db \
  -c "UPDATE flyway_schema_history SET checksum = <checksum_moi> WHERE version = '5';"
```

hoặc đơn giản hơn (chỉ khi chắc chắn DB đã đúng schema):

```bash
docker compose exec -T postgres psql -U journeygo -d journeygo_db \
  -c "DELETE FROM flyway_schema_history WHERE version = '5';"
docker compose restart backend
```

## 13. CI/CD với GitHub Actions Self-hosted Runner

Workflow: `.github/workflows/deploy-selfhosted.yml`

```
push/merge vào main
   └─► job "test"   (ubuntu-latest)  → mvn test + npm lint + next build
        └─► job "deploy" (self-hosted, windows, journeygo-deploy)
               ├─ kiểm tra .env tồn tại (fail sớm nếu thiếu)
               ├─ backup PostgreSQL
               ├─ docker compose build + up -d (GIỮ volume)
               ├─ chờ container healthy (tối đa 300s) → nếu fail ⇒ rollback
               └─ smoke test qua nginx
```

### 13.1. Cài self-hosted runner (một lần)

```powershell
# Cần Personal Access Token (scope: repo, workflow)
.\scripts\runner\setup-runner.ps1 -Token "ghp_xxxxxxxxxxxxxxxxxxxx"
```

Script sẽ:

1. Tải runner về `.runner\` (đã gitignore).
2. Đăng ký với repo `mlong05/journey-go`, label **`journeygo-deploy`**.
3. Cài Windows Service ⇒ runner tự chạy khi máy khởi động.

> ⚠️ Chạy Terminal với quyền **Administrator** để cài service.

### 13.2. Bảo mật

| Lớp bảo vệ | Cách thiết lập |
|---|---|
| Label riêng cho runner | `journeygo-deploy` ⇒ workflow chỉ chạy đúng runner của bạn |
| Environment protection | GitHub → Settings → Environments → `production` → tick *Required reviewers* |
| Secrets | **KHÔNG** lưu secret nào trong GitHub — mọi secret nằm trong file `.env` cục bộ (gitignored) |
| Branch protection | Settings → Branches → bảo vệ `main`, chỉ cho phép workflow chạy khi test pass |
| Quyền runner | Runner chạy với quyền user đăng nhập ⇒ không nên dùng account admin toàn quyền |

### 13.3. Deploy thủ công (không qua CI)

```powershell
# Build + backup + deploy + health-check + rollback tự động
.\scripts\deploy\deploy.ps1

# Chỉ deploy, không build lại (dùng image hiện có)
.\scripts\deploy\deploy.ps1 -SkipBuild
```

### 13.4. Xử lý khi deploy thất bại

Script `deploy.ps1` tự động:

1. **Backup trước** ⇒ luôn có đường quay lui.
2. Build thất bại ⇒ **không** recreate container ⇒ stack cũ vẫn chạy.
3. Health-check thất bại ⇒ in ra image tag cũ để rollback thủ công:

```powershell
# Sửa docker-compose.yml về tag image cũ, rồi:
docker compose up -d
```

4. Khôi phục dữ liệu nếu cần:

```powershell
.\scripts\backup\restore-postgres.ps1 -Force
```

### 13.5. Vì sao Nginx không bị 502 sau khi deploy

Nginx chỉ resolve DNS một lần lúc khởi động ⇒ sau khi container recreate (IP đổi)
sẽ trả 502. `nginx/nginx.conf` đã dùng:

```nginx
resolver 127.0.0.11 valid=10s ipv6=off;
upstream backend  { zone backend 64k;  server backend:8088  resolve; }
upstream frontend { zone frontend 64k; server frontend:3000 resolve; }
```

⇒ resolve lại IP mỗi 10 giây, không cần restart Nginx.

## 14. Kết quả kiểm thử E2E đã xác minh (2026-11-17)

Tất cả kiểm thử dưới đây đã chạy qua **Internet thật** (`https://journeygo.id.vn`):

| Hạng mục | Kết quả |
|---|---|
| DNS `journeygo.id.vn` | A → `104.21.33.76`, `172.67.160.1` (Cloudflare Edge) |
| HTTPS + SSL | HTTP 200, `ssl_verify_result=0` (cert hợp lệ) |
| HSTS | `strict-transport-security: max-age=31536000; includeSubDomains` |
| Frontend SSR `/` | 200 |
| API `/api/v1/destinations`, `/tours/published`, `/regions` | 200 |
| `/actuator/health/liveness` | 200 |
| Đăng nhập `admin@journeygo.com` | 200, JWT role `ADMIN` |
| Endpoint có auth `/api/v1/users/1` | 200 |
| OAuth2 Google | 302 → `https://accounts.google.com/...&redirect_uri=https://journeygo.id.vn/login/oauth2/code/google` |
| WebSocket `/ws` | **101 Switching Protocols** |
| Upload ảnh → Cloudinary | 200, URL `https://res.cloudinary.com/...` truy cập được |
| CORS cross-origin (`Origin: https://www.journeygo.id.vn`) | 200 + `access-control-allow-origin` đúng |
| CORS origin không hợp lệ | 403 |
| Tunnel connectors | 4 connector đăng ký tại Cloudflare Edge (SIN) qua QUIC |
| PostgreSQL / Redis | Không publish port ra host — chỉ trong Docker network |

> ℹ️ Khi `Origin` trùng với `Host` (same-origin) thì Spring **không** thêm
> `Access-Control-Allow-Origin` — đây là hành vi đúng chuẩn, browser cũng không
> cần preflight cho same-origin. Để kiểm tra CORS, dùng Origin khác
> (`https://www.journeygo.id.vn`).

