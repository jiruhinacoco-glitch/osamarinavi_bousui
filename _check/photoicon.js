/* 「航空写真からなぞる」の支給画像、更新URL、PC/スマホでの収まりを確認。 */
const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/jiruh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source=process.argv[2]||'zumen_sekisan.html',root=process.cwd();let bad=0;
const ok=(n,c,v)=>{console.log((c?'○':'★NG')+' '+n+' '+JSON.stringify(v));if(!c)bad++;};
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),errs=[];
for(const [name,opt] of [['PC',{viewport:{width:1600,height:900}}],['スマホ',{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}]]){
 const p=await b.newPage(opt);p.on('pageerror',e=>errs.push(name+': '+e.message));
 await p.route('https://photoicon.test/**',async r=>{let f=decodeURIComponent(new URL(r.request().url()).pathname.slice(1));if(f==='zumen_sekisan.html')f=source;const q=path.join(root,f);fs.existsSync(q)?r.fulfill({path:q}):r.fulfill({status:404,body:''});});
 await p.goto('https://photoicon.test/zumen_sekisan.html');await p.waitForTimeout(1100);
 const q=await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}const a=document.getElementById('tl_photo'),i=a&&a.querySelector('img.tbi'),r=a&&a.getBoundingClientRect(),t=document.getElementById('toolbar').getBoundingClientRect();return{text:a&&a.textContent.trim(),src:i&&i.getAttribute('src'),natural:i&&[i.naturalWidth,i.naturalHeight],visible:!!(a&&a.offsetParent),inside:!!(r&&r.left>=0&&r.right<=document.documentElement.clientWidth+1),toolbarH:t.height};});
 ok(name+'で支給画像を表示',q.text.includes('航空写真からなぞる')&&q.src.includes('btn_photo.png?v=2026-09-15h')&&q.natural[0]===962&&q.natural[1]===773,q);
 ok(name+'でツールバー内に収まる',q.visible&&q.inside&&(name==='PC'||q.toolbarH<=135),q);
 await p.close();
}
ok('実行エラーなし',errs.length===0,errs);await b.close();process.exitCode=bad?1:0;
})().catch(e=>{console.error(e);process.exit(1)});
