$ErrorActionPreference = "Stop"
$Version = "1.12.0"
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

$Index = if ($WebDir) { Join-Path $WebDir "index.html" } else { $null }
if (-not $WebDir -or -not (Test-Path $Index)) {
    throw "Jellyfin web introuvable. Définis JELLYFIN_WEB_DIR puis relance le script."
}

$Ui = Join-Path $WebDir "ui"
$LumoDir = Join-Path $Ui "lumo"
$LumoStyles = Join-Path $LumoDir "styles"
$SeasonDir = Join-Path $Ui "noctafin-assets\seasonal"
$LogoDir = Join-Path $Ui "noctafin-assets\logos"
$BackgroundDir = Join-Path $Ui "noctafin-assets\background"
New-Item -ItemType Directory -Path $Ui,$LumoDir,$LumoStyles,$SeasonDir,$LogoDir,$BackgroundDir -Force | Out-Null

$Backup = "$Index.pre-lumo.bak"
if (-not (Test-Path $Backup)) { Copy-Item $Index $Backup -Force }

Copy-Item (Join-Path $Root "scripts\noctafin-config.js") (Join-Path $Ui "noctafin-config.js") -Force
Copy-Item (Join-Path $Root "scripts\noctafin-home.js") (Join-Path $Ui "noctafin-home.js") -Force
Copy-Item (Join-Path $Root "theme.css") (Join-Path $LumoDir "theme.css") -Force
Get-ChildItem $LumoStyles -File -ErrorAction SilentlyContinue | Remove-Item -Force
Copy-Item (Join-Path $Root "styles\*.css") $LumoStyles -Force
Get-ChildItem $SeasonDir -Filter "*.png" -File -ErrorAction SilentlyContinue | Remove-Item -Force
Copy-Item (Join-Path $Root "assets\seasonal\*.webp") $SeasonDir -Force
Copy-Item (Join-Path $Root "assets\background\lumo-space.webp") (Join-Path $BackgroundDir "lumo-space.webp") -Force
Remove-Item (Join-Path $BackgroundDir "lumo-japan-night-1080p.mp4") -Force -ErrorAction SilentlyContinue

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
    $Tmp = "$Target.tmp"
    Remove-Item $Tmp -Force -ErrorAction SilentlyContinue
    try {
        Invoke-WebRequest -Uri $Entry.Value -OutFile $Tmp -MaximumRedirection 10 -UseBasicParsing -Headers @{"User-Agent"="Lumo-Jellyfin/$Version"}
        $Head = [System.IO.File]::ReadAllText($Tmp)
        if ($Head -notmatch '<svg') { throw "Le fichier reçu n'est pas un SVG" }
        Move-Item $Tmp $Target -Force
    } catch {
        Remove-Item $Tmp -Force -ErrorAction SilentlyContinue
        if (Test-Path $Target) {
            Write-Warning "Téléchargement de $($Entry.Key) impossible; logo local existant conservé."
        } else {
            Write-Warning "Logo $($Entry.Key) indisponible; Lumo affichera son libellé de secours."
        }
    }
}

$Html = Get-Content $Index -Raw -Encoding UTF8
$Html = [regex]::Replace($Html, '<link[^>]*data-lumo-theme[^>]*>\s*', '', 'IgnoreCase')
$Html = [regex]::Replace($Html, '<script[^>]*data-noctafin-(?:config|home)[^>]*></script>\s*', '', 'IgnoreCase')
if ($Html -notmatch '</head>') { throw "index.html ne contient pas </head>" }
if ($Html -notmatch '</body>') { throw "index.html ne contient pas </body>" }
$Style = "<link rel=`"stylesheet`" href=`"ui/lumo/theme.css?v=$Version`" data-lumo-theme=`"$Version`">`n"
$Scripts = "<script src=`"ui/noctafin-config.js?v=$Version`" data-noctafin-config></script>`n<script src=`"ui/noctafin-home.js?v=$Version`" data-noctafin-home></script>`n"
$Html = [regex]::Replace($Html, '</head>', $Style + '</head>', 'IgnoreCase')
$Html = [regex]::Replace($Html, '</body>', $Scripts + '</body>', 'IgnoreCase')
Set-Content -Path $Index -Value $Html -Encoding UTF8

Write-Host "Lumo $Version installé dans $WebDir" -ForegroundColor Green
Write-Host "CSS local: $(Join-Path $LumoDir 'theme.css')"
Write-Host "Logos studios/réseaux: $LogoDir"
Write-Host "Assets saisonniers: $SeasonDir"
Write-Host "Fond spatial Lumo: $(Join-Path $BackgroundDir 'lumo-space.webp')"
Write-Host "IMPORTANT: retire l'ancien @import jsDelivr du CSS personnalisé Jellyfin pour éviter les conflits/cache d'une ancienne version." -ForegroundColor Yellow
