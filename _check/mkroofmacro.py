# -*- coding: utf-8 -*-
"""屋根の「広い模様」を作る（汚れ・水たまり・補修パッチ）。
   1タイル＝40m・512px（＝約78mm/px）。8mの粒の質感（roof_*_c.jpg）の上に
   3Dの絵の中で重ねるので、**タイルのくり返しが見えなくなる**のが最大のねらい。
   R＝汚れ／G＝水たまり／B＝補修パッチ（0〜255の3枚を1枚のRGBに詰めた）
   出力： textures/roof_macro.jpg
   使い方： python3 _check/mkroofmacro.py
"""
import numpy as np, os
from PIL import Image

N   = 512
OUT = os.path.join(os.path.dirname(__file__), '..', 'textures')

def fnoise(beta, seed, n=N):
    rng = np.random.default_rng(seed)
    F = np.fft.fft2(rng.normal(size=(n, n)))
    fy = np.fft.fftfreq(n)[:, None]; fx = np.fft.fftfreq(n)[None, :]
    r = np.sqrt(fx*fx + fy*fy); r[0, 0] = 1.0
    o = np.real(np.fft.ifft2(F * r**(-beta)))
    return (o - o.mean()) / (o.std() + 1e-9)

def bandXY(lo, hi, seed, sx=1.0, sy=1.0, n=N):
    rng = np.random.default_rng(seed)
    F = np.fft.fft2(rng.normal(size=(n, n)))
    fy = np.fft.fftfreq(n)[:, None]*sy; fx = np.fft.fftfreq(n)[None, :]*sx
    r = np.sqrt(fx*fx + fy*fy); r[0, 0] = 1e-9
    p = 1.0 / r
    F = F * np.exp(-((np.log(p/np.sqrt(lo*hi)))**2) / (2*(np.log(hi/lo)/2.0)**2))
    o = np.real(np.fft.ifft2(F))
    return (o - o.mean()) / (o.std() + 1e-9)

def norm01(a): return (a - a.min()) / (a.max() - a.min() + 1e-9)
def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0 + 1e-9), 0, 1); return t*t*(3 - 2*t)

# ---------- R：汚れ（ほこり・こけ・雨だれ） ----------
# ★ここが一番むずかしい。ある大きさの模様だけが強いと「迷彩」に見える（実際にそうなった）。
#   実物の屋根は「片側だけ汚れている」ような**とても大きなムラ**と、
#   水の流れた**細長い筋**と、こまかい斑（まだら）でできている。3つを重ねる。
big    = norm01(fnoise(3.4, 11))                       # 屋根まるごとの傾き（10m以上）
streak = norm01(bandXY(30, 160, 12, sx=1.0, sy=6.0))   # 水の流れた筋（横長）
fine   = norm01(bandXY(3, 12, 13))                       # こまかい斑（30cm前後）
stain  = norm01(big*0.44 + streak*0.39 + fine*0.17)
stain  = sstep(0.14, 0.98, stain)         # 濃い所でも 0.85 くらいまで（塗ったように見せない）

# ---------- G：水たまり ----------
# 「低いところ」に溜まる＝大きな高さのムラの、いちばん低い数％だけ。
low  = norm01(fnoise(2.8, 21))
edge = np.percentile(low, 22.0)           # 面積のおよそ22%（そのうち3分の1ほどが濃く残る）
pud  = sstep(edge, edge - 0.045, low)     # ふち0.045ぶんでにじませる（水面のふち）
pud *= sstep(0.18, 0.58, norm01(fnoise(2.0, 22)))   # 全部の窪みには溜まらない

# ---------- B：補修パッチ ----------
# 貼り替えた跡。実物は角ばるので、座標を1.25mきざみに丸めてから境目を作る。
q = 16                                    # 16px＝1.25m
def blocky(seed, pct):
    f = fnoise(2.2, seed)
    f = f.reshape(N//q, q, N//q, q).mean(axis=(1, 3))       # 1.25mの升目に均す
    f = np.kron(f, np.ones((q, q)))                          # 元の大きさへ戻す
    return (f < np.percentile(f, pct)).astype(float)
patch = blocky(31, 5.0)
# ふちを1画素だけぼかす（真四角すぎると絵に見える）
patch = (patch + np.roll(patch,1,0) + np.roll(patch,-1,0) + np.roll(patch,1,1) + np.roll(patch,-1,1))/5.0
patch = sstep(0.35, 0.85, patch)

rgb = np.dstack([stain, pud, patch])
os.makedirs(OUT, exist_ok=True)
p = os.path.join(OUT, 'roof_macro.jpg')
Image.fromarray((np.clip(rgb,0,1)*255).astype(np.uint8)).save(p, quality=88, optimize=True)
print('roof_macro.jpg  %.0f KB   汚れ平均 %.2f ／ 水たまり %.1f%% ／ パッチ %.1f%%'
      % (os.path.getsize(p)/1024, stain.mean(), (pud>0.5).mean()*100, (patch>0.5).mean()*100))
# ★継ぎ目の確認（左右・上下の端が、となりどうしと同じくらいなら継ぎ目は出ない）
for i,nm in enumerate(['汚れ','水たまり','パッチ']):
    a = rgb[:,:,i]
    print('   %-5s 端の差 %.4f / となりの差 %.4f'
          % (nm, np.abs(a[:,0]-a[:,-1]).mean(), np.abs(a[:,0]-a[:,1]).mean()))
