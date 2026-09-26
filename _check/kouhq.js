/* 検査：工法の絵の高画質版（kou_hq.js）が、表示の大きさ×画面の細かさ（iPhone＝3倍）以上の版を選ぶ（2026-09-26q・本人「画質が著しく悪い」）
   node _check/kouhq.js [hacchu.html]   前提： python3 -m http.server 8899   ※直す前の kou_hq.js では★NG（②③）
   ① 発注の現場カード（高さ44px・幅は絵の比率）：全部の絵が 44×3＝132px 以上の版
   ② iPhoneのSafariのまね：読み込み前の絵が「細い仮の幅」を持っていても、高さから選ぶ（小さい版を選ばない）
   ③ 先に小さい版になっていても、表示が大きければ大きい版へ上げ直す */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'hacchu.html';
let ng=0; const ok=(c,m,d)=>{ if(!c)ng++; console.log((c?'○ ':'★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); };
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:393,height:852},screen:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:3,
   userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'});
 await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://127.0.0.1:8899/'+FILE); await p.waitForTimeout(1200);
 for(let y=0;y<14000;y+=600){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(100);}
 await p.waitForFunction(()=>[...document.querySelectorAll('.gkou')].every(i=>/icons\/kq\//.test(i.getAttribute('src'))),null,{timeout:8000}).catch(()=>{});
 const r1=await p.evaluate(()=>[...document.querySelectorAll('.gkou')].map(i=>{const m=(i.getAttribute('src').match(/_h(\d+)\.png/)||[0,0])[1];
   return {h:+m,need:Math.ceil(i.getBoundingClientRect().height*devicePixelRatio)};}));
 const bad1=r1.filter(x=>x.h<Math.min(x.need-2,168));
 ok(r1.length>10&&bad1.length===0,'① 現場カードの絵は表示×3倍以上の版（'+r1.length+'枚）',bad1.slice(0,3));
 /* ② 読み込み前に細い仮の幅（10px）を持つ絵 */
 const r2=await p.evaluate(()=>new Promise(res=>{const i=document.createElement('img');
   i.style.cssText='height:44px;width:10px;object-fit:contain;display:block';i.src='./icons/kou_torch.png?nocache='+Math.random();
   document.body.appendChild(i);setTimeout(()=>res(i.getAttribute('src')),0);}));
 const h2=+((r2.match(/_h(\d+)\.png/)||[0,0])[1]);
 ok(h2>=128,'② 読み込み前の仮の幅にだまされず、高さ44px×3倍から選ぶ',r2);
 /* ③ 小さい版のまま（h32）を 44px で表示 → 上げ直す */
 const r3=await p.evaluate(()=>new Promise(res=>{const i=document.createElement('img');
   i.style.cssText='height:44px;width:auto;object-fit:contain;display:block';i.src='./icons/kq/torch_h32.png';
   document.body.appendChild(i);setTimeout(()=>res(i.getAttribute('src')),1200);}));
 const h3=+((r3.match(/_h(\d+)\.png/)||[0,0])[1]);
 ok(h3>=128,'③ 小さい版でも表示が大きければ大きい版へ上げ直す',r3);
 ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
 console.log(ng?('★NG '+ng+'件'):'すべて○'); await b.close(); process.exit(ng?1:0);
})();
