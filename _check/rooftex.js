/* ★2026-09-02a 屋根（防水層）の質感を本物にした（§255）の検証
   ・3Dタブを開くまで読まない（ページを開く速さは今までどおり）
   ・仕様・現況ごとに正しい質感を選ぶ（改修後＝新品／既存＝劣化・押えコン ほか）
   ・1タイル＝8m。色は白（掛け算で沈ませない）
   ・「広い模様」（汚れ・水たまり・パッチ／40m）が重なって、タイルのくり返しが見えない
   ・読めなかったとき（圏外・置いていない）は今までの手描きの質感のまま
   ・数量・見積は1円も変わらない（見た目だけ）
   使い方: node _check/rooftex.js       ／ 変更前と比べる: node _check/rooftex.js <ファイル名> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));

/* 屋根を1枚だけかく。sp＝仕様／gk＝現況／kz＝既存防水の種類 */
const scene=(sp,gk,kz)=>{
  state.scaleM=1; state.specCode=sp; state.kizon=kz||'fumei';
  state.polys=[{name:'屋根①', lv:0, genkyo:gk||'new',
    pts:[{x:0,y:0},{x:40,y:0},{x:40,y:30},{x:0,y:30}],
    edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
  state.active=0; saveState(); renderPolyList(); recalc(); draw(); setTab('d3');
};
const open=async(b,opt)=>{
  const p=await b.newPage({viewport:{width:1000,height:700}});
  p.__err=[]; p.on('pageerror',e=>p.__err.push(e.message));
  p.__tex=[]; p.on('request',r=>{ if(/textures\/roof_/.test(r.url())) p.__tex.push(r.url()); });
  if(opt&&opt.blockAll)   await p.route(/textures\/roof_/, r=>r.abort());
  if(opt&&opt.blockMacro) await p.route(/roof_macro/,      r=>r.abort());
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  return p;
};
const to3d=async(p)=>{
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.renderer;}catch(_){return false;}},null,{timeout:25000});
  await p.waitForTimeout(5000);
};
const shot=async(p)=>{
  await p.evaluate(()=>{ try{nnRoofFold(true);}catch(_){}
    document.querySelectorAll('#toolbar,#d3pad,#hint,#nnRoofTbl,#nnRoofOpen,nav,header,#d3edit').forEach(e=>e.remove());
    T.phi=0.5; T.theta=1.2; T.sig=''; T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(2500);
  return p.screenshot({clip:{x:250,y:180,width:500,height:380}});
};
/* いま屋根の面に貼られている質感の名前 */
const usedName=(p)=>p.evaluate(()=>{
  let s=null; T.group.traverse(o=>{ const m=o.material;
    if(s||!m||!m.userData||!m.userData._nnMacro||!m.map)return;
    const im=m.map.image, u=(im&&(im.currentSrc||im.src))||'';
    const g=/roof_([a-z_]+)_c\.jpg/.exec(u); if(g) s=g[1]; });
  return s;
});

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

/* ---- ① 図面をかいた時点では読まない ---- */
let p=await open(b);
await p.evaluate(()=>{ state.scaleM=1;
  state.polys=[{name:'r',lv:0,pts:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],
    edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
  state.active=0; saveState(); renderPolyList(); recalc(); draw(); });
await p.waitForTimeout(800);
ok('①図面をかいた時点では質感を読まない', p.__tex.length===0, p.__tex.length+'件');

/* ---- ② 3Dタブで読む・版名が付く・1タイル8m・色は白 ---- */
await p.evaluate(()=>setTab('d3')); await to3d(p);
ok('3Dタブを開いたら読む（色・凸凹・つや＋広い模様）', p.__tex.length>=4,
   p.__tex.map(u=>u.split('/').pop().split('?')[0]).join(','));
ok('★差し替えても古い絵が使われないよう版名が付く（§66）',
   p.__tex.every(u=>/\?v=/.test(u)));
ok('「広い模様」（汚れ・水たまり・パッチ）も読む', p.__tex.some(u=>/roof_macro/.test(u)));
const m=await p.evaluate(()=>{
  let h=null; T.group.traverse(o=>{ const t=o.material;
    if(h||!t||!t.userData||!t.userData._nnMacro||!t.map)return;
    h={rep:+t.map.repeat.x.toFixed(5), col:t.color?t.color.getHex():null,
       nrm:!!t.normalMap, bump:!!t.bumpMap, rgh:!!t.roughnessMap, rv:t.roughness,
       srgb:t.map.colorSpace===THREE.SRGBColorSpace, wrap:t.map.wrapS===THREE.RepeatWrapping}; });
  return {h, per:(typeof NN_TEX_PER_M!=='undefined')?NN_TEX_PER_M:null};
});
ok('屋根の面に質感が貼られている', !!m.h);
if(m.h){
  const tile=1/(m.per*m.h.rep);
  ok('1タイル＝8m（作った側と同じ）', Math.abs(tile-8)<0.01, tile.toFixed(2)+'m');
  ok('★色は白（掛け算で沈ませない・§227）', m.h.col===0xffffff, '#'+(m.h.col||0).toString(16));
  ok('凸凹は法線マップに任せ、古い bumpMap は外す', m.h.nrm===true&&m.h.bump===false);
  ok('つやの絵が付き、掛け算の元は 1.0（§225f）', m.h.rgh===true&&Math.abs(m.h.rv-1)<1e-6, m.h.rv);
  ok('色は sRGB／くり返して貼れる', m.h.srgb===true&&m.h.wrap===true);
}
const errA=p.__err.slice(); await p.close();

/* ---- ③ 仕様・現況ごとに正しい質感を選ぶ ---- */
const want=[['AS-T1','new',   null,       'as_new', '改修後の砂付シート'],
            ['X-2',  'new',   null,       'coat',   '改修後のウレタン塗膜'],
            ['S-M2', 'new',   null,       'vinyl',  '改修後の塩ビシート'],
            ['AS-T1','exist', 'as_roshutsu','as_aged','既存＝露出アス（劣化）'],
            ['AS-T1','exist', 'osae',     'osae',   '既存＝押えコンクリート'],
            ['AS-T1','exist', 'enbi_setchaku','vinyl',  '既存＝塩ビシート']];
for(const [sp,gk,kz,exp,label] of want){
  const q=await open(b);
  await q.evaluate(scene,{}).catch(()=>{});
  await q.evaluate(([a,c,d])=>{
    state.scaleM=1; state.specCode=a; state.kizon=d||'fumei';
    state.polys=[{name:'屋根①', lv:0, genkyo:c,
      pts:[{x:0,y:0},{x:40,y:0},{x:40,y:30},{x:0,y:30}],
      edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; saveState(); renderPolyList(); recalc(); draw(); setTab('d3');
  },[sp,gk,kz]);
  await to3d(q);
  const got=await usedName(q);
  ok(label+' → '+exp, got===exp, got||'なし');
  await q.close();
}

/* ---- ④ 広い模様で見た目が変わる（タイルのくり返し対策が効いている） ---- */
const A=await open(b);
await A.evaluate(scene2=>{ state.scaleM=1; state.specCode='AS-T1'; state.kizon='as_roshutsu';
  state.polys=[{name:'r',lv:0,genkyo:'exist',pts:[{x:0,y:0},{x:40,y:0},{x:40,y:30},{x:0,y:30}],
    edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
  state.active=0; saveState(); renderPolyList(); recalc(); draw(); setTab('d3'); });
await to3d(A);
const imgA=await shot(A);
/* ★カメラは「質感を貼り直しても動かない」ことを見る（撮るために自分で動かした後に控える） */
const camA=await A.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz].map(v=>+v.toFixed(4)));
await A.evaluate(()=>{ dirty3d=true; build3D(); });
await A.waitForTimeout(1200);
const camA2=await A.evaluate(()=>[T.theta,T.phi,T.r,T.tx,T.tz].map(v=>+v.toFixed(4)));
const qtyA=await A.evaluate(()=>{ const d=nnEstimateData(); return Math.round(d.rows.reduce((s,r)=>s+(+r.amt||0),0)); });
await A.close();

const B=await open(b,{blockMacro:true});
await B.evaluate(()=>{ state.scaleM=1; state.specCode='AS-T1'; state.kizon='as_roshutsu';
  state.polys=[{name:'r',lv:0,genkyo:'exist',pts:[{x:0,y:0},{x:40,y:0},{x:40,y:30},{x:0,y:30}],
    edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
  state.active=0; saveState(); renderPolyList(); recalc(); draw(); setTab('d3'); });
await to3d(B); const imgB=await shot(B);
const qtyB=await B.evaluate(()=>{ const d=nnEstimateData(); return Math.round(d.rows.reduce((s,r)=>s+(+r.amt||0),0)); });
await B.close();
ok('★広い模様があると見た目が変わる（くり返しが見えなくなる）', Buffer.compare(imgA,imgB)!==0);
ok('★組み立て直してもカメラは動かない（§152）', JSON.stringify(camA)===JSON.stringify(camA2));
ok('★数量・見積は1円も変わらない（見た目だけ）', qtyA===qtyB, qtyA+' / '+qtyB);

/* ---- ⑤ 読めないとき（圏外・置いていない）は今までの手描きのまま ---- */
const C=await open(b,{blockAll:true});
await C.evaluate(()=>{ state.scaleM=1; state.specCode='AS-T1';
  state.polys=[{name:'r',lv:0,pts:[{x:0,y:0},{x:40,y:0},{x:40,y:30},{x:0,y:30}],
    edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
  state.active=0; saveState(); renderPolyList(); recalc(); draw(); setTab('d3'); });
await to3d(C);
ok('読めなかったら「だめだった」の印が立つ', (await C.evaluate(()=>nnRoofTexState('as_new')))===3);
const keep=await C.evaluate(()=>{ let n=0; T.group.traverse(o=>{
  if(o.material&&o.material.map&&o.material.bumpMap)n++; }); return n; });
ok('今までの手描きの質感のまま（絵は消えない）', keep>0, keep+'個');
ok('JSエラーなし（読めないとき）', C.__err.length===0, C.__err.slice(0,2).join(' / '));
await C.close();
ok('JSエラーなし（ふつうのとき）', errA.length===0, errA.slice(0,2).join(' / '));

/* ---- ⑥ 施工後（新品）の防水層は「きれい」＝大きなムラ・汚れが無い（§287b・本人の指摘） ---- */
/*  ★近寄ったときの粒（mm）は残す。見るのは「大きなムラ」なので、
      32×32 まで縮めてから ばらつきと いちばん暗い所 を測る（縮めると粒は平均されて消える） */
const {execFileSync}=require('child_process');
function coarse(f){
  const py="from PIL import Image;import numpy as np;"+
    "a=np.asarray(Image.open('"+f+"').convert('L').resize((32,32),Image.BOX)).astype(float);"+
    "print(round(float(a.std()),2),round(float(a.mean()),1),round(float(a.min()),1))";
  return execFileSync('python3',['-c',py],{cwd:__dirname+'/..'}).toString().trim().split(' ').map(Number);
}
try{
  const nw=coarse('textures/roof_as_new_c.jpg'), ag=coarse('textures/roof_as_aged_c.jpg');
  ok('施工後（as_new）は大きなムラが小さい（ばらつき3以下）', nw[0]<=3.0, 'std='+nw[0]);
  ok('施工後（as_new）に暗い汚れのたまりが無い（平均の8割より明るい）', nw[2]>=nw[1]*0.80, 'min='+nw[2]+' / mean='+nw[1]);
  ok('施工後は既存防水よりはっきり明るい', nw[1]>ag[1]+30, nw[1]+' / '+ag[1]);
  const vi=coarse('textures/roof_vinyl_c.jpg'), co=coarse('textures/roof_coat_c.jpg');
  ok('塩ビ（新品）も大きなムラが小さい', vi[0]<=3.0, 'std='+vi[0]);
  ok('ウレタン（新品）も大きなムラが小さい', co[0]<=3.0, 'std='+co[0]);
}catch(e){ ok('質感の絵を測れた（PIL）', false, String(e).slice(0,60)); }
/* 広い模様（汚れ・水たまり）の強さ：新品は水たまりを出さない */
const AM=await (async()=>{ const q=await open(b,{}); await q.evaluate(()=>{ state.specCode='AS-T1';
    state.polys=[{name:'r',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}],
      edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}]; state.active=0; saveState(); draw(); });
  const src=await q.evaluate(()=>document.getElementById('nn-rooftex-js').textContent);
  await q.close(); return src; })();
const mA=/var AMT=\{([\s\S]*?)\};/.exec(AM);
ok('新品（as_new・vinyl・coat）の水たまりは0', !!mA && /as_new:\[[^\]]*,0(\.0+)?,/.test(mA[1])
   && /vinyl:\[[^\]]*,0(\.0+)?,/.test(mA[1]) && /coat:\[[^\]]*,0(\.0+)?,/.test(mA[1]),
   mA?mA[1].replace(/\s+/g,' ').slice(0,90):'-');

console.log(R.join('\n'));
console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
await b.close();
process.exit(R.some(x=>x[0]==='★')?1:0);
})();
