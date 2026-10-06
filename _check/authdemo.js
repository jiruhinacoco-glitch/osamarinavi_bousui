/* §602 ホームの「登録デモ」：登録→確認コード→ログイン中→ログアウト→ログイン→5回まちがいでロック を端から端まで通す。
   パスワードそのものが端末に保存されていないことも確かめる。使い方: node _check/authdemo.js （要 http://localhost:8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let bad=0;const ok=(v,n,d)=>{console.log((v?'○ ':'★NG ')+n+' '+JSON.stringify(d??''));if(!v)bad++;};
const PW='Nokiba-Demo#2026x';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const mobile of [false,true]){
const c=await b.newContext(mobile?{viewport:{width:393,height:852},isMobile:true,hasTouch:true,serviceWorkers:'block',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'}:{viewport:{width:1440,height:900},serviceWorkers:'block'});
const p=await c.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
const T=mobile?'[スマホ] ':'[PC] ';
await p.goto('http://localhost:8899/index.html');
const btn=p.locator('#authBtn');ok(await btn.isVisible(),T+'ホームに登録デモボタン');
ok(await btn.evaluate(e=>{const r=e.getBoundingClientRect(),a=document.getElementById('askBtn').getBoundingClientRect();return r.top>=a.bottom-1&&r.right<=document.documentElement.clientWidth;}),T+'きくの下に収まる');
await btn.click();const m=p.locator('#nnAuthBg .nnau');await m.waitFor();
ok(await m.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=document.documentElement.clientWidth+1&&r.top>=0;}),T+'画面からはみ出さない');
await p.fill('#au_co','株式会社テスト防水');await p.fill('#au_nm','テスト 太郎');await p.fill('#au_ml','taro@example.com');await p.fill('#au_id','test01');
await p.fill('#au_pw','password1234');await p.fill('#au_pw2','password1234');await p.check('#au_ok');await p.click('#au_go');
ok(/条件/.test(await p.textContent('#au_err')),T+'よくあるパスワードは断る');
await p.fill('#au_pw',PW);await p.fill('#au_pw2',PW+'z');await p.click('#au_go');ok(/一致/.test(await p.textContent('#au_err')),T+'確認用の不一致を断る');
await p.fill('#au_pw2',PW);await p.click('#au_go');
await p.waitForSelector('#au_cd',{timeout:20000}).catch(async e=>{console.log('DBG',await p.evaluate(()=>({err:document.getElementById('au_err')?.textContent,go:document.getElementById('au_go')?.textContent})));throw e;});const code=(await p.textContent('#nnAuthBg .mail b.cd')).trim();
await p.fill('#au_cd',code==='000000'?'111111':'000000');await p.click('#au_go');ok(/違います/.test(await p.textContent('#au_err')),T+'違う確認コードを断る');
await p.fill('#au_cd',code);await p.click('#au_go');await p.waitForSelector('#au_out');
const raw=await p.evaluate(()=>localStorage.getItem('nn_auth_demo_v1'));
ok(raw&&!raw.includes(PW)&&/"hash":"[A-Za-z0-9+/=]{40,}"/.test(raw),T+'パスワードそのものは保存せず変換値だけ',raw&&raw.length);
ok(/ログイン中/.test(await btn.textContent()),T+'ホームのボタンがログイン中に変わる');
await p.click('#au_out');await p.waitForSelector('#nnAuthBg #au_pw');
await p.fill('#au_id','test01');await p.fill('#au_pw',PW+'q');await p.click('#au_go');await p.waitForFunction(()=>/違います/.test(document.getElementById('au_err').textContent),null,{timeout:20000});
ok(true,T+'まちがいパスワードを断る');
await p.fill('#au_pw',PW);await p.click('#au_go');await p.waitForSelector('#au_out',{timeout:20000});ok(true,T+'正しいパスワードでログイン（大文字小文字・メールでも可）');
await p.click('#au_out');await p.waitForSelector('#nnAuthBg #au_pw');
for(let i=0;i<5;i++){await p.fill('#au_id','TARO@example.com');await p.fill('#au_pw','wrong'+i);await p.click('#au_go');await p.waitForFunction(()=>!document.getElementById('au_go').disabled,null,{timeout:20000});}
await p.fill('#au_pw',PW);await p.click('#au_go');await p.waitForTimeout(300);ok(/ロック/.test(await p.textContent('#au_err')),T+'5回まちがえると正しくても一時ロック');
if(!mobile)await m.screenshot({path:'_check/authdemo-pc.png'});
ok(!errs.length,T+'実行エラーなし',errs);await c.close();}
await b.close();console.log(bad?'NG '+bad:'ALL OK');process.exitCode=bad?1:0;})();
