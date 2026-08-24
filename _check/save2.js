/* 保存して開き直したとき、かいた図面が1つも欠けずに戻るか（いちばん怖い失敗＝データが消える）
   使い方: node _check/save2.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,ex)=>{ if(!c)ng++; console.log((c?'○ ':'★NG ')+m+(ex!==undefined?'  '+JSON.stringify(ex):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1500,height:900}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,90)));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1800);
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});

/* いろいろ入った図面を作る：屋根2面（片方に穴）・辺ごとの設定・役物・立体・断面・下地・仕様 */
const made=await p.evaluate(()=>{
  state.scaleM=1; state.polys=[]; state.parts=[]; state.d3sol=[];
  const A=[{x:0,y:0},{x:14,y:0},{x:14,y:10},{x:0,y:10}];
  const H=[{x:4,y:3},{x:7,y:3},{x:7,y:6},{x:4,y:6}];
  state.polys.push({name:'屋根①',lv:0,pts:A,
    holes:[{pts:H,edges:H.map(()=>({h:250,w:200,k:'para'}))}],
    edges:A.map(()=>({h:300,w:250,k:'para'})), kouzou:'salc', spec:'X-2', specT:'AS-T1'});
  const B=[{x:16,y:0},{x:24,y:0},{x:24,y:7},{x:16,y:7}];
  state.polys.push({name:'塔屋',lv:3,pts:B,holes:[],edges:B.map(()=>({h:500,w:300,k:'para'}))});
  /* 辺ごとの違い（水切りアゴ・壁当り・立上りなし） */
  state.polys[0].edges[0].ago=1; state.polys[0].edges[0].agoD=120;
  state.polys[0].edges[1].k='kabe'; state.polys[0].edges[2]={h:0,w:0,k:'free'};
  state.kouzou='w'; state.specCode='S-M2';
  /* 役物 */
  if(window.nnPartsAddLib) nnPartsAddLib({name:'テスト脱気筒',kind:'custom',w:200,d:200,h:300,price:4500});
  state.parts.push({p:(state.partsLib&&state.partsLib[0]&&state.partsLib[0].id)||1, x:5, y:8, r:90});
  /* 断面 */
  state.sect={cell:0.1, closed:true, wp:[1], depth:1.2,
    pts:[{x:0,y:0},{x:0.9,y:0},{x:0.9,y:0.3},{x:1.15,y:0.3},{x:1.15,y:-0.15},{x:0,y:-0.15}]};
  recalc(); saveState();
  return {面:state.polys.length, 穴:state.polys[0].holes.length, 役物:state.parts.length,
          断面点:state.sect.pts.length};
});
console.log('作った図面:', JSON.stringify(made));

/* 開き直す */
await p.reload({waitUntil:'load'}); await p.waitForTimeout(2200);
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});
const back=await p.evaluate(()=>{
  const P=state.polys;
  return {
    面:P.length, 名前:P.map(x=>x.name),
    高さ:P.map(x=>x.lv),
    穴:P[0]?P[0].holes.length:0,
    穴の点:P[0]&&P[0].holes[0]?P[0].holes[0].pts.length:0,
    穴の立上り:P[0]&&P[0].holes[0]?P[0].holes[0].edges[0].h:null,
    辺:P[0]?P[0].edges.map(e=>e.k+':'+e.h+'/'+e.w+(e.ago?'アゴ'+e.agoD:'')).join(' '):'',
    下地:P[0]?P[0].kouzou:null, 平場仕様:P[0]?P[0].spec:null, 立上り仕様:P[0]?P[0].specT:null,
    全体下地:state.kouzou, 全体仕様:state.specCode,
    役物:state.parts.length, 役物の向き:state.parts[0]?state.parts[0].r:null,
    断面点:state.sect&&state.sect.pts?state.sect.pts.length:0,
    断面の防水:state.sect?JSON.stringify(state.sect.wp):null,
    断面の奥行:state.sect?state.sect.depth:null,
    数量:(()=>{const q=quantities(P[0],state.scaleM); return {平場:+q.hira.toFixed(2), 立上り:+q.tachi.toFixed(2), アゴ:+q.agoA.toFixed(3)};})()
  };
});
ok(back.面===2,'屋根が2面とも戻る',back.面);
ok(JSON.stringify(back.名前)==='["屋根①","塔屋"]','名前が戻る',back.名前);
ok(JSON.stringify(back.高さ)==='[0,3]','高さ（GL+）が戻る',back.高さ);
ok(back.穴===1 && back.穴の点===4,'中抜き（穴）が戻る',{穴:back.穴,点:back.穴の点});
ok(back.穴の立上り===250,'穴の縁の立上りが戻る',back.穴の立上り);
ok(/para:300\/250アゴ120/.test(back.辺),'水切りアゴ（出120）が戻る',back.辺);
ok(/kabe:300/.test(back.辺),'壁当りの辺が戻る',back.辺);
ok(/free:0/.test(back.辺),'立上りなしの辺が戻る',back.辺);
ok(back.下地==='salc' && back.平場仕様==='X-2' && back.立上り仕様==='AS-T1',
   '屋根ごとの下地・仕様（平場／立上り別）が戻る',{下地:back.下地,平:back.平場仕様,立:back.立上り仕様});
ok(back.全体下地==='w' && back.全体仕様==='S-M2','現場ぜんぶの下地・仕様が戻る',{下:back.全体下地,仕:back.全体仕様});
ok(back.役物===1 && back.役物の向き===90,'置いた役物と向きが戻る',{数:back.役物,向き:back.役物の向き});
ok(back.断面点===6 && back.断面の奥行===1.2,'断面の形と奥行きが戻る',{点:back.断面点,奥行:back.断面の奥行});
ok(back.断面の防水==='[1]','断面の「防水層にした辺」が戻る',back.断面の防水);
ok(Math.abs(back.数量.平場-(140-9))<0.05,'数量（穴を引いた平場）が同じ',back.数量.平場);
ok(Math.abs(back.数量.アゴ-14*(120+40)/1000)<0.02,'アゴの面積が同じ',back.数量.アゴ);
ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
