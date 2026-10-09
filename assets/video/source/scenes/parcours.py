"""Scène provisoire — à remplacer."""

from kit import bg_day, chrome, font, text, W, H, INK
from timeline import SCENES

INDEX = [s[0] for s in SCENES].index("parcours")


def render(u, t):
    img = bg_day()
    text(img, W / 2, H / 2, "parcours", font("serif", 80), INK, anchor="mm")
    chrome(img, INDEX, t, u, top_dark=False, bottom_dark=False)
    return img
