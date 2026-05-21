"""
Generate Maderobe icon assets from a single design definition.

Outputs (all 1024x1024):
  assets/images/icon.png                       — App Store icon (RGB, no alpha — Apple requirement)
  assets/images/adaptive-icon-foreground.png   — Android adaptive icon foreground (RGBA)
  assets/images/adaptive-icon.png              — Legacy Android icon (RGBA)
  assets/images/splash-icon.png                — Splash screen icon (RGBA, larger margin)
  assets/images/favicon.png                    — Web favicon (smaller version)

Design : minimalist clothes hanger on a soft warm-beige background.
Run: python scripts/generate-icon.py
"""

from pathlib import Path
from PIL import Image, ImageDraw


# ----------------------------------------------------------------------------
# Theme
# ----------------------------------------------------------------------------

CANVAS = 1024
BG = (232, 221, 208)        # warm beige
FG = (58, 48, 42)           # dark brown
STROKE = 32                 # main stroke width


def draw_hanger(draw: ImageDraw.ImageDraw, w: int, scale: float = 1.0):
    """Draw a centered minimalist clothes hanger covering the canvas of width `w`.

    `scale` shrinks the design (0.7 = 70% of canvas) — used for splash where
    we want extra padding.
    """
    cx = w // 2
    # Define normalized coordinates first, then scale them around the center.
    # The hanger occupies roughly 70% of the canvas height by default.
    base = 1.0 * scale

    # Hook (ring at the top) — open at the bottom so the verticals can join cleanly
    hook_r = int(72 * base)
    hook_top = int(220 * base + (w * (1 - base)) / 2)
    hook_cx = cx

    # Stem from the bottom of the hook down to the top of the triangle peak
    stem_top_y = hook_top + 2 * hook_r
    stem_bottom_y = stem_top_y + int(60 * base)

    # Triangle of the hanger (the shoulders)
    peak_y = stem_bottom_y
    left_x = int(200 * base + (w * (1 - base)) / 2)
    right_x = w - left_x
    bar_y = int(760 * base + (w * (1 - base)) / 2)

    stroke = max(8, int(STROKE * base))

    # 1. Hook — closed ring (ellipse outline) at the top
    draw.ellipse(
        [hook_cx - hook_r, hook_top, hook_cx + hook_r, hook_top + 2 * hook_r],
        outline=FG, width=stroke,
    )

    # 2. Short vertical stem under the hook
    draw.line(
        [(hook_cx, stem_top_y), (hook_cx, stem_bottom_y)],
        fill=FG, width=stroke,
    )

    # 3. Two diagonal "shoulders" from the stem bottom down to the bar ends
    draw.line([(hook_cx, peak_y), (left_x, bar_y)], fill=FG, width=stroke)
    draw.line([(hook_cx, peak_y), (right_x, bar_y)], fill=FG, width=stroke)

    # 4. Horizontal bar at the bottom (the bit where you hang trousers)
    draw.line([(left_x, bar_y), (right_x, bar_y)], fill=FG, width=stroke)

    # 5. Round caps on the bar ends + the peak (small filled circles)
    for (px, py) in [(left_x, bar_y), (right_x, bar_y), (hook_cx, peak_y)]:
        cap_r = stroke // 2
        draw.ellipse([px - cap_r, py - cap_r, px + cap_r, py + cap_r], fill=FG)


# ----------------------------------------------------------------------------
# Generators
# ----------------------------------------------------------------------------

def make_icon_rgb(out_path: Path) -> None:
    """App Store icon — RGB mode (Apple rejects RGBA, even fully opaque)."""
    img = Image.new('RGB', (CANVAS, CANVAS), BG)
    draw = ImageDraw.Draw(img)
    draw_hanger(draw, CANVAS, scale=1.0)
    img.save(out_path, 'PNG', optimize=True)
    print(f"  wrote {out_path}  (mode={img.mode}, size={img.size})")


def make_icon_rgba(out_path: Path, bg=BG, scale: float = 1.0) -> None:
    """Android / splash variants — RGBA allowed."""
    img = Image.new('RGBA', (CANVAS, CANVAS), (*bg, 255))
    draw = ImageDraw.Draw(img)
    draw_hanger(draw, CANVAS, scale=scale)
    img.save(out_path, 'PNG', optimize=True)
    print(f"  wrote {out_path}  (mode={img.mode}, size={img.size})")


def make_adaptive_foreground(out_path: Path) -> None:
    """Android adaptive icon foreground — transparent background, hanger only.

    Android trims the foreground inside its mask, so we keep good padding (~25%).
    """
    img = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_hanger(draw, CANVAS, scale=0.75)
    img.save(out_path, 'PNG', optimize=True)
    print(f"  wrote {out_path}  (mode={img.mode}, size={img.size})")


def make_favicon(out_path: Path) -> None:
    """Small favicon, 256px."""
    img = Image.new('RGB', (CANVAS, CANVAS), BG)
    draw = ImageDraw.Draw(img)
    draw_hanger(draw, CANVAS, scale=1.0)
    img.thumbnail((256, 256), Image.LANCZOS)
    img.save(out_path, 'PNG', optimize=True)
    print(f"  wrote {out_path}  (mode={img.mode}, size={img.size})")


# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------

def main() -> None:
    root = Path(__file__).resolve().parent.parent
    out = root / 'assets' / 'images'
    out.mkdir(parents=True, exist_ok=True)

    print("Generating Maderobe icon assets...")
    make_icon_rgb(out / 'icon.png')
    make_icon_rgba(out / 'adaptive-icon.png', bg=(230, 244, 254))  # match existing app.json bg
    make_adaptive_foreground(out / 'android-icon-foreground.png')
    # Android background — solid fill matching app.json adaptiveIcon.backgroundColor
    bg_img = Image.new('RGBA', (CANVAS, CANVAS), (230, 244, 254, 255))
    bg_img.save(out / 'android-icon-background.png', 'PNG', optimize=True)
    print(f"  wrote {out / 'android-icon-background.png'}  (solid fill)")
    # Android monochrome icon — required by adaptiveIcon.monochromeImage in app.json
    mono = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    mono_draw = ImageDraw.Draw(mono)
    # Use a single dark color — Android will tint it from the system accent
    global FG
    saved_fg = FG
    FG = (255, 255, 255)
    draw_hanger(mono_draw, CANVAS, scale=0.75)
    FG = saved_fg
    mono.save(out / 'android-icon-monochrome.png', 'PNG', optimize=True)
    print(f"  wrote {out / 'android-icon-monochrome.png'}  (mode=RGBA, monochrome)")
    # Splash icon — same hanger with extra padding
    make_icon_rgba(out / 'splash-icon.png', bg=BG, scale=0.55)
    make_favicon(out / 'favicon.png')

    # Sanity check : icon.png MUST be RGB (no alpha)
    icon = Image.open(out / 'icon.png')
    assert icon.mode == 'RGB', f"icon.png must be RGB, got {icon.mode}"
    print("\nVerified: icon.png is RGB mode (App Store compatible).")


if __name__ == '__main__':
    main()
