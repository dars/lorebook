#!/bin/sh
# 所有正式圖示從同一張已確認母圖匯出，避免各平台版本分歧。
set -eu
cd "$(dirname "$0")"
master=lorebook-magic-book-v4-final.png
app=../../next/app
images=../../next/public/images

for size in 192 512; do
  case "$size" in
    192) target="$images/app-icon-192.png" ;;
    512) target="$images/app-icon.png" ;;
  esac
  magick "$master" -filter Lanczos -resize "${size}x${size}" \
    -alpha off -strip "PNG24:$target"
done

# 自適應遮罩多留邊距；一般圖示保留定稿原本的構圖比例。
magick "$master" -filter Lanczos -resize 472x472 -alpha off \
  -background '#19232d' -gravity center -extent 512x512 -strip \
  "PNG24:$images/app-icon-maskable.png"
magick "$master" -filter Lanczos -resize 180x180 -alpha off -strip \
  "PNG24:$app/apple-icon.png"
magick "$master" -filter Lanczos -resize 256x256 -alpha off -strip \
  -define icon:auto-resize=256,64,48,32,16 "$app/favicon.ico"
printf 'PWA icon version: '
shasum -a 256 "$master" | cut -c 1-12
