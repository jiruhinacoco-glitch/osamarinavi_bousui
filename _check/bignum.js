/* 数値の入力欄に とんでもない数字を打っても、固まらない・数量が桁違いにならないか
   ★2026-08-24ai エンドラップに 999999999 と打つと、割付のくり返しが200万回になり
     画面が固まっていた（実測）。立上り・天端も上限が無く、数量が 4e298㎡ になっていた。
   使い方： node _check/bignum.js                                            */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FIELDS=['defH','defW','lapmm','endlapmm','sd_depth','calibm','rotdeg'];
const VALS=['999999999','-999999','1e300','あ',''];
let NG=0;
const say=(ok,label,extra)=>{ if(!ok)NG++; console.log((ok?'○   ':'★NG ')+label.padEnd(34)+(extra||'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
 args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

/* ① 入力欄に一気に打ち込んでも固まらない */
for(const v of VALS){
  const p=await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,45)));
  p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1400);
  await p.evaluate(()=>{try{nnZMenuClose(); loadSample();}catch(_){}});
  const r=await Promise.race([ p.evaluate(([F,V])=>{
      F.forEach(id=>{ const e=document.getElementById(id); if(!e)return;
        e.value=V; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); });
      const o={};
      try{ draw(); recalc(); setTab('wari'); setTab('zu'); o.画面=1; }catch(e){ o.画面='★'+e.message.slice(0,28); }
      try{ const q=quantities(state.polys[0], state.scaleM);
           o.桁=(q.tachi>1e6||q.tenba>1e6||!isFinite(q.tachi))?'★桁違い':'ok'; }catch(e){ o.桁='★'+e.message.slice(0,28); }
      try{ saveState(); o.保存=1; }catch(e){ o.保存='★'; }
      return o; }, [FIELDS,v]),
    new Promise(r=>setTimeout(()=>r({'':'★固まった'}),20000))]);
  say(!JSON.stringify(r).includes('★') && !errs.length, '入力欄に '+JSON.stringify(v),
      JSON.stringify(r)+' '+(errs[0]||''));
  await p.close();
}

/* ② 辺の編集からの巨大な値も丸められる */
{ const p=await b.newPage({viewport:{width:1400,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,45)));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1400);
  await p.evaluate(()=>{try{nnZMenuClose(); loadSample();}catch(_){}});
  const r=await p.evaluate(()=>{ const o={};
    sel={p:0,r:-1,e:0};
    edgeSet('h',999999999); edgeSet('w',999999999); edgeSet('agoD',999999999);
    o.辺={...state.polys[0].edges[0]};
    saveState(); loadState(); o.復元={...state.polys[0].edges[0]};
    const q=quantities(state.polys[0], state.scaleM);
    o.立上り=Math.round(q.tachi);
    if(window.nnSetDeckLv){ nnSetDeckLv(state.polys[0], 1e308); o.GL=state.polys[0].lv; }
    return o; });
  say(r.辺.h<=30000 && r.辺.w<=10000 && r.辺.agoD<=3000, '辺の編集に上限がある', JSON.stringify(r.辺));
  say(r.復元.h<=30000 && r.復元.w<=10000, '開き直しても上限が効く', JSON.stringify(r.復元));
  say(r.立上り<1e6, '数量が桁違いにならない', '立上り '+r.立上り+'㎡');
  say(isFinite(r.GL) && r.GL<=1000, 'GL+ に上限がある（0〜1000m）', 'GL+ '+r.GL);
  say(!errs.length, 'JSエラーなし', errs[0]||'');
  await p.close(); }
/* ③ ほかの10ページも、数値の欄に とんでもない数字を打って固まらないか */
const PAGES=['kirokucho_demo.html','hacchu.html','zairyo_toroku.html','shiyo_toroku.html',
             'library.html','genba_map_v36.html','camera.html','index.html','yougo.html','kokkosho.html'];
for(const f of PAGES){
  let bad='';
  for(const v of ['999999999','1e300','-999999']){
    const p=await b.newPage({viewport:{width:1400,height:900}});
    const errs=[]; p.on('pageerror',e=>errs.push((''+e).slice(0,45)));
    p.on('dialog',d=>d.accept());
    await p.goto('http://localhost:8899/'+f); await p.waitForTimeout(1400);
    const r=await Promise.race([ p.evaluate(V=>{
        const els=[...document.querySelectorAll('input[type=number],input[inputmode=decimal],input[inputmode=numeric]')];
        els.forEach(e=>{ try{ e.value=V;
          e.dispatchEvent(new Event('input',{bubbles:true}));
          e.dispatchEvent(new Event('change',{bubbles:true})); }catch(_){} });
        return {欄:els.length}; }, v),
      new Promise(r=>setTimeout(()=>r({'★固まった':1}),15000))]);
    await p.waitForTimeout(500);
    const body=await Promise.race([ p.evaluate(()=>
        /NaN|Infinity|undefined|\[object/.test(document.body.innerText)?'★あり得ない値':'ok'),
      new Promise(r=>setTimeout(()=>r('★固まった'),8000))]);
    if(JSON.stringify(r).includes('★')||String(body).startsWith('★')||errs.length)
      bad+=v+'＝'+JSON.stringify(r)+String(body)+(errs[0]||'')+' ';
    await p.close();
  }
  say(!bad, f, bad);
}
await b.close(); console.log('★NG'+NG);
})();
