import sys
from collections import deque
from PIL import Image, ImageDraw, ImageFont
S=sys.argv[1]; K=4; FONT=S+'/font_dl/noto_all.ttf'   # ★§793 「個別の現場記録へ」と同じ Noto Sans JP Black
BAK=S+'/navbak'
OUT_C=(96,98,97,255)    # ★§821 本人「濃い灰色が濃すぎ・もう少し落ち着かせて」(64,64,64)→(96,98,97)。★§820 文字のふち＝濃い灰色（本人）。前は §803 の普通の緑 (30,128,62)
OUT_D=(62,64,63,255)    # ★§821 (36,36,36)→(62,64,63)。★§820 文字の下の厚み（ふちより少し濃い灰色）。前は (18,92,42)      # 文字のふち・厚み（濃い緑）
# 背景のない絵：あるものは icons の元の絵、無いもの（ホーム・図面）は元のナビの絵から背景を外側から取り除いて切り出す
def cut_art(key):
    im=Image.open(f'{BAK}/nav_{key}.png').convert('RGBA'); W=im.width; H=108
    ref=Image.open(f'{BAK}/nav_home.png').convert('RGBA'); bg=[ref.getpixel((30,min(y,100))) for y in range(H)]
    px=im.load(); seen=[[False]*W for _ in range(H)]; q=deque()
    def isbg(x,y):
        p=px[x,y]; b=bg[y]
        return p[3]<20 or (abs(p[0]-b[0])<=14 and abs(p[1]-b[1])<=14 and abs(p[2]-b[2])<=14)
    for x in range(W):
        for y in (0,H-1): q.append((x,y))
    for y in range(H):
        for x in (0,W-1): q.append((x,y))
    out=im.crop((0,0,W,H)).copy(); op=out.load()
    # ★カードのふち（左右の端・上の端の細い線）は絵ではないので先に消す
    for yy in range(H):
        for xx in list(range(0,8))+list(range(W-8,W)): op[xx,yy]=(0,0,0,0)
    for xx in range(W):
        for yy in list(range(0,3))+list(range(H-4,H)): op[xx,yy]=(0,0,0,0)
    px=op
    while q:
        x,y=q.popleft()
        if x<0 or y<0 or x>=W or y>=H or seen[y][x]: continue
        seen[y][x]=True
        if not isbg(x,y): continue
        op[x,y]=(0,0,0,0)
        q.extend([(x+1,y),(x-1,y),(x,y+1),(x,y-1)])
    return out.crop(out.getbbox())
ART={'home':cut_art('home'),'zumen':cut_art('zumen'),
     'kiroku':Image.open('icons/kiroku_icon.png').convert('RGBA'),
     'map':Image.open('icons/icon_map.png').convert('RGBA'),'hacchu':Image.open('icons/icon_hacchu.png').convert('RGBA'),
     'kokkou':Image.open('icons/icon_kokkou.png').convert('RGBA'),'camera':Image.open('icons/icon_camera.png').convert('RGBA'),
     'library':Image.open('icons/icon_library.png').convert('RGBA'),
     'shiyou':Image.open(f'{BAK}/nav_shiyou.png').convert('RGBA')}   # 仕様・材料は缶も入った今の絵を使う（下で切り出し）
ART['shiyou']=cut_art('shiyou')
import os; os.makedirs(f'{S}/art',exist_ok=True)
for k,a in ART.items(): a.save(f'{S}/art/{k}.png')
ITEMS=[('home','ホーム'),('kiroku','現場記録帳'),('map','現場マップ'),('hacchu','発注'),('kokkou','国交省仕様'),('camera','カメラ'),('library','ライブラリ'),('zumen','図面・積算'),('shiyou','仕様・材料')]
TH=66       # 文字の高さ（そろえる）★§820 本人「気持ち大きく」62→66
def label(txt,W,on=False):
    """★§793 1字ずつ並べて字の間を詰める（-10%）。ふち（厚み→ふち）を全部描いてから中身を全部描く＝詰めても隣のふちが中身を隠さない"""
    sz=64*K; f=ImageFont.truetype(FONT,sz); st=int(4.5*K);   # ★§820 ふちを少し細く 6→4.5
    TR=-0.07*sz
    adv=[f.getlength(c) for c in txt]; total=sum(adv)+TR*(len(txt)-1)
    asc,desc=f.getmetrics(); Wd=int(total+2*st+4*K); Hd=int(asc+desc+2*st+6*K)
    L=Image.new('RGBA',(Wd,Hd),(0,0,0,0)); d=ImageDraw.Draw(L)
    xs=[]; x=st+2*K
    for a in adv: xs.append(x); x+=a+TR
    y=st
    for c,x0 in zip(txt,xs): d.text((x0,y+4*K),c,font=f,fill=OUT_D,stroke_width=st,stroke_fill=OUT_D)    # 下の厚み
    for c,x0 in zip(txt,xs): d.text((x0,y),c,font=f,fill=OUT_C,stroke_width=st,stroke_fill=OUT_C)        # ふち
    FILL=(255,166,48,255) if on else (255,255,255,255)   # ★§799 選択中は明るいオレンジ    # 選択中は落ち着いた黄色
    if on:
        # ★§800 選択中：つやのあるオレンジ（上が明るい→下が濃い。上 4 割に白っぽいつや）
        M=Image.new('L',L.size,0); dm=ImageDraw.Draw(M)
        for c,x0 in zip(txt,xs): dm.text((x0,y),c,font=f,fill=255,stroke_width=int(0.8*K),stroke_fill=255)
        bb=M.getbbox(); G=Image.new('RGBA',L.size,(0,0,0,0)); gd=ImageDraw.Draw(G)
        top,bot=bb[1],bb[3]
        for yy in range(top,bot+1):
            t=(yy-top)/max(1,bot-top)
            c0=(255,247,150); c1=(242,186,0)   # ★§804 黄色のグラデーション（上＝明るいレモン色→下＝山吹色）
            col=tuple(round(c0[i]+(c1[i]-c0[i])*t) for i in range(3))
            gd.line([(0,yy),(L.width,yy)],fill=col+(255,))
        L.paste(G,(0,0),M)
    else:
        # ★§803 白い文字にも自然なつや：上＝白 → 下＝ごく薄い緑がかった白
        M=Image.new('L',L.size,0); dm=ImageDraw.Draw(M)
        for c,x0 in zip(txt,xs): dm.text((x0,y),c,font=f,fill=255,stroke_width=int(0.8*K),stroke_fill=255)
        bb=M.getbbox(); G=Image.new('RGBA',L.size,(0,0,0,0)); gd=ImageDraw.Draw(G); top,bot=bb[1],bb[3]
        for yy in range(top,bot+1):
            t=(yy-top)/max(1,bot-top); c0=(255,255,255); c1=(214,236,220)
            gd.line([(0,yy),(L.width,yy)],fill=tuple(round(c0[i]+(c1[i]-c0[i])*t) for i in range(3))+(255,))
        L.paste(G,(0,0),M)
    L=L.crop(L.getbbox())
    h=TH*K; w=round(L.width*h/L.height); maxw=250*K   # ★§820 横幅の上限＝板が絵の幅の約9割（左右各15）まで。これより広いと、スマホの下帯でとなりの板とくっつく（現場記録帳＋現場マップ）
    if w>maxw: w=maxw
    return L.resize((w,h),Image.LANCZOS)
def make(key,txt,suf):
    W,H=300,168      # ★§792 横に広い入れ物（カードなし・透明）。並びの幅は compact_buttons.js の nnNavWide が元の幅（168の高さに対して223）に打ち消す
    ref=Image.open(f'{BAK}/nav_home{suf}.png').convert('RGBA'); col=[ref.getpixel((30,y)) for y in range(101)]
    C=Image.new('RGBA',(W*K,H*K),(0,0,0,0))
    g=Image.new('RGBA',(W*K,H*K)); gd=ImageDraw.Draw(g)
    for y in range(H*K):
        c=col[min(100,round(y/K*100/(H-1)))]; gd.line([(0,y),(W*K,y)],fill=(c[0],c[1],c[2],255))
    # ★§792 銀色・金色のカード（四角）はなくす＝背景は透明
    # 絵：カードいっぱい（上に寄せ、下は文字の後ろへ回り込む）
    a=ART[key]; bw,bh=(223-6)*K,(H-12)*K; s=min(bw/a.width,bh/a.height); aw,ah=round(a.width*s),round(a.height*s)
    a2=a.resize((aw,ah),Image.LANCZOS); C.alpha_composite(a2,((W*K-aw)//2,3*K+max(0,(bh-ah)//3)))
    # 文字：絵の手前・下に
    L=label(txt,W,suf=='_on')
    # ★§798 文字の後ろに平行四辺形の帯（ホームの「施工中物件」の帯と同じ緑・下にべた塗りの厚み）
    lx=(W*K-L.width)//2; ly=H*K-L.height-2*K; pd=8*K; sk=12*K
    ph=round(L.height*0.86); py0=ly+(L.height-ph)//2+K; py1=py0+ph
    x0=max(0,lx-pd); x1=min(W*K-1,lx+L.width+pd)
    MINW=212*K   # ★§821 本人「カメラ・発注の帯が短すぎて変。文字の少ないものも絵の下が隠れる長さに」→ 板の幅は最低 212（絵の箱の幅 217 とほぼ同じ）。真ん中そろえ
    if x1-x0<MINW: cxm=(x0+x1)//2; x0=cxm-MINW//2; x1=x0+MINW
    C0=C; C=Image.new('RGBA',C0.size,(0,0,0,0))   # ★§805 板と文字は別の層にかいて、あとで少し傾ける（パワプロのメニューの文字のように右上がり）
    dd=ImageDraw.Draw(C)
    dd.polygon([(x0+sk,py0+3*K),(x1,py0+3*K),(x1-sk,py1+3*K),(x0,py1+3*K)],fill=(8,52,24,255))
    g2=Image.new('RGBA',C.size,(0,0,0,0)); gd2=ImageDraw.Draw(g2)
    for yy in range(py0,py1+1):
        t=(yy-py0)/max(1,py1-py0); c0=(132,222,150); c1=(28,124,62)   # ★§821 本人「単色っぽい・グラデーションに」上を明るく下を深く（§820 は (74,186,110)→(40,148,78)）。★§820 本人「濃い緑でなく緑に。フチは濃い緑で」（§818 は濃い緑 (34,122,64)→(14,78,40)）。★§818 本人「文字の後ろの平行四辺形を濃い緑に」（前は §801 の白に近い緑 (236,250,236)→(206,238,210)）
        gd2.line([(0,yy),(W*K,yy)],fill=tuple(round(c0[i]+(c1[i]-c0[i])*t) for i in range(3))+(255,))
    dd.polygon([(x0+sk,py0),(x1,py0),(x1-sk,py1),(x0,py1)],fill=(8,52,24,255))   # ★§799 ふち（濃い緑）
    bw=int(1.5*K)   # ★§802 ふちを細く 3→1.5px
    m2=Image.new('L',C.size,0); ImageDraw.Draw(m2).polygon([(x0+sk+bw,py0+bw),(x1-bw,py0+bw),(x1-sk-bw,py1-bw),(x0+bw,py1-bw)],fill=255)
    C.paste(g2,(0,0),m2)
    C.alpha_composite(L,((W*K-L.width)//2,H*K-L.height-2*K))
    cx,cy=W*K//2, ly+L.height//2
    C=C.rotate(2,resample=Image.BICUBIC,center=(cx,cy))   # 反時計回りに2度＝右上がり（4度は傾けすぎ・本人）
    C0.alpha_composite(C); C=C0
    C=C.resize((W,H),Image.LANCZOS); C.save(f'icons/nav_{key}{suf}.png')
for k,t in ITEMS:
    for s in ('','_on'): make(k,t,s)
print('ok')
