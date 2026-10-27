/* ★2026-10-27f 本人「音が出る時と出ない時がある。もっとシンプルな音」の検証
   ボタンの音（tapSound）が、ナビの音と同じ「起こす・作り直す」対策入りの装置で鳴るか。
   ★直す前は、ボタンだけ対策なしの別の装置を作っていた
     → 止まったままの装置（電話の割り込み等）では永久に無音だった。
   ニセの音の装置（AudioContext）で3つの場面を再現する：
   ①装置は1つだけ（ボタン用に別の装置を作らない）・止まっていても鳴る予約が入る
   ②死んだ装置：1秒後の次のボタンで作り直され、動いている装置で鳴る
   ③音はシンプルな1音（1回のタップで発振器1つ）・ナビの音と同じ高さ
   使い方: node _check/btnsnd.js [ページ名.html ...]（省略時はボタン音のある10ページ）
   ※ http://localhost:8899 で配信しておくこと */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const PAGES=process.argv.slice(2).length?process.argv.slice(2):
  ['index','kirokucho_demo','zumen_sekisan','hacchu','kokkosho','camera','library','shiyo_toroku','yougo','zairyo_toroku'].map(s=>s+'.html');
const INIT=()=>{
  window.__ac={made:0, closed:0, osc:[], mode:'wake', freshRuns:false};
  function FakeCtx(){
    this.id=++window.__ac.made;
    this.state = window.__ac.freshRuns ? 'running' : 'suspended';
    this.currentTime=0; this.destination={};
  }
  FakeCtx.prototype.createBuffer=function(){ return {}; };
  FakeCtx.prototype.createBufferSource=function(){ return {connect:function(){return {};}, start:function(){}, buffer:null}; };
  FakeCtx.prototype.createOscillator=function(){
    const c=this, o={type:'', f:0, frequency:{setValueAtTime:function(v){ o.f=v; }},
      connect:function(g){return g;}, start:function(){ window.__ac.osc.push({ctx:c.id, st:c.state, f:o.f, ctxObj:c}); }, stop:function(){}};
    return o;
  };
  FakeCtx.prototype.createGain=function(){
    return {gain:{setValueAtTime:function(){},exponentialRampToValueAtTime:function(){}},
      connect:function(d){return d;}};
  };
  FakeCtx.prototype.resume=function(){
    const c=this;
    if(window.__ac.mode==='stuck') return new Promise(function(){});  /* 永遠に起きない */
    return new Promise(function(res){ setTimeout(function(){ c.state='running'; res(); },50); });
  };
  FakeCtx.prototype.close=function(){ window.__ac.closed++; this.state='closed'; };
  window.AudioContext=FakeCtx; window.webkitAudioContext=FakeCtx;
};
/* ナビ以外のふつうのボタンを1つ置いて、そこを押す（押しても画面は変わらない） */
const TAP=()=>{
  let b=document.getElementById('__sndbtn');
  if(!b){ b=document.createElement('button'); b.id='__sndbtn'; b.textContent='テスト';
    b.style.cssText='position:fixed;left:10px;top:200px;z-index:99999'; document.body.appendChild(b); }
  b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}));
};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const pg of PAGES){
    const url='http://localhost:8899/'+pg;
    const mk=async()=>{ const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
      await p.addInitScript(INIT); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
      await p.goto(url); await p.waitForTimeout(700); return {p,errs}; };

    /* ① 止まった装置で1回目のボタン */
    let {p,errs}=await mk();
    await p.evaluate(TAP);
    let st=await p.evaluate(()=>({made:window.__ac.made, osc:window.__ac.osc.length}));
    ok(pg+' ①ボタン用に別の装置を作らない（装置は1つ）', st.made===1, JSON.stringify(st));
    ok(pg+' ①止まっていても1回目のボタンで鳴る予約が入る', st.osc>=1, JSON.stringify(st));
    await p.waitForTimeout(250);
    await p.evaluate(()=>{ window.__ac.osc=[]; });
    await p.evaluate(TAP); await p.waitForTimeout(50);
    st=await p.evaluate(()=>{ const o=window.__ac.osc; const f1=o.map(x=>x.f);
      window.__ac.osc=[]; if(window.nnMoveSound) nnMoveSound();
      return {n:o.length, f:f1, nav:window.__ac.osc.map(x=>x.f)}; });
    ok(pg+' ③1回のタップで1音だけ（シンプル）', st.n===1, JSON.stringify(st));
    ok(pg+' ③ボタンとナビが同じ音', st.nav.length===1 && st.f[0]===st.nav[0], JSON.stringify(st));
    const e1=errs; await p.close();

    /* ② 死んだ装置：次のボタンで作り直して鳴る */
    ({p,errs}=await mk());
    await p.evaluate(()=>{ window.__ac.mode='stuck'; });
    await p.evaluate(TAP);
    await p.waitForTimeout(1200);
    await p.evaluate(()=>{ window.__ac.freshRuns=true; window.__ac.osc=[]; });   /* 操作の中で作り直した装置は動く（iOSの実挙動） */
    await p.evaluate(TAP);
    st=await p.evaluate(()=>({made:window.__ac.made, closed:window.__ac.closed,
      osc:window.__ac.osc.map(x=>({ctx:x.ctx, st:x.ctxObj.state}))}));
    ok(pg+' ②死んだ装置は次のボタンで作り直され、動く装置で鳴る',
       st.closed>=1 && st.osc.length>=1 && st.osc.every(x=>x.st==='running'), JSON.stringify(st));
    ok(pg+' JSエラーなし', e1.length===0 && errs.length===0, e1.concat(errs).join(' / ').slice(0,200));
    await p.close();
  }
  console.log(R.join('\n'));
  await b.close();
})();
