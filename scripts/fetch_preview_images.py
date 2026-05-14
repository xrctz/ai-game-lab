"""
Download stock preview art from the internet, crop to 1200x750, save as PNG.

Sources use the Pexels License (pexels.com/license) and Unsplash License
(unsplash.com/license). See showcase/previews/README.md for links.

Run from repo root: pip install pillow && python scripts/fetch_preview_images.py
"""
from __future__ import annotations

import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

W, H = 1200, 750
OUT = Path(__file__).resolve().parent.parent / "showcase" / "previews"

# Direct CDN URLs (no API keys). Swap URLs here if you want different stock art.
SOURCES: dict[str, str] = {
    # Zombies in forest — horror / survival (Pexels)
    "deadtakeover": "https://images.pexels.com/photos/5435456/pexels-photo-5435456.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1920",
    # Grass + soil cross-section — terrain / block-world vibe (Pexels, not Mojang IP)
    "craftverse": "https://images.pexels.com/photos/11255695/pexels-photo-11255695.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1920",
    # Code on screen — dev / agent deck (Unsplash)
    "mindcraft": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=max&w=1920&q=85",
}


def cover_crop(im: Image.Image, tw: int, th: int) -> Image.Image:
    im = im.convert("RGB")
    sw, sh = im.size
    scale = max(tw / sw, th / sh)
    nw = max(1, int(round(sw * scale)))
    nh = max(1, int(round(sh * scale)))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return im.crop((left, top, left + tw, top + th))


def fetch_one(name: str, url: str) -> None:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "ai-game-lab-preview-fetch/1.0 (+https://github.com/xrctz/ai-game-lab)",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read()
    im = Image.open(BytesIO(raw))
    im = cover_crop(im, W, H)
    OUT.mkdir(parents=True, exist_ok=True)
    if name == "craftverse":
        out_path = OUT / "craftverse.jpg"
        im.save(out_path, "JPEG", quality=86, optimize=True, progressive=True)
    else:
        out_path = OUT / f"{name}.png"
        im.save(out_path, "PNG", optimize=True)
    print("Wrote", out_path, "from", url[:72], "...")


def main() -> None:
    for name, url in SOURCES.items():
        fetch_one(name, url)
    print("Done.")


if __name__ == "__main__":
    main()
