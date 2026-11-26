import sys, av, numpy as np
for path in sys.argv[1:]:
    c = av.open(path); a = c.streams.audio[0]
    res = av.AudioResampler(format="flt", layout="mono", rate=22050)
    x = np.concatenate([r.to_ndarray().reshape(-1) for f in c.decode(a) for r in res.resample(f)])
    pk = np.abs(x).max(); i = np.argmax(np.abs(x) > pk * 0.1)
    print(path.split('/')[-1], f"len={len(x)/22050:.2f}s peak={pk:.2f} first_sound={i/22050:.3f}s")
