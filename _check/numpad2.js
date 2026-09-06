/* スマホの数値入力＝自前のキーパッド（§307）
   本人の指摘「操作画面が埋まるとかありえない。こんなに押しにくい数字ボタンはない」
   使い方： node _check/numpad2.js（たて） ／ land（よこ） ／ pc（パソコンは今までどおり） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const M=process.argv[2]||'ph';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const VP={ph:{width:393,height:852}, land:{width:852,height:393}, pc:{width:1400,height:900}}[M];
const p=await b.newPage(M==='pc'?{viewport:VP}:{viewport:VP,deviceScaleFactor:2,isMobile:true,hasTouch:true});
if(M!=='pc') await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/zumen_sekisan.html');
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.waitForTimeout(800);

if(M==='pc'){
  const r=await p.evaluate(()=>{ nnNumAsk('てすと',300,()=>{});
    return {old:!!document.querySelector('#nnNumDlg.open'), pad:!!document.querySelector('#nnPad2.open')}; });
  ok(r.old&&!r.pad, 'パソコンは今までどおりの小窓（キーパッドは出さない）', r);
  ok(errs.length===0,'JSエラーなし',errs);
  console.log(ng?('★NG '+ng+'件'):'すべて○'); await b.close(); process.exit(ng?1:0);
}

/* 開く */
const r=await p.evaluate(()=>new Promise(res=>{
  window.__got='(まだ)';
  nnNumAsk('押出しの奥行き（mm）', 300, v=>{ window.__got=v; });
  setTimeout(()=>{
    const e=document.getElementById('nnPad2'), R=e.getBoundingClientRect();
    const ks=[].map.call(e.querySelectorAll('.g button'),b=>({k:b.dataset.k,
      w:Math.round(b.getBoundingClientRect().width), h:Math.round(b.getBoundingClientRect().height)}));
    const kb=!!document.querySelector('#nnNumDlg.open');
    res({open:e.classList.contains('open'), oldDlg:kb, focus:document.activeElement&&document.activeElement.tagName,
      box:{x:Math.round(R.x),y:Math.round(R.y),w:Math.round(R.width),h:Math.round(R.height)},
      keys:ks.length, minH:Math.min.apply(null,ks.map(k=>k.h)), minW:Math.min.apply(null,ks.map(k=>k.w)),
      val:e.querySelector('.v').textContent, vw:innerWidth, vh:innerHeight});
  }, 350);
}));
ok(r.open, '① スマホでは自前のキーパッドが開く');
ok(!r.oldDlg, '① 前の小窓（iPhoneのキーボードが出るほう）は開かない');
ok(r.focus!=='INPUT', '① 入力欄に focus しない＝端末のキーボードは出ない', r.focus);
ok(r.val==='300', '① いまの値が入っている', r.val);
ok(r.keys===16, '② キーは16個（0-9・.・⌫・±・OK・やめる・全消し）', r.keys);
ok(r.minH>=44, '② どのキーも高さ44px以上（指で押せる）', r.minH);
ok(r.minW>=60, '② どのキーも幅60px以上', r.minW);
/* 作図面が見えたままか＝画面の半分より小さい */
const area=r.box.w*r.box.h, scr=r.vw*r.vh;
ok(area/scr<0.55, '③ 画面を埋めない（'+Math.round(area/scr*100)+'%）', {box:r.box, 画面:[r.vw,r.vh]});
if(M==='land') ok(r.box.x>r.vw*0.5, '③ よこ向きは右はし（左に作図面が残る）', r.box.x);
else           ok(r.box.y>r.vh*0.4, '③ たて向きは下（上に作図面が残る）', r.box.y);

/* 打って OK */
await p.evaluate(()=>{ const e=document.getElementById('nnPad2');
  const hit=k=>{ const b=e.querySelector('button[data-k="'+k+'"]');
    b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:3})); };
  hit('cl'); hit('4'); hit('5'); hit('0'); hit('ok');
});
await p.waitForTimeout(200);
const got=await p.evaluate(()=>({v:window.__got, open:!!document.querySelector('#nnPad2.open')}));
ok(got.v==='450', '④ 打った数字がそのまま返る', got.v);
ok(!got.open, '④ OKで閉じる');
/* やめる＝null */
await p.evaluate(()=>{ window.__got='(まだ)'; nnNumAsk('てすと', 12, v=>{ window.__got=v; }); });
await p.waitForTimeout(250);
await p.evaluate(()=>{ const e=document.getElementById('nnPad2');
  e.querySelector('button[data-k="ng"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:4})); });
await p.waitForTimeout(200);
ok(await p.evaluate(()=>window.__got===null), '④ やめる＝取り消し（null）');
/* ⌫と± */
await p.evaluate(()=>{ window.__got='(まだ)'; nnNumAsk('てすと', 123, v=>{ window.__got=v; }); });
await p.waitForTimeout(250);
await p.evaluate(()=>{ const e=document.getElementById('nnPad2');
  const hit=k=>e.querySelector('button[data-k="'+k+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:5}));
  hit('bs'); hit('pm'); hit('ok'); });
await p.waitForTimeout(200);
ok(await p.evaluate(()=>window.__got)==='-12', '④ ⌫と±が効く', await p.evaluate(()=>window.__got));

ok(errs.length===0, 'JSエラーなし', errs);
console.log(ng?('★NG '+ng+'件'):'すべて○');
await b.close();
process.exit(ng?1:0);
})();
