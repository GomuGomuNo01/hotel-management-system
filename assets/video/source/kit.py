"""Boîte à outils graphique de la charte « Lagune ».

Charte propre à La baie des lacs, pensée pour ne ressembler à aucune autre
présentation du portfolio :
- fond ivoire chaud alterné avec un vert lagune profond (jour / nuit) ;
- titres centrés en serif douce (Fraunces), accents en italique ;
- motifs : arche (porte d'hôtel), soleil, vagues de lagune et ondes ;
- transitions en marée, balayage ondulé, iris et onde de choc.

Tout est dessiné avec Pillow : formes lissées par sur-échantillonnage local,
textes en positionnement sub-pixel, masques de vagues calculés avec numpy.
"""

import math
import os
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from timeline import BEAT, DURATION, HEIGHT as H, SCENES, WIDTH as W

# ── Palette ───────────────────────────────────────────────────────────────
IVORY = (246, 240, 229)
PAPER = (255, 252, 246)       # cartes posées sur l'ivoire
SAND = (236, 224, 202)
SAND_L = (241, 231, 212)
SAND_D = (220, 203, 174)
LAGOON = (9, 54, 43)          # fond nuit
LAGOON_2 = (17, 77, 61)       # panneaux sur fond nuit
LAGOON_3 = (29, 104, 82)
GREEN = (47, 158, 91)         # couleur de marque (brand-500)
GREEN_D = (31, 122, 70)
MINT = (170, 218, 188)
AMBER = (217, 119, 6)         # accent de marque
AMBER_D = (176, 92, 10)
SUN = (242, 166, 58)
TERRA = (193, 88, 56)
INK = (22, 36, 30)
MUTED = (104, 112, 100)       # texte secondaire sur ivoire
MUTED_D = (150, 186, 166)     # texte secondaire sur lagune
GREY = (112, 122, 116)

# ── Polices (OFL, téléchargées par build.py) ──────────────────────────────
FONT_DIR = Path(os.environ.get("LBDL_FONT_DIR", Path(__file__).with_name(".fonts")))
FONT_FILES = {
    "serif": "Fraunces[SOFT,WONK,opsz,wght].ttf",
    "serif_i": "Fraunces-Italic[SOFT,WONK,opsz,wght].ttf",
    "sans": "Manrope[wght].ttf",
    "mono": "DMMono-Medium.ttf",
}


@lru_cache(maxsize=None)
def font(kind, size, weight=None):
    """kind : serif | serif_i | sans | mono. weight : 100-900 (serif, sans)."""
    f = ImageFont.truetype(str(FONT_DIR / FONT_FILES[kind]), max(1, int(round(size))))
    if kind in ("serif", "serif_i"):
        # Axes Fraunces : taille optique, graisse, douceur, « wonky ».
        f.set_variation_by_axes([min(144, max(9, size)), weight or 560, 100, 0])
    elif kind == "sans":
        f.set_variation_by_axes([weight or 500])
    return f


# ── Temps & courbes ───────────────────────────────────────────────────────

def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def prog(u, start, dur):
    """Avancement 0→1 d'une animation qui commence à `start` et dure `dur`."""
    return clamp((u - start) / dur) if dur > 0 else float(u >= start)


def lerp(a, b, p):
    return a + (b - a) * p


def mix(c1, c2, p):
    return tuple(int(round(lerp(a, b, p))) for a, b in zip(c1, c2))


def e_out(p):
    return 1 - (1 - p) ** 3


def e_in(p):
    return p ** 3


def e_in_out(p):
    return 4 * p ** 3 if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2


def e_expo(p):
    return 1.0 if p >= 1 else 1 - 2 ** (-10 * p)


def e_back(p, s=1.70158):
    c = s + 1
    return 1 + c * (p - 1) ** 3 + s * (p - 1) ** 2


def beat_pulse(t, decay=0.12):
    """1 sur chaque temps puis décroissance : sert à faire « respirer » l'image."""
    return math.exp(-((t % BEAT) / decay))


# ── Formes lissées ────────────────────────────────────────────────────────

class Local:
    """Masque local sur-échantillonné : on dessine en grand, on réduit, on colle.

    Usage :
        m = Local(x0, y0, x1, y1)
        m.d.ellipse(m.box(cx - r, cy - r, cx + r, cy + r), fill=255)
        m.paste(img, couleur, alpha)
    """

    def __init__(self, x0, y0, x1, y1, ss=None):
        self.x0 = int(math.floor(x0)) - 2
        self.y0 = int(math.floor(y0)) - 2
        self.w = max(1, int(math.ceil(x1)) + 2 - self.x0)
        self.h = max(1, int(math.ceil(y1)) + 2 - self.y0)
        area = self.w * self.h
        self.ss = ss or (4 if area < 160_000 else 3 if area < 700_000 else 2)
        self.m = Image.new("L", (self.w * self.ss, self.h * self.ss), 0)
        self.d = ImageDraw.Draw(self.m)

    def p(self, x, y):
        return ((x - self.x0) * self.ss, (y - self.y0) * self.ss)

    def box(self, x0, y0, x1, y1):
        return [*self.p(x0, y0), *self.p(x1, y1)]

    def s(self, v):
        return max(1, int(round(v * self.ss)))

    def mask(self, alpha=1.0):
        m = self.m.resize((self.w, self.h), Image.BOX)
        if alpha < 0.999:
            m = m.point(lambda v: int(v * alpha + 0.5))
        return m

    def paste(self, img, color, alpha=1.0):
        if alpha <= 0.003:
            return
        img.paste(color, (self.x0, self.y0, self.x0 + self.w, self.y0 + self.h), self.mask(alpha))

    def clip_above(self, y):
        """Efface tout ce qui est au-dessus de y (révélation par le bas)."""
        if y > self.y0:
            self.d.rectangle([0, 0, self.w * self.ss, (y - self.y0) * self.ss], fill=0)

    def clip_below(self, y):
        if y < self.y0 + self.h:
            self.d.rectangle([0, max(0, (y - self.y0) * self.ss), self.w * self.ss, self.h * self.ss], fill=0)


def circle(img, cx, cy, r, color, alpha=1.0, width=None):
    """Disque plein, ou anneau si `width` est donné."""
    if r <= 0.3:
        return
    pad = (width or 0) / 2
    m = Local(cx - r - pad, cy - r - pad, cx + r + pad, cy + r + pad)
    if width:
        m.d.ellipse(m.box(cx - r - pad, cy - r - pad, cx + r + pad, cy + r + pad), fill=255)
        ri = r - pad
        if ri > 0:
            m.d.ellipse(m.box(cx - ri, cy - ri, cx + ri, cy + ri), fill=0)
    else:
        m.d.ellipse(m.box(cx - r, cy - r, cx + r, cy + r), fill=255)
    m.paste(img, color, alpha)


def arc(img, cx, cy, r, start_deg, end_deg, color, width, alpha=1.0):
    """Arc de cercle (0° = 12 h, sens horaire), extrémités arrondies."""
    if end_deg - start_deg <= 0.2:
        return
    m = Local(cx - r - width, cy - r - width, cx + r + width, cy + r + width)
    m.d.arc(m.box(cx - r, cy - r, cx + r, cy + r), start_deg - 90, end_deg - 90, fill=255, width=m.s(width))
    for a in (start_deg, end_deg):
        x = cx + r * math.sin(math.radians(a))
        y = cy - r * math.cos(math.radians(a))
        m.d.ellipse(m.box(x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill=255)
    m.paste(img, color, alpha)


def rrect(img, x0, y0, x1, y1, r, color, alpha=1.0, width=None):
    """Rectangle arrondi plein, ou contour si `width` est donné."""
    if x1 - x0 < 0.5 or y1 - y0 < 0.5:
        return
    r = min(r, (x1 - x0) / 2, (y1 - y0) / 2)
    m = Local(x0, y0, x1, y1)
    m.d.rounded_rectangle(m.box(x0, y0, x1, y1), radius=r * m.ss, fill=255)
    if width:
        w = width
        if x1 - x0 > 2 * w and y1 - y0 > 2 * w:
            m.d.rounded_rectangle(m.box(x0 + w, y0 + w, x1 - w, y1 - w), radius=max(0, r - w) * m.ss, fill=0)
    m.paste(img, color, alpha)


def arch(img, x0, y_top, x1, y_bottom, color, alpha=1.0, width=None, reveal_from=None):
    """Arche (porte d'hôtel) : rectangle surmonté d'un demi-cercle.

    `width` : contour seul (ouvert en bas). `reveal_from` : ordonnée au-dessus
    de laquelle l'arche est masquée — en la faisant monter, l'arche « pousse ».
    """
    r = (x1 - x0) / 2
    cx = (x0 + x1) / 2
    m = Local(x0, y_top, x1, y_bottom)
    m.d.ellipse(m.box(x0, y_top, x1, y_top + 2 * r), fill=255)
    m.d.rectangle(m.box(x0, y_top + r, x1, y_bottom), fill=255)
    if width:
        w = width
        m.d.ellipse(m.box(x0 + w, y_top + w, x1 - w, y_top + 2 * r - w), fill=0)
        m.d.rectangle(m.box(x0 + w, y_top + r, x1 - w, y_bottom + 4), fill=0)
    if reveal_from is not None:
        m.clip_above(reveal_from)
    m.paste(img, color, alpha)
    return cx, r


def line(img, pts, color, width, alpha=1.0, round_caps=True):
    """Polyligne lissée (liste de points)."""
    if len(pts) < 2:
        return
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    m = Local(min(xs) - width, min(ys) - width, max(xs) + width, max(ys) + width)
    m.d.line([m.p(x, y) for x, y in pts], fill=255, width=m.s(width), joint="curve")
    if round_caps:
        for x, y in (pts[0], pts[-1]):
            m.d.ellipse(m.box(x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill=255)
    m.paste(img, color, alpha)


def polygon(img, pts, color, alpha=1.0):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    m = Local(min(xs), min(ys), max(xs), max(ys))
    m.d.polygon([m.p(x, y) for x, y in pts], fill=255)
    m.paste(img, color, alpha)


def dashed(img, pts, color, width, dash=14, gap=12, alpha=1.0):
    """Polyligne en pointillés (tirets arrondis)."""
    acc = 0.0
    on = True
    seg_pts = [pts[0]]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        L = math.hypot(x1 - x0, y1 - y0)
        pos = 0.0
        while pos < L:
            step = min((dash if on else gap) - acc, L - pos)
            pos += step
            acc += step
            px, py = x0 + (x1 - x0) * pos / L, y0 + (y1 - y0) * pos / L
            if on:
                seg_pts.append((px, py))
            if acc >= (dash if on else gap) - 1e-6:
                if on and len(seg_pts) > 1:
                    line(img, seg_pts, color, width, alpha)
                on = not on
                acc = 0.0
                seg_pts = [(px, py)]
    if on and len(seg_pts) > 1:
        line(img, seg_pts, color, width, alpha)


# ── Texte ─────────────────────────────────────────────────────────────────

def text_width(s, f, tracking=0):
    if not s:
        return 0.0
    if tracking:
        return sum(f.getlength(c) for c in s) + tracking * (len(s) - 1)
    return f.getlength(s)


def text(img, x, y, s, f, color, alpha=1.0, anchor="ls", tracking=0, clip=None):
    """Texte lissé, positionné au sub-pixel.

    anchor : convention Pillow (l/m/r + a/t/m/s/b), ex. « ms » = centré, ligne de base.
    tracking : espacement supplémentaire entre lettres (px), utile pour le mono.
    clip : (x0, y0, x1, y1) — seule cette zone est dessinée (révélations).
    """
    if not s or alpha <= 0.003:
        return
    if tracking:
        total = text_width(s, f, tracking)
        cx = x - {"l": 0, "m": total / 2, "r": total}[anchor[0]]
        for c in s:
            text(img, cx, y, c, f, color, alpha, "l" + anchor[1], 0, clip)
            cx += f.getlength(c) + tracking
        return
    l, t, r, b = f.getbbox(s, anchor=anchor)
    fx, fy = x - math.floor(x), y - math.floor(y)
    w, h = r - l + 6, b - t + 6
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).text((3 - l + fx, 3 - t + fy), s, font=f, fill=255, anchor=anchor)
    ox, oy = math.floor(x) + l - 3, math.floor(y) + t - 3
    if clip:
        d = ImageDraw.Draw(m)
        cx0, cy0, cx1, cy1 = (int(round(v)) for v in clip)
        if cy0 > oy:
            d.rectangle([0, 0, w, cy0 - oy - 1], fill=0)
        if cy1 < oy + h:
            d.rectangle([0, cy1 - oy, w, h], fill=0)
        if cx0 > ox:
            d.rectangle([0, 0, cx0 - ox - 1, h], fill=0)
        if cx1 < ox + w:
            d.rectangle([cx1 - ox, 0, w, h], fill=0)
    if alpha < 0.999:
        m = m.point(lambda v: int(v * alpha + 0.5))
    img.paste(color, (ox, oy, ox + w, oy + h), m)


def rise_text(img, x, y, s, f, color, u, start, dur=0.6, dist=None, anchor="ls", tracking=0):
    """Texte qui monte de derrière sa propre ligne de base (masque) en apparaissant."""
    p = prog(u, start, dur)
    if p <= 0:
        return
    e = e_out(p)
    dist = f.size * 0.9 if dist is None else dist
    floor_y = y + f.size * 0.32
    text(img, x, y + (1 - e) * dist, s, f, color, min(1.0, p * 1.6), anchor, tracking,
         clip=(-10_000, -10_000, 10_000, floor_y))


def letters(img, cx, y, s, f, color, u, start, stagger=0.04, dur=0.55, dist=None):
    """Titre lettre par lettre, centré sur cx, chaque lettre montant de sa ligne de base."""
    total = f.getlength(s)
    x0 = cx - total / 2
    dist = f.size * 0.85 if dist is None else dist
    for i, c in enumerate(s):
        if c == " ":
            continue
        p = prog(u, start + i * stagger, dur)
        if p <= 0:
            continue
        xi = x0 + f.getlength(s[:i])
        e = e_out(p)
        text(img, xi, y + (1 - e) * dist, c, f, color, min(1.0, p * 1.8), "ls",
             clip=(-10_000, -10_000, 10_000, y + f.size * 0.3))


def rich_line(img, cx, y, segments, u, start, stagger=0.07, dur=0.6, alpha=1.0, dy=0.0):
    """Ligne composée de segments (texte, police, couleur), centrée, révélée mot à mot.

    Exemple : rich_line(img, W/2, 200, [("Quatre espaces, ", font("serif", 74), INK),
                                        ("un seul système.", font("serif_i", 74), GREEN)], u, 0.2)
    `alpha` et `dy` permettent de faire sortir la ligne (fondu + glissement).
    """
    words = []
    for s, f, col in segments:
        parts = s.split(" ")
        for k, wd in enumerate(parts):
            if wd:
                words.append((wd, f, col))
            if k < len(parts) - 1:
                words.append((" ", f, col))
    total = sum(f.getlength(wd) for wd, f, _ in words)
    x = cx - total / 2
    i = 0
    for wd, f, col in words:
        if wd != " ":
            p = prog(u, start + i * stagger, dur)
            i += 1
            if p > 0:
                e = e_out(p)
                text(img, x, y + dy + (1 - e) * f.size * 0.8, wd, f, col, min(1.0, p * 1.6) * alpha, "ls",
                     clip=(-10_000, -10_000, 10_000, y + dy + f.size * 0.3))
        x += f.getlength(wd)


def typewriter(img, x, y, s, f, color, u, start, cps=55, anchor="ls", tracking=0, alpha=1.0):
    """Texte qui s'écrit caractère par caractère (largeur finale calculée d'avance)."""
    n = int((u - start) * cps)
    if n <= 0:
        return
    total = text_width(s, f, tracking)
    x0 = x - {"l": 0, "m": total / 2, "r": total}[anchor[0]]
    text(img, x0, y, s[: min(n, len(s))], f, color, alpha, "l" + anchor[1], tracking)
    if n < len(s) and int(u * 6) % 2 == 0:
        cw = text_width(s[:n], f, tracking)
        rrect(img, x0 + cw + 3, y - f.size * 0.72, x0 + cw + 5, y + 2, 1, color, alpha)


def pill(img, cx, cy, s, f, fg, bg=None, outline=None, alpha=1.0, pad_x=26, height=None, width=2):
    """Étiquette arrondie centrée sur (cx, cy). Renvoie (x0, y0, x1, y1)."""
    h = height or f.size * 2.1
    w = f.getlength(s) + 2 * pad_x
    x0, y0, x1, y1 = cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2
    if bg:
        rrect(img, x0, y0, x1, y1, h / 2, bg, alpha)
    if outline:
        rrect(img, x0, y0, x1, y1, h / 2, outline, alpha, width=width)
    text(img, cx, cy, s, f, fg, alpha, "mm")
    return x0, y0, x1, y1


def fmt_int(n):
    """1234567 → « 1 234 567 » (espace des milliers à la française)."""
    return f"{int(round(n)):,}".replace(",", " ")


# ── Pictogrammes (traits, centrés sur cx, cy, taille s) ───────────────────

def icon(img, name, cx, cy, s, color, alpha=1.0, width=None):
    """Pictogrammes au trait : search, suitcase, key, chart, bed, calendar, card,
    phone, check, lock, unlock, shield, doc, bell, broom, users, wave, bolt."""
    w = width or max(2.0, s * 0.075)
    h = s / 2
    L = lambda pts: line(img, [(cx + a * h, cy + b * h) for a, b in pts], color, w, alpha)
    R = lambda a, b, c, d, r=0.12: rrect(img, cx + a * h, cy + b * h, cx + c * h, cy + d * h, r * h, color, alpha, width=w)
    C = lambda a, b, r: circle(img, cx + a * h, cy + b * h, r * h, color, alpha, width=w)
    D = lambda a, b, r: circle(img, cx + a * h, cy + b * h, r * h, color, alpha)
    if name == "search":
        C(-0.15, -0.15, 0.55); L([(0.25, 0.25), (0.8, 0.8)])
    elif name == "suitcase":
        R(-0.85, -0.45, 0.85, 0.8); R(-0.32, -0.8, 0.32, -0.45, 0.1); L([(-0.85, 0.12), (0.85, 0.12)])
    elif name == "key":
        C(-0.45, 0, 0.35); L([(-0.1, 0), (0.85, 0)]); L([(0.55, 0), (0.55, 0.32)]); L([(0.8, 0), (0.8, 0.25)])
    elif name == "chart":
        L([(-0.85, 0.8), (0.85, 0.8)])
        for x, top in ((-0.5, 0.15), (0.0, -0.35), (0.5, -0.8)):
            R(x - 0.17, top, x + 0.17, 0.8, 0.06)
    elif name == "bed":
        L([(-0.85, -0.6), (-0.85, 0.75)]); L([(-0.85, 0.35), (0.85, 0.35)]); L([(0.85, 0.05), (0.85, 0.75)])
        R(-0.85, -0.05, 0.85, 0.35, 0.1); R(-0.65, -0.35, -0.2, -0.05, 0.1)
    elif name == "calendar":
        R(-0.8, -0.6, 0.8, 0.8); L([(-0.8, -0.2), (0.8, -0.2)]); L([(-0.4, -0.85), (-0.4, -0.45)]); L([(0.4, -0.85), (0.4, -0.45)])
        for a in (-0.4, 0.0, 0.4):
            D(a, 0.25, 0.08)
    elif name == "card":
        R(-0.85, -0.55, 0.85, 0.55); L([(-0.85, -0.2), (0.85, -0.2)]); L([(-0.55, 0.25), (-0.15, 0.25)])
    elif name == "phone":
        R(-0.45, -0.85, 0.45, 0.85, 0.15); L([(-0.12, 0.6), (0.12, 0.6)])
    elif name == "check":
        L([(-0.6, 0.02), (-0.18, 0.45), (0.65, -0.45)])
    elif name in ("lock", "unlock"):
        R(-0.6, -0.1, 0.6, 0.8, 0.12)
        if name == "lock":
            arc(img, cx, cy - 0.1 * h, 0.38 * h, -90, 90, color, w, alpha)
        else:
            arc(img, cx + 0.45 * h, cy - 0.35 * h, 0.38 * h, -90, 90, color, w, alpha)
        D(0, 0.32, 0.1)
    elif name == "shield":
        pts = [(0, -0.85), (0.7, -0.55), (0.62, 0.2), (0, 0.85), (-0.62, 0.2), (-0.7, -0.55), (0, -0.85)]
        L(pts); L([(-0.28, 0.0), (-0.05, 0.25), (0.32, -0.2)])
    elif name == "doc":
        L([(-0.6, -0.85), (0.25, -0.85), (0.6, -0.5), (0.6, 0.85), (-0.6, 0.85), (-0.6, -0.85)])
        for b in (-0.2, 0.15, 0.5):
            L([(-0.32, b), (0.32, b)])
    elif name == "bell":
        L([(-0.6, 0.45), (-0.5, -0.2), (-0.3, -0.55), (0, -0.65), (0.3, -0.55), (0.5, -0.2), (0.6, 0.45)])
        L([(-0.8, 0.45), (0.8, 0.45)]); D(0, 0.72, 0.13)
    elif name == "broom":
        L([(0.75, -0.85), (0.05, 0.1)]); polygon(img, [(cx - 0.25 * h, cy - 0.05 * h), (cx + 0.3 * h, cy + 0.35 * h),
                                                       (cx - 0.05 * h, cy + 0.85 * h), (cx - 0.8 * h, cy + 0.55 * h)], color, alpha)
    elif name == "users":
        C(-0.3, -0.35, 0.3); arc(img, cx - 0.3 * h, cy + 0.75 * h, 0.55 * h, -80, 80, color, w, alpha)
        C(0.45, -0.25, 0.22); arc(img, cx + 0.45 * h, cy + 0.7 * h, 0.4 * h, -10, 80, color, w, alpha)
    elif name == "wave":
        for b in (-0.35, 0.15, 0.65):
            L([(-0.85 + k * 0.17, b + 0.12 * math.sin(k * 1.2)) for k in range(11)])
    elif name == "bolt":
        polygon(img, [(cx + 0.15 * h, cy - 0.9 * h), (cx - 0.55 * h, cy + 0.1 * h), (cx - 0.05 * h, cy + 0.1 * h),
                      (cx - 0.15 * h, cy + 0.9 * h), (cx + 0.55 * h, cy - 0.1 * h), (cx + 0.05 * h, cy - 0.1 * h)], color, alpha)
    else:
        raise ValueError(f"pictogramme inconnu : {name}")


# ── Fonds, lagune, soleil ─────────────────────────────────────────────────

_YY = None


def _grid():
    global _YY
    if _YY is None:
        _YY = np.arange(H, dtype=np.float32)[:, None]
    return _YY


@lru_cache(maxsize=None)
def _night():
    """Dégradé vertical vert lagune, à peine plus clair en bas."""
    g = np.linspace(0, 1, H, dtype=np.float32)[:, None, None] ** 1.6
    top = np.array(LAGOON, np.float32)
    bot = np.array((14, 70, 55), np.float32)
    arr = (top + (bot - top) * g) * np.ones((1, W, 1), np.float32)
    return Image.fromarray(arr.round().astype(np.uint8), "RGB")


def bg_day():
    return Image.new("RGB", (W, H), IVORY)


def bg_sand():
    return Image.new("RGB", (W, H), SAND_L)


def bg_night():
    return _night().copy()


def wave_edge(x, base, amp, wavelength, phase):
    """Ordonnée d'une crête de vague composée (deux sinusoïdes) en x."""
    return (base + amp * np.sin(2 * np.pi * x / wavelength + phase)
            + amp * 0.45 * np.sin(2 * np.pi * x / (wavelength * 0.53) - phase * 1.3))


def water(img, base, color, t, amp=9.0, wavelength=620.0, speed=1.0, alpha=1.0, below=True):
    """Remplit sous (ou sur) une ligne de vague animée — horizon de lagune, marées."""
    x = np.arange(W, dtype=np.float32)
    edge = wave_edge(x, base, amp, wavelength, speed * t)
    lo = int(max(0, math.floor(edge.min()) - 2))
    hi = int(min(H, math.ceil(edge.max()) + 2))
    if below:
        if lo >= H:
            return
        rows = np.arange(lo, H, dtype=np.float32)[:, None]
        m = np.clip(rows - edge[None, :] + 0.5, 0, 1)
        y0 = lo
    else:
        if hi <= 0:
            return
        rows = np.arange(0, hi, dtype=np.float32)[:, None]
        m = np.clip(edge[None, :] - rows + 0.5, 0, 1)
        y0 = 0
    mask = Image.fromarray((m * 255 * alpha).astype(np.uint8), "L")
    img.paste(color, (0, y0, W, y0 + mask.height), mask)


def lagoon(img, horizon, t, alpha=1.0):
    """Horizon de lagune : vague verte claire derrière, vague profonde devant."""
    water(img, horizon - 14, GREEN, t, amp=7, wavelength=430, speed=1.3, alpha=alpha)
    water(img, horizon, LAGOON, t, amp=9, wavelength=640, speed=-0.9, alpha=alpha)


def sun_reflection(img, cx, horizon, r, t, alpha=1.0, rows=7):
    """Reflets du soleil sur la lagune : traits horizontaux qui scintillent."""
    for k in range(rows):
        y = horizon + 34 + k * 24
        w = r * 1.5 * (1 - k * 0.12) * (0.82 + 0.18 * math.sin(t * 2.3 + k * 1.7))
        rrect(img, cx - w / 2, y - 3, cx + w / 2, y + 3, 3, SUN, alpha * 0.85 * (1 - k * 0.1))


def ripples(img, cx, cy, color, radii, alpha=0.5, width=2):
    for r in radii:
        circle(img, cx, cy, r, color, alpha, width=width)


# ── Habillage permanent ───────────────────────────────────────────────────

def monogram(img, cx, cy, size, fill, fg, alpha=1.0):
    """Petite arche « LB » : la signature de la marque."""
    w = size
    arch(img, cx - w / 2, cy - w * 0.62, cx + w / 2, cy + w * 0.62, fill, alpha)
    text(img, cx, cy + w * 0.18, "LB", font("serif", w * 0.5, 640), fg, alpha, "ms")


def chrome(img, index, t, u, top_dark, bottom_dark, alpha=1.0):
    """Habillage : marque en haut à gauche, chapitre en haut à droite, anneau de progression.

    À appeler en dernier dans chaque scène. top_dark / bottom_dark : le fond est-il
    sombre en haut / en bas (les deux diffèrent sur l'ouverture et le résumé).
    """
    if alpha <= 0.003:
        return
    fg = IVORY if top_dark else INK
    sub = MUTED_D if top_dark else MUTED
    monogram(img, 136, 70, 30, GREEN if not top_dark else MINT, IVORY if not top_dark else LAGOON, alpha)
    text(img, 168, 78, "LA BAIE DES LACS", font("mono", 17), fg, alpha, "ls", tracking=3.2)
    title = SCENES[index][1].upper()
    mono = font("mono", 17)
    tw = text_width(title, mono, 3.2)
    text(img, W - 120, 78, title, mono, sub, alpha, "rs", tracking=3.2)
    text(img, W - 120 - tw - 16, 80, f"{index + 1:02d}", font("serif_i", 30, 500), AMBER if not top_dark else SUN, alpha, "rs")

    cx, cy, r = W - 132, H - 76, 17
    track = MINT if bottom_dark else SAND_D
    circle(img, cx, cy, r, track, alpha * (0.35 if bottom_dark else 1.0), width=3)
    arc(img, cx, cy, r, 0, 360 * clamp(t / DURATION), SUN if bottom_dark else AMBER, 3, alpha)
    circle(img, cx, cy, 3.5 + 2.5 * beat_pulse(t), SUN if bottom_dark else AMBER, alpha)


# ── Transitions ───────────────────────────────────────────────────────────

def _xs():
    return np.arange(W, dtype=np.float32)[None, :]


def transition_masks(kind, p, t):
    """Masques (entrée, bande verte, bande soleil) pour l'avancement p ∈ [0, 1].

    kind : tide_up | tide_down | sweep_right | sweep_left | iris:<cx>:<cy>
    """
    yy = _grid()
    xs = _xs()
    e = e_in_out(p)
    band1, band2 = 38.0, 78.0
    if kind in ("tide_up", "tide_down"):
        front = lerp(H + band2 + 30, -band2 - 30, e) if kind == "tide_up" else lerp(-band2 - 30, H + band2 + 30, e)
        edge = wave_edge(xs, front, 16, 520, t * 3)
        d = (yy - edge) if kind == "tide_up" else (edge - yy)
    elif kind in ("sweep_right", "sweep_left"):
        front = lerp(-band2 - 40, W + band2 + 40, e) if kind == "sweep_right" else lerp(W + band2 + 40, -band2 - 40, e)
        edge = front + 18 * np.sin(2 * np.pi * yy / 380 + t * 3) + 8 * np.sin(2 * np.pi * yy / 170 - t * 2)
        d = (edge - xs) if kind == "sweep_right" else (xs - edge)
    elif kind.startswith("iris"):
        _, cx, cy = kind.split(":")
        cx, cy = float(cx), float(cy)
        rmax = max(math.hypot(cx - a, cy - b) for a in (0, W) for b in (0, H)) + band2 + 20
        r = lerp(0, rmax, e_in_out(p) ** 1.1)
        dist = np.sqrt((xs - cx) ** 2 + (yy - cy) ** 2)
        d = r - dist
    else:
        raise ValueError(kind)
    inn = np.clip(d + 0.5, 0, 1)
    g = np.clip(d + band1 + 0.5, 0, 1) - inn
    s = np.clip(d + band2 + 0.5, 0, 1) - inn - g
    to = lambda a: Image.fromarray((a * 255).astype(np.uint8), "L")
    return to(inn), to(g), to(s)


def composite_transition(out_img, in_img, kind, p, t):
    m_in, m_green, m_sun = transition_masks(kind, p, t)
    img = Image.composite(in_img, out_img, m_in)
    img.paste(GREEN, (0, 0, W, H), m_green)
    img.paste(SUN, (0, 0, W, H), m_sun)
    return img
