/* ★2026-08-30b 入口メニューの「区分（新築／改修）・躯体・既存防水・新規防水」（本人の指示）
   ・新築＝躯体＋新規防水／改修＝躯体＋既存防水＋新規防水
   ・躯体は3Dの構造体（NN_KOUZOU）をそのまま使い、積算・設定パネルの下地と連動する
   ・新規防水は仕様（SPECS）を選ぶ
   ・よこ向きでもアゴあり／なしの納まりの絵が出る（前は消えていた）
   使い方：node _check/zsetup.js       … パソコン
   　　　　node _check/zsetup.js ph    … スマホ たて
   　　　　node _check/zsetup.js land  … スマホ よこ（env→59px に置換したコピーを使う） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const M=process.argv[2]||'pc';
const VP={pc:{width:1600,height:900}, ph:{width:393,height:852}, land:{width:852,height:393}}[M];
const MOB=M!=='pc';
let FILE='zumen_sekisan.html';
if(M==='land'){                       /* よこ向きはノッチの余白を入れないと再現しない（§7） */
  const s=fs.readFileSync('zumen_sekisan.html','utf8')
    .replace(/env\(safe-area-inset-left\)/g,'59px').replace(/env\(safe-area-inset-right\)/g,'59px');
  fs.writeFileSync('_landz.html',s); FILE='_landz.html';
}
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext(MOB?{viewport:VP,deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:VP});
if(MOB) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});
                                     Object.defineProperty(screen,'height',{get:()=>852});});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
console.log('== '+({pc:'パソコン',ph:'スマホ たて',land:'スマホ よこ'}[M])+' ==');
await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
await p.waitForTimeout(1600);
await p.evaluate(()=>{ try{localStorage.clear();}catch(_){} });
await p.reload({waitUntil:'load'}); await p.waitForTimeout(1600);

/* ---- ① 出ているか ---- */
const n=await p.evaluate(()=>({
  kb:document.querySelectorAll('#nnZMenu .kbB').length,
  kbTxt:[...document.querySelectorAll('#nnZMenu .zmCard:nth-of-type(1) .kbB')].map(x=>x.textContent),
  kz:document.querySelectorAll('#nnZMenu select[data-set="kz"]').length,
  ki:document.querySelectorAll('#nnZMenu select[data-set="ki"]').length,
  sp:document.querySelectorAll('#nnZMenu select[data-set="sp"]').length,
  go:document.querySelectorAll('#nnZMenu .zmGoB').length,
  kzOpt:[...document.querySelectorAll('#nnZMenu select[data-set="kz"]')[0].options].length,
  kiOpt:[...document.querySelectorAll('#nnZMenu select[data-set="ki"]')[0].options].length,
  spOpt:[...document.querySelectorAll('#nnZMenu select[data-set="sp"]')[0].options].map(o=>o.value)
}));
ok(n.kb===4,'区分（新築／改修）が両方のカードに（計4個）',n.kb);
ok(n.kbTxt.join('/')==='新築/改修','区分の名前が「新築／改修」',n.kbTxt.join('/'));
ok(n.kz===2&&n.ki===2&&n.sp===2,'躯体・既存防水・新規防水が両方のカードに',[n.kz,n.ki,n.sp]);
ok(n.go===2,'「▶ はじめる」が両方のカードに',n.go);
ok(n.kzOpt===5,'躯体は3Dの構造体をそのまま（5種）',n.kzOpt);
ok(n.kiOpt>=8,'既存防水の選択肢がある',n.kiOpt+'種');
ok(n.spOpt.join(',')==='AS-T1,AS-J3,X-2,S-M2,AS-N','新規防水は仕様（SPECS）から',n.spOpt.join(','));

/* ---- ② 新築＝既存防水を出さない／改修＝出す ---- */
const vis=async()=>p.evaluate(()=>{
  const r=document.querySelector('#nnZMenu .zmCard:nth-of-type(1) .zmRow.kiOnly');
  return {kb:document.querySelector('#nnZMenu .zmCard').getAttribute('data-kb'),
          shown:getComputedStyle(r).display!=='none'};});
ok((await vis()).kb==='kaishu','既定は改修',(await vis()).kb);
ok((await vis()).shown,'改修のときは「既存防水」が出る');
await p.click('#nnZMenu .zmCard:nth-of-type(1) .kbB[data-kubun="shinchiku"]'); await p.waitForTimeout(300);
const v2=await vis();
ok(v2.kb==='shinchiku'&&!v2.shown,'新築にすると「既存防水」を出さない（躯体＋新規防水だけ）',v2);
ok(await p.evaluate(()=>document.querySelectorAll('#nnZMenu .kbB.on').length===2),
   '両方のカードの区分がそろう（片方を押すともう片方も）');
ok(await p.evaluate(()=>nnZMenuOn()),'区分を押しても画面は移動しない（この後で防水を選ぶため）');
await p.click('#nnZMenu .zmCard:nth-of-type(1) .kbB[data-kubun="kaishu"]'); await p.waitForTimeout(300);
ok((await vis()).shown,'改修に戻すと「既存防水」がまた出る');

/* ---- ③ 選ぶと設定に入る・両方のカードがそろう ---- */
await p.selectOption('#nnZMenu .zmCard:nth-of-type(1) select[data-set="kz"]','w');
await p.waitForTimeout(300);
const kz=await p.evaluate(()=>({st:state.kouzou,
  both:[...document.querySelectorAll('#nnZMenu select[data-set="kz"]')].map(x=>x.value),
  side:(document.querySelector('#nnKzPanel .nnKzSel')||{}).value}));
ok(kz.st==='w','躯体を選ぶと図面の下地になる',kz.st);
ok(kz.both.join(',')==='w,w','もう片方のカードもそろう',kz.both.join(','));
ok(kz.side==='w','積算・設定パネルの下地とも連動する',kz.side);

await p.selectOption('#nnZMenu .zmCard:nth-of-type(2) select[data-set="sp"]','S-M2');
await p.waitForTimeout(300);
const sp=await p.evaluate(()=>({st:state.specCode,
  both:[...document.querySelectorAll('#nnZMenu select[data-set="sp"]')].map(x=>x.value)}));
ok(sp.st==='S-M2','新規防水の仕様が図面の工法になる',sp.st);
ok(sp.both.join(',')==='S-M2,S-M2','仕様も両方のカードでそろう',sp.both.join(','));

await p.selectOption('#nnZMenu .zmCard:nth-of-type(1) select[data-set="ki"]','enbi');
await p.waitForTimeout(300);
const ki=await p.evaluate(()=>({st:state.kizon,
  both:[...document.querySelectorAll('#nnZMenu select[data-set="ki"]')].map(x=>x.value)}));
ok(ki.st==='enbi','既存防水が図面の設定に入る',ki.st);
ok(ki.both.join(',')==='enbi,enbi','既存防水も両方のカードでそろう',ki.both.join(','));
ok(await p.evaluate(()=>nnZMenuOn()),'プルダウンを触っても画面は移動しない');

/* ---- ④ 開き直しても残る ---- */
await p.reload({waitUntil:'load'}); await p.waitForTimeout(1600);
const keep=await p.evaluate(()=>({kz:state.kouzou, sp:state.specCode, ki:state.kizon, kb:state.kubun,
  selKz:document.querySelector('#nnZMenu select[data-set="kz"]').value,
  selSp:document.querySelector('#nnZMenu select[data-set="sp"]').value,
  selKi:document.querySelector('#nnZMenu select[data-set="ki"]').value}));
ok(keep.kz==='w'&&keep.sp==='S-M2'&&keep.ki==='enbi'&&keep.kb==='kaishu','開き直しても残る',keep);
ok(keep.selKz==='w'&&keep.selSp==='S-M2'&&keep.selKi==='enbi','開き直しても画面にそろって出る',
   [keep.selKz,keep.selSp,keep.selKi].join(','));

/* ---- ⑤ アゴは「本人が作った絵」を使う（★2026-08-31b 消したのは線の記号のほう） ---- */
const ago=await p.evaluate(()=>({
  btn:document.querySelectorAll('#nnZMenu .agoB').length,
  svg:document.querySelectorAll('#nnZMenu .agoB svg').length,
  img:[...document.querySelectorAll('#nnZMenu .agoIc img')].filter(i=>i.naturalWidth>0).length,
  h  :(function(){const i=document.querySelector('#nnZMenu .agoIc img');
        return i?Math.round(i.getBoundingClientRect().height/(window.nnPZ||1)):0;})(),
  tx :[...document.querySelectorAll('#nnZMenu .agoB')].map(x=>x.textContent.trim()).join('/'),
}));
ok(ago.btn===4,'アゴあり／なしのボタンが4つ',ago.btn);
ok(ago.svg===0,'線でかいた記号（SVG）は出さない',ago.svg+'個');
ok(ago.img===4,'本人が作った絵が4つとも読めている（よこ向きでも）',ago.img+'枚');
ok(ago.h>=8,'絵に高さがある（潰れていない）',ago.h+'px');
ok(/アゴあり\/アゴなし/.test(ago.tx),'文字も出ている',ago.tx);

/* ---- ⑤-2 ①②のカードの絵（icons/zm_heimen.png・zm_kanabakari.png）
   絵が届く前は絵文字（▤ 📐）に戻るのが正しい。届いたら絵文字を隠す。両方を許す。 ---- */
const cic=await p.evaluate(()=>{
  const Z=window.nnPZ||1;
  const ics=[...document.querySelectorAll('#nnZMenu .zmCard .ic')];
  return ics.map(ic=>{
    const img=ic.querySelector('img'), em=ic.querySelector('.em');
    const fr=ic.parentNode.getBoundingClientRect();          /* 平行四辺形のフレーム */
    const g =ic.getBoundingClientRect();
    const ir=img?img.getBoundingClientRect():null;
    /* 文字の先頭が絵より右にあるか（重なっていないか） */
    const tn=[...ic.parentNode.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
    let gap=null;
    if(tn){ const rg=document.createRange(); rg.selectNodeContents(tn);
            gap=Math.round((rg.getBoundingClientRect().left-g.right)/Z); }
    return {hasimg:ic.classList.contains('hasimg'),
      imgOK:!!(img&&img.naturalWidth>0),
      src:img?img.getAttribute('src'):null,
      emShown:!!(em&&getComputedStyle(em).display!=='none'),
      emTx:em?em.textContent:'',
      inFrame:ic.parentNode.classList.contains('httl'),
      frameH:Math.round(fr.height/Z), frameW:Math.round(fr.width/Z),
      w:Math.round((ir?ir.width :g.width )/Z),
      h:Math.round((ir?ir.height:g.height)/Z),
      insideL:Math.round((g.left-fr.left)/Z),
      insideR:Math.round((fr.right-g.right)/Z),
      gap:gap};
  });
});
ok(cic.length===2,'①②のカードに絵の枠が2つ',cic.length);
ok(cic.every(c=>c.imgOK ? (c.hasimg&&!c.emShown) : (!c.hasimg&&c.emShown)),
   '絵があれば絵文字を隠す／無ければ絵文字に戻る',
   cic.map(c=>c.imgOK?'絵':'絵文字'+c.emTx).join(' / '));
/* ★2026-08-30h 絵は「平行四辺形のフレームの中に入れて、フレームより大きく」（本人の指示）。
   ・フレーム（b.httl）の中にある　・フレームより背が高い（はみ出す）
   ・横はフレームの中に収まっている　・文字と重ならない
   ・①と②が同じ大きさに見える（絵の面積で見る。同じ高さだと平面図が小さく見えたため） */
ok(cic.every(c=>c.inFrame),'絵は平行四辺形のフレームの中にある',cic.map(c=>c.inFrame).join(','));
ok(cic.every(c=>c.h>c.frameH+2),'絵はフレームより大きい（上下にはみ出す）',
   cic.map(c=>c.h+'px>枠'+c.frameH+'px').join(' / '));
ok(cic.every(c=>c.insideL>=-2&&c.insideR>0),'絵はフレームの横幅の中に収まっている',
   cic.map(c=>'左'+c.insideL+'/右'+c.insideR).join(' '));
ok(cic.every(c=>c.gap===null||c.gap>=2),'絵と文字が重ならない',cic.map(c=>c.gap).join(','));
{
  /* 見た目の大きさ＝絵の面積（インクの濃さは元絵の実測 平面図0.756・矩計図0.850） */
  const INK=[0.756,0.850];
  const a=cic.map((c,i)=>c.w*c.h*INK[i]);
  const rr=a[0]&&a[1] ? Math.max(a[0],a[1])/Math.min(a[0],a[1]) : 99;
  const rowH=await p.evaluate(()=>{const t=document.querySelector('#nnZMenu .zmCard .zmTtl');
    return t?Math.round(t.getBoundingClientRect().height/(window.nnPZ||1)):0;});
  ok(!cic[0].imgOK||rr<=1.12,'①と②の絵が同じ大きさに見える（比 '+rr.toFixed(2)+'）',
     cic.map(c=>c.w+'x'+c.h).join(' / '));
  ok(cic.every(c=>c.h<=rowH+2),'絵の高さぶんの行が確保されている（行'+rowH+'px）',
     cic.map(c=>c.h+'px').join(','));
}
ok(!cic[0].src||/zm_heimen\.png/.test(cic[0].src),'①の絵は icons/zm_heimen.png',cic[0].src);
ok(!cic[1].src||/zm_kanabakari\.png/.test(cic[1].src),'②の絵は icons/zm_kanabakari.png',cic[1].src);

/* ---- ⑥ 3Dの「既存防水」が、選んだ種類で見た目が変わる ---- */
await p.evaluate(()=>{
  state.scaleM=1;
  const pts=[{x:0,y:0},{x:6,y:0},{x:6,y:4},{x:0,y:4}];
  state.polys=[{name:'屋根①', lv:0, pts, holes:[],
    edges:pts.map(()=>({h:300,w:250,k:'para'})), genkyo:'exist'}];
  state.active=0; try{saveState();}catch(_){}
  try{nnZMenuClose();}catch(_){} setTab('d3');
});
await p.waitForFunction(()=>{ try{ return typeof T!=='undefined' && T && T.group && T.group.children.length>3; }catch(_){ return false; } },{timeout:20000});
await p.waitForTimeout(500);
const col=async(k)=>p.evaluate(kk=>{
  state.kizon=kk; build3D(); T.group.updateMatrixWorld(true);
  const rc=new THREE.Raycaster(); const objs=[];
  T.group.traverse(o=>{ if(o.isMesh&&o.visible) objs.push(o); });
  rc.set(new THREE.Vector3(3,1,2), new THREE.Vector3(0,-1,0)); rc.far=3;
  const h=rc.intersectObjects(objs,false)[0];
  return h&&h.object.material&&h.object.material.color ? h.object.material.color.getHexString() : null;
},k);
const c1=await col('as_ro'), c2=await col('enbi'), c3=await col('kinzoku'), c4=await col('as_ro');
ok(c1&&c2&&c1!==c2,'既存防水の種類を変えると3Dの色が変わる（露出アス≠塩ビ）',c1+' / '+c2);
ok(c3&&c3!==c2,'金属屋根はさらに別の色',c3);
ok(c1===c4,'同じ種類に戻すと同じ色（覚えたものが取り違わっていない）',c4);

/* ---- ⑦ 新築のときは屋根の表の現況から「既存防水」を出さない ---- */
/* 「改修＋現況=既存防水」から、メニューで新築に切り替える（本当の道を通す） */
const gkA=await p.evaluate(()=>{
  state.kubun='kaishu'; state.polys[0].genkyo='exist';
  try{nnRoofTbl(true);}catch(_){}
  const s=document.querySelector('#nnRoofTbl select.rgk');
  return s?[...s.options].map(o=>o.value):null; });
await p.evaluate(()=>{try{nnZMenuOpen();}catch(_){}}); await p.waitForTimeout(250);
await p.click('#nnZMenu .zmCard:nth-of-type(1) .kbB[data-kubun="shinchiku"]'); await p.waitForTimeout(500);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(250);
const gkB=await p.evaluate(()=>{
  const s=document.querySelector('#nnRoofTbl select.rgk');
  return {gk:state.polys[0].genkyo||'', opts:s?[...s.options].map(o=>o.value):null}; });
if(gkA){
  ok(gkA.indexOf('exist')>=0,'改修では現況に「既存防水」がある',gkA.join(','));
  ok(gkB.gk==='','新築にすると、屋根の現況「既存防水」は「改修後防水」に戻す',gkB.gk||'（既定）');
  ok(gkB.opts&&gkB.opts.indexOf('exist')<0,'新築では現況に「既存防水」を出さない',(gkB.opts||[]).join(','));
}else{
  ok(true,'（屋根の表はこの画面幅では出ない＝スマホ。判定を飛ばす）');
  ok(gkB.gk==='','新築にすると、屋根の現況「既存防水」は「改修後防水」に戻す',gkB.gk||'（既定）');
  ok(true,'（同上）');
}
ok(errs.length===0,'JSエラーなし',errs.join('|')||'');
console.log(ng?('★NG '+ng+'件'):'全部○');
await b.close();
})();
