/* 実機（iPhone・ホーム画面から起動）で起きていた2つの見切れを測る（2026-09-13s）
   ------------------------------------------------------------------
   本人の実機スクリーンショット（1179×2556＝iPhone 393×852の3倍）から実測した事実：
     ① 帯の中の文字（現場マップ）が、画面上の時計（ステータスバー）と重なっていた
        → 帯の中身が y=26 から始まっていた（本当は59pxのノッチの下＝y≧59 が必要）
     ② 下部ナビの緑の帯が64pxしかなく、2段目（カメラ・ライブラリ・図面/積算・仕様・材料）が
        途中で切れていた。さらに帯の下に約57pxの何も無い帯が残っていた
   Playwright はノッチの余白を再現できないので、env(safe-area-inset-*) を
   本物の数値（上59・下34／よこは左右59・下21）に置き換えたコピーを作って測る。
   使い方: node _check/jikki.js            （全11ページ）
           node _check/jikki.js genba_map_v36
           node _check/jikki.js genba_map_v36 _old   （直す前の版と比べる）*/
const fs=require('fs');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ROOT='/home/user/osamarinavi_bousui/';
const PAGES=['index','kirokucho_demo','zumen_sekisan','genba_map_v36','hacchu','kokkosho',
             'camera','library','shiyo_toroku','yougo','zairyo_toroku'];
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '+
         '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0;
const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};

function mk(src,out,top,bot,side){
  let h=fs.readFileSync(ROOT+src,'utf8');
  const rep=(from,to)=>{ h=h.split(from).join(to); };
  rep('env(safe-area-inset-top,0px)',  top+'px');  rep('env(safe-area-inset-top)',  top+'px');
  rep('env(safe-area-inset-bottom,0px)',bot+'px'); rep('env(safe-area-inset-bottom)',bot+'px');
  rep('env(safe-area-inset-left,0px)', side+'px'); rep('env(safe-area-inset-left)', side+'px');
  rep('env(safe-area-inset-right,0px)',side+'px'); rep('env(safe-area-inset-right)',side+'px');
  fs.writeFileSync(ROOT+out,h); return out;
}

(async()=>{
  const only=process.argv[2];
  const list=only?[only]:PAGES;
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  /* たて：上59・下34／よこ：上0・下21・左右59（iPhoneの実測値） */
  for(const [muki,vp,top,bot,side] of [['たて',{width:393,height:852},59,34,0],
                                       ['よこ',{width:852,height:393}, 0,21,59]]){
    for(const pg of list){
      const f=mk(pg+'.html','_jikki.html',top,bot,side);
      const ctx=await b.newContext({viewport:vp,deviceScaleFactor:3,isMobile:true,hasTouch:true,userAgent:UA});
      /* ホーム画面から起動した状態（standalone）にする */
      await ctx.addInitScript(()=>{ try{ Object.defineProperty(navigator,'standalone',{get:()=>true}); }catch(e){} });
      const p=await ctx.newPage();
      const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,110)));
      try{
        await p.goto('http://localhost:8899/'+f,{waitUntil:'domcontentloaded'});
        await p.waitForFunction(()=>{
          const n=document.getElementById('nav')||document.querySelector('body>nav');
          return !!(n && n.querySelectorAll('.ni').length>0);},{timeout:20000});
        await p.waitForTimeout(1400);
        const m=await p.evaluate(([top,bot])=>{
          const de=document.documentElement;
          /* このページの「組み立てのpx」→「実際のpx」の倍率 */
          const k=(de.clientWidth||393)/(window.innerWidth||de.clientWidth);
          const h=document.querySelector('header');
          /* 帯の中で一番上にある「中身」（ボタン・絵・文字）の位置 */
          let hTop=null;
          if(h){ hTop=1e9;
            h.querySelectorAll('*').forEach(e=>{
              const cs=getComputedStyle(e);
              if(cs.display==='none'||cs.visibility==='hidden')return;
              const r=e.getBoundingClientRect();
              if(r.width<4||r.height<4)return;
              if(r.top<hTop) hTop=r.top;
            });
            if(hTop===1e9) hTop=null;
          }
          const n=document.getElementById('nav')||document.querySelector('body>nav');
          const nr=n.getBoundingClientRect();
          /* 選んでいるアイコンは1.25倍にふくらむ飾り（高さの12.5%が下へ出る）が付くので、
             帯の位置は飾りの無いアイコンで測る（_check/navsafe.js と同じ考え方） */
          let iTop=1e9,iBot=-1e9;
          n.querySelectorAll('.ni:not(.on)').forEach(e=>{
            const r=e.getBoundingClientRect(); if(r.height<2)return;
            if(r.top<iTop)iTop=r.top; if(r.bottom>iBot)iBot=r.bottom;});
          const vh=de.clientHeight;
          return {k:+k.toFixed(3), vh,
            hdrTopReal: hTop==null?null:+(hTop/k).toFixed(1),
            navTop:+nr.top.toFixed(1), navBot:+nr.bottom.toFixed(1),
            iconTop:+iTop.toFixed(1), iconBot:+iBot.toFixed(1),
            /* アイコンが帯からはみ出している量（下・上） */
            outBelow:+((iBot-nr.bottom)/k).toFixed(1),
            /* 画面の下端からアイコンの下端までの余り（実際のpx） */
            gapReal:+((vh-iBot)/k).toFixed(1),
            /* 帯の下に残る「何も無い帯」（実際のpx） */
            blankReal:+((vh-nr.bottom)/k).toFixed(1)};
        },[top,bot]);

        if(top>0) ok(m.hdrTopReal!=null && m.hdrTopReal>=top-1,
          muki+' '+pg.padEnd(15)+' 帯の中身が時計（ノッチ'+top+'px）の下から始まる',
          {中身の上端:m.hdrTopReal});
        ok(m.outBelow<=1,
          muki+' '+pg.padEnd(15)+' アイコンが緑の帯からはみ出していない（2段目が切れない）',
          {はみ出し:m.outBelow});
        ok(Math.abs(m.blankReal)<=1,
          muki+' '+pg.padEnd(15)+' 帯の下に何も無い帯が残っていない',
          {余り:m.blankReal});
        ok(m.gapReal>=bot-1,
          muki+' '+pg.padEnd(15)+' アイコンがホームバー'+bot+'pxの上にある',
          {余り:m.gapReal});
        ok(errs.length===0, muki+' '+pg.padEnd(15)+' JSエラーなし', errs);
      }catch(e){ ok(false, muki+' '+pg+' 読み込み '+String(e).slice(0,90)); }
      await ctx.close();
    }
  }
  try{fs.unlinkSync(ROOT+'_jikki.html');}catch(e){}
  await b.close();
  console.log(ng?('★NG 合計 '+ng):'○ 全項目OK');
  process.exit(0);
})();
