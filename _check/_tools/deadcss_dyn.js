// 候補の決まりが、実際の画面のどこかで当てはまる部品を持つか（たくさんの状態で調べる）
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const C=JSON.parse(fs.readFileSync('/tmp/k/cand.json','utf8'));
const clean=s=>s.split(',').map(x=>x.replace(/::?(before|after|placeholder|selection|-webkit-[\w-]+|marker|first-line|first-letter)\b/g,'').replace(/:(hover|active|focus|focus-visible|focus-within|visited|link|checked|disabled|enabled)\b/g,'').trim()).filter(Boolean);
const UAP='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const DEV={ph:{viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:UAP},pc:{viewport:{width:2000,height:1000}},pc13:{viewport:{width:1366,height:768}}};
const live=new Set();
(async()=>{const b=await chromium.launch();
for(const dv of ['ph','pc','pc13']) for(const mob of (dv==='ph'?[1,0]:[0])) for(const view of ['list','dash','detail','form','table','tabs']){
 const ctx=await b.newContext({...DEV[dv],serviceWorkers:'block'});
 await ctx.addInitScript(([mob,view])=>{ if(mob) localStorage.setItem('nn_view_mode','mobile'); sessionStorage.setItem('nn_vm_view',view==='dash'?'dash':'list'); },[mob,view]);
 const p=await ctx.newPage();p.on('dialog',d=>d.dismiss().catch(()=>{}));await p.goto('http://localhost:8899/kirokucho_demo.html');await p.waitForTimeout(3000);
 const check=async()=>{const r=await p.evaluate(C2=>C2.map(parts=>parts.some(x=>{try{return !!document.querySelector(x);}catch(e){return true;}})),C.map(clean));r.forEach((v,i)=>{if(v)live.add(i);});};
 await check();
 if(view==='detail'||view==='tabs'){await p.evaluate(()=>nnGoDetail(props[1].id));await p.waitForTimeout(1200);await check();
   if(view==='tabs'){for(const t of ['写真','保管資料','作成図面','人工','追加工事','エクスポート']){await p.evaluate(t=>{try{setTab(t);}catch(e){}},t);await p.waitForTimeout(800);await check();}}}
 if(view==='form'){await p.evaluate(()=>openModal(props[0].id));await p.waitForTimeout(1200);await check();await p.evaluate(()=>{try{closeModal&&closeModal();}catch(e){}});await p.evaluate(()=>openModal());await p.waitForTimeout(1000);await check();}
 if(view==='table'){await p.evaluate(()=>{const b=[...document.querySelectorAll('button,[role=button]')].find(x=>/表一覧/.test(x.textContent));b&&b.click();});await p.waitForTimeout(1200);await check();}
 if(view==='list'){ // 絞り込み・並び替えの小窓・状態の札
   for(const sel of ['#spFilBtn','.fchip','.chip','.status','[data-f="status"]']){await p.evaluate(s=>{const e=document.querySelector(s);e&&e.click();},sel);await p.waitForTimeout(500);await check();await p.keyboard.press('Escape');}}
 await ctx.close();}
const dead=C.filter((c,i)=>!live.has(i));fs.writeFileSync('/tmp/k/dead.json',JSON.stringify(dead));
console.log('候補',C.length,'画面で当てはまった',live.size,'残り（消す）',dead.length);dead.slice(0,30).forEach(d=>console.log('  ',d.slice(0,110)));await b.close();})();
