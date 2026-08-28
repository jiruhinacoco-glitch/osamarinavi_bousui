const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1920,height:1080}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2400);
  const d=await p.evaluate(()=>{
    /* ★zoom をかけているときは getBoundingClientRect が倍率後のpxを返すので割ってそろえる */
    const Z=window.nnPZ||1;
    const e=document.querySelector('.httl'), bf=getComputedStyle(e,'::before'), c=getComputedStyle(e);
    const chip=getComputedStyle(document.querySelector('.stchip.on'));
    const rects=[...document.querySelectorAll('.httl')].map(x=>{
      const b=x.getBoundingClientRect(), par=x.closest('.dpanel').getBoundingClientRect();
      return {in:b.left>=par.left && b.right<=par.right};});
    return {tf:bf.transform, bg:bf.backgroundImage, bd:bf.borderTopWidth+' '+bf.borderTopColor,
      sh:bf.boxShadow, ct:bf.content, br:bf.borderRadius, pe:bf.pointerEvents,
      ts:c.webkitTextStrokeWidth,
      bodyFF:getComputedStyle(document.body).fontFamily.split(',')[0],
      pl:c.paddingLeft, fs:c.fontSize, fw:c.fontWeight, col:c.color, ff:c.fontFamily.split(',')[0],
      ws:c.whiteSpace, padN:parseFloat(c.paddingLeft),
      hs:[...document.querySelectorAll('.httl')].map(x=>Math.round(x.getBoundingClientRect().height/Z)),
      lines1:[...document.querySelectorAll('.httl')].every(x=>{const cc=getComputedStyle(x);
        return x.getBoundingClientRect().height/Z <= parseFloat(cc.fontSize)+parseFloat(cc.paddingTop)+parseFloat(cc.paddingBottom)+2;}),
      pics:[...document.querySelectorAll('.httl img.hpic')].map(x=>({f:x.getAttribute('src').split('/').pop(),
        ok:x.naturalWidth>0, w:Math.round(x.getBoundingClientRect().width/Z)})),
      chipBr:chip.borderRadius, n:rects.length, allIn:rects.every(r=>r.in),
      ov:document.documentElement.scrollWidth-innerWidth};
  });
  console.log(JSON.stringify(d,null,1).slice(0,900));
  const m=d.tf.match(/matrix\(([-\d.]+), ([-\d.]+), ([-\d.]+)/);
  ok('平行四辺形になっている（skew）', /matrix/.test(d.tf) && Math.abs(parseFloat(d.tf.split(',')[2]))>0.1, d.tf);
  ok('かたむきが見本どおり（約19度）', Math.abs(Math.abs(parseFloat(d.tf.split(',')[2]))-0.344)<0.03, d.tf);
  ok('ふちは白でなく濃い緑（2px）', /47, 158, 96/.test(d.bd) && parseFloat(d.bd)>=1.5, d.bd);
  ok('影はやわらかい（ぼかしあり）・右下', /2px 3px 3px|1px 2px 2px/.test(d.sh), d.sh);
  ok('影は1枚だけ（板が二重に見えない）', d.sh.split('rgba').length-1<=1 && !/inset/.test(d.sh), d.sh);
  ok('上38%までがほぼ白・その下が平ら', /36%/.test(d.bg) && /40%/.test(d.bg), d.bg.slice(0,95));
  ok('飾りは当たり判定に入れない', d.pe==='none', d.pe);
  ok('文字を太らせている（text-stroke）', parseFloat(d.ts)>=0.3, d.ts);
  ok('角ばっている（丸みは2px以下）', parseFloat(d.br)<=2, d.br);
  ok('左にアイコン用のあきがある', parseFloat(d.pl)>=40, d.pl);
  ok('文字は太字・黒', d.fw==='900' && d.col==='rgb(0, 0, 0)', d.fw+' / '+d.col);
  ok('見出しは折り返さない', d.ws==='nowrap' && d.lines1, d.ws+' / '+d.hs.join(','));
  /* ★2026-08-24v 2026-08-12u で9つ全部に絵が入った（§81）。7つのままだったので毎回★NG。
     数を決め打ちにすると絵が増えるたびにずれるので、「全部の見出しに絵があるか」で見る。 */
  ok('見出しはすべて絵入り（'+d.pics.length+'個）', d.pics.length>=7 && d.pics.every(x=>x.ok),
     d.pics.map(x=>x.f.replace('hpic_','').replace('.png','').replace(/\?v=.*/,'')).join(','));
  ok('イラストが文字に重ならない', d.pics.every(x=>x.w<=d.padN), 'あき'+d.padN+'px');
  ok('書体はページの標準にそろえる（inherit）', d.ff===d.bodyFF, d.ff+' / body='+d.bodyFF);
  /* ★2026-08-28e 見出しの数は決め打ちにしない（パネルが増えるたびにずれる。
     §222で元請別が増えて10個になり、毎回★NGになっていた）。 */
  ok('見出しがすべてパネルの中に収まる（'+d.n+'個）', d.n>=9 && d.allIn, d.n+'個');
  ok('横にはみ出さない', d.ov<=1, String(d.ov));
  ok('「全物件」チップは丸いまま', d.chipBr==='16px', d.chipBr);
  ok('JSエラーなし', errs.length===0, errs[0]||'');

  const mo=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await mo.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const me=[]; mo.on('pageerror',e=>me.push(e.message));
  await mo.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await mo.waitForTimeout(2300);
  const md=await mo.evaluate(()=>{
    const c=getComputedStyle(document.querySelector('.httl'));
    const rs=[...document.querySelectorAll('.httl')].map(x=>{const b=x.getBoundingClientRect(),
      par=x.closest('.dpanel').getBoundingClientRect(); return b.left>=par.left-1 && b.right<=par.right+1;});
    const im=document.querySelector('.httl img.hpic');
    return {fs:c.fontSize, pl:c.paddingLeft, ok:rs.every(Boolean),
      kgh:getComputedStyle(document.querySelector('.kgh')).fontSize,
      picW:im?Math.round(im.getBoundingClientRect().width):0,
      ov:document.documentElement.scrollWidth-innerWidth};
  });
  console.log('スマホ:',JSON.stringify(md));
  ok('スマホ：文字は「見積済」の帯と同じ大きさ', md.fs===md.kgh, md.fs+' / 見積済'+md.kgh);
  ok('スマホ：あきはパソコンより詰まる', parseFloat(md.pl)<70, md.pl);
  ok('スマホ：イラストが文字に重ならない', md.picW<=parseFloat(md.pl), md.picW+'px ≦ あき'+md.pl);
  ok('スマホ：はみ出さない', md.ok && md.ov<=1, String(md.ov));
  ok('スマホ：JSエラーなし', me.length===0, me[0]||'');
  console.log(R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'★ NG あり':'すべて○');
  await b.close();
})();
