#!/usr/bin/env python3
"""Generate the lo / md / hi LOD JPEGs used by the map viewer.

Usage:
    python scripts/gen_map_lods.py <source-image> --prefix terkep
    python scripts/gen_map_lods.py future-source.jpg --prefix terkep_future

Bakes a sepia-ish parchment tint into the output so the browser doesn't have
to apply a CSS filter on every frame.

Requires Pillow:  pip install pillow
"""
import argparse
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

LODS = [("lo", 900), ("md", 1500), ("hi", 2400)]
OUT_DIR = Path("assets/map")


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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--prefix", default="terkep",
                        help="Output filename prefix (default: terkep)")
    parser.add_argument("--out", type=Path, default=OUT_DIR)
    args = parser.parse_args()

    src = Image.open(args.source)
    styled = stylize(src)
    args.out.mkdir(parents=True, exist_ok=True)

    for suffix, width in LODS:
        ratio = width / styled.width
        size = (width, int(round(styled.height * ratio)))
        resized = styled.resize(size, Image.LANCZOS)
        out_path = args.out / f"{args.prefix}_{suffix}.jpg"
        resized.save(out_path, "JPEG", quality=82, progressive=True, optimize=True)
        print(f"wrote {out_path} ({size[0]}x{size[1]})")


if __name__ == "__main__":
    main()
