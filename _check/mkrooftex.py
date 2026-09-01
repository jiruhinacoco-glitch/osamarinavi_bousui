# -*- coding: utf-8 -*-
"""屋根（防水層）の質感を作る。1タイル＝8m・1024px（＝約7.8mm/px）。
   ★継ぎ目が出ないこと：ノイズはFFTで作り、法線は np.roll で巻き付けて微分する。
   出力： textures/roof_<種類>_c.jpg（色）／_n.jpg（法線・GL）／_r.jpg（粗さ）
   使い方： python3 _check/mkrooftex.py
"""
import numpy as np, os
from PIL import Image

N     = 1024        # 色の画素（1タイル8m＝約7.8mm/px）
N_NRM = 512         # 法線・粗さは半分でよい（粒のノイズはJPEGで太るため）
OUT = os.path.join(os.path.dirname(__file__), '..', 'textures')

# ---------- 継ぎ目の出ないノイズ（FFT） ----------
def fnoise(beta, seed, n=N):
    """beta が大きいほど大きな模様（1.0＝細かい／2.6＝大きなムラ）"""
    rng = np.random.default_rng(seed)
    F = np.fft.fft2(rng.normal(size=(n, n)))
    fy = np.fft.fftfreq(n)[:, None]; fx = np.fft.fftfreq(n)[None, :]
    r = np.sqrt(fx*fx + fy*fy); r[0, 0] = 1.0
    F = F * r**(-beta)
    o = np.real(np.fft.ifft2(F))
    return (o - o.mean()) / (o.std() + 1e-9)

def band(lo, hi, seed, n=N):
    """lo〜hi 周期（画素）だけを残したノイズ＝粒の大きさを指定できる"""
    rng = np.random.default_rng(seed)
    F = np.fft.fft2(rng.normal(size=(n, n)))
    fy = np.fft.fftfreq(n)[:, None]; fx = np.fft.fftfreq(n)[None, :]
    r = np.sqrt(fx*fx + fy*fy); r[0, 0] = 1e-9
    p = 1.0 / r                                   # 周期（画素）
    F = F * np.exp(-((np.log(p/np.sqrt(lo*hi)))**2) / (2*(np.log(hi/lo)/2.0)**2))
    o = np.real(np.fft.ifft2(F))
    return (o - o.mean()) / (o.std() + 1e-9)

def bandXY(lo, hi, seed, sx=1.0, sy=1.0, n=N):
    """band() の縦横をゆがめた版。sy を大きくすると横に伸びた筋（雨だれ）になる"""
    rng = np.random.default_rng(seed)
    F = np.fft.fft2(rng.normal(size=(n, n)))
    fy = np.fft.fftfreq(n)[:, None]*sy; fx = np.fft.fftfreq(n)[None, :]*sx
    r = np.sqrt(fx*fx + fy*fy); r[0, 0] = 1e-9
    p = 1.0 / r
    F = F * np.exp(-((np.log(p/np.sqrt(lo*hi)))**2) / (2*(np.log(hi/lo)/2.0)**2))
    o = np.real(np.fft.ifft2(F))
    return (o - o.mean()) / (o.std() + 1e-9)

def norm01(a):
    return (a - a.min()) / (a.max() - a.min() + 1e-9)

def hx(s):
    s = s.lstrip('#'); return np.array([int(s[i:i+2], 16) for i in (0, 2, 4)], float)

def mixc(c0, c1, t):
    """t（0〜1・画像）で2色を混ぜる"""
    return c0[None, None, :] * (1-t)[:, :, None] + c1[None, None, :] * t[:, :, None]

# ---------- 法線マップ（高さ→法線・GL式／巻き付けるのでタイルの継ぎ目なし） ----------
def normal_map(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    nz = np.ones_like(h)
    l  = np.sqrt(dx*dx + dy*dy + nz*nz)
    rgb = np.dstack([(-dx/l*0.5+0.5), (dy/l*0.5+0.5), (nz/l*0.5+0.5)])  # GL＝緑が上
    return (np.clip(rgb, 0, 1)*255).astype(np.uint8)

def half(a):
    """1024→512（2×2の平均）。巻き付きは保たれる"""
    return a.reshape(N_NRM, 2, N_NRM, 2).mean(axis=(1, 3))

def save(name, col, hgt, hstr, rough):
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).save(
        os.path.join(OUT, 'roof_%s_c.jpg' % name), quality=86, optimize=True)
    Image.fromarray(normal_map(half(hgt), hstr*2.0)).save(
        os.path.join(OUT, 'roof_%s_n.jpg' % name), quality=88, optimize=True)
    Image.fromarray((np.clip(half(rough), 0, 1)*255).astype(np.uint8)).convert('L').save(
        os.path.join(OUT, 'roof_%s_r.jpg' % name), quality=85, optimize=True)
    tot = sum(os.path.getsize(os.path.join(OUT, 'roof_%s_%s.jpg' % (name, k))) for k in 'cnr')
    print('  %-9s %6.0f KB' % (name, tot/1024))

# ============================================================
# ★★ここが肝：**m単位の模様をこのタイルに焼き込まないこと。**
#   1タイル8mなので、40m×30mの屋根では 5×4 回くり返す。
#   1〜3mの塊（汚れ・水たまり・パッチ）を焼き込むと、そのくり返しが
#   「迷彩がらの水玉」としてはっきり見えてしまう（実際にそうなった）。
#   → m単位のものは 40m の「広い模様」（roof_macro.jpg・_check/mkroofmacro.py）に任せ、
#     ここには **近寄ったときに効く 数mm〜30cm の作り** だけを入れる。
# ============================================================
def blob(seed, lo, hi, th):
    """0.5〜3m くらいの、ふちが自然な塊（汚れ・パッチ・水たまりに使う）"""
    return np.clip(norm01(band(lo, hi, seed)) - th, 0, 1) / max(1e-6, 1.0 - th)

# ① 改質アスファルトシート 砂付（新品〜数年）
def as_new():
    g    = band(1.0, 2.2, 11)                 # 砂粒（近寄ったとき）
    g2   = band(2.5, 6.0, 12)
    mid  = band(14, 40, 13)
    soft = band(60, 180, 15)                  # ゆるい濃淡（30cm〜1.4m・弱く）
    flow = bandXY(40, 140, 16, 1.0, 6.0)      # 水が流れる向きの筋
    t = np.clip(0.5 + 0.34*g + 0.20*g2 + 0.12*mid + 0.08*soft + 0.09*flow, 0, 1)
    col = mixc(hx('56534d'), hx('7c7871'), t)                 # 砂付の灰褐色（緑に寄せない）
    col += np.dstack([band(1,2.2,21), band(1,2.2,22), band(1,2.2,23)]) * 4.0
    dirt = blob(24, 30, 90, 0.82)             # 汚れのたまり（25〜70cm）
    col *= (1 - 0.16*dirt)[:, :, None]
    h = 0.95*g + 0.42*g2 + 0.22*mid + 0.06*soft
    r = np.clip(0.88 - 0.05*g + 0.03*mid - 0.03*dirt, 0.70, 0.98)
    save('as_new', col, h, 2.2, r)

# ② 露出アスファルト防水（劣化・改修前）★見本に近いのはこれ
def as_aged():
    g    = band(1.0, 2.2, 31)
    g2   = band(2.5, 6.0, 32)
    mid  = band(14, 40, 33)
    fade = norm01(band(60, 200, 34))                        # 日焼け・退色（30cm〜1.5m・弱く）
    base = mixc(hx('2b2825'), hx('55504a'), np.clip(0.5 + 0.16*fade, 0, 1))
    base += (0.34*g + 0.20*g2 + 0.12*mid)[:, :, None] * 24.0 # 残っている砂
    flow = bandXY(40, 120, 44, 1.0, 2.6)
    base *= (1 + 0.05*flow)[:, :, None]                     # 流れる向きの濃淡（ごく弱く）
    streak = np.clip(norm01(bandXY(30, 90, 35, 1.0, 3.2)) - 0.70, 0, 1)*2.2    # 雨だれ（細く短く）
    base *= (1 - 0.16*streak)[:, :, None]
    loss  = blob(36, 26, 70, 0.80)            # 砂が流れて黒く出た所（20〜55cm）
    base *= (1 - 0.24*loss)[:, :, None]
    h = 0.85*g + 0.35*g2 + 0.20*mid - 0.5*loss
    r = np.clip(0.88 + 0.05*fade - 0.12*loss - 0.06*streak, 0.30, 0.99)
    save('as_aged', base, h, 2.6, r)

# ③ 塩ビシート防水（機械的固定）
def vinyl():
    n=np.arange(N)
    wx=np.sin(n*(2*np.pi*N/6.0)/N)[None,:]*np.ones((N,1))
    wy=np.sin(n*(2*np.pi*N/6.0)/N)[:,None]*np.ones((1,N))
    weave=(wx+wy)*0.5
    mid = band(14, 40, 41); soft = band(60, 180, 45); flow = bandXY(40, 140, 46, 1.0, 6.0)
    t = np.clip(0.5 + 0.12*weave + 0.14*mid + 0.08*soft + 0.09*flow, 0, 1)
    col = mixc(hx('6a7375'), hx('939b9d'), t)
    dust = blob(43, 30, 95, 0.74)
    col *= (1 - 0.10*dust)[:, :, None]
    # ★塩ビシートは「平らな樹脂のシート」。凹凸を強くすると砂利のように見える
    h = 0.20*weave + 0.10*mid + 0.08*soft
    # ★半つや（塗膜ほど光らないが、砂付よりずっと光る）
    r = np.clip(0.33 + 0.12*dust, 0.26, 0.56)
    save('vinyl', col, h, 0.55, r)

# ④ ウレタン塗膜防水（ローラーの肌＝ゆず肌）
#    ★2026-09-02b 本人の写真（青いエポキシ床・ミント色の屋上ウレタン）は**鏡のような光沢**。
#      塗膜は「塗って固めた樹脂」なので、砂付シートとは別物。
#      ・つやの具合（roughness）を 0.36〜0.80 → **0.10〜0.26**（＝空が映り込む）
#      ・ゆず肌の凹凸も浅く（強いと光がにじんで、つやが死ぬ）
#      ・色は実物に多いミントグリーン
def coat():
    peel = band(1.2, 2.8, 51)
    mid  = band(14, 40, 52); soft = band(60, 180, 56); flow = bandXY(40, 140, 57, 1.0, 6.0)
    t = np.clip(0.5 + 0.12*peel + 0.07*mid + 0.07*soft + 0.08*flow, 0, 1)
    col = mixc(hx('5f9a8c'), hx('96c8ba'), t)             # ミントグリーン
    roll = blob(54, 40, 110, 0.78)            # ローラーの継ぎ目・塗り重ね（30〜85cm）
    col *= (1 - 0.055*roll)[:, :, None]
    dust = blob(55, 34, 100, 0.74)
    col *= (1 - 0.06*dust)[:, :, None]
    h = 0.40*peel + 0.10*mid + 0.08*soft + 0.14*roll
    r = np.clip(0.12 + 0.035*peel + 0.08*dust + 0.04*roll, 0.08, 0.21)
    save('coat', col, h, 0.30, r)

# ⑤ 押えコンクリート（保護コンクリート仕上げ）
def osae():
    agg = band(1.4, 3.5, 61)
    mid = band(14, 40, 62); soft = band(60, 180, 66); flow = bandXY(40, 140, 67, 1.0, 6.0)
    t = np.clip(0.5 + 0.30*agg + 0.14*mid + 0.08*soft + 0.08*flow, 0, 1)
    col = mixc(hx('6b6f68'), hx('989c93'), t)
    stain = blob(64, 34, 110, 0.72)
    col *= (1 - 0.14*stain)[:, :, None]
    crack = blob(65, 26, 60, 0.90)            # ひび・目地の汚れ
    col *= (1 - 0.32*crack)[:, :, None]
    h = 0.60*agg + 0.20*mid + 0.15*soft - 0.9*crack
    r = np.clip(0.86 - 0.05*agg + 0.06*mid - 0.08*stain, 0.60, 0.98)
    save('osae', col, h, 2.0, r)

if __name__ == '__main__':
    print('屋根の質感を作ります（1タイル8m・%dpx＝約7.8mm/px）' % N)
    as_new(); as_aged(); vinyl(); coat(); osae()
    print('→', os.path.normpath(OUT))
