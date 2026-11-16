# Mix for "The Building That Cooked a Car": voice unchanged, music ducked -3 dB under speech (key = words.json),
# standard levels (music +3 dB: bed 10 LU under the voice; SFX -6 dB: 16 LU under the voice), master to -15 LUFS
# with a -1.2 dBTP look-ahead limiter. Writes mix.wav (48 kHz, exact picture length) + stems.
import os, json
import numpy as np
from scipy import ndimage
from dsp import SR, ns, dbg, read_wav, write_wav, integrated, true_peak, fades, st, lra
import score_s, sfx_s

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DUR = 2190 / 30
N = ns(DUR)
TARGET, CEIL = -15.0, -1.2
MUSIC_LU, SFX_LU, DUCK = -10.0, -16.0, -3.0


def limiter(x, ceil_db=CEIL, look=0.003, rel=0.08):
    c = dbg(ceil_db)
    pk = np.max(np.abs(x), axis=0)
    need = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    L = ns(look)
    g = ndimage.minimum_filter1d(need, 2 * L + 1)
    a = np.exp(-1 / (rel * SR))
    out = np.empty_like(g)
    cur = 1.0
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else a * cur + (1 - a) * g[i]
        out[i] = cur
    out = ndimage.uniform_filter1d(out, L + 1)
    return x * np.minimum(out, need)[None, :] , out


def main():
    v, sr = read_wav(os.path.join(ROOT, "voice", "voice.wav"))
    assert sr == SR
    v = st(v[0] if v.shape[0] == 1 else v.mean(axis=0))
    v = np.pad(v, ((0, 0), (0, max(0, N - v.shape[1]))))[:, :N]
    words = json.load(open(os.path.join(ROOT, "voice", "words.json")))
    duck = np.zeros(N)
    for w in words:
        a, b = ns(max(0, w["s"] - 0.08)), ns(min(DUR, w["e"] + 0.12))
        duck[a:b] = 1
    duck = ndimage.uniform_filter1d(ndimage.maximum_filter1d(duck, ns(0.3)), ns(0.25))  # merge short gaps, soft edges
    vI = integrated(v)
    m = score_s.build()
    m *= dbg(DUCK * duck)[None, :]
    m *= dbg(vI + MUSIC_LU - integrated(m))
    s, ev = sfx_s.render()
    s *= dbg(vI + SFX_LU - integrated(s))
    mix0 = v + m + s
    G = TARGET - integrated(mix0)
    for _ in range(6):
        y, g = limiter(mix0 * dbg(G))
        L = integrated(y)
        if abs(L - TARGET) < 0.03:
            break
        G += TARGET - L
    y = fades(y, 0.0, 0.03)
    for name, x in (("mix", y), ("stem_voice", v * dbg(G)), ("stem_music", m * dbg(G)), ("stem_sfx", s * dbg(G))):
        write_wav(os.path.join(HERE, "out", name + ".wav"), x)
    print(json.dumps(dict(voice_in=round(vI, 2), master_gain=round(G, 2), I=round(integrated(y), 2), TP=round(true_peak(y), 2), LRA=round(lra(y), 2),
                          music=round(integrated(m * dbg(G)), 2), sfx=round(integrated(s * dbg(G)), 2), voice=round(integrated(v * dbg(G)), 2),
                          max_gr_db=round(float(-20 * np.log10(g.min())), 2), seconds=round(y.shape[1] / SR, 3))))


if __name__ == "__main__":
    main()
