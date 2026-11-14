/* PC の現場詳細：屋根の表（No.〜既存防水）の列の幅を、見出し行の境目のつまみで引っぱって変える（2026-11-15k）。直す前の版では★NG。
   ①見出し行の列の境目につまみが3つ（No.｜屋根名｜内容｜既存防水）
   ②「屋根名｜内容」のつまみを右へ 20px 引っぱると、屋根名の列が約 20px 広がる（見出しも各行も同じ幅）・左右2つの表とも同じ幅
   ③「内容｜既存防水」のつまみを左へ 15px 引っぱると、既存防水の列が約 15px 広がる（内容の列は最低150px残す決まりなので、それに当たらない量）
   ④開き直しても幅が残る ⑤つまみのダブルクリックで元の幅に戻る ⑥つまみを押しても写真の画面が開かない
   使い方: node _check/roofcw.js [kirokucho_demo.html]   （http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d).slice(0,230):'')); if(!c)NG++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:1900,height:950}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const open=async()=>{
  await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'&&typeof nnRoofsOf==='function'); await p.waitForTimeout(1000);
  await p.evaluate(()=>{ const o=window.nnRoofsOf; window.nnRoofsOf=function(){ const R=o.apply(this,arguments); if(R&&R.list&&R.list.length){ const b0=R.list[0]; R.list=Array.from({length:12},(_,i)=>Object.assign({},b0,{hCode:['AS-T1','X-2','S-M2'][i%3],nm:'ROOF'+(i+1),area:100+i})); R.n=12; } return R; }; goProperty(props[0].id); });
  await p.waitForFunction(()=>document.querySelectorAll('#detail .dgai .dtr').length>=12,null,{timeout:15000});
  await p.waitForFunction(()=>{const t=document.querySelector('#detail .dgai .dth').getBoundingClientRect().top; const o=window.__T; window.__T=t; return o!==undefined&&Math.abs(o-t)<0.5;},null,{polling:400,timeout:15000});
};
/* 列の幅（倍率前）：見出しの4つ・1行目の4つ・2つ目の表の見出し */
const W=()=>p.evaluate(()=>{ const z=parseFloat(getComputedStyle(document.documentElement).zoom)||1; const ths=[...document.querySelectorAll('#detail .dgai .dtrs > .dth')];
  const w=e=>Math.round(e.getBoundingClientRect().width/z*10)/10; const r1=document.querySelector('#detail .dgai .dtr');
  return {h:[...ths[0].children].map(w), h2:ths[1]?[...ths[1].children].map(w):null, r:[r1.querySelector('.no'),r1.querySelector('.rn'),r1.querySelector('.va'),r1.querySelector('.kzc')].map(e=>e?w(e):null), n:ths.length};});
const grip=k=>p.evaluate(k=>{ const g=document.querySelector('#detail .dgai .dtrs > .dth .cwg[data-b="'+k+'"]'); if(!g) return null; const r=g.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,cur:getComputedStyle(g).cursor};},k);
const drag=async(k,dx)=>{ const g=await grip(k); if(!g) return false; await p.mouse.move(g.x,g.y); await p.mouse.down(); for(let i=1;i<=8;i++) await p.mouse.move(g.x+dx*i/8,g.y); await p.mouse.up(); await p.waitForTimeout(150); return true; };
await open();
await p.evaluate(()=>localStorage.removeItem('nn_roofcol_w')); await open();
const n=await p.evaluate(()=>document.querySelectorAll('#detail .dgai .dtrs > .dth:first-child .cwg').length);
const g2=await grip(2);
ok(n===3&&g2&&g2.cur==='col-resize','①見出し行の列の境目につまみが3つ（乗せると ↔）',{n,cur:g2&&g2.cur});
const w0=await W();
const z=await p.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).zoom)||1);
await drag(2,20*z); const w1=await W();
const same=(a,c)=>a&&c&&a.every((v,i)=>Math.abs(v-c[i])<=1);
ok(Math.abs((w1.h[1]-w0.h[1])-20)<=2&&Math.abs(w1.r[1]-w1.h[1])<=1.5&&same(w1.h,w1.h2),'②屋根名の列が約20px広がる（見出し＝行・左右の表も同じ）',{前:w0.h,後:w1.h,行:w1.r,右の表:w1.h2});
await drag(3,-10*z); const w2=await W();
ok(Math.abs((w2.h[3]-w1.h[3])-10)<=2&&Math.abs(w2.r[3]-w2.h[3])<=1.5,'③既存防水の列が約10px広がる',{前:w1.h,後:w2.h,行:w2.r});
await open(); const w3=await W();
ok(same(w3.h,w2.h),'④開き直しても幅が残る',{前:w2.h,開き直し:w3.h});
const g=await grip(2); await p.mouse.dblclick(g.x,g.y); await p.waitForTimeout(200); const w4=await W();
ok(same(w4.h,w0.h)&&!(await p.evaluate(()=>localStorage.getItem('nn_roofcol_w'))),'⑤ダブルクリックで元の幅に戻る',{元:w0.h,戻した後:w4.h});
/* ⑦★11-16j 表の中の行の境目（内容｜既存防水）を右へ 20px 引っぱると、既存防水の列が約 20px 狭まる（本人「境界線を右に移動しようとしてもできない」） */
const rg=await p.evaluate(()=>{ const g=document.querySelector('#detail .dgai .dtrs > .dtr:nth-of-type(4) .cwg[data-b="3"]')||document.querySelectorAll('#detail .dgai .dtrs > .dtr .cwg[data-b="3"]')[2]; if(!g) return null; const r=g.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};});
let w7=null; if(rg){ const a7=await W(); await p.mouse.move(rg.x,rg.y); await p.mouse.down(); for(let i=1;i<=8;i++) await p.mouse.move(rg.x+20*z*i/8,rg.y); await p.mouse.up(); await p.waitForTimeout(200); w7=await W();
  ok(Math.abs((a7.h[3]-w7.h[3])-20)<=2&&Math.abs(w7.r[3]-w7.h[3])<=1.5,'⑦表の中の行の境目からも引っぱれる（既存防水が約20px狭まる）',{前:a7.h,後:w7.h}); }
else ok(false,'⑦表の中の行の境目にも つまみがある',null);
await p.evaluate(()=>localStorage.removeItem('nn_roofcol_w'));
/* ⑧★11-16p 線のすぐ右（既存防水の欄の左はし 2px）をつかんでも引っぱれる（前は、その場で直す入力が始まっていた） */
await open();
const kp=await p.evaluate(()=>{ const k=document.querySelectorAll('#detail .dgai .dtrs > .dtr')[2].querySelector('.kzc'); if(!k) return null; const r=k.getBoundingClientRect(); return {x:r.left+2,y:r.top+r.height/2};});
if(kp){ const a8=await W(); await p.mouse.move(kp.x,kp.y); await p.mouse.down(); for(let i=1;i<=8;i++) await p.mouse.move(kp.x+15*z*i/8,kp.y); await p.mouse.up(); await p.waitForTimeout(250);
  const w8=await W(), ed=await p.evaluate(()=>!!document.querySelector('#detail .nned'));
  ok(Math.abs((a8.h[3]-w8.h[3])-15)<=2&&!ed,'⑧線のすぐ右（既存防水の欄のはし）をつかんでも引っぱれる・入力は始まらない',{前:a8.h,後:w8.h,入力:ed}); }
else ok(false,'⑧既存防水の欄がある',null);
await p.evaluate(()=>localStorage.removeItem('nn_roofcol_w'));
const ph=await p.evaluate(()=>{ const v=x=>x&&x.offsetParent!==null; return [...document.querySelectorAll('#nnRoofPh, .nnRoofPh, #nnPhotoBig')].some(v);});
ok(!ph,'⑥つまみを押しても写真の画面が開かない');
ok(errs.length===0,'エラーが出ていない',errs.slice(0,2));
await b.close(); console.log(NG?('★NG '+NG):'すべて○'); process.exit(NG?1:0);
})();
