"""
Tilawat Checker app icon generator.
Draws a simple, warm open-book + crescent/star mark in an
Islamic green & gold palette - no fonts, no copyrighted art,
pure geometric shapes so it renders identically everywhere.
"""
from PIL import Image, ImageDraw
import math

SIZE = 1024
FOREST = (27, 75, 67, 255)
FOREST_DARK = (18, 33, 29, 255)
FOREST_LIGHT = (39, 106, 93, 255)
GOLD = (201, 162, 39, 255)
GOLD_SOFT = (228, 206, 123, 255)
CREAM = (247, 243, 232, 255)
TRANSPARENT = (0, 0, 0, 0)


def bezier_points(p0, p1, p2, p3, n=40):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = ((1 - t) ** 3) * p0[0] + 3 * ((1 - t) ** 2) * t * p1[0] + 3 * (1 - t) * (t ** 2) * p2[0] + (t ** 3) * p3[0]
        y = ((1 - t) ** 3) * p0[1] + 3 * ((1 - t) ** 2) * t * p1[1] + 3 * (1 - t) * (t ** 2) * p2[1] + (t ** 3) * p3[1]
        pts.append((x, y))
    return pts


def draw_book(draw, cx, cy, scale, page_color, spine_color, line_color):
    """Open book drawn from two curved 'pages' meeting at a spine."""
    w = 300 * scale
    h = 190 * scale

    # Left page: curves up-left then down to the spine
    left_outer = bezier_points(
        (cx - w, cy + h * 0.55),
        (cx - w * 0.9, cy - h * 0.65),
        (cx - w * 0.35, cy - h * 0.95),
        (cx, cy - h * 0.15),
    )
    left_page = [(cx - w, cy + h * 0.55)] + left_outer + [(cx, cy + h * 0.65), (cx - w, cy + h * 0.55)]
    draw.polygon(left_page, fill=page_color)

    # Right page: mirror of left
    right_outer = bezier_points(
        (cx + w, cy + h * 0.55),
        (cx + w * 0.9, cy - h * 0.65),
        (cx + w * 0.35, cy - h * 0.95),
        (cx, cy - h * 0.15),
    )
    right_page = [(cx + w, cy + h * 0.55)] + right_outer + [(cx, cy + h * 0.65), (cx + w, cy + h * 0.55)]
    draw.polygon(right_page, fill=page_color)

    # Spine
    draw.polygon(
        [(cx - 6 * scale, cy - h * 0.15), (cx + 6 * scale, cy - h * 0.15),
         (cx + 6 * scale, cy + h * 0.65), (cx - 6 * scale, cy + h * 0.65)],
        fill=spine_color,
    )

    # A few soft page lines (suggesting text, not real letters)
    for i, frac in enumerate([0.15, 0.32, 0.49]):
        y = cy - h * 0.15 + (h * 0.6) * frac + h * 0.12
        lw = max(2, int(4 * scale))
        # left lines
        draw.line([(cx - w * 0.72, y - h * 0.05 * frac), (cx - w * 0.18, y)], fill=line_color, width=lw)
        # right lines
        draw.line([(cx + w * 0.18, y), (cx + w * 0.72, y - h * 0.05 * frac)], fill=line_color, width=lw)


def draw_crescent_star(draw, cx, cy, r, color):
    # Crescent = big circle minus offset smaller circle (use mask)
    bbox = [cx - r, cy - r, cx + r, cy + r]
    draw.ellipse(bbox, fill=color)
    inner_r = r * 0.78
    off = r * 0.42
    bbox2 = [cx - inner_r + off, cy - inner_r, cx + inner_r + off, cy + inner_r]
    draw.ellipse(bbox2, fill=TRANSPARENT)

    # small 4-point star to the upper-right of crescent
    star_cx, star_cy, star_r = cx + r * 1.55, cy - r * 0.55, r * 0.42
    pts = []
    for i in range(8):
        ang = math.pi / 4 * i - math.pi / 2
        rad = star_r if i % 2 == 0 else star_r * 0.4
        pts.append((star_cx + rad * math.cos(ang), star_cy + rad * math.sin(ang)))
    draw.polygon(pts, fill=color)


def make_foreground(path):
    img = Image.new("RGBA", (SIZE, SIZE), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2 + 70
    draw_crescent_star(draw, cx - 8, cy - 230, 46, GOLD_SOFT)
    draw_book(draw, cx, cy, scale=0.8, page_color=CREAM, spine_color=GOLD, line_color=GOLD)
    img.save(path)


def make_background(path):
    img = Image.new("RGBA", (SIZE, SIZE), FOREST)
    draw = ImageDraw.Draw(img)
    # soft radial vignette using concentric circles
    steps = 60
    for i in range(steps, 0, -1):
        t = i / steps
        r = int(SIZE * 0.75 * t)
        col = tuple(int(FOREST_LIGHT[c] * (1 - t) + FOREST[c] * t) for c in range(3)) + (255,)
        draw.ellipse([SIZE / 2 - r, SIZE / 2 - r, SIZE / 2 + r, SIZE / 2 + r], fill=col)
    img.save(path)


def make_combined(fg_path, bg_path, out_path):
    bg = Image.open(bg_path).convert("RGBA")
    fg = Image.open(fg_path).convert("RGBA")
    combined = Image.alpha_composite(bg, fg)
    combined.save(out_path)


def make_splash(icon_combined_path, out_path, canvas=2732):
    bg = Image.new("RGBA", (canvas, canvas), FOREST_DARK)
    draw = ImageDraw.Draw(bg)
    for i in range(60, 0, -1):
        t = i / 60
        r = int(canvas * 0.5 * t)
        col = tuple(int(FOREST[c] * (1 - t) + FOREST_DARK[c] * t) for c in range(3)) + (255,)
        draw.ellipse([canvas / 2 - r, canvas / 2 - r, canvas / 2 + r, canvas / 2 + r], fill=col)
    icon = Image.open(icon_combined_path).convert("RGBA")
    icon_size = int(canvas * 0.42)
    icon = icon.resize((icon_size, icon_size), Image.LANCZOS)
    pos = ((canvas - icon_size) // 2, (canvas - icon_size) // 2)
    bg.alpha_composite(icon, pos)
    bg.convert("RGB").save(out_path)


if __name__ == "__main__":
    import os
    out_dir = "/home/claude/quran-recitation-app/resources"
    os.makedirs(out_dir, exist_ok=True)
    fg = f"{out_dir}/icon-foreground.png"
    bg = f"{out_dir}/icon-background.png"
    combined = f"{out_dir}/icon.png"
    splash = f"{out_dir}/splash.png"
    make_foreground(fg)
    make_background(bg)
    make_combined(fg, bg, combined)
    make_splash(combined, splash)
    print("Icon files generated:", fg, bg, combined, splash)
