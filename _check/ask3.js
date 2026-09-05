/* 「きく」：画面のボタンが全部ちゃんと効くか（iPhoneを再現）  2026-09-02f
   ★スクショで「🎤が赤いまま固まる／ボタンが反応しない」と指摘された件の検査。 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const DARK=process.argv[2]==='dark';
let ng=0,n=0;
function ok(t,c,x){ n++; if(!c)ng++; console.log((c?'○ ':'★NG ')+t+(x!==undefined?('  '+x):'')); }
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true,
  colorScheme:DARK?'dark':'light'});
const errs=[]; p.on('pageerror',e=>errs.push(''+e));
/* ★iPhone を名乗り、SpeechRecognition は「始まるが何も返さない」ニセ物にする（実機と同じ状態） */
await p.addInitScript(()=>{
  Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852});
  Object.defineProperty(navigator,'platform',{get:()=>'iPhone'});
  Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5});
  Object.defineProperty(navigator,'standalone',{get:()=>true});   /* ホーム画面から起動（PWA） */
  window.__srStarted=0;
  window.SpeechRecognition=window.webkitSpeechRecognition=function(){ this.start=function(){ window.__srStarted++; };
    this.stop=function(){}; this.abort=function(){}; };   /* 何も返さない＝実機の固まる状態 */
});
console.log('=== iPhone（ホーム画面から起動）'+(DARK?'（夜モード）':'')+' ===');
await p.goto('http://localhost:8899/hacchu.html',{waitUntil:'load'}); await p.waitForTimeout(900);
await p.goto('http://localhost:8899/index.html',{waitUntil:'load'}); await p.waitForTimeout(700);
await p.evaluate(()=>localStorage.setItem('nn_materials_v1',JSON.stringify([
  {id:'x1',maker:'田島ルーフィング',n:'OTプライマーA',s:'OTプライマーA',c2:'アスファルトプライマー',
   ou:'缶',cv:16,cu:'kg',price:10800,hist:[{d:'2026-04-01',p:10600}]}])));
await p.click('#askBtn'); await p.waitForTimeout(350);
ok('「きく」が開く', await p.evaluate(()=>!!document.querySelector('#nnAsk.on')));

/* ① 🎤：iPhoneでは音声認識を始めない（赤くならない・案内が出る） */
const before=await p.evaluate(()=>document.querySelectorAll('#nnAskBody .nnAns').length);
await p.click('#nnAskMic'); await p.waitForTimeout(400);
const m=await p.evaluate(()=>({red:document.querySelector('#nnAskMic').classList.contains('rec'),
  started:window.__srStarted, cards:document.querySelectorAll('#nnAskBody .nnAns').length,
  head:(document.querySelector('#nnAskBody .nnAns .hd')||{}).textContent||'', st:(document.querySelector('#nnAskLive .st')||{}).textContent||'',
  focus:document.activeElement && document.activeElement.id}));
ok('★🎤が赤いまま固まらない', m.red===false, JSON.stringify(m));
ok('★iPhoneのPWAでは音声認識を始めない', m.started===0, 'start回数='+m.started);
ok('★キーボードのマイクに案内する（舞台の文字・2026-09-05）', /キーボード/.test(m.st), m.st);
ok('入力欄にカーソルが入る', m.focus==='nnAskIn', m.focus);
/* ★2026-09-05 案内はカードではなく舞台（🎤の横）に出す。質問の場に説明を積み上げない */
ok('案内は舞台に出る（矢印つき）・カードは増えない', await p.evaluate(()=>/キーボード右下/.test(document.querySelector('#nnAskLive .st').textContent) && !!document.querySelector('#nnAskLive .arrow') && document.querySelectorAll('#nnAskBody .nnAns.tip').length===0));
/* 🎤をもう一度押しても案内は1枚だけ（前は押すたびに増えていた） */
await p.click('#nnAskMic'); await p.waitForTimeout(300);
ok('★もう一度押しても案内カードは増えない', await p.evaluate(()=>document.querySelectorAll('#nnAskBody .nnAns.tip').length===0 && /キーボード右下/.test(document.querySelector('#nnAskLive .st').textContent)));
ok('待ち受け中は🎤が黄色', await p.evaluate(()=>document.querySelector('#nnAskMic').classList.contains('arm')));
/* ★キーボードの🎤で入れた文は「きく」を押さなくても答える（1.4秒の間） */
await p.evaluate(()=>{ window.__spk=[]; const o=speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak=u=>{ window.__spk.push(u.text); try{o(u);}catch(_){} }; });
await p.type('#nnAskIn','サン太平のOTプライマー いくら'); await p.waitForTimeout(2000);
const auto=await p.evaluate(()=>({head:(document.querySelector('#nnAskBody .nnAns .hd')||{}).textContent||'',
  arm:document.querySelector('#nnAskMic').classList.contains('arm'), spk:window.__spk}));
ok('★話し終わって待つだけで答えが出る（「きく」不要）', /¥10,500/.test(auto.head), auto.head);
ok('答えたら待ち受けが解ける', auto.arm===false);
ok('答えは声にも渡る', auto.spk.length>=1 && /円です/.test(auto.spk.join('')), JSON.stringify(auto.spk));

/* ② 例のボタン（4つとも見えていて、押すと答えが出る） */
const ex=await p.evaluate(()=>{
  const bs=[...document.querySelectorAll('#nnAskEx button')];
  const w=innerWidth;
  return {n:bs.length, cut:bs.filter(b=>b.getBoundingClientRect().right>w+1).length,
          txt:bs.map(b=>b.textContent)};
});
/* ★2026-09-04j 例は分野ごと（お金／日程／現場／材料／連絡先）。いま出ている分野の例が全部見える */
ok('例のボタンが3つ以上ある', ex.n>=3, JSON.stringify(ex.txt));
ok('★例のボタンが右で切れない（折り返す）', ex.cut===0, '切れている数='+ex.cut);
await p.click('#nnAskEx button:nth-child(1)'); await p.waitForTimeout(400);
const a1=await p.evaluate(()=>(document.querySelector('#nnAskBody .nnAns .hd')||{}).textContent||'');
ok('★例のボタンを押すと答えが出る', /¥|入金予定|円|件/.test(a1), a1);

/* ③ 打って「きく」を押す */
await p.fill('#nnAskIn','サン太平のOTプライマー いくら？');
await p.click('#nnAskGo'); await p.waitForTimeout(400);
const a2=await p.evaluate(()=>(document.querySelector('#nnAskBody .nnAns .hd')||{}).textContent||'');
ok('★打って「きく」で答えが出る', /¥10,500/.test(a2), a2);

/* ④ 読み上げの入切 */
ok('読み上げは既定でオン', await p.evaluate(()=>document.querySelector('#nnAskSpk').classList.contains('on')));
await p.click('#nnAskSpk'); await p.waitForTimeout(150);
ok('押すとオフにできる', await p.evaluate(()=>!document.querySelector('#nnAskSpk').classList.contains('on')));
await p.click('#nnAskSpk'); await p.waitForTimeout(150);
ok('もう一度押すとオンに戻る', await p.evaluate(()=>document.querySelector('#nnAskSpk').classList.contains('on')));

/* ⑤ 文字が読めるか（夜モードで見出しが沈んでいないか） */
const con=await p.evaluate(()=>{
  const e=document.querySelector('#nnAskBody .nnAns.tip .hd')||document.querySelector('#nnAskBody .nnAns .hd');
  if(!e) return null;
  const c=getComputedStyle(e).color, bg=getComputedStyle(e.closest('.nnAns')).backgroundColor;
  const rgb=s=>(s.match(/[\d.]+/g)||[0,0,0]).slice(0,3).map(Number);
  const L=a=>{const f=a.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});
    return .2126*f[0]+.7152*f[1]+.0722*f[2];};
  const l1=L(rgb(c)), l2=L(rgb(bg));
  return +(((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)).toFixed(2));
});
ok('★見出しが背景に沈んでいない（読める）', con!==null && con>=4.5, 'コントラスト比='+con);

/* ⑥ ボタンが指で押せる大きさ（44pt以上／小さいものも28pt以上） */
const sz=await p.evaluate(()=>['#nnAskMic','#nnAskGo','#nnAskX','#nnAskSpk'].map(s=>{
  const e=document.querySelector(s), r=e.getBoundingClientRect();
  return {s:s, w:Math.round(r.width), h:Math.round(r.height)};}));
ok('主なボタンが押せる大きさ', sz.every(x=>x.h>=28 && x.w>=28), JSON.stringify(sz));

/* ⑦ 閉じる → もう一度開く（赤が残っていない） */
await p.click('#nnAskX'); await p.waitForTimeout(200);
ok('✕で閉じる', await p.evaluate(()=>!document.querySelector('#nnAsk.on')));
await p.click('#askBtn'); await p.waitForTimeout(250);
ok('★開き直しても🎤は赤くない', await p.evaluate(()=>!document.querySelector('#nnAskMic').classList.contains('rec')));

ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
console.log(ng?('★NG '+ng+' / '+n+'件'):('全部○ '+n+'件'));
await b.close();
})();
