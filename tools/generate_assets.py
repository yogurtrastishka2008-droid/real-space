"""
Asset pipeline for REAL SPACE.

- Upscales the 1k NASA-derived / Solar System Scope-derived base maps that ship
  with the project (source: threex.planets / three.js example textures).
- Synthesises equirectangular maps for the moons that have no public map in the
  bundled set, a Milky Way panorama, Saturn / Uranus ring profiles and glow
  sprites.

Everything is generated locally, no network access is required at runtime.
"""
from __future__ import annotations

import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEX = os.path.join(ROOT, "public", "textures")
os.makedirs(TEX, exist_ok=True)

RNG = np.random.default_rng(20261019)


# ---------------------------------------------------------------- noise utils
def smoothstep(t):
    return t * t * (3.0 - 2.0 * t)


def value_noise(h: int, w: int, cells_y: int, cells_x: int, rng) -> np.ndarray:
    """Seamless-in-x value noise."""
    grid = rng.random((cells_y + 1, cells_x + 1))
    grid[:, -1] = grid[:, 0]
    ys = np.arange(h) * cells_y / h
    xs = np.arange(w) * cells_x / w
    y0 = np.floor(ys).astype(int)
    x0 = np.floor(xs).astype(int)
    fy = smoothstep(ys - y0)[:, None]
    fx = smoothstep(xs - x0)[None, :]
    g00 = grid[np.ix_(y0, x0)]
    g10 = grid[np.ix_(y0, x0 + 1)]
    g01 = grid[np.ix_(y0 + 1, x0)]
    g11 = grid[np.ix_(y0 + 1, x0 + 1)]
    top = g00 * (1 - fx) + g10 * fx
    bot = g01 * (1 - fx) + g11 * fx
    return top * (1 - fy) + bot * fy


def fbm(h, w, cells=4, octaves=6, gain=0.5, rng=RNG) -> np.ndarray:
    total = np.zeros((h, w), dtype=np.float64)
    amp = 1.0
    norm = 0.0
    cy, cx = cells, cells * 2
    for _ in range(octaves):
        total += value_noise(h, w, cy, cx, rng) * amp
        norm += amp
        amp *= gain
        cy = max(2, int(cy * 2))
        cx = max(4, int(cx * 2))
    return total / norm


def ridged(h, w, cells=4, octaves=5, rng=RNG) -> np.ndarray:
    total = np.zeros((h, w), dtype=np.float64)
    amp, norm = 1.0, 0.0
    cy, cx = cells, cells * 2
    for _ in range(octaves):
        n = value_noise(h, w, cy, cx, rng)
        total += (1.0 - np.abs(n * 2 - 1)) ** 2 * amp
        norm += amp
        amp *= 0.5
        cy = max(2, int(cy * 2))
        cx = max(4, int(cx * 2))
    return total / norm


def mix(a, b, t):
    t = t[..., None] if t.ndim == 2 else t
    return a * (1 - t) + b * t


def colorize(h, w, stops, t):
    """stops: list of (position, (r,g,b)) ; t in 0..1"""
    out = np.zeros((h, w, 3), dtype=np.float64)
    pos = np.array([s[0] for s in stops], dtype=np.float64)
    cols = np.array([s[1] for s in stops], dtype=np.float64)
    flat = t.reshape(-1)
    for ch in range(3):
        out[..., ch] = np.interp(flat, pos, cols[:, ch]).reshape(h, w)
    return out


def add_craters(img: np.ndarray, count: int, rmin: int, rmax: int, rng, strength=1.0):
    """Crater field on an equirect image. Dark floor, bright rim, soft shadow."""
    h, w, _ = img.shape
    for _ in range(count):
        cx = rng.integers(0, w)
        cy = rng.integers(0, h)
        r = int(rng.integers(rmin, rmax))
        if r < 2:
            continue
        y0, y1 = max(0, cy - r * 2), min(h, cy + r * 2)
        x0, x1 = max(0, cx - r * 2), min(w, cx + r * 2)
        if y1 <= y0 or x1 <= x0:
            continue
        yy, xx = np.mgrid[y0:y1, x0:x1]
        # wrap horizontally
        dx = (xx - cx + w / 2) % w - w / 2
        dy = yy - cy
        d = np.sqrt(dx * dx + dy * dy) / r
        mask = d < 1.25
        if not mask.any():
            continue
        inner = np.clip(1 - d, 0, 1)
        rim = np.exp(-((d - 0.92) ** 2) / 0.012)
        shade = np.clip((dx / r) * 0.4 + 0.5, 0, 1)
        delta = (-0.12 + 0.14 * rim + (inner ** 2) * 0.04 - 0.07 * shade * inner) * strength
        patch = img[y0:y1, x0:x1]
        patch[mask] += delta[mask][:, None] * 255
    return np.clip(img, 0, 255)


def save(arr: np.ndarray, name: str, quality=90, mode=None):
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr, mode or ("RGBA" if arr.shape[2] == 4 else "RGB"))
    path = os.path.join(TEX, name)
    if name.lower().endswith(".png"):
        img.save(path, optimize=True)
    else:
        img.save(path, quality=quality, subsampling=1, optimize=True, progressive=True)
    print(f"  wrote {name:28s} {img.size[0]}x{img.size[1]}  {os.path.getsize(path)//1024} KB")


# ------------------------------------------------------------------ upscales
UPSCALE = ["jupiter.jpg", "saturn.jpg", "uranus.jpg", "neptune.jpg", "mercury.jpg",
           "venus.jpg", "mars.jpg", "pluto.jpg", "moon.jpg", "sun.jpg"]


def upscale_bases():
    print("Upscaling base maps")
    for name in UPSCALE:
        src = os.path.join(TEX, name)
        if not os.path.exists(src):
            continue
        img = Image.open(src).convert("RGB")
        if img.width < 1800:
            img = img.resize((2048, 1024), Image.LANCZOS)
            img = img.filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=2))
        img.save(src, quality=92, subsampling=1, progressive=True)
        print(f"  {name:20s} -> {img.size[0]}x{img.size[1]} {os.path.getsize(src)//1024} KB")


# --------------------------------------------------------------------- moons
MOON_SPECS = {
    # name, size, base noise stops, crater count, extra
    "io": dict(stops=[(0.0, (104, 66, 20)), (0.25, (196, 148, 44)), (0.45, (233, 202, 108)),
                      (0.62, (222, 226, 190)), (0.8, (206, 122, 38)), (1.0, (248, 241, 214))],
               cells=7, craters=14, contrast=1.15),
    "europa": dict(stops=[(0.0, (150, 126, 104)), (0.4, (206, 190, 172)), (0.72, (231, 222, 209)),
                         (1.0, (248, 246, 241))], cells=6, craters=6, contrast=0.9),
    "ganymede": dict(stops=[(0.0, (92, 82, 72)), (0.42, (140, 126, 111)), (0.72, (176, 164, 148)),
                           (1.0, (208, 200, 186))], cells=5, craters=140, contrast=1.0),
    "callisto": dict(stops=[(0.0, (58, 50, 43)), (0.4, (96, 85, 73)), (0.75, (128, 115, 99)),
                           (1.0, (170, 156, 136))], cells=8, craters=190, contrast=1.1),
    "titan": dict(stops=[(0.0, (162, 112, 44)), (0.45, (203, 148, 68)), (0.78, (221, 175, 102)),
                        (1.0, (232, 197, 136))], cells=3, craters=0, contrast=0.55),
    "enceladus": dict(stops=[(0.0, (196, 208, 216)), (0.5, (222, 231, 238)), (0.82, (238, 244, 249)),
                            (1.0, (252, 254, 255))], cells=6, craters=30, contrast=0.7),
    "rhea": dict(stops=[(0.0, (128, 124, 118)), (0.45, (166, 161, 153)), (0.8, (196, 191, 182)),
                       (1.0, (220, 216, 208))], cells=7, craters=220, contrast=0.95),
    "mimas": dict(stops=[(0.0, (140, 136, 128)), (0.5, (178, 173, 164)), (0.85, (208, 203, 193)),
                        (1.0, (226, 222, 214))], cells=6, craters=200, contrast=1.0),
    "iapetus": dict(stops=[(0.0, (44, 36, 28)), (0.45, (96, 82, 66)), (0.55, (188, 180, 164)),
                          (1.0, (222, 215, 199))], cells=5, craters=180, contrast=1.2),
    "titania": dict(stops=[(0.0, (112, 102, 92)), (0.45, (152, 141, 128)), (0.8, (186, 176, 162)),
                          (1.0, (208, 200, 187))], cells=6, craters=130, contrast=1.0),
    "oberon": dict(stops=[(0.0, (84, 76, 68)), (0.45, (120, 110, 99)), (0.8, (154, 143, 129)),
                         (1.0, (180, 170, 156))], cells=6, craters=170, contrast=1.0),
    "ariel": dict(stops=[(0.0, (146, 142, 136)), (0.45, (182, 178, 170)), (0.8, (210, 206, 199)),
                        (1.0, (230, 227, 221))], cells=5, craters=90, contrast=1.0),
    "miranda": dict(stops=[(0.0, (108, 106, 102)), (0.4, (152, 149, 143)), (0.7, (188, 184, 177)),
                          (1.0, (216, 212, 205))], cells=4, craters=70, contrast=1.0),
    "triton": dict(stops=[(0.0, (150, 126, 120)), (0.4, (198, 176, 168)), (0.72, (224, 208, 202)),
                         (1.0, (242, 234, 230))], cells=5, craters=35, contrast=1.0),
    "phobos": dict(stops=[(0.0, (54, 46, 39)), (0.4, (84, 72, 60)), (0.72, (108, 94, 78)),
                         (1.0, (132, 116, 97))], cells=8, craters=190, contrast=1.1),
    "deimos": dict(stops=[(0.0, (70, 60, 50)), (0.45, (102, 89, 75)), (0.8, (128, 113, 95)),
                         (1.0, (154, 138, 118))], cells=9, craters=180, contrast=0.85),
    "charon": dict(stops=[(0.0, (92, 86, 80)), (0.45, (138, 131, 122)), (0.8, (176, 169, 159)),
                         (1.0, (204, 198, 189))], cells=5, craters=90, contrast=1.0),
}


def draw_cracks(img, count, rng, color, width=2, alpha=0.55):
    h, w, _ = img.shape
    canvas = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    draw = ImageDraw.Draw(canvas, "RGBA")
    for _ in range(count):
        x = rng.integers(0, w)
        y = rng.integers(0, h)
        ang = rng.uniform(0, math.tau)
        length = rng.integers(w // 14, w // 4)
        pts = [(x, y)]
        for step in range(6):
            ang += rng.uniform(-0.55, 0.55)
            x += math.cos(ang) * length / 6
            y += math.sin(ang) * length / 6
            pts.append((x, y))
        for offset in (-w, 0, w):
            shifted = [(px + offset, py) for px, py in pts]
            draw.line(shifted, fill=(*color, int(alpha * 255)), width=width, joint="curve")
    out = np.asarray(canvas.filter(ImageFilter.GaussianBlur(0.7)), dtype=np.float64)
    return out


def gen_moons():
    print("Generating moon maps")
    h, w = 512, 1024
    for name, spec in MOON_SPECS.items():
        n = fbm(h, w, cells=spec["cells"], octaves=6, rng=RNG)
        n2 = fbm(h, w, cells=spec["cells"] * 3, octaves=5, rng=RNG)
        t = np.clip((n * 0.78 + n2 * 0.22 - 0.5) * spec["contrast"] + 0.5, 0, 1)
        img = colorize(h, w, spec["stops"], t)
        if spec["craters"]:
            img = add_craters(img, spec["craters"], 2, max(4, w // 26), RNG, strength=1.0)
        if name == "europa":
            img = draw_cracks(img, 90, RNG, (120, 78, 58), width=2, alpha=0.45)
            img = draw_cracks(img, 30, RNG, (168, 122, 90), width=4, alpha=0.28)
        if name == "enceladus":
            # tiger stripes near the south pole
            canvas = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
            d = ImageDraw.Draw(canvas, "RGBA")
            for i in range(4):
                y = h - 30 - i * 18
                d.line([(w * 0.42 + i * 22, y), (w * 0.56 + i * 18, y - 8)],
                       fill=(120, 165, 200, 150), width=5)
            img = np.asarray(canvas.filter(ImageFilter.GaussianBlur(0.9)), dtype=np.float64)
        if name == "triton":
            img = draw_cracks(img, 26, RNG, (96, 76, 76), width=3, alpha=0.4)
        if name == "ganymede":
            img = draw_cracks(img, 40, RNG, (188, 180, 166), width=3, alpha=0.3)
        if name == "miranda":
            # coronae patchwork: bright chevrons
            yy = np.linspace(0, 1, h)[:, None]
            xx = np.linspace(0, 1, w)[None, :]
            patch = (np.sin(xx * 22 + yy * 9) > 0.75).astype(np.float64)
            patch = np.array(Image.fromarray((patch * 255).astype(np.uint8)).filter(
                ImageFilter.GaussianBlur(2)), dtype=np.float64) / 255.0
            img = img * (1 - patch[..., None] * 0.35) + 210 * patch[..., None] * 0.35
        save(img, f"moon_{name}.jpg", quality=88)


DWARF_SPECS = {
    "ceres": dict(stops=[(0.0, (48, 46, 43)), (0.4, (78, 75, 70)), (0.75, (102, 98, 92)),
                         (1.0, (128, 123, 115))], cells=7, craters=340, contrast=1.0, bright_spots=9),
    "haumea": dict(stops=[(0.0, (150, 158, 168)), (0.45, (198, 205, 213)), (0.8, (226, 231, 236)),
                          (1.0, (246, 249, 252))], cells=5, craters=50, contrast=0.7),
    "makemake": dict(stops=[(0.0, (108, 62, 44)), (0.4, (160, 96, 68)), (0.75, (194, 128, 92)),
                            (1.0, (218, 158, 118))], cells=6, craters=40, contrast=0.9),
    "eris": dict(stops=[(0.0, (150, 148, 144)), (0.45, (196, 194, 189)), (0.8, (226, 224, 219)),
                        (1.0, (248, 247, 243))], cells=5, craters=100, contrast=0.9),
}


def gen_dwarfs():
    print("Generating dwarf-planet maps")
    h, w = 512, 1024
    for name, spec in DWARF_SPECS.items():
        n = fbm(h, w, cells=spec["cells"], octaves=6, rng=RNG)
        n2 = fbm(h, w, cells=spec["cells"] * 3, octaves=5, rng=RNG)
        t = np.clip((n * 0.8 + n2 * 0.2 - 0.5) * spec["contrast"] + 0.5, 0, 1)
        img = colorize(h, w, spec["stops"], t)
        img = add_craters(img, spec["craters"], 2, max(4, w // 34), RNG, strength=0.9)
        if name == "ceres":
            canvas = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
            draw = ImageDraw.Draw(canvas, "RGBA")
            for _ in range(spec["bright_spots"]):
                x = int(RNG.integers(int(w * 0.15), int(w * 0.85)))
                y = int(RNG.integers(int(h * 0.25), int(h * 0.8)))
                r = int(RNG.integers(3, 9))
                draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=(244, 244, 236, 210))
            img = np.asarray(canvas.filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float64)
        if name == "haumea":
            canvas = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
            draw = ImageDraw.Draw(canvas, "RGBA")
            draw.ellipse([(w * 0.4, h * 0.42), (w * 0.56, h * 0.58)], fill=(128, 74, 60, 110))
            img = np.asarray(canvas.filter(ImageFilter.GaussianBlur(4)), dtype=np.float64)
        save(img, f"dwarf_{name}.jpg", quality=88)


# --------------------------------------------------------------- milky way
def gen_milkyway():
    print("Generating Milky Way panorama")
    w, h = 4096, 2048
    yy = np.linspace(-1, 1, h)[:, None]
    xx = np.linspace(0, 1, w)[None, :]

    # A tilted great circle approximated on the equirectangular canvas.
    band_y = 0.16 * np.sin(xx * math.tau * 0.75 + 1.1) - 0.05
    core = np.exp(-((yy - band_y) ** 2) / (2 * 0.16 ** 2))
    halo = np.exp(-((yy - band_y) ** 2) / (2 * 0.42 ** 2))

    clouds = fbm(h, w, cells=6, octaves=7, rng=RNG)
    fine = fbm(h, w, cells=40, octaves=5, rng=RNG)
    dust = fbm(h, w, cells=9, octaves=6, rng=RNG)

    intensity = 0.10 + halo * 0.30 + core * (0.30 + 0.55 * clouds)
    # dust lanes: dark filaments following the band
    lane = np.clip((dust - 0.46) * 3.0, 0, 1) * np.exp(-((yy - band_y) ** 2) / (2 * 0.10 ** 2))
    intensity *= 1.0 - lane * 0.75

    warm = np.array([1.0, 0.86, 0.72])
    cool = np.array([0.62, 0.74, 1.0])
    tint = core[..., None] * warm + (1 - core[..., None]) * cool
    img = np.zeros((h, w, 3), dtype=np.float64)
    base = intensity * (0.75 + fine * 0.8)
    for c in range(3):
        img[..., c] = base * tint[..., c] * 62 + 3

    # sprinkle stars, denser along the band
    for count, bright in ((26000, 0.55), (3000, 1.0), (260, 1.6)):
        xs = RNG.integers(0, w, count)
        ys = RNG.integers(0, h, count)
        ys = np.where(RNG.random(count) < 0.45,
                      np.clip(ys * 0.55 + (band_y[0, xs] * 0.5 + 0.5) * h * 0.45, 0, h - 1).astype(int),
                      ys)
        img[ys, xs] += bright * 255
    img = np.asarray(Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(0.6)), dtype=np.float64)
    save(img, "milkyway.jpg", quality=88)


# -------------------------------------------------------------------- rings
SATURN_R = 60330.0


def ring_profile(width, r_inner, r_outer, bands, gaps):
    prof = np.ones(width, dtype=np.float64)
    color = np.ones((width, 3), dtype=np.float64)
    x = np.linspace(r_inner, r_outer, width)
    for gap_center, gap_width, depth in gaps:
        g = np.exp(-((x - gap_center) ** 2) / (2 * (gap_width / 2.2) ** 2))
        prof *= 1 - g * depth
    detail = fbm(1, width, cells=2, octaves=7, rng=RNG)[0]
    prof *= 0.72 + detail * 0.5
    for lo, hi, alpha, col in bands:
        m = (x >= lo) & (x < hi)
        prof[m] = alpha
        color[m] = col
    # density-wave striations
    stri = 0.9 + 0.1 * np.sin(x * 0.9) + 0.05 * np.sin(x * 2.7 + 1.2)
    prof *= stri
    img = np.zeros((1, width, 4), dtype=np.float64)
    img[0, :, :3] = color * 255
    img[0, :, 3] = np.clip(prof, 0, 1) * 255
    return img


def gen_rings():
    print("Generating ring maps")
    R = SATURN_R
    bands = [
        (1.20, 1.238, 0.02, (0.55, 0.50, 0.45)),   # D ring (almost invisible)
        (1.238, 1.527, 0.30, (0.62, 0.55, 0.47)),  # C ring
        (1.527, 1.951, 0.96, (0.86, 0.78, 0.63)),  # B ring
        (1.951, 2.027, 0.07, (0.60, 0.56, 0.50)),  # Cassini division
        (2.027, 2.269, 0.72, (0.79, 0.72, 0.60)),  # A ring
        (2.269, 2.310, 0.03, (0.55, 0.52, 0.48)),  # Roche division
        (2.310, 2.330, 0.28, (0.82, 0.78, 0.72)),  # F ring
    ]
    gaps = [
        (133590 / R, 0.010, 0.97),   # Encke gap
        (117580 / R, 0.008, 0.90),   # Cassini
        (122170 / R, 0.006, 0.55),
        (136780 / R, 0.004, 0.85),   # Keeler gap
        (1.95, 0.012, 0.90),
        (2.21, 0.006, 0.6),
    ]
    img = ring_profile(4096, 1.20, 2.33, bands, gaps)
    save(img, "saturn_ring.png", mode="RGBA")

    # Uranus: nine narrow, faint rings from 1.5 to 2.0 planetary radii.
    width = 2048
    u = np.zeros((1, width, 4), dtype=np.float64)
    x = np.linspace(1.45, 2.05, width)
    alpha = np.zeros(width)
    for center, strength, wdt in [(1.56, .20, .004), (1.63, .35, .003), (1.68, .30, .003),
                                  (1.75, .18, .004), (1.83, .26, .003), (1.90, .22, .003),
                                  (1.95, .45, .0025), (2.00, .30, .003), (2.03, .16, .002)]:
        alpha += np.exp(-((x - center) ** 2) / (2 * wdt ** 2)) * strength
    u[0, :, 0] = 160
    u[0, :, 1] = 172
    u[0, :, 2] = 180
    u[0, :, 3] = np.clip(alpha, 0, 1) * 255
    save(u, "uranus_ring.png", mode="RGBA")


# ------------------------------------------------------------------ sprites
def gen_sprites():
    print("Generating sprites")
    size = 256
    yy, xx = np.mgrid[0:size, 0:size]
    r = np.sqrt((xx - size / 2 + .5) ** 2 + (yy - size / 2 + .5) ** 2) / (size / 2)
    glow = np.exp(-(r ** 2) * 5.0)
    img = np.zeros((size, size, 4), dtype=np.float64)
    img[..., 0] = 255
    img[..., 1] = 236
    img[..., 2] = 205
    img[..., 3] = np.clip(glow, 0, 1) * 255
    save(img, "sun_glow.png", mode="RGBA")

    star = np.zeros((size, size, 4), dtype=np.float64)
    g = np.exp(-(r ** 2) * 14.0) + 0.28 * np.exp(-(r ** 2) * 160)
    star[..., 0] = 255
    star[..., 1] = 255
    star[..., 2] = 255
    star[..., 3] = np.clip(g, 0, 1) * 255
    save(star, "star_sprite.png", mode="RGBA")


if __name__ == "__main__":
    upscale_bases()
    gen_moons()
    gen_dwarfs()
    gen_milkyway()
    gen_rings()
    gen_sprites()
    print("Done")
