"""Scène 5 — Les coulisses (30–38 s) : le back-office en action.

À gauche, le planning d'occupation se remplit sur la grille musicale ; à droite,
le ménage fait passer les chambres au « propre ». Quand la 102 est prête, le
check-in se déverrouille ; le planificateur annule seul la réservation impayée,
puis l'arrivée est enregistrée et le planning bascule aussitôt « en séjour ».
"""

import math
from functools import lru_cache

from PIL import Image, ImageDraw

from kit import (AMBER_D, GREEN, GREY, INK, IVORY, LAGOON, LAGOON_2, LAGOON_3, MINT, MUTED_D, SUN, TERRA, W,
                 arc, beat_pulse, bg_night, chrome, circle, clamp, e_back, e_in_out, e_out, font, icon, line, mix,
                 prog, rich_line, rise_text, rrect, text, text_width, typewriter)

INDEX = 4

LP = (120, 255, 1100, 935)            # panneau planning
RP = (1140, 255, 1800, 935)           # panneau ménage & arrivées
GX0, GX1 = 270, 1070                  # grille des jours (14 colonnes)
CW = (GX1 - GX0) / 14
GY0, RH = 372, 80                     # première ligne, hauteur d'une chambre
GY1 = GY0 + 6 * RH
TODAY = 2                             # « aujourd'hui » = début de la colonne du 14
ROOMS = ["101", "102", "201", "202", "301", "401"]

# (rang, colonne, nuits, couleur, libellés du plus long au plus court)
BARS = [
    (0, 0, 4, MINT, ("K. Koné", "Koné")),
    (0, 6, 3, AMBER_D, ("A. Diallo", "Diallo")),
    (1, 2, 5, GREEN, ("M. Yao · arrivée", "M. Yao")),
    (2, 0, 2, MINT, ("F. Kouassi", "Kouassi")),
    (2, 3, 4, AMBER_D, ("S. Bamba", "Bamba")),
    (2, 9, 3, GREEN, ("D. Touré", "Touré")),
    (3, 5, 6, GREEN, ("Famille Traoré", "Traoré")),
    (4, 3, 3, TERRA, ("Impayée",)),
    (4, 7, 5, GREEN, ("C. Aka", "Aka")),
    (5, 4, 6, AMBER_D, ("Groupe N’Guessan", "N’Guessan")),
    (3, 11, 2, GREEN, ("E. Kassi", "Kassi")),      # réservée en direct : passerelle vers le temps réel
]
YAO, UNPAID, LIVE = 2, 7, 10
LEGEND = [(GREEN, "Confirmée"), (AMBER_D, "Acompte 50 %"), (MINT, "En séjour"), (TERRA, "Impayée")]

# Temps forts (u local) : sur les temps, les deux décisifs sur les mesures 2 et 3.
T_102_RUN, T_201_OK, T_CANCEL, T_102_OK, T_READY, T_FADE, T_CHECKIN = 2.0, 3.0, 3.5, 4.0, 4.25, 4.5, 5.5
T_LIVE = 6.5            # nouvelle réservation reçue en direct, au point d'où partira l'iris

TX, TY, TW, TH = (1172, 1479), (328, 522), 289, 176      # tuiles chambres
STATUS = {
    "propre": ("Propre", GREEN, "check"),
    "sale": ("À nettoyer", TERRA, "broom"),
    "cours": ("En cours", AMBER_D, "broom"),
    "hs": ("Hors service", GREY, "lock"),
}
TILES = [   # (chambre, type, motif du jour, [(instant, statut)])
    ("101", "Simple", "RECOUCHE", [(-99, "propre")]),
    ("102", "Simple", "ARRIVÉE", [(-99, "sale"), (T_102_RUN, "cours"), (T_102_OK, "propre")]),
    ("201", "Double", "DÉPART", [(-99, "cours"), (T_201_OK, "propre")]),
    ("401", "Suite familiale", "MAINTENANCE", [(-99, "hs")]),
]
SX0, SY0, SX1, SY1 = 1172, 718, 1768, 903                  # bandeau d'arrivée


# ── Petits outils ─────────────────────────────────────────────────────────

def cap(f):
    """Hauteur des capitales : sert à centrer un texte verticalement sur une forme."""
    return -f.getbbox("H", anchor="ls")[1]


@lru_cache(maxsize=96)
def rr_mask(w, h, r):
    """Masque de rectangle arrondi aux dimensions entières, mis en cache (panneaux, tuiles)."""
    ss = 3
    r = min(r, w / 2, h / 2)
    m = Image.new("L", (w * ss, h * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w * ss - 1, h * ss - 1], radius=r * ss, fill=255)
    return m.resize((w, h), Image.BOX)


def block(img, x0, y0, x1, y1, r, color, alpha=1.0):
    """Rectangle arrondi plein posé au pixel près."""
    x0, y0 = int(round(x0)), int(round(y0))
    w, h = int(round(x1)) - x0, int(round(y1)) - y0
    if alpha <= 0.003 or w < 2 or h < 2:
        return
    m = rr_mask(w, h, r)
    if alpha < 0.999:
        m = m.point(lambda v: int(v * alpha + 0.5))
    img.paste(color, (x0, y0, x0 + w, y0 + h), m)


def flash(img, x0, y0, x1, y1, r, u, start, color=SUN, dur=0.6, grow=8):
    """Anneau qui s'écarte et s'éteint : la signature d'un changement d'état."""
    q = prog(u, start, dur)
    if 0 < q < 1:
        g = 3 + grow * e_out(q)
        rrect(img, x0 - g, y0 - g, x1 + g, y1 + g, r + g, color, alpha=0.9 * (1 - q) ** 2, width=3)


def swap(img, x, y, old, new, f, c_old, c_new, u, start, band, alpha=1.0, dur=0.3):
    """L'ancien libellé sort par le haut, puis le nouveau monte de sa ligne de base (dans `band`)."""
    qo = prog(u, start, dur * 0.5)
    qi = prog(u, start + dur * 0.35, dur * 0.65)
    d = f.size * 1.15
    if qo < 1:
        e = qo * qo
        text(img, x, y - d * e, old, f, c_old, alpha * (1 - e), clip=band)
    if qi > 0:
        e = e_out(qi)
        text(img, x, y + d * (1 - e), new, f, c_new, alpha * min(1.0, qi * 1.6), clip=band)


def flip_scale(u, times, half=0.125):
    """Écrasement vertical 1 → 0 → 1 autour de chaque instant (la bascule tombe au milieu)."""
    s = 1.0
    for te in times:
        if te - half < u < te + half:
            s = min(s, abs(math.cos(math.pi / 2 * (u - te + half) / half)))
    return s


def state_at(events, u):
    return [s for te, s in events if te <= u][-1]


@lru_cache(maxsize=None)
def chip_masks(label):
    """Masques (forme, texte) d'une pastille de statut ; texte dessiné au double puis réduit."""
    f = font("sans", 32, 720)
    h, pad = 34, 15
    w = int(math.ceil(f.getlength(label) / 2 + 2 * pad))
    shape, big = Image.new("L", (w, h), 0), Image.new("L", (2 * w, 2 * h), 0)
    rrect(shape, 0, 0, w, h, h / 2, 255)
    text(big, 2 * pad, h + cap(f) / 2, label, f, 255)
    return shape, big.resize((w, h), Image.BOX)


def chip(img, x0, cy, label, color, sy=1.0, alpha=1.0, fg=IVORY):
    """Pastille de statut, écrasée verticalement d'un facteur sy autour de son centre. Renvoie sa largeur."""
    shape, txt = chip_masks(label)
    w, h = shape.size
    hh = int(round(h * sy))
    if hh < 1 or alpha <= 0.003:
        return w
    lut = None if alpha >= 0.999 else [int(v * alpha + 0.5) for v in range(256)]
    x0, y0 = int(round(x0)), int(round(cy - hh / 2))
    for m, col in ((shape, color), (txt, fg)):
        r = m.resize((w, hh), Image.BICUBIC) if hh != h else m
        if lut:
            r = r.point(lut)
        img.paste(col, (x0, y0, x0 + w, y0 + hh), r)
    return w


def appear(u, start, dist=22, dur=0.5):
    """(décalage vertical, opacité) d'un bloc qui monte en apparaissant."""
    p = prog(u, start, dur)
    return dist * (1 - e_out(p)), clamp(p * 2.2)


def cross(img, cx, cy, s, color, alpha=1.0):
    k = s / 2
    line(img, [(cx - k, cy - k), (cx + k, cy + k)], color, 2.6, alpha)
    line(img, [(cx - k, cy + k), (cx + k, cy - k)], color, 2.6, alpha)


def panel(img, box, u, start):
    """Panneau qui se déroule vers le bas, dans le sens de la marée qui vient de passer."""
    x0, y0, x1, y1 = box
    h = e_out(prog(u, start, 0.6))
    block(img, x0, y0, x1, y0 + max(56, (y1 - y0) * h), 28, LAGOON_2, clamp(prog(u, start, 0.2)))
    return h > 0


# ── Panneau gauche : planning d'occupation ────────────────────────────────

def bar_box(row, col, n):
    cy = GY0 + (row + 0.5) * RH
    return GX0 + col * CW + 3, cy - 22, GX0 + (col + n) * CW - 3, cy + 22


def fit(labels, f, width):
    for s in labels:
        if f.getlength(s) <= width:
            return s
    return ""


def planning(img, u, t):
    x0, y0 = LP[:2]
    a = clamp(prog(u, 0.25, 0.4) * 2)
    icon(img, "calendar", x0 + 44, y0 + 41, 24, MINT, alpha=a, width=2.2)
    rise_text(img, x0 + 68, y0 + 48, "PLANNING D’OCCUPATION", font("mono", 17), MINT, u, 0.25, 0.5, dist=14,
              tracking=3)

    # Jours passés, un ton plus sombres.
    g = e_out(prog(u, 0.375, 0.6))
    if g > 0:
        box = (GX0, GY0, int(round(GX0 + TODAY * CW)), GY1)
        img.paste(mix(LAGOON_2, LAGOON, 0.45), box, Image.new("L", (box[2] - box[0], box[3] - box[1]), int(255 * g)))

    # Grille : filets horizontaux tirés vers la droite, verticaux vers le bas.
    ch, cv = mix(LAGOON_2, LAGOON_3, 0.95), mix(LAGOON_2, LAGOON_3, 0.5)
    for i in range(7):
        q = e_in_out(prog(u, 0.375 + i * 0.03125, 0.5))
        if q > 0:
            y = GY0 + i * RH
            img.paste(ch, (x0 + 32, y, int(round(x0 + 32 + (GX1 - x0 - 32) * q)), y + 1))
    for i in range(1, 14):
        q = e_in_out(prog(u, 0.5 + i * 0.015625, 0.5))
        if q > 0:
            x = int(round(GX0 + i * CW))
            img.paste(cv, (x, GY0, x + 1, int(round(GY0 + (GY1 - GY0) * q))))

    # Numéros des jours (le 14 passe au soleil avec le repère « aujourd'hui »).
    fm = font("mono", 15)
    for i in range(14):
        col = mix(MUTED_D, SUN, prog(u, 1.5, 0.3)) if i == TODAY else MUTED_D
        rise_text(img, GX0 + (i + 0.5) * CW, 351, str(12 + i), fm, col, u, 0.375 + i * 0.03125, 0.45,
                  dist=10, anchor="ms", tracking=1)

    fr = font("sans", 21, 620)
    for i, room in enumerate(ROOMS):
        rise_text(img, x0 + 32, GY0 + (i + 0.5) * RH + cap(fr) / 2, f"Ch. {room}", fr, IVORY, u,
                  0.375 + i * 0.0625, 0.5, dist=16)

    live_ripples(img, u)
    bars(img, u)
    today(img, u, t)

    # Légende, alignée à droite sous la grille.
    fl = font("sans", 16, 560)
    widths = [22 + fl.getlength(s) for _, s in LEGEND]
    x = GX1 - 2 - sum(widths) - 30 * (len(LEGEND) - 1)
    for k, ((col, s), w) in enumerate(zip(LEGEND, widths)):
        q = prog(u, 1.75 + k * 0.125, 0.45)
        if q > 0:
            circle(img, x + 6, 896, 6.5 * e_back(q), col)
            text(img, x + 22, 902, s, fl, MUTED_D, alpha=min(1.0, q * 2))
        x += w + 30


def live_ripples(img, u):
    """Deux ondes menthe derrière la réservation reçue en direct (WebSocket, sans rechargement)."""
    x0, y0, x1, y1 = bar_box(*BARS[LIVE][:3])
    for s0 in (T_LIVE, T_LIVE + 0.25):
        q = prog(u, s0, 0.9)
        if 0 < q < 1:
            circle(img, (x0 + x1) / 2, (y0 + y1) / 2, 34 + 86 * e_out(q), MINT, alpha=0.6 * (1 - q) ** 1.5, width=2.5)


def bars(img, u):
    f = font("sans", 17, 680)
    c = cap(f)
    for k, (row, col, n, color, labels) in enumerate(BARS):
        p = prog(u, T_LIVE if k == LIVE else 0.5 + k * 0.125, 0.5)
        if p <= 0:
            continue
        x0, y0, xf, y1 = bar_box(row, col, n)
        cy = (y0 + y1) / 2
        x1 = x0 + 44 + (xf - x0 - 44) * e_out(p)          # la pastille naît ronde puis s'allonge
        alpha = min(1.0, p * 4)
        fg = INK if color == MINT else IVORY
        if k == UNPAID:
            # Le planificateur annule la réservation impayée : libellé, puis effacement.
            flash(img, x0, y0, xf, y1, 22, u, T_CANCEL, SUN, 0.6, 6)
            out = e_in_out(prog(u, T_FADE, 0.5))
            alpha *= 1 - out
            y0, y1 = cy - 22 * (1 - 0.35 * out), cy + 22 * (1 - 0.35 * out)
            dash_box(img, x0, cy - 22, xf, cy + 22, MINT, 0.32 * e_out(prog(u, T_FADE + 0.25, 0.5)))
        elif k == YAO:
            # Check-in enregistré : la réservation passe « en séjour ».
            color = mix(GREEN, MINT, e_in_out(prog(u, T_CHECKIN, 0.3)))
            flash(img, x0, y0, xf, y1, 22, u, T_CHECKIN, SUN, 0.6, 6)
        if alpha <= 0.003:
            continue
        rrect(img, x0, y0, x1, y1, (y1 - y0) / 2, color, alpha)
        band = (x0 + 4, y0, x1 - 9, y1)
        tx, ty = x0 + 15, cy + c / 2
        if k == UNPAID:
            swap(img, tx, ty, "Impayée", "Annulée auto.", f, IVORY, IVORY, u, T_CANCEL, band, alpha)
        elif k == YAO:
            swap(img, tx, ty, labels[0], "M. Yao · en séjour", f, IVORY, INK, u, T_CHECKIN, band, alpha)
        else:
            text(img, tx, ty, fit(labels, f, xf - x0 - 25), f, fg, alpha * clamp((p - 0.15) * 3), clip=band)


def dash_box(img, x0, y0, x1, y1, color, alpha):
    """Contour pointillé d'une pastille : le créneau libéré redevient réservable."""
    if alpha <= 0.003:
        return
    r = (y1 - y0) / 2
    xa, xb = x0 + r, x1 - r
    n = max(2, int((xb - xa) / 20))
    for i in range(n):
        a = xa + (xb - xa) * i / n + 4
        b = a + (xb - xa) / n - 8
        line(img, [(a, y0), (b, y0)], color, 2, alpha)
        line(img, [(a, y1), (b, y1)], color, 2, alpha)
    for cx, s0 in ((xa, 180), (xb, 0)):
        for k in range(3):
            a0 = s0 + 12 + k * 56
            arc(img, cx, (y0 + y1) / 2, r, a0, a0 + 36, color, 2, alpha)


def today(img, u, t):
    """Repère « aujourd'hui » : un trait soleil qui descend, une étiquette au pied de la grille."""
    p = prog(u, 1.5, 0.5)
    if p <= 0:
        return
    x = GX0 + TODAY * CW
    ya, yb = GY0 - 10, 880
    line(img, [(x, ya), (x, ya + (yb - ya) * e_out(p))], SUN, 2.5)
    circle(img, x, ya, (5 + 1.6 * beat_pulse(t) * prog(u, 2.0, 0.3)) * e_back(min(1.0, p * 2)), SUN)
    q = prog(u, 1.75, 0.45)
    if q > 0:
        fm = font("mono", 15)
        label = "AUJOURD’HUI"
        w = text_width(label, fm, 2) + 28
        dy = 10 * (1 - e_back(q))
        al = min(1.0, q * 2.5)
        rrect(img, x - w / 2, yb - 4 + dy, x + w / 2, yb + 26 + dy, 15, SUN, al)
        text(img, x, yb + 16 + dy, label, fm, LAGOON, al, "ms", tracking=2)


# ── Panneau droit : ménage & arrivées ─────────────────────────────────────

def housekeeping(img, u, t):
    x0, y0 = RP[:2]
    a = clamp(prog(u, 0.375, 0.4) * 2)
    icon(img, "broom", x0 + 44, y0 + 41, 24, MINT, alpha=a, width=2.2)
    rise_text(img, x0 + 68, y0 + 48, "MÉNAGE & ARRIVÉES", font("mono", 17), MINT, u, 0.375, 0.5, dist=14,
              tracking=3)
    for k, spec in enumerate(TILES):
        tile(img, k, *spec, u)
    checkin(img, u, t)


def tile(img, k, room, kind, tag, events, u):
    start = 0.75 + k * 0.125
    dy, a = appear(u, start)
    if a <= 0:
        return
    x, y = TX[k % 2], TY[k // 2] + dy
    block(img, x, y, x + TW, y + TH, 18, LAGOON, a)
    changes = [te for te, _ in events[1:]]
    for te in changes:
        flash(img, x, y, x + TW, y + TH, 18, u, te)

    hs = events[0][1] == "hs"
    text(img, x + 24, y + 64, room, font("serif", 44, 560), MUTED_D if hs else IVORY, a)
    text(img, x + 24, y + 94, kind, font("sans", 16, 560), MUTED_D, a)
    # Motif du jour, en étiquette fine en haut à droite.
    fm = font("mono", 15)
    tw = text_width(tag, fm, 1.5)
    rrect(img, x + TW - 24 - tw - 24, y + 31, x + TW - 24, y + 61, 15, MUTED_D, 0.45 * a, width=1.5)
    text(img, x + TW - 36, y + 51, tag, fm, MUTED_D, a, "rs", tracking=1.5)

    # Pastille d'état : elle « pop » à l'apparition puis bascule à chaque changement.
    label, color, ico = STATUS[state_at(events, u)]
    pop = prog(u, start + 0.25, 0.4)
    sy = flip_scale(u, changes) * (e_back(pop) if pop < 1 else 1.0)
    cw = chip(img, x + 24, y + 134, label, color, sy, a)

    if sy > 0.02:
        ix, iy = x + TW - 46, y + 134
        circle(img, ix, iy, 23 * sy, color, alpha=0.3 * a)
        ic = mix(color, IVORY, 0.4)
        if ico == "check":
            icon(img, "check", ix, iy + 1, 22 * sy, ic, a, width=2.8)
        elif ico == "lock":
            icon(img, "lock", ix, iy + 1, 30 * sy, ic, a, width=2.5)
        else:
            icon(img, ico, ix, iy, 24 * sy, ic, a, width=2.2)

    # Ménage en cours : petite barre d'avancement sous la pastille.
    if label == "En cours":
        f0, s0, e0 = (0.25, start, T_201_OK) if room == "201" else (0.0, T_102_RUN, T_102_OK)
        fr = f0 + (1 - f0) * e_in_out(prog(u, s0, e0 - s0 - 0.2))
        al = a * clamp(sy * 1.5) * clamp(prog(u, start + 0.375, 0.3) * 2)
        rrect(img, x + 24, y + 159, x + 24 + cw, y + 164, 2.5, LAGOON_3, al)
        rrect(img, x + 24, y + 159, x + 24 + max(5, cw * fr), y + 164, 2.5, SUN, al)


def checkin(img, u, t):
    dy, a = appear(u, 1.25)
    if a <= 0:
        return
    y0, y1 = SY0 + dy, SY1 + dy
    block(img, SX0, y0, SX1, y1, 18, LAGOON, a)
    ready = e_in_out(prog(u, T_READY, 0.3))
    done = e_in_out(prog(u, T_CHECKIN, 0.3))
    cy = y0 + 54

    # Badge clé : soleil tant que l'arrivée est bloquée, menthe ensuite.
    kc = mix(SUN, MINT, ready)
    circle(img, SX0 + 46, cy, 26 + 2 * beat_pulse(t) * done, kc, alpha=0.2 * a)
    icon(img, "key", SX0 + 46, cy, 30, kc, a, width=2.6)

    fb = font("sans", 22, 760)
    head = "Arrivée · Ch. 102"
    text(img, SX0 + 90, cy - 4, head, fb, IVORY, a)
    text(img, SX0 + 90 + fb.getlength(head), cy - 4, " · M. Yao", font("sans", 22, 560), MUTED_D, a)
    fs = font("sans", 17, 640)
    band = (SX0 + 80, cy + 4, SX1 - 170, cy + 32)
    if u < T_CHECKIN:
        swap(img, SX0 + 90, cy + 26, "Bloquée : chambre pas encore propre", "Chambre prête : check-in autorisé",
             fs, SUN, MINT, u, T_READY, band, a)
    else:
        swap(img, SX0 + 90, cy + 26, "Chambre prête : check-in autorisé", "Arrivée enregistrée", fs, MINT, MINT,
             u, T_CHECKIN, band, a)

    button(img, u, cy, a, ready, done)

    # Les deux conditions du check-in.
    g = e_out(prog(u, 1.5, 0.5))
    if g > 0:
        img.paste(mix(LAGOON, LAGOON_3, 0.8), (SX0 + 24, int(round(y0 + 104)),
                                               int(round(SX0 + 24 + (SX1 - SX0 - 48) * g)), int(round(y0 + 105))))
    fc = font("sans", 16, 600)
    yc = y0 + 145
    for k, (label, start) in enumerate((("Date d’arrivée atteinte", 1.625), ("Chambre propre", 1.75))):
        q = prog(u, start, 0.45)
        if q <= 0:
            continue
        xc = SX0 + 38 + k * 290
        ok = k == 0 or u >= T_102_OK
        s = e_back(q) * (flip_scale(u, [T_102_OK]) if k == 1 else 1.0)
        al = a * min(1.0, q * 2)
        col = MINT if ok else TERRA
        circle(img, xc, yc, 14 * s, col, alpha=0.25 * a)
        if ok:
            icon(img, "check", xc, yc + 1, 17 * s, MINT, al, width=2.6)
        elif s > 0.05:
            cross(img, xc, yc, 9 * s, mix(TERRA, IVORY, 0.3), al)
        text(img, xc + 24, yc + cap(fc) / 2, label, fc, IVORY if ok else MUTED_D, al)
        if k == 1:
            flash(img, xc - 14, yc - 14, xc + 14, yc + 14, 14, u, T_102_OK, SUN, 0.6, 5)


def button(img, u, cy, a, ready, done):
    """Bouton « Check-in » : verrouillé, puis vert, puis validé d'un clic."""
    fb = font("sans", 18, 760)
    label = "Check-in"
    h = 52
    bx1 = SX1 - 22
    bx0 = bx1 - (18 + 20 + 10 + fb.getlength(label) + 22)
    k = 4 * math.sin(math.pi * prog(u, T_CHECKIN, 0.25))     # enfoncement au clic
    bg = mix(mix(LAGOON_3, GREEN, ready), MINT, done)
    fg = mix(IVORY, INK, done)
    flash(img, bx0, cy - h / 2, bx1, cy + h / 2, h / 2, u, T_READY, SUN, 0.6, 6)
    q = prog(u, T_CHECKIN, 0.7)
    if 0 < q < 1:
        g = 4 + 26 * e_out(q)
        rrect(img, bx0 - g, cy - h / 2 - g, bx1 + g, cy + h / 2 + g, h / 2 + g, MINT, 0.8 * (1 - q) ** 1.5, width=3)
    rrect(img, bx0 + k, cy - h / 2 + k, bx1 - k, cy + h / 2 - k, h / 2 - k, bg, a)
    # Cadenas fermé → ouvert → coche, chaque bascule par un petit « pop ».
    ix = bx0 + 28
    sw1, sw2 = prog(u, T_READY, 0.3), prog(u, T_CHECKIN, 0.3)
    if sw2 > 0:
        icon(img, "check", ix, cy + 1, 20 * e_back(sw2), fg, a * min(1.0, sw2 * 3), width=2.8)
    elif sw1 > 0.5:
        icon(img, "unlock", ix, cy - 1, 20 * e_back((sw1 - 0.5) * 2), fg, a, width=2.3)
    elif sw1 > 0:
        icon(img, "lock", ix, cy - 1, 20 * (1 - sw1 * 2), fg, a, width=2.3)
    else:
        icon(img, "lock", ix, cy - 1, 20, fg, a, width=2.3)
    text(img, ix + 20, cy + cap(fb) / 2, label, fb, fg, a)


# ── Assemblage ────────────────────────────────────────────────────────────

def render(u, t):
    img = bg_night()
    cx = W / 2

    rich_line(img, cx, 200, [("Les coulisses, ", font("serif", 72, 560), IVORY),
                             ("sous contrôle.", font("serif_i", 72, 450), SUN)], u, 0.125, stagger=0.125)

    # Les deux panneaux se déroulent sur l'impact, le second une double-croche plus tard.
    if panel(img, LP, u, 0.0):
        planning(img, u, t)
    if panel(img, RP, u, 0.125):
        housekeeping(img, u, t)

    typewriter(img, cx, 1000, "ARRIVÉES · DÉPARTS · RECOUCHES · ESPÈCES · REMBOURSEMENTS · AUDIT", font("mono", 17),
               MUTED_D, u, 5.0, cps=55, anchor="ms", tracking=3)

    chrome(img, INDEX, t, u, top_dark=True, bottom_dark=True)
    return img
