<#
.SYNOPSIS
    Wrapper cho Task Scheduler: chạy backup PostgreSQL và ghi log ra file.

.DESCRIPTION
    Task Scheduler gọi file này (thay vì dùng `-Command` inline dài dòng dễ vỡ
    do quoting). Mọi output — kể cả lỗi — được ghi vào `backups\logs\backup.log`
    bằng UTF-8 để dễ tra cứu.
#>
[CmdletBinding()]
param(
    # Đường dẫn thư mục chứa `docker.exe`. Bắt buộc khi chạy từ Task Scheduler
    # với tài khoản SYSTEM (không có PATH của user đang đăng nhập).
    [string]$DockerBin = ""
)

$ErrorActionPreference = "Continue"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$logDir    = Join-Path $repoRoot "backups\logs"
$logFile   = Join-Path $logDir "backup.log"
$backupPs1 = Join-Path $scriptDir "backup-postgres.ps1"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# ── Bổ sung Docker CLI vào PATH ─────────────────────────────────────────────────
# Task Scheduler chạy với tài khoản SYSTEM ⇒ KHÔNG có sẵn PATH của user đang
# đăng nhập (Docker Desktop cài per-user ở %LOCALAPPDATA%\Programs\DockerDesktop).
# Nếu không bổ sung, script sẽ lỗi "docker is not recognized".
#
# ⚠️ Ngoài `resources\bin` (chứa docker.exe) còn PHẢI thêm `resources` —
# Docker CLI tìm plugin `compose` trong `<mỗi thư mục trong PATH>\cli-plugins`.
# Thiếu nó ⇒ `docker compose` bị parse thành `docker -f ...` ⇒ lỗi
# "unknown shorthand flag: 'f' in -f".
$dockerBins = @()
if ($DockerBin) {
    $dockerBins += $DockerBin
    # Thư mục cha của `bin` — chứa `cli-plugins\docker-compose.exe`.
    $dockerBins += (Split-Path -Parent $DockerBin)
}
$dockerBins += @(
    (Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\resources\bin"),
    (Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\resources"),
    (Join-Path $env:ProgramFiles "Docker\Docker\resources\bin"),
    (Join-Path $env:ProgramFiles "Docker\Docker\resources"),
    "C:\Program Files\Docker\Docker\resources\bin",
    "C:\Program Files\Docker\Docker\resources"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

foreach ($bin in $dockerBins) {
    if ($env:PATH -notlike "*$bin*") {
        $env:PATH = "$bin;$env:PATH"
    }
}

# DOCKER_CONFIG mặc định trỏ về profile của SYSTEM ⇒ mất `config.json` và
# `cli-plugins` của user đang đăng nhập. Trỏ về thư mục .docker thật nếu có.
$userDockerCfg = Join-Path $repoRoot ".docker"
if (Test-Path $userDockerCfg) {
    $env:DOCKER_CONFIG = $userDockerCfg
}

# ⚠️ QUAN TRỌNG: `docker compose` là CLI PLUGIN, được Docker CLI tìm trong
# `<DOCKER_CONFIG>\cli-plugins` và `<mỗi thư mục trong PATH>\cli-plugins`.
# Dưới tài khoản SYSTEM cả hai vị trí đều sai ⇒ `docker compose -f ...` bị
# parse thành `docker -f ...` ⇒ lỗi "unknown shorthand flag: 'f' in -f".
#
# Giải pháp: dùng `docker-compose.exe` (bản standalone) bằng ĐƯỜNG DẪN TUYỆT ĐỐI
# ⇒ không phụ thuộc plugin discovery.
$composeExe = $null
$composeCandidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\resources\cli-plugins\docker-compose.exe"),
    (Join-Path $env:ProgramFiles "Docker\Docker\resources\cli-plugins\docker-compose.exe"),
    "C:\Program Files\Docker\Docker\resources\cli-plugins\docker-compose.exe"
)
foreach ($c in $composeCandidates) {
    if (Test-Path $c) { $composeExe = $c; break }
}
if (-not $composeExe) {
    # Cuối cùng: tìm trong .docker/cli-plugins của các profile user trên máy.
    $profileRoot = Split-Path -Parent $env:SystemDrive
    $profileRoot = $env:SystemDrive + "\Users"
    foreach ($prof in (Get-ChildItem $profileRoot -Directory -ErrorAction SilentlyContinue)) {
        $c = Join-Path $prof.FullName ".docker\cli-plugins\docker-compose.exe"
        if (Test-Path $c) { $composeExe = $c; break }
    }
}

function Write-Log($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

Write-Log "=== Bắt đầu backup (PID $PID) ==="

try {
    if ($composeExe) {
        Write-Log "Compose: $composeExe"
        $output = & $backupPs1 -ComposeExe $composeExe 2>&1
    } else {
        Write-Log "Compose: docker compose (plugin discovery)"
        $output = & $backupPs1 2>&1
    }
    foreach ($line in $output) { Write-Log ([string]$line) }
    if ($LASTEXITCODE -eq 0) {
        Write-Log "=== Backup thành công ==="
        exit 0
    } else {
        Write-Log "=== Backup thất bại (exit code $LASTEXITCODE) ==="
        exit $LASTEXITCODE
    }
} catch {
    Write-Log "=== LỖI KHÔNG MONG ĐỢI: $($_.Exception.Message) ==="
    exit 1
}
