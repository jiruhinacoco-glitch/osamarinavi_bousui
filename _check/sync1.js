/* 現場記録帳・現場マップ・発注 の物件データが食い違っていないか
   ★引き継ぎメモが何度も警告している点：記録帳の物件を変えたら
     _check/mapsync.py と _check/hacchu_sync.py の**両方**を流し直すこと。
     片方だけ直すと、同じ現場の話をしているのに数字が合わないデモになる。
   使い方: node _check/sync1.js   （先に python3 -m http.server 8899 を立てる） */
/* 現場記録帳・現場マップ・発注 の物件データが食い違っていないか */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1400,height:900}});
const get=async(f,fn)=>{ const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/'+f,{waitUntil:'load'}); await p.waitForTimeout(2000);
  const r=await p.evaluate(fn); await p.close(); return r; };
const K=await get('kirokucho_demo.html',()=>({
  件数:props.length,
  名前:props.map(x=>x.name),
  状態:props.reduce((a,x)=>{a[x.stRaw]=(a[x.stRaw]||0)+1;return a;},{}),
}));
const M=await get('genba_map_v36.html',()=>({
  件数:(typeof BASE_SITES!=='undefined'?BASE_SITES.length:-1),
  名前:(typeof BASE_SITES!=='undefined'?BASE_SITES.map(x=>x.name):[]),
}));
const H=await get('hacchu.html',()=>({
  件数:(typeof GENBA!=='undefined'?GENBA.length:-1),
  名前:(typeof GENBA!=='undefined'?GENBA.map(x=>x.name):[]),
}));
console.log('現場記録帳 '+K.件数+'件  状態の内訳 '+JSON.stringify(K.状態));
console.log('現場マップ '+M.件数+'件');
console.log('発注       '+H.件数+'件');
const kn=new Set(K.名前);
const mNot=M.名前.filter(n=>!kn.has(n));
const hNot=H.名前.filter(n=>!kn.has(n));
let ng=0; const ok=(c,m)=>{ if(!c)ng++; console.log((c?'○ ':'★NG ')+m); };
ok(M.件数===K.件数,'マップの件数が記録帳と同じ（'+M.件数+' / '+K.件数+'）');
ok(mNot.length===0,'マップの現場はすべて記録帳にある'+(mNot.length?' → 無い物: '+mNot.slice(0,3).join(' / '):''));
ok(hNot.length===0,'発注の現場はすべて記録帳にある'+(hNot.length?' → 無い物: '+hNot.slice(0,3).join(' / '):''));
ok(H.件数>0 && H.件数<=K.件数,'発注に出る現場は記録帳の一部（'+H.件数+'件）');
await b.close();
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
process.exit(ng?1:0);
})();
