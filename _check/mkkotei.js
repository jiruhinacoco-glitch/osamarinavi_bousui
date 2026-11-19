/* §1342・§1343 作り方（自社仕様の工程ごとの決まり st.mk）の数量と3D。12m×8m・立上り300（4辺）で、手で計算した値と突き合わせる。
   仕様＝AS-T1 の自社仕様（国交省の書き方に合わせた見本）：
   1 プライマー 平場 塗る／2 入隅の増し張り 幅200／3 部分粘着 突きつけ（長手だけ・幅方向重ね100）1×10m／
   4 増し張り 突き付けの継ぎ目 幅200・1か所1,100／5 砂付 重ね100/100／6 立上り プライマー／7 立上り シート 重ね100・張り掛け100
   直す前の版は★NG。使い方: node _check/mkkotei.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
const ST=(no,w,mk)=>({no:String(no),w,matId:null,matName:'',srcP:'',u:null,coef:null,mk});
const SPECS={v:1,items:[{id:'t1',code:'AS-T1',name:'見本',cat:'改質アスファルトシート防水',sub:'',src:'自社',ap:'自社',updatedAt:Date.now(),steps:[
  ST(1,'プライマー',{bu:'hira',how:'nuru'}),
  ST(2,'入隅の増し張り',{bu:'hira',how:'mashi',at:'iri',w:200,sw:1,sl:10}),
  ST(3,'部分粘着シート',{bu:'hira',how:'tsuki',dir:'L',lapS:100,sw:1,sl:10}),
  ST(4,'増し張り（突き付け部）',{bu:'hira',how:'mashi',at:'seam',w:200,pl:1100,sw:1,sl:10}),
  ST(5,'砂付ルーフィング',{bu:'hira',how:'kasane',lapS:100,lapL:100,sw:1,sl:10}),
  ST(6,'立上り プライマー',{bu:'tachi',how:'nuru'}),
  ST(7,'立上り 密着シート',{bu:'tachi',how:'kasane',lapS:100,lapL:100,kake:100,sw:1,sl:10})]}]};
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1500,height:900}});
await ctx.addInitScript(s=>{ localStorage.setItem('nn_specs_v1',s); },JSON.stringify(SPECS));
const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1600);
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});
await p.evaluate(()=>{ state.specCode='AS-T1'; state.scaleM=1; state.polys=[]; state.parts=[]; state.d3sol=[]; delete state.d3mk;
  const pts=[{x:0,y:0},{x:12,y:0},{x:12,y:8},{x:0,y:8}];
  state.polys.push({name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}); state.active=0; recalc(); setTab('d3'); });
await p.waitForTimeout(2500);
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const has=await p.evaluate(()=>!!window.nnMkSteps&&!!nnMkSteps()&&nnMkSteps().L.length===7); ck(has,'同じ記号の自社仕様の作り方（7工程）を読める');
if(has){
 const q=await p.evaluate(()=>nnMkQty().Q.map(q=>({area:+q.area.toFixed(3), n:q.n, len:+q.len.toFixed(3), marea:q.marea!=null?+q.marea.toFixed(3):null, rolls:q.rolls})));
 const near=(a,b)=>Math.abs(a-b)<0.01, S=JSON.stringify;
 /* 手計算（向き＝x に沿う）
    1 塗る：12×8＝96㎡
    2 入隅：周り 40m・幅0.2→8㎡・1m幅の巻から5本×10m＝50m/巻 → 1巻
    3 突きつけ（長手だけ・幅方向重ね0.1）：有効幅0.9 → 帯 0,0.9,…,7.2 の9本。12m＝10m＋2m の2枚 → 18枚。巻：10m×9＋2m×9（5本で1巻）→ 9＋2＝11巻
    4 増し張り：長手の突き付け（x=10）が帯ごとに1か所＝9か所×1.1m＝9.9m・1.98㎡・1巻
    5 重ね 100/100：半分ずらし（−0.5 から）有効0.9 → 帯10本。12m＝[0,10]＋[9.9,12]（2.1m）→ 20枚。巻：10m×10＋2.1m×10（4本で1巻＝3巻）→ 13巻
    6 立上り 塗る：40m×0.3＝12㎡
    7 立上り 重ね：12m辺＝ceil(12/0.9)＝14枚・8m辺＝ceil(8/0.9)＝9枚 → 46枚、1枚0.3＋0.1＝0.4m。面積 40×0.4＝16㎡。巻：0.4m×46（10mに25枚）→ 2巻 */
 ck(near(q[0].area,96),'1 平場 塗る：96㎡（'+S(q[0])+'）');
 ck(near(q[1].len,40)&&near(q[1].marea,8)&&q[1].rolls===1,'2 入隅の増し張り：40m・8㎡・1巻（'+S(q[1])+'）');
 ck(q[2].n===18&&q[2].rolls===11,'3 突きつけ（長手だけ）：18枚・11巻（'+S(q[2])+'）');
 ck(q[3].n===9&&near(q[3].len,9.9)&&near(q[3].marea,1.98)&&q[3].rolls===1,'4 増し張り 1か所1,100：9か所・9.9m・1.98㎡・1巻（'+S(q[3])+'）');
 ck(q[4].n===20&&q[4].rolls===13,'5 重ね：20枚・13巻（'+S(q[4])+'）');
 ck(near(q[5].area,12),'6 立上り 塗る：12㎡（'+S(q[5])+'）');
 ck(q[6].n===46&&near(q[6].area,16)&&q[6].rolls===2,'7 立上り 重ね：46枚・16㎡・2巻（'+S(q[6])+'）');
 for(const k of [1,3,6]){
  await p.evaluate(k=>nnMkSet(k),k); await p.waitForTimeout(1800);
  const m=await p.evaluate(()=>{ let n=0,v=0; T.group.traverse(o=>{ if(o.name==='nnMkLayer'){ n++; v+=o.geometry.attributes.position.count; } }); return [n,v]; });
  ck(m[0]===1&&m[1]>0,'工程'+(k+1)+'を選ぶと3Dに層が出る（頂点 '+m[1]+'）');
  if(process.env.SHOT) await p.screenshot({path:(process.env.SHOT)+'_'+(k+1)+'.png'});
 }
}
console.log('errors',errs.slice(0,5)); console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
