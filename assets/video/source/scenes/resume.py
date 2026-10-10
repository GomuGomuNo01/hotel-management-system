"""Scène 8 — En résumé (52–60 s) : carte de fin, coucher de soleil sur la lagune.

Réponse à l'ouverture : la marée se retire, une grande arche (porte d'hôtel)
monte de derrière la lagune, le sceau « LB » se pose à sa clé de voûte, puis le
nom, la promesse, la pile technique et le lien du dépôt. Au break (u = 4) la
lagune remonte avec le soleil, qui s'y couche lentement ; sur l'accord final
(u = 6) la cloche fait sonner le sceau et rider l'eau, et une dernière ligne
renvoie au README.
"""

import math
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw

from kit import (GREEN, GREEN_D, H, INK, IVORY, LAGOON, Local, MINT, PAPER, SAND_D, SAND_L, SUN, W, beat_pulse,
                 bg_day, chrome, circle, e_back, e_expo, e_in_out, e_out, font, icon, lagoon, lerp, letters,
                 prog, rise_text, rrect, sun_reflection, text, text_width, typewriter)

INDEX = 7

CX = W / 2
HZ = 888                              # horizon final de la lagune
LOW = 1062                            # lagune basse laissée par la marée (u < 4)
AX0, AX1, ATOP = 320, 1600, 112       # grande arche : bords et sommet
SEAL_Y, SEAL_R = 221, 52              # sceau à la clé de voûte
TITLE_Y, TAG_Y = 434, 502             # nom, promesse (lignes de base)
CHIP_Y, CHIP_H = 596, 46              # pile technique
PILL_Y, PILL_H = 688, 58              # lien du dépôt
SUN_R = 90
STACK = ["Laravel 13", "React 18", "Reverb", "Sanctum", "MySQL 8", "Tailwind", "DomPDF"]
REPO = "github.com/GomuGomuNo01/hotel-management-system"

T_SEAL, T_TITLE, T_TAG = 0.5, 0.75, 1.75
T_CHIPS, T_PILL = 2.25, 3.0
T_TIDE, T_SET, T_BELL = 4.0, 5.0, 6.0


# ── Masques mis en cache (formes fixes) ───────────────────────────────────

@lru_cache(maxsize=1)
def arch_masks():
    """Arche pleine et son liseré intérieur, de AX0 à AX1, du sommet au bas de l'écran."""
    ss = 2
    w, h = AX1 - AX0, H - ATOP
    r = w / 2

    def shape(inset, width=None):
        m = Image.new("L", (w * ss, h * ss), 0)
        d = ImageDraw.Draw(m)
        a, b = inset * ss, (w - inset) * ss
        d.ellipse([a, a, b, (2 * r - inset) * ss], fill=255)
        d.rectangle([a, r * ss, b, h * ss], fill=255)
        if width:
            k = (inset + width) * ss
            d.ellipse([k, k, w * ss - k, (2 * r) * ss - k], fill=0)
            d.rectangle([k, r * ss, w * ss - k, h * ss], fill=0)
        return m.resize((w, h), Image.BOX)

    fill = shape(0)
    rim = shape(18, 3).point(lambda v: int(v * 0.55 + 0.5))
    return fill, rim


def paste_arch(img, top):
    """Arche qui monte de derrière la lagune : son sommet est à l'ordonnée `top`."""
    fill, rim = arch_masks()
    y = int(round(max(ATOP, top)))
    if y >= H:
        return
    box = (AX0, y, AX1, H)
    img.paste(SAND_L, box, fill.crop((0, 0, AX1 - AX0, H - y)))
    img.paste(GREEN, box, rim.crop((0, 0, AX1 - AX0, H - y)))


def ellipse_ring(img, cx, cy, rx, ry, color, alpha, width=2, floor=None):
    """Onde elliptique posée sur l'eau ; `floor` masque ce qui dépasse au-dessus."""
    if alpha <= 0.004 or rx < 2:
        return
    m = Local(cx - rx - width, cy - ry - width, cx + rx + width, cy + ry + width)
    m.d.ellipse(m.box(cx - rx, cy - ry, cx + rx, cy + ry), outline=255, width=m.s(width))
    if floor is not None:
        m.clip_above(floor)
    m.paste(img, color, alpha)


@lru_cache(maxsize=1)
def dist_field():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    return np.sqrt((xx - CX) ** 2 + (yy - HZ) ** 2)


@lru_cache(maxsize=4)
def ripple_mask(radii, alpha):
    """Anneaux concentriques autour du soleil (un seul masque numpy)."""
    d = dist_field()
    m = np.zeros((H, W), np.float32)
    for r in radii:
        np.maximum(m, np.clip(1.5 - np.abs(d - r), 0, 1), out=m)
    return Image.fromarray((m * 255 * alpha).astype(np.uint8), "L")


GLOW_Y0, GLOW_Y1 = HZ - 300, HZ + 10


@lru_cache(maxsize=1)
def glow_field():
    """Lueur du couchant : halo elliptique posé sur l'horizon."""
    yy, xx = np.mgrid[GLOW_Y0:GLOW_Y1, 0:W].astype(np.float32)
    g = np.exp(-((xx - CX) / 520) ** 2 - ((yy - HZ) / 120) ** 2)
    return g.astype(np.float32)


def glow(img, alpha):
    if alpha <= 0.004:
        return
    m = Image.fromarray((glow_field() * 255 * alpha).astype(np.uint8), "L")
    img.paste(SUN, (0, GLOW_Y0, W, GLOW_Y1), m)


# ── Éléments ──────────────────────────────────────────────────────────────

def seal(img, u, t):
    """Sceau « LB » : pop sur le temps, anneau qui bat la mesure, cloche finale."""
    p = prog(u, T_SEAL, 0.6)
    if p <= 0:
        return
    s = e_back(p)
    a = min(1.0, p * 2.5)
    # Anneau extérieur : respire sur chaque temps tant que le groove joue.
    groove = 1 - prog(u, 3.75, 0.5)
    rr = (SEAL_R + 12) * s + 3 * beat_pulse(t) * groove * prog(u, 1.0, 0.5)
    circle(img, CX, SEAL_Y, rr, GREEN, alpha=0.45 * a, width=2)
    circle(img, CX, SEAL_Y, SEAL_R * s, GREEN, alpha=a)
    text(img, CX, SEAL_Y + 16 * s, "LB", font("serif", max(8, 46 * s), 620), IVORY, a, "ms")
    # Cloche de l'accord final : une onde unique quitte le sceau.
    # (elle reste sous le liseré de l'arche).
    q = prog(u, T_BELL, 1.5)
    if 0 < q < 1:
        circle(img, CX, SEAL_Y, SEAL_R + 36 * e_out(q), GREEN, alpha=0.6 * (1 - q) ** 1.5, width=2)


def chips(img, u):
    """Pile technique : pastilles papier qui montent une à une (double-croches)."""
    f = font("sans", 22, 600)
    pad, gap, dot = 20, 14, 14
    widths = [f.getlength(s) + 2 * pad + dot for s in STACK]
    x = CX - (sum(widths) + gap * (len(STACK) - 1)) / 2
    for i, (s, w) in enumerate(zip(STACK, widths)):
        p = prog(u, T_CHIPS + i * 0.125, 0.5)
        if p > 0:
            e = e_out(p)
            a = min(1.0, p * 1.8)
            y0 = CHIP_Y - CHIP_H / 2 + (1 - e) * 28
            rrect(img, x, y0 + 4, x + w, y0 + CHIP_H + 4, CHIP_H / 2, SAND_D, a)
            rrect(img, x, y0, x + w, y0 + CHIP_H, CHIP_H / 2, PAPER, a)
            rrect(img, x, y0, x + w, y0 + CHIP_H, CHIP_H / 2, INK, a * 0.25, width=1.5)
            circle(img, x + pad + 4, y0 + CHIP_H / 2, 4, GREEN, a)
            text(img, x + pad + dot, y0 + CHIP_H / 2, s, f, INK, a, "lm")
        x += w + gap


def repo_pill(img, u):
    """Lien du dépôt : une perle qui éclot, s'étire, puis l'adresse s'écrit."""
    p = prog(u, T_PILL, 0.35)
    if p <= 0:
        return
    f = font("mono", 24)
    full = text_width(REPO, f) + 2 * 36
    s = e_back(p)
    w = lerp(PILL_H, full, e_out(prog(u, T_PILL + 0.125, 0.5)))
    h = PILL_H * s
    rrect(img, CX - w / 2 * s, PILL_Y - h / 2, CX + w / 2 * s, PILL_Y + h / 2, h / 2, LAGOON, min(1.0, p * 2))
    typewriter(img, CX, PILL_Y + 8, REPO, f, IVORY, u, T_PILL + 0.5, cps=96, anchor="ms")


def sunset(img, u, t, horizon):
    """Soleil posé à moitié sur l'horizon, qui se couche jusqu'à disparaître."""
    sink = e_in_out(prog(u, T_SET, 2.5))
    lift = 1 - e_out(prog(u, T_TIDE, 1.2))
    cy = horizon - 14 + 150 * lift + 132 * sink
    if cy - SUN_R * 1.3 > horizon:
        return sink
    breath = 4 * math.sin(t * math.pi / 2)
    circle(img, CX, cy, SUN_R * 1.25 + breath, SUN, alpha=0.22)
    circle(img, CX, cy, SUN_R, SUN)
    return sink


# ── Rendu ─────────────────────────────────────────────────────────────────

def render(u, t):
    img = bg_day()

    # Ondes pâles autour du futur soleil, puis la grande arche qui pousse.
    grow = e_out(prog(u, 0.25, 1.75))
    if grow > 0:
        q = round(grow, 2) if grow < 1 else 1.0
        img.paste(SAND_D, (0, 0, W, H), ripple_mask(tuple(r * (0.6 + 0.4 * q) for r in (680, 800, 920)),
                                                    0.55 * q))
    paste_arch(img, LOW - (LOW - ATOP) * e_expo(prog(u, 0.0, 1.1)))

    seal(img, u, t)
    letters(img, CX, TITLE_Y, "La baie des lacs", font("serif", 120, 560), INK, u, T_TITLE, stagger=0.04)
    rise_text(img, CX, TAG_Y, "Un hôtel entier, piloté depuis une seule application.", font("serif_i", 40, 450),
              GREEN_D, u, T_TAG, anchor="ms")
    chips(img, u)
    repo_pill(img, u)

    # Break : la lagune remonte, le soleil s'y couche, la lueur reste.
    horizon = LOW - (LOW - HZ) * e_out(prog(u, T_TIDE, 1.2))
    glow(img, 0.16 * e_in_out(prog(u, T_SET + 0.5, 2.0)))
    sink = sunset(img, u, t, horizon)
    lagoon(img, horizon, t)
    sun_reflection(img, CX, horizon, SUN_R * (1 - 0.5 * sink), t,
                   alpha=prog(u, T_TIDE + 0.75, 0.5) * (1 - sink) ** 1.5, rows=3)

    # Accord final : deux ondes s'étalent sur l'eau, là où le soleil s'est couché.
    for k in range(2):
        q = prog(u, T_BELL + k * 0.25, 1.75)
        if 0 < q < 1:
            rx = 70 + 420 * e_out(q)
            ellipse_ring(img, CX, horizon + 46, rx, rx * 0.1, MINT, 0.42 * (1 - q) ** 1.5, floor=horizon + 18)

    # Accord final : renvoi vers la documentation.
    mono = font("mono", 17)
    label = "DOCUMENTATION COMPLÈTE DANS LE README"
    p = prog(u, T_BELL, 0.6)
    if p > 0:
        lw = text_width(label, mono, 4)
        icon(img, "doc", CX - lw / 2 - 26, 998 + (1 - e_out(p)) * 10, 20, MINT, alpha=min(1.0, p * 1.6), width=2)
    rise_text(img, CX, 1004, label, mono, MINT, u, T_BELL, dur=0.6, dist=16, anchor="ms", tracking=4)

    chrome(img, INDEX, t, u, top_dark=False, bottom_dark=horizon < H - 76)
    return img
