/* デバッグ巡回（2026-10-31）：発注に ①記録帳で新しく作った物件が出る（材料の明細つき）②客先登録の仕入先が発注先に出る ③LINEで送れる。
   node _check/hacchu_kiroku.js [hacchu.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const path=require('path'), fs=require('fs');
const file=process.argv[2]||'hacchu.html', root=path.resolve(__dirname,'..');
let ng=0; const ok=(t,c,d)=>{ console.log((c?'○ ':'★NG ')+t+(c?'':' '+JSON.stringify(d))); if(!c)ng++; };
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
 await ctx.route('https://hk.test/**',async r=>{let f=decodeURIComponent(new URL(r.request().url()).pathname.slice(1)); if(f==='hacchu.html')f=file;
   const q=path.resolve(root,f); if(fs.existsSync(q)) r.fulfill({path:q}); else r.fulfill({status:404,body:''});});
 await ctx.route('https://line.me/**',r=>r.fulfill({status:200,body:'line'}));
 await ctx.addInitScript(()=>{ try{ if(!sessionStorage.getItem('seed')){ sessionStorage.setItem('seed','1');
   localStorage.setItem('nn_view_mode','pc');
   localStorage.setItem('nn_kirokucho_props_v1',JSON.stringify({v:1,seq:201,add:[JSON.stringify({id:201,code:'J201',name:'検査 熱アス',status:'契約済',kouhou:'アスファルト防水 熱工法 露出絶縁(D-1（部分粘着）)',m:300,un:'㎡',addr:'札幌市',moto:'検査建設'}),
     JSON.stringify({id:202,code:'J202',name:'検査 塩ビ',status:'施工中',kouhou:'塩ビシート防水 接着工法(S-F1)',m:200,un:'㎡',addr:'札幌市',moto:'検査建設'})],edit:{},del:[]}));
   localStorage.setItem('nn_tokui_v1',JSON.stringify({moto:[],shiire:[{id:'x1',name:'検査建材（株）',tanto:'山田様',mail:'a@b.example.jp'}],maker:[],kyoryoku:[]})); } }catch(_){} });
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('https://hk.test/hacchu.html'); await p.waitForTimeout(1500);
 const g=await p.evaluate(()=>['J201','J202'].map(c=>{const x=GENBA.find(y=>y.id===c); return x?{sp:x.sp,st:x.st,items:x.items.length}:null;}));
 ok('①記録帳の新しい物件が発注の現場に出る（材料の明細つき・熱工法 D-1／塩ビ接着 S-F1）', g[0]&&g[0].sp==='D-1'&&g[0].items>=4&&g[1]&&g[1].sp==='S-F1'&&g[1].items>=4, g);
 ok('②客先登録の仕入先が発注先に出る', await p.evaluate(()=>VENDORS.some(v=>v.name==='検査建材（株）')));
 await p.locator('#nnPick .nnPk').first().click(); await p.waitForTimeout(500);
 await p.locator('.grow.gr2').filter({hasText:'検査 熱アス'}).locator('.gstart').click(); await p.waitForTimeout(500);
 await p.locator('.item-tbl .qty').first().fill('2'); await p.locator('.item-tbl .qty').first().dispatchEvent('change');
 await p.evaluate(()=>{ draft.step=3; render(); }); await p.waitForTimeout(400);
 await p.locator('.sendsel button',{hasText:'LINE'}).click(); await p.waitForTimeout(300);
 await p.evaluate(()=>openSend()); await p.waitForTimeout(300);
 const [pop]=await Promise.all([ctx.waitForEvent('page',{timeout:5000}).catch(()=>null), p.locator('#sendGo').click()]);
 const u=pop?decodeURIComponent(pop.url()):'';
 ok('③LINEで送る＝LINEの送る画面を発注の文章つきで開く', /line\.me\/R\/msg\/text\/\?【発注書】/.test(u)&&/検査 熱アス/.test(u), u.slice(0,80));
 await p.waitForTimeout(1800);
 const h=await p.evaluate(()=>{ const x=JSON.parse(localStorage.getItem('nn_hacchu_hist')||'[]')[0]; return x&&x.via+':'+x.gid; });
 ok('③発注履歴に LINE で記録', h==='line:J201', h);
 ok('JSエラーなし', !errs.length, errs);
 await b.close(); console.log(ng?'★NG '+ng:'全部○');
})();
