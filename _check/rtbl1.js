/* ★2026-08-23g 右ウィンドウ撤去（引き出し化＋浮かぶ屋根テーブル）＋躯体の立ち上げ基準（§159）
   node _check/rtbl1.js
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.waitForTimeout(500);

/* ── ① 右ウィンドウは出ていない（引き出し）── */
const side0=await p.evaluate(()=>{
  const s=document.getElementById('side'), r=s.getBoundingClientRect();
  return {inView:r.left<innerWidth-4, open:s.classList.contains('open'),
          cvW:Math.round(document.getElementById('canvaswrap').getBoundingClientRect().width),
          scrollX:document.documentElement.scrollWidth-document.documentElement.clientWidth};
});
ok(!side0.inView && !side0.open,'右ウィンドウはふだん出ていない（画面の外）',side0);
ok(side0.cvW>1400,'作図面が画面いっぱいに広がる',side0.cvW);
ok(side0.scrollX<=0,'横スクロールは出ない',side0.scrollX);
ok(await p.evaluate(()=>{const b2=document.getElementById('nnSideBtn');
  return !!(b2&&getComputedStyle(b2).display!=='none');}),'「📊 積算・設定」ボタンがある');
await p.evaluate(()=>document.getElementById('nnSideBtn').click());
/* ★引き出しは transition .22s で動くうえ、初期化直後は描画が重く遅れることがある。
   時間で待たず「開き切ったか」を条件で待つ（テストの揺れ止め・2026-08-23i） */
let opened=true;
try{ await p.waitForFunction(()=>{const s=document.getElementById('side');
  return s.classList.contains('open')&&s.getBoundingClientRect().left<innerWidth-100;},{timeout:6000});
}catch(_){ opened=false; }
ok(opened,'押すと右から引き出しが開く');
await p.evaluate(()=>document.getElementById('nnSideClose').click()); await p.waitForTimeout(700);
ok(await p.evaluate(()=>!document.getElementById('side').classList.contains('open')),'閉じるバーで閉じる');

/* ── ② 浮かぶ屋根の表（モックp2） ── */
const t0=await p.evaluate(()=>{
  const t=document.getElementById('nnRoofTbl'); if(!t)return null;
  return {vis:getComputedStyle(t).display!=='none',
    ths:[...t.querySelectorAll('th')].map(x=>x.textContent).filter(Boolean),
    rows:t.querySelectorAll('tr.rrow').length,
    add:!!t.querySelector('tr.radd')};
});
ok(!!t0&&t0.vis,'①図面タブに屋根の表が出る');
ok(t0&&t0.ths.join(',')==='屋根,下地,面GL+(m),躯体GL+(m),面積,仕様','列は 屋根｜下地｜面GL+｜躯体GL+｜面積｜仕様',t0&&t0.ths);
ok(t0&&t0.rows===0&&t0.add,'空のときは「＋新しい屋根を追加」だけ');

/* かくと自然と行が増える */
await p.evaluate(()=>{
  state.polys=[]; state.parts=[]; state.d3sol=[]; state.scaleM=0.5; state.specCode='AS-T1';
  drawPts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]; closePoly();
  drawPts=[{x:2,y:9},{x:8,y:9},{x:8,y:13},{x:2,y:13}]; closePoly();
});
await p.waitForTimeout(300);
const t1=await p.evaluate(()=>{
  const t=document.getElementById('nnRoofTbl');
  return {rows:t.querySelectorAll('tr.rrow').length,
    nm:[...t.querySelectorAll('.rnm')].map(x=>x.value),
    /* ★2026-08-23h 下地・仕様は文字→屋根ごとのプルダウンに変わった */
    kz:[...t.querySelectorAll('select.rkz')].map(x=>x.value),
    spc:[...t.querySelectorAll('select.rsp')].map(x=>x.value)};
});
ok(t1.rows===2,'かくと自然と行が増える',t1.rows);
ok(t1.nm[0]==='屋根①'&&t1.nm[1]==='屋根②','名前は自動（屋根①・屋根②）',t1.nm);
ok(t1.kz.length===2&&t1.kz[0]==='rc','下地の列がプルダウンで出る',String(t1.kz));
ok(t1.spc.length===2&&t1.spc.some(x=>x==='AS-T1'),'仕様の列がプルダウンで出る',String(t1.spc));

/* 表のGL+で高さが変わる／行タップで選ぶ／✕で消える */
await p.evaluate(()=>{ const i=document.querySelectorAll('#nnRoofTbl .rlv')[1];
  i.value='4'; i.dispatchEvent(new Event('input',{bubbles:true}));
  i.dispatchEvent(new Event('change',{bubbles:true})); });
await p.waitForTimeout(500);
ok(await p.evaluate(()=>state.polys[1].lv)===4,'表のGL+で高さが入る');
await p.evaluate(()=>{ document.querySelector('#nnRoofTbl tr.rrow[data-pi="0"]').click(); });
await p.waitForTimeout(300);
ok(await p.evaluate(()=>state.active)===0,'行タップでその屋根が選ばれる');
await p.evaluate(()=>{ document.querySelector('#nnRoofTbl tr.rrow[data-pi="1"] .dl').click(); });
await p.waitForTimeout(400);
ok(await p.evaluate(()=>state.polys.length)===1,'✕でその屋根が消える');
await p.evaluate(()=>{ document.querySelector('#nnRoofTbl tr.radd td').click(); });
await p.waitForTimeout(300);
ok(await p.evaluate(()=>tab==='zu'&&tool==='draw'),'「＋新しい屋根を追加」＝描画モードへ');

/* ── ③ 3Dタブでも表が出る・ツールバーと重ならない ── */
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4200);
const t3=await p.evaluate(()=>{
  const t=document.getElementById('nnRoofTbl'), tb=document.getElementById('toolbar');
  const a=t.getBoundingClientRect(), b2=tb.getBoundingClientRect();
  return {vis:getComputedStyle(t).display!=='none', top:Math.round(a.top), tbBottom:Math.round(b2.bottom)};
});
ok(t3.vis,'④3Dタブでも表が出る');
ok(t3.top>=t3.tbBottom,'ツールバーの下に置かれる（重ならない）',t3);

/* ── ④ 躯体は「下にある部位の屋根」から立ち上げる ── */
await p.evaluate(()=>{ clearAll(); }); await p.waitForTimeout(400);
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();});
await p.waitForTimeout(900);
await p.evaluate(()=>{ dirty3d=true; build3D(); }); await p.waitForTimeout(600);
const B=`(idx)=>{
  let m=null; T.group.traverse(o=>{ if(o.name==='nnBody'&&o.userData.bodyIdx===idx)m=o; });
  if(!m)return null;
  m.geometry.computeBoundingBox();
  const bb=m.geometry.boundingBox;
  return {top:+m.position.y.toFixed(2), h:+(bb.max.y-bb.min.y).toFixed(2)};
}`;
const tou0=await p.evaluate(`(${B})(2)`);            /* 塔屋（GL+12）。メイン屋根は GL+9 */
ok(!!tou0 && Math.abs(tou0.h-3)<0.05,'塔屋の躯体はメイン屋根(9)から立ち上がる（高さ3m）',tou0);
/* メイン屋根を 9→3 に下げる */
await p.evaluate(()=>{ nnLvLive(0,'3',1); }); await p.waitForTimeout(800);
const tou1=await p.evaluate(`(${B})(2)`);
ok(!!tou1 && Math.abs(tou1.h-9)<0.05 && Math.abs(tou1.top-12)<0.05,
   'メイン屋根を下げても塔屋は「屋根の上に載った箱」のまま（地面からの塔にならない）',tou1);
const balc=await p.evaluate(`(${B})(1)`);            /* バルコニー：足元は別の敷地＝地面から */
ok(!!balc && Math.abs(balc.top-6)<0.05,'となりの棟は自分の高さを保つ',balc);
const mems=await p.evaluate(()=>{
  const out={}; T.group.traverse(o=>{ if(o.isMesh&&o.userData&&o.userData.polyIdx!=null)
    out[o.userData.polyIdx]=+o.position.y.toFixed(2); });
  return out;
});
ok(Math.abs(mems[1]-6.01)<0.05 && Math.abs(mems[2]-12.01)<0.05,
   '選んだ面以外の屋根の高さは1mmも変わらない',mems);

ok(errs.length===0,'JSエラーなし  '+errs.slice(0,3).join(' / '));
await p.screenshot({path:'/tmp/rtbl1.png'});
await b.close();
console.log(ng?('★NG '+ng+'件'):'全部○');
process.exit(ng?1:0);
})();
