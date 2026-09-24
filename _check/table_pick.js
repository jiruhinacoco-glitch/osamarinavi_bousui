/* スマホ（指）で表の列・行を動かす：ドラッグでは動かない／長押し→移動中の印→タップで移動（2026-09-24 本人の指示）。
   使い方: node _check/table_pick.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE=process.argv[2]||'kirokucho_demo.html';
let ng=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
  await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');localStorage.removeItem('nn_table_layout_v1');}catch(e){}});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://localhost:8899/'+PAGE);
  await p.waitForFunction(()=>document.querySelector('#dashboard table.sekou-tbl th'));await p.waitForTimeout(500);
  const heads=()=>p.evaluate(()=>[...document.querySelector('#dashboard table.sekou-tbl tr').cells].map(c=>c.textContent.trim().replace(/\s+/g,'').slice(0,6)));
  const at=(sel,i)=>p.evaluate(([sel,i])=>{const e=document.querySelectorAll(sel)[i];e.scrollIntoView({block:'center',inline:'center'});const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},[sel,i]);
  /* 指の操作を本物に近い順で送る（pointerdown→…→pointerup→click） */
  const touch=(pt,ms,dx=0,dy=0)=>p.evaluate(async([pt,ms,dx,dy])=>{const el=document.elementFromPoint(pt.x,pt.y);const o={bubbles:true,cancelable:true,pointerType:'touch',isPrimary:true,pointerId:7,button:0,buttons:1};
    el.dispatchEvent(new PointerEvent('pointerdown',{...o,clientX:pt.x,clientY:pt.y}));
    if(dx||dy){for(let i=1;i<=5;i++){await new Promise(r=>setTimeout(r,16));document.dispatchEvent(new PointerEvent('pointermove',{...o,clientX:pt.x+dx*i/5,clientY:pt.y+dy*i/5}));}}
    await new Promise(r=>setTimeout(r,ms));
    const up=document.elementFromPoint(pt.x+dx,pt.y+dy)||el;up.dispatchEvent(new PointerEvent('pointerup',{...o,buttons:0,clientX:pt.x+dx,clientY:pt.y+dy}));
    if(!dx&&!dy)up.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:pt.x,clientY:pt.y}));},[pt,ms,dx,dy]);
  const h0=await heads();
  // ① 指でドラッグ（すぐ動かす）→ 何も入れ替わらない
  const a=await at('#dashboard table.sekou-tbl tr:first-child th',1);
  await touch(a,60,120,0);await p.waitForTimeout(300);
  ok(JSON.stringify(await heads())===JSON.stringify(h0),'指でドラッグしても列は入れ替わらない');
  // ② 短いタップでは選ばれない
  await touch(await at('#dashboard table.sekou-tbl tr:first-child th',1),80);await p.waitForTimeout(200);
  ok(await p.evaluate(()=>!document.querySelector('.nn-pick-src')),'短いタップでは選ばれない');
  // ③ 長押し → 移動中の印
  await touch(await at('#dashboard table.sekou-tbl tr:first-child th',1),650);await p.waitForTimeout(500);
  const mark=await p.evaluate(()=>{const s=document.querySelector('.nn-pick-src');return s?{txt:s.textContent.trim().slice(0,4),bg:getComputedStyle(s).backgroundColor,table:s.closest('table').classList.contains('nn-picking')}:null;});
  ok(!!mark&&mark.table&&mark.bg==='rgb(255, 224, 122)','長押しで選ばれ、移動中の印が出る '+JSON.stringify(mark));
  // ④ 移動先をタップ → 入れ替わる
  await p.tap('#dashboard table.sekou-tbl tr:first-child th:nth-child(5)');await p.waitForTimeout(300);
  const h1=await heads();
  ok(h1[4]===h0[1]&&h1.indexOf(h0[1])===4,'移動先をタップで列が移動する '+h0.join(',')+' → '+h1.join(','));
  ok(await p.evaluate(()=>!document.querySelector('.nn-pick-src')),'移動後は印が消える');
  // ⑤ 行：長押し→別の行をタップ
  const rows=()=>p.evaluate(()=>[...document.querySelectorAll('#dashboard table.sekou-tbl tr')].slice(1).map(r=>r.cells[0].textContent.trim().slice(0,6)));
  const r0=await rows();
  await touch(await at('#dashboard table.sekou-tbl tr:nth-child(2) td',0),650);await p.waitForTimeout(500);
  const url0=p.url();
  await p.tap('#dashboard table.sekou-tbl tr:nth-child(4) td:nth-child(2)');await p.waitForTimeout(400);
  const r1=await rows();
  ok(r1.indexOf(r0[0])===2,'行も長押し→タップで移動する '+r0.slice(0,3).join(',')+' → '+r1.slice(0,3).join(','));
  ok(p.url()===url0&&await p.evaluate(()=>typeof view==='undefined'||view==='dash'),'移動先のタップで物件の画面へ飛ばない');
  // ⑥ 選んだものをもう一度タップで取り消し
  await touch(await at('#dashboard table.sekou-tbl tr:first-child th',2),650);await p.waitForTimeout(500);
  const h2=await heads();
  await p.tap('#dashboard table.sekou-tbl tr:first-child th:nth-child(3)');await p.waitForTimeout(200);
  ok(await p.evaluate(()=>!document.querySelector('.nn-pick-src'))&&JSON.stringify(await heads())===JSON.stringify(h2),'同じ所をもう一度タップで取り消し（何も動かない）');
  ok(!errs.length,'実行エラーなし '+errs.join(' | '));
  await b.close();console.log(ng?'★NG '+ng+'件':'全項目○');
})();
