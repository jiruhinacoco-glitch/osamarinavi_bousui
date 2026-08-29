/* 全11ページ×たて/よこ/PC で「読めなくなっている文字」が無いか
   ★枠に入りきらない文字は、「…」で切るか、マウスを乗せると全文が出る（title）ようにしてある。
     どちらも無いまま切れていると、利用者はその文字を読む手立てがない（§190で実際に起きた）。
   使い方: node _check/cliptext.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const P=['index','kirokucho_demo','genba_map_v36','hacchu','kokkosho','camera','library','zumen_sekisan','shiyo_toroku','zairyo_toroku','yougo'];
let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const vp of [{w:393,h:852,n:'たて'},{w:852,h:393,n:'よこ'},{w:1600,h:1000,n:'PC'}]){
 console.log('=== '+vp.n);
 for(const f of P){
  const p=await b.newPage({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:2,isMobile:vp.n!=='PC',hasTouch:vp.n!=='PC'});
  if(vp.n!=='PC') await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  p.on('dialog',d=>d.accept());
  try{
   await p.goto('http://localhost:8899/'+f+'.html',{waitUntil:'load'});
   await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});
   await p.waitForTimeout(1500);
   const r=await p.evaluate(()=>{
     const out=[];
     document.querySelectorAll('body *').forEach(el=>{
       if(el.children.length) return;                 /* 文字だけの要素にしぼる */
       const t=(el.textContent||'').trim(); if(!t) return;
       const c=getComputedStyle(el);
       if(c.display==='none'||c.visibility==='hidden') return;
       const clipX=/hidden|clip/.test(c.overflowX);
       const ell=c.textOverflow==='ellipsis';
       if(!clipX && !ell) return;
       const cut=el.scrollWidth-el.clientWidth;
       if(cut<=3) return;
       /* 「…」も出ず、マウスを乗せても全文が見えない＝本当に読めない文字だけを挙げる */
       let hasTitle=false, e2=el;
       while(e2 && e2!==document.body){ if(e2.getAttribute&&e2.getAttribute('title')){hasTitle=true;break;} e2=e2.parentElement; }
       if(ell || hasTitle) return;
       out.push({t:t.slice(0,18), cut, tag:el.tagName+'.'+String(el.className).slice(0,18)});
     });
     return out.slice(0,8);
   });
   if(r.length)NG++;
   console.log((r.length?'★NG ':'○   ')+(f+'              ').slice(0,16)+(r.length?JSON.stringify(r):'切れている文字なし'));
  }catch(e){ console.log('  '+f+' ERR '+e.message.slice(0,50)); }
  await p.close();
 }
}
await b.close();
console.log(NG?('\n★NG '+NG+'件'):'\n全部○');
process.exit(NG?1:0);})();
