/* PC の現場詳細：工事名と工事場所のあいだの境界線を光が走る（2026-11-15d・11-15f 手直し）。直す前の版では★NG。
   ①光の点（::after）に動きがついている
   ②なめらか：動きは transform（位置をずらすだけ）と opacity だけ。線（::before）を毎コマ描き直す動き・offset-path を使わない（11-15f 本人「カクカクする」）
   ③たまに：1回の周期が 20秒以上（11-15f 本人「頻度が多すぎ」→ 11-15m「25秒に1回」）
   ⑤横にスクロールできない（11-15m 本人「右にスクロールする余裕がある。移動する光が原因」）
   ④動きを途中（左の線の上・右の折れ目の先）で止めて撮ると、光が「線の上」にある（線の高さ±3px）・小さい（光の高さ 14px 以下）
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
const an=await p.evaluate(()=>document.getAnimations().filter(a=>a.effect&&a.effect.pseudoElement&&a.effect.target&&a.effect.target.classList&&a.effect.target.classList.contains('dt1'))
  .map(a=>({pe:a.effect.pseudoElement, name:a.animationName, dur:a.effect.getTiming().duration, props:[...new Set(a.effect.getKeyframes().flatMap(k=>Object.keys(k).filter(x=>!/^(offset|easing|composite|computedOffset)$/.test(x))))]})));
const af=an.filter(a=>a.pe==='::after');
ok(af.length===1,'①光の点に動きがついている',an);
ok(an.length>0&&an.every(a=>a.pe==='::after'&&a.props.every(x=>x==='transform'||x==='opacity')),'②なめらか：動きは transform と opacity だけ（線の描き直し・offset-path なし）',an.map(a=>[a.pe,a.props]));
ok(af.length===1&&af[0].dur>=20000,'③たまに：周期が20秒以上',af.map(a=>a.dur));
const DUR=af.length?af[0].dur:3400;
const SEL='#detail#detail#detail#detail#detail#detail#detail#detail#detail .dt1::before, #detail#detail#detail#detail#detail#detail#detail#detail#detail .dt1::after';
for(const t of [0.025,0.075]){   /* 走るのは周期の 0〜8%：2.5%＝左の線の上／7.5%＝右の折れ目の先 */
  await p.evaluate(([ms,SEL])=>{ let e=document.getElementById('hkat'); if(!e){e=document.createElement('style'); e.id='hkat'; document.head.appendChild(e);}
    /* いったん動きを外してから付け直す（付けたままだと、指定した時刻に「動き始めてからの経過時間」が足される） */
    e.textContent=SEL+'{animation-name:none !important;}'; getComputedStyle(document.querySelector('#detail .dt1'),'::after').opacity;
    e.textContent=SEL+'{animation-delay:-'+ms+'ms !important; animation-play-state:paused !important;}';},[DUR*t,SEL]);
  await p.waitForTimeout(250);
  const g=await p.evaluate(()=>{ const t=document.querySelector('#detail .dt1'), r=t.getBoundingClientRect(), z=parseFloat(getComputedStyle(document.documentElement).zoom)||1, cs=getComputedStyle(t);
    const ly=parseFloat(cs.getPropertyValue('--ly')), ry=parseFloat(cs.getPropertyValue('--ry')), rw=parseFloat(cs.getPropertyValue('--rw'));
    return {L:r.left, T:r.top, W:r.width/z, H:r.height/z, z, ly, ry, rw};});
  /* 光の中心＝入れ物（::after）の左はし＋36px＋ずらし量 tx、下から 25.5px＋ずらし量 ty（倍率前の .dt1 の座標） */
  const m=await p.evaluate(()=>{ const t=document.querySelector('#detail .dt1'), a=getComputedStyle(t,'::after'), M=new DOMMatrix(a.transform==='none'?undefined:a.transform); return {left:parseFloat(a.left), tx:M.m41, ty:M.m42, op:+a.opacity};});
  const xd=m.left+36+m.tx, yd=g.H-25.5+m.ty, xk=g.W-g.rw-9;
  const lineYd=g.H-(xd<xk?g.ly:g.ry);   /* 線の高さ：折れ目の左は --ly、右は --ry（自分で計算） */
  /* その位置のまわり（左右30・上下20）を撮って、白く光っている画素の高さを測る */
  const sx=g.L+xd*g.z, sy=g.T+yd*g.z;
  const buf=(await p.screenshot({clip:{x:sx-30,y:sy-20,width:60,height:40}})).toString('base64');
  const px=await p.evaluate(async s=>{ const im=new Image(); im.src='data:image/png;base64,'+s; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0); const d=x.getImageData(0,0,c.width,c.height).data, out=[];
    /* 線の上の光だけを見る：白い欄（上下の段）を拾わないよう、まん中の帯（上下 ±9px）だけ。白に近い画素 */
    for(let y=11;y<29;y++)for(let X=20;X<40;X++){const i=(y*c.width+X)*4; if(d[i]+d[i+1]+d[i+2]>690) out.push([X,y]);} return out;},buf);
  const ys=px.map(q=>q[1]), hgt=px.length?(Math.max(...ys)-Math.min(...ys)+1)/g.z:0;
  ok(m.op>0.9&&Math.abs(yd-lineYd)<=1.5&&px.length>=2&&hgt<=14,'④光が線の上にあり、白く光り、小さい（'+Math.round(t*100)+'%の時刻）',{x:Math.round(xd),side:xd<xk?'左':'右',dy:Math.round((yd-lineYd)*10)/10,op:m.op,白:px.length,h:Math.round(hgt*10)/10});
}
/* ⑤光が右はしにいる時刻でも、詳細の画面が横にスクロールできない（はみ出しが無い） */
await p.evaluate(([ms,SEL])=>{ const e=document.getElementById('hkat'); e.textContent=SEL+'{animation-name:none !important;}'; getComputedStyle(document.querySelector('#detail .dt1'),'::after').opacity; e.textContent=SEL+'{animation-delay:-'+ms+'ms !important; animation-play-state:paused !important;}';},[DUR*0.079,SEL]);
await p.waitForTimeout(200);
const sc=await p.evaluate(()=>{ const D=document.getElementById('detail'); const before=D.scrollLeft; D.scrollLeft=500; const moved=D.scrollLeft; D.scrollLeft=0; const de=document.scrollingElement; de.scrollLeft=500; const pm=de.scrollLeft; de.scrollLeft=0; return {detail:moved, page:pm, sw:D.scrollWidth, cw:D.clientWidth};});
ok(sc.detail===0&&sc.page===0,'⑤横にスクロールできない（光が右はしにいる時刻でも）',sc);
ok(errs.length===0,'エラーが出ていない',errs.slice(0,2));
await b.close(); console.log(NG?('★NG '+NG):'すべて○'); process.exit(NG?1:0);
})();
