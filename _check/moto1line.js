/* §1019 スマホ一覧（屋根の並び）：元請「北王リビングサービス」が1行・区分/区分2を右に詰める（各60px）・札が切れない・元請の見出しの線が請負単価とそろう。使い方: node _check/moto1line.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html',OUT=process.argv[3];
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3000);
await p.evaluate(()=>{const a=JSON.parse(JSON.stringify(props[0]));a.id=95001;a.moto='北王リビングサービス';a.kbn='材のみ';props.unshift(a);selectedId=-1;render();showView('list');});await p.waitForTimeout(1200);
const r=await p.evaluate(()=>{const cs=[...document.querySelectorAll('#list .pcard')].slice(0,4);nnTtlFitSp(cs);const R=e=>e.getBoundingClientRect();return cs.filter(c=>c.classList.contains('rfm')).map(c=>{const m=c.querySelector('.prow.r1 > .ebox[data-f="moto"]');
 const rg=document.createRange();const tn=[...m.childNodes].find(n=>n.nodeType===3&&n.nodeValue.trim());let lines=0,txt='';if(tn){rg.selectNodeContents(tn);lines=new Set([...rg.getClientRects()].map(x=>Math.round(x.top))).size;txt=tn.nodeValue.trim();}
 const k1=c.querySelector('.spc1'),k2=c.querySelector('.spc2'),t1=k1.querySelector('.sptag'),t2=k2.querySelector('.sptag');const lab=m.querySelector('i'),tl=c.querySelector(':scope > .sptan > i');
 return {txt,lines,fs:getComputedStyle(m).fontSize,moto:Math.round(R(m).width),gap1:Math.round(R(k1).left-R(m).right),gap2:Math.round(R(k2).left-R(k1).right),right:Math.round(R(c).right-R(k2).right),
  tagFit:R(t1).right<=R(k1).right+0.5&&R(t2).right<=R(k2).right+0.5&&R(t1).left>=R(k1.querySelector('i')).right-0.5&&R(t2).left>=R(k2.querySelector('i')).right-0.5,lblEdge:Math.round(R(lab).right-R(tl).right),tag1:t1.firstChild&&t1.firstChild.nodeValue};});});
const ok=r.length&&r.every(o=>(o.txt!=='北王リビングサービス'||o.lines===1)&&o.gap1>=-1&&o.gap1<=1&&o.gap2>=-1&&o.gap2<=1&&o.tagFit&&Math.abs(o.lblEdge)<=1&&o.right<=3);
console.log(ok?'○':'★NG','元請「北王リビングサービス」が1行・区分/区分2を右に詰める・札が切れない・見出しの線がそろう',JSON.stringify(r));
if(OUT){const cdp=await ctx.newCDPSession(p);let buf;for(let i=0;i<4;i++){const sc=await cdp.send('Page.captureScreenshot',{format:'png',clip:{x:0,y:140,width:393,height:330,scale:2}});buf=Buffer.from(sc.data,'base64');if(buf.length>100000)break;await p.waitForTimeout(1200);}require('fs').writeFileSync(OUT,buf);}
await b.close();})();
