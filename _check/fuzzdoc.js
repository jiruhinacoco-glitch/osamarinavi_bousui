/* ★2026-08-28e でたらめな屋根の形をたくさん作って、書類6種が壊れないかを見る。
   決まった形だけを試していると「実際の現場の形」で初めて出る不具合を見逃す。
   でたらめの出し方は毎回同じ（LCG）なので、落ちたときは同じ形で再現できる。
   使い方: node _check/fuzzdoc.js       （既定20通り＝120枚）
           node _check/fuzzdoc.js 60    （多めに）*/
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const N=+(process.argv[2]||20);
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:820}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1600);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ window.open=function(){ return {document:{open(){},write(h){window.__last=(window.__last||'')+h;},close(){}},
      focus(){}, print(){}, closed:false, location:{}, addEventListener(){} }; }; });
  const r=await p.evaluate(async(N)=>{
    /* 同じ結果になるでたらめ（LCG）＝落ちたとき再現できる */
    let seed=12345; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
    const DOCS=['nnPlanPDF','nnSectionPDF','nnIsoPDF','nnWariPDF','nnMitsuPDF','nnDetailPDF'];
    const bad=[]; let made=0;
    for(let it=0; it<N; it++){
      const np=1+Math.floor(rnd()*3);
      state.scaleM=[0.25,0.5,1][Math.floor(rnd()*3)];
      state.polys=[];
      for(let k=0;k<np;k++){
        const nv=3+Math.floor(rnd()*7);
        const cx=rnd()*30, cy=rnd()*20, R=2+rnd()*12;
        const pts=[]; for(let i=0;i<nv;i++){ const a=i/nv*Math.PI*2;
          const rr=R*(0.5+rnd()); pts.push({x:+(cx+Math.cos(a)*rr).toFixed(2), y:+(cy+Math.sin(a)*rr).toFixed(2)}); }
        const eds=pts.map(()=>({h:Math.floor(rnd()*900), w:Math.floor(rnd()*500),
          k:rnd()<0.25?'kabe':(rnd()<0.15?'free':'para'), ago:rnd()<0.2?1:0, agoD:100}));
        state.polys.push({name:'屋根'+(k+1), lv:+(rnd()*8).toFixed(1), pts, edges:eds});
      }
      state.active=0; state.parts=[]; state.d3sol=[];
      if(rnd()<0.4){ try{ sel={p:0,r:-1,e:0}; nnEdgeArc(Math.floor(rnd()*3000)-1500); sel=null; }catch(_){} }
      if(rnd()<0.3){ try{ nnKasagiSet(0,true); }catch(_){} }
      try{ saveState(); recalc(); draw(); }catch(e){ bad.push(it+' 画面 '+e.message.slice(0,40)); continue; }
      for(const f of DOCS){
        window.__last=null;
        try{ if(f==='nnDetailPDF') window[f]('matsu'); else window[f](); }
        catch(e){ bad.push(it+' '+f+' 落ちた '+e.message.slice(0,40)); continue; }
        await new Promise(r2=>setTimeout(r2,30));
        const s=window.__last||''; made++;
        if(!s){ bad.push(it+' '+f+' 空'); continue; }
        const m=(s.match(/NaN|Infinity|\[object Object\]/g)||[]);
        if(m.length) bad.push(it+' '+f+' '+[...new Set(m)].join(',')+'×'+m.length);
      }
    }
    return {made, total:bad.length, bad:bad.slice(0,12)};
  }, N);
  const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
  ok('でたらめな形でも書類が作れる（'+r.made+'枚）', r.total===0, r.total+'件 '+r.bad.slice(0,3).join(' / '));
  ok('紙が1枚も空にならない', !r.bad.some(x=>/空/.test(x)));
  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log(R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
