/* 図面・積算：①図面／②割付／③断面／④3D の4つのタブで、
   画面にあるボタンを片っぱしから押してもJSエラーが出ないか。
   ★押すたびに「いま画面にあるボタン」を取り直すこと（まとめて集めると古いボタンを押してしまう）。
   使い方: node _check/deepzu.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push((e&&e.stack?e.stack:String(e)).split('\n').slice(0,2).join(' | ').slice(0,200)));
p.on('dialog',d=>d.dismiss().catch(()=>{}));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(900);
const r=await p.evaluate(async()=>{
  const ow=window.open; window.open=()=>({document:{open(){},write(){},close(){}},focus(){},print(){},close(){}});
  const skip=/全削除|すべて消|消去|リセット|保存|開く/;
  // サンプル形状で中身を用意
  try{ loadSample&&loadSample(); }catch(e){}
  await new Promise(s=>setTimeout(s,400));
  let n=0; const seen=new Set(); const log=[];
  for(const t of ['zu','wari','sect','d3']){
    try{ setTab(t); }catch(e){ log.push(t+':'+e.message); continue; }
    await new Promise(s=>setTimeout(s, t==='d3'?3000:400));
    for(let i=0;i<70;i++){
      const btns=[...document.querySelectorAll('button')]
        .filter(x=>x.offsetParent!==null && !skip.test(x.textContent||''));
      const x=btns[i]; if(!x)break;
      const key=t+'|'+i+'|'+(x.id||'')+'|'+(x.textContent||'').trim().slice(0,8);
      if(seen.has(key))continue; seen.add(key);
      window.__last=key;
      try{ x.click(); n++; }catch(e){ log.push(key+':'+e.message); }
      await new Promise(s=>setTimeout(s,45));
      // 開いたパネル・小窓は閉じる
      try{ if(window.nnZMenuClose) nnZMenuClose(); }catch(e){}
      if(typeof tab!=='undefined' && tab!==t){ try{ setTab(t); }catch(e){} await new Promise(s=>setTimeout(s,150)); }
    }
  }
  window.open=ow;
  return {pressed:n, log:log.slice(0,6), last:window.__last};
});
const bad=[...new Set(errs.filter(e=>!/favicon|404/.test(e)))];
let ng=0; const NGM=[];
console.log('     押したボタン '+r.pressed+'個');
if(r.pressed<200){ console.log('★NG 押せた数が少ない（'+r.pressed+'個）'); ng++; NGM.push('押せた数が少ない('+r.pressed+')'); }
else console.log('○   4つのタブで十分な数を押せた ('+r.pressed+'個)');
if(r.log.length){ console.log('★NG 押せなかったボタン: '+r.log.join(' / ')); ng++; NGM.push('押せなかった: '+r.log.slice(0,3).join(' / ')); }
if(bad.length){ console.log('★NG JSエラー\n     '+bad.slice(0,8).join('\n     ')); ng++; NGM.push('JSエラー: '+bad[0].slice(0,80)); }
else console.log('○   JSエラーなし');
console.log(ng?('\n★NG '+ng+'件  '+NGM.join('  ／  ')):'\n全部○');
await b.close(); process.exit(ng?1:0);})();
