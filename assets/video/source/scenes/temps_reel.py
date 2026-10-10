"""Scène 6 — Le temps réel (38–44 s) : tout se met à jour, sans recharger.

Au centre, le hub Reverb bat la mesure : une onde verte part sur chaque temps.
Trois fois, l'API diffuse un événement : le paquet soleil descend dans le hub,
qui le relaie sur le temps vers la réception et l'espace client ; une
notification se pose en haut de chaque liste et pousse les précédentes. Sur la
dernière mesure, les ondes doublent et le hub se remplit de soleil avant la chute.
"""

import math

import numpy as np
from PIL import Image

from kit import (AMBER, AMBER_D, GREEN, GREEN_D, H, INK, IVORY, LAGOON, MINT, MUTED, PAPER, SAND, SAND_D, SAND_L,
                 SUN, TERRA, Local, beat_pulse, bg_day, chrome, circle, dashed, e_back, e_in_out, e_out, font,
                 icon, line, mix, prog, rich_line, rise_text, rrect, text, text_width, typewriter, wave_edge)
from timeline import BEAT, FPS

INDEX = 5

CX, CY, HUB_R = 960, 640, 118         # hub Reverb (centre de l'iris d'entrée)
LC = (130, 360, 610, 900)             # réception : fenêtre d'ordinateur
RC = (1310, 360, 1790, 900)           # espace client : téléphone
SIDE = 64                             # barre latérale de la fenêtre
SLOT0, TH, PITCH = 500, 96, 110       # notifications : 1re ligne, hauteur, pas
PORT_Y = SLOT0 + TH / 2               # arrivée des connecteurs sur les cartes
API_Y = 318                           # pastille « API Laravel »
EVENTS = [0.5, 2.0, 3.5]              # relais par le hub, sur le temps (cloche)
FLY = 0.25                            # trajet hub → carte : arrivée sur le contretemps
WARM = 5.0                            # le kick s'arrête : montée vers la chute

NOTES_L = [("Nouvelle réservation", "Ch. 202 · 2 nuits", GREEN, "calendar"),
           ("Chambre 102 : propre", "Check-in possible", GREEN, "broom"),
           ("Réclamation reçue", "Ch. 401 · climatisation", TERRA, "bell")]
NOTES_R = [("Paiement Wave confirmé", "90 000 FCFA", GREEN, "check"),
           ("Reçu PDF disponible", "Prêt à télécharger", AMBER, "doc"),
           ("Réponse du service client", "Réclamation en cours", AMBER, "bell")]
DEEP = {GREEN: GREEN_D, AMBER: AMBER_D, TERRA: TERRA}

F_T = font("sans", 20, 760)
F_S = font("sans", 17, 520)
F_M = font("mono", 15)


# ── Petits outils ─────────────────────────────────────────────────────────

def layer(img, box, alpha, draw):
    """Dessine `draw` sur un calque, puis ne recolle que `box` (fondu + découpe nette)."""
    if alpha <= 0.003:
        return
    lay = img.copy()
    draw(lay)
    box = tuple(int(round(v)) for v in box)
    src = lay.crop(box)
    if alpha < 0.999:
        src = Image.blend(img.crop(box), src, alpha)
    img.paste(src, box[:2])


def top_band(img, x0, y0, x1, y1, r, color, alpha=1.0):
    """Bandeau aux seuls coins supérieurs arrondis (barre de titre, barre d'application)."""
    m = Local(x0, y0, x1, y1)
    m.d.rounded_rectangle(m.box(x0, y0, x1, y1 + r + 4), radius=r * m.ss, fill=255)
    m.clip_below(y1)
    m.paste(img, color, alpha)


def side_band(img, x0, y0, x1, y1, r, color, alpha=1.0):
    """Barre latérale : seul le coin inférieur gauche est arrondi."""
    m = Local(x0, y0, x1, y1)
    m.d.rounded_rectangle(m.box(x0, y0 - r - 4, x1 + r + 4, y1), radius=r * m.ss, fill=255)
    m.d.rectangle([(x1 - m.x0) * m.ss, 0, m.w * m.ss, m.h * m.ss], fill=0)
    m.clip_above(y0)
    m.paste(img, color, alpha)


def bezier(p0, p1, p2, p3, s):
    a = 1 - s
    return (a ** 3 * p0[0] + 3 * a * a * s * p1[0] + 3 * a * s * s * p2[0] + s ** 3 * p3[0],
            a ** 3 * p0[1] + 3 * a * a * s * p1[1] + 3 * a * s * s * p2[1] + s ** 3 * p3[1])


def route(side):
    """Connecteur en S du bord du hub jusqu'au bord de la carte (côté = -1 gauche, +1 droite)."""
    x0 = CX + side * (HUB_R + 32)
    x3 = (LC[2] + 3) if side < 0 else (RC[0] - 3)
    return (x0, CY), (x0 + side * 95, CY), (x3 - side * 95, PORT_Y), (x3, PORT_Y)


def arrived(u, k):
    return u >= EVENTS[k] + FLY


# ── Ondes du hub (un seul masque numpy par couleur) ───────────────────────

RX0, RY0, RW = CX - 580, CY - 580, 1160
_DIST = []


def dist():
    if not _DIST:
        ys = np.arange(RY0, H, dtype=np.float32)[:, None] - CY
        xs = np.arange(RX0, RX0 + RW, dtype=np.float32)[None, :] - CX
        _DIST.append(np.sqrt(xs * xs + ys * ys))
    return _DIST[0]


def rings(img, u):
    """Une onde par temps (verte), plus une sur chaque contretemps à partir de WARM (soleil)."""
    births = [(k * 0.5, GREEN, 0.5) for k in range(14)]
    births += [(WARM + 0.25 + k * 0.5, SUN, 0.75) for k in range(3)]
    D = dist()
    acc = {}
    for b, col, a0 in births:
        age = u - b
        if not 0 <= age < 1.6:
            continue
        p = age / 1.6
        r = 120 + 440 * (1 - (1 - p) ** 2)
        a = a0 * (1 - p) ** 1.4
        y0 = max(0, int(CY - r - 3) - RY0)
        y1 = min(D.shape[0], int(CY + r + 4) - RY0)
        x0, x1 = max(0, int(CX - r - 3) - RX0), min(RW, int(CX + r + 4) - RX0)
        sub = D[y0:y1, x0:x1]
        m = np.clip(2.0 - np.abs(sub - r), 0, 1) * a
        if col not in acc:
            acc[col] = np.zeros(D.shape, np.float32)
        np.maximum(acc[col][y0:y1, x0:x1], m, out=acc[col][y0:y1, x0:x1])
    for col, m in acc.items():
        mask = Image.fromarray((m * 255).astype(np.uint8), "L")
        img.paste(col, (RX0, RY0, RX0 + RW, RY0 + mask.height), mask)


# ── Notifications ─────────────────────────────────────────────────────────

def skeleton(img, x0, y0, w, a=1.0):
    """Emplacement vide : silhouette de notification en attente."""
    rrect(img, x0, y0, x0 + w, y0 + TH, 16, SAND_L, alpha=a)
    cy = y0 + TH / 2
    circle(img, x0 + 52, cy, 21, SAND, alpha=a)
    rrect(img, x0 + 88, cy - 17, x0 + 88 + w * 0.42, cy - 6, 5.5, SAND, alpha=a)
    rrect(img, x0 + 88, cy + 7, x0 + 88 + w * 0.28, cy + 17, 5, SAND, alpha=0.7 * a)


def live(img, x, y, u, t, color):
    """Voyant « en direct » : point fixe et onde fine sur chaque temps (muet dès l'arrêt du kick)."""
    ph = (t % BEAT) / BEAT
    if u < WARM:
        circle(img, x, y, 6 + 7 * e_out(ph), color, alpha=0.5 * (1 - ph), width=1.6)
    circle(img, x, y, 5, color)


def roll(u):
    """Roulement de clap (doubles-croches, crescendo) de WARM jusqu'à la chute.

    Chaque clap culmine sur la première image qui le suit : crescendo régulier à 30 i/s.
    """
    if not WARM <= u < WARM + 1.0:
        return 0.0
    k = int((u - WARM) / 0.125 + 1e-6)
    hit = math.ceil((WARM + k * 0.125) * FPS - 1e-6) / FPS
    return (0.3 + 0.7 * prog(hit, WARM, 1.0)) * math.exp(-max(0.0, u - hit) / 0.05)


def toast(img, x0, y0, w, note, fresh):
    """Notification : liseré de couleur, pastille + pictogramme, titre et détail."""
    title, sub, col, ic = note
    x1, y1 = x0 + w, y0 + TH
    rrect(img, x0, y0 + 5, x1, y1 + 5, 16, SAND_D, alpha=0.55)
    rrect(img, x0, y0, x1, y1, 16, mix(IVORY, col, 0.16 * fresh))
    rrect(img, x0 + 12, y0 + 20, x0 + 17, y1 - 20, 2.5, col)
    cy = y0 + TH / 2
    circle(img, x0 + 52, cy, 22, col, alpha=0.15)
    icon(img, ic, x0 + 52, cy, 24, DEEP[col], width=2.4)
    text(img, x0 + 88, cy - 3, title, F_T, INK)
    text(img, x0 + 88, cy + 23, sub, F_S, MUTED)
    circle(img, x1 - 22, y0 + 24, 4.5, col)


def toasts(img, u, notes, x0, w, dy, side, clip_x):
    """Pile de notifications : la plus récente en haut, les autres glissent d'un cran."""
    # Silhouettes : chacune s'efface quand une notification vient s'y poser.
    for k in range(3):
        if k == 0:
            gone = e_in_out(prog(u, EVENTS[0] + 0.0625, 0.125))   # créneau libre avant l'arrivée
        else:
            gone = e_in_out(prog(u, EVENTS[k], 0.375))
        if gone < 1:
            skeleton(img, x0, SLOT0 + k * PITCH + dy, w, 1 - gone)
    for k, note in enumerate(notes):
        a = EVENTS[k] + FLY
        p = prog(u, a - 0.06, 0.45)
        if p <= 0:
            continue
        # Les plus récentes poussent celle-ci : le créneau s'ouvre dès le relais par le hub.
        shift = sum(e_in_out(prog(u, EVENTS[j], 0.375)) for j in range(k + 1, 3))
        y0 = SLOT0 + PITCH * shift + dy
        e = e_out(p)
        xo = x0 - side * 56 * (1 - e)
        fresh = math.exp(-max(0.0, u - a) / 0.5)
        if p >= 1:
            toast(img, xo, y0, w, note, fresh)
        else:
            # Découpe au bord de la carte : la notification sort du point d'arrivée du paquet.
            bx = (x0 - 4, y0 - 4, clip_x, y0 + TH + 10) if side < 0 else (clip_x, y0 - 4, x0 + w + 4, y0 + TH + 10)
            layer(img, bx, min(1.0, p * 5), lambda im: toast(im, xo, y0, w, note, fresh))


def count(u):
    return sum(arrived(u, k) for k in range(3))


def bump(u):
    """Petit rebond de la pastille de compteur à chaque arrivée."""
    v = 0.0
    for k in range(3):
        q = prog(u, EVENTS[k] + FLY, 0.35)
        if 0 < q < 1:
            v = max(v, math.sin(math.pi * q) * (1 - q))
    return v


# ── Les deux écrans ───────────────────────────────────────────────────────

def laptop(img, u, t, dy):
    """Réception : fenêtre d'ordinateur (barre de titre à trois points, barre latérale)."""
    x0, y0, x1, y1 = LC
    y0, y1 = y0 + dy, y1 + dy
    rrect(img, x0 + 10, y0 + 10, x1 + 10, y1 + 10, 22, SAND_D, alpha=0.8)
    rrect(img, x0, y0, x1, y1, 22, PAPER)
    top_band(img, x0, y0, x1, y0 + 56, 22, SAND_L)
    line(img, [(x0, y0 + 56), (x1, y0 + 56)], SAND_D, 1.5, alpha=0.8, round_caps=False)
    for k, c in enumerate((TERRA, SUN, GREEN)):
        circle(img, x0 + 30 + k * 21, y0 + 28, 6.5, c)
    text(img, (x0 + x1) / 2 + 30, y0 + 34, "RÉCEPTION", F_M, INK, anchor="ms", tracking=3)
    # Barre latérale : modules du back-office, le planning est actif.
    side_band(img, x0, y0 + 56, x0 + SIDE, y1, 22, SAND_L)
    for k, name in enumerate(("calendar", "bed", "broom", "card", "chart")):
        iy = y0 + 118 + k * 60
        if k == 0:
            rrect(img, x0 + 13, iy - 20, x0 + SIDE - 13, iy + 20, 11, GREEN, alpha=0.16)
        icon(img, name, x0 + SIDE / 2, iy, 22, GREEN_D if k == 0 else MUTED, alpha=1 if k == 0 else 0.75,
             width=2.2)
    cx0, cx1 = x0 + SIDE + 20, x1 - 20
    text(img, cx0, y0 + 106, "Notifications", F_T, INK)
    badge_pill(img, cx1 - 18, y0 + 99, u)
    toasts(img, u, NOTES_L, cx0, cx1 - cx0, dy, -1, x1)
    # Pied de fenêtre : écoute Echo en direct.
    line(img, [(cx0, y1 - 62), (cx1, y1 - 62)], SAND, 1.5, round_caps=False)
    live(img, cx0 + 8, y1 - 30, u, t, GREEN)
    text(img, cx0 + 30, y1 - 24.5, "EN DIRECT", F_M, GREEN_D, tracking=3)
    text(img, cx1, y1 - 24, "Laravel Echo", F_S, MUTED, anchor="rs")


def badge_pill(img, cx, cy, u):
    n = count(u)
    if n == 0:
        return
    s = e_back(prog(u, EVENTS[0] + FLY, 0.35)) + 0.22 * bump(u)
    w, h = 36 * s, 26 * s
    rrect(img, cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, h / 2, GREEN)
    digit(img, cx, cy, n, s, IVORY)


def digit(img, cx, cy, n, s, color):
    """Chiffre du compteur : grandit avec sa pastille pendant le rebond, sans jamais déborder."""
    if s <= 0.55:
        return
    k = min(1.0, s)
    text(img, cx, cy + 6.5 * k, str(n), font("sans", 17 * k, 800), color, alpha=prog(s, 0.55, 0.3), anchor="ms")


def phone(img, u, t, dy):
    """Espace client : téléphone (barre d'application verte, encoche, barre d'accueil)."""
    x0, y0, x1, y1 = RC
    y0, y1 = y0 + dy, y1 + dy
    mx = (x0 + x1) / 2
    rrect(img, x0 + 10, y0 + 10, x1 + 10, y1 + 10, 40, SAND_D, alpha=0.8)
    rrect(img, x0, y0, x1, y1, 40, PAPER)
    top_band(img, x0, y0, x1, y0 + 82, 40, GREEN_D)
    rrect(img, mx - 52, y0 + 13, mx + 52, y0 + 35, 11, LAGOON)
    text(img, x0 + 32, y0 + 66, "ESPACE CLIENT", F_M, IVORY, tracking=3)
    live(img, x0 + 32 + text_width("ESPACE CLIENT", F_M, 3) + 20, y0 + 61, u, t, MINT)
    # Cloche et pastille de compteur.
    bx, by = x1 - 46, y0 + 58
    icon(img, "bell", bx, by, 28, IVORY, width=2.4)
    n = count(u)
    if n:
        s = e_back(prog(u, EVENTS[0] + FLY, 0.35)) + 0.22 * bump(u)
        circle(img, bx + 14, by - 13, 13 * s, SUN)
        digit(img, bx + 14, by - 13, n, s, INK)
    text(img, x0 + 24, y0 + 117, "Bonjour, E. Kassi", F_T, INK)
    toasts(img, u, NOTES_R, x0 + 24, x1 - x0 - 48, dy, 1, x0)
    # Barre d'onglets et barre d'accueil.
    for k, name in enumerate(("calendar", "card", "bell", "doc")):
        ix = x0 + (x1 - x0) * (k + 0.5) / 4
        icon(img, name, ix, y1 - 40, 22, GREEN_D if k == 2 else MUTED, alpha=1 if k == 2 else 0.7, width=2.2)
    rrect(img, mx - 64, y1 - 13, mx + 64, y1 - 8, 2.5, INK, alpha=0.22)


# ── Hub, API et paquets ───────────────────────────────────────────────────

def api(img, u, t):
    p = prog(u, 0.0, 0.375)
    if p <= 0:
        return
    s = e_back(p)
    w, h = 214 * s, 50 * s
    x0, y0 = CX - w / 2, API_Y - h / 2
    rrect(img, x0 + 6, y0 + 6, x0 + w + 6, y0 + h + 6, h / 2, SAND_D, alpha=0.8 * min(1, p * 2))
    rrect(img, x0, y0, x0 + w, y0 + h, h / 2, PAPER)
    if p < 0.5:
        return
    a = min(1, (p - 0.5) * 4)
    # Point vert qui s'allume en soleil à chaque émission.
    hot = max([math.exp(-max(0.0, u - (e - 0.25)) / 0.18) if u >= e - 0.25 else 0 for e in EVENTS])
    circle(img, CX - 76, API_Y, 6, GREEN, alpha=a)
    circle(img, CX - 76, API_Y, 6, SUN, alpha=a * hot)
    text(img, CX - 60, API_Y + 7, "API Laravel", F_T, INK, alpha=a)


def packet(img, x, y, a=1.0, trail=()):
    for k, (tx, ty) in enumerate(trail):
        circle(img, tx, ty, 7 - 1.6 * k, SUN, alpha=a * (0.45 - 0.12 * k))
    circle(img, x, y, 15, SUN, alpha=0.28 * a)
    circle(img, x, y, 8.5, SUN, alpha=a)


def links(img, u):
    """Connecteurs pointillés : vertical (API → hub) puis deux S (hub → écrans)."""
    p = e_out(prog(u, 0.0, 0.375))
    if p > 0:
        ya, yb = API_Y + 34, CY - HUB_R - 32
        dashed(img, [(CX, ya), (CX, ya + (yb - ya) * p)], INK, 2, dash=9, gap=9, alpha=0.24)
    p = e_out(prog(u, 0.125, 0.375))
    if p > 0:
        for side in (-1, 1):
            pts = [bezier(*route(side), i / 24 * p) for i in range(25)]
            dashed(img, pts, INK, 2, dash=9, gap=9, alpha=0.24)


def packets(img, u):
    for e in EVENTS:
        # Descente depuis l'API (le temps précédent : croche).
        q = prog(u, e - 0.25, 0.25)
        if 0 < q < 1:
            ya, yb = API_Y + 30, CY - HUB_R
            f = lambda v: ya + (yb - ya) * v ** 2
            packet(img, CX, f(q), 1.0, [(CX, f(max(0, q - d))) for d in (0.12, 0.24, 0.36)])
        # Relais vers les deux écrans.
        q = prog(u, e, FLY)
        if 0 < q < 1:
            for side in (-1, 1):
                r = route(side)
                g = e_in_out(q)
                x, y = bezier(*r, g)
                packet(img, x, y, 1.0, [bezier(*r, max(0, g - d)) for d in (0.08, 0.16, 0.24)])
        # Impact sur le bord de la carte.
        q = prog(u, e + FLY, 0.45)
        if 0 < q < 1:
            for side in (-1, 1):
                x, y = route(side)[3]
                circle(img, x, y, 7 + 30 * e_out(q), SUN, alpha=0.85 * (1 - q), width=3)


def hub(img, u, t):
    p = prog(u, -0.25, 0.5)
    if p <= 0:
        return
    s = e_back(p)
    warm = prog(u, WARM, 1.0)
    # Sur les temps tant que le kick joue, puis sur chaque clap du roulement.
    beat = 6 * beat_pulse(t) * prog(u, 0.25, 0.25) * (1 - prog(u, WARM - 0.1, 0.1))
    clap = 4 * roll(u)
    # Halo soleil qui grandit pendant la montée.
    if warm > 0:
        circle(img, CX, CY, HUB_R + 18 + 44 * warm + 1.5 * clap, SUN, alpha=0.24 * warm ** 0.7)
    # Orbite et deux satellites.
    if u > 0:
        o = e_out(prog(u, 0.0, 0.5))
        ro = (HUB_R + 22) * o
        circle(img, CX, CY, ro, GREEN, alpha=0.32 * o * (1 - warm), width=2)
        circle(img, CX, CY, ro, AMBER, alpha=0.45 * o * warm, width=2)
        for k in range(2):
            ang = math.radians(t * 36 + k * 180)
            sx, sy = CX + ro * math.sin(ang), CY - ro * math.cos(ang)
            circle(img, sx, sy, 5 * o, GREEN)
    # Éclair de relais : anneau soleil sur chaque émission.
    for e in EVENTS:
        q = prog(u, e, 0.45)
        if 0 < q < 1:
            circle(img, CX, CY, HUB_R + 6 + 40 * e_out(q), SUN, alpha=0.9 * (1 - q), width=4)
    r = HUB_R * s + beat + clap
    circle(img, CX, CY, r, GREEN)
    labels(img, u, IVORY, SUN, IVORY)
    # Remplissage soleil : le niveau monte jusqu'à la chute (masque exact du disque).
    if warm > 0:
        level = CY + r + 8 - (2 * r + 22) * warm ** 1.6
        lay = img.copy()
        circle(lay, CX, CY, r, SUN)
        labels(lay, u, LAGOON, LAGOON, LAGOON)
        m = Local(CX - r, CY - r, CX + r, CY + r)
        m.d.ellipse(m.box(CX - r, CY - r, CX + r, CY + r), fill=255)
        disc = np.asarray(m.mask(), np.float32)
        xs = np.arange(m.x0, m.x0 + m.w, dtype=np.float32)
        edge = wave_edge(xs, level, 4.0, 130, t * 5)
        rows = np.arange(m.y0, m.y0 + m.h, dtype=np.float32)[:, None]
        liquid = np.clip(rows - edge[None, :] + 0.5, 0, 1) * disc
        box = (m.x0, m.y0, m.x0 + m.w, m.y0 + m.h)
        img.paste(lay.crop(box), box[:2], Image.fromarray(liquid.astype(np.uint8), "L"))


def labels(img, u, fg, bolt, sub):
    q = prog(u, 0.0, 0.4)
    if q > 0:
        icon(img, "bolt", CX, CY - 44 + 10 * (1 - e_back(q)), 30, bolt, alpha=min(1, q * 2.5))
    rise_text(img, CX, CY + 20, "Reverb", font("serif", 44, 560), fg, u, 0.0, 0.45, dist=26, anchor="ms")
    rise_text(img, CX, CY + 53, "WEBSOCKET", font("mono", 16), sub, u, 0.125, 0.45, dist=14, anchor="ms", tracking=3)


# ── Rendu ─────────────────────────────────────────────────────────────────

def render(u, t):
    img = bg_day()

    rings(img, u)
    links(img, u)

    # Les deux écrans montent en se posant (gauche puis droite, à la double-croche).
    for draw, start, box in ((laptop, 0.0, LC), (phone, 0.125, RC)):
        p = prog(u, start, 0.5)
        if p > 0:
            dy = 40 * (1 - e_out(p))
            x0, y0, x1, y1 = box
            layer(img, (x0 - 4, y0 - 4, x1 + 16, y1 + 56), min(1.0, p * 2),
                  lambda im, d=draw, dy=dy: d(im, u, t, dy))

    api(img, u, t)
    packets(img, u)
    hub(img, u, t)

    rich_line(img, CX, 192, [("Tout se met à jour, ", font("serif", 72, 560), INK),
                             ("sans recharger.", font("serif_i", 72, 450), GREEN_D)], u, 0.125, stagger=0.125)
    typewriter(img, CX, 1000, "LARAVEL REVERB + LARAVEL ECHO  ·  CANAL HOTEL-EVENTS", font("mono", 17), MUTED,
               u, 4.25, cps=80, anchor="ms", tracking=3)

    chrome(img, INDEX, t, u, top_dark=False, bottom_dark=False)
    return img
