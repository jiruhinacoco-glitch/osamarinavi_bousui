# -*- coding: utf-8 -*-
"""パネルの四隅に置く角の絵を作る。
   ★2026-08-11u 腕を短く（画面46px→28px）。帯の太さは6pxのまま。
   色は佐野さんの元絵から採る。"""
from PIL import Image, ImageDraw
import numpy as np, os
SRC='/home/user/osamarinavi_bousui/icons/frame_panel_src_corner.png'
D='/home/user/osamarinavi_bousui/icons/'
CS   = 28.0                 # 画面に置く大きさ（腕の長さ）px
BAND = 6.0                  # 画面での帯の太さ px
a=np.array(Image.open(SRC).convert('RGBA')); op=a[...,3]>60
xs=np.where(op.any(0))[0]; ys=np.where(op.any(1))[0]
col=a[ys[0]:ys[0]+140, xs[0]+200]
EDGE=tuple(int(v) for v in col[2][:3]); INNER=tuple(int(v) for v in col[len(col)//3][:3])

S   = 300
T   = round(S*BAND/CS)          # 帯
WO  = max(4, round(T*0.16))     # フチ
R   = round(T*1.55)             # 外側の丸み（帯の1.55倍）
BIG = S*3
def rr(inset, radius):
    m=Image.new('L',(BIG,BIG),0)
    ImageDraw.Draw(m).rounded_rectangle([inset,inset,BIG-1,BIG-1],
        radius=max(0,radius), fill=255, corners=(True,False,False,False))
    return np.array(m)>127
band = rr(0,R) & ~rr(T,R-T)
core = rr(WO,R-WO) & ~rr(T-WO,R-T+WO)
img=np.zeros((BIG,BIG,4),np.uint8)
img[band]=(*EDGE,255); img[band&core]=(*INNER,255)
# ★2026-08-11w 腕の先端を線で閉じる（ふさぎ）。
#   閉じないと切り口の中身の色がむき出しになり、切りっぱなしに見える。
cap=np.zeros_like(band); cap[:, S-WO:S]=True; cap[S-WO:S, :]=True
img[band & cap]=(*EDGE,255)
tl=Image.fromarray(img).crop((0,0,S,S))
for k,v in {'tl':tl,'tr':tl.transpose(Image.FLIP_LEFT_RIGHT),
            'bl':tl.transpose(Image.FLIP_TOP_BOTTOM),
            'br':tl.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.FLIP_TOP_BOTTOM)}.items():
    v.save(D+'frame_c_%s.png'%k, optimize=True)
print('フチ #%02x%02x%02x ／ 中身 #%02x%02x%02x'%(*EDGE,*INNER))
print('角の1辺 %d（画面 %gpx）／帯 %d（画面 %.1fpx）／フチ %d（%.1fpx）／丸み %d（%.1fpx）'
      %(S,CS,T,T*CS/S,WO,WO*CS/S,R,R*CS/S))
print('→ CSS：--cs:%gpx ／ border-radius:%.0fpx'%(CS, R*CS/S))
