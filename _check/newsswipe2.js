/* ★2026-10-28g ホームのお知らせ：めくったあと、ページの途中で止まらないか（本人のスクショ「お知らせがおかしい」）
   iPhone では、めくっている最中に枠の高さを変えると「ページの位置に止まる」動きが切れ、2ページ目がずれた所で止まっていた。
   ①ページの途中（230px）で止まっても、少し待つと近いページ（1ページ目＝363px）へぴったり送られる
   ②送られたあと、そのページの左端が枠の左端にそろう・点が合う
   ③めくっている最中（止まる前）には枠の高さを変えない
   ※ 手元のブラウザは自分でページに止まるので、①は scroll-snap を一時的に外して「iPhoneで途中で止まった」状態を作る
   使い方: node _check/newsswipe2.js [index.html の代わり]（http://localhost:8899 で配信しておくこと） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'index.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,220):'')); if(!c)NG++;};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const er=[]; p.on('pageerror',e=>er.push(e.message));
 await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(1800);
 const h3=await p.evaluate(()=>new Promise(res=>{ const sw=document.getElementById('nnNewsSw'); sw.style.scrollSnapType='none'; const hs=[];
   const mo=new MutationObserver(()=>hs.push(sw.style.height)); mo.observe(sw,{attributes:true,attributeFilter:['style']});
   let x=0; const step=()=>{ x+=23; sw.scrollLeft=x; if(x<230) requestAnimationFrame(step); else setTimeout(()=>{ mo.disconnect(); res(hs.length); },60); }; requestAnimationFrame(step); }));
 ok('③めくっている最中（止まる前）には枠の高さを変えない', h3===0, {高さを変えた回数:h3});
 await p.waitForTimeout(900);
 const r=await p.evaluate(()=>{ const sw=document.getElementById('nnNewsSw'), w=sw.clientWidth, box=sw.getBoundingClientRect(), pg=[...sw.querySelectorAll('.npg')];
   return {w, sl:Math.round(sw.scrollLeft), left2:Math.round(pg[1].getBoundingClientRect().left-box.left), on:[...document.querySelectorAll('#dots .dot')].findIndex(d=>d.classList.contains('on'))}; });
 ok('①ページの途中（230px）で止まっても、近いページへぴったり送られる', Math.abs(r.sl-r.w)<=2, r);
 ok('②2ページ目の左端が枠の左端にそろう・点が2つ目', Math.abs(r.left2)<=2&&r.on===1, r);
 ok('JSエラーなし', er.length===0, er.slice(0,2));
 console.log(NG?('★NG '+NG+'件'):'全部○'); await b.close();
})();
