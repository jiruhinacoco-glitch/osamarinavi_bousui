/* §1044 役物の明細（本人「屋根1つに 役物が30個40個ある現場」）：出来上がりを端から端まで測る。
   ①ホーム→設定「役物が多い現場3件を入れる」で3件入る ②PCのカード：屋根の数（1・2・1）＝役物だけの工法を屋根に数えない・総数量＝平場＋立上り＋役物の㎡（屋根内周 m は入れない）・役物にほかの工法があれば「＋1」
   ③詳細：役物の明細の表が全部の行・「すべて見る」で全部開く ④スマホのカード：役物の欄から文字が出ない
   ⑤登録画面：明細36行が出る・1行の㎡を変えると合計が自動で変わる・保存→開き直しても明細が残る。直す前の版は★NG。
   使い方: node _check/yakumeisai.js [kirokucho_demo.html] [index.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const FILE=process.argv[2]||'kirokucho_demo.html', HOME=process.argv[3]||'index.html';let NG=0;
const ok=(c,m)=>{if(!c)NG++;console.log((c?'○':'★NG')+' '+m);};
const T=JSON.parse(fs.readFileSync(__dirname+'/../testdata/yakumono_1104.json','utf8'));
/* 検算：自分で足す（平場・立上り・天端＝㎡、役物＝明細の合計㎡。屋根内周は m なので入れない） */
const want={};T.props.forEach(p=>{let m=0;p.areas.forEach(r=>r.items.forEach(x=>{if(['平場','立上り','天端'].includes(x.k))m+=x.q;if(x.k==='役物周り')m+=(x.L||[]).reduce((s,y)=>s+y.a,0);}));want[p.name]={m:Math.round(m*10)/10,roofs:p.areas.length,rows:p.areas.map(r=>r.items.filter(x=>x.L).reduce((s,x)=>s+x.L.length,0))};});
const UAP='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
async function insert(ctx){const p=await ctx.newPage();p.on('dialog',d=>d.accept());await p.goto('http://localhost:8899/'+HOME);await p.waitForTimeout(1500);
 const has=await p.evaluate(()=>{const b=document.getElementById('nnBkTest2');if(b){b.click();return true;}return false;});
 if(!has){await p.evaluate(()=>{const c=[...document.querySelectorAll('button,a,[onclick]')].find(e=>/設定/.test(e.textContent));c&&c.click();});await p.waitForTimeout(800);}
 const has2=has||await p.evaluate(()=>{const b=document.getElementById('nnBkTest2');if(b){b.click();return true;}return false;});
 let msg='';if(has2){await p.waitForFunction(()=>/足しました|もう入って/.test((document.getElementById('nnBkMsg')||{}).textContent||''),null,{timeout:15000}).catch(()=>{});msg=await p.evaluate(()=>(document.getElementById('nnBkMsg')||{}).textContent||'');}
 await p.close();return {has:has2,msg};}
(async()=>{const b=await chromium.launch();
 try{
 /* PC */
 let ctx=await b.newContext({viewport:{width:2000,height:1020},serviceWorkers:'block'});const r0=await insert(ctx);
 ok(r0.has&&/3件を足しました/.test(r0.msg),'①ホームの設定から3件入る '+JSON.stringify(r0.msg));
 let p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3500);
 const cards=await p.evaluate(names=>names.map(n=>{const x=props.find(q=>q.name===n);if(!x)return null;const c=document.querySelector('#list .pcard[data-pid="'+x.id+'"]');if(!c)return {id:x.id};
   return {id:x.id,roofs:c.querySelectorAll('.pcxrf').length,tot:(c.querySelector('.pcxtot b')||{}).textContent,plus:!!c.querySelector('.pcxykm')};}),T.props.map(q=>q.name));
 T.props.forEach((q,i)=>{const c=cards[i]||{},w=want[q.name];ok(c.roofs===w.roofs,'②PC '+q.name.slice(3,12)+'：屋根の数 '+c.roofs+'（正しくは'+w.roofs+'）');
   ok(c.tot&&parseFloat(c.tot.replace(/,/g,''))===w.m,'②PC '+q.name.slice(3,12)+'：総数量 '+c.tot+'（正しくは'+w.m+'㎡）');});
 ok(cards[0]&&cards[0].plus&&cards[2]&&cards[2].plus,'②役物にほかの工法がある現場は「＋1」');
 /* 詳細 */
 const id0=cards[0]&&cards[0].id;await p.evaluate(id=>nnGoDetail(id),id0);await p.waitForTimeout(1500);
 const d1=await p.evaluate(()=>{const t=document.querySelector('#detail .ykp .ykt');if(!t)return null;const vis=()=>[...t.querySelectorAll('tbody tr')].filter(r=>getComputedStyle(r).display!=='none').length;const a=vis();const bt=document.querySelector('#detail .ykmore');bt&&bt.click();return {all:t.querySelectorAll('tbody tr').length,before:a,after:vis()};});
 ok(d1&&d1.all===want[T.props[0].name].rows[0]&&d1.before===10&&d1.after===d1.all,'③詳細：役物の明細 '+JSON.stringify(d1));
 /* 登録画面：明細の1行を変える→合計が自動→保存→開き直し */
 const f=await p.evaluate(async id=>{openModal(id);await new Promise(r=>setTimeout(r,800));const rows=document.querySelectorAll('#f_kouji .ylr');const ya=document.querySelector('#f_kouji .arr[data-k="役物周り"] input.ya');
   const before=+ya.value;const inp=rows[0].querySelector('input.yaa');const v0=+inp.value;inp.value=String(v0+10);inp.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,200));
   return {rows:rows.length,before,after:+ya.value,ro:ya.readOnly,v0};},id0);
 ok(f.rows===36&&Math.abs(f.after-f.before-10)<0.01&&f.ro,'⑤登録画面：明細36行・1行を+10㎡ → 合計が自動で+10 '+JSON.stringify(f));
 await p.evaluate(()=>saveProperty());await p.waitForTimeout(2500);
 await p.reload();await p.waitForTimeout(3500);
 const sv=await p.evaluate(id=>{const x=props.find(q=>q.id===id);const it=x&&x.areas[0].items.find(i=>i.k==='役物周り');return it?{L:(it.L||[]).length,a0:it.L&&it.L[0].a,a:it.a}:null;},id0);
 ok(sv&&sv.L===36&&Math.abs(sv.a0-(f.v0+10))<0.01,'⑤保存→開き直しても明細が残る '+JSON.stringify(sv));
 /* ⑥（§1047）新規登録の「前の現場から作る」：役物の合計㎡・明細の数と㎡は空、明細の名前は残る */
 const cp=await p.evaluate(async id=>{ if(typeof closeModal==='function') try{closeModal();}catch(e){}
   openModal(); await new Promise(r=>setTimeout(r,700)); const bt=document.querySelector('#nnSrBand [data-copy]'); if(!bt) return {err:'ボタンなし'}; bt.click(); await new Promise(r=>setTimeout(r,500));
   const it=document.querySelector('#nnSrPick [data-id="'+id+'"]'); if(!it) return {err:'一覧に無い'}; it.click(); await new Promise(r=>setTimeout(r,900));
   const A=JSON.parse(document.getElementById('f_areas').value||'[]'); const y=(A[0]&&A[0].items||[]).find(i=>i.k==='役物周り')||{};
   return {a:y.a||0,q:y.q||0,rows:(y.L||[]).length,sumA:(y.L||[]).reduce((s,r)=>s+(r.a||0),0),name0:y.L&&y.L[0]&&y.L[0].n}; },id0);
 ok(cp&&!cp.err&&cp.a===0&&cp.q===0&&cp.rows===36&&cp.sumA===0&&!!cp.name0,'⑥前の現場から作る：役物の㎡・数は空・明細の名前36行は残る '+JSON.stringify(cp));
 ok(!errs.length,'PC：JSエラーなし '+JSON.stringify(errs.slice(0,2)));await ctx.close();
 /* スマホ */
 ctx=await b.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:UAP,serviceWorkers:'block'});await insert(ctx);
 p=await ctx.newPage();await p.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');localStorage.setItem('nn_view_mode','mobile');});await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(4000);
 const sp=await p.evaluate(()=>[...document.querySelectorAll('#list .pcard .sprfy')].slice(0,4).map(e=>e.scrollWidth-e.clientWidth));
 ok(sp.length>=4&&sp.every(d=>d<=0.5),'④スマホのカード：役物の欄から文字が出ない '+JSON.stringify(sp));
  await ctx.close();
 /* ⑦（§1047）iPad縦（820px）：役物の明細の表の名前が切れない（前は表が344pxで10行切れた） */
 ctx=await b.newContext({viewport:{width:820,height:1180},screen:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',serviceWorkers:'block'});await insert(ctx);
 p=await ctx.newPage();await p.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3500);
 const ip=await p.evaluate(names=>{const x=props.find(q=>q.name===names);nnGoDetail(x.id);return new Promise(r=>setTimeout(()=>{const P=document.querySelector('#detail .ykp');r(P?{cut:[...P.querySelectorAll('.ykt td.n')].filter(td=>td.offsetParent&&td.scrollWidth>td.clientWidth+1).length}:null);},1500));},T.props[2].name);
 ok(ip&&ip.cut===0,'⑦iPad縦：役物の明細の名前が切れない '+JSON.stringify(ip));await ctx.close();
 }catch(e){ ok(false,'途中で止まった（'+String(e.message).split('\n')[0].slice(0,100)+'）'); }
 console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
