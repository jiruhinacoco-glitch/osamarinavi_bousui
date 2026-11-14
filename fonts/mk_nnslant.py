# Zen Kaku Gothic New（太さは元のファイルで決まる）を angle 度だけ右に傾けた書体を作る
# 使い方: python3 fonts/mk_nnslant.py 4 fonts/nnslant-medium.woff2 ZenKakuGothicNew-Medium.ttf   （作り方は fonts/README.md）
import sys, math
from fontTools.ttLib import TTFont
from fontTools import subset
ANG=float(sys.argv[1]); OUT=sys.argv[2]; T=math.tan(math.radians(ANG)); Y0=380
f=TTFont(sys.argv[3] if len(sys.argv)>3 else 'ZK-Black.ttf'); cmap=f.getBestCmap()
# 残す字：英数字・記号・かな・全角・JIS第1・第2水準の漢字・よく使う記号
keep=set(range(0x20,0x7f))|set(range(0xa0,0x100))|set(range(0x2000,0x2070))|set(range(0x2100,0x2200))|set(range(0x2190,0x2200))|set(range(0x2460,0x2500))|set(range(0x25a0,0x2670))|set(range(0x2700,0x27c0))|set(range(0x3000,0x3100))|set(range(0x3200,0x3400))|set(range(0xff00,0xfff0))
for r in range(0x21,0x75):
    for c in range(0x21,0x7f):
        try: keep.add(ord(bytes([r|0x80,c|0x80]).decode('euc_jp')))
        except Exception: pass
keep|={ord(ch) for ch in '髙﨑濵德栁瀨塚增寬敎晴朗隆﨤㎡㎜㎝㎏㏄№℡㈱㈲㈹〒々〆ヶ'}
uni=sorted(u for u in keep if u in cmap)
opt=subset.Options(); opt.layout_features=[]; opt.hinting=False; opt.name_IDs=[1,2,3,4,6]; opt.notdef_outline=True; opt.glyph_names=False
s=subset.Subsetter(opt); s.populate(unicodes=uni); s.subset(f)
glyf=f['glyf']; hmtx=f['hmtx']
for n in f.getGlyphOrder():
    g=glyf[n]
    if g.isComposite():
        for c in g.components: c.x=int(round(c.x+c.y*T))
    elif g.numberOfContours>0:
        co=g.coordinates
        for i,(x,y) in enumerate(co): co[i]=(int(round(x+(y-Y0)*T)),y)   # 字の真ん中の高さ（Y0）を中心に傾ける＝字が右へ寄らない
for n in f.getGlyphOrder():
    g=glyf[n]; g.recalcBounds(glyf)
    adv,_=hmtx[n]; hmtx[n]=(adv, getattr(g,'xMin',0) if g.numberOfContours else 0)
f['post'].italicAngle=-ANG; f['head'].macStyle|=2; f['OS/2'].fsSelection=(f['OS/2'].fsSelection|1)&~64
for rec in f['name'].names:
    if rec.nameID in (1,4,6): rec.string=('NN Slant' if rec.nameID!=6 else 'NNSlant')
    elif rec.nameID==3: rec.string='NNSlant-%gdeg'%ANG
    elif rec.nameID==2: rec.string='Italic'
for t in ('DSIG','fpgm','prep','cvt ','gasp'):
    if t in f: del f[t]
f.flavor='woff2'; f.save(OUT)
print('字の数',len(uni),'形の数',len(f.getGlyphOrder()))
