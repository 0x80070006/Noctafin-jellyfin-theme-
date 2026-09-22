#!/usr/bin/env bash
set -euo pipefail
WEB_DIR="${JELLYFIN_WEB_DIR:-}"
if [[ -z "$WEB_DIR" ]]; then
  for candidate in /usr/share/jellyfin/web /usr/lib/jellyfin/web /var/lib/jellyfin/web /opt/jellyfin/web /jellyfin/jellyfin-web /usr/local/share/jellyfin/web /opt/homebrew/share/jellyfin/web; do
    if [[ -f "$candidate/index.html" ]]; then WEB_DIR="$candidate"; break; fi
  done
fi
[[ -n "$WEB_DIR" && -f "$WEB_DIR/index.html" ]] || { echo "Jellyfin web introuvable."; exit 1; }
python3 - "$WEB_DIR/index.html" <<'PY'
import pathlib, re, sys
path = pathlib.Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
text = re.sub(r'<script[^>]*data-noctafin-(?:config|home)[^>]*></script>\s*', '', text, flags=re.I)
path.write_text(text, encoding="utf-8")
PY
rm -f "$WEB_DIR/ui/noctafin-config.js" "$WEB_DIR/ui/noctafin-home.js"
rm -rf "$WEB_DIR/ui/noctafin-assets"
echo "Injection NoctaFin supprimée. Pense aussi à retirer l'@import du Custom CSS."
