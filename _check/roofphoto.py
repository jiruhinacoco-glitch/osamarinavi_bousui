# ありきたりな屋上写真ふうの仮画像を6枚作る（実写が用意できるまでの見た目確認用）。
# 空＋パラペット＋防水面（シートの継目）を遠近で描く。1枚320x214のJPEG。
from PIL import Image, ImageDraw, ImageFilter
import math, random

W, H = 640, 428   # 2倍で描いて縮小（縁のギザギザ防止）

def make(idx, sky1, sky2, roof1, roof2, seamdir, extra):
    rnd = random.Random(idx*97+5)
    im = Image.new('RGB', (W, H), (200, 200, 200))
    dr = ImageDraw.Draw(im)
    horizon = int(H*0.34)
    # 空（上→下のグラデ）
    for y in range(horizon):
        t = y/horizon
        c = tuple(int(a+(b-a)*t) for a, b in zip(sky1, sky2))
        dr.line([(0, y), (W, y)], fill=c)
    # 雲
    for k in range(3):
        cx = rnd.randint(0, W); cy = rnd.randint(10, horizon-40); r = rnd.randint(30, 70)
        for dx, dy, rr in [(0,0,r),(r//2,5,int(r*0.7)),(-r//2,8,int(r*0.6))]:
            dr.ellipse([cx+dx-rr, cy+dy-rr//2, cx+dx+rr, cy+dy+rr//2], fill=(255,255,255))
    im = im.filter(ImageFilter.GaussianBlur(1.2))
    dr = ImageDraw.Draw(im)
    # 遠くの建物
    x = 0
    while x < W:
        bw = rnd.randint(40, 90); bh = rnd.randint(15, 60)
        g = rnd.randint(150, 185)
        dr.rectangle([x, horizon-bh, x+bw, horizon], fill=(g, g, g+5))
        x += bw + rnd.randint(2, 10)
    # パラペット（笠木）
    pw = int(H*0.055)
    dr.rectangle([0, horizon, W, horizon+pw], fill=(214, 214, 210))
    dr.rectangle([0, horizon+pw, W, horizon+pw+int(pw*0.85)], fill=(180, 182, 176))
    top = horizon + pw + int(pw*0.85)
    # 防水面（手前ほど明るい）
    for y in range(top, H):
        t = (y-top)/(H-top)
        c = tuple(int(a+(b-a)*t) for a, b in zip(roof1, roof2))
        dr.line([(0, y), (W, y)], fill=c)
    vx = W//2 + rnd.randint(-60, 60)   # 消失点
    if seamdir == 'v':   # 奥へ向かう継目
        for k in range(-4, 6):
            x0 = vx + k*36
            x1 = vx + k*260
            col = tuple(max(0, c-26) for c in roof2)
            dr.line([(x0, top), (x1, H)], fill=col, width=3)
    else:                # 横に走る継目（間隔は手前ほど広い）
        y = top + 8; step = 9
        col = tuple(max(0, c-24) for c in roof2)
        while y < H:
            dr.line([(0, y), (W, y)], fill=col, width=2)
            step = int(step*1.55); y += step
    # 室外機・ドレンなどの小物
    if extra == 'ac':
        bx, by = int(W*0.72), int(H*0.55)
        dr.rectangle([bx, by, bx+110, by+64], fill=(228, 228, 224), outline=(150, 150, 148), width=3)
        dr.ellipse([bx+14, by+10, bx+58, by+54], outline=(150, 150, 148), width=4)
    elif extra == 'drain':
        cx, cy = int(W*0.30), int(H*0.85)
        dr.ellipse([cx-22, cy-11, cx+22, cy+11], fill=(120, 122, 118), outline=(90, 92, 88), width=3)
    elif extra == 'hatch':
        bx, by = int(W*0.15), int(H*0.52)
        dr.polygon([(bx, by+26), (bx+86, by+18), (bx+96, by+52), (bx+6, by+62)], fill=(206, 208, 202), outline=(150, 150, 148))
    # ざらつき
    px = im.load()
    for _ in range(9000):
        x = rnd.randint(0, W-1); y = rnd.randint(top, H-1)
        r, g, b2 = px[x, y]; d = rnd.randint(-9, 9)
        px[x, y] = (max(0, min(255, r+d)), max(0, min(255, g+d)), max(0, min(255, b2+d)))
    im = im.resize((320, 214), Image.LANCZOS)
    out = '/home/user/osamarinavi_bousui/icons/roofph_%d.jpg' % idx
    im.save(out, quality=82)
    return out

SKY = [((150,190,235),(210,228,246)), ((125,170,225),(195,215,240)), ((170,200,235),(225,235,246))]
ROOF = [
  ((132,136,132),(170,174,168)),   # 灰色シート
  ((120,128,124),(158,166,160)),   # 濃いめ
  ((150,150,142),(188,188,178)),   # 明るいシート
  ((118,120,110),(150,152,140)),   # アス系
  ((136,144,150),(172,180,186)),   # 青みがかったシート
  ((146,140,128),(184,176,162)),   # 褐色がかった砂付
]
import os
for i in range(6):
    f = make(i+1, SKY[i % 3][0], SKY[i % 3][1], ROOF[i][0], ROOF[i][1],
             'v' if i % 2 else 'h', ['ac','drain','hatch','ac','drain','hatch'][i])
    print(f, os.path.getsize(f)//1024, 'KB')
