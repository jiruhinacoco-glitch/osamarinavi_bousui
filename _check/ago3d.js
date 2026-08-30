/* ★2026-08-30e アゴあり＝標準納まり（本人提供の納まり図・§254）
   ・アゴ＝躯体（コンクリート打増し）。天端・アゴに防水は張らない
   ・防水層はアゴ裏の立上り端末で終わり、端末＝押え金物＋コーキング
   ・数量＝天端から除外・端末押え金物＋シール（m）を計上
   使い方: node _check/ago3d.js            … いまのファイル
           node _check/ago3d.js before     … 直す前（git HEAD）と見くらべる
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let F='zumen_sekisan.html';
if(process.argv[2]==='before'){ const bf=require('./mkbefore')(); if(bf)F=bf; }
else if(process.argv[2]) F=process.argv[2];
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
console.log('== アゴあり標準納まり（'+F+'） ==');
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500);
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});

/* 20×12m・全辺 パラペット h300/w250・アゴあり（出100）・AS-T1 */
await p.evaluate(()=>{
  const pts=[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}];
  state.scaleM=1;
  state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para',ago:1,agoD:100}))}];
  state.active=0; state.specCode='AS-T1';
  saveState(); renderPolyList(); recalc(); draw();
});

/* ① 数量（手計算と突き合わせ：周長64m・立上り64×0.3・天端は0） */
const q1=await p.evaluate(()=>{ const q=quantities(state.polys[0],state.scaleM);
  return {tenba:q.tenba, agoL:q.agoL, tachi:+q.tachi.toFixed(2), per:q.per}; });
ok(q1.tenba===0,'① アゴの辺は天端に防水を数えない（tenba=0）',q1.tenba);
ok(Math.abs(q1.agoL-64)<0.01,'① アゴ裏端末の長さ＝周長64m',q1.agoL);
ok(Math.abs(q1.tachi-19.2)<0.01,'① 立上りは今までどおり 64×0.3＝19.2㎡',q1.tachi);

/* ② 画面の積算：端末押え金物・シール（アゴ裏）64m×1,800円。水切りアゴ廻り（旧）は無い */
const q2=await p.evaluate(()=>{ const t=document.getElementById('sekisan').innerText;
  return {neo:/端末押え金物・シール（アゴ裏）/.test(t), old:/水切りアゴ廻り/.test(t),
          len:/64\.0 m/.test(t), amt:/115,200/.test(t), tenbaZero:/天端\t0\.0 ㎡/.test(t)}; });
ok(q2.neo&&!q2.old,'② 積算の行が「端末押え金物・シール（アゴ裏）」になった',q2);
ok(q2.len&&q2.amt,'② 64.0m × ¥1,800 ＝ ¥115,200（独立の検算）',q2);
ok(q2.tenbaZero,'② 天端は 0.0㎡・¥0（全辺アゴ＝天端に防水なし）',q2.tenbaZero);

/* ③ 御見積書のデータも同じ（画面と紙をそろえる・§224） */
const q3=await p.evaluate(()=>{ const d=nnEstimateData();
  const ago=d.rows.find(r=>r.n.indexOf('アゴ裏')>=0), ten=d.rows.find(r=>r.n.indexOf('天端')>=0);
  const byW=d.polys[0].byW;
  return {ago:ago?{q:ago.q,p:ago.p}:null, ten:!!ten, byW:Object.keys(byW).length}; });
ok(q3.ago&&q3.ago.q===64&&q3.ago.p===1800,'③ 見積書：アゴ裏端末 64m×1,800',q3.ago);
ok(!q3.ten,'③ 見積書：天端防水の行は出ない',q3.ten);
ok(q3.byW===0,'③ 数量根拠書の「天端」にも入らない',q3.byW);

/* ④ 3D：防水層はアゴ裏（lv+hh-50mm）より上に無い・アゴ＝天端と同じコンクリート */
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(2600);
const q4=await p.evaluate(()=>{
  const memHex=nnMemColor(spec());
  let memTop=-9;
  T.group.traverse(o=>{
    if(!o.isMesh||!o.material||!o.material.color) return;
    if(o.material.color.getHex()!==memHex) return;
    if(!o.geometry) return;
    o.geometry.computeBoundingBox&&o.geometry.computeBoundingBox();
    if(!o.geometry.boundingBox) return;
    const bb=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    if(bb.max.y>memTop) memTop=bb.max.y;
  });
  /* 端末押え金物＋コーキング（辺ごとに1本ずつ＝4本） */
  let bars=0,seals=0,barY=null;
  T.group.traverse(o=>{ if(o.name==='nnAgoBar'){bars++; barY=o.position.y;}
                        if(o.name==='nnAgoSeal')seals++; });
  /* 真上からの光線：天端の上（外の面から125mm内側）とアゴの上（325mm内側） */
  /* ★アゴの箱は deco（T.scene直下・§119）にあるので、光線は scene 全体に撃つ。
     見えない当たり判定（透明）と札は除く。 */
  const rc=new THREE.Raycaster();
  const shoot=(x,z)=>{ rc.set(new THREE.Vector3(x,9,z), new THREE.Vector3(0,-1,0));
    const hs=rc.intersectObjects(T.scene.children,true)
      .filter(h=>h.object.isMesh&&h.object.material&&h.object.material.color
        &&!(h.object.material.transparent&&h.object.material.opacity<0.5));
    if(!hs.length)return null;
    const o=hs[0].object;
    return {y:+hs[0].point.y.toFixed(3), hex:o.material.color?o.material.color.getHex():-1}; };
  const ten=shoot(10, 0.125);   /* 天端の上（辺 y=0・幅250mmの真ん中あたり） */
  const ago=shoot(10, 0.325);   /* アゴの上（壁の内面250mm＋出100mmの途中） */
  return {memTop:+memTop.toFixed(3), bars, seals, barY:barY==null?null:+barY.toFixed(3),
          ten, ago, memHex};
});
ok(q4.memTop<=0.251,'④ 防水層の最上端＝アゴ裏（0.25m）以下。天端に露出アスが出ない',q4.memTop);
ok(q4.bars===4&&q4.seals===4,'④ 端末押え金物＋コーキングが4辺ぶん',q4.bars+'/'+q4.seals);
ok(q4.barY!==null&&Math.abs(q4.barY-0.224)<0.005,'④ 押え金物はアゴ裏（0.25−0.026）',q4.barY);
ok(q4.ten&&q4.ten.hex!==q4.memHex&&q4.ten.y<=0.305,'④ 天端の1枚目＝躯体（防水色でない）',q4.ten);
ok(q4.ago&&q4.ago.hex!==q4.memHex&&Math.abs(q4.ago.y-0.3)<0.01,'④ アゴの上＝躯体・天端と面いち',q4.ago);
ok(q4.ten&&q4.ago&&q4.ten.hex===q4.ago.hex,'④ アゴと天端が同じ色（「2色」の解消）',
   q4.ten&&q4.ago?[q4.ten.hex.toString(16),q4.ago.hex.toString(16)]:null);

/* ⑤ アゴを外すと今までどおり（天端に防水・端末金物なし）＝ふつうのパラペットの回帰 */
const q5=await p.evaluate(async()=>{
  state.polys[0].edges.forEach(e=>{delete e.ago; delete e.agoD;});
  saveState(); recalc(); build3D();
  await new Promise(r=>setTimeout(r,300));
  const memHex=nnMemColor(spec());
  const rc=new THREE.Raycaster();
  rc.set(new THREE.Vector3(10,9,0.125), new THREE.Vector3(0,-1,0));
  const hs=rc.intersectObjects(T.group.children,true).filter(h=>h.object.isMesh);
  const top=hs.length?{y:+hs[0].point.y.toFixed(3), hex:hs[0].object.material.color.getHex()}:null;
  let bars=0; T.group.traverse(o=>{ if(o.name==='nnAgoBar')bars++; });
  const q=quantities(state.polys[0],state.scaleM);
  return {top, memHex, bars, tenba:q.tenba, agoL:q.agoL};
});
ok(q5.top&&q5.top.hex===q5.memHex&&Math.abs(q5.top.y-0.312)<0.01,
   '⑤ アゴを外すと天端は防水で納まる（今までどおり）',q5.top);
ok(q5.bars===0&&q5.agoL===0&&Math.abs(q5.tenba-16)<0.01,
   '⑤ 端末金物は消え、天端16㎡が戻る',{bars:q5.bars,tenba:q5.tenba});

/* ⑥ 断面詳細図PDF：新しい端末の表記・旧アルミ垂れは無い */
const q6=await p.evaluate(()=>{
  state.polys[0].edges.forEach(e=>{e.ago=1; e.agoD=100;}); saveState();
  let html=''; const ow=window.open;
  window.open=()=>({document:{open(){},write(s){html+=s;},close(){}},focus(){},print(){},close(){},addEventListener(){}});
  let err=''; try{ nnSectionPDF(); }catch(e){ err=String(e).slice(0,80); }
  window.open=ow; const flat=html.replace(/<[^>]+>/g,' ');
  return {err, neo:flat.indexOf('端末押え金物＋コーキング（アゴ裏）')>=0,
          old:flat.indexOf('アルミアングル')>=0, ago:flat.indexOf('水切りアゴ')>=0};
});
ok(q6.err===''&&q6.neo&&!q6.old&&q6.ago,'⑥ 断面PDF＝押え金物＋コーキング（アルミ垂れは廃止）',q6);

/* ⑦ 画面の断面（矩計図タブ）もエラーなく描ける */
await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(800);
ok(errs.length===0,'⑦ JSエラーなし  '+errs.slice(0,2).join(' / '));
await b.close();
console.log(ng?('★NG '+ng+'件'):'全部○');
process.exit(ng?1:0);
})();
