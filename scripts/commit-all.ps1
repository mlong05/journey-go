# =====================================================================================
#  JourneyGo — Commit plan cho nhánh `feature/self-hosted-deploy-stack`
#
#  CÁCH DÙNG: mở PowerShell tại thư mục gốc repo, chạy:
#     powershell -ExecutionPolicy Bypass -File .\scripts\commit-all.ps1
#
#  Script này CHỈ tạo lệnh + chạy chúng, KHÔNG push. Bạn tự quyết định push.
#  Nếu muốn push luôn, bỏ comment dòng `git push -u origin ...` ở cuối.
# =====================================================================================

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot) -ErrorAction SilentlyContinue
if (-not (Test-Path ".git")) { Set-Location (Resolve-Path "..\..") }
Write-Host "Repo: $((Get-Location).Path)" -ForegroundColor Cyan

# ── 0. Kiểm tra trạng thái ──────────────────────────────────────────────────────
Write-Host "`n[0] Kiểm tra trạng thái repo" -ForegroundColor Yellow
git status -sb
git fetch origin

# ── 1. Chia commit theo nhóm logic ─────────────────────────────────────────────
$commits = @(
    @{
        Msg = "chore(deploy): add docker compose stack, nginx reverse proxy and env template"
        Files = @(
            ".env.example",
            "docker-compose.yml",
            "nginx/nginx.conf",
            "backend/Dockerfile",
            "frontend/Dockerfile",
            "frontend/.dockerignore",
            "frontend/next.config.mjs"
        )
    },
    @{
        Msg = "feat(backend): add dev and prod spring profiles with actuator endpoints"
        Files = @(
            "backend/pom.xml",
            "backend/src/main/resources/application.yml",
            "backend/src/main/resources/application-dev.yml",
            "backend/src/main/resources/application-prod.yml"
        )
    },
    @{
        Msg = "fix(flyway): make role merge migration safe for existing users"
        Files = @(
            "backend/src/main/java/com/journeygo/config/FlywayConfig.java",
            "backend/src/main/resources/db/migration/V5__merge_partner_provider_roles_and_rename_provider_profile.sql"
        )
    },
    @{
        Msg = "feat(ci): add self-hosted deploy workflow with backup, deploy and tunnel scripts"
        Files = @(
            ".github/workflows/deploy-selfhosted.yml",
            ".github/workflows/docker-publish.yml",
            ".gitignore",
            "docs/SELF_HOSTED_DEPLOYMENT.md",
            "scripts/backup/backup-postgres.ps1",
            "scripts/backup/backup-postgres.sh",
            "scripts/backup/restore-postgres.ps1",
            "scripts/backup/run-backup-task.ps1",
            "scripts/backup/schedule-backup.ps1",
            "scripts/cloudflare/setup-tunnel.ps1",
            "scripts/deploy/deploy.ps1",
            "scripts/runner/setup-runner.ps1",
            "scripts/commit-all.ps1"
        )
    },
    @{
        Msg = "feat(backend): seed wizard tours, sample bookings and transactions on first run"
        Files = @(
            "backend/src/main/java/com/journeygo/config/DataInitializer.java"
        )
    },
    @{
        Msg = "fix(backend): attribute gross revenue to wizard tour owner provider profile"
        Files = @(
            "backend/src/main/java/com/journeygo/modules/providerrevenue/service/ProviderRevenueService.java"
        )
    },
    @{
        Msg = "chore(mobile): externalize api base url and third-party keys to env config"
        Files = @(
            "mobile/.env.example",
            "mobile/lib/core/constants/api_constants.dart"
        )
    },
    @{
        Msg = "chore(config): update backend env template for mail server and profile settings"
        Files = @(
            "backend/.env.example"
        )
    }
)

$i = 0
foreach ($c in $commits) {
    $i++
    Write-Host "`n[$i] $($c.Msg)" -ForegroundColor Yellow

    # Chỉ add những file thực sự tồn tại & thay đổi.
    $existing = @($c.Files | Where-Object { Test-Path $_ })
    if ($existing.Count -eq 0) {
        Write-Host "    (bỏ qua — không có file nào thay đổi)" -ForegroundColor DarkGray
        continue
    }

    git add -- $existing
    if ($LASTEXITCODE -ne 0) { throw "git add thất bại ở nhóm $i" }

    # Nếu không có gì thực sự staged ⇒ bỏ qua nhóm này.
    $staged = @(git diff --cached --name-only)
    if ($staged.Count -eq 0) {
        Write-Host "    (bỏ qua — không có thay đổi nào để commit)" -ForegroundColor DarkGray
        continue
    }

    git commit -m $c.Msg
    if ($LASTEXITCODE -ne 0) { throw "git commit thất bại ở nhóm $i" }
}

# ── 2. Kiểm tra còn sót file nào chưa commit ────────────────────────────────────
Write-Host "`n[2] File chưa commit còn lại (đều phải là file rác — KHÔNG commit)" -ForegroundColor Yellow
$left = @(git status --short --untracked-files=all)
if ($left.Count -eq 0) {
    Write-Host "    (sạch — không còn gì)" -ForegroundColor Green
} else {
    $left | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
}

# ── 3. Tổng kết ────────────────────────────────────────────────────────────────
Write-Host "`n[3] Lịch sử commit vừa tạo" -ForegroundColor Yellow
git log --oneline -8

Write-Host "`nHoàn tất. Kiểm tra lại rồi tự push:" -ForegroundColor Green
Write-Host "    git status -sb"
Write-Host "    git push -u origin feature/self-hosted-deploy-stack"
