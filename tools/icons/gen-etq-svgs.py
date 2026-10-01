"""Etqadem logo: writes icons/logo-etq*.svg (stair-climber mark, Round 3 final).
Source of truth for the geometry is brand/etqadem-r1/build_final.py; it is copied here so this
script is self-contained. Run: python tools/icons/gen-etq-svgs.py, then
PLAYWRIGHT_CORE=<path to playwright-core> node tools/icons/render-pngs-etq.mjs
Mark box is 96 x 96. New filenames (-etq) because /icons/ is cached as immutable."""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent.parent / "icons"
TEAL = "#0B7A75"; LIT = "#3CC2B8"; PAPER = "#F3F0E8"; WHITE = "#ffffff"
DY = 2


def line(pts, col, w):
    d = "M" + "L".join(f"{x:g} {y + DY:g}" for x, y in pts)
    return (f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w:g}" '
            f'stroke-linecap="round" stroke-linejoin="round"/>')


def mark(fg, head):
    """Full mark: three plates, figure stepping from plate 1 to plate 2, head in the accent."""
    plates = "".join(f'<rect x="{x}" y="{y + DY}" width="27" height="{88 - y}" rx="5" fill="{fg}"/>'
                     for x, y in [(4, 76), (34, 66), (64, 56)])
    return (plates + line([(43, 28), (36, 49)], fg, 10) + line([(36, 49), (52, 52), (50, 63)], fg, 9)
            + line([(36, 49), (28, 63), (21, 73.5)], fg, 9) + line([(43, 28), (55, 34), (63, 26)], fg, 8)
            + line([(43, 28), (33, 37), (27, 45)], fg, 8)
            + f'<circle cx="48" cy="{12.5 + DY:g}" r="8.5" fill="{head}"/>')


def small(fg, head):
    """16px variant, snapped to the 16px grid (1px = 6 units): three 4px-wide plates 1px apart, a 2px figure
    whose head fuses with the torso, feet sunk into the plates, no arms. Drawn at 1:1 (no extra scale)."""
    plates = "".join(f'<rect x="{x}" y="{y}" width="24" height="{90 - y}" rx="2" fill="{fg}"/>'
                     for x, y in [(6, 72), (36, 60), (66, 48)])
    def seg(pts):
        d = "M" + "L".join(f"{x:g} {y:g}" for x, y in pts)
        return f'<path d="{d}" fill="none" stroke="{fg}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>'
    return (plates + seg([(45, 30), (39, 50)]) + seg([(39, 50), (53, 55), (53, 62)]) + seg([(39, 50), (22, 67), (20, 72)])
            + f'<circle cx="45" cy="17" r="10.5" fill="{head}"/>')


def scaled(inner, k):
    return f'<g transform="translate(48 48) scale({k}) translate(-48 -48)">{inner}</g>'


def svg(label, comment, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="{label}">\n'
            f'  <!-- {comment} -->\n  {body}\n</svg>\n')


tile = f'<rect width="96" height="96" rx="21" ry="21" fill="{TEAL}"/>'
full = f'<rect width="96" height="96" fill="{TEAL}"/>'
files = {
    "logo-etq.svg": svg("Etqadem logo", "Stair-climber mark, white on a rounded Deep Teal tile.",
                        tile + scaled(mark(WHITE, WHITE), 0.78)),
    "logo-etq-ondark.svg": svg("Etqadem logo", "Reversed mark, no tile, for dark surfaces.", mark(PAPER, LIT)),
    "logo-etq-mono.svg": svg("Etqadem logo, monochrome", "Single-colour silhouette, transparent bg.",
                             mark(WHITE, WHITE)),
    "logo-etq-maskable.svg": svg("Etqadem logo", "Maskable: full-bleed Deep Teal, mark inside the 80% safe circle.",
                                 full + scaled(mark(WHITE, WHITE), 0.62)),
    "logo-etq-tiny.svg": svg("Etqadem logo", "Small-size variant (16px): heavier limbs and plates, one arm.",
                             tile + small(WHITE, WHITE)),
    "logo-etq-android-fg.svg": svg("Etqadem logo, Android adaptive foreground",
                                   "Adaptive foreground: transparent, mark inside the 66% safe zone; pair with flat #0B7A75.",
                                   scaled(mark(WHITE, WHITE), 0.48)),
    "logo-etq-android-mono.svg": svg("Etqadem logo, Android themed monochrome",
                                     "Android 13+ themed-icon layer: silhouette inside the safe zone.",
                                     scaled(mark(WHITE, WHITE), 0.48)),
}
for name, content in files.items():
    (OUT / name).write_text(content, encoding="utf-8", newline="\n")
    print("wrote", name)
(OUT / "android-bg-color-etq.txt").write_text(TEAL + "\n", encoding="utf-8", newline="\n")
