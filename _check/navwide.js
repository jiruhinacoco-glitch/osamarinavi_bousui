/* 下のメニューの絵（横に広い 300×168）を、並びの幅は今までどおり（223×168 の分）にして、文字だけ左右にはみ出させる（2026-10-25p §792）
   ①スマホ：どの絵も 実際の幅＋左右の余白 ＝ 高さ×223/168（±1px）・絵は押しつぶされていない（幅/高さ ＝ 300/168）
   ②パソコン（左の縦並び）：絵が枠（nav）の外へ出ない・押しつぶされていない ③JSエラーなし
   使い方: node _check/navwide.js [ページ.html]（compact_buttons.js の nnNavWide が無い版では①が★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
(async()=>{const b=await chromium.launch();
for(const [lbl,vp,ph] of [['スマホ',{width:393,height:852},1],['PC',{width:1440,height:900},0]]){
  const p=await b.newPage({viewport:vp,deviceScaleFactor:2,isMobile:!!ph,hasTouch:!!ph}); const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  if(ph) await p.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(2500);
  const r=await p.evaluate(()=>[...document.querySelectorAll('nav .ni .ic img')].map(im=>{ const cs=getComputedStyle(im), nav=im.closest('nav').getBoundingClientRect(), bb=im.getBoundingClientRect();
    return {k:(im.getAttribute('src')||'').replace(/^.*nav_|\.png.*$/g,''), w:im.offsetWidth, h:im.offsetHeight, ml:parseFloat(cs.marginLeft)||0, mr:parseFloat(cs.marginRight)||0, inNav:im.offsetWidth<=im.closest('nav').clientWidth,
      /* ★2026-10-26u（§812）パソコンは帯より大きくして右へはみ出させる約束に変わった：左は透明なあき（幅の4.3%）だけ画面の外・右のはみ出しは帯の幅の35%まで（選択中は少し拡大する分を含む）・帯の幅の1.15倍以上 */
      lOut:(bb.left-nav.left)/bb.width, rOver:(bb.right-nav.right)/nav.width, big:im.offsetWidth/im.closest('nav').clientWidth}; }));   /* 選択中は CSS で少し拡大する作りなので、拡大前の幅（offsetWidth）で比べる */
  if(ph){ const bad=r.filter(x=>Math.abs(x.w+x.ml+x.mr-x.h*223/168)>1.2 || Math.abs(x.w/x.h-300/168)>0.03);
    ok(r.length===9&&!bad.length,lbl+' ①並びの幅は今までどおり・絵は押しつぶされていない',bad.slice(0,3)); }
  else { const bad=r.filter(x=>x.lOut<-0.06 || x.rOver>0.35 || x.big<1.15 || Math.abs(x.w/x.h-300/168)>0.03);
    ok(r.length===9&&!bad.length,lbl+' ②絵は帯より大きい（1.15倍以上）・左は画面の外へ透明なあきだけ・右のはみ出しは帯の35%まで（選択中の拡大を含む）・押しつぶされていない',bad.slice(0,3)); }
  /* ④（§793）選択中の光（オーラ）は小さく：drop-shadow が1重・ぼかし2px以内 */
  const fl=await p.evaluate(()=>{const n=document.querySelector('nav .ni.hasimg.on'); return n?getComputedStyle(n).filter:'';});
  const blurs=[...fl.matchAll(/drop-shadow\([^)]*?\)\s*[-\d.]+px\s+[-\d.]+px\s+([\d.]+)px/g)].map(m=>+m[1]);
  ok(fl&&blurs.length===1&&blurs[0]<=2,lbl+' ④選択中の光は1重・ぼかし2px以内',fl);
  /* ⑤（§795・§796）帯の色は上の見出しの帯（header）と同じ・スマホは帯の高さ98px以下（操作画面を広く） */
  const nv=await p.evaluate(()=>{const n=document.getElementById('nav'), h=document.querySelector('header'), a=getComputedStyle(n).backgroundImage, c=h?getComputedStyle(h).backgroundImage:'';
    return {same:!!c&&c!=='none'&&a===c, nav:a.slice(-90), hdr:c.slice(-90), h:Math.round(n.getBoundingClientRect().height)};});
  ok((nv.same||nv.hdr==='none'&&/72, 194, 116/.test(nv.nav))&&(!ph||nv.h<=98),lbl+' ⑤帯の色が上の見出しの帯と同じ'+(ph?'・高さ98px以下':''),nv);
  ok(!errs.length,lbl+' ③JSエラーなし',errs.slice(0,2));
  await p.close(); }
await b.close(); console.log(ng?'★NG '+ng+'件':'全項目○');})().catch(e=>{console.log('★NG 実行エラー '+String(e.message||e).split('\n')[0]);process.exit(1);});
