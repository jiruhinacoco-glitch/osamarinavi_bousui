/* §1443 記録帳から提案書（A4よこ）。図面が無い物件でも出る：全体図＝全体の絵＋屋根の番号／数量＝記録帳の数字／写真＝屋根の番号を付けた写真。
   確かめ方：物件1に屋根を3つ入れる（数字は下の手計算と突き合わせる。当の関数は使わない）
     ①本館屋上 平場320.5＋立上り48.2／②塔屋 平場120＋立上り22.4／③庇 平場18.6 → 総数量 320.5+48.2+120+22.4+18.6 ＝ 529.7㎡
     写真：屋根1に3枚・屋根2に1枚・番号なし1枚（どの屋根の紙にも入らない）
   直す前の版は★NG。使い方: node _check/teiank.js [kirokucho_demo.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'kirokucho_demo.html', SHOT=process.argv[3]||'';
(async()=>{const b=await chromium.launch();
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const ctx=await b.newContext({viewport:{width:1500,height:900}}); const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForFunction(()=>typeof props!=='undefined'&&props.length>0&&typeof nnRoofsOf==='function',null,{timeout:20000});
const has=await p.evaluate(()=>typeof window.nnTeianK==='function');
ck(has,'提案書を出す入口がある（nnTeianK）');
if(!has){ console.log('★NG 1件（この先は確かめられない）'); await b.close(); return; }
const open=async(pid)=>{ const [pop]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(id=>nnTeianK(id),pid)]); pop.on('pageerror',e=>errs.push('紙:'+e.message.slice(0,120)));
  await pop.waitForSelector('.paper',{timeout:20000}); await pop.waitForFunction(()=>[...document.images].every(i=>i.complete),null,{timeout:15000}).catch(()=>{}); await pop.setViewportSize({width:1180,height:830}); return pop; };
const meas=pop=>pop.evaluate(()=>[...document.querySelectorAll('.paper')].map(P=>{ const R=P.getBoundingClientRect(); let out=0;
  P.querySelectorAll('table,.box,.pg,.pc,.pin,.hd,.memo,.ttl').forEach(e=>{ const r=e.getBoundingClientRect(); if(r.width&&(r.left<R.left-1||r.right>R.right+1||r.top<R.top-1||r.bottom>R.bottom+1)) out++; });
  const lf=P.querySelector('.pb'), bx=lf?lf.getBoundingClientRect():null;
  return {tx:P.innerText, pins:[...P.querySelectorAll('.pin')].map(e=>{ const r=e.getBoundingClientRect(), z=e.parentNode.querySelector('img').getBoundingClientRect(); return [e.textContent,(r.left+r.width/2-z.left)/z.width,(r.top+r.height/2-z.top)/z.height]; }),
    ph:P.querySelectorAll('.pc img').length, cells:P.querySelectorAll('.pc').length, out, sc:[P.scrollHeight-P.clientHeight,P.scrollWidth-P.clientWidth], noimg:!!P.querySelector('.noimg'),
    imgIn:lf&&lf.querySelector('img')?(()=>{ const z=lf.querySelector('img').getBoundingClientRect(); return z.width>50&&z.left>=bx.left-1&&z.right<=bx.right+1&&z.top>=bx.top-1&&z.bottom<=bx.bottom+1; })():null}; }));
/* ── A：何も入れていない物件（屋根1つ・全体の絵なし・写真なし） ── */
{ const pop=await open(2); const g=await meas(pop);
  ck(g.length===2,'A 絵も写真も無い物件でも紙が出る（表紙＋屋根1つ＝2枚）（'+g.length+'枚）');
  ck(g[0]&&g[0].noimg&&g[0].sc[0]<=0&&g[0].out===0,'A 全体の絵が無いときは「入れてください」の枠になり、紙からはみ出さない');
  await pop.close(); }
/* ── B：屋根3つ・全体の絵・写真つき ── */
await p.evaluate(()=>{ const c=document.createElement('canvas'); c.width=800; c.height=500; const g=c.getContext('2d'); g.fillStyle='#9fb39a'; g.fillRect(0,0,800,500); g.fillStyle='#d9d4c8'; g.fillRect(120,90,360,240); g.fillRect(500,60,160,140); g.fillRect(300,360,200,70);
  const u=c.toDataURL('image/jpeg',.8), x=props.find(q=>q.id===1), ko=x.kouhou;
  x.areas=[{n:'本館屋上',ko,ex:'露出アスファルト防水',px:.375,py:.42,items:[{k:'平場',q:320.5},{k:'立上り',q:48.2},{k:'ドレン',q:4}]},
           {n:'塔屋',ko,ex:'押えコンクリート',px:.725,py:.26,items:[{k:'平場',q:120},{k:'立上り',q:22.4}]},
           {n:'庇',ko,ex:'',px:.5,py:.79,items:[{k:'平場',q:18.6}]}];
  x.files=[1,1,1,2,0].map((rf,i)=>({cat:'photo',url:u,rf,memo:'写真'+(i+1)}));
  window.nnPhoto2Of=q=>q.id===1?u:null; });
{ const pop=await open(1); const g=await meas(pop);
  ck(g.length===4,'B 屋根3つ → 表紙＋3枚＝4枚（'+g.length+'枚）');
  const t0=g[0].tx.replace(/\s+/g,' ');
  ck(['320.5','48.2','120','22.4','18.6'].every(v=>t0.includes(v)),'B 表紙の一覧に、屋根ごとの平場・立上りの数字が出る（320.5／48.2／120／22.4／18.6）');
  ck(t0.includes('529.7'),'B 総数量＝手計算 529.7㎡');
  ck(['本館屋上','塔屋','庇'].every(v=>t0.includes(v))&&t0.includes('露出アス')&&t0.includes('押さえコン'),'B 表紙に屋根の名前と、屋根ごとの既存防水が出る');
  const P0=g[0].pins, near=(a,b)=>Math.abs(a-b)<0.02;
  ck(P0.length===3&&near(P0[0][1],.375)&&near(P0[0][2],.42)&&near(P0[1][1],.725)&&near(P0[1][2],.26)&&near(P0[2][1],.5)&&near(P0[2][2],.79),'B 表紙の全体の絵に番号が3つ、置いた位置どおり（'+P0.map(q=>q[0]+':'+q[1].toFixed(2)+','+q[2].toFixed(2)).join(' ')+'）');
  ck([1,2,3].every(i=>g[i].pins.length===1&&g[i].pins[0][0]===String(i)),'B 屋根ごとの紙の絵には、その屋根の番号だけ（'+[1,2,3].map(i=>g[i].pins.map(q=>q[0]).join('')).join('／')+'）');
  ck(g[1].ph===3&&g[2].ph===1&&g[3].ph===0&&g[1].cells===8,'B 写真は番号を付けた屋根の紙にだけ入る（屋根1＝3・屋根2＝1・屋根3＝0。番号なしは入らない）（'+[g[1].ph,g[2].ph,g[3].ph].join(',')+'）');
  ck(g[1].tx.includes('320.5')&&g[1].tx.includes('48.2')&&g[1].tx.includes('ドレン')&&g[2].tx.includes('22.4'),'B 屋根ごとの紙に、その屋根の数量（平場・立上り・ドレンのか所）が出る');
  ck(g.every(q=>q.sc[0]<=0&&q.sc[1]<=0&&q.out===0),'B どの紙も A4よこ の中に収まる（はみ出した部品 '+g.map(q=>q.out).join(',')+'／あふれ '+g.map(q=>q.sc[0]).join(',')+'）');
  ck(g.every(q=>q.imgIn===true),'B 全体の絵は枠の中に収まって出る');
  if(SHOT){ const ps=await pop.$$('.paper'); await ps[0].screenshot({path:SHOT+'/teiank_1.png'}); await ps[1].screenshot({path:SHOT+'/teiank_2.png'}); }
  await pop.close(); }
/* ── C：入口のボタン ── */
{ const n=await p.evaluate(()=>{ selectedId=1; renderDetail(); return document.querySelectorAll('[onclick^="nnTeianK("]').length; });
  ck(n>=1,'C 物件の詳細に「提案書」のボタンがある（'+n+'個）'); }
console.log('errors',errs.slice(0,3)); if(errs.length) NG++;
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
