/* §1434 寸法の画面：①形が枠からはみ出さない（表示倍率 1・1.25・1.6 の画面）②拡大縮小・移動ができる
   ・コの字の形の角がぜんぶ枠の中（倍率をかける前の px どうしで比べる）
   ・ホイールで拡大 → 形が大きくなり、マウスの下の点は動かない／つかんで動かす → その分だけ動く／「⊡ 全体」で元に戻る／＋ − のボタン
   ・動かしたあとも、辺の札を押せばその辺が選ばれる（動かす操作で勝手に選ばれない）
   ・スマホ：2本指でつまむと拡大。 直す前の版は★NG。
   使い方: node _check/dimzoom.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const shape=p=>p.evaluate(()=>{ const s=document.getElementById('nnDimSvg'), pg=s.querySelector('polygon'); if(!pg) return null; const pts=pg.getAttribute('points').split(' ').map(q=>q.split(',').map(Number)), xs=pts.map(q=>q[0]), ys=pts.map(q=>q[1]);
  return {w:s.clientWidth,h:s.clientHeight,x0:Math.min(...xs),y0:Math.min(...ys),x1:Math.max(...xs),y1:Math.max(...ys),p0:pts[0]}; });
const open=async(vp,extra)=>{ const p=await (await b.newContext(Object.assign({viewport:vp},extra||{}))).newPage(); p.on('dialog',d=>d.accept()); p._e=[]; p.on('pageerror',e=>p._e.push(e.message.slice(0,120)));
  await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.evaluate(()=>{ try{nnZMenuClose()}catch(_){} state.polys=[]; setTab('zu'); nnDimInOpen(); }); await p.waitForTimeout(400);
  await p.evaluate(()=>document.querySelector('#nnDimIn [data-s="U"]').click()); await p.waitForTimeout(300); return p; };
/* ① はみ出さない */
for(const vp of [[1500,900],[2000,1000],[2560,1300]]){ const p=await open({width:vp[0],height:vp[1]}), s=await shape(p), z=await p.evaluate(()=>window.nnPZ||1);
  ck(s&&s.x0>=0&&s.y0>=0&&s.x1<=s.w&&s.y1<=s.h,'画面 '+vp.join('×')+'（倍率 '+z+'）：形の角がぜんぶ枠の中（形 '+[s.x0,s.y0,s.x1,s.y1].map(Math.round)+'／枠 '+s.w+'×'+s.h+'）'); await p.context().close(); }
/* ② 拡大縮小・移動（倍率1.25の画面で） */
const p=await open({width:2000,height:1000});
const sv=await p.evaluate(()=>{ const r=document.getElementById('nnDimSvg').getBoundingClientRect(), s=document.getElementById('nnDimSvg'); return {l:r.left,t:r.top,kx:r.width/s.clientWidth,ky:r.height/s.clientHeight}; });
const scr=(x,y)=>[sv.l+x*sv.kx, sv.t+y*sv.ky];
const s0=await shape(p);
/* 形のまん中にマウスを置いてホイールを回す（手前へ＝拡大） */
const cx=(s0.x0+s0.x1)/2, cy=(s0.y0+s0.y1)/2; let q=scr(cx,cy); await p.mouse.move(q[0],q[1]); await p.mouse.wheel(0,-400); await p.waitForTimeout(250);
const s1=await shape(p), r1=(s1.x1-s1.x0)/(s0.x1-s0.x0), c1=[(s1.x0+s1.x1)/2,(s1.y0+s1.y1)/2];
/* 手計算：倍率 ＝ e^(400×0.0015) ＝ e^0.6 ＝ 1.822。マウスの下（形のまん中）は動かない */
ck(Math.abs(r1-1.8221)<0.02&&Math.abs(c1[0]-cx)<1.5&&Math.abs(c1[1]-cy)<1.5,'ホイールで拡大：形が 1.82倍・マウスの下の点は動かない（倍率 '+r1.toFixed(3)+'・まん中のずれ '+(c1[0]-cx).toFixed(1)+','+(c1[1]-cy).toFixed(1)+'）');
/* 何も無い所をつかんで 右へ120・下へ50 動かす（枠の左上のすみ） */
q=scr(30,20); await p.mouse.move(q[0],q[1]); await p.mouse.down(); for(let i=1;i<=10;i++){ const t=scr(30+12*i,20+5*i); await p.mouse.move(t[0],t[1]); } await p.mouse.up(); await p.waitForTimeout(250);
const s2=await shape(p);
ck(Math.abs((s2.x0-s1.x0)-120)<2&&Math.abs((s2.y0-s1.y0)-50)<2,'つかんで動かす：形が 右へ120・下へ50 動く（動いた量 '+(s2.x0-s1.x0).toFixed(1)+','+(s2.y0-s1.y0).toFixed(1)+'）');
const curA=await p.evaluate(()=>document.getElementById('nnDimLbl').textContent);
/* 動かしたあと、辺Cの札を押す → 辺C が選ばれる */
const lab=await p.evaluate(()=>{ const g=[...document.querySelectorAll('#nnDimSvg g.dlab')].find(x=>x.dataset.e==='2'); const r=g.querySelector('rect').getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2]; });
await p.mouse.click(lab[0],lab[1]); await p.waitForTimeout(200);
const curC=await p.evaluate(()=>document.getElementById('nnDimLbl').textContent);
ck(/辺A/.test(curA)&&/辺C/.test(curC),'動かしただけでは辺は変わらず（'+curA+'）、札を押すとその辺が選ばれる（'+curC+'）');
await p.evaluate(()=>document.querySelector('#nnDimIn .dzoom [data-z="fit"]').click()); await p.waitForTimeout(200);
const s3=await shape(p); ck(Math.abs(s3.x0-s0.x0)<1&&Math.abs(s3.x1-s0.x1)<1&&Math.abs(s3.y0-s0.y0)<1,'「⊡ 全体」で元の大きさ・場所に戻る');
await p.evaluate(()=>document.querySelector('#nnDimIn .dzoom [data-z="in"]').click()); await p.waitForTimeout(150); const s4=await shape(p);
await p.evaluate(()=>document.querySelector('#nnDimIn .dzoom [data-z="out"]').click()); await p.waitForTimeout(150); const s5=await shape(p);
ck(Math.abs((s4.x1-s4.x0)/(s0.x1-s0.x0)-1.3)<0.01&&Math.abs((s5.x1-s5.x0)-(s0.x1-s0.x0))<1,'＋ で 1.3倍・− で元の大きさ');
console.log('errors',p._e.slice(0,3)); if(p._e.length) NG++; await p.context().close();
/* スマホ：2本指でつまむ（指の間を 100px → 200px に広げる＝2倍） */
const m=await open({width:852,height:393},{isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});
await m.evaluate(()=>{ try{ nnNumpadClose(); }catch(_){} }); const t0=await shape(m);
await m.evaluate(()=>{ const s=document.getElementById('nnDimSvg'), r=s.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
  const ev=(t,id,x,y)=>s.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true,isPrimary:id===1}));
  ev('pointerdown',1,cx-50,cy); ev('pointerdown',2,cx+50,cy); for(let i=1;i<=10;i++){ ev('pointermove',1,cx-50-5*i,cy); ev('pointermove',2,cx+50+5*i,cy); } ev('pointerup',1,cx-100,cy); ev('pointerup',2,cx+100,cy); });
await m.waitForTimeout(300); const t1=await shape(m), rr=(t1.x1-t1.x0)/(t0.x1-t0.x0);
ck(Math.abs(rr-2)<0.05,'スマホ：2本指を2倍に広げると、形が2倍になる（倍率 '+rr.toFixed(3)+'）');
ck(await m.evaluate(()=>{ const z=document.querySelector('#nnDimIn .dzoom'); return !!z&&z.getBoundingClientRect().height>=40; }),'スマホ：＋ − 全体 のボタンが出ている（高さ40px以上）');
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
