/* §1035 iPad（820×1180・1024×768・1180×820）と PC（1100〜2000）のダッシュボード：見積済・契約高・完成工事高・契約〜完成の数字・見出しが枠からはみ出さない（重ならない）。
   直す前の版は★NG。使い方: node _check/ipaddash.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';let NG=0;
const UA='Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
(async()=>{const b=await chromium.launch();
for(const [W,H,PC] of [[820,1180],[1024,768],[1180,820],[1100,800,1],[1250,850,1],[1400,900,1],[1500,900,1],[1800,950,1],[2000,940,1]]){const ctx=await b.newContext(PC?{viewport:{width:W,height:H},serviceWorkers:'block'}:{viewport:{width:W,height:H},screen:{width:W,height:H},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:UA,serviceWorkers:'block'});await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','dash');});
 const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3500);
 const r=await p.evaluate(()=>{const gs=[...document.querySelectorAll('#dashboard .kgrps .kgrp')];return {n:gs.length,over:gs.filter(g=>[...g.querySelectorAll('.kcell')].some(c=>{const cr=c.getBoundingClientRect();return [...c.querySelectorAll('.kgv')].some(v=>{const rg=document.createRange();rg.selectNodeContents(v);const r=rg.getBoundingClientRect();return r.left<cr.left-1||r.right>cr.right+1;});})).map(g=>g.className)   /* ★数字（.kgv の中身）の左右の端が欄（.kcell）の外へ出ていないか */};});
 const ok=r.n===4&&!r.over.length;if(!ok)NG++;console.log((ok?'○':'★NG')+' '+(PC?'PC':'iPad')+' '+W+'×'+H+'：まとめの数字が重ならない '+JSON.stringify(r));await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
