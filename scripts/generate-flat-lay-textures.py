"""
Generate procedural texture PNGs for the flat-lay composer backgrounds.

Run once (or whenever you tweak the colors):
    python scripts/generate-flat-lay-textures.py

Outputs 1024x1024 PNGs to assets/flat-lay/:
  - dark-wood.jpg   : warm brown vertical planks
  - light-wood.jpg  : light oak vertical planks
  - marble.jpg      : off-white with subtle gray veining
  - linen.jpg       : woven beige textile
  - charcoal.jpg    : near-black with fine grain

JPEG (q=88) keeps the bundle small (~50-100 KB each vs 500 KB+ for PNG).
Each texture is tileable horizontally so it can repeat on wider canvases later.
"""

from __future__ import annotations

import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
OUT_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'flat-lay'

# Deterministic seed -> reproducible textures across runs
random.seed(42)


def _clamp(v: float, lo: int = 0, hi: int = 255) -> int:
    return max(lo, min(hi, int(v)))


def _shade(rgb: tuple[int, int, int], delta: int) -> tuple[int, int, int]:
    return (_clamp(rgb[0] + delta), _clamp(rgb[1] + delta), _clamp(rgb[2] + delta))


def gen_wood(base: tuple[int, int, int], plank_min: int, plank_max: int, name: str) -> None:
    """Vertical wooden planks with subtle vertical grain noise."""
    img = Image.new('RGB', (SIZE, SIZE), base)
    draw = ImageDraw.Draw(img)

    # Planks
    x = 0
    while x < SIZE:
        plank_w = random.randint(plank_min, plank_max)
        # Per-plank shading offset so neighbours don't blend
        shade_delta = random.randint(-18, 18)
        plank_color = _shade(base, shade_delta)
        draw.rectangle([x, 0, x + plank_w, SIZE], fill=plank_color)
        # Vertical grain lines inside the plank
        for _ in range(random.randint(2, 5)):
            gx = x + random.randint(2, plank_w - 2)
            grain_color = _shade(plank_color, random.choice([-25, -18, -12, 12, 18]))
            draw.line([(gx, 0), (gx + random.randint(-3, 3), SIZE)], fill=grain_color, width=1)
        # Thin dark gap between planks (1 px)
        gap_color = _shade(base, -55)
        draw.line([(x + plank_w, 0), (x + plank_w, SIZE)], fill=gap_color, width=1)
        x += plank_w + 1

    # Soft blur for a less digital look
    img = img.filter(ImageFilter.GaussianBlur(radius=0.6))
    # Subtle vignette by overlaying a dark radial gradient (faked via 4 darker quads on edges)
    _apply_vignette(img, strength=0.15)
    img.save(OUT_DIR / f'{name}.jpg', 'JPEG', quality=88, optimize=True)
    print(f'  wrote {name}.jpg')


def gen_marble() -> None:
    """Off-white field with branching gray veins (Voronoi-ish via random walks)."""
    base = (244, 241, 236)
    img = Image.new('RGB', (SIZE, SIZE), base)
    draw = ImageDraw.Draw(img)
    # 8 veins, random walk
    for _ in range(8):
        x, y = random.randint(0, SIZE), random.randint(0, SIZE)
        angle = random.uniform(0, 6.283)
        length = random.randint(300, 900)
        for _ in range(length):
            dx = int(20 * random.gauss(0, 1))
            dy = int(20 * random.gauss(0, 1))
            x = (x + int(20 * (random.random() - 0.5))) % SIZE
            y = (y + int(20 * (random.random() - 0.5))) % SIZE
            vein_color = _shade(base, -random.randint(30, 70))
            draw.ellipse([x - 2, y - 2, x + 2, y + 2], fill=vein_color)
    img = img.filter(ImageFilter.GaussianBlur(radius=1.4))
    # Tiny grain to avoid plasticky look
    img = _add_grain(img, amount=6)
    _apply_vignette(img, strength=0.12)
    img.save(OUT_DIR / 'marble.jpg', 'JPEG', quality=88, optimize=True)
    print('  wrote marble.jpg')


def gen_linen() -> None:
    """Beige fabric with crosshatch weave."""
    base = (217, 201, 176)
    img = Image.new('RGB', (SIZE, SIZE), base)
    draw = ImageDraw.Draw(img)
    # Vertical threads
    for x in range(0, SIZE, 3):
        c = _shade(base, random.choice([-12, -6, 6, 12]))
        draw.line([(x, 0), (x, SIZE)], fill=c, width=1)
    # Horizontal threads (lighter overall = visible weave)
    for y in range(0, SIZE, 3):
        c = _shade(base, random.choice([-8, 8]))
        draw.line([(0, y), (SIZE, y)], fill=c, width=1)
    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))
    img = _add_grain(img, amount=10)
    _apply_vignette(img, strength=0.18)
    img.save(OUT_DIR / 'linen.jpg', 'JPEG', quality=88, optimize=True)
    print('  wrote linen.jpg')


def gen_charcoal() -> None:
    """Near-black with fine grain."""
    base = (31, 33, 37)
    img = Image.new('RGB', (SIZE, SIZE), base)
    img = _add_grain(img, amount=14)
    img = img.filter(ImageFilter.GaussianBlur(radius=0.3))
    _apply_vignette(img, strength=0.20)
    img.save(OUT_DIR / 'charcoal.jpg', 'JPEG', quality=88, optimize=True)
    print('  wrote charcoal.jpg')


def _add_grain(img: Image.Image, amount: int = 8) -> Image.Image:
    """Add per-pixel noise."""
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b = pixels[x, y]
            n = random.randint(-amount, amount)
            pixels[x, y] = (_clamp(r + n), _clamp(g + n), _clamp(b + n))
    return img


def _apply_vignette(img: Image.Image, strength: float = 0.15) -> None:
    """Darken the edges slightly for a photographic feel."""
    overlay = Image.new('RGB', img.size, (0, 0, 0))
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    # Radial mask via 30 concentric rings, lighter in the centre
    cx, cy = img.size[0] // 2, img.size[1] // 2
    rmax = (cx * cx + cy * cy) ** 0.5
    for i in range(30):
        r = int(rmax * (i + 1) / 30)
        op = int(strength * 255 * (i / 30))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=op)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=40))
    img.paste(overlay, (0, 0), mask)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f'Generating textures into {OUT_DIR}')
    gen_wood(base=(74, 50, 30),  plank_min=70, plank_max=130, name='dark-wood')
    gen_wood(base=(200, 166, 120), plank_min=80, plank_max=150, name='light-wood')
    gen_marble()
    gen_linen()
    gen_charcoal()
    print('Done.')


if __name__ == '__main__':
    main()
