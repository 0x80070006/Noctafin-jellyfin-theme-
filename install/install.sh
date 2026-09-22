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

echo "NoctaFin Home installé dans: $WEB_DIR"
echo "Ajoute maintenant l'import theme.css dans Dashboard > Général/Branding > Custom CSS."
echo "Après une mise à jour Jellyfin, il peut être nécessaire de relancer cet installateur."
