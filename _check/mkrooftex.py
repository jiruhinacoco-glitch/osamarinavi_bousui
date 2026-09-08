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

# ① 改質アスファルトシート 砂付（新品＝施工後）  ★2026-09-08v 本人の現場写真から作り直し
#    ★★これまで「きもい」見え方だった理由＝**タイルが大きすぎた**。
#      1タイル8m・1024px＝7.8mm/px。ところが本物の砂（着色鉱物粒）は **1〜2mm**。
#      画素より小さいものを1〜2pxで描こうとするので、粒に見えず「もやもやしたノイズ」＝汚れに見える。
#      → **砂付だけ 1タイル＝1.0m（0.98mm/px）** にして、粒がちゃんと粒に写るようにした。
#      1mのくり返しは、中に「粒しか入っていない」かぎり目に見えない（砂浜と同じ）。
#      **6cmより大きい模様をこのタイルに入れないこと。**（入れるとくり返しが見える）
#    ★色は本人の現場写真から：明るい灰＋わずかに緑（平均 150 前後）。以前は暗い灰褐色だった。
TILE_NEW = 1.0
def as_new():
    g  = band(1.6, 3.6, 11)                   # 砂粒（1.6〜3.5mm）★これが主役
    g2 = band(4.5, 9.0, 12)                   # 粒のかたまり（4〜9mm）
    sp = band(1.0, 1.8, 14)                   # もっと細かいざらつき
    mid= band(26, 60, 13)                     # 敷きならしのごく弱いムラ（2.5〜6cm まで）
    t = np.clip(0.5 + 0.30*g + 0.15*g2 + 0.10*sp + 0.05*mid, 0, 1)
    col = mixc(hx('74796f'), hx('b2b6aa'), t)              # 明るい灰＋わずかに緑（現場写真）
    # 粒ごとの色ちがい（本物は白・灰・緑・黒の粒が混ざる）
    col += np.dstack([band(1.6,3.6,21), band(1.6,3.6,22), band(1.6,3.6,23)]) * 7.0
    dark = np.clip(norm01(band(1.6,3.6,24)) - 0.86, 0, 1) * 7.0    # 黒い粒がまばらに
    col *= (1 - 0.30*np.clip(dark,0,1))[:, :, None]
    h = 1.00*g + 0.45*g2 + 0.30*sp            # 凸凹は粒だけ
    r = np.clip(0.90 - 0.04*g + 0.02*g2, 0.80, 0.97)      # 砂付はつや消し
    save('as_new', col, h, 1.7, r)

# ② 露出アスファルト防水（劣化・改修前）  ★2026-09-08v 同じく作り直し（1タイル1.2m）
#    ★本人の現場写真の改修前は「真っ黒」ではない。**砂は残っていて、少しくすんで汚れている**。
#      以前は base が #2b2825→#55504a（ほぼ黒）だったので、別物の気持ち悪い面になっていた。
TILE_AGED = 1.2
def as_aged():
    g  = band(1.6, 3.6, 31)
    g2 = band(4.5, 9.0, 32)
    sp = band(1.0, 1.8, 37)
    mid= band(26, 60, 33)
    t = np.clip(0.5 + 0.28*g + 0.14*g2 + 0.10*sp + 0.06*mid, 0, 1)
    col = mixc(hx('5f635a'), hx('9aa093'), t)             # 新品より一段くすんだ灰緑
    col += np.dstack([band(1.6,3.6,41), band(1.6,3.6,42), band(1.6,3.6,43)]) * 6.0
    loss = np.clip(norm01(band(18, 50, 36)) - 0.80, 0, 1) / 0.20   # 砂が流れて黒く出た所（2〜5cm）
    col *= (1 - 0.34*loss)[:, :, None]
    dark = np.clip(norm01(band(1.6,3.6,44)) - 0.84, 0, 1) * 7.0
    col *= (1 - 0.32*np.clip(dark,0,1))[:, :, None]
    h = 0.85*g + 0.38*g2 + 0.25*sp - 0.4*loss
    r = np.clip(0.90 - 0.04*g - 0.10*loss, 0.55, 0.97)
    save('as_aged', col, h, 1.9, r)

# ③ 塩ビシート防水（機械的固定）
def vinyl():
    n=np.arange(N)
    wx=np.sin(n*(2*np.pi*N/6.0)/N)[None,:]*np.ones((N,1))
    wy=np.sin(n*(2*np.pi*N/6.0)/N)[:,None]*np.ones((1,N))
    weave=(wx+wy)*0.5
    mid = band(14, 40, 41)
    # ★2026-09-05f 新品なので 雨だれの筋（flow）・汚れのたまり（dust）・大きなムラ（soft）は入れない
    t = np.clip(0.5 + 0.12*weave + 0.08*mid, 0, 1)
    col = mixc(hx('6a7375'), hx('939b9d'), t)
    # ★塩ビシートは「平らな樹脂のシート」。凹凸を強くすると砂利のように見える
    h = 0.20*weave + 0.08*mid
    # ★半つや（塗膜ほど光らないが、砂付よりずっと光る）
    r = np.clip(0.33 + 0.03*mid, 0.28, 0.44)
    save('vinyl', col, h, 0.55, r)

# ④ ウレタン塗膜防水（ローラーの肌＝ゆず肌）
#    ★2026-09-02b 本人の写真（青いエポキシ床・ミント色の屋上ウレタン）は**鏡のような光沢**。
#      塗膜は「塗って固めた樹脂」なので、砂付シートとは別物。
#      ・つやの具合（roughness）を 0.36〜0.80 → **0.10〜0.26**（＝空が映り込む）
#      ・ゆず肌の凹凸も浅く（強いと光がにじんで、つやが死ぬ）
#      ・色は実物に多いミントグリーン
def coat():
    peel = band(1.2, 2.8, 51)
    mid  = band(14, 40, 52)
    # ★2026-09-05f 新品なので 雨だれの筋・汚れのたまりは入れない。
    #   ローラーの継ぎ目だけは新品でも出るので残す（塗って重ねた跡）。
    t = np.clip(0.5 + 0.12*peel + 0.06*mid, 0, 1)
    col = mixc(hx('5f9a8c'), hx('96c8ba'), t)             # ミントグリーン
    roll = blob(54, 40, 110, 0.78)            # ローラーの継ぎ目・塗り重ね（30〜85cm）
    col *= (1 - 0.035*roll)[:, :, None]
    h = 0.40*peel + 0.08*mid + 0.12*roll
    r = np.clip(0.12 + 0.035*peel + 0.03*roll, 0.09, 0.19)
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
    print('屋根の質感を作ります（砂付は1タイル1.0〜1.2m＝約1mm/px・他は8m）')
    as_new(); as_aged(); vinyl(); coat(); osae()
    print('→', os.path.normpath(OUT))
