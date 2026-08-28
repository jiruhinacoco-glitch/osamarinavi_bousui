/* シートの割付（何枚・何巻いるか）が、手で計算した数と合っているか
   ★材料の発注に直結する数字なので、「出ているか」ではなく「合っているか」を見る（§147の型）
   使い方: node _check/wari2.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(800);

const r=await p.evaluate(()=>{
  state.scaleM=1; state.specCode='AS-T1'; state.chidori=false;
  state.lapMm=100; state.endLapMm=150;
  state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:10},{x:0,y:10}],
    edges:[{k:'para',h:300,w:250},{k:'para',h:300,w:250},{k:'para',h:300,w:250},{k:'para',h:300,w:250}],holes:[]}];
  commit();
  const sp=spec();
  const ptsM=state.polys[0].pts.map(q=>({x:q.x,y:q.y}));
  const one=(chi)=>{ const L=wari(ptsM, [], sp.sheetW, state.lapMm/1000, state.endLapMm/1000, sp.rollLen, 'h', chi);
    return {bands:L.bands.length, n:L.nPieces, len:Math.round(L.totalLen*100)/100,
      lens:L.lens.slice(), rolls:ffdRolls(L.lens, sp.rollLen)}; };
  return {sheetW:sp.sheetW, rollLen:sp.rollLen, lap:state.lapMm, endLap:state.endLapMm,
    ふつう:one(false), 千鳥:one(true), 面積:quantities(state.polys[0],1).hira};
});
const W=r.sheetW, RL=r.rollLen, side=r.lap/1000, end=r.endLap/1000;
/* ── 手で計算する ──
   帯：幅10mを「1枚の幅 − 重ねしろ」ずつ進む → ceil(10 ÷ (1.0−0.1)) = 12帯
   1帯：長さ20m を 8m の巻から取る。1枚目は8m、2枚目からは重ねしろ0.15を食うので実質7.85m
        → 8 + 7.85 + 7.85 = 23.7 ≧ 20 なので3枚。3枚目の長さは 20 − 8 − 7.85 + 0.15 = 4.3m */
const eff=W-side, bands=Math.ceil(10/eff);
const per=[8,8,20-8-(RL-end)+end];
const nPieces=bands*3, totalLen=Math.round(bands*(per[0]+per[1]+per[2])*100)/100;
console.log('     手の計算：帯'+bands+'・枚'+nPieces+'・合計'+totalLen+'m（3枚目は'+Math.round(per[2]*100)/100+'m）');
console.log('     アプリ  ：帯'+r.ふつう.bands+'・枚'+r.ふつう.n+'・合計'+r.ふつう.len+'m・巻'+r.ふつう.rolls);
ok(r.面積===200,'平場 20m×10m＝200㎡ ('+r.面積+')');
ok(r.ふつう.bands===bands,'帯の数が手の計算と同じ ('+r.ふつう.bands+'／'+bands+')');
ok(r.ふつう.n===nPieces,'枚数が手の計算と同じ ('+r.ふつう.n+'／'+nPieces+')');
ok(Math.abs(r.ふつう.len-totalLen)<0.05,'合計の長さが手の計算と同じ ('+r.ふつう.len+'／'+totalLen+')');
/* 1帯ぶんの重ねを考えた長さが20mちょうどを覆うか */
const cover=8+(8-end)+(r.ふつう.lens[2]-end);
ok(Math.abs(cover-20)<0.02,'重ねしろを引くと1帯でちょうど20mを覆う ('+Math.round(cover*100)/100+'m)');
/* 巻数：8mの巻から4.3mを2本は取れない（8.6>8）ので、8m×24本＋4.3m×12本＝36巻 */
ok(r.ふつう.rolls===36,'必要な巻数が手の計算と同じ (36／'+r.ふつう.rolls+')');
/* 千鳥は「1枚目を半分にする」ので枚数が増える */
ok(r.千鳥.n>r.ふつう.n,'千鳥にすると枚数が増える ('+r.ふつう.n+'→'+r.千鳥.n+')');
ok(r.千鳥.bands===r.ふつう.bands,'千鳥にしても帯の数は同じ ('+r.千鳥.bands+')');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
