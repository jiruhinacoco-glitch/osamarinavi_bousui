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
# ★2026-09-04j 「きく」（nn_ask.js）が、日程・お金・工法まで答えられるように項目を増やした。
#   kb契約日 cb着工日 fb完成日 fy完成予定(文字も) sb締め日 nb入金予定日 sh支払条件 p進捗% nin人工
#   amt請負金額 tan単価 m数量 un単位 ko工法 mk メーカー sz材料 tb備考 y予算[材,労,外,経] a実績
def g(x,k): v=x.get(k); return v if v is not None else ''
out=[{'code':x['id'],'name':x['n'],'st':ST.get(x['st'],x['st']),'stk':x['st'],
      'addr':x.get('ad',''),'moto':x.get('e',''),
      'kb':g(x,'kb'),'cb':g(x,'cb'),'fb':g(x,'fb'),'fy':g(x,'fy'),'sb':g(x,'sb'),'nb':g(x,'nb'),'sh':g(x,'sh'),
      'p':g(x,'p'),'nin':g(x,'nin'),'amt':g(x,'amt'),'tan':g(x,'tan'),'m':g(x,'m'),'un':g(x,'un'),
      'ko':g(x,'ko'),'mk':g(x,'mk'),'sz':g(x,'sz'),'tb':g(x,'tb'),'y':x.get('y') or [],'a':x.get('a') or []} for x in rows]
js=('/* 自動生成ファイル（_check/bukken_sync.py）。手で編集しない。\n'
    '   現場記録帳(RAW)の物件一覧。図面・積算の「保存」で物件を選ぶために使う。\n'
    '   ★記録帳の物件を変えたら python3 _check/bukken_sync.py を流し直すこと */\n'
    'window.NN_BUKKEN='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
open(os.path.join(ROOT,'bukken_list.js'),'w',encoding='utf-8').write(js)
print('書き出し', len(out),'件', collections.Counter(r['st'] for r in out))
