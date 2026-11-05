# 本物の <style>（<script> の中は除く）を取り出し、葉の決まり（@media の中も）の 位置・選び方 を JSON にする。
# 使い方: python3 -I _check/_tools/cssblocks.py kirokucho_demo.html out.json
import re,sys,json
P=sys.argv[1]; s=open(P,encoding='utf-8').read()
scr=[(m.start(),m.end()) for m in re.finditer(r'<script\b[^>]*>.*?</script>',s,re.S)]
inscr=lambda i:any(a<=i<b for a,b in scr)
blocks=[]
def norm(sel): return re.sub(r'::?(before|after|placeholder|selection|first-line|first-letter|marker)\b',r'::\1',re.sub(r'["\'\s]','',sel))
for m in re.finditer(r'<style([^>]*)>(.*?)</style>',s,re.S):
    if inscr(m.start()): continue
    a=m.start(2); css=m.group(2); rules=[]
    i=0; n=len(css); stack=[]; start=0
    # 文字を1つずつ読んで { } の入れ子をたどる（コメント・文字列は飛ばす）
    sel_start=0
    while i<n:
        c=css[i]
        if css.startswith('/*',i):
            j=css.find('*/',i+2); i=(j+2) if j>=0 else n; continue
        if c in '"\'':
            j=i+1
            while j<n and css[j]!=c:
                j+= 2 if css[j]=='\\' else 1
            i=j+1; continue
        if c=='{':
            head=css[sel_start:i]; headc=re.sub(r'/\*.*?\*/','',head,flags=re.S).strip()
            if headc.startswith('@'):
                kind='media' if re.match(r'@(media|supports)',headc) else 'skip'
                if kind=='skip':
                    # @keyframes などは中身ごと飛ばす
                    d=1; j=i+1
                    while j<n and d: 
                        if css[j]=='{': d+=1
                        elif css[j]=='}': d-=1
                        j+=1
                    i=j; sel_start=i; continue
                stack.append(headc); i+=1; sel_start=i; continue
            # 葉の決まり
            j=css.find('}',i)
            if j<0: break
            # 前のコメントを含めず、選び方の最初の文字から
            lead=len(head)-len(head.lstrip())
            hs=sel_start+lead
            # コメントが前にあれば、その後ろから
            mm=list(re.finditer(r'\*/',head))
            if mm: 
                k=mm[-1].end(); hs=sel_start+k+(len(head[k:])-len(head[k:].lstrip()))
            rules.append({'s':a+hs,'e':a+j+1,'sel':headc,'n':norm(headc),'media':list(stack)})
            i=j+1; sel_start=i; continue
        if c=='}':
            if stack: stack.pop()
            i+=1; sel_start=i; continue
        if c==';' and not stack and False: pass
        i+=1
    blocks.append({'text':css,'start':a,'rules':rules})
json.dump(blocks,open(sys.argv[2],'w',encoding='utf-8'),ensure_ascii=False)
print('ブロック',len(blocks),'葉の決まり',sum(len(b['rules']) for b in blocks))
