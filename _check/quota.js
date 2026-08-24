/* 端末の保存がいっぱいのとき、黙って消えずに知らせるか（全ページ）
   ★localStorage.setItem は容量を超えると例外を投げる。受け止めていないと
     そこで処理が止まり、利用者には「保存されたつもり」で中身だけが消える。
   使い方: node _check/quota.js   （先に python3 -m http.server 8899 を立てる） */
/* 端末の保存がいっぱいのとき、黙って消えずに知らせるか */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const f of ['zumen_sekisan.html','kirokucho_demo.html','genba_map_v36.html','library.html','hacchu.html','zairyo_toroku.html','index.html']){
  const ctx=await b.newContext({viewport:{width:1400,height:900}});
  const p=await ctx.newPage(); const dl=[]; p.on('dialog',d=>{dl.push(d.message().slice(0,40)); d.accept();});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,70)));
  await p.goto('http://localhost:8899/'+f,{waitUntil:'load'}); await p.waitForTimeout(1700);
  await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});
  const r=await p.evaluate(()=>{
    /* 保存を「いっぱいです」と必ず失敗させる */
    const _set=Storage.prototype.setItem;
    Storage.prototype.setItem=function(){ const e=new Error('QuotaExceededError'); e.name='QuotaExceededError'; throw e; };
    let thrown=null, msg='';
    const before=document.body.innerText;
    try{
      if(typeof saveState==='function') saveState();
      else if(typeof save==='function') save();
      else if(window.nnFacesSave) nnFacesSave('X',[]);
    }catch(e){ thrown=e.message.slice(0,50); }
    const after=document.body.innerText;
    Storage.prototype.setItem=_set;
    return {止まった:thrown, 案内が出た:(after!==before)||/いっぱい|空き|保存できま/.test(after)};
  }).catch(e=>({止まった:'（呼べない）', 案内が出た:false}));
  if(r.止まった)ng++;
  console.log((r.止まった?'★NG ':'○   ')+f.padEnd(22)+
    '例外で止まる: '+(r.止まった||'なし')+' ／ 画面に知らせ: '+(r.案内が出た?'あり':'なし')+
    (dl.length?' ／ 窓: '+dl[0]:''));
  await ctx.close();
}
await b.close();
console.log(ng?('\n★NG '+ng+'ページで処理が止まる'):'\n全部○（どのページも受け止めて知らせる）');
process.exit(ng?1:0);
})();
