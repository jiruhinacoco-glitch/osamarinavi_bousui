# overcss.js の結果（全部の状態で消せると確かめた決まり）を、cssblocks.py の位置を使って本文から消す
# 使い方: python3 -I _check/_tools/overcss_rm.py kirokucho_demo.html blocks.json over.json
import json,sys,re
P,B,O=sys.argv[1:4]; s=open(P,encoding='utf-8').read(); BL=json.load(open(B,encoding='utf-8')); o=json.load(open(O,encoding='utf-8'))
ids=set(o['cand'])&set(o['proven'])
cuts=[]
for bi,blk in enumerate(BL):
    if s[blk['start']:blk['start']+len(blk['text'])]!=blk['text']: sys.exit('本文がずれている（blocks.json を作り直す）')
    for i,r in enumerate(blk['rules']):
        if f'{bi}:{i}' in ids: cuts.append((r['s'],r['e']))
cuts.sort(reverse=True)
for a,b in cuts: s=s[:a]+s[b:]
# 中身が空になった @media を消す
s2=re.sub(r'@media[^{};<]*\{\s*\}','',s)
open(P,'w',encoding='utf-8',newline='\n').write(s2); print('消した決まり',len(cuts))
