#!/usr/bin/env python3
"""Generate the lo / md / hi LOD JPEGs used by the map viewer.

Usage:
    python scripts/gen_map_lods.py <source-image> --prefix terkep
    python scripts/gen_map_lods.py future-source.jpg --prefix terkep_future

Bakes a sepia-ish parchment tint into the output so the browser doesn't have
to apply a CSS filter on every frame. Pads the image to the canvas aspect
ratio (3:2 by default) with a parchment background so hotspot coordinates
stay aligned to the canvas.

Requires Pillow:  pip install pillow
"""
import argparse
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

LODS = [("lo", 900), ("md", 1500), ("hi", 2400)]
OUT_DIR = Path("assets/map")
PARCHMENT = (244, 228, 193)


def stylize(img: Image.Image) -> Image.Image:
    img = img.convert("RGB")
    img = ImageEnhance.Color(img).enhance(0.85)
    img = ImageEnhance.Contrast(img).enhance(1.05)
    sepia = ImageOps.colorize(
        ImageOps.grayscale(img),
        black=(54, 38, 22),
        white=(248, 232, 196),
    )
    return Image.blend(img, sepia, 0.15)


def pad_to_aspect(img: Image.Image, aspect: float, fill=PARCHMENT) -> Image.Image:
    w, h = img.size
    cur = w / h
    if abs(cur - aspect) < 1e-3:
        return img
    if cur < aspect:
        new_w = int(round(h * aspect))
        canvas = Image.new("RGB", (new_w, h), fill)
        canvas.paste(img, ((new_w - w) // 2, 0))
    else:
        new_h = int(round(w / aspect))
        canvas = Image.new("RGB", (w, new_h), fill)
        canvas.paste(img, (0, (new_h - h) // 2))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--prefix", default="terkep",
                        help="Output filename prefix (default: terkep)")
    parser.add_argument("--out", type=Path, default=OUT_DIR)
    parser.add_argument("--aspect", type=float, default=1.5,
                        help="Target aspect ratio (default 1.5 = 3:2)")
    args = parser.parse_args()

    src = Image.open(args.source)
    src = pad_to_aspect(src, args.aspect)
    styled = stylize(src)
    args.out.mkdir(parents=True, exist_ok=True)

    for suffix, width in LODS:
        height = int(round(width / args.aspect))
        resized = styled.resize((width, height), Image.LANCZOS)
        out_path = args.out / f"{args.prefix}_{suffix}.jpg"
        resized.save(out_path, "JPEG", quality=82, progressive=True, optimize=True)
        print(f"wrote {out_path} ({width}x{height})")


if __name__ == "__main__":
    main()
