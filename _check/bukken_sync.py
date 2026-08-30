# 現場記録帳(RAW)の物件一覧を、他のページから使えるファイルに書き出す（2026-08-31a）
# 使い方: python3 _check/bukken_sync.py  → bukken_list.js を書き出す
# ★記録帳の物件（RAW）を変えたら、これを流し直すこと（mapsync.py・hacchu_sync.py と同じ決まり）
#   図面・積算の「保存」で物件を選ぶプルダウンが、これを読む。
import json, os, collections
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s=open(os.path.join(ROOT,'kirokucho_demo.html'),encoding='utf-8').read()
i=s.index('const RAW=')
arr,_=json.JSONDecoder().raw_decode(s[i+len('const RAW='):])
ST={'kan':'完成済','kou':'施工中','keiyaku':'契約済','mit':'見積済','chosa':'見積済(調査済)','hikiai':'引合いあり'}
ORDER={'kou':0,'keiyaku':1,'mit':2,'chosa':3,'hikiai':4,'kan':5}
rows=sorted(arr, key=lambda x:(ORDER.get(x['st'],9), x['id']))
out=[{'code':x['id'],'name':x['n'],'st':ST.get(x['st'],x['st']),
      'addr':x.get('ad',''),'moto':x.get('e','')} for x in rows]
js=('/* 自動生成ファイル（_check/bukken_sync.py）。手で編集しない。\n'
    '   現場記録帳(RAW)の物件一覧。図面・積算の「保存」で物件を選ぶために使う。\n'
    '   ★記録帳の物件を変えたら python3 _check/bukken_sync.py を流し直すこと */\n'
    'window.NN_BUKKEN='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
open(os.path.join(ROOT,'bukken_list.js'),'w',encoding='utf-8').write(js)
print('書き出し', len(out),'件', collections.Counter(r['st'] for r in out))
