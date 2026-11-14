/* PC の現場詳細：工事名と工事場所のあいだの境界線を光が走る（2026-11-15d）。直す前の版では★NG。
   ①線（::before）と光の点（::after）に動きがついている
   ②動きを途中（左寄り・右の折れ目の先）で止めて撮ると、白く光る点が「線の上」にある（線の高さ±3px）
   使い方: node _check/hikari.js [kirokucho_demo.html]   （http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d).slice(0,230):'')); if(!c)NG++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:1900,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof goProperty==='function'&&typeof props!=='undefined'); await p.waitForTimeout(1200);
await p.evaluate(()=>{goProperty(props[0].id);}); await p.waitForFunction(()=>!!document.querySelector('#detail.lay2 .dt1 > .dkv'),null,{timeout:15000});
/* 開いた直後は帯の位置がまだ動く → 0.5秒ごとに測って、2回続けて同じになるまで待つ */
await p.waitForFunction(()=>{const t=document.querySelector('#detail .dt1').getBoundingClientRect().top; const o=window.__hkT; window.__hkT=t; return o!==undefined&&Math.abs(o-t)<0.5;},null,{polling:500,timeout:15000});
const an=await p.evaluate(()=>document.getAnimations().filter(a=>a.effect&&a.effect.target&&a.effect.target.closest&&a.effect.target.closest('.dt1')||a.effect&&a.effect.pseudoElement).map(a=>[a.animationName,a.effect.pseudoElement]));
ok(an.some(a=>a[1]==='::after')&&an.some(a=>a[1]==='::before'),'①線と光の点に動きがついている',an);
for(const f of [0.3,0.9]){
  await p.evaluate(f=>{ let e=document.getElementById('hkat'); if(!e){e=document.createElement('style'); e.id='hkat'; document.head.appendChild(e);}
    /* 時刻 f で止めて表示（画面の描き直しで動きが作り直されても同じ位置になる） */
    const SEL='#detail#detail#detail#detail#detail#detail#detail#detail#detail .dt1::before, #detail#detail#detail#detail#detail#detail#detail#detail#detail .dt1::after';
    /* いったん動きを外してから付け直す（付けたままだと、指定した時刻に「動き始めてからの経過時間」が足される） */
    e.textContent=SEL+'{animation-name:none !important;}'; getComputedStyle(document.querySelector('#detail .dt1'),'::after').opacity; getComputedStyle(document.querySelector('#detail .dt1'),'::before').opacity;
    e.textContent='#detail#detail#detail#detail#detail#detail#detail#detail#detail .dt1::before, #detail#detail#detail#detail#detail#detail#detail#detail#detail .dt1::after{animation-delay:-'+(3400*0.62*f)+'ms !important; animation-play-state:paused !important;}';},f);
  await p.waitForTimeout(200);
  const g=await p.evaluate(f=>{ const L=document.getAnimations().filter(a=>a.effect&&a.effect.pseudoElement&&a.effect.target.classList.contains('dt1'));
    const t=document.querySelector('#detail .dt1'), r=t.getBoundingClientRect(), z=parseFloat(getComputedStyle(document.documentElement).zoom)||1, cs=getComputedStyle(t);
    const ly=parseFloat(cs.getPropertyValue('--ly')), ry=parseFloat(cs.getPropertyValue('--ry')), rw=parseFloat(cs.getPropertyValue('--rw'));
    const W=r.width/z, x=-28+f*(W+52), xk=W-rw-9;   /* 線の左はし -28px〜右はし +24px（.dt1 の座標・倍率前）を自分で計算 */
    const yl=(r.height/z)-(x<xk?ly:ry);
    return {n:L.length, x:(r.left/z+x)*z, y:(r.top/z+yl)*z, top:r.top};},f);
  await p.waitForTimeout(150);
  const clip={x:Math.max(0,g.x-60),y:g.y-30,width:120,height:60};
  const A=(await p.screenshot({clip})).toString('base64');
  await p.addStyleTag({content:'#detail .dt1::after{visibility:hidden !important;} #detail#detail#detail#detail#detail#detail#detail#detail#detail .dt1::before{background-image:none !important;}',}).then(h=>p.evaluate(e=>e.id='hkoff',h));
  await p.waitForTimeout(100);
  const B=(await p.screenshot({clip})).toString('base64');
  await p.evaluate(()=>document.getElementById('hkoff').remove());
  /* 光で明るくなった画素（光なしとの差が大きい所）だけを集める */
  const pts=await p.evaluate(async([a,b])=>{ const rd=async s=>{const im=new Image(); im.src='data:image/png;base64,'+s; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0); return [x.getImageData(0,0,c.width,c.height).data,c.width,c.height];};
    const [da,w,h]=await rd(a), [db]=await rd(b), out=[];
    for(let y=0;y<h;y++)for(let X=0;X<w;X++){const i=(y*w+X)*4; if((da[i]+da[i+1]+da[i+2])-(db[i]+db[i+1]+db[i+2])>150) out.push([X,y]);} return out;},[A,B]);
  /* 白い字の箱を除くため「白い点の数が少なめで、まとまっている所」の中心を見る */
  const cy=pts.length?pts.reduce((s,q)=>s+q[1],0)/pts.length:-99, cx=pts.length?pts.reduce((s,q)=>s+q[0],0)/pts.length:-99;
  ok(pts.length>=4&&Math.abs(cy-30)<=3*1.2+1&&Math.abs(cx-60)<=20,'②光の点が線の上にある（'+Math.round(f*100)+'%の位置）',{n:pts.length,cx:Math.round(cx),cy:Math.round(cy*10)/10,anim:g.n});
}
ok(errs.length===0,'エラーが出ていない',errs.slice(0,2));
await b.close(); console.log(NG?('★NG '+NG):'すべて○'); process.exit(NG?1:0);
})();
