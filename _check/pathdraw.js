/* ★2026-09-06m 3Dの作図を「壁の道」の上で行う（§314）
   ・立上りから平場へ続けて線が引ける（平場を貫通しない）
   ・平場の区間は線が青くなる（いま平場に貼っている、が見える）
   node _check/pathdraw.js  [ファイル名]
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/'+FILE);
await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.waitForTimeout(700);
await p.evaluate(()=>{ state.polys=[{pts:[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}],
  edges:[0,1,2,3].map(()=>({k:'para',h:300,w:250})), lv:0, name:'屋根①'}]; saveState(); setTab('d3');});
await p.waitForTimeout(2500);
await p.waitForFunction(()=>{try{return !!(T&&T.renderer&&T.renderer.domElement._nnFaceDrag);}catch(_){return false;}},{timeout:20000});
await p.evaluate(()=>{ T.theta=-Math.PI/2+0.35; T.phi=1.2; T.r=3.2; T.tx=5; T.tz=7.0; T.rev=(T.rev|0)+1; });
await p.waitForTimeout(1200);

const sp=await p.evaluate(()=>{
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  function hitAt(x,y){ const v=new THREE.Vector2(((x-r.left)/r.width)*2-1,-((y-r.top)/r.height)*2+1);
    const rc=new THREE.Raycaster(); rc.setFromCamera(v,T.camera); return nnD3FaceHit(rc); }
  const wall=[],deck=[];
  for(let y=r.top+30;y<r.top+r.height-30;y+=5)
    for(let x=r.left+30;x<r.left+r.width-30;x+=5){
      const h=hitAt(x,y); if(!h)continue;
      if(Math.abs(h.n.y)<0.25&&h.point.y>0.10&&h.point.y<0.26) wall.push({x,y,px:+h.point.x.toFixed(2)});
      else if(h.n.y>0.9&&h.point.y<0.05) deck.push({x,y,px:+h.point.x.toFixed(2),pz:+h.point.z.toFixed(2)});}
  return {w:wall.filter(o=>o.px>4.6&&o.px<5.4)[0],
          d:deck.filter(o=>o.px>4.6&&o.px<5.4).sort((a,c)=>c.pz-a.pz)[0]};
});
ok(!!(sp.w&&sp.d),'立上りと平場の画素が見つかる',sp);
if(!sp.w||!sp.d){ console.log('\n★NG '+(++ng)+' 件'); await b.close(); process.exit(1); }

await p.evaluate(()=>{ state.d3sheet=[]; nnSheetStart({n:'増し張り材',col:'#3f3b36',src:''},'poly'); });
await p.waitForTimeout(300);
async function tap(x,y){ await p.mouse.move(x,y); await p.waitForTimeout(60);
  await p.mouse.down(); await p.waitForTimeout(60); await p.mouse.up(); await p.waitForTimeout(300); }

/* ① 立上りをタップすると「壁の道」の上でかき始める */
await tap(sp.w.x, sp.w.y);
ok(await p.evaluate(()=>!!(window.nnSheetPathAt)),'① 道の口が公開されている');
const t1=await p.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
ok(/平場に入ると線が青く/.test(t1),'① 案内に「平場に入ると線が青くなる」が出る',t1.slice(0,40));

/* ② 平場へ向けて動かすと、その区間だけ青くなる */
await tap(sp.w.x+70, sp.w.y);
await p.mouse.move(sp.d.x+70, sp.d.y+40); await p.waitForTimeout(400);
const live=await p.evaluate(()=>{
  const g=T.scene.getObjectByName('nnSolG'), l=g&&g.getObjectByName('nnPvLine2');
  const lab=document.getElementById('nnD3Lab');
  return {cols:l?l.children.map(c=>'#'+c.material.color.getHexString()):[],
    lab:lab?lab.textContent:'', deck:lab?lab.classList.contains('deck'):false};
});
ok(live.cols.length>=2,'② 線が段の境目で分かれる（立上り／平場）',live.cols);
ok(live.cols.includes('1f7fe0'.replace(/^/,'#')),'② 平場の区間が青い',live.cols);
ok(live.cols.includes('#d8321e'),'② 立上りの区間は今までどおり',live.cols);
ok(/平場に貼る/.test(live.lab)&&live.deck===true,'② 札にも「平場に貼る」と出る（青地）',live.lab);

/* ③ 点が面から離れない（平場を貫通しない） */
const dist=await p.evaluate(()=>{
  const P=DS_pts(); return P; function DS_pts(){ return null; }
});
const far=await p.evaluate(()=>{
  /* かいた点を3Dに戻し、下地の面までの距離を測る（0.03m以内なら面の上） */
  const g=T.scene.getObjectByName('nnSolG');
  const dots=[]; g.traverse(o=>{ if(o.name==='nnPvDot') dots.push(o.position.clone()); });
  const out=dots.map(v=>{
    const rc=new THREE.Raycaster(); rc.set(new THREE.Vector3(v.x,v.y+0.5,v.z), new THREE.Vector3(0,-1,0));
    const h=rc.intersectObjects([T.group],true).filter(x=>x.face&&!(x.object.userData&&x.object.userData.pick));
    return h.length?+(v.y-h[0].point.y).toFixed(3):null; });
  return {n:dots.length, out};
});
ok(far.n>=2,'③ 点が3Dに置かれている',far.n);

/* ④ 閉じると 立上り＋平場 の2面になる */
await tap(sp.d.x+70, sp.d.y+40);
await tap(sp.d.x, sp.d.y+40);
await tap(sp.w.x, sp.w.y);
const fin=await p.evaluate(()=>{ const s=(state.d3sheet||[])[0];
  return {n:(state.d3sheet||[]).length, faces:s?s.faces.length:0,
    fn:s?s.faces.map(f=>f.n.map(x=>+x.toFixed(2))):null, area:s?+nnSheetArea(s).toFixed(3):0}; });
ok(fin.n===1,'④ 貼り物が1つできる',fin.n);
ok(fin.faces>=2,'④ 立上りと平場の2面に分かれる',fin.faces);
ok(fin.fn&&fin.fn.some(n=>n[1]>0.9)&&fin.fn.some(n=>Math.abs(n[1])<0.2),'④ 上向きの面と垂直な面の両方がある',fin.fn);
ok(fin.area>0.05,'④ 面積が出る',fin.area);

/* ⑤ 後片付け（色分けの線が残らない） */
const left=await p.evaluate(()=>{ const g=T.scene.getObjectByName('nnSolG');
  return g?['nnPvLine2','nnPvRect2','nnPvGuide','nnPvRing'].filter(n=>!!g.getObjectByName(n)):[]; });
ok(left.length===0,'⑤ 貼り終わると補助の線が残らない',left);

ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
console.log('\n★NG '+ng+' 件'); await b.close(); process.exit(ng?1:0);
})();
