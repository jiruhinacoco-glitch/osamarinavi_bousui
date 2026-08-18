/* ★2026-08-15m 3D立体モードの現場のしるしを「2Dと同じただのポチ」に
   使い方: node dot3d.js
   ★地図はAPIキーが要るので、3Dの部品（lib3d）はニセ物に差し替えて確かめる。 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1600,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('**maps.googleapis.com**', r=>r.abort());
  await p.addInitScript(()=>{ localStorage.setItem('osamari_maps_key','dummy'); });
  await p.goto('http://localhost:8899/genba_map_v36.html'); await p.waitForTimeout(1600);

  const g=await p.evaluate(()=>{
    const made=[], appended=[];
    lib3d={Polygon3DElement:class{constructor(o){Object.assign(this,o); made.push(this);} remove(){this.gone=true;}}};
    map3d={range:600, tilt:0, heading:0, center:{lat:SITES[0].lat, lng:SITES[0].lng, altitude:0},
      clientWidth:1200, clientHeight:900, append(x){appended.push(x);}};
    viewMode='3d';
    const s0=SITES.find(x=>x.st==='done'), s1=SITES.find(x=>x.st==='work');
    nnMakeDot3d(s0); nnMakeDot3d(s1);
    const g0=dots3d[s0.id];
    const la0=s0.lat;
    const rad=r=>Math.max(...r.outerCoordinates.map(c=>Math.abs(c.lat-la0)))*111320;
    const r600=rad(g0);
    /* ★2026-08-15s 「画面の上で何pxに見えるか」は、ページ自身の投影
       （worldToScreenRaw）でポチの輪を画面に落として測る。
       ★版qの検算は nnMeterPerPx で割り戻していただけ＝いつも10pxと出る
         ザル検査だった（実機で18倍の巨大なポチになっていたのに通っていた）。 */
    const px=()=>{
      map3d.center={lat:s0.lat, lng:s0.lng, altitude:0};
      const xs=dots3d[s0.id].outerCoordinates.map(c=>{
        const q=worldToScreenRaw(c.lat, c.lng, 0); return q?q[0]:null;
      }).filter(v=>v!==null);
      return xs.length ? Math.max(...xs)-Math.min(...xs) : null;
    };
    const set=(r,t,h)=>{ map3d.range=r; map3d.tilt=t; map3d.heading=h||0; nnUpdateDots3d(); };
    set(5000,0);   const px5000=px(), r5000=rad(dots3d[s0.id]);
    set(600,70);   const pxTilt=px();
    set(600,80,45);const pxTilt2=px();
    set(200,60);   const px200=px(), r200=rad(dots3d[s0.id]);
    set(600,0);
    /* 高さ＝ピンと同じ（建物の陰に隠れないように） */
    const alt=g0.outerCoordinates[0].altitude, pinAlt=altFor(s0.id);
    /* ピンの高さを変えるとポチも動くか */
    setPinAlt(s0.id, 80);
    const alt2=dots3d[s0.id].outerCoordinates[0].altitude;
    return {n:Object.keys(dots3d).length, appended:appended.length,
      pts:g0.outerCoordinates.length,
      fillDone:g0.fillColor, fillWork:dots3d[s1.id].fillColor,
      stroke:g0.strokeColor, sw:g0.strokeWidth, mode:g0.altitudeMode,
      r200:+r200.toFixed(1), r600:+r600.toFixed(1), r5000:+r5000.toFixed(1),
      px200:+px200.toFixed(1), px5000:+px5000.toFixed(1),
      pxTilt:+pxTilt.toFixed(1), pxTilt2:+pxTilt2.toFixed(1),
      alt, pinAlt, alt2,
      round:(()=>{  /* 円かどうか＝中心からの距離がどれも同じ */
        const c=g0.outerCoordinates, la=s0.lat, ln=s0.lng;
        const ds=c.map(q=>Math.hypot((q.lat-la)*111320,(q.lng-ln)*111320*Math.cos(la*Math.PI/180)));
        return +(Math.max(...ds)-Math.min(...ds)).toFixed(2);
      })()};
  });
  console.log(JSON.stringify(g,null,1));
  ok('現場ごとにポチができる', g.n>=2 && g.appended>=2, g.n+'個');
  ok('形は丸（19点・中心から等距離）', g.pts===19 && g.round<0.05, g.pts+'点／ばらつき'+g.round+'m');
  ok('色は2Dと同じ状態色（完成済=緑・施工中=橙）',
     g.fillDone!==g.fillWork && /^#/.test(g.fillDone), g.fillDone+' / '+g.fillWork);
  ok('白フチ付き（2Dのポチと同じ作り）', g.stroke==='#ffffff' && g.sw===2, g.stroke+' '+g.sw+'px');
  ok('★ピンと同じ高さに置く（建物の陰に隠れない）',
     g.mode==='RELATIVE_TO_GROUND' && g.alt===g.pinAlt, g.mode+' / '+g.alt+'m（ピン'+g.pinAlt+'m）');
  ok('ピンの高さを変えるとポチも動く', g.alt2===80, g.alt2+'m');
  /* ★2026-08-15t 上限（2.5m）に当たるまでは、寄るほど小さくなる。
     当たったあとは同じ（＝それ以上大きくしない）のが正しい。 */
  ok('寄ると小さくなる／上限より大きくならない',
     g.r200<g.r600 && g.r5000<=2.5 && g.r200>=0.8,
     g.r200+' → '+g.r600+' → '+g.r5000+'m');
  /* ★2026-08-15q いちばん大事なところ：**どの視点でも画面の上では同じ大きさ**
     （2Dのポチと同じ直径10px）。傾き（tilt）が大きいと range が同じでも
     地面の見え方が何倍も変わるので、range で決めると必ず破綻する（実際に破綻した）。 */
  ok('近い寄りでは画面10px前後（2Dのポチと同じ見え方）',
     Math.abs(g.px200-10)<1.5, '寄り:'+g.px200+'px');
  /* ★★2026-08-15t いちばん大事なところ：**地面での大きさに上限がある**。
     カメラの数値から出す縮尺は実機で11倍ずれていた（写真の実測で確認）。
     ずれても「直径5m（車1台ぶん）」を超えないので、建物を覆うことは起こらない。 */
  const cap=await p.evaluate(()=>{
    const out={};
    /* ①実機で起きていた場面（こちらの計算が11倍ずれた状態） */
    map3d.clientHeight=870; map3d.range=2140; map3d.tilt=65;
    out.warui={mpp:+nnMeterPerPx().toFixed(2), r:+nnDotRadius().toFixed(2)};
    /* ②うんと引いた画 */
    map3d.range=50000; out.hiki=+nnDotRadius().toFixed(2);
    /* ③うんと寄った画 */
    map3d.range=40;    out.yori=+nnDotRadius().toFixed(2);
    /* ④縮尺がまったく測れないとき */
    const keep=map3d.range; map3d.range=0; out.fumei=+nnDotRadius().toFixed(2); map3d.range=keep;
    return out;
  });
  console.log('大きさの頭打ち', JSON.stringify(cap));
  ok('★計算が11倍ずれても半径2.5m（直径5m）を超えない',
     cap.warui.r<=2.5, '1px='+cap.warui.mpp+'m と誤っても 半径'+cap.warui.r+'m');
  ok('うんと引いても・寄っても 0.8〜2.5mの間に収まる',
     cap.hiki<=2.5 && cap.yori>=0.8 && cap.fumei>=0.8 && cap.fumei<=2.5,
     '引き'+cap.hiki+'m／寄り'+cap.yori+'m／不明'+cap.fumei+'m');

  /* しずく型のピンの絵を出していないか＝透明かつ極小、白い棒（extruded）も出さない */
  const pin=await p.evaluate(()=>{
    const src=document.documentElement.innerHTML;
    return {透明:/background:"rgba\(0,0,0,0\)"/.test(src),
      極小:/scale:0\.01/.test(src),
      棒あり:/extruded:true/.test(src)};
  });
  ok('しずく型のピンの絵は出さない（透明かつ極小）', pin.透明 && pin.極小, JSON.stringify(pin));
  /* ★2026-08-15p 地上から伸びる線は「どの建物か」を示すので戻した（本人の指摘） */
  ok('地上から伸びる線（extruded）は出す', pin.棒あり, String(pin.棒あり));
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log(R.join('\n'));
  await b.close();
})();
