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
if (-not $WebDir) { throw "Jellyfin web introuvable." }
$Index = Join-Path $WebDir "index.html"
$Html = Get-Content $Index -Raw -Encoding UTF8
$Html = [regex]::Replace($Html, '<script[^>]*data-noctafin-(?:config|home)[^>]*></script>\s*', '', 'IgnoreCase')
Set-Content -Path $Index -Value $Html -Encoding UTF8
Remove-Item (Join-Path $WebDir "ui\noctafin-config.js") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $WebDir "ui\noctafin-home.js") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $WebDir "ui\noctafin-assets") -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Injection Lumo supprimée." -ForegroundColor Green
