/* ★2026-09-29p 積算の表に区画ごとの小計（§554）
   使い方: node _check/subtotal.js [zumen_sekisan.html]
   ○/★NG：ノートの西新井（17×10.5＋出っ張り2.4×1.3・中抜き650角×2・H460 W200）と塔屋（3.52×2.47）を入れると、
          区画ごとの小計がノートと同じ（床180.775→180.77〜180.78／外周62.80／立上り28.89、塔屋 床8.69・外周11.98）・合計の行・JSエラーなし
   ★答えはノートの数字と手計算（関数を使わない） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(2500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
 const t=await p.evaluate(()=>{
   const E=n=>Array.from({length:n},()=>({k:'para',h:460,w:200}));
   const main=[{x:0,y:0},{x:340,y:0},{x:340,y:210},{x:200,y:210},{x:200,y:236},{x:152,y:236},{x:152,y:210},{x:0,y:210}];
   const hole=(x,y)=>({pts:[{x,y},{x:x+13,y},{x:x+13,y:y+13},{x,y:y+13}],edges:E(4)});
   state.scaleM=0.05;
   state.polys=[{name:'主屋上',lv:0,pts:main,edges:E(8),holes:[hole(60,80),hole(200,90)]},
                {name:'塔屋',lv:0,pts:[{x:400,y:0},{x:470.4,y:0},{x:470.4,y:49.4},{x:400,y:49.4}],edges:E(4)}];
   saveState(); recalc();
   const tb=document.querySelector('#sekisan table.nnsub'); if(!tb) return null;
   return [...tb.querySelectorAll('tr')].slice(1).map(tr=>[...tr.children].map(td=>td.innerText.replace(/\s+/g,' ').trim())); });
 ok('区画ごとの小計の表がある', !!t, JSON.stringify(t));
 if(t){
   const n=v=>parseFloat(v);
   const a=t[0], c=t[1], s=t[2];
   ok('主屋上 床＝180.775㎡（ノート）', a&&Math.abs(n(a[1])-180.775)<=0.006, a&&a[1]);
   ok('主屋上 外周＝62.8m（57.6＋0.65×4×2）', a&&Math.abs(n(a[2])-62.8)<0.006, a&&a[2]);
   ok('主屋上 立上り＝62.8×0.46＝28.888㎡', a&&Math.abs(n(a[3])-28.888)<0.006, a&&a[3]);
   ok('主屋上に「中抜き2か所」', a&&/中抜き2か所/.test(a[0]), a&&a[0]);
   ok('塔屋 床＝3.52×2.47＝8.6944→8.69', c&&c[1]==='8.69', c&&c[1]);
   ok('塔屋 外周＝11.98m', c&&c[2]==='11.98', c&&c[2]);
   ok('合計の行（床＝189.4694→189.47）', s&&s[0]==='合計'&&Math.abs(n(s[1])-189.4694)<0.006, JSON.stringify(s));
 }
 ok('JSエラーなし', errs.length===0, errs.join(' / ').slice(0,200));
 await b.close(); console.log(R.join('\n'));
})();
