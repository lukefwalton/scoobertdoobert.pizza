#!/usr/bin/env bash
# Convert WAVs to MP3s and remove WAV files.
set -euo pipefail

ROOT="${1:-media/music}"
QUALITY=4 # LAME VBR ~165 kbps — fine for background music, not archival

converted=0
removed=0
recompressed=0

while IFS= read -r -d '' wav; do
  mp3="${wav%.*}.mp3"
  if [[ -f "$mp3" ]]; then
    rm "$wav"
    removed=$((removed + 1))
    tmp="${mp3%.mp3}.tmp.mp3"
    ffmpeg -nostdin -hide_banner -loglevel error -y -i "$mp3" -vn -codec:a libmp3lame -q:a "$QUALITY" "$tmp"
    mv "$tmp" "$mp3"
    recompressed=$((recompressed + 1))
    echo "[$removed removed + recompressed] $mp3"
  else
    ffmpeg -nostdin -hide_banner -loglevel error -y -i "$wav" -vn -codec:a libmp3lame -q:a "$QUALITY" "$mp3"
    rm "$wav"
    converted=$((converted + 1))
    echo "[$converted converted] $wav"
  fi
done < <(find "$ROOT" -type f \( -iname '*.wav' \) -print0)

find "$ROOT" -type d -name 'Stems' -empty -delete 2>/dev/null || true

echo "Done. Converted $converted, removed/recompressed $recompressed existing mp3s."
