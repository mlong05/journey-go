<#
.SYNOPSIS
    Deploy JourneyGo lên Docker Compose trên máy chủ (self-hosted runner).

.DESCRIPTION
    Quy trình deploy an toàn, KHÔNG mất dữ liệu PostgreSQL:

      1. Kiểm tra môi trường (.env, Docker, image cũ).
      2. BACKUP PostgreSQL trước khi đụng vào container.
      3. `docker compose build` — build image mới (backend + frontend).
      4. `docker compose up -d` — recreate container với image mới.
         ⚠️ KHÔNG dùng `down -v` ⇒ named volume `postgres_data` được giữ nguyên.
      5. Health-check: đợi backend/frontend/nginx báo healthy.
      6. Nếu health-check thất bại ⇒ ROLLBACK về image tag cũ (nếu có) và báo lỗi.

.PARAMETER SkipBuild
    Bỏ qua bước build (dùng image đã có sẵn).

.PARAMETER SkipBackup
    Bỏ qua bước backup (KHÔNG khuyến nghị).

.EXAMPLE
    .\scripts\deploy\deploy.ps1
    .\scripts\deploy\deploy.ps1 -SkipBuild
#>
[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [switch]$SkipBackup
)

# `Continue` (không phải `Stop`): Docker CLI ghi thông tin ra STDERR (ví dụ
# "Container ... Running") và PowerShell 5.1 sẽ coi đó là terminating error
# nếu ErrorActionPreference = Stop. Mọi lỗi thật đều được kiểm tra bằng
# $LASTEXITCODE ngay sau mỗi lệnh docker.
$ErrorActionPreference = "Continue"

# Xuất UTF-8 cho console để hiển thị đúng tiếng Việt trong log CI.
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch { }

# ── Xác định thư mục gốc repo ───────────────────────────────────────────────────
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
Set-Location $repoRoot

$compose = Join-Path $repoRoot "docker-compose.yml"
$envFile = Join-Path $repoRoot ".env"

function Write-Step($msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "[LỖI] $msg" -ForegroundColor Red }

# ── 1. Kiểm tra môi trường ─────────────────────────────────────────────────────
Write-Step "Kiểm tra môi trường"

if (-not (Test-Path $envFile)) {
    Write-Err "Không tìm thấy .env tại $repoRoot. Deploy cần file .env có sẵn (gitignored)."
    exit 1
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Err "Không tìm thấy lệnh 'docker'. Hãy cài Docker Desktop và mở terminal trong Docker context."
    exit 1
}
docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Err "'docker compose' không hoạt động. Hãy mở Docker Desktop rồi thử lại."
    exit 1
}
Write-Ok "Docker + Compose sẵn sàng."

# Docker daemon có chạy không?
$daemonUp = $false
try {
    docker info --format "{{.ServerVersion}}" 2>$null | Out-Null
    $daemonUp = ($LASTEXITCODE -eq 0)
} catch { $daemonUp = $false }
if (-not $daemonUp) {
    Write-Err "Docker Engine không phản hồi. Hãy khởi động Docker Desktop rồi chạy lại."
    exit 1
}
Write-Ok "Docker Engine đang chạy."

# ── 2. Ghi nhận image hiện tại (để rollback) ────────────────────────────────────
$currentImages = @{}
foreach ($svc in @("backend", "frontend")) {
    $cid = (docker compose ps -q $svc 2>$null)
    if ($cid) {
        $img = docker inspect --format "{{.Config.Image}}" $cid 2>$null
        if ($img) { $currentImages[$svc] = $img }
    }
}
if ($currentImages.Count -gt 0) {
    Write-Ok "Image hiện tại (để rollback): $($currentImages.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" })"
}

# ── 3. BACKUP trước khi deploy ─────────────────────────────────────────────────
if (-not $SkipBackup) {
    Write-Step "Backup PostgreSQL trước khi deploy"
    & (Join-Path $scriptDir "..\backup\backup-postgres.ps1")
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Backup thất bại ⇒ DỪNG deploy (không deploy khi chưa có bản sao lưu)."
        exit 1
    }
    Write-Ok "Backup hoàn tất."
} else {
    Write-Step "BỎ QUA backup (theo yêu cầu)"
}

# ── 4. Build ────────────────────────────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Step "Build image mới (backend + frontend)"
    $ErrorActionPreference = "SilentlyContinue"
    docker compose -f $compose build --pull 2>&1 | Out-Host
    $buildExit = $LASTEXITCODE
    $ErrorActionPreference = "Continue"
    if ($buildExit -ne 0) {
        Write-Err "Build thất bại ⇒ stack cũ vẫn đang chạy, không có thay đổi nào."
        exit 1
    }
    Write-Ok "Build thành công."
} else {
    Write-Step "BỎ QUA build (dùng image có sẵn)"
}

# ── 5. Triển khai ───────────────────────────────────────────────────────────────
Write-Step "Triển khai container mới (KHÔNG dùng down -v ⇒ volume được giữ nguyên)"

# Docker Compose ghi trạng thái ("Container ... Running/Healthy") ra STDERR.
# PowerShell 5.1 render stderr của native command thành NativeCommandError.
# Tạm hạ ErrorActionPreference xuống SilentlyContinue để các dòng thông tin
# này hiển thị bình thường; lỗi thật vẫn được bắt qua $LASTEXITCODE.
$ErrorActionPreference = "SilentlyContinue"
docker compose -f $compose up -d --remove-orphans 2>&1 | Out-Host
$exitCode = $LASTEXITCODE
$ErrorActionPreference = "Continue"

if ($exitCode -ne 0) {
    Write-Err "'docker compose up -d' thất bại (exit code $exitCode)."
    exit 1
}

# ── 6. Health-check ─────────────────────────────────────────────────────────────
Write-Step "Chờ các container healthy (tối đa 300s)"
$deadline = (Get-Date).AddSeconds(300)
$healthy  = $false

while ((Get-Date) -lt $deadline) {
    $rows = docker compose ps --format "{{.Service}}|{{.Health}}|{{.State}}" 2>$null
    $bad  = @()
    foreach ($row in $rows) {
        if (-not $row) { continue }
        $parts = $row -split "\|"
        $svc = $parts[0]
        $hlth = if ($parts.Count -gt 1) { $parts[1] } else { "" }
        $state = if ($parts.Count -gt 2) { $parts[2] } else { "" }

        # cloudflared không có healthcheck ⇒ chỉ coi là OK khi đang chạy (running).
        # Trạng thái "restarting" xảy ra khi tunnel token chưa được cấu hình —
        # KHÔNG nên chặn deploy (phần còn lại của stack vẫn hoạt động bình thường).
        if ($svc -eq "cloudflared") {
            if ($state -eq "exited" -or $state -eq "dead") { $bad += "$svc($state)" }
            continue
        }
        if ($hlth -eq "healthy") { continue }
        if ($state -eq "exited" -or $state -eq "dead") { $bad += "$svc($state)" }
        else { $bad += "$svc($hlth)" }
    }

    if ($bad.Count -eq 0) {
        $healthy = $true
        break
    }
    Write-Host "    Đang chờ: $($bad -join ', ')"
    Start-Sleep -Seconds 5
}

if (-not $healthy) {
    Write-Err "Health-check thất bại trong 300s."

    # ── ROLLBACK ───────────────────────────────────────────────────────────────
    if ($currentImages.Count -gt 0) {
        Write-Step "ROLLBACK về image cũ"
        foreach ($svc in $currentImages.Keys) {
            Write-Host "    → $svc = $($currentImages[$svc])"
        }
        Write-Host "    (Hãy đặt lại tag image trong docker-compose.yml về bản cũ rồi chạy lại deploy.)"
        docker compose -f $compose up -d 2>&1 | Out-Host
        docker compose ps | Out-Host
        Write-Err "Rollback đã được khởi động. Kiểm tra log: docker compose logs -f backend"
    }
    exit 1
}

Write-Ok "Tất cả container đã healthy."

# ── 7. Smoke test qua nginx nội bộ ─────────────────────────────────────────────
Write-Step "Smoke test qua nginx (127.0.0.1:8080)"
$checks = @(
    @{ path = "/";                              expect = 200 },
    @{ path = "/api/v1/destinations";           expect = 200 },
    @{ path = "/actuator/health/liveness";      expect = 200 }
)
$failed = $false
foreach ($c in $checks) {
    $code = curl.exe -s -o NUL -w "%{http_code}" -m 20 "http://127.0.0.1:8080$($c.path)" 2>$null
    if ($code -eq "$($c.expect)") {
        Write-Ok "$($c.path) → $code"
    } else {
        Write-Err "$($c.path) → $code (mong đợi $($c.expect))"
        $failed = $true
    }
}

docker compose ps | Out-Host

if ($failed) {
    Write-Err "Smoke test thất bại sau khi deploy."
    exit 1
}

Write-Host ""
Write-Host "✅ DEPLOY THÀNH CÔNG — JourneyGo đang chạy phiên bản mới." -ForegroundColor Green
exit 0
