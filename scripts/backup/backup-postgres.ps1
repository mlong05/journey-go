<#
.SYNOPSIS
    Sao lưu PostgreSQL của JourneyGo (container Docker Compose).

.DESCRIPTION
    Tạo file backup dạng custom-format (.dump) trong thư mục `backups/`.
    Dùng `pg_dump -Fc` ⇒ có thể khôi phục với `pg_restore`, nén tốt, hỗ trợ
    restore song song (parallel restore).

    Đây là CÁCH SAO LƯU ĐÚNG cho Docker Compose:
    `pg_dump` chạy BÊN TRONG container postgres ⇒ không cần cài pg_dump trên Windows.

.PARAMETER Retention
    Số ngày giữ lại các bản backup cũ. Các file cũ hơn sẽ bị xoá. Mặc định 14.

.PARAMETER OutputDir
    Thư mục lưu backup. Mặc định `<repo>\backups`.

.EXAMPLE
    .\scripts\backup\backup-postgres.ps1
    .\scripts\backup\backup-postgres.ps1 -Retention 30
#>
[CmdletBinding()]
param(
    [int]$Retention = 14,
    [string]$OutputDir = "",
    # Đường dẫn tuyệt đối tới `docker-compose.exe` (standalone).
    # Bắt buộc khi chạy dưới tài khoản SYSTEM (Task Scheduler) vì `docker compose`
    # là CLI plugin cần plugin-discovery, còn SYSTEM không có DOCKER_CONFIG/PATH
    # của user đang đăng nhập.
    [string]$ComposeExe = ""
)

$ErrorActionPreference = "Stop"

# ── Xác định thư mục gốc repo (script nằm ở <repo>\scripts\backup\) ─────────────
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot   = Split-Path -Parent (Split-Path -Parent $scriptDir)

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $repoRoot "backups"
}
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
}

# ── Đọc thông tin kết nối từ .env gốc ────────────────────────────────────────────
$envFile = Join-Path $repoRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Error "Không tìm thấy file .env ở $repoRoot. Hãy tạo từ .env.example trước."
    exit 1
}

$envVars = @{}
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line -match "^([A-Za-z_][A-Za-z0-9_]*)=(.*)$") {
        $envVars[$matches[1]] = $matches[2].Trim()
    }
}

$dbName   = if ($envVars.ContainsKey("POSTGRES_DB"))   { $envVars["POSTGRES_DB"] }   else { "journeygo_db" }
$dbUser   = if ($envVars.ContainsKey("POSTGRES_USER")) { $envVars["POSTGRES_USER"] } else { "journeygo" }

# ── Chọn cách gọi Compose ───────────────────────────────────────────────────────
# Ưu tiên `docker-compose.exe` (standalone) nếu được truyền vào, ngược lại dùng
# `docker compose` (CLI plugin — chỉ hoạt động khi DOCKER_CONFIG/PATH đúng).
if ($ComposeExe -and (Test-Path $ComposeExe)) {
    $composeExePath = $ComposeExe
    $composeArgs    = @()
} else {
    $composeExePath = "docker"
    $composeArgs    = @("compose")
}

# ── Kiểm tra container postgres có đang chạy ─────────────────────────────────────
$container = & $composeExePath @composeArgs -f (Join-Path $repoRoot "docker-compose.yml") ps --status running --services 2>$null |
             Where-Object { $_ -eq "postgres" }
if (-not $container) {
    Write-Error "Container 'postgres' không chạy. Hãy chạy 'docker compose up -d' trước."
    exit 1
}

# ── Tạo file backup ─────────────────────────────────────────────────────────────
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName  = "journeygo-$dbName-$timestamp.dump"
$filePath  = Join-Path $OutputDir $fileName

Write-Host "[backup] Đang sao lưu database '$dbName' (user: $dbUser)..."
Write-Host "[backup] File đích: $filePath"

# ⚠️ KHÔNG redirect stdout của `pg_dump` ra file bằng `>` trong PowerShell:
# PowerShell 5.1 ghi output của native command theo encoding UTF-16 (BOM FF FE)
# ⇒ file .dump bị hỏng và `pg_restore` không đọc được ("input file does not
# appear to be a valid archive").
#
# Giải pháp: cho `pg_dump` ghi file BÊN TRONG container (binary thuần),
# rồi `docker cp` ra host ⇒ byte-for-byte chính xác.
$tmpFile = "$filePath.partial"
$dumpCmd = "pg_dump -U `"$dbUser`" -d `"$dbName`" --format=custom --no-owner --no-privileges --clean --if-exists"
$containerTmp = "/tmp/journeygo-backup.dump"

# Xoá file tạm cũ (nếu có) để tránh dùng nhầm bản cũ.
& docker exec journeygo-postgres rm -f $containerTmp 2>$null | Out-Null

& $composeExePath @composeArgs -f (Join-Path $repoRoot "docker-compose.yml") exec -T postgres `
    sh -c "$dumpCmd > $containerTmp"
if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump thất bại (exit code $LASTEXITCODE)."
    exit 1
}

# Copy ra host (giữ nguyên binary).
& docker cp "journeygo-postgres:$containerTmp" $tmpFile 2>$null | Out-Null
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $tmpFile)) {
    Write-Error "docker cp thất bại — không lấy được file backup từ container."
    exit 1
}

# Dọn file tạm trong container.
& docker exec journeygo-postgres rm -f $containerTmp 2>$null | Out-Null

$size = (Get-Item $tmpFile).Length
if ($size -lt 1024) {
    Remove-Item $tmpFile -ErrorAction SilentlyContinue
    Write-Error "File backup quá nhỏ ($size bytes) — có thể đã lỗi. Đã xoá file tạm."
    exit 1
}

# Kiểm tra chữ ký file custom-format của PostgreSQL: "PGDMP".
# Nếu sai ⇒ file bị hỏng (encoding/redirect) ⇒ KHÔNG được lưu lại.
$magic = [System.Text.Encoding]::ASCII.GetString([System.IO.File]::ReadAllBytes($tmpFile)[0..4])
if ($magic -ne "PGDMP") {
    Remove-Item $tmpFile -ErrorAction SilentlyContinue
    Write-Error "File backup không hợp lệ (magic='$magic', cần 'PGDMP') — đã xoá file hỏng."
    exit 1
}

Move-Item $tmpFile $filePath -Force
Write-Host ("[backup] ✅ Hoàn tất: {0} ({1:N2} MB)" -f $fileName, ($size / 1MB))

# ── Dọn backup cũ theo retention ────────────────────────────────────────────────
$cutoff = (Get-Date).AddDays(-$Retention)
$old = Get-ChildItem -Path $OutputDir -Filter "journeygo-$dbName-*.dump" -File -ErrorAction SilentlyContinue |
       Where-Object { $_.LastWriteTime -lt $cutoff }

if ($old) {
    foreach ($f in $old) {
        Write-Host "[backup] Xoá bản cũ: $($f.Name)"
        Remove-Item $f.FullName -Force
    }
} else {
    Write-Host "[backup] Không có bản backup cũ nào cần xoá."
}

Write-Host "[backup] Số bản backup hiện có: $((Get-ChildItem -Path $OutputDir -Filter 'journeygo-*.dump' -File).Count)"
