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

$LogoDir = Join-Path $Ui "noctafin-assets\logos"
New-Item -ItemType Directory -Path $LogoDir -Force | Out-Null
$Logos = @{
    "pixar.svg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Pixar_logo.svg"
    "marvel-studios.svg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Marvel_Studios_2025.svg"
    "disney.svg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Walt_Disney_Pictures_text_logo.svg"
    "20th-century.svg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/20th_Century_Studios_(2021).svg"
    "columbia.svg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Columbia_Pictures.svg"
    "paramount.svg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Paramount_Pictures_Logo_2025.svg"
    "apple-tv-plus.svg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Apple_TV_Plus_Logo.svg"
    "netflix.svg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Netflix_2015_logo.svg"
    "bbc.svg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/BBC_Logo_2021.svg"
    "cartoon-network.svg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Cartoon_Network.svg"
    "abc.svg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/ABC-2021-LOGO_(3).svg"
    "mtv.svg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/MTV-2021.svg"
}

foreach ($Entry in $Logos.GetEnumerator()) {
    $Target = Join-Path $LogoDir $Entry.Key
    try {
        Invoke-WebRequest -Uri $Entry.Value -OutFile $Target -MaximumRedirection 10 -UseBasicParsing
    } catch {
        Write-Warning "Logo $($Entry.Key) non téléchargé: $($_.Exception.Message)"
    }
}

$Index = Join-Path $WebDir "index.html"
$Html = Get-Content $Index -Raw -Encoding UTF8
$Html = [regex]::Replace($Html, '<script[^>]*data-noctafin-(?:config|home)[^>]*></script>\s*', '', 'IgnoreCase')
$Block = "<script src=`"ui/noctafin-config.js`" data-noctafin-config></script>`n<script src=`"ui/noctafin-home.js`" data-noctafin-home></script>`n"
if ($Html -notmatch '</body>') { throw "index.html ne contient pas </body>" }
$Html = [regex]::Replace($Html, '</body>', $Block + '</body>', 'IgnoreCase')
Set-Content -Path $Index -Value $Html -Encoding UTF8

Write-Host "NoctaFin Home installé dans $WebDir" -ForegroundColor Green
Write-Host "Logos locaux: $LogoDir"
Write-Host "Ajoute ensuite l'import theme.css dans Dashboard > Général/Branding > Custom CSS."
