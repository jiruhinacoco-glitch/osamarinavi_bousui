/* 図形がおかしな形（点が0個・1個・2個／面積0／自分と交差／数字が化けている／
   座標がとんでもなく大きい）でも、落ちずに・固まらずに使えるか。
   ★「戻る」や点の削除で 0〜2個の形はできてしまう。
   ★寸法に 999999 と打つと座標が巨大になり、
     以前は絵を描く処理の中で**画面が固まって操作を受け付けなくなった**。
   使い方： node _check/degen.js                                            */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;
const ok=(t,c,x)=>{ if(!c)NG++; console.log((c?'○   ':'★NG ')+t+(x!==undefined?'  '+JSON.stringify(x).slice(0,110):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1500,height:950}});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,80)));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.waitForTimeout(700);
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4500);
const CASES=[
 ['点が0個', []],
 ['点が1個', [{x:5,y:5}]],
 ['点が2個', [{x:5,y:5},{x:9,y:5}]],
 ['同じ点が3つ（面積0）', [{x:5,y:5},{x:5,y:5},{x:5,y:5}]],
 ['一直線（面積0）', [{x:0,y:0},{x:5,y:0},{x:10,y:0}]],
 ['自分と交差（8の字）', [{x:0,y:0},{x:10,y:10},{x:10,y:0},{x:0,y:10}]],
 ['座標が文字', [{x:'あ',y:0},{x:5,y:0},{x:5,y:5}]],
 ['座標がとんでもなく大きい', [{x:0,y:0},{x:1e9,y:0},{x:1e9,y:1e9}]],
 ['座標が抜けている', [{x:0},{y:5},{x:5,y:5}]],
];
for(const [name,pts] of CASES){
  const before=errs.length;
  const t0=Date.now();
  const r=await p.evaluate((pp)=>{
    const out={};
    try{
      state.polys=[{name:'屋根①',lv:0,pts:pp,edges:pp.map(()=>({k:'para',h:300,w:250})),holes:[]}];
      state.active=0; sel=null; rsel=[]; dirty3d=true;
    }catch(e){ out.設定=e.message; }
    try{ draw(); }catch(e){ out.draw=e.message; }
    try{ recalc(); }catch(e){ out.recalc=e.message; }
    try{ build3D(); }catch(e){ out.build3D=e.message; }
    try{ renderPolyList(); }catch(e){ out.一覧=e.message; }
    try{ if(window.nnEstimateData) nnEstimateData(); }catch(e){ out.見積=e.message; }
    try{ T.renderer.render(T.scene,T.camera); }catch(e){ out.描画=e.message; }
    out.数量=(()=>{ try{ const q=quantities(state.polys[0], state.scaleM||0.5); return q&&+q.area; }catch(e){ return 'ERR:'+e.message; } })();
    return out;
  }, pts);
  const keys=Object.keys(r).filter(k=>k!=='数量');
  const newErr=errs.slice(before);
  const ms=Date.now()-t0;
  ok('「'+name+'」でも落ちない', keys.length===0 && newErr.length===0, keys.length?r:(newErr.length?newErr:{数量:r.数量}));
  ok('「'+name+'」で固まらない（5秒以内）', ms<5000, ms+'ms');
}
/* ── ③断面図（別の作図面）も、おかしな形で落ちない・固まらないか ── */
await p.evaluate(()=>{ try{ setTab('sect'); }catch(_){} }); await p.waitForTimeout(1200);
for(const [nm,pp,cl] of [
  ['点が0個', [], false],
  ['点が2個', [{x:0,y:0},{x:1,y:0}], false],
  ['閉じているのに2点', [{x:0,y:0},{x:1,y:0}], true],
  ['面積0（同じ点）', [{x:1,y:1},{x:1,y:1},{x:1,y:1}], true],
  ['座標が文字', [{x:'あ',y:0},{x:1,y:0},{x:1,y:1}], true],
  ['とんでもなく大きい', [{x:0,y:0},{x:1e9,y:0},{x:1e9,y:1e9}], true],
]){
  const t1=Date.now(); const b1=errs.length;
  const rr=await p.evaluate(([q,c])=>{
    const o={};
    try{ state.sect=state.sect||{}; state.sect.pts=q; state.sect.closed=c;
      state.sect.cell=state.sect.cell||0.1; state.sect.wp=[]; state.sect.depth=state.sect.depth||2; }catch(e){ o.設定=e.message; }
    try{ if(window.nnSdDraw) nnSdDraw(); else o.描き直し='nnSdDraw が無い（検査を直すこと）'; }catch(e){ o.描き直し=e.message; }
    try{ saveState(); }catch(e){ o.保存=e.message; }
    try{ if(window.nnSectDrawPDF){ const ow=window.open;
        window.open=function(){ return {document:{open(){},write(){},close(){}}, focus(){}, print(){}, close(){} }; };
        nnSectDrawPDF(); window.open=ow; } else o.PDF='nnSectDrawPDF が無い（検査を直すこと）'; }catch(e){ o.PDF=e.message; }
    return o;
  }, [pp, cl]);
  const ms1=Date.now()-t1, k1=Object.keys(rr), n1=errs.slice(b1);
  ok('断面「'+nm+'」でも落ちない・固まらない', k1.length===0 && n1.length===0 && ms1<5000,
     k1.length?rr:(n1.length?n1:ms1+'ms'));
}
await p.evaluate(()=>{ try{ state.sect.pts=[]; state.sect.closed=false; saveState(); setTab('zu'); }catch(_){} });
await p.waitForTimeout(500);

/* 最後に、ふつうの形に戻して使えるか */
await p.evaluate(()=>{ state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:10,y:0},{x:10,y:6},{x:0,y:6}],
  edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})),holes:[]}]; state.active=0; dirty3d=true; draw(); recalc(); build3D(); });
await p.waitForTimeout(400);
ok('そのあとふつうの図面に戻せる', await p.evaluate(()=>{ let n=0; T.group.traverse(()=>n++); return n>50; }));
await b.close();
console.log('★NG'+NG);
})();
