#!/usr/bin/env python3
"""
Procedural texture baker for Night of the Dead (Python → PNG).
Run: python3 tools/generate_textures.py
Outputs into assets/textures/ consumed by the C# Raylib client.
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "textures"
SIZE = 512


def clamp(v: int) -> int:
    return max(0, min(255, int(v)))


def noise(img: Image.Image, amount: int = 28, seed: int = 0) -> Image.Image:
    rnd = random.Random(seed)
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            n = rnd.randint(-amount, amount)
            px[x, y] = (clamp(r + n), clamp(g + n), clamp(b + n), a)
    return img


def make_ground() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), (70, 74, 66, 255))
    d = ImageDraw.Draw(img)
    rnd = random.Random(3)
    # asphalt base (brighter — was crushing to black on GPU)
    for y in range(SIZE):
        for x in range(SIZE):
            v = 55 + (x * 3 + y * 7) % 28
            img.putpixel((x, y), (v, v + 4, v - 2, 255))
    # cracks
    for _ in range(40):
        x0, y0 = rnd.randint(0, SIZE), rnd.randint(0, SIZE)
        for _ in range(20):
            x1 = clamp(x0 + rnd.randint(-30, 30))
            y1 = clamp(y0 + rnd.randint(-30, 30))
            d.line((x0, y0, x1, y1), fill=(8, 8, 6, 255), width=1)
            x0, y0 = x1, y1
    # dirt patches
    for _ in range(25):
        x, y = rnd.randint(0, SIZE), rnd.randint(0, SIZE)
        r = rnd.randint(20, 70)
        d.ellipse((x - r, y - r, x + r, y + r), fill=(28, 32, 18, 90))
    img = noise(img, 16, seed=3)
    return img.filter(ImageFilter.SMOOTH_MORE)


def make_brick() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), (42, 38, 48, 255))
    d = ImageDraw.Draw(img)
    rnd = random.Random(9)
    bh, bw = 28, 56
    for row, y in enumerate(range(0, SIZE, bh)):
        off = (bw // 2) if row % 2 else 0
        for x in range(-off, SIZE, bw):
            shade = rnd.randint(-18, 18)
            col = (clamp(48 + shade), clamp(42 + shade // 2), clamp(52 + shade), 255)
            d.rectangle((x + 1, y + 1, x + bw - 2, y + bh - 2), fill=col)
            # mortar
            d.rectangle((x, y, x + bw, y + bh), outline=(22, 20, 26, 255))
            # grime
            if rnd.random() < 0.3:
                d.ellipse(
                    (x + 8, y + 6, x + 22, y + 18),
                    fill=(30, 28, 34, 80),
                )
    # window-ish glow tiles occasional
    for _ in range(8):
        x, y = rnd.randint(0, SIZE - 40), rnd.randint(0, SIZE - 40)
        d.rectangle((x, y, x + 18, y + 22), fill=(255, 170, 70, 40))
    return noise(img, 12, seed=9)


def make_metal() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), (36, 38, 44, 255))
    d = ImageDraw.Draw(img)
    for y in range(SIZE):
        shade = 30 + (y % 7) * 2
        d.line((0, y, SIZE, y), fill=(shade, shade + 2, shade + 4, 255))
    # scratches
    rnd = random.Random(21)
    for _ in range(80):
        x0, y0 = rnd.randint(0, SIZE), rnd.randint(0, SIZE)
        x1, y1 = x0 + rnd.randint(-80, 80), y0 + rnd.randint(-10, 10)
        d.line((x0, y0, x1, y1), fill=(70, 74, 82, 120), width=1)
    img = ImageEnhance.Contrast(img).enhance(1.2)
    return noise(img, 10, seed=21)


def make_zombie_skin() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), (70, 96, 50, 255))
    d = ImageDraw.Draw(img)
    rnd = random.Random(42)
    for y in range(SIZE):
        for x in range(0, SIZE, 2):
            g = 80 + (x * y) % 30
            img.putpixel((x, y), (55 + g // 8, g, 40 + g // 10, 255))
    for _ in range(120):
        x, y = rnd.randint(0, SIZE), rnd.randint(0, SIZE)
        r = rnd.randint(4, 18)
        d.ellipse((x - r, y - r, x + r, y + r), fill=(90, 40, 40, 70))  # rot spots
    for _ in range(40):
        x, y = rnd.randint(0, SIZE), rnd.randint(0, SIZE)
        d.line((x, y, x + rnd.randint(-20, 20), y + rnd.randint(-20, 20)), fill=(30, 50, 25, 180))
    return noise(img, 14, seed=42)


def make_concrete() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), (48, 48, 52, 255))
    rnd = random.Random(5)
    px = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            v = 40 + rnd.randint(0, 25) + ((x ^ y) & 7)
            px[x, y] = (v, v, v + 2, 255)
    d = ImageDraw.Draw(img)
    for _ in range(15):
        x, y = rnd.randint(0, SIZE), rnd.randint(0, SIZE)
        d.arc((x, y, x + 80, y + 80), 0, 180, fill=(30, 30, 32, 255), width=2)
    return noise(img, 8, seed=5)


def make_glow() -> Image.Image:
    """Soft radial lamp glow (used as billboard / light cookie)."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()
    cx = cy = SIZE // 2
    for y in range(SIZE):
        for x in range(SIZE):
            dx, dy = x - cx, y - cy
            dist = math.sqrt(dx * dx + dy * dy) / (SIZE * 0.5)
            if dist > 1:
                continue
            a = int((1 - dist) ** 2 * 180)
            px[x, y] = (255, 180, 80, a)
    return img


def make_noise_lut() -> Image.Image:
    img = Image.new("RGBA", (256, 256))
    rnd = random.Random(99)
    px = img.load()
    for y in range(256):
        for x in range(256):
            v = rnd.randint(0, 255)
            px[x, y] = (v, v, v, 255)
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    assets = {
        "ground.png": make_ground(),
        "brick.png": make_brick(),
        "metal.png": make_metal(),
        "zombie_skin.png": make_zombie_skin(),
        "concrete.png": make_concrete(),
        "glow.png": make_glow(),
        "noise.png": make_noise_lut(),
    }
    for name, im in assets.items():
        path = OUT / name
        im.save(path, "PNG")
        print(f"wrote {path} ({im.size[0]}x{im.size[1]})")
    # manifest for C# / tooling
    (OUT / "manifest.json").write_text(
        "{\n  \"generator\": \"tools/generate_textures.py\",\n  \"files\": "
        + str(list(assets.keys())).replace("'", '"')
        + "\n}\n"
    )
    print("done.")


if __name__ == "__main__":
    main()
