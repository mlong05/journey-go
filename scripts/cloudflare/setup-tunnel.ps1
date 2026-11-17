<#
.SYNOPSIS
    Lấy Cloudflare Tunnel token + đăng ký DNS cho JourneyGo.

.DESCRIPTION
    Quy trình 2 bước, chạy trên máy Windows:

      Bước 1 — `cloudflared login` (mở trình duyệt, bạn đăng nhập Cloudflare
                và bấm "Authorize") ⇒ tạo file `cert.pem` trong `%USERPROFILE%\.cloudflared`.

      Bước 2 — `cloudflared tunnel token <TUNNEL_ID>` ⇒ in ra token dạng
                "eyJhIjoi..." dùng cho biến `CLOUDFLARE_TUNNEL_TOKEN`.

      Bước 3 (tuỳ chọn) — `cloudflared tunnel route dns <TUNNEL_ID> <hostname>`
                tạo CNAME trỏ về tunnel (chỉ hoạt động nếu zone nằm trong Cloudflare).

    Script tự động điền token vào file `.env` (KHÔNG in token ra màn hình/log).

.PARAMETER TunnelId
    UUID của tunnel (lấy ở Zero Trust → Networks → Tunnels).

.PARAMETER Hostname
    Public hostname, ví dụ `journeygo.id.vn`.

.PARAMETER SkipRouteDns
    Bỏ qua bước tạo CNAME (dùng khi DNS do nhà cung cấp khác quản lý).

.EXAMPLE
    .\scripts\cloudflare\setup-tunnel.ps1 -TunnelId "69029562-7567-4f58-ac76-aaec8ed04892" -Hostname "journeygo.id.vn"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$TunnelId,
    [Parameter(Mandatory = $true)][string]$Hostname,
    [switch]$SkipRouteDns
)

$ErrorActionPreference = "Continue"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent (Split-Path -Parent $scriptDir)
$envFile   = Join-Path $repoRoot ".env"
$certDir   = Join-Path $env:USERPROFILE ".cloudflared"
$certPem   = Join-Path $certDir "cert.pem"

function Write-Step($m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "[OK] $m" -ForegroundColor Green }
function Write-Err($m)  { Write-Host "[LỖI] $m" -ForegroundColor Red }

# ── Chuẩn bị thư mục cloudflared ────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path $certDir | Out-Null

# ── Bước 1: login (mở trình duyệt) ─────────────────────────────────────────────
if (-not (Test-Path $certPem)) {
    Write-Step "Bước 1/3 — Đăng nhập Cloudflare (trình duyệt sẽ mở)"
    Write-Host "    1. Chọn domain `cloudflare.com` trong form."
    Write-Host "    2. Đăng nhập tài khoản Cloudflare của bạn."
    Write-Host "    3. Bấm nút Authorize."
    Write-Host "    (Nếu trình duyệt không tự mở, copy URL trong log ra trình duyệt.)"
    Write-Host ""

    docker run --rm -it `
        -v "${certDir}:/home/nonroot/.cloudflared" `
        --entrypoint cloudflared `
        cloudflare/cloudflared:latest `
        login

    if (-not (Test-Path $certPem)) {
        Write-Err "Không tìm thấy cert.pem sau khi login ⇒ hãy thử lại."
        exit 1
    }
    Write-Ok "Đăng nhập thành công (cert.pem đã tạo)."
} else {
    Write-Ok "Đã có cert.pem — bỏ qua bước đăng nhập."
}

# ── Bước 2: lấy token của tunnel ────────────────────────────────────────────────
Write-Step "Bước 2/3 — Lấy token của tunnel $TunnelId"

$token = (docker run --rm `
    -v "${certDir}:/home/nonroot/.cloudflared" `
    --entrypoint cloudflared `
    cloudflare/cloudflared:latest `
    tunnel token $TunnelId 2>&1) -join "" -split "`n" | ForEach-Object { $_.Trim() } |
    Where-Object { $_ -match "^eyJ" } | Select-Object -First 1

if (-not $token) {
    Write-Err "Không lấy được token. Kiểm tra Tunnel ID có đúng không."
    Write-Host "    Thử kiểm tra danh sách tunnel:"
    Write-Host "    docker run --rm -v `"${certDir}:/home/nonroot/.cloudflared`" --entrypoint cloudflared cloudflare/cloudflared:latest tunnel list"
    exit 1
}
Write-Ok "Đã lấy được token (dài $($token.Length) ký tự) — KHÔNG hiển thị giá trị."

# ── Bước 2b: ghi token vào .env ─────────────────────────────────────────────────
if (-not (Test-Path $envFile)) {
    Write-Err "Không tìm thấy .env tại $repoRoot."
    exit 1
}

$content = Get-Content $envFile -Encoding UTF8
$newContent = @()
$replaced = $false
foreach ($line in $content) {
    if ($line -match "^CLOUDFLARE_TUNNEL_TOKEN=") {
        $newContent += "CLOUDFLARE_TUNNEL_TOKEN=$token"
        $replaced = $true
    } else {
        $newContent += $line
    }
}
if (-not $replaced) {
    $newContent += "CLOUDFLARE_TUNNEL_TOKEN=$token"
}
[IO.File]::WriteAllLines($envFile, $newContent, [Text.UTF8Encoding]::new($false))
Write-Ok "Đã ghi CLOUDFLARE_TUNNEL_TOKEN vào .env (file này được .gitignore)."

# ── Bước 3: tạo CNAME trỏ về tunnel ────────────────────────────────────────────
if (-not $SkipRouteDns) {
    Write-Step "Bước 3/3 — Tạo DNS record trỏ về tunnel"
    docker run --rm `
        -v "${certDir}:/home/nonroot/.cloudflared" `
        --entrypoint cloudflared `
        cloudflare/cloudflared:latest `
        tunnel route dns $TunnelId $Hostname

    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Đã tạo CNAME $Hostname → $TunnelId.cfargotunnel.com"
        Write-Host ""
        Write-Host "    Nếu domain KHÔNG nằm trong Cloudflare (DNS do nhà cung cấp khác"
        Write-Host "    quản lý), bạn phải tự tạo CNAME tại nhà cung cấp DNS đó:"
        Write-Host ""
        Write-Host "      Type   : CNAME"
        Write-Host "      Name   : $Hostname"
        Write-Host "      Value  : $TunnelId.cfargotunnel.com"
        Write-Host "      Proxy  : (nếu có tuỳ chọn này)"
    } else {
        Write-Host ""
        Write-Warning "Không tạo được CNAME tự động (thường do domain không nằm trong Cloudflare)."
        Write-Host "  Hãy tự tạo CNAME tại nhà cung cấp DNS hiện tại của domain:"
        Write-Host ""
        Write-Host "      Type   : CNAME"
        Write-Host "      Name   : $Hostname"
        Write-Host "      Value  : $TunnelId.cfargotunnel.com"
    }
} else {
    Write-Step "BỎ QUA bước tạo DNS (theo yêu cầu)"
    Write-Host "  Nhớ tạo CNAME: $Hostname → $TunnelId.cfargotunnel.com"
}

Write-Host ""
Write-Host "==> Bước tiếp theo: khởi động lại container cloudflared" -ForegroundColor Cyan
Write-Host "    cd `"$repoRoot`""
Write-Host "    docker compose up -d cloudflared"
Write-Host "    docker compose logs -f cloudflared"
