/* ★2026-09-07e スマホで指で拡大しても画面が崩れないか（§319）
   本人の指摘「スマホ縦画面でズームしたりすると見切れる」（実機スクショ：下に大きな空白）

   ★iPhoneの再現のしかた（ここが肝）
     iPhoneは指で拡大すると window.innerWidth / innerHeight まで
     「いま見えている範囲」の大きさに変わる（パソコンのブラウザは変わらない）。
     Chromium はそうならないので、addInitScript で **innerWidth/innerHeight を
     visualViewport の大きさに合わせて縮む** ようにして、実機と同じ状況を作る。

   使い方: node _check/zoomfit.js          （全11ページ・たて）
           node _check/zoomfit.js <file>   （1ページだけ） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PAGES=process.argv[2]?[process.argv[2]]:
 ['index.html','kirokucho_demo.html','zumen_sekisan.html','camera.html','genba_map_v36.html',
  'hacchu.html','kokkosho.html','library.html','shiyo_toroku.html','yougo.html','zairyo_toroku.html'];
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const f of PAGES){
  console.log('== '+f);
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{
    Object.defineProperty(window.screen,'width',{get:()=>393});
    Object.defineProperty(window.screen,'height',{get:()=>852});
    Object.defineProperty(navigator,'standalone',{get:()=>true});
    /* ★iPhoneのふるまい：拡大すると innerWidth/innerHeight も見えている範囲の大きさになる */
    const vv=window.visualViewport;
    Object.defineProperty(window,'innerWidth',{get:()=>vv?Math.round(vv.width):980});
    Object.defineProperty(window,'innerHeight',{get:()=>vv?Math.round(vv.height):2125});
  });
  await p.goto('http://127.0.0.1:8899/'+f);
  await p.waitForTimeout(2600);
  const read=()=>p.evaluate(()=>{
    const de=document.documentElement, cs=getComputedStyle(de);
    return {nnvh:parseFloat(cs.getPropertyValue('--nnvh'))||0,
            nnhm:parseFloat(cs.getPropertyValue('--nnhm'))||1,
            bodyH:Math.round(document.body.getBoundingClientRect().height),
            layH:de.clientHeight, layW:de.clientWidth,
            inner:[window.innerWidth,window.innerHeight]};
  });
  const a=await read();
  ok(a.nnvh>0 && Math.abs(a.nnvh-a.layH)<40, '拡大前：画面の高さ（--nnvh）が組み立ての高さと合う', a);
  const cdp=await ctx.newCDPSession(p);
  await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2.4});
  await p.waitForTimeout(1800);
  const z=await read();
  /* ★ここが本題：拡大しても --nnvh・body の高さ・縮小率が変わらないこと */
  ok(Math.abs(z.nnvh-a.nnvh)<8, '拡大しても画面の高さ（--nnvh）が変わらない', {before:a.nnvh, zoom:z.nnvh, inner:z.inner});
  ok(Math.abs(z.bodyH-a.bodyH)<8, '拡大しても body の高さが変わらない（下に空白が出ない）', {before:a.bodyH, zoom:z.bodyH});
  ok(Math.abs(z.nnhm-a.nnhm)<0.02, '拡大しても部品の大きさ（--nnhm）が変わらない', {before:a.nnhm, zoom:z.nnhm});
  await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
  await p.waitForTimeout(1800);
  const u=await read();
  ok(Math.abs(u.nnvh-a.nnvh)<8 && Math.abs(u.nnhm-a.nnhm)<0.02, '拡大をやめると元どおり', {nnvh:u.nnvh, nnhm:u.nnhm});
  ok(errs.length===0,'JSエラーなし',errs.slice(0,2));
  await ctx.close();
}
console.log(ng?('--- ★NG '+ng+' 件 ---'):'全部○');
await b.close(); })();
