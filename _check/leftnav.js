/* PCで左たてナビ／スマホは今までどおり下の帯 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGES=['index.html','kirokucho_demo.html','genba_map_v36.html','zumen_sekisan.html','hacchu.html',
  'kokkosho.html','camera.html','library.html','shiyo_toroku.html','zairyo_toroku.html','yougo.html'];
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));

(async()=>{
  const b=await chromium.launch({executablePath:EXE});

  /* ---------- パソコン（1600×900） ---------- */
  for(const f of PAGES){
    const p=await b.newPage({viewport:{width:1600,height:900}});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8899/'+f,{waitUntil:'load'});
    await p.waitForTimeout(1500);
    const d=await p.evaluate(()=>{
      const nav=document.getElementById('nav')||document.querySelector('nav');
      if(!nav) return {なし:true};
      const cs=getComputedStyle(nav), r=nav.getBoundingClientRect();
      const items=[...nav.querySelectorAll('.ni')].map(x=>{
        const rr=x.getBoundingClientRect();
        const img=x.querySelector('img');
        return {t:Math.round(rr.top), l:Math.round(rr.left), w:Math.round(rr.width),
                k:x.getAttribute('data-k')||x.dataset.k||'',
                txt:(x.textContent||'').trim().slice(0,8),
                img:img?(img.getAttribute('src')||'').split('/').pop():''};
      });
      /* 本文がナビの下に潜っていないか（ヘッダーの左端） */
      const hdr=document.querySelector('header')||document.querySelector('main')||document.body.firstElementChild;
      const hl=hdr?Math.round(hdr.getBoundingClientRect().left):null;
      return {pos:cs.position, left:Math.round(r.left), top:Math.round(r.top),
              w:Math.round(r.width), h:Math.round(r.height),
              dir:cs.flexDirection, items,
              bodyPL:getComputedStyle(document.body).paddingLeft,
              tab:(()=>{const t=document.getElementById('navShowTab'); return t?getComputedStyle(t).display:'（無し）';})(),
              hdrLeft:hl, docW:document.documentElement.scrollWidth, winW:innerWidth};
    });
    const nm=f.replace('.html','');
    if(d.なし){ ok(nm+'：ナビが無い', false); await p.close(); continue; }
    const order=d.items.map(x=>x.img||x.txt);
    const sortedTop=d.items.every((x,i,a)=>i===0||a[i-1].t<=x.t);
    ok(nm+'：ナビが左に縦並び', d.pos==='fixed'&&d.left===0&&d.top===0&&d.dir==='column',
       `pos=${d.pos} left=${d.left} top=${d.top} dir=${d.dir} w=${d.w}`);
    ok(nm+'：上から順に並ぶ（先頭ホーム→末尾 仕様・材料）',
       sortedTop && /home/.test(order[0]||'') && /shiyou/.test(order[order.length-1]||''),
       order.join(' / '));
    ok(nm+'：本文がナビの下に潜らない', d.hdrLeft!==null && d.hdrLeft>=d.w-1, `本文の左端 ${d.hdrLeft} ／ ナビ幅 ${d.w}`);
    ok(nm+'：横にはみ出さない', d.docW<=d.winW+1, `${d.docW} / ${d.winW}`);
    ok(nm+'：▲は出さない', d.tab==='none'||d.tab==='（無し）', d.tab);
    ok(nm+'：JSエラーなし', errs.length===0, errs[0]||'');
    await p.close();
  }

  /* ---------- スマホ（393×852）は今までどおり下の帯 ---------- */
  for(const f of ['index.html','kirokucho_demo.html','zumen_sekisan.html']){
    const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    await p.goto('http://localhost:8899/'+f,{waitUntil:'load'});
    await p.waitForTimeout(1400);
    const d=await p.evaluate(()=>{
      const nav=document.getElementById('nav')||document.querySelector('nav');
      const cs=getComputedStyle(nav), r=nav.getBoundingClientRect();
      return {dir:cs.flexDirection, w:Math.round(r.width), pl:getComputedStyle(document.body).paddingLeft,
              phone:document.documentElement.getAttribute('data-nnphone')};
    });
    ok('スマホ '+f.replace('.html','')+'：今までどおり下の帯',
       d.dir==='row' && d.w>300 && (d.pl==='0px'||d.pl===''), JSON.stringify(d));
    await p.close();
  }

  console.log(R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'★ NG あり':'すべて○');
  await b.close();
})();
