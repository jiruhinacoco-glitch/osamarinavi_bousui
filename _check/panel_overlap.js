/* 現場記録帳ダッシュボード：主要枠を動かしても、ほかの枠と重ならないか（PC・スマホ表示）。
   本人のスマホ写真（2026-09-24：要対応を動かしたら受注率・月別の上に重なった）から作った検査。
   使い方: node _check/panel_overlap.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE=process.argv[2]||'kirokucho_demo.html';
let ng=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m); if(!c)ng++;};
const OVER=()=>{const ps=[...document.querySelectorAll('#dashboard .nn-panel-grid>.dpanel')].filter(p=>p.offsetHeight>0);const out=[];
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const a=ps[i].getBoundingClientRect(),b=ps[j].getBoundingClientRect();
    const ix=Math.min(a.right,b.right)-Math.max(a.left,b.left),iy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
    if(ix>2&&iy>2)out.push(ps[i].dataset.panelId+'×'+ps[j].dataset.panelId+' '+Math.round(iy)+'px');}return out;};
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const dev of ['pc','sp']){
    const ctx=await b.newContext(dev==='pc'?{viewport:{width:1440,height:900}}:{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
    if(dev==='sp')await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
    const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
    await p.goto('http://localhost:8899/'+PAGE);
    await p.waitForFunction(()=>document.querySelectorAll('#dashboard .nn-panel-grid>.dpanel').length>=8);await p.waitForTimeout(500);
    ok((await p.evaluate(OVER)).length===0,`[${dev}] 最初の配置で重なりなし`);
    // 要対応の見出しをつかんで、受注率の枠の上へ落とす（写真と同じ操作）
    const src=await p.evaluate(()=>{const h=document.querySelector('#dashboard .dpanel[data-panel-id="taio"]>h4');h.scrollIntoView({block:'center'});const r=h.getBoundingClientRect();return {x:r.left+Math.min(60,r.width/3),y:r.top+r.height/2};});
    const dst=await p.evaluate(()=>{const r=document.querySelector('#dashboard .dpanel[data-panel-id="juchu"]').getBoundingClientRect();return {x:r.left+40,y:r.top+r.height/2};});
    await p.mouse.move(src.x,src.y);await p.mouse.down();
    for(let i=1;i<=12;i++){await p.mouse.move(src.x+(dst.x-src.x)*i/12,src.y+(dst.y-src.y)*i/12);await p.waitForTimeout(16);}
    await p.mouse.up();await p.waitForTimeout(500);
    const moved=await p.evaluate(()=>{const v=JSON.parse(localStorage.getItem('nn_dash_layout_v1')||'{}');return !!(v.positions&&Object.keys(v.positions).length);});
    ok(moved,`[${dev}] 枠を動かせた（配置が保存された）`);
    const o1=await p.evaluate(OVER);ok(o1.length===0,`[${dev}] 動かした直後に重なりなし `+o1.join(' / '));
    await p.reload();await p.waitForFunction(()=>document.querySelectorAll('#dashboard .nn-panel-grid>.dpanel').length>=8);await p.waitForTimeout(500);
    const o2=await p.evaluate(OVER);ok(o2.length===0,`[${dev}] 開き直しても重なりなし `+o2.join(' / '));
    // 以前の版で保存された「重なった配置」を読んでも重ならない
    await p.evaluate(()=>{const m=document.documentElement.dataset.nnvm||'pc';const v=JSON.parse(localStorage.getItem('nn_dash_layout_v1')||'{}');const pos=v.positions[m];pos.taio={x:0,y:(pos.juchu||{y:0}).y+10};pos.monthly={x:0,y:(pos.juchu||{y:0}).y+30};localStorage.setItem('nn_dash_layout_v1',JSON.stringify(v));});
    await p.reload();await p.waitForFunction(()=>document.querySelectorAll('#dashboard .nn-panel-grid>.dpanel').length>=8);await p.waitForTimeout(500);
    const o3=await p.evaluate(OVER);ok(o3.length===0,`[${dev}] 重なった配置が保存されていても開いたら重ならない `+o3.join(' / '));
    // 折りたたんだ枠を開いて背が伸びても重ならない
    await p.evaluate(()=>{const b=document.querySelector('#dashboard .dpanel[data-panel-id="juchu"] .nn-panel-fold');b.click();b.click();});await p.waitForTimeout(400);
    const o4=await p.evaluate(OVER);ok(o4.length===0,`[${dev}] 折りたたみを開いて背が伸びても重ならない `+o4.join(' / '));
    ok(!errs.length,`[${dev}] 実行エラーなし `+errs.join(' | '));
    await ctx.close();
  }
  await b.close();console.log(ng?'★NG '+ng+'件':'全項目○');
})();
