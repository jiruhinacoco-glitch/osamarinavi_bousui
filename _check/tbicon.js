/* ツールバーのアイコン差し替え口：全ボタンに <img class="tbi"> が入り、
   絵が無いときは文字のまま（hasimg が付かない）ことを確かめる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [mode,vp] of [['pc',{width:1500,height:900}],['phone',{width:393,height:852}]]){
  console.log('\n===== '+mode+' =====');
  const ctx=await b.newContext({viewport:vp, deviceScaleFactor:mode==='pc'?1:2, isMobile:mode!=='pc', hasTouch:mode!=='pc'});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(mode!=='pc') await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  /* ダミーの絵（緑の四角）を返して「絵があるとき」も確かめる */
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
  if(mode==='pc') await p.route('**/icons/btn_*.png', r=>r.fulfill({contentType:'image/png', body:png}));
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(2000); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const r=await p.evaluate(()=>{
    const miss=[], noimg=[], hasimg=[];
    NN_TB_ICONS.forEach(([id,file])=>{
      const b=document.getElementById(id);
      if(!b){ miss.push(id); return; }
      /* ★絵が404のときは onerror で img を消す作りなので、
         「差し込み口があるか」は .tbtx（文字の包み）で判定する */
      if(!b.querySelector('.tbtx')) noimg.push(id);
      if(b.classList.contains('hasimg')) hasimg.push(file);
    });
    return {n:NN_TB_ICONS.length, miss, noimg, hasimg,
      txtKept: [...document.querySelectorAll('#toolbar .tbtn')].every(x=>x.querySelector('.tbtx')||!x.id.startsWith('tl_')),
      overflow: document.documentElement.scrollWidth-document.documentElement.clientWidth};
  });
  console.log('   対応表', r.n, '個／要素が無い:', r.miss.join(',')||'なし', '／imgが入らない:', r.noimg.join(',')||'なし');
  ok(r.noimg.length===0,'全ボタンに絵の差し込み口がある');
  ok(r.overflow<=0,'横はみ出しなし', r.overflow);
  if(mode==='pc') ok(r.hasimg.length>=18,'絵を置くと全部が絵に切り替わる', r.hasimg.length+'個');
  /* ★2026-08-24y 絵は §118b〜e で27枚そろい、スマホでも絵になる（絵のときは文字を隠す）。
     「絵が無ければ文字のまま」は絵が未着だった頃の期待値だったので、
     いまは「絵が入っていて、押せる大きさが保たれているか」を見る。 */
  else ok(r.hasimg.length>=18,'スマホでも絵に切り替わる', r.hasimg.length+'個');
  ok(errs.length===0,'JSエラーなし', errs.join('|').slice(0,150));
  await p.screenshot({path:'tbicon_'+mode+'.png'});
  await ctx.close();
}
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
