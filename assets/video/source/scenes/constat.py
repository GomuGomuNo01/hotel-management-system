"""Scène 2 — Le constat (6–12 s) : mille détails épars, puis une seule plateforme."""

import math
from functools import lru_cache

import numpy as np
from PIL import Image

from kit import (GREEN, H, IVORY, LAGOON, LAGOON_3, MINT, MUTED_D, SUN, TERRA, W, arc, arch, beat_pulse,
                 bg_night, chrome, circle, clamp, e_back, e_in, e_in_out, e_out, font, icon, line, mix, prog,
                 rich_line, rise_text, rrect, text)

INDEX = 1
HUB = (960, 600)
PILL_H = 62
SS = 2      # étiquettes dessinées au double puis réduites : placement sub-pixel, échelle continue
PAD = 16

# (texte, pictogramme, point de friction ?, x, y, entrée) — entrées calées sur les doubles-croches,
# les trois frictions tombent sur les temps (0,5 / 1 / 1,5) pour laisser le temps de les lire.
PILLS = [
    ("Réservations",         "bed",      False, 340, 400, 0.250),
    ("Départs",              "suitcase", False, 1600, 722, 0.375),
    ("Double réservation ?", None,       True,  580, 500, 0.500),
    ("Paiements mobiles",    "phone",    False, 1490, 392, 0.625),
    ("Journal d’audit",      "search",   False, 330, 826, 0.750),
    ("Ménage",               "broom",    False, 1128, 488, 0.875),
    ("Chambre pas prête ?",  None,       True,  1350, 600, 1.000),
    ("Factures PDF",         "doc",      False, 302, 606, 1.125),
    ("Réclamations",         "bell",     False, 1520, 818, 1.250),
    ("Arrivées",             "key",      False, 905, 380, 1.375),
    ("Paiement non suivi ?", None,       True,  955, 832, 1.500),
    ("Remboursements",       "card",     False, 585, 718, 1.625),
    ("Avis clients",         "users",    False, 1604, 508, 1.750),
    ("Planning",             "calendar", False, 820, 612, 1.875),
    ("Rôles & accès",        "lock",     False, 1080, 708, 2.000),
]
PAIN = [i for i, q in enumerate(PILLS) if q[2]]
ICON = {"phone": 28, "lock": 30}      # taille propre (le cadenas est plus ramassé que les autres)

# Ordre de convergence : les plus éloignées partent les premières.
_DIST = sorted(range(len(PILLS)), key=lambda i: -math.hypot(PILLS[i][3] - HUB[0], PILLS[i][4] - HUB[1]))
RANK = {i: k for k, i in enumerate([i for i in _DIST if not PILLS[i][2]])}


def nuit(y):
    """Couleur du fond de nuit à l'ordonnée y (même dégradé que bg_night)."""
    return mix(LAGOON, (14, 70, 55), clamp(y / (H - 1)) ** 1.6)


def phone(m, cx, cy, s):
    """Téléphone lisible en petit : écran légèrement éclairé, haut-parleur et bouton."""
    h, w = s / 2, 2.2 * SS
    rrect(m, cx - 0.46 * h, cy - 0.88 * h, cx + 0.46 * h, cy + 0.88 * h, 0.2 * h, 255, width=w)
    rrect(m, cx - 0.2 * h, cy - 0.52 * h, cx + 0.2 * h, cy + 0.38 * h, 0.06 * h, 255, alpha=0.38)
    line(m, [(cx - 0.12 * h, cy - 0.68 * h), (cx + 0.12 * h, cy - 0.68 * h)], 255, 0.8 * w)
    circle(m, cx, cy + 0.62 * h, 0.11 * h, 255)


@lru_cache(maxsize=None)
def sprite(label, ic, pain):
    """Masques (fond, forme, texte) d'une étiquette, au double de sa taille finale."""
    f = font("sans", 28 * SS, 700 if pain else 600)
    h = PILL_H * SS
    padx = 26 * SS
    icw = 36 * SS if ic else 0
    w = f.getlength(label) + 2 * padx + icw
    size = (int(math.ceil(w)) + 2 * PAD, h + 2 * PAD)
    shape, txt = Image.new("L", size, 0), Image.new("L", size, 0)
    x0, y0 = PAD, PAD
    fill = None
    if pain:
        rrect(shape, x0, y0, x0 + w, y0 + h, h / 2, 255)
    else:
        # Fond opaque couleur nuit : invisible au repos, il masque ce qui passe dessous.
        fill = Image.new("L", size, 0)
        rrect(fill, x0, y0, x0 + w, y0 + h, h / 2, 255)
        rrect(shape, x0, y0, x0 + w, y0 + h, h / 2, 255, width=2 * SS)
        ix, iy, isz = x0 + padx + 11 * SS, y0 + h / 2, ICON.get(ic, 24) * SS
        if ic == "phone":
            phone(shape, ix, iy, isz)
        else:
            icon(shape, ic, ix, iy - (0.16 * isz / 2 if ic == "lock" else 0), isz, 255, width=2.2 * SS)
    cap = -f.getbbox("H", anchor="ls")[1]
    text(txt, x0 + padx + icw, y0 + h / 2 + cap / 2, label, f, 255)
    return shape, txt, fill, w / SS


def place(img, spr, cx, cy, s, alpha, c_shape, c_text):
    """Colle une étiquette centrée en (cx, cy) à l'échelle s, au sub-pixel près."""
    if s <= 0.06 or alpha <= 0.003:
        return
    shape, txt, fill, _ = spr
    k = s / SS
    sw, sh = shape.size
    x0, y0 = math.ceil(cx - sw / 2 * k), math.ceil(cy - sh / 2 * k)
    x1, y1 = math.floor(cx + sw / 2 * k), math.floor(cy + sh / 2 * k)
    if x1 - x0 < 2 or y1 - y0 < 2:
        return
    box = (max(0.0, sw / 2 + (x0 - cx) / k), max(0.0, sh / 2 + (y0 - cy) / k),
           min(float(sw), sw / 2 + (x1 - cx) / k), min(float(sh), sh / 2 + (y1 - cy) / k))
    lut = None if alpha >= 0.999 else [int(v * alpha + 0.5) for v in range(256)]
    layers = ((fill, nuit(cy)), (shape, c_shape), (txt, c_text)) if fill else ((shape, c_shape), (txt, c_text))
    for m, col in layers:
        r = m.resize((x1 - x0, y1 - y0), Image.BICUBIC, box=box)
        if lut:
            r = r.point(lut)
        img.paste(col, (x0, y0, x1, y1), r)


# ── Vagues de fond ────────────────────────────────────────────────────────
_XS = np.arange(W, dtype=np.float32)
_WIN = np.clip(np.minimum(_XS - 60, 1700 - _XS) / 260, 0, 1) ** 1.5   # fondu vers les bords
WAVES = [(984, 7, 720, 0.55, 0.0), (1006, 6, 560, -0.45, 1.9), (1028, 7, 860, 0.35, 3.7)]


def waves(img, t):
    """Trois fils de lagune qui dérivent doucement en bas de l'écran."""
    y0, y1 = 965, 1045
    rows = np.arange(y0, y1, dtype=np.float32)[:, None]
    m = np.zeros((y1 - y0, W), np.float32)
    for base, amp, lam, sp, ph in WAVES:
        edge = (base + amp * np.sin(2 * np.pi * _XS / lam + sp * t + ph)
                + amp * 0.4 * np.sin(2 * np.pi * _XS / (lam * 0.47) - sp * 1.4 * t + ph))
        m = np.maximum(m, np.clip(1.5 - np.abs(rows - edge[None, :]), 0, 1))
    m *= _WIN[None, :] * 0.5
    img.paste(LAGOON_3, (0, y0, W, y1), Image.fromarray((m * 255).astype(np.uint8), "L"))


# ── Étiquettes ────────────────────────────────────────────────────────────

def pills(img, u, t):
    hx, hy = HUB
    normal = []
    for i, (label, ic, pain, px, py, t_in) in enumerate(PILLS):
        p = prog(u, t_in, 0.42)
        if p <= 0:
            continue
        spr = sprite(label, ic, pain)
        s = e_back(p, 2.2)
        a = min(1.0, p * 3)
        # Flottement léger, propre à chaque étiquette ; elle monte se poser.
        x = px + 3.5 * math.sin(t * 1.1 + i * 1.7)
        y = py + 4.5 * math.sin(t * 0.9 + i * 2.3) + 18 * (1 - e_out(p))
        if pain:
            j = PAIN.index(i)
            s *= 1 + 0.018 * beat_pulse(t) * prog(u, t_in + 0.5, 0.3)
            # Sortie : elle rétrécit dans sa vraie couleur, et ne s'efface qu'à la fin.
            out = prog(u, 3.125 + j * 0.125, 0.225)
            s *= 1 - 0.9 * e_in(out)
            a *= 1 - clamp((out - 0.6) / 0.4)
            place(img, spr, x, y, s, a, TERRA, IVORY)
            # Trait de rature à mi-hauteur d'x, tracé de gauche à droite.
            ps = e_in_out(prog(u, 2.75 + j * 0.125, 0.15))
            if ps > 0 and a > 0.003 and s > 0.06:
                hw = (spr[3] / 2 - 20) * s
                line(img, [(x - hw, y + 2.5 * s), (x - hw + 2 * hw * ps, y + 2.5 * s)], IVORY, 3 * s, a)
        else:
            # Convergence vers le centre, en spirale douce : un seul geste, micro-décalé
            # (les plus éloignées partent les premières), arrivées entre 4,25 et 4,53.
            c = e_in_out(prog(u, 3.375 + RANK[i] * 0.025, 0.875))
            if c > 0:
                dx, dy = hx - x, hy - y
                swirl = 0.16 * math.sin(math.pi * c)
                x, y = x + dx * c - dy * swirl, y + dy * c + dx * swirl
                s *= 1 - 0.65 * c
                a *= 1 - clamp((c - 0.65) / 0.35)
            normal.append((c, i, spr, x, y, s, a))
    # Les plus avancées, rétrécies, s'enfoncent sous celles qui arrivent ; le disque du hub les avale.
    for c, i, spr, x, y, s, a in sorted(normal, key=lambda q: (-q[0], q[1])):
        place(img, spr, x, y, s, a, MINT, IVORY)


# ── Le hub ────────────────────────────────────────────────────────────────

def hub(img, u, t):
    cx, cy = HUB
    p = prog(u, 4.0, 0.55)
    if p <= 0:
        return
    # Ondes : deux impulsions à l'arrivée, puis anneaux posés.
    for start in (4.0, 4.5):
        q = prog(u, start, 1.2)
        if 0 < q < 1:
            circle(img, cx, cy, 205 + 110 * e_out(q), MINT, alpha=0.42 * (1 - q) ** 1.6, width=2)
    g = e_out(prog(u, 4.0, 1.0))
    for r in (250, 290):
        circle(img, cx, cy, 205 + (r - 205) * g, MINT, alpha=0.13 * g, width=2)

    # Anneau soleil qui se trace, puis trois satellites en orbite lente (avant le halo du disque,
    # qui recouvre ainsi proprement leur découpe).
    pr = e_out(prog(u, 4.125, 0.625))
    if pr > 0.998:
        circle(img, cx, cy, 205, SUN, width=3)
    else:
        arc(img, cx, cy, 205, -150, -150 + 360 * pr, SUN, 3)
    for k, col in enumerate((SUN, MINT, IVORY)):
        q = prog(u, 4.5 + k * 0.125, 0.3)
        if q <= 0:
            continue
        ang = math.radians(-150 + k * 120 + 22 * max(0.0, u - 4.5))
        dx, dy = cx + 205 * math.sin(ang), cy - 205 * math.cos(ang)
        circle(img, dx, dy, 14 * e_out(q), nuit(dy))     # découpe l'anneau, couleur du fond local
        circle(img, dx, dy, 9 * e_back(q, 2.0), col)

    breath = 1 + 0.02 * beat_pulse(t) * prog(u, 4.5, 0.4)
    r = 170 * e_back(p, 1.5) * breath
    circle(img, cx, cy, r + 20 * breath, GREEN, alpha=0.18 * min(1.0, p * 2))
    circle(img, cx, cy, r, GREEN)

    # Petite arche (porte d'hôtel) puis le nom.
    pa = prog(u, 4.125, 0.5)
    if pa > 0:
        dy = 14 * (1 - e_out(pa))
        arch(img, cx - 19, 516 + dy, cx + 19, 564 + dy, IVORY, alpha=0.9 * min(1.0, pa * 1.6), width=3)
    serif = font("serif", 46, 560)
    rise_text(img, cx, 628, "La baie", serif, IVORY, u, 4.125, 0.5, anchor="ms")
    rise_text(img, cx, 680, "des lacs", serif, IVORY, u, 4.25, 0.5, anchor="ms")


def render(u, t):
    img = bg_night()
    waves(img, t)
    pills(img, u, t)
    hub(img, u, t)

    # Titre A : le problème, puis il s'efface vers le haut.
    serif, serif_i = font("serif", 76, 560), font("serif_i", 76, 450)
    out = e_in_out(prog(u, 3.375, 0.375))
    if out < 1:
        rich_line(img, W / 2, 222, [("Gérer un hôtel, c’est ", serif, IVORY), ("mille détails.", serif_i, SUN)],
                  u, 0.15, alpha=1 - out, dy=-24 * out)
    # Titre B : la promesse.
    rich_line(img, W / 2, 222, [("Une seule plateforme ", serif, IVORY), ("pour tout réunir.", serif_i, SUN)],
              u, 3.75)
    rise_text(img, W / 2, 944, "Réservations, paiements, séjours et service client, au même endroit.",
              font("sans", 30, 500), MUTED_D, u, 4.25, 0.5, anchor="ms")

    chrome(img, INDEX, t, u, top_dark=True, bottom_dark=True)
    return img
