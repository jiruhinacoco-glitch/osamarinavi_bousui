/* ★2026-08-26b 「タップ音がちゃんと作動しないことがある」の検証
   ニセの音の装置（AudioContext）を差し込んで3つの場面を再現する：
   ①ふつうに起きる装置 … タップで鳴る
   ②止まったまま起きるのが遅い装置 … 「鳴る予約」が先に入る（起きた瞬間に鳴る）
   ③起こしても動かない装置（電話の割り込み等で死んだ） … 1秒後の次のタップで
     装置を作り直して鳴る（★修正前はここが永久に無音だった）
   使い方: node _check/sndfix.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const INIT=()=>{
  window.__ac={made:0, closed:0, osc:0, mode:'wake', freshRuns:false};
  function FakeCtx(){
    window.__ac.made++;
    this.state = window.__ac.freshRuns ? 'running' : 'suspended';
    this.currentTime=0; this.destination={};
  }
  FakeCtx.prototype.createBuffer=function(){ return {}; };
  FakeCtx.prototype.createBufferSource=function(){ return {connect:function(){return {};}, start:function(){}, buffer:null}; };
  FakeCtx.prototype.createOscillator=function(){
    return {type:'', frequency:{setValueAtTime:function(){}},
      connect:function(g){return g;}, start:function(){ window.__ac.osc++; }, stop:function(){}};
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
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});

  /* --- ① ふつうに起きる装置：タップで鳴る --- */
  let p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(INIT);
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/index.html'); await p.waitForTimeout(900);
  await p.evaluate(()=>{ document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); });
  await p.waitForTimeout(150);   /* 50msで起きる */
  let st=await p.evaluate(()=>{ const r=nnMoveSound(); return {r, osc:window.__ac.osc, made:window.__ac.made}; });
  ok('①起きた装置ならタップですぐ鳴る', st.r===true && st.osc>=1, JSON.stringify(st));

  /* --- ② 起きるのが遅い装置：鳴る予約が先に入る --- */
  await p.evaluate(()=>{ window.__ac.osc=0; });
  p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(INIT);
  await p.goto('http://localhost:8899/index.html'); await p.waitForTimeout(900);
  st=await p.evaluate(()=>{ const r=nnMoveSound();   /* 装置はまだ止まっている */
    return {r, oscQueued:window.__ac.osc}; });
  ok('②止まっていても「鳴る予約」が先に入る（起きた瞬間に鳴る）',
     st.r===false && st.oscQueued>=1, JSON.stringify(st));
  await p.waitForTimeout(150);
  st=await p.evaluate(()=>nnMoveSound.toString().length>0 && window.__ac.osc>=1);
  ok('②予約のあと装置が起きても二重には鳴らない', await p.evaluate(()=>window.__ac.osc===1),
     await p.evaluate(()=>window.__ac.osc));

  /* --- ③ 死んだ装置：次のタップで作り直して鳴る --- */
  const p3=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p3.addInitScript(INIT);
  const errs3=[]; p3.on('pageerror',e=>errs3.push(e.message));
  await p3.goto('http://localhost:8899/index.html'); await p3.waitForTimeout(900);
  await p3.evaluate(()=>{ window.__ac.mode='stuck';
    document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); });  /* 1回目：起こすが死んでいる */
  await p3.waitForTimeout(1200);
  st=await p3.evaluate(()=>{ window.__ac.freshRuns=true;   /* 操作の中で作り直した装置は動く（iOSの実挙動） */
    document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));      /* 2回目：作り直しが走る */
    const r=nnMoveSound();
    return {r, made:window.__ac.made, closed:window.__ac.closed, osc:window.__ac.osc}; });
  ok('③死んだ装置は1秒後のタップで作り直される（closeして新しく作る）',
     st.made>=2 && st.closed>=1, JSON.stringify(st));
  ok('③作り直した装置で音が鳴る', st.r===true && st.osc>=1, JSON.stringify(st));
  ok('JSエラーなし', errs.length===0 && errs3.length===0, errs.concat(errs3).join(' / '));
  console.log(R.join('\n'));
  await b.close();
})();
