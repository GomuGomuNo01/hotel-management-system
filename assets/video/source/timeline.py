"""Découpage temporel partagé par l'animation et la musique.

La vidéo dure exactement 30 mesures à 120 BPM (60 s). Chaque changement de
scène tombe sur un premier temps de mesure : c'est ce qui permet de caler la
musique sur l'image sans montage manuel.
"""

BPM = 120
BEAT = 60 / BPM          # 0,5 s
STEP = BEAT / 4          # double-croche
BAR = BEAT * 4           # 2 s
BARS = 30
DURATION = BAR * BARS    # 60 s
FPS = 30
WIDTH, HEIGHT = 1920, 1080

# (clé, titre de chapitre, première mesure, nombre de mesures)
SCENES = [
    ("ouverture",  "Ouverture",      0, 3),
    ("constat",    "Le constat",     3, 3),
    ("espaces",    "Les espaces",    6, 4),
    ("parcours",   "Le parcours",   10, 5),
    ("coulisses",  "Les coulisses", 15, 4),
    ("temps_reel", "Le temps réel", 19, 3),
    ("confiance",  "La confiance",  22, 4),
    ("resume",     "En résumé",     26, 4),
]


def scene_start(index):
    return SCENES[index][2] * BAR


def scene_end(index):
    _, _, first, count = SCENES[index]
    return (first + count) * BAR


def boundaries():
    """Instants des changements de scène (hors début et fin)."""
    return [scene_start(i) for i in range(1, len(SCENES))]
