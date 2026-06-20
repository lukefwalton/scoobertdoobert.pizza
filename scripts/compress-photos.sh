#!/usr/bin/env bash
# Resize/compress photos for web. Skips files already under 1.5MB and 2000px.
set -euo pipefail

ROOT="${1:-photos}"
MAX_PX=2000
MAX_BYTES=$((1500 * 1024))
QUALITY=82

compress_jpeg() {
  local file=$1
  sips -Z "$MAX_PX" -s format jpeg -s formatOptions "$QUALITY" "$file" >/dev/null
}

convert_to_jpeg() {
  local file=$1
  local out="${file%.*}.jpg"
  sips -Z "$MAX_PX" -s format jpeg -s formatOptions "$QUALITY" "$file" --out "$out" >/dev/null
  rm "$file"
}

needs_work() {
  local file=$1
  local ext_lc size w h max

  ext_lc=$(echo "${file##*.}" | tr '[:upper:]' '[:lower:]')
  if [[ "$ext_lc" == "heic" || "$ext_lc" == "tif" || "$ext_lc" == "tiff" ]]; then
    return 0
  fi

  [[ -f "$file" ]] || return 1
  size=$(stat -f%z "$file")
  w=$(sips -g pixelWidth "$file" 2>/dev/null | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$file" 2>/dev/null | awk '/pixelHeight/{print $2}')
  max=$(( w > h ? w : h ))

  [[ "$size" -gt "$MAX_BYTES" || "$max" -gt "$MAX_PX" ]]
}

processed=0
skipped=0

while IFS= read -r -d '' file; do
  if ! needs_work "$file"; then
    skipped=$((skipped + 1))
    continue
  fi

  ext_lc=$(echo "${file##*.}" | tr '[:upper:]' '[:lower:]')
  if [[ "$ext_lc" == "heic" || "$ext_lc" == "tif" || "$ext_lc" == "tiff" ]]; then
    convert_to_jpeg "$file"
  else
    compress_jpeg "$file"
  fi

  processed=$((processed + 1))
  echo "[$processed] $file"
done < <(find "$ROOT" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.heic' -o -iname '*.tif' -o -iname '*.tiff' \) -print0)

echo "Done. Processed $processed, skipped $skipped."
