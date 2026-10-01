/* 現場記録帳ダッシュボード：主要枠の上下の間隔が、どの枠も 12px でそろっているか（本人の指示 2026-10-02「一定間隔で表示」）。
   直す前の版では ①標準の並びで「予実」と「受注率」の間が 70px（要対応が2段またぎで余った高さを配る）、
   ③自由配置で「予実」を畳むと、下の枠が元の位置に残って間が空く → どちらも★NG。
   検算は枠の getBoundingClientRect だけで行い、dashboard_layout.js の関数は使わない。
   使い方: node _check/dashgap.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE=process.argv[2]||'kirokucho_demo.html';
let ng=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m); if(!c)ng++;};
const TOL=1.5;
/* 各枠について「左右が重なる枠のうち、自分の上端より上で いちばん下にある枠」との間隔を測る（無ければ格子の上端から） */
const GAPS=()=>{const grid=document.querySelector('#dashboard .nn-panel-grid'),g=grid.getBoundingClientRect();
  const ps=[...grid.querySelectorAll(':scope>.dpanel')].filter(p=>p.offsetHeight>0).map(p=>({k:p.dataset.panelId,r:p.getBoundingClientRect()}));const out=[];
  for(const a of ps){let above=null;for(const b of ps){if(b===a)continue;const ox=Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left);if(ox<=2)continue;
      if(b.r.bottom<=a.r.top+1&&(!above||b.r.bottom>above.r.bottom))above=b;}
    out.push({k:a.k,above:above?above.k:'上端',gap:Math.round((above?a.r.top-above.r.bottom:a.r.top-g.top)*10)/10});}
  return out;};
const bad=list=>list.filter(o=>o.above!=='上端'&&Math.abs(o.gap-12)>TOL).map(o=>`${o.above}→${o.k} ${o.gap}px`);
const OVER=()=>{const ps=[...document.querySelectorAll('#dashboard .nn-panel-grid>.dpanel')].filter(p=>p.offsetHeight>0);const out=[];
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const a=ps[i].getBoundingClientRect(),b=ps[j].getBoundingClientRect();
    const ix=Math.min(a.right,b.right)-Math.max(a.left,b.left),iy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
    if(ix>2&&iy>2)out.push(ps[i].dataset.panelId+'×'+ps[j].dataset.panelId+' '+Math.round(iy)+'px');}return out;};
const READY=()=>document.querySelectorAll('#dashboard .nn-panel-grid>.dpanel').length>=8;
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const dev of ['pc','sp']){
    const ctx=await b.newContext(dev==='pc'?{viewport:{width:1440,height:900}}:{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
    const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
    await p.goto('http://localhost:8899/'+PAGE);
    await p.waitForFunction(READY);await p.waitForTimeout(600);
    // ① 標準の並び：予実→受注率を含め、上下に並ぶ枠の間隔が全部 12px
    const g1=await p.evaluate(GAPS);const b1=bad(g1);
    ok(b1.length===0,`[${dev}] ①標準の並びで上下の間隔が全部12px `+b1.join(' / '));
    // ② 要対応（2段またぎ）の下端が受注率の下端にそろう（左の段の高さに合わせて伸び縮み）
    const d2=await p.evaluate(()=>{const t=document.querySelector('#dashboard .dpanel[data-panel-id="taio"]').getBoundingClientRect(),j=document.querySelector('#dashboard .dpanel[data-panel-id="juchu"]').getBoundingClientRect();return {d:Math.round(Math.abs(t.bottom-j.bottom)*10)/10,side:t.left>=j.right-2||j.left>=t.right-2};});
    ok(!d2.side||d2.d<=2,`[${dev}] ②要対応の下端が受注率の下端にそろう（差 ${d2.d}px）`);
    if(dev==='sp'){ok(!errs.length,`[${dev}] 実行エラーなし `+errs.join(' | '));await ctx.close();continue;}  // スマホは枠を動かせない（§2026-09-25b）
    // ③ 自由配置にする（要対応を受注率の上へ落とす：panel_overlap と同じ操作）→ 予実を畳む → 下の枠が 12px まで詰まる
    const src=await p.evaluate(()=>{const h=document.querySelector('#dashboard .dpanel[data-panel-id="taio"]>h4');h.scrollIntoView({block:'center'});const r=h.getBoundingClientRect();return {x:r.left+Math.min(60,r.width/3),y:r.top+r.height/2};});
    const dst=await p.evaluate(()=>{const r=document.querySelector('#dashboard .dpanel[data-panel-id="juchu"]').getBoundingClientRect();return {x:r.left+40,y:r.top+r.height/2};});
    await p.mouse.move(src.x,src.y);await p.mouse.down();
    for(let i=1;i<=12;i++){await p.mouse.move(src.x+(dst.x-src.x)*i/12,src.y+(dst.y-src.y)*i/12);await p.waitForTimeout(16);}
    await p.mouse.up();
    await p.waitForFunction(()=>{try{const v=JSON.parse(localStorage.getItem('nn_dash_layout_v1')||'{}');return !!(v.positions&&Object.keys(v.positions).length);}catch(e){return false;}});
    await p.waitForTimeout(400);
    const g3=await p.evaluate(GAPS);const b3=bad(g3);
    ok(b3.length===0,`[${dev}] ③枠を動かした直後も間隔が全部12px `+b3.join(' / '));
    await p.evaluate(()=>document.querySelector('#dashboard .dpanel[data-panel-id="yojitsu"] .nn-panel-fold').click());
    await p.waitForFunction(()=>document.querySelector('#dashboard .dpanel[data-panel-id="yojitsu"]').classList.contains('nn-panel-folded'));await p.waitForTimeout(400);
    const g4=await p.evaluate(GAPS);const b4=bad(g4);
    ok(b4.length===0,`[${dev}] ④予実を畳んだら下の枠が12pxまで詰まる `+b4.join(' / '));
    const h4=await p.evaluate(()=>document.querySelector('#dashboard .dpanel[data-panel-id="yojitsu"]').offsetHeight);
    ok(h4<80,`[${dev}] ④'畳んだ予実は見出しだけ（${h4}px）`);
    // ⑤ 開き直しても詰まったまま／重なりなし
    await p.reload();await p.waitForFunction(READY);await p.waitForTimeout(600);
    const g5=await p.evaluate(GAPS);const b5=bad(g5);const o5=await p.evaluate(OVER);
    ok(b5.length===0&&o5.length===0,`[${dev}] ⑤開き直しても間隔12px・重なりなし `+b5.concat(o5).join(' / '));
    // ⑥ 畳みを開いて背が伸びても、下の枠は 12px 空けて下がる（重ならない）
    await p.evaluate(()=>document.querySelector('#dashboard .dpanel[data-panel-id="yojitsu"] .nn-panel-fold').click());
    await p.waitForFunction(()=>!document.querySelector('#dashboard .dpanel[data-panel-id="yojitsu"]').classList.contains('nn-panel-folded'));await p.waitForTimeout(400);
    const g6=await p.evaluate(GAPS);const b6=bad(g6);const o6=await p.evaluate(OVER);
    ok(b6.length===0&&o6.length===0,`[${dev}] ⑥開いて背が伸びても間隔12px・重なりなし `+b6.concat(o6).join(' / '));
    ok(!errs.length,`[${dev}] 実行エラーなし `+errs.join(' | '));
    await ctx.close();
  }
  await b.close();console.log(ng?'★NG '+ng+'件':'全項目○');
})();
