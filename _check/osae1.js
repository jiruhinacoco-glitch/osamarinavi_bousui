/* ★2026-09-05h 既存防水の層・厚み／押えコンクリートの目地／条件で出る設定（§290）の検証
   使い方: node _check/osae1.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(2600);

/* ① 入口メニュー：押えコンを選んだときだけ「押えコン」の行が出る。はじめる で state に入る */
async function pick(v){ await p.click('.zmCard .zmDd[data-set="ki"]'); await p.waitForTimeout(200); await p.click('#zmDdMenu .row[data-v="'+v+'"]'); await p.waitForTimeout(200); }
const d0=await p.evaluate(()=>getComputedStyle(document.querySelector('.zmCard .zmOsaeRow')).display);
ok('①既存防水＝不明のときは押えコンの行を出さない', d0==='none', d0);
await pick('osae');
const d1=await p.evaluate(()=>getComputedStyle(document.querySelector('.zmCard .zmOsaeRow')).display);
ok('①押えコンクリートを選ぶと行が出る', d1!=='none', d1);
const m=await p.evaluate(()=>{ const c=document.querySelector('.zmCard');
  c.querySelector('.osT').value=100; c.querySelector('.osJx').value=2.5; c.querySelector('.osJz').value=2.0; c.querySelector('.osEd').value=0.5;
  c.querySelector('.kzB[data-dn="1"]').click(); c.querySelector('.dnT').value=50; c.querySelector('.zmGoB').click();
  return {kizon:state.kizon, o:state.osae, dn:state.dannetsu, dt:state.dannetsuT}; });
ok('①はじめる → 厚み100・間隔2.5×2.0・周辺0.5 が state.osae に入る', m.kizon==='osae'&&m.o.t===100&&m.o.jx===2.5&&m.o.jz===2&&m.o.edge===0.5&&m.dn===1, JSON.stringify(m));

/* 屋根 30m×20m（1マス0.5m） */
await p.evaluate(()=>{ state.polys=[{pts:[{x:0,y:0},{x:60,y:0},{x:60,y:40},{x:0,y:40}], edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})), lv:0, name:'屋根①'}];
  state.active=0; saveState(); renderPolyList(); recalc(); draw(); });
await p.waitForTimeout(300);
/* ② 層の並び（下から）と厚み */
const st=await p.evaluate(()=>({stack:nnLayerStack(state.polys[0]).map(l=>l.k+':'+Math.round(l.t*1000)), H:Math.round(nnStackH(state.polys[0])*1000), stB:(()=>{state.genkyo='body'; const r=nnLayerStack(state.polys[0]).length; delete state.genkyo; return r;})()}));
ok('②層の並び＝既存防水6mm→既存断熱材50mm→押えコン100mm（合計156mm）', st.stack.join('/')==='wp:6/ins:50/osae:100'&&st.H===156, JSON.stringify(st));
ok('②「下地」を見ているときは層を積まない', st.stB===0, st.stB);
/* ③ 目地の位置（自動）：周辺0.5 → 内側 29m×19m。たて ceil(29/2.5)=12→11本、よこ ceil(19/2)=10→9本、周辺の輪4辺 */
await p.evaluate(()=>nnStageSet('exist'));
const mj=await p.evaluate(()=>{ const L=nnMejiLines(state.polys[0]); return {xs:L.xs.length, zs:L.zs.length, per:L.perim.length, auto:L.auto, x0:+L.bb.x0.toFixed(3), x1:+L.bb.x1.toFixed(3), sx:L.segX.length}; });
ok('③自動の目地＝たて11本・よこ9本・周辺の輪（4点）・周辺は立上りから0.5m', mj.xs===11&&mj.zs===9&&mj.per===4&&mj.auto&&mj.x0===0.5&&mj.x1===29.5, JSON.stringify(mj));
/* ④ 位置を手で変える → 屋根ごとに残る／自動に戻せる */
const ed=await p.evaluate(()=>{ nnMejiEdit(0,'x',0,3.3); const a=nnMejiLines(state.polys[0]); nnMejiEdit(0,'x',-1,7.77); const c=nnMejiLines(state.polys[0]); nnMejiEdit(0,'z',0,null); const d=nnMejiLines(state.polys[0]);
  return {auto:a.auto, x0:+a.xs[0].toFixed(2), n:c.xs.length, has:c.xs.some(v=>Math.abs(v-7.77)<1e-6), zs:d.zs.length, saved:JSON.stringify(state.polys[0].meji).length>10}; });
ok('④1本目を3.3mへ／追加7.77m／よこ1本削除 → 手で決めた位置として残る', !ed.auto&&ed.x0===3.3&&ed.n===12&&ed.has&&ed.zs===8&&ed.saved, JSON.stringify(ed));
const au=await p.evaluate(()=>{ nnMejiAuto(0); const L=nnMejiLines(state.polys[0]); return {auto:L.auto, xs:L.xs.length, meji:state.polys[0].meji}; });
ok('④「自動で振り直す」で間隔からの並びに戻る', au.auto&&au.xs===11&&au.meji===undefined, JSON.stringify(au));
/* ⑤ 2D：目地の線が描かれている（画素） */
const px=await p.evaluate(()=>{ draw(); const cv=document.getElementById('cv'), g=cv.getContext('2d'); const L=nnMejiLines(state.polys[0]); const s=state.scaleM;
  const rc=cv.getBoundingClientRect(), kx=cv.width/rc.width, ky=cv.height/rc.height;
  const ym=(L.zs[0]+L.zs[1])/2;                       /* よこの目地と目地の間（線の上に乗らない高さ） */
  const rd=(x,y)=>{ const d=g.getImageData(Math.round(gx2px(x/s)*kx),Math.round(gy2px(y/s)*ky),1,1).data; return d[0]+d[1]+d[2]; };
  return {onLine:rd(L.xs[3],ym), off:rd((L.xs[3]+L.xs[4])/2, ym)}; });
ok('⑤平面図に目地の線（線の上は暗く・間は明るい）', px.onLine<250 && px.off>450, JSON.stringify(px));
/* ⑥ 3D：継目が消え、層の板と目地が載り、平場が156mm上がる。数量とカメラは不変 */
const qty0=await p.evaluate(()=>JSON.stringify(quantities(state.polys[0],state.scaleM)));
await p.evaluate(()=>setTab('d3')); await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.renderer;}catch(_){return false;}},null,{timeout:25000}); await p.waitForTimeout(5000);
const d3=await p.evaluate(()=>{ let mem=null, beads=0, bv=0, stack=[], meji=0; T.group.traverse(o=>{ if(o.isMesh&&o.userData.polyIdx!==undefined&&!mem) mem=o;
    if(o.isMesh&&/nnFlatSeam|nnBeadBall|nnChamBead/.test(o.name||'')){ beads++; if(o.visible) bv++; }
    if(o.name==='nnStackLayer') stack.push(o.userData.stackKind+':'+o.position.y.toFixed(3)); if(o.name==='nnMeji') meji++; });
  const mp=mem.geometry.attributes.position; let y=mp.getY(0); const map=mem.material.map&&mem.material.map.image&&(mem.material.map.image.src||'');
  const cam=[T.theta,T.phi,T.r,T.tx,T.tz].map(v=>+(+v).toFixed(4));
  return {beads, bv, stack, meji, memY:+(y+mem.position.y).toFixed(3), tex:/osae/.test(map)||/canvas/i.test(String(map)), cam}; });
ok('⑥押えコンなのでアスファルトの継目を出さない（作られているが見えない）', d3.beads>100 && d3.bv===0, d3.beads+'/'+d3.bv);
ok('⑥層の板が3枚（既存防水6・断熱56・押えコン156の上面）', d3.stack.join('/')==='wp:0.006/ins:0.056/osae:0.156', d3.stack.join('/'));
ok('⑥目地の板＝たて11＋よこ9＋周辺4', d3.meji===24, d3.meji);
ok('⑥平場（防水面）は層の上（0.156+0.012）', d3.memY===0.168, d3.memY);
const qty1=await p.evaluate(()=>JSON.stringify(quantities(state.polys[0],state.scaleM)));
ok('⑥数量は1つも変わらない（見た目だけ）', qty0===qty1, qty1);
/* 厚みを変えても・目地を変えてもカメラは動かない（§152） */
const cm=await p.evaluate(async()=>{ const c0=[T.theta,T.phi,T.r,T.tx,T.tz].join(','); nnOsaeSet('t',80); nnMejiEdit(0,'x',0,4.0); await new Promise(r=>setTimeout(r,300)); return c0===[T.theta,T.phi,T.r,T.tx,T.tz].join(','); });
ok('⑥厚み・目地を変えてもカメラは動かない（§152）', cm);
/* ⑦ 施工後：目地は隠れる（新規防水の下）・層は残る・立上り防水の足元は層の上 */
const af=await p.evaluate(async()=>{ nnStageSet(''); await new Promise(r=>setTimeout(r,400)); let meji=0, stack=0; T.group.traverse(o=>{ if(o.name==='nnMeji')meji++; if(o.name==='nnStackLayer')stack++; }); return {meji, stack, H:Math.round(nnStackH(state.polys[0])*1000)}; });
ok('⑦施工後＝目地は新規防水の下に隠れる・層（136mm）は残る', af.meji===0&&af.stack===3&&af.H===136, JSON.stringify(af));
/* ⑧ 条件で出る設定：既存防水＝押えコンを見ているときだけボタンが出る */
await p.waitForTimeout(700);   /* 表示の合わせ直しは保存のあと1コマ */
const cb=await p.evaluate(async()=>{ const bar=()=>document.getElementById('nnCondBar'); const vis=()=>bar()&&bar().style.display!=='none'&&bar().querySelector('[data-cond="osae"]');
  const a=!!vis(); const dbgA={disp:bar()&&bar().style.display, html:bar()&&bar().innerHTML.slice(0,60), st:nnStageGet()}; nnStageSet('exist'); await new Promise(r=>setTimeout(r,700)); const b2=!!vis(); nnCond.open('osae'); const bx=document.getElementById('nnCondBox');
  const c=bx.classList.contains('on')&&bx.querySelectorAll('input[data-mj]').length>10; nnCond.close(); return {a,dbgA,b:b2,c, r:bar().getBoundingClientRect().top>(document.getElementById('d3ext')||{getBoundingClientRect:()=>({bottom:0})}).getBoundingClientRect().bottom}; });
ok('⑧施工後を見ているときは押えコンのボタンを出さない／既存防水を見ると出る／押すと小窓', !cb.a&&cb.b&&cb.c, JSON.stringify(cb));
ok('⑧小窓のボタンは「押し出し」の下（重ならない・§273）', cb.r);
/* ⑨ 下地の寸法（ALC パネル幅）が設定から変わる */
const alc=await p.evaluate(async()=>{ nnKzPairSet('s','alc'); await new Promise(r=>setTimeout(r,700)); const a=!!document.querySelector('#nnCondBar [data-cond="alc"]'); nnKzpSet('alcW',500); const P=nnKzParam(); nnKzPairSet('rc','conc'); return {a, w:P.alcW}; });
ok('⑨ALCを選ぶと「パネル幅」の設定が出て、値が保存される', alc.a&&alc.w===500, JSON.stringify(alc));
/* ⑩ 保存→開き直しても残る */
await p.reload(); await p.waitForTimeout(2600); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
const sv=await p.evaluate(()=>({o:state.osae, kzp:state.kzp, meji:state.polys[0]&&state.polys[0].meji, dn:state.dannetsu}));
ok('⑩開き直しても 厚み80・間隔2.5×2・周辺0.5・ALC500・手で決めた目地 が残る', sv.o.t===80&&sv.o.jx===2.5&&sv.o.edge===0.5&&sv.kzp.alcW===500&&sv.meji&&sv.meji.x&&sv.meji.x[0]===4.0&&sv.dn===1, JSON.stringify(sv));
/* ⑪ 断面図：既存の層が厚みで描かれる（項目名に押えコン t=80） */
const sec=await p.evaluate(async()=>{ setTab('sec'); await new Promise(r=>setTimeout(r,900)); const cv=document.getElementById('secCv'); const g=cv.getContext('2d');
  /* 黄色（断熱材）の画素があるか */ const d=g.getImageData(0,0,cv.width,cv.height).data; let yel=0; for(let i=0;i<d.length;i+=16){ if(d[i]>220&&d[i+1]>200&&d[i+2]<190&&d[i+2]>130) yel++; } return {yel}; });
ok('⑪断面図に既存断熱材（黄）の層が描かれる', sec.yel>50, JSON.stringify(sec));
ok('JSエラーなし', errs.length===0, errs.slice(0,3).join(' / '));
console.log(R.join('\n')); console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
await b.close(); process.exit(R.some(x=>x[0]==='★')?1:0);
})();
