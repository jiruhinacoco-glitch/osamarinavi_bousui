/* よこ向き・たて向きで「画面ごと横にずらせてしまう」ことが無いか（全11ページ）
   ★画面の外に隠している引き出し（transform で外へ出したパネル）があると、
     隠した先もページの中身として数えられ、横スクロールが生まれる。
     作図中に指を横へ払うと画面がずれて、隠れているパネルが顔を出す（実際に起きていた）。
   使い方: node _check/noxscroll.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PAGES=['index.html','kirokucho_demo.html','zumen_sekisan.html','genba_map_v36.html','hacchu.html',
 'kokkosho.html','camera.html','library.html','shiyo_toroku.html','yougo.html','zairyo_toroku.html'];
let ng=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const f of PAGES){
  const line=[];
  for(const vp of [{w:852,h:393,n:'よこ'},{w:393,h:852,n:'たて'}]){
    const ctx=await b.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
    await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
    try{ await p.goto('http://localhost:8899/'+f,{waitUntil:'load'}); }catch(e){}
    await p.waitForTimeout(1700);
    await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});
    const r=await p.evaluate(async()=>{
      const b0=window.scrollX; window.scrollTo(9999,0);
      await new Promise(s=>setTimeout(s,250));
      const d=window.scrollX-b0; window.scrollTo(0,0);
      const de=document.documentElement;
      const ex=de.scrollWidth-de.clientWidth;   /* ★ページの幅そのものが広がっていないか
                                                   （fixed で外に隠したパネルはこちらに出る） */
      const who=[...document.querySelectorAll('body *')].filter(e=>{
        const q=e.getBoundingClientRect(); return q.right>innerWidth+2 && q.width>10 && getComputedStyle(e).position!=='fixed';
      }).slice(0,2).map(e=>(e.id?'#'+e.id:e.tagName+'.'+String(e.className).slice(0,14)));
      return {d, ex, who};
    }).catch(()=>({d:-1,ex:-1,who:['読めない']}));
    const bad=(r.d>2)||(r.ex>2);
    line.push(vp.n+' '+(bad?('★'+(r.d>2?('横に'+r.d+'px動く '):'')+(r.ex>2?('幅が'+r.ex+'px広い '):'')+r.who.join(',')):'○'));
    await ctx.close();
  }
  if(line.some(x=>x.includes('★')))ng++;
  console.log((line.some(x=>x.includes('★'))?'★NG ':'○   ')+f.padEnd(22)+line.join('   '));
}
await b.close();
console.log(ng?('\n★NG '+ng+'ページ'):'\n全部○');
process.exit(ng?1:0);
})();
