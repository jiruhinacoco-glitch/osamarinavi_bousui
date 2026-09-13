/* 下部ナビ（緑の帯）が、iPhoneのホームバーに隠れていないか（2026-09-13m）
   ------------------------------------------------------------------
   実機のホームバーは画面下 34px（たて）／21px（よこ）を占める。
   Playwright はこの余白を再現できないので、env(safe-area-inset-bottom) を
   その数値に置き換えたコピーを作って測る。
   ★測るのは「アイコン・文字の下端」が、ホームバーの上端より上にあるか。
   使い方: node _check/navsafe.js                （全11ページ）
           node _check/navsafe.js genba_map_v36   （1ページだけ） */
const fs=require('fs');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const ROOT='/home/user/osamarinavi_bousui/';
const PAGES=['index','kirokucho_demo','zumen_sekisan','genba_map_v36','hacchu','kokkosho',
             'camera','library','shiyo_toroku','yougo','zairyo_toroku'];
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '+
         '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0;
const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m); if(!c)ng++;};

function mksab(src,out,bot,side){
  let h=fs.readFileSync(ROOT+src,'utf8');
  h=h.split('env(safe-area-inset-bottom,0px)').join(bot+'px')
     .split('env(safe-area-inset-bottom)').join(bot+'px')
     .split('env(safe-area-inset-top,0px)').join('47px')
     .split('env(safe-area-inset-top)').join('47px')
     .split('env(safe-area-inset-left,0px)').join(side+'px')
     .split('env(safe-area-inset-right,0px)').join(side+'px')
     .split('env(safe-area-inset-left)').join(side+'px')
     .split('env(safe-area-inset-right)').join(side+'px');
  fs.writeFileSync(ROOT+out,h); return out;
}

(async()=>{
  const list=process.argv[2]?[process.argv[2]]:PAGES;
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  /* たて＝ホームバー34px／よこ＝21px（左右のノッチ59px） */
  for(const [muki,vp,bar,side] of [['たて',{width:393,height:852},34,0],
                                   ['よこ',{width:852,height:393},21,59]]){
    for(const pg of list){
      const f=mksab(pg+'.html','_sab.html',bar,side);
      const ctx=await b.newContext({viewport:vp,isMobile:true,hasTouch:true,userAgent:UA});
      const p=await ctx.newPage();
      const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,100)));
      try{
        await p.goto('http://localhost:8899/'+f,{waitUntil:'domcontentloaded'});
        await p.waitForFunction(()=>{const n=document.querySelector('nav#nav')||document.querySelector('nav');
          return n && n.querySelectorAll('.ni').length>0;},{timeout:15000});
        await p.waitForTimeout(900);
        const m=await p.evaluate((bar)=>{
          const n=document.querySelector('nav#nav')||document.querySelector('nav');
          const de=document.documentElement;
          /* このページの「組み立てのpx」→「実際のpx」の倍率 */
          const k=(de.clientWidth||980)/(window.innerWidth||de.clientWidth);
          const vh=de.clientHeight;
          let deep=-1e9, who='';
          n.querySelectorAll('.ni').forEach(c=>{
            /* アイコン画像と文字、どちらも見る */
            [c].concat([...c.querySelectorAll('img,span')]).forEach(e=>{
              const r=e.getBoundingClientRect(); if(r.width<2||r.height<2)return;
              if(r.bottom>deep){deep=r.bottom; who=(c.textContent||'').trim().slice(0,8);}
            });
          });
          const navR=n.getBoundingClientRect();
          /* 画面下端からの余り（組み立てpx）→ 実際のpxへ */
          const gapPage=vh-deep;
          return {gapReal:+(gapPage/k).toFixed(1), k:+k.toFixed(3), who,
                  navTop:+navR.top.toFixed(1), navBot:+navR.bottom.toFixed(1), vh,
                  navBotGapReal:+((vh-navR.bottom)/k).toFixed(1), bar};
        },bar);
        ok(m.gapReal>=bar-1,
          muki+' '+pg.padEnd(15)+' ナビの一番下（'+m.who+'）がホームバー'+bar+'pxの上にある（実際の余り '+m.gapReal+'px）');
        ok(Math.abs(m.navBotGapReal)<=1,
          muki+' '+pg.padEnd(15)+' 緑の帯は画面の下端まで届いている（余り '+m.navBotGapReal+'px）');
        ok(errs.length===0, muki+' '+pg.padEnd(15)+' JSエラーなし（'+errs.join(' / ')+'）');
      }catch(e){ ok(false, muki+' '+pg+' 読み込み '+String(e).slice(0,90)); }
      await ctx.close();
    }
  }
  try{fs.unlinkSync(ROOT+'_sab.html');}catch(e){}
  await b.close();
  console.log(ng?('★NG 合計 '+ng):'○ 全項目OK');
  process.exit(0);
})();
