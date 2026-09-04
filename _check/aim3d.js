/* ★2026-08-23d スマホの3D編集：赤い照準・2本指パン・二重打点なし（§156）
   node _check/aim3d.js
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
const SCR=`(wx,wy,wz)=>{
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const q=new THREE.Vector3(wx,wy,wz).project(T.camera);
  return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height};
}`;
/* 合成タッチ（pointerType:'touch'）。setPointerCapture は try 済みなので合成IDでも落ちない */
const TOUCH=`(type,id,x,y)=>{
  const el=T.renderer.domElement;
  el.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',
    clientX:x,clientY:y,bubbles:true,cancelable:true,isPrimary:id===11}));
}`;

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:393,height:852}, deviceScaleFactor:2, isMobile:true, hasTouch:true});
const p=await ctx.newPage();
await p.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>393});
  Object.defineProperty(screen,'height',{get:()=>852}); });
p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1400); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
ok(await p.evaluate(()=>document.documentElement.getAttribute('data-nnphone')==='1'),'スマホ扱いになっている');
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();});
await p.waitForTimeout(700);
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4500);
/* ★下部ナビは5秒さわらないと自動で隠れ、そのぶん3Dの画面が縦に伸びる。
   伸びる瞬間をまたいで測ると「打点がずれた」と誤判定するので、
   隠れきるのを条件で待ってから測り始める（時間で待たない・§161）。 */
await p.waitForFunction(()=>{const n=document.getElementById('nav');
  return !n || /translateY/.test(n.style.transform||'');},{timeout:12000}).catch(()=>{});
await p.waitForTimeout(600);
await p.evaluate(()=>d3ViewIso()); await p.waitForTimeout(900);

/* ① 描画ツール：指を置くと赤い照準が右上（+36,-52）に出る */
await p.evaluate(()=>setTool('draw')); await p.waitForTimeout(300);
const s1=await p.evaluate(`(${SCR})(2.0, 0.35, 2.0)`);         /* 狙う交点の画面位置 */
const f1={x:s1.x-36, y:s1.y+52};                                /* 指はその左下（照準が狙いに乗る） */
await p.evaluate(`(${TOUCH})('pointerdown',11,${f1.x},${f1.y})`); await p.waitForTimeout(250);
const aim1=await p.evaluate(()=>{const d=document.getElementById('nnD3Aim');
  if(!d||d.style.display!=='block')return null;
  const w=document.getElementById('three-wrap').getBoundingClientRect();
  return {x:Math.round(parseFloat(d.style.left)+w.left), y:Math.round(parseFloat(d.style.top)+w.top)};});
ok(!!aim1,'指を置くと赤い照準が出る');
ok(aim1 && Math.abs(aim1.x-(f1.x+36))<=2 && Math.abs(aim1.y-(f1.y-52))<=2,
   '照準は指の右上（+36,-52）',aim1);

/* ② 照準を動かしてもカメラは1mmも動かない（凍結） */
const cam1=await p.evaluate(()=>[T.tx,T.tz,T.r,T.theta,T.phi].map(v=>+v.toFixed(5)));
for(let i=1;i<=6;i++){
  await p.evaluate(`(${TOUCH})('pointermove',11,${f1.x+i*9},${f1.y-i*7})`);
  await p.waitForTimeout(40);
}
const cam2=await p.evaluate(()=>[T.tx,T.tz,T.r,T.theta,T.phi].map(v=>+v.toFixed(5)));
ok(JSON.stringify(cam1)===JSON.stringify(cam2),'照準中はカメラが動かない',{mae:cam1,ato:cam2});
/* 指を狙いへ戻して離す＝照準の位置に1点目 */
await p.evaluate(`(${TOUCH})('pointermove',11,${f1.x},${f1.y})`); await p.waitForTimeout(120);
await p.evaluate(`(${TOUCH})('pointerup',11,${f1.x},${f1.y})`); await p.waitForTimeout(350);
/* ★狙った世界座標との突き合わせはしない（引きの画では手前の別の面に当たるのが正しい）。
   約束は「打点＝画面上の照準の位置」なので、打たれた点を画面へ投影して照準と比べる */
const pt1=await p.evaluate(()=>{let m=null; T.scene.traverse(o=>{ if(o.name==='nnPvDot')m=o; });
  if(!m)return null;
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const q=m.position.clone().project(T.camera);
  return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height};});
ok(!!pt1 && Math.abs(pt1.x-s1.x)<=6 && Math.abs(pt1.y-s1.y)<=6,
   '離すと「画面上の照準の位置」に1点目が打たれる（指の位置ではない）',
   pt1&&{aim:[Math.round(s1.x),Math.round(s1.y)],dot:[Math.round(pt1.x),Math.round(pt1.y)]});
ok(await p.evaluate(()=>!!(window.nnD3DrawOn&&nnD3DrawOn())),'描画中になっている');

/* ③ 2点目も照準で → 点が増える（★2026-08-29n 1点目から自由な形。長方形カードは廃止） */
const s2=await p.evaluate(`(${SCR})(3.2, 0.35, 3.0)`);
const f2={x:s2.x-36, y:s2.y+52};
await p.evaluate(`(${TOUCH})('pointerdown',12,${f2.x-30},${f2.y+20})`); await p.waitForTimeout(150);
await p.evaluate(`(${TOUCH})('pointermove',12,${f2.x},${f2.y})`); await p.waitForTimeout(150);
const live=await p.evaluate(()=>{const d=document.getElementById('nnD3Lab');
  return d&&d.style.display==='block'?d.textContent:'';});
ok(/m/.test(live),'照準に赤い点線と寸法がついてくる',live);
await p.evaluate(`(${TOUCH})('pointerup',12,${f2.x},${f2.y})`); await p.waitForTimeout(350);
const poly2=await p.evaluate(()=>{
  let n=0; T.scene.traverse(o=>{ if(o.name==='nnPvDot')n++; });
  const c=document.getElementById('nnD3Card');
  return {dots:n, card:c.classList.contains('on'), tt:(c.querySelector('.tt')||{}).textContent||''};
});
ok(poly2.dots===2 && /自由な形/.test(poly2.tt),'離すと点が増える（自由な形・長方形カードは出ない）',poly2);
/* ボタンが指のサイズ（40px以上） */
const bh=await p.evaluate(()=>{const b=document.querySelector('#nnD3Card button');
  return b?Math.round(b.getBoundingClientRect().height):0;});
ok(bh>=38,'カードのボタンが指のサイズ',bh);
await p.evaluate(()=>nnD3DrawCancel());

/* ④ 純粋なタップでも二重打点にならない（照準1回＝1点） */
await p.evaluate(()=>{ if(window.nnSolSelect)nnSolSelect(-1); });
const before4=await p.evaluate(()=>{let n=0; T.scene.traverse(o=>{ if(o.name==='nnPvDot')n++; }); return n;});
await p.evaluate(`(${TOUCH})('pointerdown',13,${f1.x},${f1.y})`); await p.waitForTimeout(80);
await p.evaluate(`(${TOUCH})('pointerup',13,${f1.x},${f1.y})`); await p.waitForTimeout(350);
const after4=await p.evaluate(()=>{let n=0; T.scene.traverse(o=>{ if(o.name==='nnPvDot')n++; }); return n;});
ok(after4-before4===1,'純タップで点は1つだけ（二重打点なし）',{mae:before4,ato:after4});
await p.evaluate(()=>nnD3DrawCancel());

/* ⑤ 役物スタンプ：指を置くとゴースト、離すと照準の位置に設置（1個だけ） */
await p.evaluate(()=>nnStamp('dakki')); await p.waitForTimeout(300);
const n0=await p.evaluate(()=>(state.parts||[]).length);
const s3=await p.evaluate(`(${SCR})(5.0, 0.35, 4.0)`);
const f3={x:s3.x-36, y:s3.y+52};
await p.evaluate(`(${TOUCH})('pointerdown',14,${f3.x-20},${f3.y+16})`); await p.waitForTimeout(150);
await p.evaluate(`(${TOUCH})('pointermove',14,${f3.x},${f3.y})`); await p.waitForTimeout(200);
const gpos=await p.evaluate(()=>{let g=null; T.scene.traverse(o=>{ if(o.name==='nnGhost')g=o; });
  return g?[+g.position.x.toFixed(2),+g.position.z.toFixed(2)]:null;});
ok(!!gpos,'指を置いている間ゴーストが出る',gpos);
await p.evaluate(`(${TOUCH})('pointerup',14,${f3.x},${f3.y})`); await p.waitForTimeout(500);
const n1=await p.evaluate(()=>(state.parts||[]).length);
ok(n1-n0===1,'離すと1個だけ置かれる（二重設置なし）',{mae:n0,ato:n1});
/* ★約束は「ゴーストの場所＝実際に置かれる場所」。平面の座標で突き合わせる */
const placed=await p.evaluate(()=>{const it=(state.parts||[])[state.parts.length-1];
  const sM=state.scaleM||0.5; return [+(it.x*sM).toFixed(2), +(it.y*sM).toFixed(2)];});
ok(!!gpos && Math.abs(placed[0]-gpos[0])<=0.03 && Math.abs(placed[1]-gpos[1])<=0.03,
   '置かれる場所＝ゴーストの場所（ずれ3cm以内）',{ghost:gpos,oita:placed});
ok(await p.evaluate(()=>{let g=null; T.scene.traverse(o=>{ if(o.name==='nnGhost')g=o; }); return !g;}),
   '置いたあとゴーストは消える');

/* ⑥ ✥移動も照準で（★2026-08-29n 平場にかくと部位になるので、立体は種をまいて用意する。
   照準でかく道は③で確認済み＝マウスと同じ commitDrawAt を通る） */
await p.evaluate(()=>{ nnD3DrawCancel();
  state.d3sol=state.d3sol||[];
  state.d3sol.push({p:[2.5,0.012,5.0], n:[0,1,0], u:[1,0,0], v:[0,0,-1],
    a:[0,0], b:[1.0,0.8], d:0.3, mode:'out', shape:'box'});
  saveState(); nnSolRender(); });
await p.waitForTimeout(400);
const ns=await p.evaluate(()=>(state.d3sol||[]).length);
ok(ns>=1,'立体がある（✥移動の試験用）',ns);
await p.evaluate(()=>{ nnSolSelect((state.d3sol||[]).length-1); nnSolMoveOn(); });
await p.waitForTimeout(200);
const s6=await p.evaluate(`(${SCR})(6.5, 0.35, 6.5)`);
await p.evaluate(`(${TOUCH})('pointerdown',17,${s6.x-36},${s6.y+52})`); await p.waitForTimeout(120);
const mvLab=await p.evaluate(()=>{const d=document.getElementById('nnD3Aim');
  const bb=d&&d.querySelector('b'); return bb?bb.textContent:'';});
ok(/移動先/.test(mvLab),'移動中の照準に「移動先」と出る',mvLab);
await p.evaluate(`(${TOUCH})('pointerup',17,${s6.x-36},${s6.y+52})`); await p.waitForTimeout(350);
const ctr=await p.evaluate(()=>{const it=state.d3sol[state.d3sol.length-1];
  const u=new THREE.Vector3().fromArray(it.u), v=new THREE.Vector3().fromArray(it.v),
        p0=new THREE.Vector3().fromArray(it.p);
  const c=new THREE.Vector3().copy(p0)
    .addScaledVector(u,(it.a[0]+it.b[0])/2).addScaledVector(v,(it.a[1]+it.b[1])/2);
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const q=c.project(T.camera);
  return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height};});
ok(!!ctr && Math.abs(ctr.x-s6.x)<=22 && Math.abs(ctr.y-s6.y)<=22,
   '移動先＝画面上の照準の位置',
   ctr&&{aim:[Math.round(s6.x),Math.round(s6.y)],sol:[Math.round(ctr.x),Math.round(ctr.y)]});

/* ⑦ 2本指＝拡大縮小＋表示位置の移動（パン） */
await p.evaluate(()=>setTool('sel')); await p.waitForTimeout(200);
const camA=await p.evaluate(()=>({r:+T.r.toFixed(3), tx:+T.tx.toFixed(3), tz:+T.tz.toFixed(3)}));
await p.evaluate(`(${TOUCH})('pointerdown',21,150,420)`);
await p.evaluate(`(${TOUCH})('pointerdown',22,250,420)`);
for(let i=1;i<=6;i++){
  await p.evaluate(`(${TOUCH})('pointermove',21,${150-i*8+i*5},${420+i*6})`);
  await p.evaluate(`(${TOUCH})('pointermove',22,${250+i*8+i*5},${420+i*6})`);
  await p.waitForTimeout(30);
}
await p.evaluate(`(${TOUCH})('pointerup',21,127,456)`);
await p.evaluate(`(${TOUCH})('pointerup',22,328,456)`);
await p.waitForTimeout(200);
const camB=await p.evaluate(()=>({r:+T.r.toFixed(3), tx:+T.tx.toFixed(3), tz:+T.tz.toFixed(3)}));
ok(camB.r!==camA.r,'2本指で拡大縮小できる',{mae:camA.r,ato:camB.r});
ok(camB.tx!==camA.tx||camB.tz!==camA.tz,'2本指のまま動かすと表示位置も動く',
   {mae:[camA.tx,camA.tz],ato:[camB.tx,camB.tz]});

/* ⑧ 選択ツールの1本指ドラッグは今までどおりカメラ移動 */
const camC=await p.evaluate(()=>({tx:+T.tx.toFixed(3), tz:+T.tz.toFixed(3)}));
await p.evaluate(`(${TOUCH})('pointerdown',31,200,400)`);
for(let i=1;i<=5;i++){ await p.evaluate(`(${TOUCH})('pointermove',31,${200+i*14},${400+i*8})`); await p.waitForTimeout(30); }
await p.evaluate(`(${TOUCH})('pointerup',31,270,440)`); await p.waitForTimeout(200);
const camD=await p.evaluate(()=>({tx:+T.tx.toFixed(3), tz:+T.tz.toFixed(3)}));
ok(camD.tx!==camC.tx||camD.tz!==camC.tz,'選択ツールの1本指は今までどおり動かせる');

/* ⑨ 立体と役物の選択は同時に残らない（カードとバーの二重表示防止） */
await p.evaluate(()=>{ if(window.nnSolSelect)nnSolSelect(-1); if(window.nnPartSelect)nnPartSelect(-1); });
await p.evaluate(()=>{ nnPartSelect(0); });                      /* 役物を選んでから… */
await p.evaluate(()=>{
  /* 立体の中心へ実際にレイを飛ばして選ぶ */
  const it=state.d3sol[0];
  const u=new THREE.Vector3().fromArray(it.u), v=new THREE.Vector3().fromArray(it.v),
        n=new THREE.Vector3().fromArray(it.n), p0=new THREE.Vector3().fromArray(it.p);
  const c=new THREE.Vector3().copy(p0)
    .addScaledVector(u,(it.a[0]+it.b[0])/2).addScaledVector(v,(it.a[1]+it.b[1])/2)
    .addScaledVector(n,it.d+0.001);
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const q=c.project(T.camera);
  const vv=new THREE.Vector2(q.x, q.y);
  const rc=new THREE.Raycaster(); rc.setFromCamera(vv, T.camera);
  window.__solPicked=nnSolPickAt(rc);
});
const mutual=await p.evaluate(()=>({picked:!!window.__solPicked,
  sol:nnSolSelIdx(), part:window.nnPartSelIdx?nnPartSelIdx():-1}));
ok(mutual.picked && mutual.sol>=0 && mutual.part===-1,
   '立体を選ぶと役物の選択は外れる（バーとカードが重ならない）',mutual);
/* スマホでは「何も選んでいないときの案内カード」は出ない */
await p.evaluate(()=>{ if(window.nnSolSelect)nnSolSelect(-1); if(window.render3dEdit)render3dEdit(); });
await p.waitForTimeout(200);
ok(await p.evaluate(()=>{const d=document.getElementById('d3edit');
  return !d || d.style.display==='none' || !d.textContent.trim();}),
   'スマホでは案内カード（左下の常駐）を出さない');

/* ⑩ 画面の部品が重なっていない（カード・登録・積算ボタン・▲・役物バー） */
const lay=await p.evaluate(()=>{
  const R=id=>{const e=document.getElementById(id); if(!e)return null;
    const cs=getComputedStyle(e); if(cs.display==='none'||cs.visibility==='hidden')return null;
    const r=e.getBoundingClientRect(); return (r.width>4&&r.height>4)?{id,l:r.left,t:r.top,r:r.right,b:r.bottom}:null;};
  const els=['nnD3Card','nnSolReg','d3ext','nnSideBtn','navShowTab','d3edit','nnPartBar'].map(R).filter(Boolean);
  const hits=[];
  for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){
    const a=els[i],b2=els[j];
    if(a.l<b2.r&&b2.l<a.r&&a.t<b2.b&&b2.t<a.b)hits.push(a.id+'×'+b2.id);
  }
  return hits;
});
ok(lay.length===0,'画面の部品どうしの重なり0',lay);
ok(errs.length===0,'JSエラーなし  '+errs.slice(0,3).join(' / '));
await p.screenshot({path:'/tmp/aim3d.png'});
await b.close();
console.log(ng?('★NG '+ng+'件'):'全部○');
process.exit(ng?1:0);
})();
