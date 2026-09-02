/* 「きく」の🎤：Safariのタブ（PWAでない）では本物の音声認識を試す  2026-09-02h
   A) 動く端末＝聞いた文で答える（赤→答え）  B) 動かない端末＝見張りで切り替え、固まらない */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0,n=0;
function ok(t,c,x){ n++; if(!c)ng++; console.log((c?'○ ':'★NG ')+t+(x!==undefined?('  '+x):'')); }
async function scenario(b, works){
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.addInitScript(w=>{
    Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852});
    Object.defineProperty(navigator,'platform',{get:()=>'iPhone'});
    Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5});
    /* standalone は付けない＝Safariのタブ */
    window.__srStarted=0; window.NN_ASK_MICWAIT=1500;
    window.SpeechRecognition=window.webkitSpeechRecognition=function(){ var self=this;
      this.start=function(){ window.__srStarted++;
        if(!w) return;                                   /* B: 何も返さない */
        setTimeout(function(){ self.onstart&&self.onstart(); },50);
        setTimeout(function(){ self.onresult&&self.onresult({results:[[{transcript:'サン太平のOTプライマー いくら'}]]}); },400); };
      this.stop=function(){}; this.abort=function(){}; };
  }, works);
  await p.goto('http://localhost:8899/hacchu.html',{waitUntil:'load'}); await p.waitForTimeout(900);
  await p.goto('http://localhost:8899/index.html',{waitUntil:'load'}); await p.waitForTimeout(700);
  await p.evaluate(()=>localStorage.setItem('nn_materials_v1',JSON.stringify([
    {id:'x1',maker:'田島ルーフィング',n:'OTプライマーA',s:'OTプライマーA',c2:'アスファルトプライマー',
     ou:'缶',cv:16,cu:'kg',price:10800,hist:[]}])));
  await p.click('#askBtn'); await p.waitForTimeout(350);
  console.log('=== Safariのタブ／音声認識が'+(works?'動く':'動かない')+'端末 ===');
  await p.click('#nnAskMic'); await p.waitForTimeout(150);
  const m1=await p.evaluate(()=>({red:document.querySelector('#nnAskMic').classList.contains('rec'), started:window.__srStarted}));
  ok('🎤を押すと音声認識を始める（赤）', m1.red && m1.started===1, JSON.stringify(m1));
  await p.waitForTimeout(works?700:2000);
  const m2=await p.evaluate(()=>({red:document.querySelector('#nnAskMic').classList.contains('rec'),
    head:(document.querySelector('#nnAskBody .nnAns .hd')||{}).textContent||'',
    arm:document.querySelector('#nnAskMic').classList.contains('arm'), focus:document.activeElement&&document.activeElement.id}));
  if(works){
    ok('★聞き取った文でそのまま答える', /¥[0-9,]+/.test(m2.head), m2.head);
    ok('答えたら赤が消える', m2.red===false);
  }else{
    ok('★始まらなければ見張りで止めて固まらない', m2.red===false, JSON.stringify(m2));
    ok('キーボードの🎤へ案内する', /キーボード/.test(m2.head), m2.head);
    ok('待ち受け（黄）に切り替わる', m2.arm===true);
  }
  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  await p.close();
}
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
await scenario(b,true); await scenario(b,false);
console.log(ng?('★NG '+ng+' / '+n+'件'):('全部○ '+n+'件'));
await b.close();
})();
