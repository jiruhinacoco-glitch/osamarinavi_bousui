/* 図面：📐寸法で入れる 4回目＝🎤声で入れる（2026-10-25g）
   ①聞き取った文字 → 数字（m）の読み方を、いろいろな言い方で確かめる（答えは表に手で書いた値）
   ②音声認識の「ふり」をする部品を差し込み、🎤を押す→言葉が届く→辺に数字が入る までを通しで（長方形・一周）
   ③対応していないブラウザでは、赤い知らせが出て落ちない ④JSエラーなし
   使い方: node _check/dimvoice.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
const CASES=[
  ['5メートル20',[5.2]], ['5メートル2',[5.2]], ['5メートル',[5]], ['5m20cm',[5.2]], ['5 M 20',[5.2]], ['５メートル２０',[5.2]],
  ['五メートル二十',[5.2]], ['60センチ',[0.6]], ['1250ミリ',[1.25]], ['千二百五十ミリ',[1.25]], ['1,250mm',[1.25]],
  ['5点2',[5.2]], ['5.25',[5.25]], ['5200',[5.2]], ['12メートル5',[12.5]], ['3メートル 4メートル',[3,4]], ['3m4cm',[3.04]]
];
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  /* 音声認識のふり：start() したら window.__say の言葉を「最終結果」として返す */
  await p.addInitScript(()=>{ window.__say=''; window.webkitSpeechRecognition=function(){ const me=this;
    me.start=function(){ setTimeout(()=>{ const alt={transcript:window.__say, confidence:0.9}; const r=[alt]; r.isFinal=true;
      me.onresult&&me.onresult({results:[r]}); me.onend&&me.onend(); },50); };
    me.stop=function(){ me.onend&&me.onend(); }; }; window.SpeechRecognition=window.webkitSpeechRecognition; });
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof nnZMenuClose==='function'&&typeof nnDimParseVoice==='function');
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(e){} state.polys=[]; state.scaleM=0.5; draw(); });
  const got=await p.evaluate(C=>C.map(([t])=>nnDimParseVoice(t).map(x=>x.m)),CASES);
  const bad=CASES.filter((c,i)=>JSON.stringify(got[i])!==JSON.stringify(c[1])).map((c,i)=>c[0]+'→'+JSON.stringify(got[CASES.indexOf(c)]));
  ok(!bad.length,'①聞き取った文字を数字に読む（'+CASES.length+'通り）',bad);
  const dirs=await p.evaluate(()=>nnDimParseVoice('右5メートル 下3メートル20 左 2メートル').map(x=>x.d+x.m).join(','));
  ok(dirs==='R5,D3.2,L2','①向きの言葉（右・下・左）も読む',dirs);
  /* ② 長方形 */
  await p.evaluate(()=>nnDimInOpen()); await p.waitForSelector('#nnDimIn.on');
  await p.tap('#nnDimIn [data-s="rect"]');
  await p.evaluate(()=>{ window.__say='10メートル 8メートル50'; });
  await p.tap('#nnDimMic');
  await p.waitForFunction(()=>nnDimArea.textContent!=='—',null,{timeout:3000}).catch(()=>{});
  let u=await p.evaluate(()=>({a:nnDimArea.textContent, h:nnDimHeard.textContent}));
  ok(u.a==='85.00㎡'&&/10\.00m・8\.50m/.test(u.h),'②長方形：「10メートル 8メートル50」で辺A・Bが入り 85㎡',u);
  await p.screenshot({path:(process.env.SHOT||'/tmp/dimvoice')+'_1.png'});
  /* ② 一周 */
  await p.tap('#nnDimIn [data-s="walk"]');
  await p.evaluate(()=>{ window.__say='右6メートル 下4メートル 左6メートル'; });
  await p.tap('#nnDimMic');
  await p.waitForFunction(()=>nnDimArea.textContent!=='—',null,{timeout:3000}).catch(()=>{});
  u=await p.evaluate(()=>({a:nnDimArea.textContent, h:nnDimHeard.textContent, lb:nnDimLbl.textContent}));
  ok(u.a==='24.00㎡'&&/→6\.00m・↓4\.00m・←6\.00m/.test(u.h),'②一周：「右6メートル 下4メートル 左6メートル」で3辺→残りは自動で24㎡',u);
  await p.screenshot({path:(process.env.SHOT||'/tmp/dimvoice')+'_2.png'});
  await p.evaluate(()=>{ window.__say='こんにちは'; }); await p.tap('#nnDimMic'); await p.waitForTimeout(300);
  u=await p.evaluate(()=>({h:nnDimHeard.textContent, bad:nnDimHeard.classList.contains('bad'), a:nnDimArea.textContent}));
  ok(u.bad&&u.a==='24.00㎡','②数字でない言葉は赤い知らせ・入れた辺はそのまま',u);
  /* ③ 対応していないブラウザ */
  const p2=await ctx.newPage(); p2.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  await p2.addInitScript(()=>{ try{ delete window.webkitSpeechRecognition; delete window.SpeechRecognition; }catch(e){} window.webkitSpeechRecognition=undefined; window.SpeechRecognition=undefined; });
  await p2.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
  await p2.waitForFunction(()=>typeof nnZMenuClose==='function'); await p2.evaluate(()=>{ nnZMenuClose(); nnDimInOpen(); });
  await p2.tap('#nnDimMic'); await p2.waitForTimeout(200);
  u=await p2.evaluate(()=>({h:nnDimHeard.textContent, bad:nnDimHeard.classList.contains('bad')}));
  ok(u.bad&&/対応していません/.test(u.h),'③声の入力に対応していないブラウザでは赤い知らせ',u);
  ok(!errs.length,'④JSエラーなし',errs.slice(0,2));
  await b.close(); console.log(ng?'★NG '+ng+'件':'全項目○');
})().catch(e=>{console.log('★NG 実行エラー '+String(e.message||e).split('\n')[0]);process.exit(1);});
