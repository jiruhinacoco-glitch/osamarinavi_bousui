/* 2画面（作図＋リアルタイム3D）：ニセTHREEで build3D が呼ばれることまで確認 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(s=>{window.__STUB=s;}, '('+require('./stub3.js').toString()+')()');
// vendor/three.min.js の読み込みを、ニセTHREEを入れるだけの空応答に差し替える
await p.route('**/vendor/three.min.js', r=>r.fulfill({contentType:'application/javascript', body:'eval(window.__STUB); window.__buildCount=0;'}));
await p.goto('file:///home/user/osamarinavi_bousui/zumen_sekisan.html'); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});

// build3D の呼び出し回数を数える
await p.evaluate(()=>{ const f=window.build3D; window.build3D=function(){ window.__buildCount=(window.__buildCount||0)+1; return f.apply(this,arguments); }; });

const st0=await p.evaluate(()=>({split:document.body.classList.contains('nnsplit2'),
  btn:!!document.getElementById('tl_2pane')}));
ok(st0.btn,'「⿻ 2画面」ボタンがある');
ok(!st0.split,'最初は2画面OFF');

// ONにする
await p.evaluate(()=>nnSplitToggle()); await p.waitForTimeout(800);
const st1=await p.evaluate(()=>{
  const tw=document.getElementById('three-wrap'); const r=tw.getBoundingClientRect();
  const cv=document.getElementById('cv'); const cr=cv.getBoundingClientRect();
  const wrap=document.getElementById('canvaswrap').getBoundingClientRect();
  return {split:document.body.classList.contains('nnsplit2'),
    twVisible:getComputedStyle(tw).display==='block',
    twTopRatio:(r.top-wrap.top)/wrap.height, cvHRatio:cr.height/wrap.height,
    cvBufMatch: Math.abs(cv.height-cr.height*devicePixelRatio)<3,
    builds:window.__buildCount||0, on:document.getElementById('tl_2pane').classList.contains('on')};
});
ok(st1.split&&st1.twVisible,'ONで下に3Dが出る');
ok(Math.abs(st1.twTopRatio-0.56)<0.03,'3Dは下44%', st1.twTopRatio.toFixed(2));
ok(Math.abs(st1.cvHRatio-0.56)<0.03,'作図は上56%', st1.cvHRatio.toFixed(2));
ok(st1.cvBufMatch,'作図キャンバスの画素数が新しい高さに合っている');
ok(st1.builds>=1,'ONにした時点で3Dが組み上がる', st1.builds);
ok(st1.on,'ボタンが緑（ON表示）');

// 図形をかくと自動で3Dが組み直される（サンプル読み込み→全削除→再度）
const c0=await p.evaluate(()=>window.__buildCount);
await p.evaluate(()=>loadSample()); await p.waitForTimeout(900);
const c1=await p.evaluate(()=>window.__buildCount);
ok(c1>c0,'図形が変わると3Dが自動で組み直る', c0+' → '+c1);

// 連打しても1回にまとまる（debounce）
await p.evaluate(()=>{ for(let i=0;i<5;i++)commit(); });
await p.waitForTimeout(900);
const c2=await p.evaluate(()=>window.__buildCount);
ok(c2-c1<=1,'連続の変更は1回にまとまる', (c2-c1)+'回');

// ④3Dタブへ → 全画面。②割付 → 2画面のまま。③断面 → 2画面解除
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(400);
const d3=await p.evaluate(()=>{
  const tw=document.getElementById('three-wrap'); const r=tw.getBoundingClientRect();
  const wrap=document.getElementById('canvaswrap').getBoundingClientRect();
  return {split:document.body.classList.contains('nnsplit2'), top:(r.top-wrap.top)/wrap.height};});
ok(!d3.split && d3.top<0.02,'④3Dタブでは全画面に戻る', d3.top.toFixed(2));
await p.evaluate(()=>setTab('wf')); await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.body.classList.contains('nnsplit2')),'②割付でも2画面が効く');
await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(400);
ok(!await p.evaluate(()=>document.body.classList.contains('nnsplit2')),'③断面では2画面にしない');
await p.evaluate(()=>setTab('zu')); await p.waitForTimeout(300);

// OFFに戻す → 保存される
await p.evaluate(()=>nnSplitToggle()); await p.waitForTimeout(300);
const off=await p.evaluate(()=>({split:document.body.classList.contains('nnsplit2'),
  ls:localStorage.getItem('nn_zumen_split')}));
ok(!off.split&&off.ls==='0','OFFに戻せて保存される', off.ls);
// ONにして再読み込み → 復元
await p.evaluate(()=>nnSplitToggle()); await p.waitForTimeout(200);
await p.reload(); await p.waitForTimeout(1600); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.body.classList.contains('nnsplit2')),'再読み込みでも2画面が復元される');

ok(errs.length===0,'JSエラーなし', errs.join(' | ').slice(0,300));
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
