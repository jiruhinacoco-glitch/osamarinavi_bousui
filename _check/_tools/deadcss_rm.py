# dead.json に挙がった決まり（選び方の文字が完全に一致するもの）だけを、本物の <style> の中から消す
import re,sys,json
P=sys.argv[1]; D=set(json.load(open(sys.argv[2],encoding='utf-8'))); s=open(P,encoding='utf-8').read()
scr=[(m.start(),m.end()) for m in re.finditer(r'<script\b[^>]*>.*?</script>',s,re.S)]
inscr=lambda i:any(a<=i<b for a,b in scr)
spans=[(m.start(1),m.end(1)) for m in re.finditer(r'<style[^>]*>(.*?)</style>',s,re.S) if not inscr(m.start())]
n=0
def rule(m):
    global n
    sel=re.sub(r'/\*.*?\*/','',m.group(1),flags=re.S).strip()
    if sel in D: n+=1; return re.match(r'\s*',m.group(1)).group(0)
    return m.group(0)
out=[];last=0
for a,b in spans:
    out.append(s[last:a]); css=re.sub(r'([^{}@]+)\{([^{}]*)\}',rule,s[a:b]); css=re.sub(r'@media[^{};]*\{\s*\}','',css); out.append(css); last=b
out.append(s[last:]); open(P,'w',encoding='utf-8',newline='\n').write(''.join(out)); print('消した',n)
