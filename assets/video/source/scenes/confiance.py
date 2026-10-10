"""Scène 7 — La confiance (44–52 s) : fiable par conception.

Le drop tombe sur u = 0 : une onde solaire part du centre et six garanties
montent en grille, chacune avec son chiffre, sa preuve et une petite
illustration animée. Sur la troisième mesure, une liste de contrôle les valide
une à une ; le pied de page égrène les protections HTTP.
"""

import math
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw

from kit import (H, IVORY, LAGOON, LAGOON_2, LAGOON_3, MINT, MUTED_D, SUN, W, beat_pulse, bg_night,
                 Local, chrome, circle, clamp, e_back, e_in, e_out, font, icon, lerp, line, prog, rich_line, rrect, text,
                 typewriter)

INDEX = 6

TW, TH = 500, 280                     # tuiles
COLS = (170, 710, 1250)
ROWS = (282, 602)
HEAD_Y = 198                          # ligne de base du titre
CX, CY = 960, 570                     # centre des ondes (entre les deux rangées)
T_TILE, T_STEP = 0.125, 0.125         # entrée des tuiles, une par double-croche
T_CHECK, T_CHECK_STEP = 4.0, 0.25     # liste de contrôle : mesure 3, une coche par croche
T_FOOT = 5.0

# (valeur, compteur, libellé, preuve, pictogramme, accent, illustration)
TILES = [
    ("0", None, "double réservation", "Verrou + contrôle de chevauchement", "calendar", SUN, "slots"),
    ("HMAC", None, "paiements vérifiés", "Webhooks signés, montant calculé serveur", "shield", MINT, "sign"),
    ("11", 11, "permissions fines", "4 rôles, accès contrôlé par route", "key", SUN, "dots"),
    ("100", 100, "actions sensibles tracées", "Journal d’audit : avant / après, IP", "doc", MINT, "log"),
    ("RGPD", None, "export & droit à l’oubli", "Export PDF, anonymisation du compte", "lock", SUN, "redact"),
    ("174", 174, "tests backend", "+ Vitest & Playwright, CI à chaque push", "check", MINT, "grid"),
]
COUNT_DUR = 0.7


# ── Petits outils ─────────────────────────────────────────────────────────

@lru_cache(maxsize=8)
def rr_mask(w, h, r, width=0):
    """Masque de rectangle arrondi (plein ou contour) aux dimensions entières, mis en cache."""
    ss = 3
    m = Image.new("L", (w * ss, h * ss), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, w * ss - 1, h * ss - 1], radius=r * ss, fill=255)
    if width:
        k = width * ss
        d.rounded_rectangle([k, k, w * ss - 1 - k, h * ss - 1 - k], radius=(r - width) * ss, fill=0)
    return m.resize((w, h), Image.BOX)


def block(img, x0, y0, w, h, r, color, alpha=1.0, width=0):
    """Tuile posée au pixel près (masque en cache)."""
    if alpha <= 0.003:
        return
    m = rr_mask(w, h, r, width)
    if alpha < 0.999:
        m = m.point(lambda v: int(v * alpha + 0.5))
    x0, y0 = int(round(x0)), int(round(y0))
    img.paste(color, (x0, y0, x0 + w, y0 + h), m)


@lru_cache(maxsize=1)
def _dist():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    return np.hypot(xx - CX, yy - CY)


def waves(img, u, t):
    """Ondes concentriques qui s'écartent lentement, plus l'onde de choc du drop."""
    d = _dist()
    S = 190.0
    phase = (max(u, 0.0) * 24.0) % S + 70.0
    k = S / 2 - np.abs(((d - phase) % S) - S / 2)      # distance à l'onde la plus proche
    fall = np.clip((d - 40) / 220, 0, 1) * np.clip((1350 - d) / 600, 0, 1)
    boost = 0.0 if u < 0 else 0.35 * (1 - e_out(prog(u, 0.0, 1.6)))
    a = 0.55 + boost + 0.1 * beat_pulse(t)
    m = np.clip(1.5 - k, 0, 1) * fall * a
    img.paste(LAGOON_3, (0, 0, W, H), Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8), "L"))

    # Onde de choc solaire sur le premier temps (le drop), puis son écho menthe.
    for start, col, w0, a0 in ((0.0, SUN, 12.0, 0.75), (0.125, MINT, 4.0, 0.3)):
        p = prog(u, start, 1.1)
        if u < start or p >= 1:
            continue
        r = 30 + 1250 * e_out(p)
        w = 2 + w0 * (1 - p)
        ring = np.clip(w / 2 + 0.5 - np.abs(d - r), 0, 1) * (a0 * (1 - p) ** 1.4)
        img.paste(col, (0, 0, W, H), Image.fromarray((ring * 255).astype(np.uint8), "L"))


def rise(img, x, y, s, f, color, p, alpha=1.0):
    """Texte qui monte de derrière sa ligne de base (p : avancement 0→1)."""
    if p <= 0:
        return
    e = e_out(p)
    text(img, x, y + (1 - e) * f.size * 0.8, s, f, color, min(1.0, p * 1.6) * alpha, "ls",
         clip=(-10_000, -10_000, 10_000, y + f.size * 0.3))


def e_in_out_s(p):
    """Courbe douce (smoothstep) pour les tracés à la main."""
    return p * p * (3 - 2 * p)


def count_time(n, k, start):
    """Instant où un compteur 0→n (e_out sur COUNT_DUR) atteint k."""
    return start + COUNT_DUR * (1 - (1 - k / n) ** (1 / 3))


# ── Illustrations (zone x0..x1, centrée sur cy ; q = temps depuis l'entrée) ──

def ill_slots(img, x0, x1, cy, q, a, col):
    """Deux séjours bord à bord : le second vient buter sur le premier, sans chevauchement."""
    for k in range(8):
        circle(img, x0 + 6 + k * (x1 - x0 - 12) / 7, cy + 26, 2.2, MUTED_D, a * 0.55)
    rrect(img, x0, cy + 25, x1, cy + 27, 1, LAGOON_3, a)
    wall = x0 + 82
    ga = e_out(prog(q, 0.0, 0.35))
    if ga > 0:
        rrect(img, x0, cy - 11, x0 + max(22, 76 * ga), cy + 11, 11, col, a * clamp(ga * 2))
    p = prog(q, 0.3, 0.3)
    if p > 0:
        r = prog(q, 0.6, 0.4)
        bounce = 9 * math.sin(math.pi * r) * (1 - r)
        bx = wall + 8 + (1 - e_in(p)) * 46 + bounce
        rrect(img, bx, cy - 11, min(x1, bx + 76), cy + 11, 11, MUTED_D, a * 0.6 * clamp(p * 3))
    c = prog(q, 0.6, 0.5)
    if c > 0:
        rrect(img, wall + 2.5, cy - 20, wall + 5.5, cy + 20, 1.5, IVORY, a * (0.55 + 0.45 * (1 - c) ** 2))


@lru_cache(maxsize=None)
def signature(n=240):
    """Tracé cursif (cycloïde allongée : une boucle par lettre) et son étendue horizontale."""
    heights = (15, 8, 17, 8, 7)
    N = len(heights)
    pts = []
    for i in range(n + 1):
        tt = -math.pi + (2 * math.pi * N + 1.4 * math.pi) * i / n
        j = clamp(tt / (2 * math.pi), 0, N - 1)
        j0 = int(j)
        c = lerp(heights[j0], heights[min(N - 1, j0 + 1)], j - j0)
        x = 3.4 * tt - 7.0 * math.sin(tt)
        y = 6 - c * (1 + math.cos(tt))
        pts.append((x - y * 0.32, y))
    xs = [x for x, _ in pts]
    return pts, min(xs), max(xs)


def ill_sign(img, x0, x1, cy, q, a, col):
    """Signature manuscrite tracée d'un geste : le webhook signé."""
    p = e_in_out_s(prog(q, 0.1, 0.8))
    if p <= 0:
        return
    pts, lo, hi = signature()
    k = max(2, int(len(pts) * p))
    ox = x1 - 6 - hi                                     # calée à droite, comme les autres
    line(img, [(ox + x, cy + y) for x, y in pts[:k]], col, 3.0, a)
    u2 = e_out(prog(q, 0.75, 0.3))
    if u2 > 0:
        sx = ox + lo - 10
        line(img, [(sx, cy + 24), (sx + (x1 - sx) * u2, cy + 21)], col, 2.4, a * 0.6)


def ill_dots(img, x0, x1, cy, u, start, a, col, n=11):
    """Onze pastilles : chaque permission s'allume quand le compteur la franchit."""
    pitch = 28
    for k in range(n):
        row = 0 if k < 6 else 1
        j = k if row == 0 else k - 6
        cx = x1 - 8 - (5 - j) * pitch - (14 if row else 0)
        y = cy - 13 + row * 27
        circle(img, cx, y, 8, LAGOON_3, a, width=2)
        p = prog(u, count_time(n, k + 1, start) - 0.06, 0.3)
        if p > 0:
            circle(img, cx, y, 8.5 * e_back(p), col, a * clamp(p * 3))


def ill_log(img, x0, x1, cy, q, a, col):
    """Journal d'audit : trois lignes « avant → après » qui s'ajoutent."""
    for k, (w1, w2) in enumerate(((44, 70), (58, 46), (36, 82))):
        p = e_out(prog(q, 0.1 + k * 0.125, 0.45))
        if p <= 0:
            continue
        y = cy - 19 + k * 19
        ap = a * clamp(p * 2)
        circle(img, x0 + 5, y, 4.5, col, ap)
        xa = x0 + 20
        rrect(img, xa, y - 4, xa + w1 * p, y + 4, 4, MUTED_D, ap * 0.45)
        xb = xa + w1 + 10
        rrect(img, xb, y - 4, xb + w2 * p, y + 4, 4, col, ap * 0.9)


def ill_redact(img, x0, x1, cy, q, a, col):
    """Données personnelles masquées mot à mot, point par point : l'anonymisation."""
    pitch, gap = 11.5, 13
    bars, dots = Local(x0, cy - 30, x1, cy + 30), Local(x0, cy - 30, x1, cy + 30)
    for k, words in enumerate(((5, 3, 4), (4, 6), (6, 2, 3))):
        p = e_out(prog(q, 0.05 + k * 0.125, 0.4))
        if p <= 0:
            continue
        y = cy - 19 + k * 19
        width = sum(words) * pitch + gap * (len(words) - 1)
        xs = x1 - width
        xe = xs + width * p                                  # la ligne s'écrit
        sweep = xs - 4 + (width + 8) * e_in_out_s(prog(q, 0.625 + k * 0.125, 0.5))
        wx = xs
        for nw in words:
            for j in range(nw):
                dx = wx + j * pitch + pitch / 2
                if dx < min(sweep, xe):
                    dots.d.ellipse(dots.box(dx - 3.4, y - 3.4, dx + 3.4, y + 3.4), fill=255)
            bx0, bx1 = max(wx, sweep), min(wx + nw * pitch, xe)
            if bx1 - bx0 > 1:
                bars.d.rounded_rectangle(bars.box(bx0, y - 4, bx1, y + 4), radius=4 * bars.ss, fill=255)
            wx += nw * pitch + gap
    bars.paste(img, MUTED_D, a * 0.45)
    dots.paste(img, col, a)


def ill_grid(img, x0, x1, cy, u, start, a, col, n=174):
    """La grille des tests : chaque case (≈ 5 tests) passe au vert avec le compteur."""
    cols, rows, pitch, s = 12, 3, 14, 10
    gx = x1 - cols * pitch + (pitch - s)
    gy = cy - (rows * pitch - (pitch - s)) / 2
    lit = int(cols * rows * e_out(prog(u, start, COUNT_DUR)) + 1e-6)
    off = Local(gx, gy, x1, gy + rows * pitch)
    on = Local(gx, gy, x1, gy + rows * pitch)
    for k in range(cols * rows):
        c, r = k // rows, k % rows
        x, y = gx + c * pitch, gy + r * pitch
        m = on if k < lit else off
        m.d.rounded_rectangle(m.box(x, y, x + s, y + s), radius=2.5 * m.ss, fill=255)
    off.paste(img, LAGOON_3, a)
    on.paste(img, col, a)


# ── Tuile ─────────────────────────────────────────────────────────────────

def tile(img, i, u, t):
    value, n, label, sub, ico, col, ill = TILES[i]
    start = T_TILE + i * T_STEP
    p = prog(u, start, 0.55)
    if p <= 0:
        return
    x = COLS[i % 3]
    y = ROWS[i // 3] + 60 * (1 - e_back(p, 1.2))
    a = clamp(p * 2.2)
    block(img, x, y, TW, TH, 26, LAGOON_2, a)

    # Validation : liseré menthe qui s'allume avec la coche.
    tc = T_CHECK + i * T_CHECK_STEP
    v = e_out(prog(u, tc, 0.5))
    if v > 0:
        block(img, x, y, TW, TH, 26, MINT, a * 0.32 * v, width=2)

    # Pastille + pictogramme (respire légèrement sur les temps une fois posée).
    dx, dy = x + 68, y + 68
    settle = prog(u, start + 0.5, 0.5)
    circle(img, dx, dy, 28 + 3 * beat_pulse(t) * settle, LAGOON_3, a)
    icon(img, ico, dx, dy, 30, col, a, width=2.4)

    # Valeur : chiffre qui compte, ou mot qui monte lettre à lettre.
    fv = font("serif", 76, 560)
    vy = y + 172
    q0 = start + 0.125
    if n is None:
        cx = x + 40
        for k, ch in enumerate(value):
            rise(img, cx, vy, ch, fv, col, prog(u, q0 + k * 0.05, 0.45), a)
            cx += fv.getlength(ch)
    else:
        num = str(int(n * e_out(prog(u, q0, COUNT_DUR)) + 1e-6))
        pr = prog(u, q0, 0.4)
        rise(img, x + 40, vy, num, fv, col, pr, a)
        if ill == "log":
            rise(img, x + 40 + fv.getlength(num) + 10, vy, "%", font("serif", 52, 520), col, pr, a)

    # Libellé et preuve.
    rise(img, x + 40, y + 216, label, font("sans", 25, 700), IVORY, prog(u, start + 0.25, 0.5), a)
    rise(img, x + 40, y + 251, sub, font("sans", 19, 500), MUTED_D, prog(u, start + 0.375, 0.5), a)

    # Illustration à droite de la valeur.
    ix0, ix1, icy = x + TW - 40 - 166, x + TW - 40, y + 143
    q = u - (start + 0.125)
    if ill == "slots":
        ill_slots(img, ix0, ix1, icy, q, a, col)
    elif ill == "sign":
        ill_sign(img, ix0, ix1, icy, q, a, col)
    elif ill == "dots":
        ill_dots(img, ix0, ix1, icy, u, q0, a, col)
    elif ill == "log":
        ill_log(img, ix0, ix1, icy, q, a, col)
    elif ill == "redact":
        ill_redact(img, ix0, ix1, icy, q, a, col)
    elif ill == "grid":
        ill_grid(img, ix0, ix1, icy, u, q0, a, col)

    # Case à cocher en haut à droite, validée par la liste de contrôle.
    bx, by = x + TW - 56, y + 68
    circle(img, bx, by, 15, MUTED_D, a * 0.4 * (1 - v), width=2)
    b = prog(u, tc, 0.4)
    if b > 0:
        rp = prog(u, tc, 0.6)
        if rp < 1:
            circle(img, bx, by, 16 + 26 * e_out(rp), SUN, 0.7 * (1 - rp) ** 2, width=2)
        r = 16 * e_back(b, 2.2)
        circle(img, bx, by, r, SUN, a)
        if r > 6:
            icon(img, "check", bx, by + 1, 19 * min(1.0, r / 16), LAGOON, a, width=3)


# ── Scène ─────────────────────────────────────────────────────────────────

def render(u, t):
    img = bg_night()
    waves(img, u, t)

    # Titre : il tombe avec le drop, une croche par mot.
    fs, fi = font("serif", 72, 560), font("serif_i", 72, 450)
    rich_line(img, W / 2, HEAD_Y, [("Fiable ", fs, IVORY), ("par conception.", fi, SUN)], u, 0.0,
              stagger=0.125, dur=0.55)
    # Vague soulignant l'italique.
    x_it = W / 2 - (fs.getlength("Fiable ") + fi.getlength("par conception.")) / 2 + fs.getlength("Fiable ")
    wl = fi.getlength("par conception.")
    p = e_in_out_s(prog(u, 0.5, 0.6))
    if p > 0:
        span = (wl - 16) * p
        pts = [(x_it + 8 + s * span, HEAD_Y + 36 + 3.5 * math.sin(s * span / 58 * 2 * math.pi - t * 2.4))
               for s in np.linspace(0, 1, 64)]
        line(img, pts, SUN, 3, 0.85)

    for i in range(len(TILES)):
        tile(img, i, u, t)

    typewriter(img, W / 2, 1000, "CSP  ·  HSTS  ·  ANTI-BRUTE-FORCE  ·  OAUTH SANS JETON DANS L’URL",
               font("mono", 17), MUTED_D, u, T_FOOT, cps=52, anchor="ms", tracking=3)

    chrome(img, INDEX, t, u, top_dark=True, bottom_dark=True)
    return img
