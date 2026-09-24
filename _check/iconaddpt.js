/* 頂点追加／点選択アイコンの表示と、差し替え後も頂点追加が動くことを確認。 */
const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/jiruh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd();let bad=0;const ok=(n,c,v)=>{console.log((c?'○':'★NG')+' '+n+' '+JSON.stringify(v));if(!c)bad++;};
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
for(const phone of [false,true]){const p=await b.newPage({viewport:{width:phone?393:1500,height:phone?852:900},isMobile:phone,hasTouch:phone});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('https://icon.test/**',async r=>{const f=path.join(root,decodeURIComponent(new URL(r.request().url()).pathname.slice(1))||'index.html');fs.existsSync(f)?r.fulfill({path:f}):r.fulfill({status:404,body:''});});
await p.goto('https://icon.test/zumen_sekisan.html');await p.waitForTimeout(1300);await p.evaluate(()=>{try{nnZMenuClose();}catch{} });
const im=await p.evaluate(()=>['tl_addpt','tl_sel_point'].map(id=>{const b=document.getElementById(id),i=b&&b.querySelector('img');return{id,src:i&&i.getAttribute('src'),w:i&&i.naturalWidth,text:b&&b.textContent,title:b&&b.title};}));
ok((phone?'スマホ':'PC')+' 2枚の画像と頂点追加名',im.every(x=>x.w===168)&&/btn_addpt\.png\?v=2026-09-24k/.test(im[0].src)&&/btn_sel_point\.png\?v=2026-09-24k/.test(im[1].src)&&(phone?im[0].title.includes('頂点を追加'):im[0].text.includes('頂点追加')),im);
await p.evaluate(()=>{state.polys=[{name:'屋根①',lv:0,pts:[{x:2,y:2},{x:8,y:2},{x:8,y:7},{x:2,y:7}],edges:Array.from({length:4},()=>({h:0,w:0,k:'free'}))}];state.active=0;cellPx=40;ox=60;oy=200;setTool('addpt');draw();});
const q=await p.evaluate(()=>{mouse.x=gx2px(5);mouse.y=gy2px(2);mouse.rawx=5;mouse.rawy=2;mouse.gx=5;mouse.gy=2;nnPtAdd();return{n:state.polys[0].pts.length,p:state.polys[0].pts[1]};});
ok((phone?'スマホ':'PC')+' 頂点追加の機能を維持',q.n===5&&Math.abs(q.p.x-5)<1e-8&&Math.abs(q.p.y-2)<1e-8,q);ok((phone?'スマホ':'PC')+' 実行エラーなし',errs.length===0,errs);await p.close();}
await b.close();process.exitCode=bad?1:0;})().catch(e=>{console.error(e);process.exit(1)});
