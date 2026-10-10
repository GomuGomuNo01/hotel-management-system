"""Scène 3 — Les espaces (12–20 s) : quatre arches, quatre rôles, un seul système.

Chaque niveau d'accès est une porte d'hôtel qui pousse depuis le sol, sur les
temps de la mesure. Puis un cadre soleil passe de porte en porte, une par
demi-mesure, pendant que le pied de page rappelle l'authentification.
"""

import math

from kit import (AMBER_D, GREEN_D, INK, IVORY, LAGOON, MUTED, SAND_D, SUN, TERRA, W, arch, beat_pulse, circle,
                 chrome, clamp, e_back, e_expo, e_in_out, e_out, font, icon, line, prog, rich_line,
                 rise_text, rrect, text, text_width, typewriter, bg_day)

INDEX = 2

AW, GAP = 340, 40                     # largeur d'une arche, espace entre deux
TOP, FLOOR = 350, 930                 # sommet des arches, ligne de sol
XS = [W / 2 + (k - 1.5) * (AW + GAP) for k in range(4)]    # 390, 770, 1150, 1530
APPEAR = [0.5, 1.0, 1.5, 2.0]         # chaque arche pousse sur un temps
SPOT = 4.0                            # le cadre soleil arrive à la mesure 3

ROLES = [
    (LAGOON, "search", "Visiteur", "/",
     ("Catalogue filtrable", "Disponibilités en direct", "Avis publics")),
    (GREEN_D, "suitcase", "Client", "/mon-espace",
     ("Réserve et paie en ligne", "Factures & reçus PDF", "Réclamations, avis")),
    (AMBER_D, "key", "Admin", "/admin",
     ("Arrivées, départs, ménage", "11 permissions fines", "Vue par métier")),
    (TERRA, "chart", "Propriétaire", "/owner",
     ("Revenus & occupation", "Gère les admins", "Journal d’audit")),
]


def spot_pos(u):
    """Position (0→3) du cadre soleil : il glisse d'une arche à l'autre à chaque temps fort."""
    return sum(e_in_out(prog(u, SPOT + k - 0.2, 0.4)) for k in (1, 2, 3))


def lift_of(k, u):
    """Soulèvement (px) de l'arche k quand le cadre soleil est devant elle."""
    near = clamp(1 - abs(spot_pos(u) - k))
    return 12 * e_in_out(near) * e_in_out(prog(u, SPOT - 0.2, 0.4))


def door(img, k, u, t):
    """Une arche (qui pousse depuis le sol) et son contenu."""
    color, ico, name, route, items = ROLES[k]
    cx, a0 = XS[k], APPEAR[k]
    p = prog(u, a0, 0.7)
    if p <= 0:
        return
    x0, x1 = cx - AW / 2, cx + AW / 2
    lift = lift_of(k, u)
    settle = 40 * (1 - e_out(p))
    off = settle - lift                                    # décalage vertical du contenu
    reveal = FLOOR - (FLOOR - TOP + lift + 2) * e_expo(p)
    arch(img, x0, TOP + off, x1, FLOOR, color, reveal_from=reveal)

    c0 = a0 + 0.25                                         # le contenu suit d'un double temps
    ivory = IVORY

    # Pictogramme dans un hublot clair, qui « pop ».
    q = prog(u, c0, 0.45)
    if q > 0:
        s = e_back(q)
        a = min(1.0, q * 2.5)
        circle(img, cx, 458 + off, 58 * s, ivory, alpha=0.14 * a)
        icon(img, ico, cx, 458 + off, max(6, 60 * s), ivory, alpha=a, width=4.2 * max(0.3, s))

    # Nom du rôle, route, puis trois lignes de capacités.
    rise_text(img, cx, 594 + off, name, font("serif", 44, 560), ivory, u, c0 + 0.125, 0.5, anchor="ms")

    q = prog(u, c0 + 0.25, 0.45)
    if q > 0:
        e = e_out(q)
        f = font("mono", 19)
        tw = text_width(route, f, 1)
        w = max(76, tw + 44)
        y = 645 + off + (1 - e) * 14
        rrect(img, cx - w / 2, y - 20, cx + w / 2, y + 20, 20, ivory, alpha=0.16 * e)
        text(img, cx, y + 7, route, f, ivory, alpha=min(1.0, q * 2), anchor="ms", tracking=1)

    f = font("sans", 22, 560)
    for i, s in enumerate(items):
        q = prog(u, c0 + 0.375 + i * 0.125, 0.5)
        if q > 0:
            rise_text(img, cx, 722 + i * 42 + off, s, f, ivory, u, c0 + 0.375 + i * 0.125, 0.5,
                      dist=18, anchor="ms")

    # Petit numéro encadré de deux filets, au pied de la porte.
    q = prog(u, c0 + 0.75, 0.5)
    if q > 0:
        e = e_out(q)
        y = 884 + off
        lit = lift / 12
        text(img, cx, y, f"{k + 1:02d}", font("mono", 16), ivory, alpha=(0.55 + 0.45 * lit) * e, anchor="ms",
             tracking=2)
        for sgn in (-1, 1):
            line(img, [(cx + sgn * 26, y - 6), (cx + sgn * (26 + (26 + 14 * lit) * e), y - 6)], ivory, 1.5,
                 alpha=(0.35 + 0.4 * lit) * e)


def ghost(img, k, u):
    """Contour fin de la porte, tracé avant qu'elle ne pousse : l'emplacement réservé."""
    p = prog(u, 0.125 * k, 0.5)
    if p <= 0:
        return
    x0 = XS[k] - AW / 2
    reveal = FLOOR - (FLOOR - TOP + 2) * e_out(p)
    arch(img, x0, TOP, x0 + AW, FLOOR, SAND_D, width=2, reveal_from=reveal)


def shadow(img, k, u):
    """Ombre portée SAND_D, décalée de 10 px ; elle ne suit pas le soulèvement."""
    p = prog(u, APPEAR[k], 0.7)
    if p <= 0:
        return
    x0 = XS[k] - AW / 2 + 10
    reveal = FLOOR - (FLOOR - TOP - 8) * e_expo(p)
    arch(img, x0, TOP + 10 + 40 * (1 - e_out(p)), x0 + AW, FLOOR, SAND_D, alpha=0.8, reveal_from=reveal)


def reflection(img, k, u, t):
    """Reflet de la porte dans la lagune : deux petites vagues qui ondulent sous le sol."""
    color = ROLES[k][0]
    a = e_out(prog(u, APPEAR[k] + 0.25, 0.6))
    if a <= 0:
        return
    for r, (dy, half, al) in enumerate(((17, 118, 0.42), (31, 70, 0.24))):
        y = FLOOR + dy
        ph = t * 2.4 + k * 1.1 + r * 2.0
        pts = [(XS[k] + x, y + 2.6 * math.sin(x / 19 + ph)) for x in range(-half, half + 1, 6)]
        line(img, pts, color, 2.4, alpha=a * al)


def frame_sun(img, u, t):
    """Cadre soleil (contour d'arche décalé) : il se trace depuis le sol, puis passe derrière les portes."""
    p = prog(u, SPOT - 0.25, 0.45)
    if p <= 0:
        return None
    pos = spot_pos(u)
    cx = XS[0] + (AW + GAP) * pos
    near = clamp(1 - min(abs(pos - k) for k in range(4)))
    lift = 12 * e_in_out(near) * e_in_out(prog(u, SPOT - 0.2, 0.4))
    pad = 10
    top = TOP - pad - lift
    reveal = FLOOR - (FLOOR - top + 4) * e_out(p)
    arch(img, cx - AW / 2 - pad, top, cx + AW / 2 + pad, FLOOR, SUN, width=4, reveal_from=reveal)
    return cx, top


def render(u, t):
    img = bg_day()
    cx = W / 2

    # Titre et sous-titre.
    rich_line(img, cx, 215, [("Quatre espaces, ", font("serif", 74, 560), INK),
                             ("un seul système.", font("serif_i", 74, 450), GREEN_D)], u, 0.15, stagger=0.125)
    rise_text(img, cx, 290, "4 RÔLES  ·  4 INTERFACES  ·  1 API REST", font("mono", 18), MUTED, u, 0.6,
              dur=0.6, dist=16, anchor="ms", tracking=4)

    # Contours réservés et ombres, cadre soleil derrière, puis les quatre portes.
    for k in range(4):
        ghost(img, k, u)
        shadow(img, k, u)
    sun = frame_sun(img, u, t)
    for k in range(4):
        door(img, k, u, t)
        reflection(img, k, u, t)

    # Clé de voûte : petit soleil au sommet du cadre, qui respire sur les temps.
    q = prog(u, SPOT, 0.35)
    if sun and q > 0:
        sx, top = sun
        circle(img, sx, top, (9 + 2.5 * beat_pulse(t)) * e_back(q), SUN)

    # Ligne de sol, tracée du centre vers les bords.
    g = e_in_out(prog(u, 2.4, 0.6))
    if g > 0:
        half = 800 * g
        line(img, [(cx - half, FLOOR), (cx + half, FLOOR)], INK, 2, alpha=0.2)

    typewriter(img, cx, 1000, "AUTHENTIFICATION SANCTUM  ·  LE RÔLE EST DÉTECTÉ À LA CONNEXION", font("mono", 18),
               MUTED, u, 3.0, cps=56, anchor="ms", tracking=3)

    chrome(img, INDEX, t, u, top_dark=False, bottom_dark=False)
    return img
