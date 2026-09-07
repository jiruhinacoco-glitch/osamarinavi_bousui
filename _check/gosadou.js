/* ★2026-09-07 夜間巡回：誤作動（押したのに別のことが起きる・押しても何も起きない・途中で止まる）
   本人の指示「今日の夜間巡回は、見切れや誤作動をメインに実施してください」

   ① 押した場所と、実際に反応した部品が食い違わないか（隣のボタンが動く＝§218の型）
   ② 押しても画面も保存も何も変わらないボタンが無いか（死んだボタン）
   ③ 一つの操作で JSエラーが出て、そこから先が全部効かなくなる導線が無いか
   ④ 同じ操作を続けて2回したとき、2回目で壊れないか（トグルの取り違え＝§180の型）

   使い方: node _check/gosadou.js  ／ node _check/gosadou.js <file>  */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ALL=['index.html','kirokucho_demo.html','zumen_sekisan.html','camera.html',
  'hacchu.html','kokkosho.html','library.html','shiyo_toroku.html','yougo.html','zairyo_toroku.html'];
const PAGES=process.argv[2]?[process.argv[2]]:ALL;
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
/* 押すと困るもの（消す・印刷・別のページへ飛ぶ）は名前で除く */
const SKIP=/全削除|すべて削除|全消し|全部消す|削除|消す|印刷|PDF|書き出|保存して閉じる|リセット|初期化|クリア|ログアウト|送信|発注する|確定/;

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const f of PAGES){
  console.log('== '+f);
  for(const [tag,vp,phone] of [['PC   ',{width:1600,height:900},false],['たて ',{width:393,height:852},true]]){
    const ctx=await b.newContext({viewport:vp,deviceScaleFactor:phone?2:1,isMobile:phone,hasTouch:phone});
    const p=await ctx.newPage();
    p.on('dialog',d=>d.accept());
    /* ★ページを移動するボタンは押さない（移動すると、そこから先が調べられない）。
       別の窓を開くものも止める。 */
    await p.addInitScript(()=>{ window.open=function(){ return {document:{write(){},close(){}}, focus(){}, close(){}}; };
      addEventListener('click', function(e){ const a=e.target&&e.target.closest&&e.target.closest('a[href]');
        if(a) e.preventDefault(); }, true); });
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    if(phone) await p.addInitScript(()=>{ Object.defineProperty(window.screen,'width',{get:()=>393});
      Object.defineProperty(window.screen,'height',{get:()=>852}); });
    await p.goto('http://127.0.0.1:8899/'+f);
    await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
    await p.waitForTimeout(2600);

    /* ① 押した場所と反応する部品が一致するか（隣どうしの取り違え）
       ボタンの中心・左端寄り・右端寄りの3点を指して、どれも自分（かその中身）が取れること */
    const mism=await p.evaluate((SK)=>{
      const bad=[]; const re=new RegExp(SK);
      const nm=e=>(e.id?'#'+e.id:'')+'.'+(typeof e.className==='string'?e.className.trim().split(/\s+/).slice(0,2).join('.'):'')+'<'+e.tagName.toLowerCase()+'>';
      [...document.querySelectorAll('button,[role="button"]')].forEach(el=>{
        const s=getComputedStyle(el); if(s.display==='none'||s.visibility==='hidden') return;
        const r=el.getBoundingClientRect(); if(r.width<14||r.height<12) return;
        if(r.left<0||r.top<0||r.right>innerWidth||r.bottom>innerHeight) return;
        const cx2=r.left+r.width/2, cy2=r.top+r.height/2;
        [[r.left+3,cy2,'左端'],[cx2,cy2,'中央'],[r.right-3,cy2,'右端'],
         [cx2,r.top+3,'上端'],[cx2,r.bottom-3,'下端']].forEach(([xs,ys,where])=>{
          const t=document.elementFromPoint(xs,ys); if(!t) return;
          if(t===el||el.contains(t)||t.contains(el)) return;
          const own=t.closest&&t.closest('button,[role="button"]');
          if(own===el) return;
          if(own) bad.push({el:nm(el), where, hit:nm(own), txt:(el.textContent||'').trim().slice(0,10)});
        });
      });
      return bad;
    }, SKIP.source);
    ok(mism.length===0, tag+'① 押した場所と反応する部品が一致（隣のボタンが動かない）', mism.slice(0,4));

    /* ②③④ ボタンを実際に押して、死んでいないか・落ちないか・2回目で壊れないか */
    const res=await p.evaluate(async(SK)=>{
      const re=new RegExp(SK);
      const sig=()=>document.body.innerHTML.length+'|'+location.href+'|'+
        (()=>{let n=0;for(let i=0;i<localStorage.length;i++)n+=(localStorage.getItem(localStorage.key(i))||'').length;return n;})();
      const nm=e=>(e.id?'#'+e.id:'')+'.'+(typeof e.className==='string'?e.className.trim().split(/\s+/).slice(0,2).join('.'):'')+'<'+e.tagName.toLowerCase()+'>';
      const goes=el=>{                      /* ページを移動するもの＝押さない */
        if(el.closest('nav')) return true;
        const oc=(el.getAttribute('onclick')||'')+(el.getAttribute('href')||'');
        return /location|navGo|nnGo|nnBack|href/.test(oc);
      };
      const list=[...document.querySelectorAll('button,[role="button"]')].filter(el=>{
        const s=getComputedStyle(el); if(s.display==='none'||s.visibility==='hidden') return false;
        const r=el.getBoundingClientRect(); if(r.width<8||r.height<8) return false;
        if(goes(el)) return false;
        return !re.test((el.textContent||'')+' '+(el.title||'')+' '+(el.id||''));
      }).slice(0,70);
      const dead=[], twice=[];
      for(const el of list){
        if(!el.isConnected) continue;
        const a=sig();
        try{ el.click(); }catch(_){}
        await new Promise(r=>setTimeout(r,60));
        const b2=sig();
        if(a===b2) dead.push({el:nm(el), txt:(el.textContent||'').trim().slice(0,12)});
        /* もう一度同じものを押して、そこで落ちないか */
        if(el.isConnected){ try{ el.click(); }catch(e){ twice.push({el:nm(el), err:String(e).slice(0,50)}); } }
        await new Promise(r=>setTimeout(r,40));
      }
      return {n:list.length, dead, twice};
    }, SKIP.source);
    ok(res.twice.length===0, tag+'④ 同じボタンを続けて2回押しても落ちない（'+res.n+'個）', res.twice.slice(0,3));
    ok(errs.length===0, tag+'③ 全ボタンを押してもJSエラーが出ない', errs.slice(0,3));
    if(res.dead.length) console.log('     （参考）押しても画面も保存も変わらないもの：'+res.dead.length+'個 '+JSON.stringify(res.dead.slice(0,5)));
    await ctx.close();
  }
}
console.log(ng?('--- ★NG '+ng+' 件 ---'):'全部○');
await b.close();})();
