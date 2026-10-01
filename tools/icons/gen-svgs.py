"""Generate the Etqadem "Dial Vane" SVG icon set from the canonical design-canvas geometry.

Source of truth: RepVane Logo canvas, artboard project/DialVane.dc.html (concept G) in the
deep-teal pick (#0B7A75). 100x100 grid, centre (50,50):
  - 12 rep-counter ticks (x=50, y 5..16, width 6, butt caps) every 30 deg; 0..120 deg accent,
    150..330 deg ink @ 22%.
  - needle rotated -45 deg (points NE): stacked dumbbell plates on the tail (two rects), a bar,
    and an accent arrowhead.
  - pivot: ink dot r4.5 with a paper eye r2.

Run: python tools/icons/gen-svgs.py   (writes icons/logo-dv*.svg)
Then: node tools/icons/render-pngs.mjs (rasterises the PNGs with Chromium)
"""
from pathlib import Path

PAPER, INK, ACCENT, ACCENT_ON_DARK = "#F3F0E8", "#14161B", "#0B7A75", "#3CC2B8"
OUT = Path(__file__).resolve().parents[2] / "icons"


def ticks(lit, dim, dim_opacity, width=6, y1=5, y2=16, dim_ticks=True):
    line = f'<line x1="50" y1="{y1}" x2="50" y2="{y2}"'
    lit_lines = "".join(f'{line} transform="rotate({a} 50 50)"/>' for a in range(0, 121, 30))
    out = f'<g stroke="{lit}" stroke-width="{width}">{lit_lines}</g>'
    if dim_ticks:
        dim_lines = "".join(f'{line} transform="rotate({a} 50 50)"/>' for a in range(150, 331, 30))
        out += f'<g stroke="{dim}" stroke-opacity="{dim_opacity}" stroke-width="{width}">{dim_lines}</g>'
    return out


def needle(ink, tip, heavy=False):
    if heavy:  # <=32px: fatter plates/bar/tip (canvas 20px variant)
        body = ('<rect x="19" y="38" width="9" height="24" rx="1.5"/>'
                '<rect x="26" y="33" width="11" height="34" rx="1.5"/>'
                '<rect x="34" y="44" width="30" height="12"/>')
        arrow = "58,34 84,50 58,66"
    else:
        body = ('<rect x="22" y="41" width="6" height="18" rx="1.5"/>'
                '<rect x="27" y="36" width="8" height="28" rx="1.5"/>'
                '<rect x="34" y="47.5" width="30" height="5"/>')
        arrow = "61,38 81,50 61,62"
    return (f'<g transform="rotate(-45 50 50)"><g fill="{ink}">{body}</g>'
            f'<polygon points="{arrow}" fill="{tip}"/></g>')


def pivot(dot, eye):
    s = f'<circle cx="50" cy="50" r="4.5" fill="{dot}"/>'
    if eye:
        s += f'<circle cx="50" cy="50" r="2" fill="{eye}"/>'
    return s


def mark(ink, lit, dim, dim_opacity, tip, eye):
    return ticks(lit, dim, dim_opacity) + needle(ink, tip) + pivot(ink, eye)


def scaled(inner, k):
    return f'<g transform="translate(50 50) scale({k}) translate(-50 -50)">{inner}</g>'


def svg(label, comment, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" '
            f'aria-label="{label}">\n  <!-- {comment} -->\n  {body}\n</svg>\n')


tile = f'<rect width="100" height="100" rx="22" ry="22" fill="{PAPER}"/>'
full = f'<rect width="100" height="100" fill="{PAPER}"/>'
light = mark(INK, ACCENT, INK, 0.22, ACCENT, PAPER)
white = mark("#ffffff", "#ffffff", "#ffffff", 0.4, "#ffffff", None)

files = {
    # Primary app mark on a rounded paper tile (favicon SVG, in-app logos, manifest "any").
    "logo-dv.svg": svg("Etqadem logo", "Dial Vane mark on a rounded paper tile; mark at 0.9 so the "
                       "ring clears the tile corners.", tile + scaled(light, 0.9)),
    # Transparent, for dark panels.
    "logo-dv-ondark.svg": svg("Etqadem logo", "Reversed mark, no tile, for dark surfaces.",
                              mark(PAPER, ACCENT_ON_DARK, PAPER, 0.28, ACCENT_ON_DARK, INK)),
    # Single-colour silhouette (Safari mask-icon, notification icon, print).
    "logo-dv-mono.svg": svg("Etqadem logo, monochrome", "Single-colour silhouette, transparent bg.",
                            white),
    # PWA maskable: full-bleed paper, mark inside the 80% safe-zone circle.
    "logo-dv-maskable.svg": svg("Etqadem logo", "Maskable: full-bleed paper, mark scaled into the "
                                "80% safe zone.", full + scaled(light, 0.8)),
    # <=32px: canvas 20px variant (accent ticks only, heavier dumbbell), on the tile.
    "logo-dv-tiny.svg": svg("Etqadem logo", "Small-size variant (<=32px): lit ticks only, heavier "
                            "dumbbell so it still reads at 16px.",
                            tile + scaled(ticks(ACCENT, None, 0, width=10, y1=4, y2=17, dim_ticks=False)
                                          + needle(INK, ACCENT, heavy=True), 0.92)),
    # Android adaptive icon layers: transparent, mark inside the 66% safe zone.
    "logo-dv-android-fg.svg": svg("Etqadem logo, Android adaptive foreground",
                                  "Adaptive foreground: transparent, mark inside the 66% safe zone; "
                                  "pair with a flat #F3F0E8 background.", scaled(light, 0.64)),
    "logo-dv-android-mono.svg": svg("Etqadem logo, Android themed monochrome",
                                    "Android 13+ themed-icon layer: silhouette inside the safe zone.",
                                    scaled(white, 0.64)),
}

for name, content in files.items():
    (OUT / name).write_text(content, encoding="utf-8", newline="\n")
    print("wrote", name)
