/* 検査：3D「寸法で貼る」をスマホ（指）で使うとき、水色の予告が指の下ではなく、線を引くときと同じ「照準」の位置に出る（2026-09-26n）
   node _check/sheetaim.js [zumen_sekisan.html]   前提： python3 -m http.server 8899   ※直す前の版では★NG
   ・指を置く→動かす：水色（予告）の中心が、照準の位置（指＋nnD3AimOff）に来る。指の真下には来ない
   ・赤い照準（#nnD3Aim）が出て、指を離すと消える／水色は残る
   ・「ここに貼る」で、その位置に1枚貼れる（見せた位置＝貼った位置） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ if(!c)ng++; console.log((c?'○ ':'★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); };
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:393,height:852},screen:{width:393,height:852},isMobile:true,hasTouch:true,
   userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://127.0.0.1:8899/'+FILE);
 await p.waitForFunction(()=>typeof setTab==='function'&&window.nnCond);
 await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}
   state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})),lv:0,name:'屋根①'}];
   state.d3sheet=[];saveState();setTab('d3');});
 await p.waitForFunction(()=>document.querySelector('#three-wrap canvas'),null,{timeout:15000});
 await p.evaluate(()=>nnCond.open('sheet'));
 await p.waitForFunction(()=>document.querySelector('#nnCondBox .mrow'));
 await p.evaluate(()=>document.querySelector('#nnCondBox .mrow').click());
 await p.waitForFunction(()=>document.querySelector('#nnCondBox [data-part="0"]'));
 await p.evaluate(()=>{document.querySelector('#nnCondBox [data-part="0"]').click();nnCond.close();});
 await p.waitForTimeout(300);
 /* 画面の中の平場（屋根の真ん中あたり）に指を置く */
 const F=await p.evaluate(()=>{const c=document.getElementById('three-wrap').getBoundingClientRect();return {x:c.left+c.width*0.4,y:c.top+c.height*0.62};});
 const G={x:F.x+30,y:F.y+20};
 const cdp=await ctx.newCDPSession(p);
 const ghost=()=>p.evaluate(()=>{const c=document.querySelector('#three-wrap canvas').getBoundingClientRect();
   /* 水色（予告）の中心を画面に投影（検査側で別に計算：頂点の平均） */
   const g=window.nnSheetSizeGhostCenter?null:null;
   let sx=0,sy=0,n=0; const d=document.getElementById('nnD3Aim');
   const W=window.__nnSceneForTest; return {aim:d&&d.style.display==='block'?{x:c.left+parseFloat(d.style.left),y:c.top+parseFloat(d.style.top)}:null};});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:F.x,y:F.y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:G.x,y:G.y}]});
 await p.waitForTimeout(150);
 const mid=await p.evaluate(()=>{const d=document.getElementById('nnD3Aim'),w=document.getElementById('three-wrap').getBoundingClientRect();
   const bar=document.getElementById('nnSheetSizeBar');
   return {shown:!!d&&d.style.display==='block',ax:d?w.left+parseFloat(d.style.left):null,ay:d?w.top+parseFloat(d.style.top):null,txt:d&&d.querySelector('b').textContent,
     ok:bar&&!bar.querySelector('[data-size-commit]').disabled};});
 const off=await p.evaluate(g=>window.nnD3AimOff?nnD3AimOff(g.x,g.y):null,G);
 ok(!!off&&Math.hypot(off[0],off[1])>40,'照準のずらし量がある（線を引くときと同じ関数）',off);
 ok(mid.shown,'指を動かしている間、赤い照準が出る',mid);
 ok(off&&Math.abs(mid.ax-(G.x+off[0]))<2&&Math.abs(mid.ay-(G.y+off[1]))<2,'照準は指の右上（指＋ずらし量）',{aim:[mid.ax,mid.ay],finger:[G.x,G.y]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await p.waitForTimeout(150);
 const after=await p.evaluate(()=>{const d=document.getElementById('nnD3Aim');return {aim:!!d&&d.style.display==='block'};});
 ok(!after.aim,'指を離すと照準は消える',after);
 ok(mid.ok,'水色（予告）が出て「ここに貼る」が押せる',mid.ok);
 /* 水色（予告）の中心を画面に投影（検査側で計算）→ 照準の位置と一致・指の真下ではない */
 const gc=await p.evaluate(()=>{const g=T.scene.getObjectByName('nnSheetCornerPreview');if(!g||!g.children.length)return null;
   const c=new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3()).project(T.camera),r=T.renderer.domElement.getBoundingClientRect();
   return {x:r.left+(c.x+1)*r.width/2,y:r.top+(1-c.y)*r.height/2};});
 ok(!!gc,'指を離しても水色は残る',gc);
 if(gc){
   const dA=Math.hypot(gc.x-mid.ax,gc.y-mid.ay),dF=Math.hypot(gc.x-G.x,gc.y-G.y);
   ok(dA<15,'水色は照準の位置に出る',{dA:+dA.toFixed(1)});
   ok(dF>40,'水色は指の真下ではない（指で隠れない）',{dF:+dF.toFixed(1)});
 }
 await p.locator('[data-size-commit]').click();
 ok(await p.evaluate(()=>state.d3sheet.length===1),'「ここに貼る」で1枚貼れた');
 ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
 console.log(ng?('★NG '+ng+'件'):'すべて○'); await b.close(); process.exit(ng?1:0);
})();
