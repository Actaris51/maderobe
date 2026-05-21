"""
Generate marketing screenshots for App Store Connect.

Targets:
  iPhone 6.9" (iPhone 16 Pro Max) — 1320 × 2868 portrait (REQUIRED for new apps)
  iPad   13"  (iPad Pro 13")      — 2064 × 2752 portrait (REQUIRED because supportsTablet=true)

5 visuals per size, sharing the same minimalist design language as the icon:
  1. Wardrobe       — grid of clothing pieces
  2. Quick add      — camera + hanger
  3. Outfits        — vertical stack
  4. Outfit of day  — sun + hanger + temp badge
  5. Packing        — suitcase + items
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


# ---------------------------------------------------------------------------
# Theme (matches the app's icon palette)
# ---------------------------------------------------------------------------

BG = (245, 239, 231)         # warm beige (slightly lighter than the icon bg)
FG = (42, 34, 29)            # dark brown
ACCENT = (58, 48, 42)        # icon stroke color
MUTED = (110, 98, 89)        # subtle grey-brown
CARD_BG = (255, 255, 255)
CARD_BORDER = (216, 207, 196)

FONT_REG = r"C:\Windows\Fonts\segoeui.ttf"
FONT_BOLD = r"C:\Windows\Fonts\seguisb.ttf"


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


# ---------------------------------------------------------------------------
# Drawing primitives
# ---------------------------------------------------------------------------

def text_w(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def draw_centered_text(draw, text, y, font, color, max_w=None):
    """Draw centered text. If max_w provided, wraps simple by splitting words."""
    if max_w is None:
        w = text_w(draw, text, font)
        draw.text(((draw.im.size[0] - w) / 2, y), text, font=font, fill=color)
        return font.size  # height ~

    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        candidate = (cur + " " + word).strip()
        if text_w(draw, candidate, font) <= max_w:
            cur = candidate
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)

    img_w = draw.im.size[0]
    line_h = int(font.size * 1.3)
    for i, line in enumerate(lines):
        w = text_w(draw, line, font)
        draw.text(((img_w - w) / 2, y + i * line_h), line, font=font, fill=color)
    return line_h * len(lines)


def round_rect(draw, xy, radius, fill=None, outline=None, width=0):
    xy = [int(v) for v in xy]
    draw.rounded_rectangle(xy, radius=int(radius), fill=fill, outline=outline, width=int(width))


def ellipse(draw, xy, fill=None, outline=None, width=0):
    xy = [int(v) for v in xy]
    draw.ellipse(xy, fill=fill, outline=outline, width=int(width))


def line(draw, pts, fill, width):
    pts = [(int(p[0]), int(p[1])) for p in pts]
    draw.line(pts, fill=fill, width=int(width))


# ---------------------------------------------------------------------------
# Hanger glyph (reused from the icon, scaled)
# ---------------------------------------------------------------------------

def draw_hanger(draw, cx, cy, size, stroke_w=None, color=None):
    """Draw the Maderobe hanger glyph centered on (cx, cy) inside a `size`x`size` box."""
    if color is None:
        color = ACCENT
    if stroke_w is None:
        stroke_w = max(4, int(size // 32))
    stroke_w = int(stroke_w)

    half = size / 2
    hook_r = size * 0.07
    hook_y = cy - half + size * 0.22
    stem_top = hook_y + 2 * hook_r
    stem_bottom = stem_top + size * 0.06
    peak_y = stem_bottom
    left_x = cx - size * 0.30
    right_x = cx + size * 0.30
    bar_y = cy + half - size * 0.20

    ellipse(draw, [cx - hook_r, hook_y, cx + hook_r, hook_y + 2 * hook_r],
            outline=color, width=stroke_w)
    line(draw, [(cx, stem_top), (cx, stem_bottom)], color, stroke_w)
    line(draw, [(cx, peak_y), (left_x, bar_y)], color, stroke_w)
    line(draw, [(cx, peak_y), (right_x, bar_y)], color, stroke_w)
    line(draw, [(left_x, bar_y), (right_x, bar_y)], color, stroke_w)
    cap = stroke_w / 2
    for (px, py) in [(left_x, bar_y), (right_x, bar_y), (cx, peak_y)]:
        ellipse(draw, [px - cap, py - cap, px + cap, py + cap], fill=color)


# ---------------------------------------------------------------------------
# Mock content for each of the 5 visuals
# ---------------------------------------------------------------------------

def mock_wardrobe_grid(draw, x, y, w, h):
    """3×4 grid of clothing thumbnails (rounded squares with hanger inside)."""
    cols, rows = 3, 4
    gap = w * 0.04
    cell = (w - gap * (cols + 1)) / cols
    palette = [
        (200, 215, 230), (215, 195, 175), (180, 165, 145),
        (160, 175, 165), (220, 215, 200), (175, 155, 175),
        (210, 195, 195), (180, 195, 210), (200, 180, 165),
        (165, 175, 195), (195, 210, 185), (170, 195, 175),
    ]
    idx = 0
    for r in range(rows):
        for c in range(cols):
            cx = x + gap + c * (cell + gap)
            cy = y + gap + r * (cell + gap)
            color = palette[idx % len(palette)]
            round_rect(draw, (cx, cy, cx + cell, cy + cell), radius=cell * 0.12, fill=color)
            # Mini hanger inside
            draw_hanger(draw, cx + cell / 2, cy + cell / 2, cell * 0.5, stroke_w=max(3, int(cell * 0.025)), color=(80, 70, 65))
            idx += 1


def mock_quick_add(draw, x, y, w, h):
    """Camera + hanger composition, with a 'capture' button feel."""
    cy = y + h * 0.30
    # Camera body (rounded rect)
    cam_w, cam_h = w * 0.55, h * 0.20
    cam_x = x + (w - cam_w) / 2
    round_rect(draw, (cam_x, cy, cam_x + cam_w, cy + cam_h), radius=cam_h * 0.15, fill=(60, 50, 45))
    # Lens
    lens_r = cam_h * 0.30
    lens_cx = cam_x + cam_w / 2
    lens_cy = cy + cam_h / 2
    ellipse(draw, [lens_cx - lens_r, lens_cy - lens_r, lens_cx + lens_r, lens_cy + lens_r], fill=(200, 200, 200))
    inner_r = lens_r * 0.55
    ellipse(draw, [lens_cx - inner_r, lens_cy - inner_r, lens_cx + inner_r, lens_cy + inner_r], fill=(80, 80, 80))

    # Hanger underneath
    draw_hanger(draw, x + w / 2, y + h * 0.65, w * 0.40, color=ACCENT)

    # "Capture" pill
    pill_w, pill_h = w * 0.55, h * 0.08
    pill_x = x + (w - pill_w) / 2
    pill_y = y + h * 0.88
    round_rect(draw, (pill_x, pill_y, pill_x + pill_w, pill_y + pill_h), radius=pill_h / 2, fill=ACCENT)


def mock_outfit_stack(draw, x, y, w, h):
    """Vertical stack of 3 clothing rectangles with small hanger glyphs."""
    gap = h * 0.04
    block_h = (h - gap * 2) / 3
    palette = [(180, 195, 215), (90, 80, 75), (200, 195, 185)]
    labels = ["Haut", "Bas", "Chaussures"]
    for i, color in enumerate(palette):
        bx = x + w * 0.15
        bw = w * 0.70
        by = y + i * (block_h + gap)
        round_rect(draw, (bx, by, bx + bw, by + block_h), radius=block_h * 0.10, fill=color)
        # Mini hanger inside each block
        hanger_color = (255, 255, 255) if i == 1 else (60, 50, 45)
        draw_hanger(draw, bx + bw / 2, by + block_h * 0.50, block_h * 0.55,
                    stroke_w=max(4, int(block_h * 0.025)), color=hanger_color)
        # Small text label below the hanger
        font = load_font(FONT_REG, max(14, int(block_h * 0.10)))
        text_color = (255, 255, 255) if i == 1 else (60, 50, 45)
        lbl = labels[i]
        lw = text_w(draw, lbl, font)
        draw.text((int(bx + (bw - lw) / 2), int(by + block_h * 0.78)), lbl, font=font, fill=text_color)


def mock_outfit_of_day(draw, x, y, w, h):
    """Sun + hanger + temperature badge."""
    # Sun
    sun_cx = x + w * 0.30
    sun_cy = y + h * 0.20
    sun_r = w * 0.10
    ellipse(draw, [sun_cx - sun_r, sun_cy - sun_r, sun_cx + sun_r, sun_cy + sun_r], fill=(245, 200, 100))
    # Rays
    import math
    for i in range(8):
        angle = math.pi * 2 * i / 8
        ix1 = sun_cx + math.cos(angle) * sun_r * 1.3
        iy1 = sun_cy + math.sin(angle) * sun_r * 1.3
        ix2 = sun_cx + math.cos(angle) * sun_r * 1.8
        iy2 = sun_cy + math.sin(angle) * sun_r * 1.8
        line(draw, [(ix1, iy1), (ix2, iy2)], (245, 200, 100), max(3, int(w * 0.008)))

    # Temperature pill
    temp_w, temp_h = w * 0.30, h * 0.07
    temp_x = x + w * 0.55
    temp_y = y + h * 0.18
    round_rect(draw, (temp_x, temp_y, temp_x + temp_w, temp_y + temp_h), radius=temp_h / 2,
               fill=(255, 255, 255), outline=ACCENT, width=max(2, int(w * 0.006)))
    font = load_font(FONT_BOLD, int(temp_h * 0.55))
    label = "18°C"
    lw = text_w(draw, label, font)
    draw.text((temp_x + (temp_w - lw) / 2, temp_y + temp_h * 0.18), label, font=font, fill=ACCENT)

    # Hanger
    draw_hanger(draw, x + w / 2, y + h * 0.65, w * 0.45)


def mock_packing(draw, x, y, w, h):
    """Suitcase shape with small clothing pills inside."""
    # Suitcase handle
    handle_w = w * 0.28
    handle_h = h * 0.06
    handle_x = x + (w - handle_w) / 2
    handle_y = y + h * 0.05
    round_rect(draw, (handle_x, handle_y, handle_x + handle_w, handle_y + handle_h),
               radius=handle_h * 0.4, fill=None, outline=ACCENT, width=max(4, int(w * 0.012)))

    # Suitcase body
    body_x = x + w * 0.12
    body_y = y + h * 0.12
    body_w = w * 0.76
    body_h = h * 0.78
    round_rect(draw, (body_x, body_y, body_x + body_w, body_y + body_h),
               radius=body_w * 0.05, fill=(160, 130, 105), outline=ACCENT, width=max(4, int(w * 0.010)))

    # Latch
    latch_w = body_w * 0.08
    latch_h = body_h * 0.06
    latch_x = body_x + body_w / 2 - latch_w / 2
    latch_y = body_y - latch_h / 2
    round_rect(draw, (latch_x, latch_y, latch_x + latch_w, latch_y + latch_h), radius=4, fill=ACCENT)

    # Items inside (pills)
    inner_x = body_x + body_w * 0.10
    inner_y = body_y + body_h * 0.15
    inner_w = body_w * 0.80
    inner_h = body_h * 0.70
    pill_h = inner_h * 0.13
    pill_gap = inner_h * 0.04
    pill_colors = [(220, 220, 230), (90, 100, 130), (200, 175, 145), (180, 75, 60), (250, 240, 220)]
    for i, color in enumerate(pill_colors):
        py = inner_y + i * (pill_h + pill_gap)
        if py + pill_h > inner_y + inner_h:
            break
        round_rect(draw, (inner_x, py, inner_x + inner_w, py + pill_h), radius=pill_h * 0.4, fill=color)


# ---------------------------------------------------------------------------
# Composer — assembles headline + tagline + mock card for a given size
# ---------------------------------------------------------------------------

SCREENS = [
    {
        "key": "1-wardrobe",
        "headline": "Ta garde-robe, en photos",
        "tagline": "Filtre par couleur, type, saison.",
        "mock": mock_wardrobe_grid,
    },
    {
        "key": "2-quick-add",
        "headline": "Saisie en cinq secondes",
        "tagline": "Photo, type, couleur — c’est sauvé.",
        "mock": mock_quick_add,
    },
    {
        "key": "3-outfits",
        "headline": "Tenues équilibrées",
        "tagline": "Algorithme d’harmonie chromatique.",
        "mock": mock_outfit_stack,
    },
    {
        "key": "4-of-the-day",
        "headline": "Tenue du jour, météo incluse",
        "tagline": "Verrouille une pièce, swipe les autres.",
        "mock": mock_outfit_of_day,
    },
    {
        "key": "5-packing",
        "headline": "Une valise prête en deux tap",
        "tagline": "Selon durée, ville et météo.",
        "mock": mock_packing,
    },
]


def compose(out_path: Path, width: int, height: int, headline: str, tagline: str, mock_fn) -> None:
    img = Image.new('RGB', (width, height), BG)
    draw = ImageDraw.Draw(img)

    # Headline + tagline at top
    h_font_size = int(height * 0.040)
    t_font_size = int(height * 0.022)
    h_font = load_font(FONT_BOLD, h_font_size)
    t_font = load_font(FONT_REG, t_font_size)

    margin_x = int(width * 0.08)
    headline_y = int(height * 0.07)
    headline_h = draw_centered_text(draw, headline, headline_y, h_font, FG, max_w=width - 2 * margin_x)
    tagline_y = headline_y + headline_h + int(height * 0.020)
    tagline_h = draw_centered_text(draw, tagline, tagline_y, t_font, MUTED, max_w=width - 2 * margin_x)

    # Mock card starts after the text block (with generous breathing room)
    card_y = tagline_y + tagline_h + int(height * 0.05)
    card_x = int(width * 0.08)
    card_w = width - 2 * card_x
    card_bottom_margin = int(height * 0.05)
    card_h = height - card_y - card_bottom_margin
    round_rect(draw, (card_x, card_y, card_x + card_w, card_y + card_h),
               radius=int(card_w * 0.06), fill=CARD_BG,
               outline=CARD_BORDER, width=max(2, int(width * 0.003)))

    # Inner area for the mock content (with some padding)
    pad = int(card_w * 0.08)
    inner_x = card_x + pad
    inner_y = card_y + pad
    inner_w = card_w - 2 * pad
    inner_h = card_h - 2 * pad
    mock_fn(draw, inner_x, inner_y, inner_w, inner_h)

    # Save with explicit DPI metadata — some ASC validators reject PNGs without it
    img.save(out_path, 'PNG', optimize=True, dpi=(72, 72))
    print(f"  wrote {out_path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    root = Path(__file__).resolve().parent.parent
    base = root / 'store-assets' / 'screenshots'

    sizes = [
        ('iphone-6.9', 1320, 2868),
        ('ipad-13', 2064, 2752),
    ]

    for label, w, h in sizes:
        outdir = base / label
        outdir.mkdir(parents=True, exist_ok=True)
        print(f"=== {label} ({w}×{h}) ===")
        for s in SCREENS:
            out = outdir / f"{s['key']}.png"
            compose(out, w, h, s['headline'], s['tagline'], s['mock'])

    print("\nDone.")


if __name__ == '__main__':
    main()
