/* 屋根ごとに防水仕様がちがう図面で、見積の行と単価が正しく分かれるか（お金の話）。
   ★平場は屋根の仕様（p.spec）、立上り・天端は p.specT でまとめる（§160・§162）。
   使い方: node _check/mix1.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;
const ok=(t,c,x)=>{ if(!c)NG++; console.log((c?'○   ':'★NG ')+t+(x!==undefined?'  '+JSON.stringify(x).slice(0,140):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,80)));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1500);
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});

const codes=await p.evaluate(()=>SPECS.map(s=>s.code));
ok('仕様の一覧が読める（3種類以上）', codes.length>=3, codes);
const [A,B,C]=[codes[0], codes[3]||codes[1], codes[4]||codes[2]];

const r=await p.evaluate(([a,bb,c])=>{
  const mk=(ox,sp,spT)=>{ const pts=[{x:ox,y:0},{x:ox+10,y:0},{x:ox+10,y:6},{x:ox,y:6}];
    const o={name:'屋根'+ox, lv:0, pts, edges:pts.map(()=>({k:'para',h:300,w:250})), holes:[]};
    if(sp)o.spec=sp; if(spT)o.specT=spT; return o; };
  state.specCode=a;
  state.polys=[mk(0), mk(14,bb,c)];
  state.active=0; sel=null; state.parts=[]; saveState(); recalc();
  const D=nnEstimateData(), s=state.scaleM||0.5;
  const S=x=>SPECS.find(z=>z.code===x);
  const qA=quantities(state.polys[0],s), qB=quantities(state.polys[1],s);
  const find=n=>D.rows.find(r=>r.n===n);
  return {
    rows:D.rows.map(x=>x.n),
    平場A:find('平場防水（'+a+'）'), 平場B:find('平場防水（'+bb+'）'),
    立上りA:find('立上り防水（'+a+'）'), 立上りB:find('立上り防水（'+c+'）'),
    天端A:find('天端防水（'+a+'）'), 天端B:find('天端防水（'+c+'）'),
    手:{hA:+qA.hira.toFixed(2), hB:+qB.hira.toFixed(2), tA:+qA.tachi.toFixed(2), tB:+qB.tachi.toFixed(2),
        eA:+qA.tenba.toFixed(2), eB:+qB.tenba.toFixed(2)},
    単価:{a:S(a).prices, b:S(bb).prices, c:S(c).prices}
  };
},[A,B,C]);

const near=(x,y)=>Math.abs(x-y)<0.15;
ok('平場が仕様ごとに分かれる（2行）', !!r.平場A && !!r.平場B, r.rows);
ok('平場Aの数量が手計算と合う', r.平場A && near(r.平場A.q, r.手.hA), [r.平場A&&r.平場A.q, r.手.hA]);
ok('平場Bの数量が手計算と合う', r.平場B && near(r.平場B.q, r.手.hB), [r.平場B&&r.平場B.q, r.手.hB]);
ok('平場Aの単価がAの仕様のもの', r.平場A && r.平場A.p===r.単価.a.hira, [r.平場A&&r.平場A.p, r.単価.a.hira]);
ok('平場Bの単価がBの仕様のもの', r.平場B && r.平場B.p===r.単価.b.hira, [r.平場B&&r.平場B.p, r.単価.b.hira]);
ok('立上りが仕様ごとに分かれる（2行）', !!r.立上りA && !!r.立上りB);
ok('立上りAの単価がAの仕様のもの', r.立上りA && r.立上りA.p===r.単価.a.tachi, [r.立上りA&&r.立上りA.p, r.単価.a.tachi]);
ok('立上りBの単価が「立上りの仕様」のもの', r.立上りB && r.立上りB.p===r.単価.c.tachi, [r.立上りB&&r.立上りB.p, r.単価.c.tachi]);
ok('天端Bの単価が「立上りの仕様」のもの', r.天端B && r.天端B.p===r.単価.c.tenba, [r.天端B&&r.天端B.p, r.単価.c.tenba]);
ok('天端の数量が手計算と合う', r.天端A && r.天端B && near(r.天端A.q,r.手.eA) && near(r.天端B.q,r.手.eB),
   [r.天端A&&r.天端A.q, r.手.eA, r.天端B&&r.天端B.q, r.手.eB]);

/* 御見積書の紙にも、分かれた行がそのまま出るか */
const paper=await p.evaluate(([a,bb])=>{
  let html=''; const _o=window.open;
  window.open=function(){ return {document:{open(){},write(h){html+=h;},close(){}},focus(){},print(){},addEventListener(){},location:{}}; };
  try{ nnMitsuPDF({to:'元請',title:'防水',place:'—',keihiRate:10,nebiki:0,days:30}); }catch(e){ return 'ERR:'+e.message; }
  window.open=_o;
  const t=html.replace(/<[^>]+>/g,' ');
  return {a:t.indexOf('平場防水（'+a+'）')>=0, b:t.indexOf('平場防水（'+bb+'）')>=0, nan:/NaN|undefined/.test(t)};
},[A,B]);
ok('御見積書の紙にも仕様ごとの行が出る', paper && paper.a && paper.b && !paper.nan, paper);
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
await b.close();
console.log('★NG'+NG);
})();
