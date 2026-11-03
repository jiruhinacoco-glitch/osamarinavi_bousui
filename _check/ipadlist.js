/* §1034 iPad（縦820・横1180・1024）でPCの一覧が読める：①表の欄の値が欠けない（屋根6つ・役物つきも）②「表示◯件」が検索欄に重ならない ③ページの横はみ出しなし。
   直す前の版は★NG。使い方: node _check/ipadlist.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';let NG=0;
const UA='Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
(async()=>{const b=await chromium.launch();
for(const [w,h] of [[820,1180],[1024,768],[1180,820]]){const ctx=await b.newContext({viewport:{width:w,height:h},screen:{width:w,height:h},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA,serviceWorkers:'block'});
 await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
 const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3000);
 await p.evaluate(()=>{const K=Object.keys(KO_MASTER);const a=JSON.parse(JSON.stringify(props[0]));a.id=98006;a.areas=[];for(let i=0;i<6;i++)a.areas.push({ko:K[(i*3+1)%K.length],mk:['田島ルーフィング','ダイフレックス','ディックプルーフィング'][i%3],items:[{k:'平場',q:(i+1)*120}].concat(i==0?[{k:'役物周り',q:50,a:38.5,ko:K[5]}]:[])});props.unshift(a);selectedId=-1;render();});await p.waitForTimeout(2000);
 await p.evaluate(()=>window.nnPcxFit&&nnPcxFit());await p.waitForTimeout(300);
 const r=await p.evaluate(()=>{const R=e=>e.getBoundingClientRect();const rg=document.createRange();
  const over=el=>{const r=R(el);let mx=0;for(let n=el.firstChild;n;n=n.nextSibling){let q=null;if(n.nodeType===3){if(!n.nodeValue.trim())continue;rg.selectNodeContents(n);q=rg.getBoundingClientRect();}else if(n.nodeType===1&&n.tagName!=='I')q=R(n);if(q&&q.width)mx=Math.max(mx,q.right);}return mx>r.right+0.5;};
  const cs=[...document.querySelectorAll('#list .pcard')].slice(0,3);const cut=[];cs.forEach(c=>c.querySelectorAll('.pcx > :is(.ebox,.pdate), .pcxrf > :is(.pcxtg,.pcxyk,.pcxa)').forEach(e=>{if(e.offsetWidth&&over(e)&&!/部分粘着/.test(e.textContent))cut.push(e.className+'「'+e.textContent.trim().slice(0,10)+'」');}));
  const q=R(document.getElementById('q')),lc=R(document.getElementById('nnLC'));const ovl=q.left<lc.right&&lc.left<q.right&&q.top<lc.bottom&&lc.top<q.bottom;
  return {cut:cut.slice(0,5),ovl,ovf:document.documentElement.scrollWidth-document.documentElement.clientWidth};});
 const ok=!r.cut.length&&!r.ovl&&r.ovf<=2;if(!ok)NG++;console.log((ok?'○':'★NG')+' iPad '+w+'×'+h+'：表の値が欠けない・件数が検索欄に重ならない・横はみ出しなし '+JSON.stringify(r));await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
