#!/bin/sh
# Reproduce size and mask checks from the unmodified generated master.
set -eu
cd "$(dirname "$0")"
mkdir -p v4-checks
master=lorebook-magic-book-v4-final.png
for size in 32 64; do
  magick "$master" -filter Lanczos -resize "${size}x${size}" -strip "v4-checks/square-${size}.png"
done
magick "$master" -alpha off \
  \( +clone -fill black -colorize 100 -fill white -draw 'circle 626.5,626.5 1253,626.5' \) \
  -alpha off -compose CopyOpacity -composite v4-checks/circle-master.png
for size in 32 64; do
  magick v4-checks/circle-master.png -filter Lanczos -resize "${size}x${size}" -strip "v4-checks/circle-${size}.png"
done
magick -size 960x540 xc:'#eef1ef' -font /System/Library/Fonts/Supplemental/Arial.ttf \
  -fill '#263d43' -pointsize 25 -annotate +28+38 'LOREBOOK / V4 SIZE & MASK REVIEW' \
  -pointsize 17 \
  -annotate +48+92 'Square / 32 px' -annotate +282+92 'Square / 64 px' \
  -annotate +522+92 'Circle / 32 px' -annotate +762+92 'Circle / 64 px' \
  \( v4-checks/square-32.png \) -geometry +104+120 -compose Over -composite \
  \( v4-checks/square-64.png \) -geometry +328+104 -composite \
  \( v4-checks/circle-32.png \) -geometry +584+120 -composite \
  \( v4-checks/circle-64.png \) -geometry +808+104 -composite \
  -pointsize 15 -annotate +28+205 'Above: native pixels. Below: nearest-neighbor enlargement for inspection.' \
  \( v4-checks/square-32.png -filter point -resize 192x192 \) -geometry +24+235 -composite \
  \( v4-checks/square-64.png -filter point -resize 192x192 \) -geometry +264+235 -composite \
  \( v4-checks/circle-32.png -filter point -resize 192x192 \) -geometry +504+235 -composite \
  \( v4-checks/circle-64.png -filter point -resize 192x192 \) -geometry +744+235 -composite \
  -pointsize 17 -annotate +72+461 '32 px / 6x' -annotate +312+461 '64 px / 3x' \
  -annotate +552+461 '32 px / 6x' -annotate +792+461 '64 px / 3x' \
  -pointsize 15 -annotate +28+512 'Source: original v4 master. Circular masks applied before Lanczos downsampling.' \
  -strip v4-checks/review.png
