/* ★2026-09-29n 中抜きを長方形でかく（§552）
   使い方: node _check/holebox.js [zumen_sekisan.html]
   ○/★NG：①中抜きを押すと長方形のかき方（中抜きのボタンが点灯・案内に ▭長方形／✎自由）
          ②屋根の内側で角を2回クリック → その屋根に長方形の中抜き（4点・直角・幅×奥行きが打った角どおり）
          ③寸法の札で 0.65m×0.65m を入れると、ちょうど 0.65×0.65 の中抜き（面積は手で計算した値：屋根－0.4225㎡）
          ④屋根の外にはみ出す長方形は断る（中抜きも屋根も増えない） ⑤「✎ 自由」に切り替えると今までどおり点を打つ中抜き
          ⑥▭長方形（屋根）は今までどおり新しい屋根ができる ⑦JSエラーなし */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>{ localStorage.removeItem('nn_zumen_holemode'); }); await p.reload(); await p.waitForTimeout(2500);
 await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(300);
 /* 屋根：マス0..20 × 0..14（1マス＝state.scaleM m） */
 await p.evaluate(()=>{ state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:14},{x:0,y:14}],edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})),lv:0,name:'屋根①'}]; state.active=0; saveState(); draw(); });
 const at=async(gx,gy)=>{ const q=await p.evaluate(([gx,gy])=>{ const cv=document.getElementById('cv'), r=cv.getBoundingClientRect(); const k=r.width/(cv.width/devicePixelRatio);
   return {x:r.left+gx2px(gx)*k, y:r.top+gy2px(gy)*k}; },[gx,gy]); await p.mouse.click(q.x,q.y); await p.waitForTimeout(150); };
 await p.click('#tl_hole'); await p.waitForTimeout(200);
 const s1=await p.evaluate(()=>({tool, rect:!!window.__nnHoleRect, on:document.getElementById('tl_hole').classList.contains('on'), box:document.getElementById('tl_box').classList.contains('on'),
   hm:document.querySelectorAll('#hint [data-hm]').length}));
 ok('①中抜きを押すと長方形のかき方（中抜きが点灯・案内に2つの切り替え）', s1.rect&&s1.on&&!s1.box&&s1.hm===2, JSON.stringify(s1));
 await at(4,4); await at(8,6);
 const h2=await p.evaluate(()=>{ const po=state.polys[0]; const h=(po.holes||[])[0]; return {n:state.polys.length, holes:(po.holes||[]).length, pts:h?h.pts:null, edges:h?h.edges.length:0}; });
 const rect=h2.pts&&h2.pts.length===4&&h2.pts.every((q,i)=>{ const n=h2.pts[(i+1)%4]; return q.x===n.x||q.y===n.y; });
 const xs=h2.pts?h2.pts.map(q=>q.x):[], ys=h2.pts?h2.pts.map(q=>q.y):[];
 ok('②角を2回で屋根の中に長方形の中抜き（4点・直角・4マス×2マス）', h2.n===1&&h2.holes===1&&rect&&Math.max(...xs)-Math.min(...xs)===4&&Math.max(...ys)-Math.min(...ys)===2&&h2.edges===4, JSON.stringify(h2));
 /* ③ 寸法の札（幅・奥行きを数値で）＝nnNumAsk に答える */
 const s3=await p.evaluate(()=>{ const sc=state.scaleM; window.__ans=['0.65','0.65']; window.nnNumAsk=function(t,init,fn){ fn(window.__ans.shift()); };
   boxP1={x:12,y:4}; nnBoxDimensions({x:13,y:5}); const h=state.polys[0].holes[1];
   const w=h?(Math.max(...h.pts.map(q=>q.x))-Math.min(...h.pts.map(q=>q.x)))*sc:0, d=h?(Math.max(...h.pts.map(q=>q.y))-Math.min(...h.pts.map(q=>q.y)))*sc:0;
   return {holes:state.polys[0].holes.length, w:+w.toFixed(4), d:+d.toFixed(4), sc}; });
 ok('③寸法の札で 0.65m×0.65m の中抜き', s3.holes===2&&s3.w===0.65&&s3.d===0.65, JSON.stringify(s3));
 /* ④ はみ出し */
 await at(18,10); await at(24,12);
 const s4=await p.evaluate(()=>({n:state.polys.length, holes:state.polys[0].holes.length}));
 ok('④屋根の外にはみ出す長方形は断る', s4.n===1&&s4.holes===2, JSON.stringify(s4));
 /* ⑤ 自由に切り替え */
 await p.click('#hint [data-hm="free"]',{timeout:3000}).catch(()=>p.evaluate(()=>setTool('hole'))); await p.waitForTimeout(200);
 const s5a=await p.evaluate(()=>({tool, rect:!!window.__nnHoleRect}));
 await at(2,9); await at(5,9); await at(5,12); await at(2,9);
 const s5=await p.evaluate(()=>({holes:state.polys[0].holes.length, last:state.polys[0].holes.slice(-1)[0].pts.length}));
 ok('⑤「✎ 自由」で今までどおり点を打つ中抜き（3点の三角）', s5a.tool==='hole'&&!s5a.rect&&s5.holes===3&&s5.last===3, JSON.stringify({s5a,s5}));
 /* ⑥ ▭長方形（屋根） */
 await p.click('#tl_box'); await p.waitForTimeout(200); await p.evaluate(()=>{ window.nnNumAsk=function(t,i,fn){ fn(null); }; }); await at(22,2); await at(30,10);
 const s6=await p.evaluate(()=>({tool, n:state.polys.length, rect:!!window.__nnHoleRect, holes:state.polys[0].holes.length}));
 ok('⑥▭長方形は今までどおり新しい屋根', s6.n===2&&!s6.rect&&s6.holes===3, JSON.stringify(s6));
 ok('⑦JSエラーなし', errs.length===0, errs.join(' / ').slice(0,300));
 await b.close(); console.log(R.join('\n'));
})();
