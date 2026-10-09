"""Construit la présentation vidéo de La baie des lacs.

    python3 build.py              # vidéo complète + affiche → assets/video/
    python3 build.py --preview 12 # planche contact (1 image toutes les 12 images)
    python3 build.py --still 4.5  # une seule image PNG à l'instant donné

Prérequis : Python 3.10+, Pillow, numpy, ffmpeg. Les polices (Fraunces,
Manrope, DM Mono — licence SIL OFL) sont téléchargées depuis google/fonts au
premier lancement dans assets/video/source/.fonts/ (ignoré par git).
"""

import argparse
import os
import subprocess
import sys
import tempfile
import urllib.request
from multiprocessing import Pool
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
FONT_DIR = HERE / ".fonts"
os.environ.setdefault("LBDL_FONT_DIR", str(FONT_DIR))
sys.path.insert(0, str(HERE))

FONTS = {
    "Fraunces[SOFT,WONK,opsz,wght].ttf": "ofl/fraunces/Fraunces%5BSOFT,WONK,opsz,wght%5D.ttf",
    "Fraunces-Italic[SOFT,WONK,opsz,wght].ttf": "ofl/fraunces/Fraunces-Italic%5BSOFT,WONK,opsz,wght%5D.ttf",
    "Manrope[wght].ttf": "ofl/manrope/Manrope%5Bwght%5D.ttf",
    "DMMono-Medium.ttf": "ofl/dmmono/DMMono-Medium.ttf",
}
VIDEO = OUT / "LaBaieDesLacs_presentation.mp4"
POSTER = OUT / "presentation-poster.jpg"
POSTER_T = 4.6


def fetch_fonts():
    FONT_DIR.mkdir(exist_ok=True)
    for name, path in FONTS.items():
        dest = FONT_DIR / name
        if not dest.exists():
            print(f"Téléchargement de {name}…")
            urllib.request.urlretrieve(f"https://raw.githubusercontent.com/google/fonts/main/{path}", dest)


def _render(i):
    from animation import frame
    from timeline import FPS
    return frame(i / FPS).tobytes()


def render_video(workers):
    from music import compose, write_wav
    from timeline import DURATION, FPS, HEIGHT, WIDTH

    total = int(round(DURATION * FPS))
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "musique.wav"
        print("Synthèse de la musique…")
        write_wav(wav, compose())
        cmd = [
            "ffmpeg", "-v", "error", "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "-",
            "-i", str(wav),
            "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-tune", "animation",
            "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart",
            "-c:a", "aac", "-b:a", "192k", "-shortest",
            "-metadata", "title=La baie des lacs — présentation",
            "-metadata", "comment=Animation Python (Pillow) et musique originale synthétisée pour le projet",
            str(VIDEO),
        ]
        enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        with Pool(workers) as pool:
            for n, data in enumerate(pool.imap(_render, range(total), chunksize=4)):
                enc.stdin.write(data)
                if n % 150 == 0:
                    print(f"  image {n}/{total}")
        enc.stdin.close()
        if enc.wait():
            sys.exit("ffmpeg a échoué")
    print(f"Vidéo : {VIDEO}")


def render_poster():
    from animation import frame
    frame(POSTER_T).save(POSTER, quality=90, optimize=True, progressive=True)
    print(f"Affiche : {POSTER}")


def preview(every, dest, start=0.0, end=None):
    from PIL import Image
    from animation import frame
    from timeline import DURATION, FPS

    end = DURATION if end is None else end
    times = [i / FPS for i in range(int(start * FPS), int(end * FPS), every)]
    thumbs = [frame(t).resize((384, 216)) for t in times]
    cols = 6
    sheet = Image.new("RGB", (cols * 384, ((len(thumbs) + cols - 1) // cols) * 216), (0, 0, 0))
    for k, th in enumerate(thumbs):
        sheet.paste(th, ((k % cols) * 384, (k // cols) * 216))
    sheet.save(dest)
    print(f"Planche : {dest}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", type=int, metavar="N")
    ap.add_argument("--still", type=float, metavar="T")
    ap.add_argument("--from", dest="start", type=float, default=0.0)
    ap.add_argument("--to", dest="end", type=float)
    ap.add_argument("--out", default="apercu.png")
    ap.add_argument("--workers", type=int, default=os.cpu_count() or 2)
    args = ap.parse_args()
    fetch_fonts()
    if args.still is not None:
        from animation import frame
        frame(args.still).save(args.out)
        print(args.out)
    elif args.preview:
        preview(args.preview, args.out, args.start, args.end)
    else:
        render_video(args.workers)
        render_poster()
