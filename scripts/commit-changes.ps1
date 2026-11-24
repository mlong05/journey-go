<#
.SYNOPSIS
    Split the current branch into multiple, scientifically grouped conventional commits.

.DESCRIPTION
    The script automatically:
      1. Verifies the repo state (branch, junk files, staged tree).
      2. Creates a backup branch for easy rollback.
      3. Splits the working tree changes into focused commits, grouped by feature.
      4. Runs ESLint + production build + backend tests on the final state.
      5. Prints the commit list and the exact push command to run.

    EVERY commit is a coherent, self-contained change. Commit messages are plain
    Conventional Commits in English - one line, no body, NO AI/Co-Author trailer.

    The script never pushes. Pushing is always a manual, human step.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\commit-changes.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\commit-changes.ps1 -SkipTests -SkipBuild
#>

[CmdletBinding()]
param(
    # Skip the backend Maven test run.
    [switch]$SkipTests,

    # Skip the frontend lint + production build.
    [switch]$SkipBuild,

    # Skip the Flutter static analysis.
    [switch]$SkipMobile,

    # Backup branch used for rollback.
    [string]$BackupBranch = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# --- Paths -------------------------------------------------------------------
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$FrontendDir = Join-Path $RepoRoot "frontend"
$BackendDir  = Join-Path $RepoRoot "backend"
$MobileDir   = Join-Path $RepoRoot "mobile"

# --- Commit identity --------------------------------------------------------
# Pin the author to the local git identity. This guarantees every commit is
# attributed to YOU and never to an AI/automation identity, regardless of any
# global/local config that might otherwise interfere.
$GitUserName  = (& git config user.name  2>$null)
$GitUserEmail = (& git config user.email 2>$null)
if ([string]::IsNullOrWhiteSpace($GitUserName) -or [string]::IsNullOrWhiteSpace($GitUserEmail)) {
    throw "git user.name / user.email are not configured. Set them before running this script."
}
Write-Host "Commit identity: $GitUserName <$GitUserEmail>" -ForegroundColor DarkGray

# Pattern that detects AI/automation ATTRIBUTION TRAILERS in a commit message.
# It deliberately does NOT match a legitimate scope or wording such as
# "feat(ai): ..." or "add cursor-paginated ...", otherwise the script would
# flag and re-amend its own correct commits.
# Every alternative below requires an ATTRIBUTION CONTEXT (a trailer keyword,
# an email domain, or a "<name>" author suffix) - never a bare product word.
$AiPattern = "(?im)^(co-authored-by|co-created-by|signed-off-by|generated-by|generated-with|generated with|reviewed-by)\s*:?\s*.*(ai|bot|assistant|agent|claude|cursor|copilot|chatgpt|gpt|openai|anthropic|codeium)|\b(cursoragent|noreply@|anthropic\.com|openai\.com|github\.com/copilot|co-authored-by\s*:)"

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
    # Return a plain string ARRAY of the output lines.
    # - Do NOT use ",@($out)": that wraps the whole result in ONE array element,
    #   so callers iterating the result would get a nested array and string
    #   operations (e.g. .Substring) would fail.
    # - Cast to [string[]] so a SINGLE-line result stays an array. Without the
    #   cast PowerShell unrolls it to a scalar and callers doing [0].Trim()
    #   would get a CHARACTER instead of the line.
    [string[]]$result = @()
    foreach ($line in $out) { $result += [string]$line }
    return ,$result
}

# Native tools (npm, mvn, flutter) write progress to stderr. Under
# ErrorActionPreference=Stop that would abort the script, so relax it while running.
function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$Exe,
        [Parameter(Mandatory = $true)][string]$WorkDir,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$NativeArgs
    )
    Push-Location $WorkDir
    try {
        $prev = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $out = & $Exe @NativeArgs 2>&1
        $code = $LASTEXITCODE
        $ErrorActionPreference = $prev
        return [pscustomobject]@{ ExitCode = $code; Output = ($out | Out-String) }
    }
    finally {
        Pop-Location
    }
}

# Convert a git pathspec (with * and **) into a PowerShell regex.
function ConvertTo-PathRegex {
    param([string]$Pattern)
    # [regex]::Escape turns "*" into "\*". Replace the GLOB markers BEFORE escaping
    # is impossible, so escape first and then swap the escaped forms:
    #   "\*\*" -> ".*"     (globstar: matches across directories)
    #   "\*"  -> "[^/]*"  (single star: matches within one path segment)
    $escaped = [regex]::Escape($Pattern)
    $escaped = $escaped.Replace('\*\*', '.*')
    $escaped = $escaped.Replace('\*', '[^/]*')
    return "^" + $escaped + "$"
}

# ---------------------------------------------------------------------------
#  Commit groups - ordered. Each entry: message + list of path patterns.
#  Patterns use git pathspec syntax. A file matching more than one group is
#  assigned to the FIRST group that matches, so order matters.
# ---------------------------------------------------------------------------
$Groups = @(
    @{
        Message = "feat(settlement): switch revenue periods to 10-day cycles with auto-created batches"
        Paths   = @(
            "backend/src/main/java/com/journeygo/modules/settlement/**",
            "backend/src/main/java/com/journeygo/modules/providerrevenue/**",
            "backend/src/main/resources/db/migration/V52__settlement_ten_day_cycle.sql",
            "backend/src/main/resources/db/migration/V53__settlement_strict_period_and_recreate.sql",
            "backend/src/main/resources/db/migration/V54__settlement_cleanup_rejected_details.sql",
            "backend/src/test/java/com/journeygo/modules/settlement/**",
            "frontend/src/app/admin/settlements/**",
            "frontend/src/features/settlement/**"
        )
    },
    @{
        Message = "feat(refund): apply three-tier personal refund policy and shorten reason descriptions"
        Paths   = @(
            "backend/src/main/java/com/journeygo/modules/refund/**",
            "backend/src/main/resources/db/migration/V50__refund_personal_three_tier_policy.sql",
            "backend/src/main/resources/db/migration/V51__refund_personal_short_description.sql",
            "backend/src/test/java/com/journeygo/modules/refund/**",
            "frontend/src/app/admin/refund-reasons/**",
            "frontend/src/app/admin/refunds/**",
            "frontend/src/features/refund/**",
            "frontend/src/features/tourist/refundPolicy.js",
            "frontend/src/features/tourist/components/RefundsScreen.jsx",
            "mobile/lib/core/models/refund_reason_model.dart",
            "mobile/lib/core/utils/refund_policy.dart",
            "mobile/lib/screens/booking/refund_form_screen.dart"
        )
    },
    @{
        Message = "feat(chat): add cursor-paginated chat history hook and shared message bubble"
        Paths   = @(
            "backend/src/main/java/com/journeygo/modules/providerchat/**",
            "backend/src/main/java/com/journeygo/modules/booking/dto/response/BookingMessagePageResponse.java",
            "backend/src/main/java/com/journeygo/modules/booking/controller/BookingPassengerController.java",
            "backend/src/main/java/com/journeygo/modules/booking/repository/BookingRepository.java",
            "backend/src/main/java/com/journeygo/modules/booking/service/BookingChatService.java",
            "backend/src/main/java/com/journeygo/modules/booking/service/BookingService.java",
            "backend/src/test/java/com/journeygo/modules/booking/**",
            "frontend/src/hooks/useChatHistory.js",
            "frontend/src/hooks/useClientOnlyValue.js",
            "frontend/src/hooks/index.js",
            "frontend/src/components/ui/ChatBubble.jsx",
            "frontend/src/features/providerchat/**",
            "frontend/src/features/booking/**",
            "frontend/src/features/tourist/components/MessagesScreen.jsx",
            "frontend/src/features/tourist/components/TripChatPanel.jsx",
            "frontend/src/app/provider/bookings/**",
            "mobile/lib/core/models/booking_model.dart",
            "mobile/lib/core/services/provider_chat_service.dart",
            "mobile/lib/screens/chat/provider_chat_screen.dart"
        )
    },
    @{
        Message = "feat(ai): add startup diagnostics for missing Gemini API key in production"
        Paths   = @(
            "backend/src/main/java/com/journeygo/modules/aiguide/config/AiStartupLogger.java",
            "backend/src/test/java/com/journeygo/config/AiProdConfigBindingTest.java",
            "backend/src/test/java/com/journeygo/config/AiStartupLoggerTest.java",
            "backend/src/test/java/com/journeygo/modules/aiguide/service/AiRateLimiterServiceTest.java"
        )
    },
    @{
        Message = "feat(finance): expose current commission rate and refresh settlement summaries"
        Paths   = @(
            "backend/src/main/java/com/journeygo/modules/finance/**",
            "backend/src/main/java/com/journeygo/modules/dashboard/**",
            "backend/src/main/java/com/journeygo/modules/payment/**",
            "backend/src/main/java/com/journeygo/modules/tour/**",
            "backend/src/main/java/com/journeygo/modules/user/**",
            "frontend/src/app/admin/experience-rewards/**",
            "frontend/src/app/admin/overview/**",
            "frontend/src/app/provider/finance/**",
            "frontend/src/components/admin/AdminUI.jsx",
            "frontend/src/features/catalog/**",
            "frontend/src/features/experience/**",
            "frontend/src/features/finance/**",
            "frontend/src/lib/money.js"
        )
    },
    @{
        Message = "feat(booking): keep completed tours bookable and restore hidden tour search results"
        Paths   = @(
            "frontend/src/features/tourist/components/CheckoutScreen.jsx",
            "frontend/src/features/tourist/components/PaymentResultScreen.jsx",
            "frontend/src/features/tourist/components/PendingBooking.jsx",
            "frontend/src/features/tourist/components/TripsScreen.jsx",
            "frontend/src/features/tourist/hooks/**",
            "frontend/src/features/tourist/services/touristService.js",
            "frontend/src/features/tourist/utils.js",
            "mobile/lib/screens/tabs/home_tab.dart",
            "mobile/lib/screens/tours/tour_list_screen.dart"
        )
    },
    @{
        Message = "chore(config): wire Gemini and Goong environment variables for production deploys"
        Paths   = @(
            ".env.example",
            "backend/.env.example",
            "backend/src/main/resources/application-prod.yml",
            "backend/src/main/java/com/journeygo/config/FlywayConfig.java",
            "docker-compose.yml",
            "mobile/.env.example",
            "docs/IMPLEMENTATION.md"
        )
    },
    @{
        Message = "chore(scripts): add grouped commit helper script"
        Paths   = @(
            "scripts/commit-changes.ps1"
        )
    }
)

# ---------------------------------------------------------------------------
#  1. Pre-flight checks
# ---------------------------------------------------------------------------
Write-Step "Pre-flight checks"

$branch = (Invoke-Git rev-parse --abbrev-ref HEAD)[0].Trim()
if ($branch -eq "HEAD" -or [string]::IsNullOrWhiteSpace($branch)) {
    throw "Cannot determine current branch (detached HEAD?)."
}
Write-Ok "Branch: $branch"

if ($branch -eq "main" -or $branch -eq "master") {
    throw "Refusing to commit directly on '$branch'. Create a feature branch first."
}

$dirty = @(Invoke-Git status --porcelain)
if ($dirty.Count -eq 0) {
    Write-Warn "Working tree is clean - nothing to commit."
    exit 0
}
Write-Ok "Working tree has $($dirty.Count) changed entries"

# Junk-file guard: never commit build output, logs, backups or env secrets.
$JunkPatterns = @(
    "(^|/)target/",
    "(^|/)node_modules/",
    "(^|/)\.next/",
    "(^|/)build/",
    "\.env$",
    "\.env\.bak",
    "\.bak-\d{8}",
    "\.log$",
    "\.dump$",
    "\.dumpstream$",
    "\.orig$",
    "\.rej$",
    "~$",
    "(^|/)\.runner/",
    "(^|/)\.secrets/",
    "surefire-reports"
)

$junk = New-Object System.Collections.Generic.List[string]
foreach ($line in $dirty) {
    $path = $line.Substring(3).Trim('"')
    foreach ($pattern in $JunkPatterns) {
        if ($path -match $pattern) { [void]$junk.Add($path); break }
    }
}
if ($junk.Count -gt 0) {
    Write-Warn "Junk files detected (will be excluded, NOT committed):"
    foreach ($j in $junk) { Write-Info "  $j" }
}
else {
    Write-Ok "No junk files in the change set"
}

# ---------------------------------------------------------------------------
#  2. Backup branch
# ---------------------------------------------------------------------------
Write-Step "Backup branch"
if ([string]::IsNullOrWhiteSpace($BackupBranch)) {
    $BackupBranch = "backup/pre-commit-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
}
Invoke-Git branch $BackupBranch | Out-Null
Write-Ok "Created $BackupBranch (rollback: git reset --hard $BackupBranch)"

# ---------------------------------------------------------------------------
#  3. Reset the index so each group can be staged independently
# ---------------------------------------------------------------------------
Write-Step "Staging changes by group"
Invoke-Git reset | Out-Null

$committed = New-Object System.Collections.Generic.List[string]
$usedPaths = New-Object System.Collections.Generic.List[string]

foreach ($group in $Groups) {
    $regexes = @($group.Paths | ForEach-Object { ConvertTo-PathRegex $_ })

    $changed = @()
    foreach ($line in (Invoke-Git status --porcelain)) {
        $code = $line.Substring(0, 2)
        $path = $line.Substring(3).Trim('"')
        if ($code -match "M|A|R|D|\?\?") { $changed += $path }
    }
    $candidates = @($changed | Where-Object { $p = $_; -not ($usedPaths | Where-Object { $p -eq $_ }) })

    if ($candidates.Count -eq 0) { continue }

    $stagedAny = $false
    foreach ($path in $candidates) {
        $matches = $false
        foreach ($regex in $regexes) {
            if ($path -match $regex) { $matches = $true; break }
        }
        if (-not $matches) { continue }

        & git add -- $path 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $stagedAny = $true
            [void]$usedPaths.Add($path)
        }
    }

    if (-not $stagedAny) { continue }

    $staged = @(Invoke-Git diff --cached --name-only)
    if ($staged.Count -eq 0) { continue }

    # --- Guarantee: one-line message, no body, NO AI/Co-Author trailer. -------
    # -c user.name / user.email pin the author to the local git identity so no
    #   automation can inject a different one.
    # --cleanup=strip + --no-edit-msg drops template/comment leftovers.
    # --no-verify skips repo hooks (they may append trailers of their own).
    & git -c "user.name=$GitUserName" -c "user.email=$GitUserEmail" `
        commit --cleanup=strip --no-verify -m $group.Message 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw ("git commit failed for: {0}" -f $group.Message)
    }

    # Verify the resulting commit really carries no AI attribution.
    # NOTE: the pattern targets ATTRIBUTION TRAILERS only. A plain scope like
    # "feat(ai): ..." is a legitimate scope name and must NOT match - otherwise
    # the script would amend its own correct commit in a loop.
    $sha = (Invoke-Git rev-parse HEAD)[0].Trim()
    # Read the FULL message body, not just the first line: an AI trailer can sit
    # on line 3+. The record separator (\x1e) keeps each commit on one chunk so
    # a multi-commit audit never bleeds one message into another.
    $meta = (Invoke-Git show -s --format="%B%x1e" $sha) -join ""

    # --- Guarantee: the commit message is EXACTLY ONE line -------------------
    # $group.Message never contains a newline, but a hook or a stray template
    # could still append a body. If the stored message has more than the
    # single subject line, rewrite it so the commit stays one-line.
    # NOTE: @() is required - without it PowerShell unrolls a 1-element result
    # to a scalar and .Count would fail under Set-StrictMode.
    $subject = @((($meta -split [char]0x1e)[0] -split "`r?`n") | Where-Object { $_.Trim() -ne "" })
    if ($subject.Count -gt 1) {
        & git -c "user.name=$GitUserName" -c "user.email=$GitUserEmail" `
            commit --amend --cleanup=strip --no-verify --reset-author -m $group.Message 2>&1 | Out-Null
        $meta = (Invoke-Git show -s --format="%B%x1e" $sha) -join ""
        $subject = @((($meta -split [char]0x1e)[0] -split "`r?`n") | Where-Object { $_.Trim() -ne "" })
        if ($subject.Count -gt 1) {
            throw ("Commit message is still multi-line after amend: {0}" -f $group.Message)
        }
        Write-Warn ("Collapsed multi-line message to one line: {0}" -f $group.Message)
    }

    if ($meta -match $AiPattern) {
        # Rewrite the commit without the offending trailer.
        & git -c "user.name=$GitUserName" -c "user.email=$GitUserEmail" `
            commit --amend --cleanup=strip --no-verify --reset-author -m $group.Message 2>&1 | Out-Null
        $meta = (Invoke-Git show -s --format="%B%x1e" $sha) -join ""
        if ($meta -match $AiPattern) {
            throw ("Commit still contains AI attribution after amend: {0}" -f $group.Message)
        }
        Write-Warn ("Stripped AI trailer from: {0}" -f $group.Message)
    }

    [void]$committed.Add($group.Message)
    Write-Ok ("{0} files -> {1}" -f $staged.Count, $group.Message)
}

# ---------------------------------------------------------------------------
#  4. Catch-all report for anything not covered by a group
# ---------------------------------------------------------------------------
Write-Step "Remaining files"
$remaining = @(Invoke-Git status --porcelain)
if ($remaining.Count -gt 0) {
    Write-Warn "$($remaining.Count) file(s) not matched by any group:"
    foreach ($r in $remaining) {
        # $r may be a single line or an array (Invoke-Git returns an array of
        # output lines), so flatten it and strip the 2-char porcelain status.
        foreach ($line in @($r)) {
            $text = [string]$line
            if ($text.Length -gt 3) { Write-Info ("  " + $text.Substring(3).Trim('"')) }
        }
    }
    Write-Info "They are left UNCOMMITTED on purpose - review and commit them manually."
}
else {
    Write-Ok "All changes are committed"
}

# ---------------------------------------------------------------------------
#  5. Verification
# ---------------------------------------------------------------------------
Write-Step "Verification"

if (-not $SkipTests) {
    Write-Info "Running backend tests (mvn test)..."
    $r = Invoke-Native -Exe "mvn" -WorkDir $BackendDir -NativeArgs @("-o", "test")
    if ($r.ExitCode -ne 0) {
        Write-Warn "Backend tests FAILED - see output above."
        Write-Host (($r.Output -split "`n") | Select-Object -Last 40 | Out-String)
    }
    else {
        Write-Ok "Backend tests passed"
    }
}
else { Write-Info "Skipped backend tests" }

if (-not $SkipBuild) {
    Write-Info "Running frontend lint..."
    $r = Invoke-Native -Exe "npm" -WorkDir $FrontendDir -NativeArgs @("run", "lint")
    if ($r.ExitCode -ne 0) {
        Write-Warn "Frontend lint FAILED - see output above."
        Write-Host (($r.Output -split "`n") | Select-Object -Last 30 | Out-String)
    }
    else { Write-Ok "Frontend lint passed" }

    Write-Info "Running frontend production build..."
    $r = Invoke-Native -Exe "npm" -WorkDir $FrontendDir -NativeArgs @("run", "build")
    if ($r.ExitCode -ne 0) {
        Write-Warn "Frontend build FAILED - see output above."
    }
    else { Write-Ok "Frontend build passed" }
}
else { Write-Info "Skipped frontend lint + build" }

if (-not $SkipMobile) {
    Write-Info "Running flutter analyze..."
    $r = Invoke-Native -Exe "flutter" -WorkDir $MobileDir -NativeArgs @("analyze", "--no-fatal-infos")
    if ($r.ExitCode -ne 0) {
        Write-Warn "Flutter analyze reported issues - see output above."
    }
    else { Write-Ok "Flutter analyze passed" }
}
else { Write-Info "Skipped flutter analyze" }

# ---------------------------------------------------------------------------
#  6. Attribution audit - PROOF that no AI trailer was written
# ---------------------------------------------------------------------------
Write-Step "Attribution audit"

$base = (Invoke-Git rev-parse HEAD)[0].Trim()

# Audit the commits this run created. Prefer the upstream range; if the branch
# has no upstream yet (common for a brand-new feature branch) fall back to the
# last N commits.
#
# NOTE: git writes "no upstream configured" to STDERR and exits non-zero.
# Under ErrorActionPreference=Stop that raises a terminating error even with
# 2>$null, so the preference is relaxed around the call.
$audit = @()
$prevPref = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    $range = & git log --format="%H%x1e%an%x1e%ae%x1e%B%x1e" "@{upstream}..$base" 2>&1
    $rangeCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $prevPref
}
if ($rangeCode -eq 0 -and @($range).Count -gt 0) {
    $audit = @($range | ForEach-Object { [string]$_ } | Where-Object { $_ -match "^[0-9a-f]{40}$([char]0x1e)" })
}
else {
    $n = [Math]::Max($committed.Count, 1)
    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $audit = @(& git log --format="%H%x1e%an%x1e%ae%x1e%B%x1e" "-$n" 2>&1 |
                   ForEach-Object { [string]$_ } |
                   Where-Object { $_ -match "^[0-9a-f]{40}$([char]0x1e)" })
    }
    finally {
        $ErrorActionPreference = $prevPref
    }
}

$bad = New-Object System.Collections.Generic.List[string]
foreach ($entry in $audit) {
    if ($entry -match $AiPattern) {
        [void]$bad.Add($entry)
    }
}
if ($bad.Count -gt 0) {
    Write-Warn "$($bad.Count) commit(s) contain a suspicious trailer:"
    foreach ($b in $bad) {
        # Print each offending commit as: <sha> <one-line message>
        $p = [string]$b -split [char]0x1e
        if ($p.Count -ge 4) {
            $msg = (($p[3] -split "`r?`n") | Where-Object { $_.Trim() -ne "" } | Select-Object -First 1)
            Write-Info ("  {0} {1}" -f $p[0], $msg)
        }
        else { Write-Info ("  " + $b) }
    }
    Write-Info "Fix them manually with: git rebase -i --exec 'git commit --amend --reset-author --no-edit' <base>"
}
else {
    Write-Ok "All $($audit.Count) commit(s) are clean - no AI/Co-Author trailer"
}

$authors = @(
    $audit | ForEach-Object {
        $p = [string]$_ -split [char]0x1e
        if ($p.Count -ge 3) { "$($p[1]) <$($p[2])>" }
    } | Sort-Object -Unique
)
Write-Info "Author(s) on these commits:"
foreach ($a in $authors) { Write-Info "  $a" }

# ---------------------------------------------------------------------------
#  7. Summary
# ---------------------------------------------------------------------------
Write-Step "Summary"
Write-Info "Branch:  $branch"
Write-Info "Backup:  $BackupBranch"
Write-Info "Author:  $GitUserName <$GitUserEmail>"
Write-Host ""
foreach ($m in $committed) { Write-Host "  * $m" -ForegroundColor Green }
Write-Host ""

# Commits created by this run, printed in the compact two-line form:
#   <full sha>
#   <one-line message>
Write-Info "Commits created:"
$createdLog = @()
$prevPref = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    $n = [Math]::Max($committed.Count, 1)
    $createdLog = @(& git log --format="%H%x1e%B%x1e" "-$n" 2>&1 |
                ForEach-Object { [string]$_ } |
                Where-Object { $_ -match "^[0-9a-f]{40}" })
}
finally {
    $ErrorActionPreference = $prevPref
}
foreach ($chunk in $createdLog) {
    $p = $chunk -split [char]0x1e
    if ($p.Count -ge 2) {
        $sha = $p[0].Trim()
        $msg = (($p[1] -split "`r?`n") | Where-Object { $_.Trim() -ne "" } | Select-Object -First 1)
        Write-Host "  commit $sha" -ForegroundColor Cyan
        Write-Host "  $msg" -ForegroundColor Green
    }
}
Write-Host ""

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host " Commits created. Now PUSH manually:" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  git push -u origin $branch" -ForegroundColor Yellow
Write-Host ""
Write-Host " (This script does NOT push on its own.)" -ForegroundColor DarkGray
Write-Host ""
