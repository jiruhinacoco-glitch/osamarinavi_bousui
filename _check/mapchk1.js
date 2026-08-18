const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
// 地図APIは読めないので差し替えて、一覧と件数だけ確認
await p.route('**maps.googleapis.com**', r=>r.abort());
await p.addInitScript(()=>{ localStorage.setItem('osamari_maps_key','dummy'); });
await p.goto('file:///home/user/osamarinavi_bousui/genba_map_v36.html'); await p.waitForTimeout(1500);
const r=await p.evaluate(()=>({
  n: BASE_SITES.length,
  st: ['work','quote','done'].map(k=>k+':'+BASE_SITES.filter(s=>s.st===k).length).join(' '),
  cities: [...new Set(BASE_SITES.map(s=>(s.addr.match(/^[^市区]+[市区]/)||['?'])[0]))].join(' '),
  latOK: BASE_SITES.every(s=>s.lat>20 && s.lat<46 && s.lng>128 && s.lng<146),
  ids: BASE_SITES.every((s,i)=>s.id===i+1),
}));
console.log(JSON.stringify(r,null,1));
console.log('JSエラー:', errs.length?errs.join(' | '):'なし');
await b.close();})();
