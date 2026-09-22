$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
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

if (-not $WebDir -or -not (Test-Path (Join-Path $WebDir "index.html"))) {
    throw "Jellyfin web introuvable. Définis JELLYFIN_WEB_DIR puis relance le script."
}

$Ui = Join-Path $WebDir "ui"
New-Item -ItemType Directory -Path $Ui -Force | Out-Null
Copy-Item (Join-Path $Root "scripts\noctafin-config.js") (Join-Path $Ui "noctafin-config.js") -Force
Copy-Item (Join-Path $Root "scripts\noctafin-home.js") (Join-Path $Ui "noctafin-home.js") -Force

$Index = Join-Path $WebDir "index.html"
$Html = Get-Content $Index -Raw -Encoding UTF8
$Html = [regex]::Replace($Html, '<script[^>]*data-noctafin-(?:config|home)[^>]*></script>\s*', '', 'IgnoreCase')
$Block = "<script src=`"ui/noctafin-config.js`" data-noctafin-config></script>`n<script src=`"ui/noctafin-home.js`" data-noctafin-home></script>`n"
if ($Html -notmatch '</body>') { throw "index.html ne contient pas </body>" }
$Html = [regex]::Replace($Html, '</body>', $Block + '</body>', 'IgnoreCase')
Set-Content -Path $Index -Value $Html -Encoding UTF8

Write-Host "NoctaFin Home installé dans $WebDir" -ForegroundColor Green
Write-Host "Ajoute ensuite l'import theme.css dans Dashboard > Général/Branding > Custom CSS."
