/* §1342 作り方（自社仕様の工程ごとの決まり st.mk）の数量と3D：10m×8m の長方形で、手で計算した値と突き合わせる。
   仕様＝AS-T1 の自社仕様（プライマー 塗る／部分粘着 突きつけ 1×10m／増し張り 継ぎ目 幅200／砂付 重ね 100・100）。直す前の版は★NG。
   使い方: node _check/mkkotei.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const F=process.argv[2]||'zumen_sekisan.html', W=+process.argv[3]||1500, H=+process.argv[4]||900, out=process.argv[5]||'mk3.png';
const ctx=await b.newContext(W<600?{viewport:{width:W,height:H},deviceScaleFactor:3,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}:{viewport:{width:W,height:H}});
const specs="{\"v\":1,\"items\":[{\"id\":\"spmwn6ktjd7slk2\",\"presetId\":\"S027\",\"code\":\"AS-T1\",\"name\":\"\u5c4b\u6839\u9732\u51fa\u9632\u6c34\u5bc6\u7740\u5de5\u6cd5\uff08\u30c8\u30fc\u30c1\u5de5\u6cd5\uff09\",\"cat\":\"\u6539\u8cea\u30a2\u30b9\u30d5\u30a1\u30eb\u30c8\u30b7\u30fc\u30c8\u9632\u6c34\",\"sub\":\"\u5c4b\u6839\u9732\u51fa\u9632\u6c34\u5bc6\u7740\u5de5\u6cd5\",\"src\":\"\u65b0\u7bc9 \u88689.3.1\uff0f\u6539\u4fee \u88683.4.1\uff08M4AS\u5de5\u6cd5\uff09\",\"ap\":\"\u65b0\u7bc9\u30fb\u6539\u4fee\",\"note\":\"\u4ed5\u4e0a\u5857\u6599\u306e\u7a2e\u985e\u304a\u3088\u3073\u4f7f\u7528\u91cf\u306f\u7279\u8a18\u306b\u3088\u308b\u3002SP\u30d5\u30a1\u30a4\u30f3\u30ab\u30e9\u30fc\u306b\u4ee3\u3048\u3066SP\u30df\u30c3\u30c9\u30ab\u30e9\u30fc\u3001SP\u30b5\u30fc\u30e2\u30b3\u30fc\u30c8\u3001SP\u30b9\u30fc\u30d1\u30fc\u30b5\u30fc\u30e2\u30b3\u30fc\u30c8\u3001SP\u30de\u30eb\u30c1\u30ab\u30e9\u30fc\u3001SP\u30af\u30ea\u30fc\u30f3\u30ab\u30e9\u30fc\u306e\u4f7f\u7528\u3082\u53ef\u3002ALC\u30d1\u30cd\u30eb\u4e0b\u5730\u306e\u5834\u5408\u306f\u5de5\u7a0b1\u306e\u30d7\u30e9\u30a4\u30de\u30fc\u4f7f\u7528\u91cf\u3092\uff08\u3000\uff09\u5185\u3068\u3059\u308b\u3002\u4e0b\u5730\u304c\u65e2\u5b58\u9632\u6c34\u5c64\u306e\u5834\u5408\u306f\u5de5\u7a0b1\u3092\u7701\u7565\u3057\u30ea\u30d9\u30fc\u30b9\u30921.0kg/\u33a1\u7a0b\u5ea6\u5857\u5e03\uff08\u6539\u4fee\u4ed5\u69d8\u66f83.2.6\u3088\u308a\uff09\u3002\",\"steps\":[{\"no\":\"1\",\"w\":\"\u30d7\u30e9\u30a4\u30de\u30fc\u5857\u308a\",\"matId\":\"M003\",\"matName\":\"\u6c34\u6027\u30d7\u30e9\u30a4\u30de\u30fcAS\",\"srcP\":\"\u6c34\u6027\u30d7\u30e9\u30a4\u30de\u30fcAS\u5857\u308a\",\"u\":0.2,\"coef\":null,\"mk\":{\"bu\":\"hira\",\"how\":\"nuru\"}},{\"no\":\"2\",\"w\":\"\u90e8\u5206\u7c98\u7740\u6539\u8cea\u30a2\u30b9\u30d5\u30a1\u30eb\u30c8\u30b7\u30fc\u30c8\",\"matId\":\"M068\",\"matName\":\"\u30dd\u30ea\u30de\u30ea\u30c3\u30c825\",\"srcP\":\"\u30dd\u30ea\u30de\u30ea\u30c3\u30c825\",\"u\":null,\"coef\":1,\"mk\":{\"bu\":\"hira\",\"how\":\"tsuki\",\"sw\":1,\"sl\":10}},{\"no\":\"3\",\"w\":\"\u5897\u3057\u5f35\u308a\uff08\u7a81\u304d\u3064\u3051\u90e8\uff09\",\"matId\":\"M068\",\"matName\":\"\u30dd\u30ea\u30de\u30ea\u30c3\u30c825\",\"srcP\":\"\",\"u\":null,\"coef\":null,\"mk\":{\"bu\":\"hira\",\"how\":\"mashi\",\"at\":\"seam\",\"w\":200,\"sw\":1,\"sl\":10}},{\"no\":\"4\",\"w\":\"\u7802\u4ed8\u30eb\u30fc\u30d5\u30a3\u30f3\u30b0\",\"matId\":\"M071\",\"matName\":\"\u30dd\u30ea\u30de\u30ea\u30c3\u30c8\u30d5\u30a7\u30fc\u30b9\",\"srcP\":\"\u30dd\u30ea\u30de\u30ea\u30c3\u30c8\u30d5\u30a7\u30fc\u30b9 \u307e\u305f\u306f \u30dd\u30ea\u30de\u30ea\u30c3\u30c835\",\"u\":null,\"coef\":1,\"mk\":{\"bu\":\"hira\",\"how\":\"kasane\",\"sw\":1,\"sl\":10,\"lapS\":100,\"lapL\":100}}],\"memo\":\"\",\"createdAt\":1795070416009,\"updatedAt\":1795070417276}]}";
await ctx.addInitScript(s=>{ localStorage.setItem('nn_specs_v1',s); },specs);
const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1600);
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});
await p.evaluate(()=>{ state.specCode='AS-T1'; state.scaleM=1; state.polys=[]; state.parts=[]; state.d3sol=[];
  const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
  state.polys.push({name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}); state.active=0; recalc(); setTab('d3'); });
await p.waitForTimeout(2500);
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const has=await p.evaluate(()=>!!window.nnMkSteps&&!!nnMkSteps()); ck(has,'同じ記号の自社仕様の作り方を読める');
if(has){
 const q=await p.evaluate(()=>nnMkQty().Q.map(q=>({how:q.st.how, area:q.area, n:q.n, len:q.len, rolls:q.rolls})));
 console.log(JSON.stringify(q));
 /* 手計算：向き h（x に沿う）。平場 80㎡。
    突きつけ 1m幅×10m巻：帯は y=0..8 で8本、1本は長さ10m＝1枚 → 8枚・8巻。継ぎ目＝帯の境目7本×10m＝70m（長手の切れ目なし）
    増し張り＝その継ぎ目 70m、幅200 → 14㎡、1m幅の巻から5本取り（10m×5＝50m/巻）→ 2巻
    重ね 100/100：半分ずらし（y=-0.5 から）有効幅0.9m → 帯の始まり -0.5,0.4,…,7.6 の10本。各10m＝1巻ぶん（長手ラップは巻の切れ目が無いので出ない）→ 10枚・10巻 */
 const near=(a,b)=>Math.abs(a-b)<0.01;
 ck(near(q[0].area,80),'1 塗る：80㎡（出た値 '+q[0].area+'）');
 ck(q[1].n===8&&q[1].rolls===8,'2 突きつけ：8枚・8巻（出た値 '+q[1].n+'枚・'+q[1].rolls+'巻）');
 ck(near(q[2].len,70)&&q[2].rolls===2,'3 増し張り：継ぎ目70m・2巻（出た値 '+q[2].len+'m・'+q[2].rolls+'巻）');
 ck(q[3].n===10&&q[3].rolls===10,'4 重ね：10枚・10巻（出た値 '+q[3].n+'枚・'+q[3].rolls+'巻）');
 for(const k of [3,1,2]){
  await p.evaluate(k=>nnMkSet(k),k); await p.waitForTimeout(1800);
  const m=await p.evaluate(()=>{ let n=0,v=0; T.group.traverse(o=>{ if(o.name==='nnMkLayer'){ n++; v+=o.geometry.attributes.position.count; } }); return [n,v]; });
  ck(m[0]===1&&m[1]>0,'工程'+(k+1)+'を選ぶと3Dに層が出る（頂点 '+m[1]+'）');
  if(process.env.SHOT) await p.screenshot({path:out.replace('.png','_'+(k+1)+'.png')});
 }
}
console.log('errors',errs.slice(0,5)); console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
