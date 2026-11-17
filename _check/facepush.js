/* 役物の見本：面をクリックで選び、ドラッグか＋−で押し出し・引っ込め（§1308）。
   ①角形の右の面をクリック → 黄色く選ばれ、下の帯に「右の面：幅 900mm」 ②＋押し出す → 幅＋50・左の面は動かない（3Dの左端の位置が同じ）
   ③右の面をドラッグして外へ → 幅が増える（欄の数字も）・カメラは回らない ④上の面をクリック → 高さ、−引っ込める → 高さ−10
   ⑤何も無い所をクリック → 選択が外れる ⑥選んでいないときのドラッグは今までどおり回る ⑦鳩小屋でも手前の面＝奥行 ⑧PC・iPhone 13 でJSエラー0
   使い方: node _check/facepush.js [kadai_mihon.html]   前提: python3 -m http.server 8899 */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kadai_mihon.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [tag,opt] of [['PC',{viewport:{width:1366,height:820}}],['iPhone',{...devices['iPhone 13']}]]){
  const p=await (await b.newContext(opt)).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(1800);
  /* 3Dの面の真ん中を画面の点に（検査側で：箱の外形から自分で計算） */
  const facePt=(f)=>p.evaluate((f)=>{ const pp=P(), W=pp.W/1000, D=pp.D/1000, H=pp.H/1000, g=G.position;
     const c={px:[W/2,H/2,0],nx:[-W/2,H/2,0],pz:[0,H/2,D/2],nz:[0,H/2,-D/2],top:[0,H,0]}[f];
     const v=new THREE.Vector3(c[0]+g.x+(f==='px'?0.001:f==='nx'?-0.001:0),c[1]+(f==='top'?0.001:0),c[2]+g.z).project(C), r=R.domElement.getBoundingClientRect();
     return {x:r.left+(v.x+1)/2*r.width, y:r.top+(1-v.y)/2*r.height}; },f);
  const st=()=>p.evaluate(()=>({sel:FD.sel, W:P().W, D:P().D, H:P().H, bar:getComputedStyle(document.getElementById('faceBar')).display, txt:document.querySelector('#faceBar .fn').textContent, gx:+G.position.x.toFixed(4), gz:+G.position.z.toFixed(4), th:+rot.th.toFixed(4), nW:(document.getElementById('n_W')||{}).value}));
  const tap=async(pt)=>{ if(tag==='iPhone') await p.touchscreen.tap(pt.x,pt.y); else await p.mouse.click(pt.x,pt.y); await p.waitForTimeout(250); };
  /* 正面に戻す：左手前から見る（右の面＝向こう側なので、左の面と手前の面で確かめる） */
  let a=await facePt('nx'); await tap(a); let s=await st();
  ok(s.sel==='nx'&&s.bar==='flex'&&/左の面：幅 900mm/.test(s.txt), tag+' ①左の面をクリック → 選ばれ、帯に「左の面：幅 900mm」', s);
  await p.click('#faceBar button[data-fd="1"]'); await p.waitForTimeout(300); let s2=await st();
  const right0=0.9/2+s.gx, right1=s2.W/2000+s2.gx;   /* 右の面の位置（反対側）は動かない */
  ok(s2.W===950&&Math.abs(right1-right0)<0.002&&s2.nW==='950', tag+' ②＋押し出す → 幅950・反対側（右の面）は動かない・欄も950', {W:s2.W, 右の面:[+right0.toFixed(4),+right1.toFixed(4)], 欄:s2.nW});
  if(tag==='PC'){
   a=await facePt('nx'); const th0=s2.th; await p.mouse.move(a.x,a.y); await p.mouse.down(); for(let i=1;i<=10;i++){ await p.mouse.move(a.x-i*14,a.y+i*6); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(400);
   let s3=await st(); ok(s3.W>s2.W&&s3.th===th0&&s3.nW===String(s3.W), tag+' ③左の面をドラッグして外へ → 幅が増え、カメラは回らない', {W:s2.W+'→'+s3.W, th:[th0,s3.th]});
  }
  a=await facePt('top'); await tap(a); let s4=await st();
  ok(s4.sel==='top'&&/上の面：高さ 300mm/.test(s4.txt), tag+' ④上の面をクリック → 高さ', s4.txt);
  await p.click('#faceBar button[data-fd="-1"]'); await p.waitForTimeout(300); let s5=await st();
  ok(s5.H===290, tag+' ④−引っ込める → 高さ290', s5.H);
  const r=await p.evaluate(()=>{ const q=R.domElement.getBoundingClientRect(); return {x:q.left+12, y:q.top+q.height*0.45}; });
  await tap(r); let s6=await st(); ok(s6.sel===null&&s6.bar==='none', tag+' ⑤何も無い所をクリック → 選択が外れる', s6);
  if(tag==='PC'){ const th0=s6.th; await p.mouse.move(r.x+200,r.y); await p.mouse.down(); for(let i=1;i<=8;i++){ await p.mouse.move(r.x+200+i*15,r.y); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(300);
    let s7=await st(); ok(s7.th!==th0&&s7.W===s6.W, tag+' ⑥選んでいないときのドラッグは回る（寸法は変わらない）', {th:[th0,s7.th]}); }
  await p.click('#cats button[data-c="hato"]'); await p.waitForTimeout(500);
  await p.click('#vReset'); await p.waitForTimeout(400);   /* ⑥で回したので正面に戻す */
  const hp=await p.evaluate(()=>{ const pp=P(), ko=pp.koshi?pp.Hb/1000:0, D=pp.D/1000, H=pp.H/1000; const v=new THREE.Vector3(G.position.x,ko+H*0.15,D/2+0.02+G.position.z).project(C), q=R.domElement.getBoundingClientRect(); return {x:q.left+(v.x+1)/2*q.width, y:q.top+(1-v.y)/2*q.height, D:pp.D}; });
  await tap(hp); let s8=await st(); ok(s8.sel==='pz'&&/手前の面：奥行/.test(s8.txt), tag+' ⑦鳩小屋の手前の面 → 奥行', s8.txt);
  ok(errs.length===0, tag+' ⑧JSエラーなし', errs.slice(0,2));
 }
 console.log(ng?'★NG '+ng+'件':'全部○'); await b.close(); process.exit(ng?1:0);
})();
