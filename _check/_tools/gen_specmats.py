import re,json,unicodedata,sys
S=sys.argv[1]
dec=json.JSONDecoder()
def arr(txt,name):
    i=txt.index('const '+name); i=txt.index('[',i); return dec.raw_decode(txt[i:])[0]
z=open('zumen_sekisan.html',encoding='utf8').read()
codes=re.findall(r"\{code:'([^']+)'", z[z.find('const SPECS=['):z.find('const SPECS=[')+40000])
s=open('shiyo_toroku.html',encoding='utf8').read()
SP=arr(s,'SPECS'); CAT=arr(s,'CATALOG')
Z=arr(open('zairyo_toroku.html',encoding='utf8').read(),'CATALOG')
print('same catalog', [c['i'] for c in CAT]==[c['i'] for c in Z])
N=lambda t: unicodedata.normalize('NFKC',t)
idx=[];seen=set()
for c in CAT:
    if c['n'] not in seen: seen.add(c['n']); idx.append(('item',c['n'],c['i']))
sm={}
for c in CAT: sm.setdefault(c['s'],[]).append(c['i'])
for sn,ids in sm.items():
    if len(ids)>1 and sn not in seen: seen.add(sn); idx.append(('series',sn,ids[0]))
idx.sort(key=lambda e:-len(e[1]))
def match(t):
    if not t or t=='—': return None
    t=N(t); hits=[]
    for e in idx:
        if e[1] in t: hits.append(e); t='＼'.join(t.split(e[1]))
    return [h[2] for h in hits if h[0]=='item']
def usage(x):
    if not x or x=='—': return None
    t=N(x)
    if re.search('同上|合計|総使用量',t) and not re.match(r'^[\d.]',t.strip()): return None
    r=re.search(r'([\d.]+)\s*[〜~-]\s*([\d.]+)',t)
    if r: return round((float(r.group(1))+float(r.group(2)))/2,3)
    m=re.search(r'([\d.]+)',t)
    return float(m.group(1)) if m else None
out={}
for c in codes:
    sp=next((x for x in SP if x['code']==c),None)
    if not sp: continue
    out[c]=[[st['w'], st['p'], usage(st['pu']), match(re.split('または',st['p'])[0])] for st in sp['steps']]
packs={c['i']:[c['n'],c['ou'],c['cv'],c['cu'],c.get('dt','')[:24]] for c in CAT}
js='window.NN_SPEC_STEPS='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\nwindow.NN_MAT_PACKS='+json.dumps(packs,ensure_ascii=False,separators=(',',':'))+';\n'
open(S+'/specmats.js','w').write(js)
print(len(js.encode()))
for c in ['AS-T1','AS-J3','X-2','A-1','S-F1','E-1']:
    print(c, json.dumps(out.get(c),ensure_ascii=False)[:700])
    for st in out.get(c) or []:
        for i in (st[3] or []): print('   ',i,packs[i][:4])
