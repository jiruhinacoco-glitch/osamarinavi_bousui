/* 現場マップの「屋根をなぞって出す面積」が、手の計算と合っているか
   ★勾配のある屋根は「水平に見た面積（flat）」と「実際の斜面の面積（slope）」が違う。
     20m×10m を片側だけ5m持ち上げると、斜面積は 200×√1.25＝223.6㎡・角度26.6度。
   ★地図はAPIキーが要るので、ここでは計算の関数だけを直に呼んで確かめる。
   使い方: node _check/maparea.js   （先に python3 -m http.server 8899 を立てる） */
let NG=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)NG++;};
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1400,height:900}});
p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ try{ localStorage.setItem('osamari_gmaps_key','DUMMY'); }catch(e){} });
await p.route('**maps.googleapis.com**', r=>r.fulfill({status:200,contentType:'application/javascript',body:'window.google={maps:{}};'}));
await p.goto('http://localhost:8899/genba_map_v36.html',{waitUntil:'load'}); await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{
  const lat0=43.06, lng0=141.35;
  const dLat=10/111320, dLng=20/(111320*Math.cos(lat0*Math.PI/180));
  const flat=[{lat:lat0,lng:lng0,alt:0},{lat:lat0,lng:lng0+dLng,alt:0},
              {lat:lat0+dLat,lng:lng0+dLng,alt:0},{lat:lat0+dLat,lng:lng0,alt:0}];
  const tilt=[{lat:lat0,lng:lng0,alt:0},{lat:lat0,lng:lng0+dLng,alt:0},
              {lat:lat0+dLat,lng:lng0+dLng,alt:5},{lat:lat0+dLat,lng:lng0,alt:5}];
  const a=area3dOf(flat), t=area3dOf(tilt);
  return {平ら:{slope:Math.round(a.slope*10)/10, flat:Math.round(a.flat*10)/10, ang:Math.round(a.angleDeg*10)/10},
          勾配:{slope:Math.round(t.slope*10)/10, flat:Math.round(t.flat*10)/10, ang:Math.round(t.angleDeg*10)/10},
          理論:{flat:200, slope:Math.round(200*Math.sqrt(1+0.25)*10)/10, ang:Math.round(Math.atan(0.5)*180/Math.PI*10)/10}};
});
console.log('     平ら '+JSON.stringify(r.平ら)+'\n     勾配 '+JSON.stringify(r.勾配)+'\n     理論 '+JSON.stringify(r.理論));
ok(Math.abs(r.平ら.flat-200)<0.3,'平らな20m×10m＝200㎡（水平）');
ok(Math.abs(r.平ら.slope-200)<0.3,'平らなら斜面積も200㎡');
ok(Math.abs(r.平ら.ang)<0.2,'平らなら勾配0度');
ok(Math.abs(r.勾配.flat-200)<0.3,'勾配があっても水平の面積は200㎡');
ok(Math.abs(r.勾配.slope-223.6)<0.4,'斜面積は223.6㎡（200×√1.25）');
ok(Math.abs(r.勾配.ang-26.6)<0.3,'勾配は26.6度（atan 5/10）');
await b.close();
console.log(NG?('\n★NG '+NG+'件'):'\n全部○');
process.exit(NG?1:0);})();
