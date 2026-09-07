/* 貼り物（防水層）が平場でも見える／Shift＝壁に平行・直角（90度）（§316）
   本人の指摘「立上りには置けるが平場には貼りかけられない」「遠いカメラだと見えたり見えなかったり」
   「Shiftを押しながら線をひくとき、必ず90度ずつ」。
   使い方: node _check/sheetvis.js  ／ node _check/sheetvis.js _before.html（直す前と比べる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(700);
await p.evaluate(()=>{ state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})),lv:0,name:'屋根①'}]; state.scaleM=1; saveState(); setTab('d3'); });
await p.waitForTimeout(2500);
await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
const scr=async(x,y,z)=>await p.evaluate(([x,y,z])=>{ T.renderer.render(T.scene,T.camera); const v=new THREE.Vector3(x,y,z).project(T.camera); const el=T.renderer.domElement,r=el.getBoundingClientRect(); return {x:r.left+(v.x+1)/2*r.width, y:r.top+(1-v.y)/2*r.height}; },[x,y,z]);
const cam=async(far)=>{ await p.evaluate((far)=>{ T.theta=Math.PI/2+0.35; T.phi=0.95; T.r=far?26:7; T.tx=far?8:6; T.tz=far?4:1.2; T.voX=0;T.voY=0; T.rev=(T.rev|0)+1;
  window.nnSheetMode={mat:{n:'ポリマリット',col:'#3f3b36',src:'t'},kind:'poly',w:400,d:200,t:4}; state.d3sheet=[]; setTool('draw'); },far);
  /* ★カメラの位置は描画ループが T.theta 等から毎コマ入れる。render() だけでは動かないので、
     位置が T.* どおりになるまで条件で待つ（時間で待つと、環境が重いとき古い位置で投影して天端を叩く） */
  await p.waitForFunction(()=>{ const ez=T.tz+T.r*Math.sin(T.phi)*Math.sin(T.theta), ex=T.tx+T.r*Math.sin(T.phi)*Math.cos(T.theta);
    return Math.abs(T.camera.position.z-ez)<0.05 && Math.abs(T.camera.position.x-ex)<0.05; },{timeout:10000}); await p.waitForTimeout(250); };
const clicks=async(P)=>{ for(const q of P){ const s=await scr(...q); await p.mouse.click(s.x,s.y); await p.waitForTimeout(200); } const s0=await scr(...P[0]); await p.mouse.click(s0.x,s0.y); await p.waitForTimeout(600); };
/* 画面の画素を読む（描き直した直後に readPixels・§183） */
const px=async(pts)=>await p.evaluate((pts)=>{ T.renderer.render(T.scene,T.camera); const gl=T.renderer.getContext(), el=T.renderer.domElement;
  return pts.map(a=>{ const v=new THREE.Vector3(...a).project(T.camera); const x=Math.round((v.x+1)/2*el.width), y=Math.round((v.y+1)/2*el.height);
    const d=new Uint8Array(4); gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,d); return [d[0],d[1],d[2]]; }); },pts);
/* ── ① 壁→平場に貼った層が、平場の上でも見える（近い・遠い） ── */
for(const far of [false,true]){
  await cam(far);
  await clicks([[4,0.12,0.256],[9,0.12,0.256],[9,0.012,2.5],[4,0.012,2.5]]);   /* 壁の点は立上りの中ほど（上端ぎわは天端に当たりやすい） */
  const st=await p.evaluate(()=>({n:(state.d3sheet||[]).length, kinds:(state.d3sheet[0]||{faces:[]}).faces.map(f=>f.n[1]>0.9?'deck':'wall')}));
  ok(st.n===1 && st.kinds.includes('deck') && st.kinds.includes('wall'), '① '+(far?'遠い':'近い')+'カメラ：壁→平場の層が2面（壁＋平場）に巻けている', st);
  const c=await px([[6.5,0.02,1.5],[6.5,0.02,2.0],[5,0.02,1.0]]);
  const dark=c.every(v=>v[0]<110 && Math.abs(v[0]-v[1])<12);
  ok(dark, '① '+(far?'遠い':'近い')+'カメラ：平場の上の層が画面に見えている（暗い色＝層。明るい＝防水面が上に描かれて隠れている）', c);
}
const off=await p.evaluate(()=>{ let n=0; T.scene.traverse(o=>{ if(o.material&&o.material.polygonOffset&&o.material.polygonOffsetFactor<=-8) n++; }); return n; });
ok(off>0, '① 層の材質は深さの計算で必ず手前に勝つ（polygonOffset）', off);
/* ── ② Shift＝壁に平行・直角。平場から始めた道でも 0°／90° ── */
await cam(false);
const s1=await scr(5,0.012,2.0); await p.mouse.click(s1.x,s1.y); await p.waitForTimeout(200);
await p.keyboard.down('Shift');
const s2=await scr(8.3,0.012,1.55); await p.mouse.move(s2.x,s2.y); await p.waitForTimeout(150); await p.mouse.click(s2.x,s2.y); await p.waitForTimeout(200);
const s3=await scr(8.1,0.15,0.256); await p.mouse.move(s3.x,s3.y); await p.waitForTimeout(150); await p.mouse.click(s3.x,s3.y); await p.waitForTimeout(200);
await p.keyboard.up('Shift');
const d=await p.evaluate(()=>nnD3DrawDbg()); const P=d.pts; const ang=(a,b)=>Math.round(Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI);
ok(P.length===3 && ang(P[0],P[1])===0 && Math.abs(ang(P[1],P[2]))===90, '② 平場から始めても Shift で 0°→90° に止まる（狙いは斜めでも）', {pts:P.map(q=>q.map(v=>+v.toFixed(2))), a1:ang(P[0],P[1]), a2:ang(P[1],P[2])});
ok(d.kind==='wall', '② 3点目は立上りの面に乗っている（平場→壁へ連続）', d.kind);
/* ③ 壁から始めても同じ */
await p.evaluate(()=>{ try{ nnD3DrawCancel&&nnD3DrawCancel(); }catch(_){} state.d3sheet=[]; setTool('draw'); }); await p.waitForTimeout(200);
const w1=await scr(5,0.15,0.256); await p.mouse.click(w1.x,w1.y); await p.waitForTimeout(200);
await p.keyboard.down('Shift'); const w2=await scr(9.3,0.12,0.256); await p.mouse.move(w2.x,w2.y); await p.waitForTimeout(150); await p.mouse.click(w2.x,w2.y); await p.keyboard.up('Shift'); await p.waitForTimeout(200);
const d2=await p.evaluate(()=>nnD3DrawDbg());
ok(d2.pts.length===2 && Math.abs(d2.pts[0][1]-d2.pts[1][1])<1e-6, '③ 壁から始めて Shift＝壁に平行（同じ高さ）', d2.pts.map(q=>q.map(v=>+v.toFixed(2))));
ok(errs.length===0, 'JSエラーなし', errs);
await b.close(); console.log((ng?'★NG':'○')+' '+ng+'件'); process.exit(ng?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
