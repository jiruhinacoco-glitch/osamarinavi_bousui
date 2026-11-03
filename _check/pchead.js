/* §1041 PC（2列 2000・1600px）：①工事名の欄（見出しを除く）が広い ②提出書類の見出し（施工要領書など）が欄の中に収まる ③書類の絵が大きい（22→約36px）
   ④既存は略語（露出アス・ゴムシート）⑤屋根6つの現場で、6つ目の札（B-1（部分粘着）＋田島）が欄から出ない。直す前の版は★NG。使い方: node _check/pchead.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';let NG=0;
(async()=>{const b=await chromium.launch();
for(const [W,H,minName] of [[2000,1020,200],[1600,900,150]]){const ctx=await b.newContext({viewport:{width:W,height:H},serviceWorkers:'block'});
 await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);
 await p.waitForFunction(()=>document.querySelectorAll('#list .pcard').length>=90,null,{timeout:30000});await p.waitForTimeout(1500);
 await p.evaluate(()=>{const K=Object.keys(KO_MASTER);const mk=(id,n,kz)=>{const a=JSON.parse(JSON.stringify(props[0]));a.id=id;a.kizon=kz;a.areas=[];for(let i=0;i<n;i++)a.areas.push({ko:K[(i*3+1)%K.length],mk:'田島ルーフィング',items:[{k:'平場',q:100+i*20}]});return a;};
  props.unshift(mk(97203,3,'ゴムシート防水'));props.unshift(mk(97206,6,'露出アスファルト防水'));selectedId=-1;render();});
 await p.waitForTimeout(2500);await p.evaluate(()=>window.nnPcxFit&&nnPcxFit());await p.waitForTimeout(400);
 const r=await p.evaluate(()=>{const R=e=>e.getBoundingClientRect();const c6=document.querySelector('#list .pcard[data-pid="97206"]'),c3=document.querySelector('#list .pcard[data-pid="97203"]');
  const t=c3.querySelector('.rhead .ebox.ttl'),tb=R(t),bw=parseFloat(getComputedStyle(t,'::before').width)||0,z=tb.width/(t.offsetWidth||1);
  const name=Math.round(tb.width-bw*z);
  const docOut=[];let imgH=99;c3.querySelectorAll('.pdocs th').forEach(th=>{const s=th.querySelector('span'),q=R(th),a=R(s);if(a.left<q.left-0.5||a.right>q.right+0.5)docOut.push(s.textContent);const im=th.querySelector('img');imgH=Math.min(imgH,Math.round(R(im).height/z));});
  const kz=[c6,c3].map(c=>c.querySelector('.pexrow .ebox[data-f="kizon"]').textContent.replace('既存','').replace('▾','').trim());
  const rf=[...c6.querySelectorAll('.pcxrf')];const last=rf[rf.length-1],tg=last.querySelector('.pcxtg');const roofCut=[...tg.children].some(x=>R(x).right>R(last).right+0.5)||tg.scrollWidth>tg.clientWidth+1;
  return {name,docOut,imgH,kz,roofs:rf.length,roofCut};});
 const ok1=r.name>=minName, ok2=!r.docOut.length, ok3=r.imgH>=30, ok4=r.kz[0]==='露出アス'&&r.kz[1]==='ゴムシート', ok5=r.roofs===6&&!r.roofCut;
 [[ok1,'①工事名の欄が'+minName+'px以上（'+r.name+'px）'],[ok2,'②提出書類の見出しが欄に収まる '+JSON.stringify(r.docOut)],[ok3,'③書類の絵が30px以上（'+r.imgH+'px）'],[ok4,'④既存は略語 '+JSON.stringify(r.kz)],[ok5,'⑤屋根6つの6つ目の札が欄から出ない']].forEach(([o,m])=>{if(!o)NG++;console.log((o?'○':'★NG')+' PC'+W+' '+m);});
 await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
