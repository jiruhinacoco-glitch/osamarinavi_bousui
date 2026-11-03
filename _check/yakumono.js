/* §1016 スマホ一覧：屋根の欄の役物（役◯か所・合計㎡は総数量へ・役物の工法の札）／屋根7つ以上は仕様×メーカーでまとめる（屋根30→2欄）。使い方: node _check/yakumono.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html',OUT=process.argv[3];
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();p.on('pageerror',e=>console.log('pe',e.message));await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(2500);
const info=await p.evaluate(()=>{const K=Object.keys(KO_MASTER);const nen=K.find(k=>/常温粘着|粘着/.test(k))||K[1];const tom=K.find(k=>/塗膜/.test(k)&&/アス|ゴム/.test(k))||K.find(k=>/塗膜/.test(k))||K[5];const ure=K.find(k=>/ウレタン/.test(k))||K[2];
 const base=()=>JSON.parse(JSON.stringify(props[0]));
 const R=(ko,q,yk)=>({ko,mk:'',items:[{k:'平場',q},{k:'立上り',q:Math.round(q*0.1)}].concat(yk?[{k:'役物周り',q:yk[0],a:yk[1],ko:tom}]:[])});
 const mk=(id,name,roofs)=>{const a=base();a.id=id;a.name=name;a.areas=roofs;return a;};
 const L=[mk(94001,'屋根1つ 平場は常温粘着・役物50か所は塗膜アス',[R(nen,800,[50,38.5])]),
  mk(94002,'屋根2つ 役物つき',[R(nen,800,[50,38.5]),R(ure,400,[12,6])]),
  mk(94003,'屋根3つ 役物つき',[R(nen,800,[50,38.5]),R(ure,400,null),R(nen,300,[8,4.2])])];
 const R30=[];for(let i=0;i<30;i++)R30.push(R(i<18?nen:(i<27?ure:tom),100+i*10,i%3==0?[5,3]:null));
 L.push(mk(94004,'屋根30の現場（仕様ごとにまとめ）',R30));
 L.reverse().forEach(x=>props.unshift(x));selectedId=-1;render();showView('list');return {nen,tom,ure};});
console.log(JSON.stringify(info));await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{const cs=[...document.querySelectorAll('#list .pcard')].slice(0,4);nnTtlFitSp(cs);return cs.map(c=>{const bad=[];c.querySelectorAll('.sprfv,.sprfy,.sprft .badge,.sprfyt .badge,.sprfm .sptag,.sprfym .sptag').forEach(e=>{if(e.offsetParent&&e.scrollWidth>e.clientWidth+1)bad.push(e.className+'「'+e.textContent+'」');});
 return (c.className.match(/rf[mcg]\w*/g)||[]).join(',')+' 欄'+c.querySelectorAll('.sproofs .sprf').length+' 役'+c.querySelectorAll('.sprf.hy').length+' 総'+(c.querySelector('.sptot b')||{}).textContent+' 屋根数'+(c.querySelector(':scope > .sproof .sprv')||{}).textContent+' 切れ:'+bad.join(' ');});});
const ok=r.length===4&&/rfc1 欄1 役1 総918.5/.test(r[0])&&/rfc2 欄2 役2/.test(r[1])&&/rfc3 欄3 役2/.test(r[2])&&/rfgrp.*欄2 役2 .*屋根数30/.test(r[3])&&r.slice(1).every(x=>/切れ:$/.test(x));console.log(r.join('\n'));console.log(ok?'○':'★NG','屋根の欄の役物（数・合計㎡・仕様）と、屋根30の仕様ごとのまとめ');
if(OUT){const cdp=await ctx.newCDPSession(p);for(let i=0;i<4;i++){const sc=await cdp.send('Page.captureScreenshot',{format:'png',clip:{x:0,y:145,width:393,height:707,scale:2}});const buf=Buffer.from(sc.data,'base64');require('fs').writeFileSync(OUT,buf);if(buf.length>150000)break;await p.waitForTimeout(1500);}}
await b.close();})();
