import sys, av, numpy as np

c = av.open(sys.argv[1]); a = c.streams.audio[0]
sr = 22050
res = av.AudioResampler(format="flt", layout="mono", rate=sr)
x = np.concatenate([r.to_ndarray().reshape(-1) for f in c.decode(a) for r in res.resample(f)])

t0, t1 = 20.5, 24.5
hop, win = 110, 512   # ~5ms hop
seg = x[int(t0 * sr):int(t1 * sr)]
n = (len(seg) - win) // hop
fr = np.lib.stride_tricks.as_strided(seg, (n, win), (seg.strides[0] * hop, seg.strides[0]))
sp = np.abs(np.fft.rfft(fr * np.hanning(win), axis=1))
fq = np.fft.rfftfreq(win, 1 / sr)
t = t0 + (np.arange(n) * hop + win / 2) / sr
def band(lo, hi):
    m = (fq >= lo) & (fq < hi); return sp[:, m].sum(1)
low = band(40, 200)        # drum body
high = band(2000, 8000)    # attack / cymbal
rms = np.sqrt((fr ** 2).mean(1))
db = 20 * np.log10(rms + 1e-9)
for i in range(0, n, 4):   # print every ~20ms
    print(f"{t[i]:7.3f} rmsdB={db[i]:6.1f} low={low[i]:7.1f} high={high[i]:7.1f}")
