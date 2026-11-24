/* §1428 見本「現場調査モード」（?chosa=1）。スマホたて：開いたらすぐ数字で入れる画面 → 12・8 と打って置く → 平面図（寸法つき）＋3D の2画面まで、端から端まで通す。
   あわせて、?chosa なしのいつもの画面が変わっていないこと。直す前の版は★NG。
   使い方: node _check/chosa.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const mk=async()=>{ const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); p._errs=[]; p.on('pageerror',e=>p._errs.push(e.message.slice(0,120))); return p; };
const vis=(p,sel)=>p.evaluate(s=>{ const e=document.querySelector(s); if(!e) return false; const r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(e).display!=='none'; },sel);
/* ① 調査モード */
let p=await mk(); await p.goto('http://localhost:8899/'+F+'?chosa=1',{waitUntil:'load'});
await p.waitForFunction(()=>{ const d=document.getElementById('nnDimIn'); return d&&d.classList.contains('on'); },null,{timeout:8000}).catch(()=>{});
ck(await p.evaluate(()=>{ const d=document.getElementById('nnDimIn'); return !!d&&d.classList.contains('on'); }),'開いたらすぐ「寸法で入れる」が出ている（入口の画面を挟まない）');
ck(!(await vis(p,'#toolbar')),'道具の列は出ていない');
for(const k of ['1','2','next','8','next']){ await p.evaluate(k=>{ const x=document.querySelector('#nnDimIn [data-k="'+k+'"]'); if(x) x.click(); },k); await p.waitForTimeout(60); }
await p.evaluate(()=>nnDimInPlace());
await p.waitForFunction(()=>document.body.classList.contains('nnsplit2')&&typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,null,{timeout:15000}).catch(()=>{});
/* 手計算：12m×8m＝96㎡・外周40m */
const r=await p.evaluate(()=>{ const s=state.scaleM||0.5, P=state.polys[0]&&state.polys[0].pts||[]; let a=0,l=0; for(let i=0;i<P.length;i++){ const q=P[(i+1)%P.length]; a+=P[i].x*q.y-q.x*P[i].y; l+=Math.hypot(q.x-P[i].x,q.y-P[i].y); }
  return {n:state.polys.length, area:Math.abs(a/2)*s*s, len:l*s, split:document.body.classList.contains('nnsplit2'), d3:(typeof T!=='undefined'&&T&&T.group)?T.group.children.length:0, dims:!!window.nnDimsOn, tool:(typeof tool!=='undefined')?tool:''}; });
ck(r.n===1&&Math.abs(r.area-96)<0.01&&Math.abs(r.len-40)<0.01,'6回押すだけで 12m×8m の屋根が置かれる（96㎡・外周40m）（'+JSON.stringify(r)+'）');
ck(r.split&&r.d3>0&&r.dims,'置いたら 上＝平面図（寸法表示あり）／下＝3D が同時に出る');
ck(r.tool==='pan','置いたあとは、図面を押しても線を引き始めない（道具＝'+r.tool+'）');
ck(await vis(p,'#nnChosaBar')&&(await p.evaluate(()=>document.querySelectorAll('#nnChosaBar button').length))===4,'上の帯のボタンは4つだけ（屋根を足す・割付・3D・細かく直す）');
if(process.env.SHOT) await p.screenshot({path:process.env.SHOT+'_chosa.png'});
await p.evaluate(()=>document.querySelector('#nnChosaBar [data-c="all"]').click()); await p.waitForTimeout(400);
ck(await vis(p,'#toolbar')&&!(await vis(p,'#nnChosaBar')),'「細かく直す」でいつもの道具の列に戻れる');
console.log('errors',p._errs.slice(0,3)); if(p._errs.length) NG++;
/* ② いつもの画面は変わらない */
p=await mk(); await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500);
ck(await p.evaluate(()=>!document.documentElement.hasAttribute('data-nnchosa')&&!document.getElementById('nnDimIn').classList.contains('on')),'?chosa なし：調査モードにならない・寸法の画面も勝手に開かない');
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(400);
ck(await vis(p,'#toolbar')&&!(await vis(p,'#nnChosaBar')),'?chosa なし：道具の列が出ていて、調査の帯は出ない');
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
