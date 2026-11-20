<#
.SYNOPSIS
    Khôi phục PostgreSQL của JourneyGo từ file backup.

.DESCRIPTION
    ⚠️ THAO TÁC NÀY GHI ĐÈ DỮ LIỆU HIỆN TẠI của database.
    Luôn tạo bản backup trước khi khôi phục (backup-postgres.ps1).

.PARAMETER File
    Đường dẫn tới file .dump cần khôi phục. Bỏ trống ⇒ dùng file backup MỚI NHẤT
    trong thư mục `backups/`.

.PARAMETER Force
    Bỏ qua bước xác nhận (dùng cho script tự động / CI).

.EXAMPLE
    # Khôi phục bản mới nhất
    .\scripts\backup\restore-postgres.ps1

    # Khôi phục bản cụ thể
    .\scripts\backup\restore-postgres.ps1 -File "backups\journeygo-journeygo_db-20261117-184159.dump"
#>
[CmdletBinding()]
param(
    [string]$File = "",
    [switch]$Force,
    # Đường dẫn tuyệt đối tới `docker-compose.exe` (standalone).
    # Dùng khi chạy dưới tài khoản SYSTEM / Task Scheduler.
    [string]$ComposeExe = ""
)

$ErrorActionPreference = "Continue"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)

# ── Xác định file backup ────────────────────────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($File)) {
    $backupDir = Join-Path $repoRoot "backups"
    $latest = Get-ChildItem -Path $backupDir -Filter "journeygo-*.dump" -File -ErrorAction SilentlyContinue |
              Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) {
        Write-Error "Không tìm thấy file backup nào trong $backupDir."
        exit 1
    }
    $File = $latest.FullName
}

if (-not (Test-Path $File)) {
    Write-Error "Không tìm thấy file backup: $File"
    exit 1
}

# ── Đọc thông tin kết nối ───────────────────────────────────────────────────────
$envFile = Join-Path $repoRoot ".env"
$envVars = @{}
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line -match "^([A-Za-z_][A-Za-z0-9_]*)=(.*)$") {
        $envVars[$matches[1]] = $matches[2].Trim()
    }
}
$dbName = if ($envVars.ContainsKey("POSTGRES_DB"))   { $envVars["POSTGRES_DB"] }   else { "journeygo_db" }
$dbUser = if ($envVars.ContainsKey("POSTGRES_USER")) { $envVars["POSTGRES_USER"] } else { "journeygo" }

Write-Host ""
Write-Host "==========================================================="
Write-Host "  KHÔI PHỤC DATABASE '$dbName'"
Write-Host "  File: $File"
Write-Host "  !!  Dữ liệu hiện tại của database SẼ BỊ GHI ĐÈ"
Write-Host "==========================================================="

if (-not $Force) {
    $answer = Read-Host "Nhập 'YES' để xác nhận khôi phục"
    if ($answer -ne "YES") {
        Write-Host "Đã huỷ."
        exit 0
    }
}

$composeFile = Join-Path $repoRoot "docker-compose.yml"

# Ưu tiên `docker-compose.exe` (standalone) nếu được truyền vào, ngược lại dùng
# `docker compose` (CLI plugin — cần plugin-discovery đúng).
if ($ComposeExe -and (Test-Path $ComposeExe)) {
    $composeExePath = $ComposeExe
    $composeArgs    = @()
} else {
    $composeExePath = "docker"
    $composeArgs    = @("compose")
}

# ── 1. Sao lưu bản hiện tại (để có thể quay lui) ────────────────────────────────
$preBackup = & (Join-Path $scriptDir "backup-postgres.ps1") -ComposeExe $ComposeExe 2>&1
Write-Host "[restore] Bản backup trước khi khôi phục:"
$preBackup | ForEach-Object { Write-Host "    $_" }

# ── 2. Dừng backend & frontend (để không có kết nối tới DB đang restore) ───────
Write-Host "[restore] Đang dừng backend + frontend..."
& $composeExePath @composeArgs -f $composeFile stop backend frontend 2>&1 | Out-Null

# ── 3. Restore ──────────────────────────────────────────────────────────────────
# File backup nằm trên HOST ⇒ copy vào container trước rồi pg_restore.
Write-Host "[restore] Đang sao chép file backup vào container..."
docker cp $File "journeygo-postgres:/tmp/restore.dump"

Write-Host "[restore] Đang khôi phục vào database '$dbName'..."
# --clean --if-exists: xoá bảng/cột cũ trước khi tạo lại từ backup.
# --no-owner --no-privileges: không phụ thuộc role/privilege có trong file dump.
$restoreCmd = "pg_restore -U `"$dbUser`" -d `"$dbName`" --clean --if-exists --no-owner --no-privileges /tmp/restore.dump"
& $composeExePath @composeArgs -f $composeFile exec -T postgres sh -c $restoreCmd

$restoreExit = $LASTEXITCODE

# Dọn file tạm trong container.
& $composeExePath @composeArgs -f $composeFile exec -T postgres rm -f /tmp/restore.dump 2>&1 | Out-Null

# ── 4. Khởi động lại backend + frontend ─────────────────────────────────────────
Write-Host "[restore] Đang khởi động lại backend + frontend..."
& $composeExePath @composeArgs -f $composeFile start backend frontend 2>&1 | Out-Null

if ($restoreExit -ne 0) {
    Write-Host ""
    Write-Warning "pg_restore trả exit code $restoreExit."
    Write-Warning "Một số lỗi có thể là do dữ liệu đã tồn tại (thường lành tính). Hãy kiểm tra:"
    Write-Warning "    docker compose exec postgres psql -U $dbUser -d $dbName -c '\dt'"
    Write-Warning "    docker compose logs backend --tail 50"
    exit $restoreExit
}

Write-Host ""
Write-Host "[restore] ✅ Khôi phục hoàn tất."
Write-Host "[restore] Kiểm tra:  docker compose ps"
Write-Host "[restore] Xem log:   docker compose logs backend --tail 50"
