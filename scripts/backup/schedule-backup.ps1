<#
.SYNOPSIS
    Cài Task Scheduler Windows để backup PostgreSQL tự động hàng ngày.

.DESCRIPTION
    Tạo task "JourneyGo - Backup PostgreSQL" chạy lúc 03:00 mỗi ngày,
    gọi `scripts\backup\backup-postgres.ps1`. Task chạy dù đang đăng xuất
    (không cần user đăng nhập) và ghi log vào `backups\logs\`.

.PARAMETER Time
    Giờ chạy. Định dạng HH:mm. Mặc định 03:00.

.EXAMPLE
    .\scripts\backup\schedule-backup.ps1
    .\scripts\backup\schedule-backup.ps1 -Time 02:30
#>
[CmdletBinding()]
param(
    [string]$Time = "03:00"
)

$ErrorActionPreference = "Continue"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)

$taskName   = "JourneyGo - Backup PostgreSQL"
# Wrapper riêng (run-backup-task.ps1) thay vì `-Command` inline — chuỗi inline
# dài dễ vỡ do quoting và không ghi được log.
$runnerPs1  = Join-Path $scriptDir "run-backup-task.ps1"
$logDir     = Join-Path $repoRoot "backups\logs"
$logFile    = Join-Path $logDir "backup.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Action: chạy PowerShell ẩn cửa sổ với file wrapper.
# `-DockerBin` truyền path của docker.exe — bắt buộc vì task chạy dưới SYSTEM
# (không có PATH của user đang đăng nhập).
$dockerExe = (Get-Command docker -ErrorAction SilentlyContinue).Source
$dockerBin = if ($dockerExe) { Split-Path -Parent $dockerExe } else { "" }

$argument = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$runnerPs1`""
if ($dockerBin) {
    $argument += " -DockerBin `"$dockerBin`""
}

Write-Host "==> Đăng ký Task Scheduler '$taskName' (chạy lúc $Time mỗi ngày)"

$action  = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument $argument `
    -WorkingDirectory $repoRoot

$trigger = New-ScheduledTaskTrigger -Daily -At $Time

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopIfGoingOnBatteries `
    -AllowStartIfOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5)

# Chạy với quyền cao nhất có thể (không cần admin nếu user hiện tại đã admin).
$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Backup PostgreSQL JourneyGo hàng ngày (pg_dump -Fc) vào thư mục backups\." `
        -Force | Out-Null

    Write-Host "[OK] Task '$taskName' đã được đăng ký." -ForegroundColor Green
    Write-Host ""
    Write-Host "Kiểm tra:"
    Write-Host "  Get-ScheduledTask -TaskName '$taskName' | Get-ScheduledTaskInfo"
    Write-Host "  Chạy thử ngay: Start-ScheduledTask -TaskName '$taskName'"
    Write-Host "  Log: $logFile"
} catch {
    Write-Host "[LỖI] Không đăng ký được task: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Thử chạy Terminal với quyền Administrator, hoặc đăng ký thủ công:"
    Write-Host "  schtasks /Create /TN `"$taskName`" /TR `"powershell -NoProfile -ExecutionPolicy Bypass -File `"$runnerPs1`"` /SC DAILY /ST $Time /RL HIGHEST /F"
    exit 1
}
