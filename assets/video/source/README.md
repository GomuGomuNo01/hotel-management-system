# Générateur de la présentation vidéo

La vidéo `../LaBaieDesLacs_presentation.mp4` (60 s, 1920×1080, 30 i/s) et sa musique
sont entièrement produites par ce dossier : aucune séquence filmée, aucune banque
d'images, aucun échantillon sonore.

```bash
cd assets/video/source
python3 build.py                 # musique + vidéo + affiche → assets/video/
python3 build.py --still 4.6     # une image à l'instant donné (apercu.png)
python3 build.py --preview 15    # planche contact de toute la vidéo
```

Prérequis : Python 3.10+, `pip install pillow numpy`, `ffmpeg`. Au premier lancement,
les polices Fraunces, Manrope et DM Mono (licence SIL Open Font License) sont
téléchargées depuis le dépôt `google/fonts` dans `.fonts/` (ignoré par git).

| Fichier | Rôle |
|---|---|
| `timeline.py` | 30 mesures à 120 BPM : chaque scène commence sur un premier temps |
| `music.py` | Musique originale synthétisée (numpy) : balafon, djembé, basse, nappes, effets |
| `kit.py` | Charte « Lagune » : palette, typographies, formes lissées, vagues, transitions |
| `scenes/*.py` | Les huit scènes, une fonction `render(u, t)` chacune |
| `animation.py` | Choisit la scène et compose les transitions sur les changements de mesure |
| `build.py` | Rendu parallèle, encodage H.264 + AAC, affiche |

## Charte « Lagune »

Propre à ce projet : fond ivoire alterné avec un vert lagune profond (jour / nuit),
titres centrés en serif douce avec un segment en italique, motifs d'arche (porte
d'hôtel), de soleil et de vagues, transitions en marée, balayage ondulé et iris.
Couleurs reprises de la marque (`frontend/src/config/brand.js`) : vert `#2F9E5B`,
ambre `#D97706`.

## Musique

Afro-house lumineuse à 120 BPM, grille Lam9 – Famaj9 – Domaj9 – Sol6. Chaque son
est calculé à partir d'oscillateurs et de bruit filtré : le balafon par synthèse
modale (partiels inharmoniques de lame de bois et grésillement des calebasses),
le djembé, le shaker, la basse et les nappes par synthèse additive, les souffles
de transition par bruit filtré. Les changements de scène tombent sur les
premiers temps : souffle à chaque transition, impact sur l'entrée du groove, des
coulisses et de la confiance. Création originale, sans droits tiers.
