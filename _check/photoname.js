/* 「航空写真からなぞる」の名称が3つの入口で一致し、専用画面が開くことを確認。 */
const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/jiruh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source=process.argv[2]||'zumen_sekisan.html',root=process.cwd();let bad=0;
const ok=(n,c,v)=>{console.log((c?'○':'★NG')+' '+n+' '+JSON.stringify(v));if(!c)bad++;};
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),p=await b.newPage({viewport:{width:1500,height:900}}),errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route('https://photoname.test/**',async r=>{let f=decodeURIComponent(new URL(r.request().url()).pathname.slice(1));if(f==='zumen_sekisan.html')f=source;const q=path.join(root,f);fs.existsSync(q)?r.fulfill({path:q}):r.fulfill({status:404,body:''});});
await p.goto('https://photoname.test/zumen_sekisan.html');await p.waitForTimeout(1100);
let q=await p.evaluate(()=>{const a=document.getElementById('tl_photo'),m=document.querySelector('[data-go="photo"]');return{button:a&&a.textContent.trim(),title:a&&a.title,menu:m&&m.textContent.trim()};});
ok('作図ボタンと最初のメニューを「航空写真からなぞる」に統一',q.button.includes('航空写真からなぞる')&&q.title.includes('航空写真をなぞって')&&q.menu.includes('航空写真からなぞる'),q);
await p.evaluate(()=>{try{nnZMenuClose();}catch{}document.getElementById('tl_photo').click();});await p.waitForTimeout(100);q=await p.evaluate(()=>({open:document.getElementById('nnPhoto').classList.contains('on'),head:document.querySelector('#nnPhTop b').textContent.trim()}));
ok('ボタンから専用画面が開き見出しも一致',q.open&&q.head.includes('航空写真からなぞる'),q);ok('実行エラーなし',errs.length===0,errs);await b.close();process.exitCode=bad?1:0;
})().catch(e=>{console.error(e);process.exit(1)});
