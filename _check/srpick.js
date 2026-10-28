/* ★2026-10-28f 「前の現場から作る」（#nnSrPick）の一覧の行が重ならないか（本人のスクショ「これはひどい」）
   compact_buttons.js が文字ボタンに min-height:0 を書き込み、縦に並べてスクロールする箱の中で行が縮められていた（中身36px → 行14px）。
   ①全部の行で「行の高さ ≥ 中身の高さ」 ②行どうしが重ならない ③最後の行まで見られる（収まっている／あふれた分はスクロール）
   スマホ表示・一覧表示の両方で見る。使い方: node _check/srpick.js [kirokucho_demo.html の代わり]（http://localhost:8899 で配信しておくこと） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,220):'')); if(!c)NG++;};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 for(const mode of ['mobile','ichiran']){
   const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const er=[]; p.on('pageerror',e=>er.push(e.message));
   await p.addInitScript(m=>{ try{ localStorage.setItem('nn_view_mode',m); }catch(_){} }, mode);
   await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(2500);
   await p.evaluate(()=>openModal()); await p.waitForTimeout(800);
   await p.evaluate(()=>document.querySelector('#nnSrBand [data-copy]').click()); await p.waitForTimeout(800);
   const r=await p.evaluate(()=>{ const bs=[...document.querySelectorAll('#nnSrPick .ls button')], ls=document.querySelector('#nnSrPick .ls');
     let squash=0, over=0, prev=null; bs.forEach(x=>{ const rc=x.getBoundingClientRect(); if(rc.height+1<x.scrollHeight) squash++; if(prev&&rc.top<prev.bottom-1) over++; prev=rc; });
     const lr=bs[bs.length-1].getBoundingClientRect(), vh=document.documentElement.clientHeight;
     return {n:bs.length, squash, over, h0:bs[0]?Math.round(bs[0].getBoundingClientRect().height):0, scroll:ls.scrollHeight>ls.clientHeight+10, allIn:lr.bottom<=vh&&lr.bottom<=ls.getBoundingClientRect().bottom+1}; });
   ok(mode+' ①行が縮められていない（行の高さ ≥ 中身）', r.n>5&&r.squash===0, r);
   ok(mode+' ②行どうしが重ならない', r.over===0, r);
   ok(mode+' ③最後の行まで見られる（画面に収まっている／あふれた分はスクロール）', r.allIn||r.scroll, r);
   ok(mode+' JSエラーなし', er.length===0, er.slice(0,2));
   await p.close();
 }
 console.log(NG?('★NG '+NG+'件'):'全部○'); await b.close();
})();
