# 現場記録帳の <style> の中で「名前（class・id）がページのどこにも出てこない部品」に向けた決まりを数える（まだ消さない）
import re,sys,collections
P=sys.argv[1]; s=open(P,encoding='utf-8').read()
# CSS とそれ以外を分ける
_scr=[(m.start(),m.end()) for m in re.finditer(r'<script\b[^>]*>.*?</script>',s,re.S)]
def _inscr(i): return any(a<=i<b for a,b in _scr)
styles=[(m.start(1),m.end(1)) for m in re.finditer(r'<style[^>]*>(.*?)</style>',s,re.S) if not _inscr(m.start())]   # ★JS の文字の中の <style> は数えない
other=[]; last=0
for a,b in styles: other.append(s[last:a]); last=b
other.append(s[last:]); other=''.join(other)
# 共通の JS（ページが読むもの）も「使われている」側に入れる
for js in re.findall(r'<script src="\./([^"?]+)',s):
    try: other+=open(js,encoding='utf-8').read()
    except: pass
try: other+=open('common.css',encoding='utf-8').read()
except: pass

def used(tok):
    if tok in other: return True
    # 組み立てて作る名前（'st-'+x など）：- の手前までが出てくれば使っているとみなす
    if '-' in tok and tok.rsplit('-',1)[0]+'-' in other: return True
    return False
dead=[];total=0
for a,b in styles:
    css=s[a:b]
    css=re.sub(r'/\*.*?\*/','',css,flags=re.S)
    for m in re.finditer(r'([^{}@]+)\{([^{}]*)\}',css):
        sel=m.group(1).strip(); total+=1
        parts=[x.strip() for x in sel.split(',') if x.strip()]
        def partdead(x):
            toks=re.findall(r'[.#]([A-Za-z_][\w-]*)',re.sub(r':(not|is|where|has)\([^)]*\)','',x))
            return any(not used(t) for t in toks)
        if parts and all(partdead(x) for x in parts): dead.append(sel)
import json;json.dump(dead,open(sys.argv[2],'w'),ensure_ascii=False);print('候補',len(dead))
