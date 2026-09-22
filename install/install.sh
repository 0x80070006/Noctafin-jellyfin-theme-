#!/usr/bin/env bash
set -euo pipefail

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
  echo "index.html n'est pas modifiable. Relance avec les droits nécessaires (souvent sudo)."
  exit 1
fi

mkdir -p "$WEB_DIR/ui"
cp -f "$ROOT/scripts/noctafin-config.js" "$WEB_DIR/ui/noctafin-config.js"
cp -f "$ROOT/scripts/noctafin-home.js" "$WEB_DIR/ui/noctafin-home.js"

SEASON_DIR="$WEB_DIR/ui/noctafin-assets/seasonal"
mkdir -p "$SEASON_DIR"
cp -f "$ROOT/assets/seasonal/"*.png "$SEASON_DIR/"

# Logos de marques : téléchargés localement afin d'éviter les blocages CSP
# et de ne pas dépendre d'images distantes au moment de l'affichage.
LOGO_DIR="$WEB_DIR/ui/noctafin-assets/logos"
mkdir -p "$LOGO_DIR"

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
      -A "Lumo-Jellyfin/1.3" "$url" -o "$output"
  elif command -v wget >/dev/null 2>&1; then
    wget -q --timeout=30 --user-agent="Lumo-Jellyfin/1.3" -O "$output" "$url"
  else
    return 127
  fi
}

for entry in "${logo_sources[@]}"; do
  IFS='|' read -r filename url <<< "$entry"
  target="$LOGO_DIR/$filename"
  if ! fetch_logo "$target.tmp" "$url"; then
    rm -f "$target.tmp"
    echo "Avertissement: logo $filename non téléchargé (curl/wget ou accès Internet indisponible)."
    continue
  fi
  mv -f "$target.tmp" "$target"
done

python3 - "$WEB_DIR/index.html" <<'PY'
import pathlib, re, sys
path = pathlib.Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
text = re.sub(r'<script[^>]*data-noctafin-(?:config|home)[^>]*></script>\s*', '', text, flags=re.I)
block = (
    '<script src="ui/noctafin-config.js" data-noctafin-config></script>\n'
    '<script src="ui/noctafin-home.js" data-noctafin-home></script>\n'
)
if not re.search(r'</body>', text, flags=re.I):
    raise SystemExit("index.html ne contient pas </body>")
text = re.sub(r'</body>', block + '</body>', text, count=1, flags=re.I)
path.write_text(text, encoding="utf-8")
PY

echo "Lumo installé dans: $WEB_DIR"
echo "Logos studios/réseaux: $LOGO_DIR"
echo "Assets saisonniers: $SEASON_DIR"
echo "Ajoute maintenant l'import theme.css dans Dashboard > Général/Branding > Custom CSS."
echo "Après une mise à jour Jellyfin, il peut être nécessaire de relancer cet installateur."
