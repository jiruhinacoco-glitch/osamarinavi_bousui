/* §1030 現場記録帳を端から端まで通す（出来上がりを測る・§384 の型）：
   新規登録の窓で 屋根1＝平場300㎡＋役物50か所（合計12.5㎡）、屋根2＝平場120㎡ を入れて保存
   → PCのカード：屋根の欄が2つ・面積300/120・役物50か所・12.5㎡・総数量432.5㎡
   → 読み込み直しても同じ → スマホのカード：屋根2列・役物の印・総数量432.5㎡ → 現場詳細に工事名が出る
   使い方: node _check/tsuuri_kiroku.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
let NG=0;const ok=(c,m,x)=>{if(!c)NG++;console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,240):''));};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1400,height:900},serviceWorkers:'block'});
await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3000);
await p.evaluate(()=>openModal());await p.waitForTimeout(800);
const NAME='通し検査 屋根2つと役物';
await p.fill('#f_name',NAME);
await p.fill('#nnSrBand .nmr >> nth=0 >> input','丸彦渡辺建設').catch(()=>{});
await p.fill('#f_kouji .rf >> nth=0 >> .arr[data-k="平場"] input','300');
await p.click('#f_kouji .rf >> nth=0 >> .aradd');await p.waitForTimeout(300);
const picked=await p.evaluate(()=>{const o=[...document.querySelectorAll('#nnSelPop .o, #nnSelPop [data-v]')].find(x=>/役物周り/.test(x.textContent));if(!o)return false;o.click();return true;});
await p.waitForTimeout(300);
ok(picked,'①「＋部位を追加」から役物周りを選べる');
await p.fill('#f_kouji .rf >> nth=0 >> .arr[data-k="役物周り"] > input','50').catch(()=>{});
await p.fill('#f_kouji .rf >> nth=0 >> .arr[data-k="役物周り"] input.ya','12.5').catch(()=>{});
await p.click('#f_kouji .rfadd');await p.waitForTimeout(300);
await p.fill('#f_kouji .rf >> nth=1 >> .arr[data-k="平場"] input','120');
await p.evaluate(()=>saveProperty());await p.waitForTimeout(1500);
const card=async(pg)=>pg.evaluate(N=>{const c=[...document.querySelectorAll('#list .pcard')].find(x=>(x.querySelector('.rhead .ebox.ttl')||{}).textContent===N);if(!c)return null;c.scrollIntoView({block:'center'});
 const rf=[...c.querySelectorAll('.pcx .pcxrf')];return {roofs:rf.length,areas:rf.map(x=>(x.querySelector('.pcxa')||{}).textContent),yk:(c.querySelector('.pcx .pcxyk')||{}).textContent||'',tot:(c.querySelector('.rhead .pcxtot b')||{}).textContent||''};},NAME);
const c1=await card(p);
ok(c1&&c1.roofs===2&&/300/.test(c1.areas[0])&&/120/.test(c1.areas[1]),'② PCのカード：屋根の欄が2つ・面積300㎡／120㎡',c1);
ok(c1&&/50か所/.test(c1.yk)&&/12\.5㎡/.test(c1.yk),'③ PCのカード：屋根1に役物50か所・12.5㎡',c1&&c1.yk);
ok(c1&&/432\.5/.test(c1.tot),'④ 総数量＝300＋120＋12.5＝432.5㎡',c1&&c1.tot);
const pm=await p.evaluate(N=>(props.find(x=>x.name===N)||{}).m,NAME);
ok(pm===432.5,'④b 数量（見積・材料の計算に使う p.m）も432.5㎡＝カードと同じ（§1031）',pm);
await p.reload();await p.waitForTimeout(3000);await p.waitForFunction(()=>document.querySelectorAll('#list .pcard').length>=50,null,{timeout:15000}).catch(()=>{});
const c2=await card(p);
ok(c2&&JSON.stringify(c2)===JSON.stringify(c1),'⑤ 読み込み直しても同じ',c2);
const st=await ctx.storageState();
const ctx2=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block',storageState:st});
await ctx2.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');});
const q=await ctx2.newPage();q.on('pageerror',e=>errs.push(e.message));await q.goto('http://localhost:8899/'+FILE);await q.waitForTimeout(3000);
await q.waitForFunction(()=>document.querySelectorAll('#list .pcard').length>=50,null,{timeout:15000}).catch(()=>{});
const m=await q.evaluate(N=>{const c=[...document.querySelectorAll('#list .pcard')].find(x=>((x.querySelector('.rhead .ebox.ttl')||{}).textContent||'').trim()===N);if(!c)return null;c.scrollIntoView({block:'center'});return new Promise(r=>setTimeout(()=>{if(window.nnTtlFitSp)nnTtlFitSp([c]);
 r({cls:(c.className.match(/rf[mc]\w*/g)||[]).join(','),cells:c.querySelectorAll('.sproofs .sprf').length,yk:c.querySelectorAll('.sprf.hy').length,tot:(c.querySelector('.sptot b')||{}).textContent||'',pid:c.dataset.pid});},1200));},NAME);
ok(m&&m.cells===2&&/rfc2/.test(m.cls)&&m.yk===1&&/432\.5/.test(m.tot),'⑥ スマホのカード：屋根2列・役物の印・総数量432.5㎡',m);
await q.evaluate(pid=>nnGoDetail(+pid),m&&m.pid);await q.waitForTimeout(1500);
const d=await q.evaluate(N=>{const D=document.getElementById('detail');return !!D&&D.offsetWidth>0&&D.textContent.includes(N);},NAME);
ok(d,'⑦ 現場詳細が開き、工事名が出る');
/* ⑨ 既存の現場を編集：屋根2を120→200㎡にして保存 → その場でカードが変わる（読み込み直さなくても） */
await p.evaluate(N=>{const q=props.find(x=>x.name===N);openModal(q.id);},NAME);await p.waitForTimeout(900);
await p.fill('#f_kouji .rf >> nth=1 >> .arr[data-k="平場"] input','200');await p.evaluate(()=>saveProperty());await p.waitForTimeout(1500);
const c3=await card(p);
ok(c3&&c3.roofs===2&&/200/.test(c3.areas[1])&&/512\.5/.test(c3.tot),'⑨ 編集して保存した直後：屋根2＝200㎡・総数量512.5㎡',c3);
/* ⑩ 現場詳細の進行のマスで状態を変える → 一覧のカードの状態も変わる */
const pid=await p.evaluate(N=>props.find(x=>x.name===N).id,NAME);
await p.evaluate(pid=>nnGoDetail(pid),pid);await p.waitForTimeout(1200);
await p.evaluate(pid=>{if(window.nnRailSet)nnRailSet(pid,'契約済');},pid);await p.waitForTimeout(800);
await p.evaluate(()=>showView('list'));await p.waitForTimeout(1200);
const st10=await p.evaluate(pid=>{const c=document.querySelector('#list .pcard[data-pid="'+pid+'"] .rhead .status');return c?c.textContent.trim():'';},pid);
ok(/^契約済/.test(st10),'⑩ 詳細の進行のマスで契約済に → 一覧のカードも契約済',st10);
ok(!errs.length,'⑧ JSエラーなし',errs.slice(0,3));
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
