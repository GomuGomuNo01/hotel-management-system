"""Assemblage image par image : scène courante + transitions calées sur les mesures.

Chaque scène est un module de `scenes/` exposant :
    render(u, t) -> PIL.Image (RGB, 1920×1080)
où u est le temps local de la scène (0 à son début) et t le temps global.
Une scène doit accepter u légèrement négatif (pendant la transition d'entrée)
et légèrement supérieur à sa durée (pendant la transition de sortie).
"""

import importlib

from kit import composite_transition, prog
from timeline import DURATION, SCENES, boundaries, scene_end, scene_start

MODULES = [importlib.import_module(f"scenes.{key}") for key, *_ in SCENES]

# Transition vers la scène suivante (index = scène sortante).
TRANSITIONS = [
    "tide_up",          # ouverture → constat : la lagune monte et envahit l'écran
    "sweep_right",      # constat → espaces : vague balayant de gauche à droite
    "iris:960:600",     # espaces → parcours : ouverture en iris depuis le centre
    "tide_down",        # parcours → coulisses : la nuit tombe par le haut
    "iris:960:640",     # coulisses → temps réel : onde partant du hub Reverb
    "sweep_left",       # temps réel → confiance
    "tide_up",          # confiance → résumé : la marée ramène le jour
]
PRE, POST = 0.42, 0.42   # la transition chevauche chaque changement de scène


def scene_index(t):
    for i in range(len(SCENES)):
        if t < scene_end(i):
            return i
    return len(SCENES) - 1


def render_scene(i, t):
    return MODULES[i].render(t - scene_start(i), t)


def frame(t):
    t = min(max(t, 0.0), DURATION - 1e-6)
    for k, b in enumerate(boundaries()):
        if b - PRE <= t < b + POST:
            p = prog(t, b - PRE, PRE + POST)
            return composite_transition(render_scene(k, t), render_scene(k + 1, t), TRANSITIONS[k], p, t)
    return render_scene(scene_index(t), t)
