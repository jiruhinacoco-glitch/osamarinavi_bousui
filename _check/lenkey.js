/* §1433 ②平面図の描画：1点打ったあと、キーボードで数字＋Enter → いま引いている向きに、その長さで打点。スマホは声（向きの言葉＋数字）。
   ①18.5 → 18.5m の水平な線 ②6000（小数点なしで100以上＝mm）→ 6m ③Esc は数字を消すだけ（筆はおかない）④BackSpace ⑤45度の向きでも長さどおり
   ⑥1マス0.5mでも長さどおり ⑦声：「左 18メートル50」「上 6メートル」で長方形が閉じる（18.5×6＝111㎡）⑧スマホで声のボタンが出る
   直す前の版は★NG。使い方: node _check/lenkey.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const p=await (await b.newContext({viewport:{width:1500,height:1000}})).newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500);
const reset=sc=>p.evaluate(sc=>{ try{nnZMenuClose()}catch(_){} state.polys=[]; state.parts=[]; state.underlay=null; state.scaleM=sc; drawPts=[]; cellPx=sc<1?14:28; ox=60; oy=260; setTab('zu'); setTool('draw'); draw(); },sc);
const pos=(x,y)=>p.evaluate(([x,y])=>{ const r=cv.getBoundingClientRect(); return {x:r.left+(ox+x*cellPx)*r.width/(cv.width/devicePixelRatio), y:r.top+(oy+y*cellPx)*r.height/(cv.height/devicePixelRatio)}; },[x,y]);
const click=async(x,y)=>{ const q=await pos(x,y); await p.mouse.move(q.x,q.y); await p.mouse.click(q.x,q.y); await p.waitForTimeout(100); };
const move=async(x,y)=>{ const q=await pos(x,y); await p.mouse.move(q.x,q.y); await p.waitForTimeout(100); };
const pts=()=>p.evaluate(()=>drawPts.map(q=>[+q.x.toFixed(4),+q.y.toFixed(4)]));
await reset(1); await click(3,2); await move(9,2.2);            /* 右へ（少し下がり気味＝水平に補正される） */
await p.keyboard.type('18.5'); await p.waitForTimeout(100);
const b1=await p.evaluate(()=>window.nnLenKeyBuf?nnLenKeyBuf():null), n1=(await pts()).length;
ck(b1==='18.5'&&n1===1,'数字を打っている間は、まだ打点されない（打った数字 '+b1+'・点 '+n1+'）');
await p.keyboard.press('Enter'); await p.waitForTimeout(150); let P=await pts();
ck(P.length===2&&Math.abs(P[1][0]-21.5)<1e-3&&Math.abs(P[1][1]-2)<1e-3,'18.5＋Enter → 始点から右へ 18.5m ちょうどに打点（'+JSON.stringify(P)+'・正しくは [21.5,2]）');
await move(21.3,6); await p.keyboard.type('6000'); await p.keyboard.press('Enter'); await p.waitForTimeout(150); P=await pts();
ck(P.length===3&&Math.abs(P[2][0]-21.5)<1e-3&&Math.abs(P[2][1]-8)<1e-3,'6000（mm）＋Enter → 下へ 6m（'+JSON.stringify(P[2])+'・正しくは [21.5,8]）');
await move(15,8.1); await p.keyboard.type('12'); await p.keyboard.press('Escape'); await p.waitForTimeout(120);
const s3=await p.evaluate(()=>({buf:nnLenKeyBuf(), n:drawPts.length, tool:tool}));
ck(s3.buf===''&&s3.n===3&&s3.tool==='draw','Esc は打った数字を消すだけ（点は3つのまま・描画は続く）（'+JSON.stringify(s3)+'）');
await p.keyboard.type('185'); await p.keyboard.press('Backspace'); await p.keyboard.type('.5');
ck(await p.evaluate(()=>nnLenKeyBuf())==='18.5','BackSpace で1文字消せる（18.5）');
await p.keyboard.press('Enter'); await p.waitForTimeout(150); P=await pts();
ck(P.length===4&&Math.abs(P[3][0]-3)<1e-3&&Math.abs(P[3][1]-8)<1e-3,'左へ 18.5m（'+JSON.stringify(P[3])+'・正しくは [3,8]）');
await move(3.1,4); await p.keyboard.type('6'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
/* 手計算：18.5×6＝111㎡・外周49m */
const r=await p.evaluate(()=>{ const s=state.scaleM, Q=(state.polys[0]||{}).pts||[]; let a=0,l=0; for(let i=0;i<Q.length;i++){ const t=Q[(i+1)%Q.length]; a+=Q[i].x*t.y-t.x*Q[i].y; l+=Math.hypot(t.x-Q[i].x,t.y-Q[i].y); } return {n:state.polys.length, v:Q.length, area:Math.abs(a/2)*s*s, len:l*s, left:drawPts.length}; });
ck(r.n===1&&r.v===4&&Math.abs(r.area-111)<0.01&&Math.abs(r.len-49)<0.01&&r.left===0,'上へ 6m で始点にぴったり戻る → 長方形が閉じる（'+JSON.stringify(r)+'・正しくは 111㎡・外周49m）');
/* 45度・1マス0.5m */
await reset(0.5); await click(4,4); await move(20,20.4); await p.keyboard.type('10'); await p.keyboard.press('Enter'); await p.waitForTimeout(150); P=await pts();
const L=P.length===2?Math.hypot(P[1][0]-P[0][0],P[1][1]-P[0][1])*0.5:0, ang=P.length===2?Math.atan2(P[1][1]-P[0][1],P[1][0]-P[0][0])*180/Math.PI:0;
ck(Math.abs(L-10)<1e-3&&Math.abs(ang-45)<0.01,'1マス0.5m・45度の向きでも、長さは 10m ちょうど（長さ '+L.toFixed(3)+'m・向き '+ang.toFixed(2)+'度）');
/* 声（聞き取った文字を入れる所から） */
await reset(1); await click(3,2);
const v=await p.evaluate(()=>{ const a=nnLenVoiceApply('18.5'), b=nnLenVoiceApply('右 18メートル50'), c=nnLenVoiceApply('下 6メートル'), d=nnLenVoiceApply('左 18.5'), e=nnLenVoiceApply('上 6000ミリ');
  const s=state.scaleM, Q=(state.polys[0]||{}).pts||[]; let ar=0; for(let i=0;i<Q.length;i++){ const t=Q[(i+1)%Q.length]; ar+=Q[i].x*t.y-t.x*Q[i].y; } return {a,b,c,d,e,n:state.polys.length,area:Math.abs(ar/2)*s*s}; });
ck(v.a===0&&v.b===1&&v.c===1&&v.d===1&&v.e===1&&v.n===1&&Math.abs(v.area-111)<0.01,'声：向きが無い「18.5」は打たない／「右 18メートル50」「下 6メートル」「左 18.5」「上 6000ミリ」で長方形 111㎡ が閉じる（'+JSON.stringify(v)+'）');
console.log('errors',errs.slice(0,3)); if(errs.length) NG++;
const q=await (await b.newContext({viewport:{width:852,height:393},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'})).newPage();
await q.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await q.waitForTimeout(1500);
const m=await q.evaluate(()=>{ try{nnZMenuClose()}catch(_){} state.polys=[]; drawPts=[]; setTab('zu'); setTool('draw'); draw(); const e0=document.getElementById('nnLenMic'), v0=!!e0&&getComputedStyle(e0).display!=='none';
  drawPts.push({x:3,y:2}); draw(); const e1=document.getElementById('nnLenMic'); return {v0, v1:!!e1&&getComputedStyle(e1).display!=='none'}; });
ck(m.v0===false&&m.v1===true,'スマホ：1点打つと「🎤 長さを声で」が出る（打つ前は出ない）（'+JSON.stringify(m)+'）');
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
