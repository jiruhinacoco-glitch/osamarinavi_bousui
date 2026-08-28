/* ★2026-08-28e いろいろな図面の作りで、元請に出す書類6種が壊れないか。
   紙は元請に渡ってから気づくので、機械で先に見る（§206の考え方を広げたもの）。
   見るのは ①落ちない ②空にならない ③NaN・undefined が出ない ④図枠からはみ出さない。
   使い方: node _check/docmatrix.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:820}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1500);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ window.open=function(){ return {document:{write(h){window.__last=h;},close(){}},
      focus(){}, print(){}, closed:false, location:{}, addEventListener(){} }; }; });
  const SETUPS=[
   ['ふつうの長方形',()=>{ state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],edges:[0,1,2,3].map(()=>({h:400,w:300,k:'para'}))}]; }],
   ['L字',()=>{ state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:6},{x:10,y:6},{x:10,y:14},{x:0,y:14}],edges:[0,1,2,3,4,5].map(()=>({h:400,w:300,k:'para'}))}]; }],
   ['中抜きあり',()=>{ state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],edges:[0,1,2,3].map(()=>({h:400,w:300,k:'para'})),
      holes:[{pts:[{x:6,y:4},{x:12,y:4},{x:12,y:8},{x:6,y:8}],edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}]}]; }],
   ['屋根5枚',()=>{ state.polys=[0,1,2,3,4].map(i=>({name:'屋根'+(i+1),lv:i*1.5,
      pts:[{x:i*6,y:0},{x:i*6+5,y:0},{x:i*6+5,y:8},{x:i*6,y:8}],edges:[0,1,2,3].map(()=>({h:400,w:300,k:'para'}))})); }],
   ['弧＋笠木＋アゴ',()=>{ state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],
      edges:[0,1,2,3].map(()=>({h:400,w:300,k:'para',ago:1,agoD:120}))}]; state.active=0;
      nnKasagiSet(0,true); sel={p:0,r:-1,e:0}; nnEdgeArc(2000); sel=null; }],
   ['とても細長い',()=>{ state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:120,y:0},{x:120,y:3},{x:0,y:3}],edges:[0,1,2,3].map(()=>({h:400,w:300,k:'para'}))}]; }],
   ['とても小さい',()=>{ state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],edges:[0,1,2,3].map(()=>({h:400,w:300,k:'para'}))}]; }],
   ['名前がとても長い',()=>{ state.polys=[{name:'屋根①'+'あ'.repeat(60),lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],edges:[0,1,2,3].map(()=>({h:400,w:300,k:'para'}))}]; }],
  ];
  const DOCS=[['平面図','nnPlanPDF'],['断面詳細図','nnSectionPDF'],['施工層構成図','nnIsoPDF'],
              ['割付図','nnWariPDF'],['御見積書','nnMitsuPDF'],['標準納まり詳細図','nnDetailPDF']];
  const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
  for(const [snm,fn] of SETUPS){
    await p.evaluate(src=>{ state.scaleM=1; state.parts=[]; state.d3sol=[]; eval('('+src+')()');
      state.active=0; saveState(); recalc(); draw(); }, fn.toString());
    const out=[];
    for(const [dnm,f] of DOCS){
      const r=await p.evaluate(async(f)=>{
        window.__last=null;
        try{ if(f==='nnDetailPDF') window[f]('matsu'); else window[f](); }catch(e){ return {err:String(e.message||e).slice(0,40)}; }
        await new Promise(r2=>setTimeout(r2,500));
        const h=window.__last||'';
        if(!h) return {empty:1};
        /* 図枠（A3=420x297）からのはみ出しを、文字の位置で見る */
        const bad=[...h.matchAll(/<text x="([-0-9.]+)" y="([-0-9.]+)"/g)]
          .filter(m=>{const x=+m[1],y=+m[2]; return x<-2||x>425||y<-2||y>302;}).length;
        return {len:h.length, nan:/NaN|undefined|Infinity|\[object/.test(h), out:bad};
      }, f);
      out.push(dnm+':'+(r.err? '落ちた('+r.err+')' : r.empty? '空' :
        ((r.nan?'★NaN ':'')+(r.out?('★はみ出し'+r.out):'ok'))));
    }
    const ng=out.filter(x=>/落ちた|空|★/.test(x));
    ok(snm+'：書類6種がぜんぶ作れる', ng.length===0, ng.length? ng.join(' / ') : out.length+'種');
  }
  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log(R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
