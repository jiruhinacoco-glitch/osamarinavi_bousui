/* §1013 スマホのダッシュボード：見積済・契約高・完成工事高・契約〜完成の見出しの字（白い部分）が帯の上下の真ん中か（画素で実測・差1.5px以内）。使い方: node _check/kghmid.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','dash');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo.html'));await p.waitForTimeout(3500);
const hs=await p.evaluate(()=>[...document.querySelectorAll('#dashboard .kgh')].map(h=>{const g=h.closest('.kgrp').getBoundingClientRect(),r=h.getBoundingClientRect();return {x:r.left,y:g.top,w:r.width,h:r.bottom-g.top,hy:r.top-g.top};}));
const cdp=await ctx.newCDPSession(p);const out=[];
for(const h of hs){let buf;for(let i=0;i<4;i++){const sc=await cdp.send('Page.captureScreenshot',{format:'png',clip:{x:h.x,y:h.y,width:h.w,height:h.h,scale:4}});buf=Buffer.from(sc.data,'base64');if(buf.length>2000)break;await p.waitForTimeout(800);}
 require('fs').writeFileSync('/tmp/k/ink.png',buf);require('fs').writeFileSync('/tmp/k/ink'+out.length+'.png',buf);
 const py=require('child_process').execSync(`python3 -c "
from PIL import Image
im=Image.open('/tmp/k/ink.png').convert('RGB');W,H=im.size
# 帯の色＝左端付近の中段。文字＝白っぽい(明るさ>200)
band=[y for y in range(H) if sum(im.getpixel((W//2 if False else 6,y)))<450]
b0,b1=min(band),max(band)
rows=[y for y in range(b0,b1+1) if sum(1 for x in range(int(W*0.1),int(W*0.9)) if min(im.getpixel((x,y)))>215)>2]
print(min(rows)/4,max(rows)/4,min(band)/4,(max(band)+1)/4)
"`).toString().trim().split(' ').map(Number);
 const [t,bm,b0,b1]=py;out.push({inkTop:t,inkBot:bm,bandTop:b0,bandBot:b1,up:+(t-b0).toFixed(2),down:+(b1-bm).toFixed(2)});}
const bad=out.filter(o=>Math.abs(o.up-o.down)>1.5);
console.log(bad.length?'★NG':'○','見積済・契約高・完成工事高・契約〜完成の見出しの文字が帯の上下の真ん中',JSON.stringify(out.map(o=>'上'+o.up+'/下'+o.down)));
await b.close();})();
