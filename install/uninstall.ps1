$ErrorActionPreference = "Stop"
$WebDir = $env:JELLYFIN_WEB_DIR
if (-not $WebDir) {
    $Candidates = @(
        "C:\Program Files\Jellyfin\Server\jellyfin-web",
        "C:\Program Files (x86)\Jellyfin\Server\jellyfin-web",
        "C:\ProgramData\Jellyfin\Server\jellyfin-web"
    )
    foreach ($Candidate in $Candidates) {
        if (Test-Path (Join-Path $Candidate "index.html")) { $WebDir = $Candidate; break }
    }
}
$Index = if ($WebDir) { Join-Path $WebDir "index.html" } else { $null }
if (-not $WebDir -or -not (Test-Path $Index)) { throw "Jellyfin web introuvable." }
$Html = Get-Content $Index -Raw -Encoding UTF8
$Html = [regex]::Replace($Html, '<link[^>]*data-lumo-theme[^>]*>\s*', '', 'IgnoreCase')
$Html = [regex]::Replace($Html, '<script[^>]*data-noctafin-(?:config|home)[^>]*></script>\s*', '', 'IgnoreCase')
Set-Content -Path $Index -Value $Html -Encoding UTF8
$Ui = Join-Path $WebDir "ui"
Remove-Item (Join-Path $Ui "noctafin-config.js") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $Ui "noctafin-home.js") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $Ui "noctafin-assets") -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $Ui "lumo") -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Lumo supprimé. Retire aussi tout ancien @import Lumo/NoctaFin du CSS personnalisé." -ForegroundColor Green
