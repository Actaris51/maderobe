"""
Process the Dall-E generated wardrobe icon into all platform variants.

Source : assets/Icone/Maderobe icon.png (1254×1254 RGB)

Outputs (all in assets/images/):
  icon.png                       1024×1024 RGB  (App Store — no alpha)
  adaptive-icon.png              1024×1024 RGBA (Android legacy)
  android-icon-foreground.png    1024×1024 RGBA (Android adaptive, with safe padding)
  splash-icon.png                1024×1024 RGBA
  favicon.png                     256×256 RGB

Kept from previous run :
  android-icon-background.png (solid #E6F4FE)
  android-icon-monochrome.png (simple hanger for Android themed icons)

Apple requirement : icon.png MUST be RGB mode (no alpha, even at full opacity).
"""

from pathlib import Path
from PIL import Image


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    src = root / 'assets' / 'Icone' / 'Maderobe icon.png'
    out = root / 'assets' / 'images'

    print(f"Source: {src} (exists={src.exists()})")
    src_img = Image.open(src)
    print(f"Source size: {src_img.size}, mode: {src_img.mode}")

    # ---- 1. App Store icon (RGB, no alpha) ----
    icon_rgb = src_img.convert('RGB').resize((1024, 1024), Image.LANCZOS)
    icon_path = out / 'icon.png'
    icon_rgb.save(icon_path, 'PNG', optimize=True, dpi=(72, 72))
    # Sanity check: Apple validators reject RGBA
    verify = Image.open(icon_path)
    assert verify.mode == 'RGB', f"icon.png must be RGB, got {verify.mode}"
    print(f"  wrote {icon_path.name}  ({verify.size}, mode={verify.mode})")

    # ---- 2. Android adaptive legacy ----
    adaptive = src_img.convert('RGBA').resize((1024, 1024), Image.LANCZOS)
    adaptive_path = out / 'adaptive-icon.png'
    adaptive.save(adaptive_path, 'PNG', optimize=True)
    print(f"  wrote {adaptive_path.name}  ({adaptive.size}, mode={adaptive.mode})")

    # ---- 3. Android adaptive foreground (with safe padding) ----
    # Android masks ~30% off the edges (square/circle/squircle/teardrop).
    # We shrink the icon to ~70% and center it on a transparent canvas.
    foreground = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    shrunk = src_img.convert('RGBA').resize((720, 720), Image.LANCZOS)
    foreground.paste(shrunk, ((1024 - 720) // 2, (1024 - 720) // 2))
    fg_path = out / 'android-icon-foreground.png'
    foreground.save(fg_path, 'PNG', optimize=True)
    print(f"  wrote {fg_path.name}  ({foreground.size}, mode={foreground.mode}, with safe padding)")

    # ---- 4. Splash icon (RGBA, full size) ----
    splash = src_img.convert('RGBA').resize((1024, 1024), Image.LANCZOS)
    splash_path = out / 'splash-icon.png'
    splash.save(splash_path, 'PNG', optimize=True)
    print(f"  wrote {splash_path.name}  ({splash.size}, mode={splash.mode})")

    # ---- 5. Favicon ----
    fav = src_img.convert('RGB').resize((256, 256), Image.LANCZOS)
    fav_path = out / 'favicon.png'
    fav.save(fav_path, 'PNG', optimize=True)
    print(f"  wrote {fav_path.name}  ({fav.size}, mode={fav.mode})")

    print("\nKept from previous run (unchanged):")
    for kept in ['android-icon-background.png', 'android-icon-monochrome.png']:
        p = out / kept
        if p.exists():
            img = Image.open(p)
            print(f"  {kept}  ({img.size}, mode={img.mode})")


if __name__ == '__main__':
    main()
