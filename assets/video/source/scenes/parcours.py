"""Scène 4 — Le parcours (20–30 s) : réserver en quatre gestes.

Un chemin ondulé traverse l'écran ; un petit soleil le parcourt et s'arrête
sur quatre étapes, une par mesure (arrivées sur le troisième temps). À chaque
arrêt, le nœud passe au vert et une carte papier se pose : chambre, dates,
paiement, confirmation. Le soleil finit sa course devant la porte de l'hôtel.
"""

import math

from PIL import Image

from kit import (AMBER_D, GREEN, GREEN_D, INK, IVORY, MUTED, PAPER, SAND, SAND_D, SAND_L, SUN, TERRA, W, Local,
                 arch, beat_pulse, bg_sand, chrome, circle, clamp, e_back, e_expo, e_in_out, e_out, fmt_int, font,
                 icon, line, mix, prog, rich_line, rise_text, rrect, text, typewriter)
from timeline import BEAT

INDEX = 3

X0, X1 = 150, 1756                    # extrémités du chemin
STOPS = [330, 750, 1170, 1590]        # les quatre étapes
ARRIVE = [1.0, 3.0, 5.0, 7.0]         # arrivée du soleil sur chaque étape (troisième temps)
MOVE = 0.75                           # durée d'un trajet entre deux étapes
END_AT = 8.0                          # arrivée devant la porte, sur la mesure 4
CW, CH, PAD = 400, 230, 24            # cartes
CARD_Y = (262, 690)                   # cartes au-dessus (étapes 1, 3) / au-dessous (2, 4)
NODE_R = 34

# Trajets du soleil : (départ, arrivée, x de départ, x d'arrivée).
LEGS = ([(ARRIVE[0] - MOVE, ARRIVE[0], X0, STOPS[0])]
        + [(ARRIVE[k] - MOVE, ARRIVE[k], STOPS[k - 1], STOPS[k]) for k in (1, 2, 3)]
        + [(END_AT - 0.5, END_AT, STOPS[3], X1)])

HEADERS = ["01 · CHAMBRE", "02 · DATES", "03 · PAIEMENT", "04 · CONFIRMATION"]
# Notes en italique, côté vide de chaque nœud : ce que garantit l'étape.
NOTES = ["Catalogue en libre accès", "Aucune double réservation", "Paiement en attente : 30 min",
         "Suivie depuis l’espace client"]


def path_y(x):
    """Sinusoïde douce : creux sous les cartes du haut, bosses sous celles du bas."""
    return 600 + 40 * math.cos(2 * math.pi * (x - STOPS[0]) / 840)


def path_pts(xa, xb, step=6):
    n = max(1, int(math.ceil((xb - xa) / step)))
    return [(xa + (xb - xa) * i / n, path_y(xa + (xb - xa) * i / n)) for i in range(n + 1)]


def dot_x(u):
    return X0 + sum((b - a) * e_in_out(prog(u, s, e - s)) for s, e, a, b in LEGS)


def dashed_path(img, xb, color, width, alpha, dash=14, gap=12):
    """Chemin en pointillés jusqu'à xb, dessiné dans un seul masque (motif ancré à gauche)."""
    pts = path_pts(X0, X1, 4)
    m = Local(X0 - width, 552 - width, X1 + width, 648 + width, ss=3)
    acc, on, seg = 0.0, True, [pts[0]]

    def flush(seg):
        if len(seg) > 1:
            m.d.line([m.p(x, y) for x, y in seg], fill=255, width=m.s(width), joint="curve")
            for x, y in (seg[0], seg[-1]):
                m.d.ellipse(m.box(x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill=255)

    for (xa, ya), (xc, yc) in zip(pts, pts[1:]):
        if xa >= xb:
            break
        L = math.hypot(xc - xa, yc - ya)
        pos = 0.0
        while pos < L - 1e-9:
            step = min((dash if on else gap) - acc, L - pos)
            pos += step
            acc += step
            q = (xa + (xc - xa) * pos / L, ya + (yc - ya) * pos / L)
            if on:
                seg.append(q)
            if acc >= (dash if on else gap) - 1e-6:
                if on:
                    flush(seg)
                on, acc, seg = not on, 0.0, [q]
    if on:
        flush([p for p in seg if p[0] <= xb])
    m.paste(img, color, alpha)


def faded(img, box, alpha, draw):
    """Dessine `draw` sur un calque puis le fond dans l'image : fondu propre d'un groupe."""
    if alpha <= 0.003:
        return
    if alpha >= 0.999:
        draw(img)
        return
    layer = img.copy()
    draw(layer)
    box = tuple(int(round(v)) for v in box)
    img.paste(Image.blend(img.crop(box), layer.crop(box), alpha), box[:2])


# ── Contenu des cartes (r = temps depuis l'arrivée sur l'étape) ───────────

def card_room(img, x0, y0, r, u):
    a = ARRIVE[0]
    # Vignette en arche : la porte de la chambre 301.
    tx0, tx1, ty0, ty1 = x0 + PAD, x0 + PAD + 110, y0 + 62, y0 + 206
    p = prog(r, 0.0, 0.6)
    if p > 0:
        arch(img, tx0, ty0, tx1, ty1, SUN, alpha=0.28, reveal_from=ty1 - (ty1 - ty0 + 2) * e_expo(p))
    q = prog(r, 0.25, 0.45)
    if q > 0:
        s = e_back(q)
        icon(img, "bed", (tx0 + tx1) / 2, y0 + 158, 54 * s, AMBER_D, alpha=min(1, q * 2.5), width=3.4)
    rise_text(img, (tx0 + tx1) / 2, y0 + 112, "301", font("mono", 16), AMBER_D, u, a + 0.375, 0.45, dist=12,
              anchor="ms", tracking=2)
    xt = x0 + 156
    rise_text(img, xt, y0 + 104, "Suite présidentielle", font("sans", 22, 760), INK, u, a + 0.25, 0.5, dist=18)
    rise_text(img, xt, y0 + 134, "Ch. 301 · 2 pers.", font("sans", 18, 520), MUTED, u, a + 0.375, 0.5, dist=16)
    g = e_out(prog(r, 0.5, 0.5))
    if g > 0:
        line(img, [(xt, y0 + 158), (xt + (x0 + CW - PAD - xt) * g, y0 + 158)], INK, 1.5, alpha=0.12)
    rise_text(img, xt, y0 + 194, "95 000 FCFA / nuit", font("sans", 22, 780), GREEN_D, u, a + 0.5, 0.5, dist=18)


def card_dates(img, x0, y0, r, u):
    a = ARRIVE[1]
    pitch, cw, ch = 46, 40, 24
    cx0 = x0 + (CW - 7 * pitch) / 2 + pitch / 2
    col = lambda c: cx0 + c * pitch
    row = lambda k: y0 + 98 + k * 27
    fm = font("mono", 15)
    for c, d in enumerate("LMMJVSD"):
        text(img, col(c), y0 + 74, d, fm, MUTED, anchor="ms")
    # Mois commençant un vendredi : 8-9 déjà pris, séjour du 12 au 15 (3 nuits).
    days = {}
    for n in range(1, 25):
        k, c = divmod(n + 3, 7)
        days[n] = (col(c), row(k))
    for n in (8, 9):
        x, y = days[n]
        rrect(img, x - cw / 2, y - ch / 2, x + cw / 2, y + ch / 2, ch / 2, TERRA, alpha=0.35)
    sel = [prog(r, 0.25 + 0.125 * i, 0.3) for i in range(4)]
    if sel[0] > 0:
        x, y = days[12]
        s = e_back(sel[0])
        right = x + cw / 2 * s + sum(pitch * e_out(q) for q in sel[1:])
        rrect(img, x - cw / 2 * s, y - ch / 2 * s, right, y + ch / 2 * s, ch / 2 * s, GREEN)
    fn = font("sans", 17, 620)
    for n, (x, y) in days.items():
        color, al = INK, 1.0
        if n in (8, 9):
            al = 0.55
        if 12 <= n <= 15:
            color = mix(INK, IVORY, clamp(sel[n - 12] * 2.5))
        text(img, x, y + 6, str(n), fn, color, alpha=al, anchor="ms")
    for n in (8, 9):
        x, y = days[n]
        line(img, [(x - 11, y), (x + 11, y)], TERRA, 2)
    rise_text(img, x0 + CW - PAD, y0 + 40, "3 NUITS", fm, GREEN_D, u, a + 0.875, 0.45, dist=12, anchor="rs",
              tracking=3)
    q = e_out(prog(r, 0.5, 0.45))
    if q > 0:
        rrect(img, x0 + PAD, y0 + 199, x0 + PAD + 14, y0 + 213, 4, TERRA, alpha=0.45 * q)
    rise_text(img, x0 + PAD + 24, y0 + 212, "Dates déjà réservées : bloquées", font("sans", 17, 540), MUTED, u,
              a + 0.5, 0.45, dist=14)


def card_pay(img, x0, y0, r, u):
    fs = font("sans", 18, 640)
    cy, h = y0 + 86, 40
    px = x0 + PAD
    for name, sel in (("Orange Money", False), ("Wave", True)):
        w = 20 + 16 + 9 + fs.getlength(name) + 20
        rrect(img, px, cy - h / 2, px + w, cy + h / 2, h / 2, INK, alpha=0.2, width=2)
        rx = px + 20 + 8
        # Wave choisi : le vert remplit la pastille de gauche à droite, le texte bascule sous le front.
        fill = px + w * e_in_out(prog(r, 0.5, 0.3)) if sel else px
        if fill > px:
            rrect(img, px, cy - h / 2, fill, cy + h / 2, h / 2, GREEN)
        circle(img, rx, cy, 8, INK, alpha=0.35, width=2)
        if fill > px:
            circle(img, rx, cy, 10, GREEN, alpha=clamp((fill - rx + 10) / 20))
        q = prog(r, 0.625, 0.4) if sel else 0
        if q > 0:
            icon(img, "check", rx, cy + 1, 20 * e_back(q), IVORY, alpha=min(1, q * 3), width=3)
        text(img, px + 45, cy + 6.5, name, fs, INK, clip=(fill, -1e4, 1e4, 1e4))
        if fill > px:
            text(img, px + 45, cy + 6.5, name, fs, IVORY, clip=(-1e4, -1e4, fill, 1e4))
        px += w + 12
    # Interrupteur « Total 100 % | Acompte 50 % ».
    tx0, tx1, ty0, ty1 = x0 + PAD, x0 + CW - PAD, y0 + 122, y0 + 164
    rrect(img, tx0, ty0, tx1, ty1, (ty1 - ty0) / 2, SAND)
    kp = e_in_out(prog(r, 1.0, 0.4))
    kw = (tx1 - tx0 - 8) / 2
    kx = tx0 + 4 + kw * kp
    rrect(img, kx + 1, ty0 + 6, kx + kw + 1, ty1 - 2, 17, SAND_D, alpha=0.6)
    rrect(img, kx, ty0 + 4, kx + kw, ty1 - 4, 17, PAPER)
    fk = font("sans", 17, 700)
    text(img, tx0 + 4 + kw / 2, ty0 + 27, "Total 100 %", fk, mix(INK, MUTED, kp), anchor="ms")
    text(img, tx0 + 4 + kw * 1.5, ty0 + 27, "Acompte 50 %", fk, mix(MUTED, INK, kp), anchor="ms")
    # Montant, recalculé quand l'interrupteur bascule.
    v = 285_000 - 142_500 * e_in_out(prog(r, 1.0, 0.5))
    fl = font("sans", 20, 520)
    label = "À payer :"
    text(img, x0 + PAD, y0 + 208, label, fl, MUTED)
    text(img, x0 + PAD + fl.getlength(label) + 10, y0 + 208, f"{fmt_int(round(v / 500) * 500)} FCFA",
         font("sans", 24, 800), INK)


def card_done(img, x0, y0, r, u):
    a = ARRIVE[3]
    cx, cy = x0 + PAD + 38, y0 + 112
    q = prog(r, 0.6, 0.8)
    if q > 0:
        circle(img, cx, cy, 40 + 14 * e_out(q), GREEN, alpha=0.4 * (1 - q), width=2.5)
    p = prog(r, 0.125, 0.45)
    if p > 0:
        s = e_back(p)
        circle(img, cx, cy, 38 * s, GREEN)
        icon(img, "check", cx, cy + 2, 40 * s, IVORY, alpha=min(1, p * 3), width=4.5)
    xt = x0 + 122
    rise_text(img, xt, y0 + 106, "Réservation confirmée", font("sans", 22, 780), INK, u, a + 0.25, 0.5, dist=18)
    rise_text(img, xt, y0 + 136, "Ch. 301 · 3 nuits", font("sans", 18, 520), MUTED, u, a + 0.375, 0.5, dist=16)
    # Bandeau du reçu : le document glisse vers le haut.
    q = e_out(prog(r, 0.5, 0.45))
    if q > 0:
        rrect(img, x0 + PAD, y0 + 164, x0 + CW - PAD, y0 + 208, 14, SAND_L, alpha=q)
    q = prog(r, 0.625, 0.5)
    if q > 0:
        icon(img, "doc", x0 + PAD + 26, y0 + 186 + 16 * (1 - e_back(q)), 24, AMBER_D, alpha=min(1, q * 2.5),
             width=2.4)
    rise_text(img, x0 + PAD + 50, y0 + 192, "Reçu PDF · e-mail envoyé", font("sans", 18, 620), INK, u, a + 0.75,
              0.45, dist=14)


CONTENT = [card_room, card_dates, card_pay, card_done]


def card(img, k, u):
    """Carte papier posée à l'arrivée : elle monte de 30 px en apparaissant."""
    p = prog(u, ARRIVE[k], 0.5)
    if p <= 0:
        return
    x0 = STOPS[k] - CW / 2
    y0 = CARD_Y[k % 2] + 30 * (1 - e_back(p))

    def draw(im):
        rrect(im, x0 + 10, y0 + 10, x0 + CW + 10, y0 + CH + 10, 22, SAND_D, alpha=0.8)
        rrect(im, x0, y0, x0 + CW, y0 + CH, 22, PAPER)
        text(im, x0 + PAD, y0 + 40, HEADERS[k], font("mono", 15), MUTED, tracking=3)
        CONTENT[k](im, x0, y0, u - ARRIVE[k], u)

    faded(img, (x0 - 4, y0 - 4, x0 + CW + 16, y0 + CH + 16), min(1.0, p * 2.5), draw)


def connector(img, k, u):
    """Filet fin entre le nœud et sa carte, tiré depuis le nœud."""
    p = e_out(prog(u, ARRIVE[k] - 0.05, 0.35))
    if p <= 0:
        return
    x, y = STOPS[k], path_y(STOPS[k])
    up = k % 2 == 0
    ya = y - NODE_R - 8 if up else y + NODE_R + 8
    yb = CARD_Y[0] + CH if up else CARD_Y[1]
    line(img, [(x, ya), (x, ya + (yb - ya) * p)], INK, 2, alpha=0.25)
    circle(img, x, ya, 3.5 * p, INK, alpha=0.3)


def node(img, k, u, t):
    x, y = STOPS[k], path_y(STOPS[k])
    p = prog(u, 0.375 + 0.125 * k, 0.45)
    if p <= 0:
        return
    s = e_back(p)
    circle(img, x, y, NODE_R * s, PAPER)
    circle(img, x, y, NODE_R * s, INK, alpha=0.3 * min(1, p * 2), width=2)


def node_on(img, k, u, t):
    """Nœud atteint : disque vert qui « pop », numéro, onde soleil et halo de l'étape courante."""
    a = ARRIVE[k]
    x, y = STOPS[k], path_y(STOPS[k])
    q = prog(u, a, 0.8)
    if 0 < q < 1:
        circle(img, x, y, NODE_R + 4 + 40 * e_out(q), SUN, alpha=0.75 * (1 - q), width=3)
    leave = LEGS[k + 1][0]
    h = e_out(prog(u, a + 0.125, 0.35)) * (1 - e_in_out(prog(u, leave, 0.3)))
    if h > 0:
        circle(img, x, y, NODE_R + 9 + 1.5 * beat_pulse(t), SUN, alpha=0.8 * h, width=3)
    p = prog(u, a - 0.1, 0.45)
    if p <= 0:
        return
    circle(img, x, y, (NODE_R + 1.5) * e_back(p), GREEN)
    rise_text(img, x - 1, y + 14, str(k + 1), font("serif_i", 42, 560), IVORY, u, a + 0.05, 0.4, dist=18,
              anchor="ms")


def note(img, k, u):
    up = k % 2 == 1
    y = path_y(STOPS[k]) + (-NODE_R - 44 if up else NODE_R + 62)
    rise_text(img, STOPS[k], y, NOTES[k], font("serif_i", 27, 450), GREEN_D, u, ARRIVE[k] + 0.5, 0.5, dist=20,
              anchor="ms")


def door(img, u, t):
    """Porte de l'hôtel au bout du chemin : contour d'abord, remplie quand le soleil arrive."""
    x, y = X1, path_y(X1)
    p = prog(u, 0.5, 0.5)
    if p <= 0:
        return
    w, top, bot = 58, y - 78, y + 22
    reveal = bot - (bot - top + 2) * e_expo(p)
    f = e_out(prog(u, END_AT - 0.1, 0.4))
    arch(img, x - w / 2, top, x + w / 2, bot, PAPER, reveal_from=reveal)
    if f > 0:
        arch(img, x - w / 2, top, x + w / 2, bot, GREEN, alpha=f, reveal_from=reveal)
    arch(img, x - w / 2, top, x + w / 2, bot, GREEN_D, alpha=0.6 + 0.4 * f, width=2.5, reveal_from=reveal)
    g = e_out(p)
    line(img, [(x - 22 - 20 * g, bot), (x + 22 + 20 * g, bot)], INK, 2, alpha=0.3 * g)


def sun_dot(img, u, t):
    p = prog(u, 0.125, 0.35)
    if p <= 0:
        return
    x = dot_x(u)
    y = path_y(x)
    s = e_back(p)
    end = prog(u, END_AT, 0.3)
    if end > 0:
        # Arrivé devant la porte : une onde douce part du soleil sur chaque temps.
        ph = (t % BEAT) / BEAT
        circle(img, x, y, 21 + 17 * e_out(ph), SUN, alpha=0.55 * (1 - ph) * end, width=2.5)
    r = (15 + 1.6 * beat_pulse(t) * end) * s
    circle(img, x, y, r + 4, PAPER)
    circle(img, x, y, r, SUN)


def render(u, t):
    img = bg_sand()
    cx = W / 2

    rich_line(img, cx, 190, [("Réserver en ", font("serif", 72, 560), INK),
                             ("quatre gestes.", font("serif_i", 72, 450), AMBER_D)], u, 0.125, stagger=0.125)

    # Chemin : aperçu pointillé, puis trace verte derrière le soleil.
    rv = e_out(prog(u, 0.2, 0.45))
    if rv > 0:
        dashed_path(img, X0 + (X1 - X0) * rv, INK, 2.5, 0.3)
        circle(img, X0, path_y(X0), 6, INK, alpha=0.4 * rv)
    door(img, u, t)
    if u > 0.3:
        x = dot_x(u)
        if x > X0 + 1:
            line(img, path_pts(X0, x), GREEN, 6)

    for k in range(4):
        connector(img, k, u)
    for k in range(4):
        card(img, k, u)
        note(img, k, u)
    for k in range(4):
        node(img, k, u, t)
    sun_dot(img, u, t)
    for k in range(4):
        node_on(img, k, u, t)

    typewriter(img, cx, 1010, "MONTANT CALCULÉ CÔTÉ SERVEUR  ·  100 % OU ACOMPTE 50 %", font("mono", 17), MUTED,
               u, 7.625, cps=55, anchor="ms", tracking=3)

    chrome(img, INDEX, t, u, top_dark=False, bottom_dark=False)
    return img
