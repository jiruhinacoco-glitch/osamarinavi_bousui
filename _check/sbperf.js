/* 現場記録帳：起動時に自前スクロールバーの位置合わせを何度も走らせていないか（2026-09-13n）
   ------------------------------------------------------------------
   syncListSb は scrollHeight と getBoundingClientRect を読むので、
   呼ぶたびに100枚のカードの配置計算が強制的に走る。
   ダッシュボードは1コマに1枚ずつ足していく作りなので、途中で測っても意味がない。
   ★「安い端末」に近づけるため CPU を4倍遅くして測る。
   使い方: node _check/sbperf.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '+
         '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,userAgent:UA});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,110)));
  const cdp=await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  /* 位置合わせの呼ばれた回数と、そこで使った時間を自分で数える（product の計測は使わない） */
  await p.addInitScript(()=>{
    window.__sb={n:0,ms:0};
    let v;
    Object.defineProperty(window,'syncListSb',{configurable:true,
      get(){return v;},
      set(f){ if(typeof f==='function'){ const o=f;
        v=function(){ window.__sb.n++; const t=performance.now();
          try{ return o.apply(this,arguments); } finally{ window.__sb.ms+=performance.now()-t; } };
      } else v=f; }});
  });
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
  await p.waitForTimeout(2500);
  const r=await p.evaluate(()=>({n:window.__sb.n, ms:Math.round(window.__sb.ms),
    cards:document.querySelectorAll('#dashboard .kpc, #dashboard .pcard, #dashboard .alert-row').length}));
  ok(r.ms<=150, '起動時の位置合わせに使う時間が150ms以下', r);
  ok(r.n<=10, '起動時の位置合わせの回数が10回以下', r.n);

  /* 位置合わせそのものは、ちゃんと最後に効いているか（遅らせただけで動かなくなっていないか） */
  const sb=await p.evaluate(()=>{
    const e=document.getElementById('listsb');
    return {on:!!(e&&e.classList.contains('on')), thumbH:e?(e.querySelector('i')||{}).style?.height:null};
  });
  ok(sb.on, 'スクロールバーは最後にちゃんと出ている', sb);

  /* 画面を切り替えたあとも追従するか */
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);
  const sb2=await p.evaluate(()=>{const e=document.getElementById('listsb');
    return {on:!!(e&&e.classList.contains('on')), top:e?e.style.top:null};});
  ok(sb2.on, '現場一覧に切り替えても出ている', sb2);
  ok(errs.length===0, 'JSエラーなし', errs);
  await b.close();
  console.log(ng?('★NG 合計 '+ng):'○ 全項目OK');
  process.exit(0);
})();
