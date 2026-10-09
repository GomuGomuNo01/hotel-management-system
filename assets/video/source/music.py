"""Musique originale de la présentation : afro-house lumineuse, 120 BPM.

Tout est synthétisé ici à partir d'oscillateurs et de bruit (numpy seul) :
aucun échantillon, aucune boucle ni aucun extrait d'une œuvre existante. Le
morceau est donc une création propre au projet, sans droits tiers.

Instrumentation : balafon (synthèse modale + vibration des résonateurs),
djembé, shaker, kick, basse, nappes, cloches « temps réel » et effets de
transition. La grille d'accords (Lam9 - Famaj9 - Domaj9 - Sol6) tourne sur
quatre mesures ; chaque section suit une scène de la vidéo (voir timeline.py).
"""

import wave

import numpy as np

from timeline import BAR, BEAT, DURATION, STEP, boundaries

SR = 44100
TAIL = 3.0
MASTER_DB = -4.0
N = int((DURATION + TAIL) * SR)
rng = np.random.default_rng(1974)


# ── Outils ────────────────────────────────────────────────────────────────

def hz(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def tvec(dur):
    return np.arange(int(dur * SR)) / SR


def band(x, lo=None, hi=None, order=2):
    """Filtre passe-bande doux appliqué dans le domaine fréquentiel."""
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR) + 1e-9
    gain = np.ones_like(f)
    if lo:
        gain *= 1 / np.sqrt(1 + (lo / f) ** (2 * order))
    if hi:
        gain *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    return np.fft.irfft(spec * gain, len(x))


def noise(dur):
    return rng.standard_normal(int(dur * SR))


class Bus:
    """Piste stéréo avec placement panoramique à puissance constante."""

    def __init__(self):
        self.l = np.zeros(N)
        self.r = np.zeros(N)

    def add(self, t0, sig, gain=1.0, pan=0.0):
        i = int(round(t0 * SR))
        if i >= N or i + len(sig) <= 0:
            return
        if i < 0:
            sig, i = sig[-i:], 0
        sig = sig[: N - i] * gain
        a = (pan + 1) * np.pi / 4
        self.l[i:i + len(sig)] += sig * np.cos(a)
        self.r[i:i + len(sig)] += sig * np.sin(a)

    def stereo(self):
        return np.stack([self.l, self.r])


# ── Instruments ───────────────────────────────────────────────────────────

def kick():
    t = tvec(0.5)
    f = 46 + 110 * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.17)
    click = band(noise(0.5), lo=1500) * np.exp(-t / 0.004) * 0.25
    return np.tanh(1.6 * (body + click))


def clap():
    t = tvec(0.35)
    n = band(noise(0.35), lo=900, hi=3800)
    env = np.zeros_like(t)
    for k, d in enumerate((0.0, 0.011, 0.022)):
        env += (t >= d) * np.exp(-np.clip(t - d, 0, None) / (0.006 if k < 2 else 0.09))
    return n * env * 0.6


def shaker():
    t = tvec(0.09)
    env = np.minimum(t / 0.004, 1) * np.exp(-t / 0.03)
    return band(noise(0.09), lo=5200, hi=14000) * env


def open_hat():
    t = tvec(0.3)
    return band(noise(0.3), lo=7000) * np.exp(-t / 0.11) * 0.8


def djembe(kind):
    t = tvec(0.4)
    if kind == "B":
        f = 62 + 30 * np.exp(-t / 0.02)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
        s += band(noise(0.4), hi=400) * np.exp(-t / 0.015) * 0.4
    elif kind == "T":
        f = 205 + 40 * np.exp(-t / 0.01)
        ph = 2 * np.pi * np.cumsum(f) / SR
        s = (np.sin(ph) + 0.35 * np.sin(2.31 * ph)) * np.exp(-t / 0.09)
    else:  # claqué
        s = band(noise(0.4), lo=700, hi=5500) * np.exp(-t / 0.035)
        s += np.sin(2 * np.pi * 410 * t) * np.exp(-t / 0.03) * 0.6
    return s * 0.7


def bass(note, dur):
    t = tvec(dur + 0.05)
    f = hz(note)
    x = np.sin(2 * np.pi * f * t) + 0.28 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    env = np.minimum(t / 0.006, 1) * np.exp(-t / (dur * 1.4)) * np.clip((dur + 0.05 - t) / 0.05, 0, 1)
    return np.tanh(1.8 * x * env) * 0.8


def balafon(note, vel=1.0):
    """Lame de bois frappée : partiels inharmoniques + grésillement des calebasses."""
    t = tvec(1.2)
    f = hz(note)
    s = np.zeros_like(t)
    for ratio, amp, decay in ((1.0, 1.0, 0.42), (3.93, 0.32, 0.11), (9.1, 0.10, 0.04)):
        s += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / decay)
    attack = np.minimum(t / 0.0015, 1)
    mallet = band(noise(1.2), lo=1800, hi=7000) * np.exp(-t / 0.006) * 0.35
    buzz = band(noise(1.2), lo=1500, hi=4200) * np.exp(-t / 0.12) * 0.09
    buzz *= 0.5 + 0.5 * np.sin(2 * np.pi * f * t)
    return (s * attack + mallet + buzz) * vel * 0.5


def bell(note):
    t = tvec(2.0)
    f = hz(note)
    index = 2.4 * np.exp(-t / 0.25)
    s = np.sin(2 * np.pi * f * t + index * np.sin(2 * np.pi * f * 3.5 * t))
    return s * np.minimum(t / 0.002, 1) * np.exp(-t / 0.55) * 0.45


def log_drum(note):
    t = tvec(0.6)
    f = hz(note) * (1 + 0.6 * np.exp(-t / 0.018))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    return np.tanh(2.4 * s) * 0.55


def pad_chord(notes, dur, bright):
    """Nappe additive : trois voix désaccordées par note, timbre selon `bright`."""
    t = tvec(dur + 0.9)
    out_l = np.zeros_like(t)
    out_r = np.zeros_like(t)
    for note in notes:
        for detune, pan in ((-0.07, -0.7), (0.0, 0.0), (0.07, 0.7)):
            f = hz(note + detune)
            ph = rng.uniform(0, 2 * np.pi)
            voice = np.zeros_like(t)
            for k in range(1, 11):
                if f * k > 9000:
                    break
                voice += (bright ** (k - 1)) / k * np.sin(2 * np.pi * f * k * t + ph * k)
            a = (pan + 1) * np.pi / 4
            out_l += voice * np.cos(a)
            out_r += voice * np.sin(a)
    env = np.minimum(t / 0.35, 1) * np.clip((dur + 0.9 - t) / 0.9, 0, 1)
    scale = 0.2 / len(notes)
    return out_l * env * scale, out_r * env * scale


def shaped_noise(dur, centers, width=0.45):
    """Bruit dont la bande passante suit `centers(p)` (p de 0 à 1) — souffles et montées."""
    n = int(dur * SR)
    hop, win = 512, 2048
    x = rng.standard_normal(n + win)
    out = np.zeros(n + win)
    w = np.hanning(win)
    f = np.fft.rfftfreq(win, 1 / SR) + 1
    for i in range(0, n, hop):
        c = centers(i / n)
        g = np.exp(-0.5 * (np.log(f / c) / width) ** 2)
        seg = np.fft.irfft(np.fft.rfft(x[i:i + win] * w) * g, win)
        out[i:i + win] += seg * w
    return out[:n] / 6


def whoosh(dur=0.9):
    s = shaped_noise(dur, lambda p: 400 * (14 ** p) if p < 0.85 else 400 * 14 ** 0.85 * (1 - (p - 0.85) * 4))
    t = tvec(dur)[: len(s)]
    env = (t / dur) ** 2.2 * np.clip((dur - t) / 0.08, 0, 1)
    return s * env


def riser(dur):
    s = shaped_noise(dur, lambda p: 300 * (25 ** p), width=0.6)
    t = tvec(dur)[: len(s)]
    f = 180 * (5 ** (t / dur))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    return (s + tone) * (t / dur) ** 2


def impact(size=1.0):
    t = tvec(2.2)
    f = 38 + 30 * np.exp(-t / 0.08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.6 * size))
    crash = band(noise(2.2), lo=300, hi=6000) * np.exp(-t / 0.35) * 0.18
    return np.tanh(1.4 * (boom + crash)) * size


def reverb_ir(dur=2.6, tau=0.42):
    t = tvec(dur)
    ir = np.stack([band(noise(dur), hi=6500), band(noise(dur), hi=6500)])
    ir *= np.exp(-t / tau) * np.minimum(t / 0.02, 1)
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))


def convolve(sig, ir):
    size = 1 << int(np.ceil(np.log2(sig.shape[1] + ir.shape[1])))
    out = np.fft.irfft(np.fft.rfft(sig, size) * np.fft.rfft(ir, size), size)
    return out[:, : sig.shape[1]]


# ── Écriture ──────────────────────────────────────────────────────────────

# Lam9, Famaj9, Domaj9, Sol6 — (basse, notes de la nappe)
CHORDS = [
    (45, [57, 60, 64, 67, 71]),
    (41, [53, 57, 60, 64, 67]),
    (48, [55, 60, 64, 71, 74]),
    (43, [55, 59, 62, 64, 69]),
]

BALAFON = {
    "intro": [(0, 69), (6, 76), (10, 74), (12, 72)],
    "a": [(0, 76), (3, 74), (6, 72), (8, 69), (10, 72), (11, 74), (14, 76)],
    "b": [(0, 69), (2, 72), (3, 69), (6, 67), (8, 64), (11, 67), (12, 69), (14, 72)],
    "c": [(0, 81), (2, 79), (3, 76), (6, 74), (8, 76), (10, 72), (12, 74), (14, 69)],
    "fin": [(0, 76), (2, 74), (4, 72), (6, 69), (8, 72), (10, 69), (12, 67), (14, 69)],
}

BASS = [(0, 0, 3), (3, 12, 1), (6, 0, 2), (10, 7, 2), (12, 0, 1), (14, 12, 2)]
DJEMBE = [(0, "B"), (3, "T"), (5, "T"), (6, "S"), (8, "B"), (11, "T"), (13, "S"), (14, "S"), (15, "T")]
LOG = [(0, 0), (3, 0), (7, 12), (10, 7), (13, 0)]


def section(bar):
    for name, first, last in (("intro", 0, 2), ("constat", 3, 5), ("espaces", 6, 9),
                              ("parcours", 10, 14), ("coulisses", 15, 18), ("temps_reel", 19, 21),
                              ("confiance", 22, 25), ("resume", 26, 29)):
        if first <= bar <= last:
            return name
    return "resume"


BRIGHT = {"intro": 0.5, "constat": 0.55, "espaces": 0.68, "parcours": 0.72,
          "coulisses": 0.42, "temps_reel": 0.62, "confiance": 0.8, "resume": 0.6}


def compose():
    drums, perc, bass_bus, pad, melody, fx = (Bus() for _ in range(6))
    send = Bus()      # départ réverbération
    kicks = []

    def swing(step):
        return 0.012 if step % 2 else 0.0

    for bar in range(30):
        t_bar = bar * BAR
        sec = section(bar)
        root, notes = CHORDS[bar % 4]

        # Nappe : présente du début à la fin, plus sombre dans les coulisses.
        if bar <= 29:
            hold = BAR if bar < 29 else BAR * 0.9
            l, r = pad_chord(notes, hold, BRIGHT[sec])
            gain = 0.55 + 0.45 * min(1, bar / 2) if sec == "intro" else 1.0
            for bus in (pad, send):
                g = gain if bus is pad else gain * 0.5
                i = int(t_bar * SR)
                seg = slice(i, min(N, i + len(l)))
                bus.l[seg] += l[: seg.stop - i] * g
                bus.r[seg] += r[: seg.stop - i] * g

        groove = 3 <= bar <= 27
        full = 6 <= bar <= 27 and sec != "coulisses"

        # Kick (4 temps) — coupé sur la seconde moitié de la mesure de montée (21).
        if groove:
            for beat in range(4):
                if bar == 21 and beat >= 2:
                    continue
                tk = t_bar + beat * BEAT
                drums.add(tk, kick(), 0.62)
                kicks.append(tk)

        # Basse
        if groove:
            for step, interval, length in BASS:
                if bar == 21 and step >= 8:
                    continue
                g = 0.5 if sec == "coulisses" else 0.42
                bass_bus.add(t_bar + step * STEP + swing(step), bass(root + interval, length * STEP), g)

        # Shaker (doubles-croches, accent sur les contretemps)
        if bar >= 1 and bar <= 28:
            level = 0.35 if bar < 3 else 1.0
            for step in range(16):
                acc = (0.55, 0.9, 0.65, 1.0)[step % 4]
                perc.add(t_bar + step * STEP + swing(step), shaker(), 0.11 * acc * level, pan=0.35)

        # Clap 2 et 4, charleston ouvert sur les contretemps
        if full and bar != 21:
            for beat in (1, 3):
                drums.add(t_bar + beat * BEAT, clap(), 0.33, pan=-0.05)
                send.add(t_bar + beat * BEAT, clap(), 0.12)
            for step in (2, 6, 10, 14):
                perc.add(t_bar + step * STEP, open_hat(), 0.1, pan=-0.3)
        if sec == "coulisses":
            for step in (2, 10):
                perc.add(t_bar + step * STEP, open_hat(), 0.07, pan=-0.3)

        # Roulement de clap avant la confiance (mesure 21)
        if bar == 21:
            for step in range(8, 16):
                drums.add(t_bar + step * STEP, clap(), 0.08 + 0.03 * (step - 8), pan=0.1)

        # Djembé
        if sec in ("espaces", "parcours", "confiance") or bar in (26, 27):
            for step, kind in DJEMBE:
                pan = -0.45 if kind == "B" else 0.45
                perc.add(t_bar + step * STEP + swing(step), djembe(kind), 0.38, pan=pan)

        # Log drum (coulisses et confiance)
        if sec in ("coulisses", "confiance"):
            for step, interval in LOG:
                bass_bus.add(t_bar + step * STEP, log_drum(root + 12 + interval), 0.3 if sec == "coulisses" else 0.2)

        # Balafon
        pattern = None
        if sec == "intro":
            pattern = "intro"
        elif sec == "espaces":
            pattern = "a" if bar % 2 == 0 else "b"
        elif sec == "parcours":
            pattern = ("b", "a", "b", "c", "a")[bar - 10]
        elif sec == "confiance":
            pattern = ("c", "a", "c", "b")[bar - 22]
        elif sec == "resume" and bar <= 28:
            pattern = ("b", "a", "fin")[bar - 26]
        if pattern:
            for step, note in BALAFON[pattern]:
                vel = 0.75 if sec == "intro" else (1.0 if step % 4 == 0 else 0.8)
                pan = ((note - 72) / 12) * 0.5
                melody.add(t_bar + step * STEP + swing(step), balafon(note, vel), 0.62, pan=pan)
                send.add(t_bar + step * STEP + swing(step), balafon(note, vel), 0.2)
                if step in (0, 8) and sec != "intro":
                    melody.add(t_bar + step * STEP + 0.004, balafon(note - 12, vel), 0.3, pan=-pan)

        # Cloches du temps réel : un tintement par temps, avec écho pointé
        if sec == "temps_reel":
            arp = [n + 12 for n in notes[1:5]]
            for beat in range(4):
                if bar == 21 and beat >= 2:
                    continue
                note = arp[(bar * 4 + beat) % 4]
                for echo in range(4):
                    g = 0.32 * (0.45 ** echo)
                    pan = (-0.6, 0.6)[echo % 2] if echo else 0.0
                    melody.add(t_bar + beat * BEAT + echo * 0.375, bell(note), g, pan=pan)
                send.add(t_bar + beat * BEAT, bell(note), 0.15)

    # Final : accord tenu, cloche et balafon sur la dernière mesure.
    t_end = 29 * BAR
    melody.add(t_end, balafon(69, 1.0), 0.7)
    melody.add(t_end + 0.01, balafon(57, 0.8), 0.45)
    melody.add(t_end, bell(81), 0.3)
    send.add(t_end, bell(81), 0.25)
    fx.add(t_end, impact(0.55), 0.35)

    # Transitions : souffle culminant pile sur chaque changement de scène.
    for b in boundaries():
        w = whoosh(0.9)
        fx.add(b - 0.9, w, 0.5, pan=-0.2)
        send.add(b - 0.9, w, 0.15)
    for b, size in ((6.0, 0.6), (30.0, 0.8), (44.0, 1.0)):
        fx.add(b, impact(size), 0.42)
    fx.add(42.0, riser(2.0), 0.32)
    send.add(42.0, riser(2.0), 0.1)
    # Lever de rideau : scintillement montant sur l'ouverture.
    fx.add(0.0, shaped_noise(2.0, lambda p: 3000 + 5000 * p, width=0.3) * np.linspace(0, 1, int(2.0 * SR)), 0.18)

    # Compression latérale déclenchée par le kick : la nappe et la basse respirent.
    duck = np.ones(N)
    shape = 1 - 0.55 * np.exp(-np.arange(int(0.3 * SR)) / SR / 0.09)
    for tk in kicks:
        i = int(tk * SR)
        j = min(N, i + len(shape))
        duck[i:j] = np.minimum(duck[i:j], shape[: j - i])
    for bus in (pad, bass_bus):
        bus.l *= duck
        bus.r *= duck

    wet = convolve(send.stereo(), reverb_ir())
    mix = (drums.stereo() * 1.0 + perc.stereo() * 1.0 + bass_bus.stereo() * 1.0
           + pad.stereo() * 1.0 + melody.stereo() * 1.0 + fx.stereo() * 1.0 + wet * 0.3)

    # Coupe à 60 s avec fondu de fin, limitation douce, normalisation.
    mix = mix[:, : int(DURATION * SR)]
    mix = np.stack([band(ch, lo=30, order=3) for ch in mix])   # infra-graves inutiles
    fade = np.ones(mix.shape[1])
    k = int(1.4 * SR)
    fade[-k:] = np.linspace(1, 0, k) ** 1.5
    fade[: int(0.02 * SR)] = np.linspace(0, 1, int(0.02 * SR))
    mix *= fade
    # Gain final mesuré (ffmpeg ebur128) pour viser environ -14 LUFS, la norme des
    # plateformes vidéo : la crête reste ainsi sous -1 dBFS sans écraser le kick.
    mix /= np.abs(mix).max()
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    mix *= 10 ** (MASTER_DB / 20)
    return mix


def write_wav(path, mix):
    data = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


if __name__ == "__main__":
    import sys

    out = sys.argv[1] if len(sys.argv) > 1 else "musique.wav"
    write_wav(out, compose())
    print(f"Musique écrite : {out}")
