/* §446 ダッシュボードの完成表示・透明余白・絞り込みをPC/スマホで確認。 */
const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/node22/lib/node_modules/playwright');
const {PNG}=require(process.env.PNG_MODULE||'pngjs');
let bad=0;function ok(c,n,v){console.log((c?'○ ':'★NG ')+n+' '+JSON.stringify(v));if(!c)bad++;}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const mode of ['pc','ichiran','mobile']){
const c=await b.newContext({viewport:mode==='pc'?{width:1754,height:950}:{width:393,height:852},screen:mode==='pc'?{width:1754,height:950}:{width:393,height:852},isMobile:mode!=='pc',hasTouch:mode!=='pc',reducedMotion:'reduce',serviceWorkers:'block',...(mode==='pc'?{}:{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'})});
await c.addInitScript(m=>localStorage.setItem('nn_view_mode',m),mode);
await c.route('**/*',r=>{const u=new URL(r.request().url());let f=path.resolve(decodeURIComponent(u.pathname).slice(1));if(u.pathname==='/kirokucho_demo.html'&&process.argv[2])f=path.resolve(process.argv[2]);return u.hostname==='dash.test'&&f.startsWith(process.cwd()+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.abort();});
const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('https://dash.test/kirokucho_demo.html');await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});

await p.waitForFunction(()=>document.querySelectorAll('#dashboard .httl').length===10);
const v=await p.evaluate(()=>{const h=[...document.querySelectorAll('#dashboard .httl')],b=document.querySelector('#dashboard .stbar'),k=document.querySelector('#dashboard .kgrps'),table=h.find(x=>x.innerText==='施工中の現場').closest('.dpanel').querySelector('table');return {titles:h.map(x=>x.innerText),bold:getComputedStyle(b.firstElementChild).fontFamily,weight:getComputedStyle(b.firstElementChild).fontWeight,gap:(k.getBoundingClientRect().top-b.getBoundingClientRect().bottom)/(b.getBoundingClientRect().height/b.offsetHeight),width:table.getBoundingClientRect().width/table.parentElement.getBoundingClientRect().width,tableFont:getComputedStyle(table.querySelector('td')).fontSize,centered:h.every(x=>x.querySelector('.httl-text')),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};});
ok(v.titles.includes('完成工事の予実')&&v.titles.includes('工法別 受注情報')&&v.titles.includes('元請別 受注情報'),mode+' 見出し3件の名称');
ok(v.bold.includes('NNHead')&&Number(v.weight)>=900,mode+' 全物件の文字・数字を太字書体');
ok(v.gap>=9.5,mode+' 検索帯とKPIを10px以上離す',v.gap);
ok(v.width>=.99,mode+' 施工中一覧が全幅',v.width);
ok(parseFloat(v.tableFont)>=12,mode+' 表の文字を12px以上',v.tableFont);
ok(v.centered,mode+' 全見出しを文字の実寸で中央配置');
if(mode==='mobile')ok(v.overflow<=1,mode+' スマホ画面の横はみ出しなし',v.overflow);
// 実際に描画された文字色の上下端を画像から測る。配置関数を検算に呼ばない。
if(mode==='pc'){
for(let i=0;i<10;i++){
 const h=p.locator('#dashboard .httl').nth(i);await h.scrollIntoViewIfNeeded();
 const pos=await h.evaluate(e=>{const r=e.getBoundingClientRect();let t=e.querySelector('.httl-text'),rr;if(t)rr=t.getBoundingClientRect();else{let n=[...e.childNodes].find(x=>x.nodeType===3&&x.textContent.trim()),q=document.createRange();q.selectNode(n);rr=q.getBoundingClientRect();}return {text:e.innerText,x:rr.left-r.left,w:rr.width,z:r.height/e.offsetHeight};});
 const im=PNG.sync.read(await h.screenshot()),rows=[];
 for(let y=3;y<im.height-4;y++){let n=0;for(let x=Math.ceil(pos.x+1);x<Math.min(im.width-4,Math.floor(pos.x+pos.w-1));x++){const q=(y*im.width+x)*4,r=im.data[q],g=im.data[q+1],bb=im.data[q+2];if(r>=55&&r<=110&&g>=10&&g<65&&bb>=15&&bb<75&&r>g*1.35)n++;}if(n>=3)rows.push(y);}
 const center=rows.length?(rows[0]+rows.at(-1)+1)/2:NaN,delta=(center-im.height*(260/276)/2)/pos.z;
 ok(Math.abs(delta)<=1.25,mode+' 実画像の文字中心 '+pos.text,{delta,rows:[rows[0],rows.at(-1)]});
}
const panel=p.locator('.dpanel').filter({has:p.locator('.httl',{hasText:'施工中の現場'})});if(process.env.DASH_SCREENSHOT)await panel.screenshot({path:path.join(process.env.DASH_SCREENSHOT,'sekou-final.png')});
}
ok(errors.length===0,mode+' 実行エラーなし',errors);await c.close();}
await b.close();process.exitCode=bad?1:0;})();
