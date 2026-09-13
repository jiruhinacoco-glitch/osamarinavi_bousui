# -*- coding: utf-8 -*-
"""版名4点セットをまとめて更新する（CLAUDE.md「公開のたびに必ずやること」）。
   使い方: python3 _check/_tools/bumpver.py 2026-09-13m
   ① ver.txt ② 全11ページの NN_VER ③ sw.js の CACHE 番号+1 ④ index.html の表示"""
import io,re,sys,os
R=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))+'/'
PAGES=['index','kirokucho_demo','zumen_sekisan','genba_map_v36','hacchu','kokkosho',
       'camera','library','shiyo_toroku','yougo','zairyo_toroku']
def rd(p): return io.open(R+p,encoding='utf-8',newline='').read().replace('\r\n','\n')
def wr(p,s): io.open(R+p,'w',encoding='utf-8',newline='').write(s)

def main(ver):
    if not re.match(r'^\d{4}-\d{2}-\d{2}[a-z]+$',ver): sys.exit('版名の形が違う: '+ver)
    wr('ver.txt',ver+'\n')
    for f in PAGES:
        s=rd(f+'.html'); n=len(re.findall(r"const NN_VER='[^']*';",s))
        if n!=1: sys.exit('NG %s の NN_VER が %d 個'%(f,n))
        wr(f+'.html',re.sub(r"const NN_VER='[^']*';","const NN_VER='%s';"%ver,s))
    s=rd('sw.js'); m=re.search(r"const CACHE = 'nn-cache-v(\d+)';",s)
    if not m: sys.exit('NG sw.js の CACHE が見つからない')
    newc=int(m.group(1))+1
    wr('sw.js',s.replace(m.group(0),"const CACHE = 'nn-cache-v%d';"%newc))
    s=rd('index.html'); m=re.search(r'<div id="nnver">[^<]*</div>',s)
    if not m: sys.exit('NG index.html の nnver が見つからない')
    disp='v%s %s'%(ver[:10],ver[10:])
    wr('index.html',s.replace(m.group(0),'<div id="nnver">%s</div>'%disp))
    print('OK ver=%s cache=nn-cache-v%d 表示=%s'%(ver,newc,disp))

if __name__=='__main__': main(sys.argv[1])
