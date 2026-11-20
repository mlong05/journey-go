<#
.SYNOPSIS
    Split the current branch into multiple, scientifically grouped conventional commits.

.DESCRIPTION
    The script automatically:
      1. Verifies the repo state (branch, pre-staged files, junk files).
      2. Creates a backup branch for easy rollback.
      3. Splits the working tree changes into 6 focused commits.
      4. Runs ESLint after every commit so no commit introduces lint errors.
      5. Runs a full Next.js production build on the final state.
      6. Prints the commit list and the exact push command to run.

    Every commit represents a coherent, self-contained change.
    Rollback with:  git reset --hard backup/pre-commit-split-20261121

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\commit-split.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\commit-split.ps1 -SkipLint -SkipBuild
#>

[CmdletBinding()]
param(
    # Skip ESLint verification after each commit.
    [switch]$SkipLint,

    # Skip the final production build.
    [switch]$SkipBuild,

    # Run the production build after EVERY commit instead of only at the end.
    [switch]$BuildEachCommit,

    # Branch to work on. Default: current branch.
    [string]$Branch = "",

    # Backup branch used for rollback.
    [string]$BackupBranch = "backup/pre-commit-split-20261121"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# --- Paths -------------------------------------------------------------------
$RepoRoot    = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$FrontendDir = Join-Path $RepoRoot "frontend"
$StatesDir   = Join-Path $RepoRoot ".commit-split\states"

$PathOverviewHeader  = "frontend/src/app/admin/overview/OverviewHeader.jsx"
$PathCheckoutScreen = "frontend/src/features/tourist/components/CheckoutScreen.jsx"
$PathTouristShell   = "frontend/src/features/tourist/components/TouristShell.jsx"
$PathOverviewDir    = "frontend/src/app/admin/overview"
$PathAdminPage      = "frontend/src/app/admin/page.jsx"

# --- Helpers -----------------------------------------------------------------
function Write-Step { param([string]$m) Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok   { param([string]$m) Write-Host "    OK   $m" -ForegroundColor Green }
function Write-Warn { param([string]$m) Write-Host "    WARN $m" -ForegroundColor Yellow }
function Write-Info { param([string]$m) Write-Host "         $m" -ForegroundColor DarkGray }

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    $out = & git @GitArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ("git {0} failed:`n{1}" -f ($GitArgs -join " "), ($out -join "`n"))
    }
    return ,@($out)
}

function Get-GitLines {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    $out = & git @GitArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ("git {0} failed:`n{1}" -f ($GitArgs -join " "), ($out -join "`n"))
    }
    $lines = New-Object System.Collections.Generic.List[string]
    foreach ($line in $out) {
        $t = [string]$line
        if (-not [string]::IsNullOrWhiteSpace($t)) { [void]$lines.Add($t.Trim()) }
    }
    return ,$lines.ToArray()
}

# Native tools (npm) write warnings to stderr. Under ErrorActionPreference=Stop those
# would abort the script, so temporarily relax it while running them.
function Invoke-Npm {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$NpmArgs)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $out = & npm @NpmArgs 2>&1
        return ,@($out)
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Copy-State {
    param([string]$StateFile, [string]$TargetRelPath)
    $src = Join-Path $StatesDir $StateFile
    if (-not (Test-Path $src)) { throw ("Missing state file: {0}" -f $src) }
    Copy-Item $src (Join-Path $RepoRoot $TargetRelPath) -Force
}

function Test-Lint {
    if ($SkipLint) { Write-Info "lint skipped (-SkipLint)"; return }
    Push-Location $FrontendDir
    try {
        $out = Invoke-Npm run lint
        $code = $LASTEXITCODE
        if ($code -ne 0) {
            Write-Host ($out | Select-Object -Last 25) -ForegroundColor Red
            throw "ESLint reported errors (exit code $code)."
        }
        Write-Ok "ESLint: no errors"
    } finally { Pop-Location }
}

function Test-Build {
    if ($SkipBuild) { Write-Info "build skipped (-SkipBuild)"; return }
    Push-Location $FrontendDir
    try {
        $out = Invoke-Npm run build
        $code = $LASTEXITCODE
        if ($code -ne 0) {
            Write-Host ($out | Select-Object -Last 35) -ForegroundColor Red
            throw "Production build failed (exit code $code)."
        }
        Write-Ok "Next.js production build succeeded"
    } finally { Pop-Location }
}

function New-Commit {
    param([string]$Message, [string[]]$Files)

    $gitArgs = @("add", "--") + $Files
    Invoke-Git @gitArgs | Out-Null

    $staged = Get-GitLines diff --cached --name-only
    if (-not $staged) { throw ("Nothing staged for commit: {0}" -f $Message) }

    Invoke-Git commit -m $Message | Out-Null
    $hash = (Get-GitLines rev-parse --short HEAD)[-1]
    Write-Ok ("{0}  {1}" -f $hash, $Message)
    foreach ($f in $staged) { Write-Info "+ $f" }
}

# --- Step 0: environment -----------------------------------------------------
Write-Step "Checking environment"

if (-not (Test-Path $StatesDir)) {
    throw ("Missing states directory: {0}" -f $StatesDir)
}

$currentBranch = (Get-GitLines branch --show-current)[-1]
if ([string]::IsNullOrWhiteSpace($currentBranch)) {
    throw "Detached HEAD. Check out a branch before running this script."
}
Write-Info "current branch: $currentBranch"

if ($Branch -and ($Branch -ne $currentBranch)) {
    Write-Info "switching to branch: $Branch"
    Invoke-Git switch $Branch | Out-Null
    $currentBranch = $Branch
}

if (Get-GitLines branch --list $BackupBranch) {
    Write-Info "backup branch already exists, keeping it: $BackupBranch"
} else {
    Invoke-Git branch $BackupBranch | Out-Null
    Write-Ok "created backup branch: $BackupBranch"
}

$preStaged = Get-GitLines diff --cached --name-only
if ($preStaged) {
    Write-Warn "unstaging pre-existing staged changes:"
    foreach ($f in $preStaged) { Write-Info "- $f" }
    Invoke-Git reset | Out-Null
}

# --- Step 1: junk file sweep --------------------------------------------------
Write-Step "Scanning for junk files (these are never committed)"

$junkRelPaths = @(
    "frontend/public/_ref-design.png",
    "frontend/public/_ref-view.html"
)
foreach ($rel in $junkRelPaths) {
    $abs = Join-Path $RepoRoot $rel
    if (Test-Path $abs) {
        $stash = Join-Path $env:TEMP ("jg-junk-" + [System.IO.Path]::GetFileName($rel) + ".bak")
        Move-Item $abs $stash -Force
        Write-Info "moved out of repo: $rel -> $stash"
    }
}

$untracked = Get-GitLines status --porcelain --untracked-files=all
$junkUntracked = @()
foreach ($line in $untracked) {
    if ($line -match "^\?\? " -and $line -notmatch "\.commit-split") {
        $junkUntracked += $line.Substring(3)
    }
}
if ($junkUntracked.Count -gt 0) {
    Write-Info "untracked files present (only explicitly named paths get staged):"
    foreach ($f in $junkUntracked) { Write-Info "? $f" }
} else {
    Write-Ok "no stray untracked files"
}

# --- Step 2: the commits ------------------------------------------------------

# Idempotency guard: if the commits already exist on this branch, the split has
# already been performed. Do not duplicate them.
$existingCommits = Get-GitLines log --oneline "origin/main..HEAD"
if ($existingCommits.Count -gt 0) {
    Write-Step "Existing commits detected on this branch"
    foreach ($l in $existingCommits) { Write-Host "    $l" -ForegroundColor Gray }
    Write-Host ""
    Write-Warn "This branch already contains commits relative to origin/main."
    Write-Warn "Re-running would duplicate them. Nothing was changed."
    Write-Host ""
    Write-Host "  If you still want to redo the split, run:" -ForegroundColor Yellow
    Write-Host "    git reset --hard $BackupBranch" -ForegroundColor White
    Write-Host "    powershell -ExecutionPolicy Bypass -File .\scripts\commit-split.ps1" -ForegroundColor White
    Write-Host ""
    exit 0
}

Write-Step "Commit 1/6 - reusable tooltip component + business glossary"
New-Commit `
    -Message "feat(frontend): add reusable hover tooltip and business glossary for operations overview" `
    -Files @(
        "frontend/src/app/admin/overview/Hint.jsx",
        "frontend/src/app/admin/overview/glossary.js"
    )
Test-Lint
if ($BuildEachCommit) { Test-Build }

Write-Step "Commit 2/6 - sticky overview header, drop redundant pillar summary"
Copy-State "OverviewHeader.sticky-only.jsx" $PathOverviewHeader
New-Commit `
    -Message "refactor(admin): pin operations overview header and remove redundant pillar summary" `
    -Files @($PathOverviewHeader)
Test-Lint
if ($BuildEachCommit) { Test-Build }

Write-Step "Commit 3/6 - hover glossary tooltips across the operations overview"
Copy-State "OverviewHeader.final.jsx" $PathOverviewHeader
New-Commit `
    -Message "feat(admin): add hover glossary tooltips across operations overview metrics" `
    -Files @(
        $PathOverviewDir,
        $PathAdminPage
    )
Test-Lint
if ($BuildEachCommit) { Test-Build }

Write-Step "Commit 4/6 - wider two-column checkout layout, full payment summary"
Copy-State "CheckoutScreen.layout-only.jsx" $PathCheckoutScreen
New-Commit `
    -Message "feat(frontend): widen checkout layout and keep payment summary fully visible" `
    -Files @($PathCheckoutScreen)
Test-Lint
if ($BuildEachCommit) { Test-Build }

Write-Step "Commit 5/6 - identity document acknowledgement + default gender"
Copy-State "CheckoutScreen.final.jsx" $PathCheckoutScreen
New-Commit `
    -Message "feat(booking): require identity document acknowledgement before checkout payment" `
    -Files @($PathCheckoutScreen)
Test-Lint
if ($BuildEachCommit) { Test-Build }

Write-Step "Commit 6/6 - tourist header alignment (logo / nav / auth)"
Copy-State "TouristShell.final.jsx" $PathTouristShell
New-Commit `
    -Message "feat(frontend): align tourist header logo navigation and auth actions to viewport edges" `
    -Files @($PathTouristShell)
Test-Lint

Write-Step "Final production build"
Test-Build

# --- Step 3: report -----------------------------------------------------------
Write-Step "Result"

$log = Get-GitLines log --oneline "origin/main..HEAD"
foreach ($l in $log) { Write-Host "    $l" -ForegroundColor Gray }

$leftover = Get-GitLines status --porcelain
if ($leftover) {
    Write-Host ""
    Write-Warn "uncommitted changes remain:"
    foreach ($l in $leftover) { Write-Info $l }
} else {
    Write-Host ""
    Write-Ok "working tree is clean - ready to push"
}

Write-Host ""
Write-Host "  Done. Now push it yourself:" -ForegroundColor Cyan
Write-Host "    git push -u origin $currentBranch" -ForegroundColor White
Write-Host ""
Write-Host "  Rollback if needed:" -ForegroundColor DarkGray
Write-Host "    git reset --hard $BackupBranch" -ForegroundColor DarkGray
Write-Host ""
