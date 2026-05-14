"""
Generate raster PNG key art for hub / showcase cards (1200x750, ~16:10).
Run from repo root: python scripts/generate_preview_images.py
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

W, H = 1200, 750
OUT = Path(__file__).resolve().parent.parent / "showcase" / "previews"


def noise_layer(size: tuple[int, int], alpha: int = 40) -> Image.Image:
    rnd = random.Random(42)
    n = Image.new("RGBA", size, (0, 0, 0, 0))
    px = n.load()
    for y in range(0, size[1], 2):
        for x in range(0, size[0], 2):
            v = rnd.randint(0, alpha)
            px[x, y] = (255, 255, 255, v)
    return n.resize(size, Image.Resampling.NEAREST)


def deadtakeover() -> None:
    img = Image.new("RGB", (W, H), "#0a0510")
    dr = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(12 + t * 28)
        g = int(4 + t * 18)
        b = int(18 + t * 35)
        dr.line([(0, y), (W, y)], fill=(r, g, b))
    for i in range(H // 2, H):
        a = int(35 * ((i - H // 2) / (H // 2)) ** 0.5)
        dr.line([(0, i), (W, i)], fill=(40, 12, 55 + a // 3))
    mx, my, mr = int(W * 0.78), int(H * 0.18), 88
    for dy in range(-mr - 2, mr + 2):
        for dx in range(-mr - 2, mr + 2):
            d2 = dx * dx + dy * dy
            if d2 > mr * mr:
                continue
            d = math.sqrt(d2) / mr
            rr = int(255 * (1 - d) ** 1.2 + 60 * d)
            gg = int(40 * (1 - d) ** 2)
            bb = int(80 * (1 - d) ** 1.5)
            x, y = mx + dx, my + dy
            if 0 <= x < W and 0 <= y < H:
                img.putpixel((x, y), (rr, gg, bb))
    rng = random.Random(7)
    x = 40
    while x < W - 40:
        bw = rng.randint(55, 130)
        bh = rng.randint(180, 380)
        top = H - 120 - bh
        dr.rectangle([x, top, x + bw, H - 80], fill="#14081c")
        for wy in range(top + 20, H - 100, 28):
            for wx in range(x + 10, x + bw - 15, 22):
                if rng.random() > 0.55:
                    dr.rectangle([wx, wy, wx + 10, wy + 14], fill="#3d2848")
        x += bw + rng.randint(8, 22)
    cx, cy = int(W * 0.42), int(H * 0.38)
    dr.line([(cx - 28, cy), (cx + 28, cy)], fill="#ff4466", width=2)
    dr.line([(cx, cy - 28), (cx, cy + 28)], fill="#ff4466", width=2)
    dr.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], outline="#ff6688", width=2)
    img = Image.alpha_composite(img.convert("RGBA"), noise_layer((W, H), 28)).convert("RGB")
    img = img.filter(ImageFilter.GaussianBlur(radius=0.3))
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / "deadtakeover.png", "PNG", optimize=True)


def _hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def craftverse() -> None:
    img = Image.new("RGB", (W, H), "#6ec8ff")
    dr = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(110 - t * 40)
        g = int(200 - t * 50)
        b = int(255 - t * 30)
        dr.line([(0, y), (W, y)], fill=(r, g, b))
    sx, sy, sr = int(W * 0.15), int(H * 0.2), 55
    for dy in range(-sr, sr):
        for dx in range(-sr, sr):
            if dx * dx + dy * dy <= sr * sr:
                d = math.sqrt(dx * dx + dy * dy) / sr
                c = int(255 * (1 - d * 0.4))
                x, y = sx + dx, sy + dy
                if 0 <= x < W and 0 <= y < H:
                    img.putpixel((x, y), (min(255, c + 40), min(255, c + 20), c))
    base_y = H - 100

    def darken(c: tuple[int, int, int], f: float = 0.75) -> tuple[int, int, int]:
        return tuple(max(0, min(255, int(v * f))) for v in c)

    blocks = [
        (-180, 0, 90, "#5cbf60", "#2e6b32"),
        (-80, -40, 100, "#72c878", "#356638"),
        (40, -20, 110, "#8d6e63", "#4e342e"),
        (160, -60, 95, "#bdbdbd", "#616161"),
        (-120, -90, 75, "#4caf50", "#1b5e20"),
        (100, -100, 85, "#8bc34a", "#33691e"),
    ]
    for ox, lift, size, top_c, side_c in blocks:
        cx = W // 2 + ox
        cy = base_y + lift
        half = size // 2
        pts_t = [(cx, cy - half // 2), (cx + half, cy), (cx, cy + half // 2), (cx - half, cy)]
        dr.polygon(pts_t, fill=_hex_rgb(top_c))
        sc = _hex_rgb(side_c)
        dr.polygon(
            [(cx - half, cy), (cx, cy + half // 2), (cx, cy + half), (cx - half, cy + half // 2)],
            fill=darken(sc, 0.9),
        )
        dr.polygon(
            [(cx + half, cy), (cx, cy + half // 2), (cx, cy + half), (cx + half, cy + half // 2)],
            fill=darken(sc, 0.65),
        )
    dr.rectangle([0, H - 85, W, H], fill=_hex_rgb("#4caf50"))
    dr.rectangle([0, H - 55, W, H], fill=_hex_rgb("#2e7d32"))
    img = Image.alpha_composite(img.convert("RGBA"), noise_layer((W, H), 22)).convert("RGB")
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / "craftverse.png", "PNG", optimize=True)


def mindcraft() -> None:
    img = Image.new("RGB", (W, H), "#020a08")
    dr = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        g = int(8 + t * 25)
        dr.line([(0, y), (W, y)], fill=(4, g, g + 8))
    for y in range(0, H, 3):
        dr.line([(0, y), (W, y)], fill=(0, 40, 36))
    m = 70
    dr.rounded_rectangle([m, m, W - m, H - m], radius=12, outline="#00e5cc", width=3)
    dr.rounded_rectangle([m + 8, m + 8, W - m - 8, H - m - 8], radius=8, fill="#031210")
    rng = random.Random(99)
    ly = m + 40
    prompts = [
        "> mindcraft — agent deck v2",
        "> java 21 runtime … ok",
        "> profile sandbox … loaded",
        "> bot fleet … idle (3)",
        "> stream … listening",
        "> _",
    ]
    for line in prompts:
        dr.text((m + 28, ly), line, fill="#4dd0c1")
        ly += 42
    for _ in range(120):
        x = rng.randint(m + 20, W - m - 20)
        y = rng.randint(m + 20, H - m - 20)
        br = rng.randint(40, 180)
        dr.rectangle([x, y, x + 2, y + rng.randint(4, 14)], fill=(0, br, max(0, br - 10)))
    img = Image.alpha_composite(img.convert("RGBA"), noise_layer((W, H), 18)).convert("RGB")
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / "mindcraft.png", "PNG", optimize=True)


if __name__ == "__main__":
    random.seed(1)
    deadtakeover()
    craftverse()
    mindcraft()
    print("Wrote:", OUT / "deadtakeover.png", OUT / "craftverse.png", OUT / "mindcraft.png")
