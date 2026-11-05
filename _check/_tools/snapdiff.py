# 見た目の安全網：2つのフォルダの同じ名前の画面写しを1画素ずつ比べる。差がある画面は「差◯画素」と差の場所を赤で塗った絵を出す。
# 使い方: python3 _check/_tools/snapdiff.py <前> <後> [差の絵の保存先]
import sys, os
from PIL import Image, ImageChops
A,B=sys.argv[1],sys.argv[2]; OUT=sys.argv[3] if len(sys.argv)>3 else B+'_diff'; os.makedirs(OUT,exist_ok=True)
bad=0
for f in sorted(os.listdir(A)):
    if not f.endswith('.png'): continue
    pb=os.path.join(B,f)
    if not os.path.exists(pb): print('★無い',f); bad+=1; continue
    a=Image.open(os.path.join(A,f)).convert('RGB'); b=Image.open(pb).convert('RGB')
    if a.size!=b.size: print('★大きさが違う',f,a.size,b.size); bad+=1; continue
    d=ImageChops.difference(a,b).convert('L').point(lambda v:255 if v>8 else 0)
    n=d.histogram()[255]
    if n>30:
        bad+=1; red=Image.new('RGB',a.size,(255,0,0)); m=Image.composite(red,b,d); m.save(os.path.join(OUT,f)); print('★差',n,'画素',f,d.getbbox())
    else: print('○ 同じ' if not n else '○ ほぼ同じ（%d画素・描き方の揺れ）'%n,f)
print('差のある画面',bad)
