/* ★2026-08-28e でたらめな屋根で3Dを組み立て続けて、
   ①落ちない ②座標がNaNにならない ③GPUに載る形が増え続けない、を見る。
   でたらめの出し方は毎回同じ（LCG）なので、落ちたときは同じ形で再現できる。
   使い方: node _check/fuzz3d.js  ／  node _check/fuzz3d.js 40 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const N=+(process.argv[2]||20);
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1000,height:700}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1600);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.renderer;}catch(_){return false;}},null,{timeout:25000});
  await p.waitForTimeout(1200);
  const r=await p.evaluate(async(N)=>{
    let seed=987; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
    const bad=[]; const geo=[];
    for(let it=0; it<N; it++){
      const np=1+Math.floor(rnd()*3);
      state.scaleM=[0.25,0.5,1][Math.floor(rnd()*3)];
      state.polys=[];
      for(let k=0;k<np;k++){
        const nv=3+Math.floor(rnd()*7);
        const cx=rnd()*30, cy=rnd()*20, R=1+rnd()*12;
        const pts=[]; for(let i=0;i<nv;i++){ const a=i/nv*Math.PI*2;
          const rr=R*(0.5+rnd()); pts.push({x:+(cx+Math.cos(a)*rr).toFixed(2), y:+(cy+Math.sin(a)*rr).toFixed(2)}); }
        const eds=pts.map(()=>({h:Math.floor(rnd()*900), w:Math.floor(rnd()*500),
          k:rnd()<0.25?'kabe':(rnd()<0.15?'free':'para'), ago:rnd()<0.2?1:0, agoD:100}));
        state.polys.push({name:'屋根'+(k+1), lv:+(rnd()*8).toFixed(1), pts, edges:eds,
          genkyo:['','body','exist'][Math.floor(rnd()*3)]});
      }
      state.kouzou=['rc','salc','src','w','sdeck'][Math.floor(rnd()*5)];
      state.active=0;
      if(rnd()<0.4){ try{ sel={p:0,r:-1,e:0}; nnEdgeArc(Math.floor(rnd()*3000)-1500); sel=null; }catch(_){} }
      if(rnd()<0.3){ try{ nnKasagiSet(0,true); }catch(_){} }
      try{ saveState(); recalc(); dirty3d=true; build3D(); }
      catch(e){ bad.push(it+' build3D落ちた '+e.message.slice(0,50)); continue; }
      await new Promise(r2=>setTimeout(r2,60));
      /* 座標に NaN が無いか */
      let nan=0, tri=0;
      T.scene.traverse(o=>{ if(!o.isMesh||!o.geometry||!o.geometry.attributes)return;
        const a=o.geometry.attributes.position; if(!a)return;
        tri+=(o.geometry.index?o.geometry.index.count:a.count)/3;
        for(let i=0;i<a.count;i++){ if(!isFinite(a.getX(i))||!isFinite(a.getY(i))||!isFinite(a.getZ(i))){ nan++; break; } }
      });
      if(nan) bad.push(it+' 3Dの座標にNaN '+nan+'個の形');
      geo.push(T.renderer.info.memory.geometries);
    }
    return {bad:bad.slice(0,10), total:bad.length,
      geoFirst:geo[0], geoLast:geo[geo.length-1], geoMax:Math.max(...geo)};
  }, N);
  const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
  ok('でたらめな形でも3Dが組み立てられる', r.total===0, r.total+'件 '+r.bad.slice(0,3).join(' / '));
  ok('3Dの座標にNaNが出ない', !r.bad.some(x=>/NaN/.test(x)));
  ok('GPUに載る形が増え続けない', r.geoMax<2000, '最初'+r.geoFirst+'→最後'+r.geoLast+'（最大'+r.geoMax+'）');
  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log(R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
