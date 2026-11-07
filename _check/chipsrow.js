/* §1064 現場一覧（PC）の絞り込みの札：「不具合▼｜並び替え▼」が仕切り線をはさんで同じ行の右隣にあるか・右上ボタン群と重ならないか（2026-11-07g）
   本人「不具合▼の右に仕切り線と並び替え▼を移動して。現在だと改行された場所にある」。
   原因：右上の「カード・表一覧・Excel出力」と件数の札が札の段と縦に重なるため、札の段の最大幅を狭めていた（1102m）→ 1536px幅で14個目が折り返した。
   ①1366・1536・1920・2000：並び替え▼は不具合▼と同じ行で右隣（間に仕切り線 .dfsep）
   ②札はどれも右上ボタン群・件数の札と重ならない
   ③1536以上：札は1行に収まる
   使い方: node _check/chipsrow.js [kirokucho_demo.html]   ※直す前の版（_before.html）は 1366・1536 の①と③が★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{const b=await chromium.launch();
 for(const W of [1366,1536,1920,2000]){
  const ctx=await b.newContext({viewport:{width:W,height:900},serviceWorkers:'block'}); await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>document.querySelectorAll('#chips .dfil').length>=13,null,{timeout:10000}); await p.waitForTimeout(600);
  const m=await p.evaluate(()=>{const r=e=>{const q=e.getBoundingClientRect();return {l:q.left,t:q.top,r:q.right,b:q.bottom};};
    const md=document.getElementById('nnRecordModes'), lc=document.getElementById('nnLC');
    const chips=[...document.querySelectorAll('#chips .dfil')].map(e=>({k:e.dataset.k,...r(e)}));
    const df=chips.find(c=>c.k==='defect'), pf=chips.find(c=>c.k==='profit'); const sepEl=document.querySelector('#chips .dfsep'); const sep=sepEl?r(sepEl):null;
    const lines=[...new Set(chips.map(c=>Math.round(c.t)))].length;
    const ov=chips.filter(c=>[md,lc].filter(Boolean).some(e=>{const o=r(e); return c.l<o.r-0.5&&c.r>o.l+0.5&&c.t<o.b-0.5&&c.b>o.t+0.5;})).map(c=>c.k);
    return {lines,df,pf,sep,ov};});
  const nm='PC'+W;
  const side=m.df&&m.pf&&Math.abs(m.df.t-m.pf.t)<2&&m.pf.l>m.df.r&&m.sep&&m.sep.l>=m.df.r-1&&m.sep.r<=m.pf.l+1;
  ok(nm+'：並び替え▼は不具合▼と同じ行で右隣・間に仕切り線', !!side, JSON.stringify({dfT:Math.round(m.df?.t),pfT:Math.round(m.pf?.t),dfR:Math.round(m.df?.r),pfL:Math.round(m.pf?.l),sep:!!m.sep}));
  ok(nm+'：札は右上ボタン群・件数の札と重ならない', !m.ov.length, m.ov.join(','));
  if(W>=1536) ok(nm+'：札は1行に収まる', m.lines===1, m.lines+'行');
  ok(nm+'：JSエラーなし', !errs.length, errs.join(' '));
  await ctx.close(); }
 await b.close(); R.forEach(x=>console.log(x)); const ng=R.filter(x=>x.startsWith('★NG')).length; console.log(ng?'★NG '+ng+'件':'全部○');})();
