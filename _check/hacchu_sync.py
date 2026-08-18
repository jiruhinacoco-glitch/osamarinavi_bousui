# 発注ページの現場一覧を、現場記録帳(RAW)から自動生成する（§②・2026-08-18a）
# 使い方: python3 _check/hacchu_sync.py  → hacchu_sites.js を書き出す
# ★記録帳の物件（RAW）を変えたら、これを流し直すこと（mapsync.py と同じ決まり）
import json, re, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s=open(os.path.join(ROOT,'kirokucho_demo.html'),encoding='utf-8').read()
i=s.index('const RAW=')
arr,_=json.JSONDecoder().raw_decode(s[i+len('const RAW='):])

ST={'kou':'施工中','keiyaku':'契約済','mit':'見積済','chosa':'見積済'}
ORDER={'kou':0,'keiyaku':1,'mit':2,'chosa':3}
rows=[x for x in arr if x['st'] in ST]
rows.sort(key=lambda x:(ORDER[x['st']], -x['m']))

def spof(ko):
    m=re.search(r'\(([A-Z0-9-]+)\)', ko)
    return m.group(1) if m else ''

out=[]
for x in rows:
    out.append({'code':x['id'],'name':x['n'],'st':ST[x['st']],'addr':x['ad'],'moto':x['e'],
                'ko':re.sub(r'\([^)]*\)','',x['ko']).strip(),'sp':spof(x['ko']),
                'm':x['m'],'un':x['un']})
js=('/* 自動生成ファイル（_check/hacchu_sync.py）。手で編集しない。\n'
    '   現場記録帳(RAW)のうち発注に関わる現場（施工中・契約済・見積済/調査済）。\n'
    '   ★記録帳の物件を変えたら python3 _check/hacchu_sync.py を流し直すこと */\n'
    'window.NN_HACCHU_SITES='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
open(os.path.join(ROOT,'hacchu_sites.js'),'w',encoding='utf-8').write(js)
import collections
print('書き出し', len(out),'件', collections.Counter(r['st'] for r in out))
