/* ★2026-08-15 3Dの3件（本人の指摘）
   ① 外壁側の出隅の「なぞのはみ出しアス」を削除
   ② 出隅（縦の角）の「謎の面取り」を削除
   ③ 天端の面取りが砂付仕上げ（模様つき）になる
   使い方: node chamchk.js                （いまの版）
           node chamchk.js _before.html   （直す前と比べる） */
try{ require('./mkbefore')(); }catch(_){}   /* ★変更前のファイル _before.html を必ず自分で用意する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE=process.argv[2]||'zumen_sekisan.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:EXE, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1400,height:900}});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+PAGE,{waitUntil:'load'});
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{
    state.polys=[{lv:0, name:'検証用',
      pts:[{x:0,y:0},{x:20,y:0},{x:20,y:14},{x:0,y:14}],
      edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; sel=null; saveState(); renderPolyList(); draw(); setTab('d3');
  });
  await p.waitForTimeout(4000);

  const g=await p.evaluate(()=>{
    const s=state.scaleM, TH=0.25, HH=0.30, TOP=HH+0.012;
    const corners=[[0,0],[20*s,0],[20*s,14*s],[0,14*s]];
    const out={beadsNearCorner:0, texNoUv:0, texWithUv:0, cornerGap:9, meshes:0,
               slopeMeshes:0, slopeUv:0, beads:0};
    const V=new THREE.Vector3();
    T.group.traverse(o=>{
      if(!o.isMesh)return; out.meshes++;
      const m=o.material, gm=o.geometry, hex=m.color?m.color.getHex():0;
      const isBead=(hex===0x14120f);
      if(isBead) out.beads++;
      /* ① 角の天端に置いた継目（L字の2本）が残っていないか */
      if(isBead && Math.abs(o.position.y-TOP)<0.006){
        corners.forEach(c=>{
          if(Math.hypot(o.position.x-c[0], o.position.z-c[1])<0.15) out.beadsNearCorner++;
        });
      }
      /* ③ 模様（砂の粒）を持つ材料なのに、貼り付ける座標(uv)が無い面 */
      if(m.map){ if(gm.attributes && gm.attributes.uv) out.texWithUv++; else out.texNoUv++; }
      /* ② 壁の外側が角までちゃんと届いているか（面取りがあると手前で止まる） */
      const pos=gm.attributes && gm.attributes.position;
      if(pos && !isBead){
        for(let i=0;i<pos.count;i++){
          V.fromBufferAttribute(pos,i); o.localToWorld(V);
          /* パラペットの高さの範囲だけ見る（スラブや平場は角に届いていて当たり前） */
          if(V.y<0.05 || V.y>HH-0.01) continue;
          corners.forEach(c=>{
            const d=Math.hypot(V.x-c[0], V.z-c[1]);
            if(d<out.cornerGap) out.cornerGap=d;
          });
        }
      }
    });
    /* 面取りの斜面＝三角2枚(6頂点)の板。uv を持っているか */
    T.group.traverse(o=>{
      if(!o.isMesh)return;
      const pos=o.geometry.attributes && o.geometry.attributes.position;
      if(pos && pos.count===6 && !o.geometry.index){
        out.slopeMeshes++;
        if(o.geometry.attributes.uv) out.slopeUv++;
      }
    });
    return out;
  });
  console.log(PAGE, JSON.stringify(g));
  ok('① 出隅の天端に「なぞのはみ出しアス」が無い', g.beadsNearCorner===0, g.beadsNearCorner+'本');
  ok('② 出隅の縦の面取りが無い（壁が角まで届く）', g.cornerGap<0.002, '角までの最短 '+g.cornerGap.toFixed(4)+'m');
  ok('③ 模様つきの材料で uv が無い面が0', g.texNoUv===0, g.texNoUv+'枚（uvあり '+g.texWithUv+'枚）');
  ok('③ 面取りの斜面すべてに uv がある', g.slopeMeshes>0 && g.slopeUv===g.slopeMeshes,
     g.slopeUv+' / '+g.slopeMeshes+'枚');
  ok('継目（はみ出しアス）自体は残っている', g.beads>50, g.beads+'本');
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log(R.join('\n'));
  await b.close();
})();
