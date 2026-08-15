#!/usr/bin/env bash
set -euo pipefail
VERSION="v1.6.0"
BASE_URL="https://github.com/ybouane/LibRaw-Wasm/releases/download/${VERSION}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/vendor/libraw"
mkdir -p "$DEST"
fetch(){ local name="$1" sha="$2"; echo "[PixelForge] Descargando $name"; curl -fL --retry 3 "$BASE_URL/$name" -o "$DEST/$name"; echo "$sha  $DEST/$name" | sha256sum -c -; }
fetch index.js 3eb710aa5473c58c3b9dec74457b2ad2095d15b9a6df0056c96a3a011b720ca6
fetch libraw.js e23952fca5b268550af1f84619af5c0c035e5db3bde0e4d5a20300f1614a9487
fetch libraw.wasm 8947f7e668e488461c3e9defe7007583aa8477b4886aa603b36b407f2f0846ff
fetch worker.js af074781439ddf9c47fcbd3b3f115049ab884fdf61ec49ab358f28a8c42a4d4c
printf '%s\n' "LibRaw-Wasm ${VERSION} instalado en $DEST"
