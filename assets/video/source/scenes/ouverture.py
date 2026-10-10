"""Scène 1 — Ouverture (0–6 s) : lever de soleil sur la lagune, nom et promesse."""

from kit import (AMBER, GREEN, INK, IVORY, MINT, SAND, SAND_D, SUN, W, arch, bg_day, chrome, circle,
                 e_back, e_expo, e_out, font, lagoon, letters, prog, rise_text, ripples, beat_pulse,
                 sun_reflection, text, typewriter)

INDEX = 0
HORIZON = 650


def render(u, t):
    img = bg_day()
    cx = W / 2

    # Ondes concentriques pâles autour du soleil.
    grow = e_out(prog(u, 0.2, 1.8))
    ripples(img, cx, 600, SAND_D, [300 * grow + 140, 430 * grow + 140, 560 * grow + 140], alpha=0.55 * grow, width=2)

    # Arche : elle pousse depuis l'horizon.
    reveal = HORIZON - (HORIZON - 150) * e_expo(prog(u, 0.0, 1.1))
    arch(img, cx - 270, 150, cx + 270, HORIZON + 4, SAND, reveal_from=reveal)
    arch(img, cx - 252, 168, cx + 252, HORIZON + 4, GREEN, alpha=0.55, width=3, reveal_from=reveal)

    # Soleil : halo qui respire avec la musique, puis disque.
    if u >= 0.3:
        sun_y = HORIZON + 330 - 420 * e_out(prog(u, 0.3, 1.6))
        halo = 178 + 8 * beat_pulse(t) * prog(u, 1.5, 0.5)
        circle(img, cx, sun_y, halo, SUN, alpha=0.22)
        circle(img, cx, sun_y, 150, SUN)

    # Sceau « LB » au sommet de l'arche.
    p = prog(u, 1.0, 0.6)
    if p > 0:
        s = e_back(p)
        circle(img, cx, 286, 46 * s, INK, alpha=min(1, p * 2), width=2.5)
        text(img, cx, 286 + 15 * s, "LB", font("serif", max(8, 40 * s), 600), INK, min(1, p * 2), "ms")

    # Lagune : l'horizon monte depuis le bas de l'écran.
    horizon = 1100 - (1100 - HORIZON) * e_out(prog(u, 0.0, 1.0))
    lagoon(img, horizon, t)
    sun_reflection(img, cx, horizon, 150, t, alpha=prog(u, 1.1, 0.8), rows=3)

    # Nom, promesse, nature du projet.
    letters(img, cx, 850, "La baie des lacs", font("serif", 128, 560), IVORY, u, 1.3, stagger=0.045)
    rise_text(img, cx, 925, "L’hospitalité ivoirienne, sublimée.", font("serif_i", 44, 400), SUN, u, 2.2,
              anchor="ms")
    typewriter(img, cx, 1000, "SYSTÈME DE GESTION HÔTELIÈRE  ·  PMS FULL-STACK", font("mono", 19), MINT,
               u, 2.8, cps=48, anchor="ms", tracking=5)

    chrome(img, INDEX, t, u, top_dark=False, bottom_dark=True, alpha=prog(u, 0.8, 0.6))
    return img
