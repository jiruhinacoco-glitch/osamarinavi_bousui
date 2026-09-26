/* 検査：3Dの「防水層を設置」（寸法で貼る）をスマホで使うとき、貼る状態が見える（2026-09-26m・本人の指摘）
   node _check/sheetbar.js [zumen_sekisan.html]   前提： python3 -m http.server 8899   ※直す前の版では★NG
   ・貼っている間、小窓は3D画面の25%以下（材料の検索・一覧は自動で畳む）
   ・幅／たて／厚み は1行
   ・下の操作バー：「90°回す」「ここに貼る」「やめる」が高さ36px以上で1行・右下の▲と重ならない・描き方の案内は隠れる
   ・「ここに貼る」で1枚貼れる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ if(!c)ng++; console.log((c?'○ ':'★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); };
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:393,height:852},screen:{width:393,height:852},isMobile:true,hasTouch:true,
   userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://127.0.0.1:8899/'+FILE);
 await p.waitForFunction(()=>typeof setTab==='function'&&window.nnCond);
 await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}
   state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})),lv:0,name:'屋根①'}];
   state.d3sheet=[];saveState();setTab('d3');});
 await p.waitForFunction(()=>document.querySelector('#three-wrap canvas'),null,{timeout:15000});
 await p.evaluate(()=>nnCond.open('sheet'));
 await p.waitForFunction(()=>document.querySelector('#nnCondBox .mrow'));
 await p.evaluate(()=>document.querySelector('#nnCondBox .mrow').click());
 await p.waitForFunction(()=>document.querySelector('#nnCondBox [data-part="0"]'));
 await p.evaluate(()=>document.querySelector('#nnCondBox [data-part="0"]').click());
 await p.waitForFunction(()=>{const b=document.getElementById('nnSheetSizeBar');return b&&b.style.display==='block';},null,{timeout:8000}).catch(()=>{});
 const r=await p.evaluate(()=>{
  const R=e=>{const q=e.getBoundingClientRect();return {l:q.left,t:q.top,r:q.right,b:q.bottom,w:q.width,h:q.height};};
  const W=R(document.getElementById('three-wrap')),box=R(document.getElementById('nnCondBox'));
  const ins=[...document.querySelectorAll('#nnCondBox input[data-sh]')].map(i=>Math.round(i.getBoundingClientRect().top));
  const bar=document.getElementById('nnSheetSizeBar'),bs=[...bar.querySelectorAll('button')].map(x=>({s:x.textContent.trim(),...R(x)}));
  const tab=document.getElementById('navShowTab'); const tr=tab?R(tab):null;
  return {ratio:box.w*box.h/(W.w*W.h),boxH:Math.round(box.h),ins,bs,bar:R(bar),vw:document.documentElement.clientWidth,tabL:tr&&tr.w?tr.l:null,
    hint:getComputedStyle(document.getElementById('hint')).display};});
 ok(r.ratio<=0.25,'貼っている間、小窓は3D画面の25%以下',{ratio:+(r.ratio*100).toFixed(1)+'%',h:r.boxH});
 ok(r.ins.length===3&&new Set(r.ins).size===1,'幅／たて／厚み が1行',r.ins);
 const want=[/90°/,/ここに貼る/,/やめる/];
 ok(r.bs.length===3&&want.every((re,i)=>re.test(r.bs[i].s)),'操作バーのボタンが3つ（90°回す・ここに貼る・やめる）',r.bs.map(x=>x.s));
 ok(r.bs.every(x=>x.h>=36),'ボタンの高さ36px以上（指で押しやすい）',r.bs.map(x=>Math.round(x.h)));
 ok(new Set(r.bs.map(x=>Math.round(x.t))).size===1,'ボタンが1行',r.bs.map(x=>Math.round(x.t)));
 ok(r.bar.r<=r.vw-56,'右下の▲（下のメニューを出す）と重ならない',{barRight:Math.round(r.bar.r),vw:r.vw});
 ok(r.hint==='none','貼っている間、描き方の案内は隠れる',r.hint);
 await p.locator('[data-size-commit]').click();
 const n=await p.evaluate(()=>({n:state.d3sheet.length,bar:document.getElementById('nnSheetSizeBar').style.display,on:document.body.classList.contains('nnSizeOn')}));
 ok(n.n===1&&n.bar==='none','「ここに貼る」で1枚貼れてバーが消える',n);
 ok(!n.on,'貼り終わったら案内を隠す指定が外れる',n.on);
 ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
 console.log(ng?('★NG '+ng+'件'):'すべて○'); await b.close(); process.exit(ng?1:0);
})();
