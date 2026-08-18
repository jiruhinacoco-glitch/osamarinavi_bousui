/* 新しいアイコン4枚：メニューボタン／予実／ステータス分布／月別 と、見出し「歩掛実績」 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };

async function home(b,mode){
  console.log('\n----- ホーム（'+mode+'）-----');
  const ctx = mode==='pc' ? await b.newContext({viewport:{width:1600,height:900}})
    : await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(mode!=='pc') await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('file:///home/user/osamarinavi_bousui/index.html'); await p.waitForTimeout(900);
  const r=await p.evaluate(()=>{
    const b=document.getElementById('menuBtn'); const im=b.querySelector('.mbi');
    const bb=b.getBoundingClientRect(); const ib=im?im.getBoundingClientRect():null;
    const cs=getComputedStyle(b);
    return {has:b.classList.contains('hasimg'), imgOK: im? im.naturalWidth>0 : false,
      nat: im?[im.naturalWidth,im.naturalHeight]:null,
      btn:[Math.round(bb.width),Math.round(bb.height)],
      img: ib?[Math.round(ib.width),Math.round(ib.height)]:null,
      bg:cs.backgroundImage, bd:cs.borderTopWidth,
      bars:[...b.querySelectorAll('i')].filter(e=>getComputedStyle(e).display!=='none').length,
      inside: ib? (ib.top>=bb.top-0.6&&ib.bottom<=bb.bottom+0.6&&ib.left>=bb.left-0.6&&ib.right<=bb.right+0.6):false};
  });
  ok(r.imgOK,'メニューの絵が読める', (r.nat||[]).join('x'));
  ok(r.has,'絵が読めたら hasimg が付く');
  ok(r.bg==='none','青い丸の背景が消えている', r.bg);
  ok(r.bd==='0px','白い枠が消えている', r.bd);
  ok(r.bars===0,'白い三本線が消えている', r.bars);
  ok(r.btn[0]===40&&r.btn[1]===40,'ボタンの大きさは今までどおり40x40', r.btn.join('x'));
  ok(r.inside,'絵がボタンからはみ出していない', (r.img||[]).join('x'));
  ok(errs.length===0,'JSエラーなし',errs.join(' / '));
  await ctx.close();
}

async function dash(b,mode,vp){
  console.log('\n----- 現場記録帳ダッシュボード（'+mode+'）-----');
  const ctx=await b.newContext(Object.assign({deviceScaleFactor:2,isMobile:mode!=='pc',hasTouch:mode!=='pc'},{viewport:vp}));
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(mode!=='pc') await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('file:///home/user/osamarinavi_bousui/kirokucho_demo.html'); await p.waitForTimeout(2200);
  const r=await p.evaluate(()=>{
    const Z=window.nnPZ||1;
    const out={titles:[],imgs:[],wrapped:[],missing:[]};
    document.querySelectorAll('#dashboard .dpanel h4 .httl').forEach(t=>{
      const txt=t.textContent.trim();
      out.titles.push(txt);
      const im=t.querySelector('img.hpic');
      if(im) out.imgs.push([txt, im.getAttribute('src'), im.naturalWidth>0,
        Math.round(im.getBoundingClientRect().width/Z), Math.round(im.getBoundingClientRect().height/Z)]);
      else out.missing.push(txt);
      /* 折り返しの判定：行の高さ ÷ 1行の高さ */
      const r=t.getBoundingClientRect();
      const lh=parseFloat(getComputedStyle(t).fontSize)*1.9;
      if(r.height/Z > lh*1.45) out.wrapped.push([txt, Math.round(r.height/Z), Math.round(lh)]);
    });
    const dh=document.documentElement;
    out.overflow = Math.round(dh.scrollWidth - dh.clientWidth);
    return out;
  });
  ok(r.titles.some(t=>t.includes('歩掛実績')),'見出しが「歩掛実績」になった', r.titles.find(t=>t.includes('歩掛'))||'—');
  ok(!r.titles.some(t=>t.includes('自社の実績歩掛')),'古い「自社の実績歩掛」は残っていない');
  const need=['完成工事高の予実','ステータス分布','月別 受注金額の推移'];
  for(const n of need){
    const e=r.imgs.find(x=>x[0].includes(n));
    ok(!!e, n+'：絵が入っている');
    if(e){ ok(e[2], n+'：絵が読める', e[1]);
      ok(e[3]<=70 && e[4]<=70, n+'：絵が大きすぎない', e[3]+'x'+e[4]); }
  }
  const y=r.imgs.find(x=>x[0].includes('予実')), st=r.imgs.find(x=>x[0].includes('ステータス'));
  ok(y&&/\?v=/.test(y[1]),'予実：版名つきURL（古い絵が残らない）', y&&y[1]);
  ok(st&&/\?v=/.test(st[1]),'ステータス分布：版名つきURL', st&&st[1]);
  ok(r.wrapped.length===0,'見出しが折り返していない', JSON.stringify(r.wrapped));
  ok(r.overflow<=0,'横にはみ出していない', r.overflow+'px');
  console.log('   絵の無い見出し:', r.missing.join(' / ')||'なし');
  ok(errs.length===0,'JSエラーなし',errs.join(' / '));
  await p.screenshot({path:'ic4_'+mode+'.png', fullPage:false});
  await ctx.close();
}

(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  await home(b,'pc'); await home(b,'phone');
  await dash(b,'pc',{width:1600,height:900});
  await dash(b,'phone',{width:393,height:852});
  await dash(b,'land',{width:852,height:393});
  await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');
})();
