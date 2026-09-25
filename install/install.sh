#!/usr/bin/env bash
set -euo pipefail

VERSION="1.15.0"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="${JELLYFIN_WEB_DIR:-}"

if [[ -z "$WEB_DIR" ]]; then
  for candidate in \
    /usr/share/jellyfin/web \
    /usr/lib/jellyfin/web \
    /var/lib/jellyfin/web \
    /opt/jellyfin/web \
    /jellyfin/jellyfin-web \
    /usr/local/share/jellyfin/web \
    /opt/homebrew/share/jellyfin/web; do
    if [[ -f "$candidate/index.html" ]]; then WEB_DIR="$candidate"; break; fi
  done
fi

if [[ -z "$WEB_DIR" || ! -f "$WEB_DIR/index.html" ]]; then
  echo "Jellyfin web introuvable. Relance avec: JELLYFIN_WEB_DIR=/chemin/vers/jellyfin-web ./install/install.sh"
  exit 1
fi

if [[ ! -w "$WEB_DIR/index.html" ]]; then
  echo "index.html n'est pas modifiable. Relance avec les droits nécessaires (souvent sudo/root)."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 est requis pour injecter Lumo dans index.html. Installe-le puis relance."
  exit 1
fi

INDEX="$WEB_DIR/index.html"
UI_DIR="$WEB_DIR/ui"
LUMO_DIR="$UI_DIR/lumo"
SEASON_DIR="$UI_DIR/noctafin-assets/seasonal"
LOGO_DIR="$UI_DIR/noctafin-assets/logos"
BACKGROUND_DIR="$UI_DIR/noctafin-assets/background"

mkdir -p "$UI_DIR" "$LUMO_DIR/styles" "$SEASON_DIR" "$LOGO_DIR" "$BACKGROUND_DIR"

# Sauvegarde durable de l'index original, sans écraser une sauvegarde précédente.
if [[ ! -f "$INDEX.pre-lumo.bak" ]]; then
  cp -a "$INDEX" "$INDEX.pre-lumo.bak"
fi

# Runtime dynamique.
install -m 0644 "$ROOT/scripts/noctafin-config.js" "$UI_DIR/noctafin-config.js"
install -m 0644 "$ROOT/scripts/noctafin-home.js" "$UI_DIR/noctafin-home.js"

# CSS complet copié localement : indispensable pour les vues modernes/admin où
# le CSS de Branding n'est pas toujours chargé de la même façon que sur l'accueil.
install -m 0644 "$ROOT/theme.css" "$LUMO_DIR/theme.css"
find "$LUMO_DIR/styles" -mindepth 1 -maxdepth 1 -type f -delete 2>/dev/null || true
cp -f "$ROOT/styles/"*.css "$LUMO_DIR/styles/"
chmod 0644 "$LUMO_DIR/theme.css" "$LUMO_DIR/styles/"*.css

# Assets saisonniers optimisés en WebP (alpha conservé pour les logos).
rm -f "$SEASON_DIR/"*.png 2>/dev/null || true
cp -f "$ROOT/assets/seasonal/"*.webp "$SEASON_DIR/"
chmod 0644 "$SEASON_DIR/"*.webp

# Les reflets ambiants sont dessinés en CSS; conserver les anciens assets
# saisonniers sans charger d'image en mode normal.
rm -f "$BACKGROUND_DIR/lumo-japan-night-1080p.mp4" 2>/dev/null || true

# Ces sept jaquettes sont fournies avec le thème et fonctionnent hors ligne.
if compgen -G "$ROOT/assets/logos/*.svg" >/dev/null; then
  cp -f "$ROOT/assets/logos/"*.svg "$LOGO_DIR/"
  chmod 0644 "$LOGO_DIR/"*.svg
fi

# Logos de marques : téléchargés localement afin d'éviter les blocages CSP.
# En cas de panne réseau, une version déjà présente est conservée.
logo_sources=(
  "pixar.svg|https://commons.wikimedia.org/wiki/Special:Redirect/file/Pixar_logo.svg"
  "marvel-studios.svg|https://commons.wikimedia.org/wiki/Special:Redirect/file/Marvel_Studios_2025.svg"
  "disney.svg|https://commons.wikimedia.org/wiki/Special:Redirect/file/Walt_Disney_Pictures_text_logo.svg"
  "20th-century.svg|https://commons.wikimedia.org/wiki/Special:Redirect/file/20th_Century_Studios_(2021).svg"
  "columbia.svg|https://commons.wikimedia.org/wiki/Special:Redirect/file/Columbia_Pictures.svg"
  "paramount.svg|https://commons.wikimedia.org/wiki/Special:Redirect/file/Paramount_Pictures_Logo_2025.svg"
  "apple-tv-plus.svg|https://commons.wikimedia.org/wiki/Special:Redirect/file/Apple_TV_Plus_Logo.svg"
  "netflix.svg|https://commons.wikimedia.org/wiki/Special:Redirect/file/Netflix_2015_logo.svg"
  "bbc.svg|https://commons.wikimedia.org/wiki/Special:Redirect/file/BBC_Logo_2021.svg"
  "cartoon-network.svg|https://commons.wikimedia.org/wiki/Special:Redirect/file/Cartoon_Network.svg"
  "abc.svg|https://commons.wikimedia.org/wiki/Special:Redirect/file/ABC-2021-LOGO_(3).svg"
  "mtv.svg|https://commons.wikimedia.org/wiki/Special:Redirect/file/MTV-2021.svg"
)

fetch_logo() {
  local output="$1"
  local url="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -L --fail --silent --show-error --connect-timeout 10 --max-time 30 \
      -A "Lumo-Jellyfin/$VERSION" "$url" -o "$output"
  elif command -v wget >/dev/null 2>&1; then
    wget -q --timeout=30 --user-agent="Lumo-Jellyfin/$VERSION" -O "$output" "$url"
  else
    return 127
  fi
}

is_svg_file() {
  local file="$1"
  [[ -s "$file" ]] || return 1
  python3 - "$file" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
try:
    head = p.read_bytes()[:4096].lower()
except OSError:
    raise SystemExit(1)
raise SystemExit(0 if b"<svg" in head else 1)
PY
}

for entry in "${logo_sources[@]}"; do
  IFS='|' read -r filename url <<< "$entry"
  target="$LOGO_DIR/$filename"
  tmp="$target.tmp"

  # Les mises à jour Lumo ne doivent pas dépendre du réseau si un logo local
  # valide existe déjà. Forcer un rafraîchissement avec LUMO_REFRESH_LOGOS=1.
  if [[ "${LUMO_REFRESH_LOGOS:-0}" != "1" ]] && is_svg_file "$target"; then
    continue
  fi

  rm -f "$tmp"
  if fetch_logo "$tmp" "$url" && is_svg_file "$tmp"; then
    mv -f "$tmp" "$target"
    chmod 0644 "$target"
  else
    rm -f "$tmp"
    if [[ -s "$target" ]]; then
      echo "Avertissement: téléchargement de $filename impossible; logo local existant conservé."
    else
      echo "Avertissement: logo $filename indisponible; Lumo affichera son libellé de secours."
    fi
  fi
done

# Injection idempotente. Le CSS local est chargé avant le JS pour éviter les
# flashs/anciens caches et pour couvrir les pages Paramètres/Dashboard.
python3 - "$INDEX" "$VERSION" <<'PY'
import pathlib, re, sys
path = pathlib.Path(sys.argv[1])
version = sys.argv[2]
text = path.read_text(encoding="utf-8")

patterns = [
    r'<link[^>]*data-lumo-theme[^>]*>\s*',
    r'<script[^>]*data-noctafin-(?:config|home)[^>]*></script>\s*',
]
for pattern in patterns:
    text = re.sub(pattern, '', text, flags=re.I)

if not re.search(r'</head>', text, flags=re.I):
    raise SystemExit("index.html ne contient pas </head>")
if not re.search(r'</body>', text, flags=re.I):
    raise SystemExit("index.html ne contient pas </body>")

style = f'<link rel="stylesheet" href="ui/lumo/theme.css?v={version}" data-lumo-theme="{version}">\n'
scripts = (
    f'<script src="ui/noctafin-config.js?v={version}" data-noctafin-config></script>\n'
    f'<script src="ui/noctafin-home.js?v={version}" data-noctafin-home></script>\n'
)
text = re.sub(r'</head>', style + '</head>', text, count=1, flags=re.I)
text = re.sub(r'</body>', scripts + '</body>', text, count=1, flags=re.I)
path.write_text(text, encoding="utf-8")
PY

echo "Lumo $VERSION installé dans: $WEB_DIR"
echo "CSS local: $LUMO_DIR/theme.css"
echo "Logos studios/réseaux: $LOGO_DIR"
echo "Assets saisonniers: $SEASON_DIR"
echo "Fond normal: noir et reflets colorés animés (CSS)"
echo "IMPORTANT: pour l'installation complète, retire l'ancien @import jsDelivr du CSS personnalisé Jellyfin afin d'éviter les conflits/cache d'une ancienne version."
echo "Après une mise à jour Jellyfin, relance cet installateur si index.html a été remplacé."
