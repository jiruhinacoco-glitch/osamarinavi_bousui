/* §1047 記録帳 登録（スマホ）：部位を追加→役物周り→明細の「よく使う」で3行→数・㎡→3行目だけ工法を X-2H → 保存（出来上がりを測る）
   ①上の か所・合計㎡ が明細の合計（20か所・12.5㎡）②保存した明細に3行目の工法が残る
   ③工法ごとの内訳が分かれる（X-1＝平場500＋役物5.0＝505㎡／X-2H＝7.5㎡）＝前は役物周りに工法が無いと分けず全部 X-1 に入った ④JSエラーなし。
   直す前の版は★NG。使い方: node _check/yakuko.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const UAP='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UAP,serviceWorkers:'block'});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');localStorage.setItem('nn_view_mode','mobile');});await p.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo.html'));await p.waitForTimeout(3500);
await p.evaluate(()=>openModal());await p.waitForTimeout(800);
await p.fill('#f_name','テスト 役物の通し');
const hira=await p.$('#f_kouji .arr[data-k="平場"] input');await hira.fill('500');await hira.dispatchEvent('input');
await p.evaluate(()=>document.querySelector('#f_kouji .aradd').click());await p.waitForTimeout(400);
const picked=await p.evaluate(()=>{const s=[...document.querySelectorAll('#f_kouji select')].filter(x=>x.style.display==='none').find(x=>[...x.options].some(o=>o.value==='役物周り'));if(!s)return false;s.value='役物周り';s.dispatchEvent(new Event('change',{bubbles:true}));return true;});await p.waitForTimeout(400);
await p.evaluate(()=>{document.querySelector('#f_kouji .arr[data-k="役物周り"] .yldt').click();});await p.waitForTimeout(300);
for(const n of ['ドレン（縦）','脱気筒','架台基礎']) await p.evaluate(n=>{[...document.querySelectorAll('#f_kouji .ylchips button')].find(b=>b.dataset.n===n).click();},n);
await p.waitForTimeout(300);
const rows=await p.$$('#f_kouji .ylr');
const vals=[[4,3.2],[6,1.8],[10,7.5]];for(let i=0;i<3;i++){const q=await rows[i].$('input.yq'),a=await rows[i].$('input.yaa');await q.fill(String(vals[i][0]));await q.dispatchEvent('input');await a.fill(String(vals[i][1]));await a.dispatchEvent('input');}
await p.evaluate(()=>document.querySelectorAll('#f_kouji .ylr .ylko')[2].click());await p.waitForTimeout(400);
const ko=await p.evaluate(()=>{const s=[...document.querySelectorAll('#f_kouji select')].filter(x=>x.style.display==='none').find(x=>[...x.options].some(o=>/X-2H/.test(o.value)));if(!s)return null;const o=[...s.options].find(o=>/X-2H/.test(o.value));s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));return o.value;});await p.waitForTimeout(400);
const mid=await p.evaluate(()=>({q:document.querySelector('#f_kouji .arr[data-k="役物周り"] input').value,a:document.querySelector('#f_kouji .arr[data-k="役物周り"] input.ya').value,ko3:document.querySelectorAll('#f_kouji .ylr .ylko')[2].textContent,sum:document.querySelector('#f_kouji .yls').textContent,m:document.getElementById('f_m').value}));
const cdp=await ctx.newCDPSession(p);let s=await cdp.send('Page.captureScreenshot',{});require('fs').writeFileSync('/tmp/k/ykf1.png',Buffer.from(s.data,'base64'));
await p.evaluate(()=>saveProperty());await p.waitForTimeout(2500);
const after=await p.evaluate(()=>{const x=props.find(q=>q.name==='テスト 役物の通し');if(!x)return null;const it=x.areas[0].items.find(i=>i.k==='役物周り');return {m:x.m,L:it&&it.L,ko:nnKoList(x).map(k=>k.sp+':'+k.q)};});
let NG=0;const ok=(c,m)=>{if(!c)NG++;console.log((c?'○':'★NG')+' '+m);};
ok(picked&&mid.q==='20'&&mid.a==='12.5','①上の か所・合計㎡ が明細の合計 '+JSON.stringify(mid));
ok(after&&after.L&&after.L.length===3&&/X-2H/.test(after.L[2].ko||''),'②保存した明細に3行目の工法が残る');
const K=after?after.ko.slice().sort():[];ok(JSON.stringify(K)===JSON.stringify(['X-1:505','X-2H:7.5']),'③工法ごとの内訳が分かれる '+JSON.stringify(K));
ok(!errs.length,'④JSエラーなし '+JSON.stringify(errs.slice(0,2)));
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
