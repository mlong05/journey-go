<#
.SYNOPSIS
    Cài đặt & cấu hình GitHub Actions Self-hosted Runner trên Windows cho JourneyGo.

.DESCRIPTION
    Script này:
      1. Tải runner (Windows x64) về `<repo>\.runner` (gitignored).
      2. Đăng ký runner với repo `mlong05/journey-go` (label: `journeygo-deploy`).
      3. Cài service Windows để runner tự chạy khi khởi động máy.

    ⚠️ Cần `GITHUB_TOKEN` (Personal Access Token có quyền `repo` + `workflow`).

.PARAMETER Token
    GitHub Personal Access Token để đăng ký runner.

.PARAMETER Repository
    Repo đích. Mặc định `mlong05/journey-go`.

.PARAMETER Labels
    Label bổ sung để workflow deploy chỉ chạy đúng runner này.

.EXAMPLE
    .\scripts\runner\setup-runner.ps1 -Token "ghp_xxxxxxxx"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Token,
    [string]$Repository = "mlong05/journey-go",
    [string]$RunnerName = "journeygo-pc",
    [string]$Labels = "journeygo-deploy",
    [switch]$SkipService
)

$ErrorActionPreference = "Continue"

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch { }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$runnerDir = Join-Path $repoRoot ".runner"

function Write-Step($m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "[OK] $m" -ForegroundColor Green }
function Write-Err($m)  { Write-Host "[LỖI] $m" -ForegroundColor Red }

# ── 1. Tải runner ──────────────────────────────────────────────────────────────
Write-Step "Tải GitHub Actions Runner cho Windows x64"

if (Test-Path (Join-Path $runnerDir "config.cmd")) {
    Write-Ok "Runner đã được tải về $runnerDir"
} else {
    New-Item -ItemType Directory -Force -Path $runnerDir | Out-Null
    $zip = Join-Path $env:TEMP "actions-runner-win.zip"
    $url  = "https://github.com/actions/runner/releases/latest/download/actions-runner-win-x64.zip"

    Write-Host "    Đang tải: $url"
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath $runnerDir -Force
    Remove-Item $zip -Force
    Write-Ok "Đã giải nén runner vào $runnerDir"
}

$runnerExe = Join-Path $runnerDir "run.cmd"
if (-not (Test-Path $runnerExe)) {
    Write-Err "Không tìm thấy run.cmd trong $runnerDir. Hãy tải lại thủ công."
    exit 1
}

# ── 2. Đăng ký runner ──────────────────────────────────────────────────────────
Write-Step "Đăng ký runner với repo '$Repository'"

$alreadyConfigured = Test-Path (Join-Path $runnerDir ".runner")
if (-not $alreadyConfigured) {
    Push-Location $runnerDir
    try {
        # Chạy ở chế độ không tương tác bằng cách truyền tham số trực tiếp.
        & $runnerExe config `
            --url "https://github.com/$Repository" `
            --token $Token `
            --name $RunnerName `
            --work "_work" `
            --labels $Labels `
            --runservice `
            --runasservice `
            --replace
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Đăng ký runner thất bại. Kiểm tra token & quyền (cần scope: repo, workflow)."
            exit 1
        }
    } finally {
        Pop-Location
    }
    Write-Ok "Đăng ký runner thành công (labels: $Labels)."
} else {
    Write-Ok "Runner đã được đăng ký trước đó — bỏ qua bước config."
}

# ── 3. Cài service Windows ─────────────────────────────────────────────────────
if (-not $SkipService) {
    Write-Step "Cài service Windows (tự khởi động cùng máy)"

    Push-Location $runnerDir
    try {
        # Nếu service đã tồn tại thì xoá để cài lại sạch.
        $existing = & "$env:SystemRoot\System32\sc.exe" query "actions.runner.$RunnerName" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    Service đã tồn tại — xoá để cài lại."
            & .\config.cmd remove --token $Token 2>&1 | Out-Host
        }

        & .\config.cmd service install 2>&1 | Out-Host
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Cài service thất bại. Thử chạy terminal với quyền Administrator."
            exit 1
        }

        & .\config.cmd service start 2>&1 | Out-Host
        Write-Ok "Service 'actions.runner.$RunnerName' đã cài và đang chạy."
    } catch {
        Write-Err $_.Exception.Message
        exit 1
    } finally {
        Pop-Location
    }
} else {
    Write-Host "BỎ QUA cài service. Chạy thủ công: cd .runner ; .\run.cmd"
}

Write-Host ""
Write-Host "✅ Xong. Runner đã sẵn sàng nhận job deploy." -ForegroundColor Green
Write-Host ""
Write-Host "Bước tiếp theo:"
Write-Host "  1. Vào GitHub → Settings → Actions → Runners → kiểm tra runner '$RunnerName' online."
Write-Host "  2. Settings → Environments → tạo environment 'production' (khuyến nghị bật"
Write-Host "     Required reviewers để duyệt deploy thủ công)."
Write-Host "  3. Push lên main để kích hoạt workflow 'CI/CD Self-Hosted Deploy'."
