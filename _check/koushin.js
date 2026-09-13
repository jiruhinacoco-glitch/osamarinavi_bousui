/* 新しい版が端末に届くか（2026-09-13s）
   ------------------------------------------------------------------
   ホーム画面から起動したiPhoneは sessionStorage が何日も残るため、
   読み直しに2回失敗すると「その版はもう取りに行かない」状態で固まっていた。
   ・上限に達したときは「今すぐ更新」のボタンが出ること
   ・そのボタンでサービスワーカーを外して読み直すこと
   ・ふつうの状態（版が同じ）ではボタンを出さないこと
   使い方: node _check/koushin.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'index.html';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '+
         '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});

  /* ① ふつうの状態：ボタンは出ない */
  {
    const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,userAgent:UA});
    const p=await ctx.newPage();
    await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(2500);
    const r=await p.evaluate(()=>({btn:!!document.getElementById('nnUpdBtn'),
      now:window.nnVerNow, neu:window.nnVerNew}));
    ok(r.now===r.neu, '① 版名が ver.txt とそろっている', r);
    ok(!r.btn, '① そろっているときは更新ボタンを出さない');
    await ctx.close();
  }

  /* ② 「もう取りに行かない」状態を作る：ver.txt を新しく見せかけ、失敗回数を上限にしておく */
  {
    const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,userAgent:UA});
    await ctx.route('**/ver.txt*', route=>route.fulfill({status:200,contentType:'text/plain',body:'9999-12-31z'}));
    await ctx.addInitScript(()=>{ try{ sessionStorage.setItem('nnUpdN_9999-12-31z','9'); }catch(e){} });
    const p=await ctx.newPage();
    await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>!!document.getElementById('nnUpdBtn'),{timeout:15000}).catch(()=>{});
    const r=await p.evaluate(()=>{const e=document.getElementById('nnUpdBtn');
      if(!e) return {btn:false};
      const q=e.getBoundingClientRect(); const cs=getComputedStyle(e);
      return {btn:true, txt:(e.textContent||'').slice(0,30), w:Math.round(q.width), h:Math.round(q.height),
        top:Math.round(q.top), z:cs.zIndex, inScreen:q.top>=0&&q.bottom<=innerHeight&&q.left>=0&&q.right<=innerWidth};});
    ok(r.btn, '② あきらめた状態では「今すぐ更新」のボタンが出る', r);
    ok(r.btn&&r.inScreen&&r.h>28, '② ボタンが画面の中にあり、指で押せる大きさ', r);
    ok(r.btn&&/9999-12-31z/.test(r.txt), '② 新しい版の名前がボタンに出る', r.txt);
    ok(await p.evaluate(()=>typeof window.nnForceUpdate==='function'), '② 手動更新の処理がある');
    /* 押すと：保存分を消し、サービスワーカーを外し、?nn=… を付けて読み直す */
    await p.evaluate(()=>{ if(window.caches){ const _d=caches.delete.bind(caches);
      caches.delete=async k=>{ try{sessionStorage.setItem('__delc','1');}catch(e){} return _d(k); }; } });
    await Promise.all([
      p.waitForNavigation({timeout:15000}).catch(()=>null),
      p.evaluate(()=>window.nnForceUpdate())
    ]);
    await p.waitForTimeout(600);
    const url=p.url();
    ok(/\?nn=\d+/.test(url), '② 押すと ?nn=… を付けて読み直す（保存分を素通りする）', url.slice(-40));
    const still=await p.evaluate(()=>!!document.getElementById('nnUpdBtn'));
    ok(typeof still==='boolean', '② 読み直したあともページが開く', {ボタン:still});
    await ctx.close();
  }
  await b.close();
  console.log(ng?('★NG 合計 '+ng):'○ 全項目OK');
  process.exit(0);
})();
