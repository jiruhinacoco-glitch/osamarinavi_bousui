/* step3d.js ― 仕様・材料（shiyo_toroku.html）の「工程イラスト（3D）」。
   差し込み口：window.NN_STEP3D(el, sp, i)（§632）。el＝#st3d、sp＝仕様、i＝工程の番号（0始まり・-1は全体＝完成形）。
   描けたら true、その仕様の3Dが無ければ false（ページ側が今までの絵を出す）。
   いまあるのは A-1（屋根保護防水密着工法・9工程）だけ。
   ・質感は図面・積算の3D（zumen_sekisan.html）と同じ作り：コンクリートは写真（textures/concrete_*.jpg・1タイル＝2m×1m）、
     影は PCFSoft、画素の密度は端末の倍率×ページの zoom（上限2）。写真が読めなければ手描きの粒のまま（壊れない）。
   ・溶融アスファルトは a1_model.js の材質（流れ模様＋クリアコート）。端は 1cm ごとに点を打ったなめらかな波＋丸い縁（§638）。
   ・層の積み上げは「いまの表面」（断面の折れ線）を持ち、層をのせるたびにその範囲だけ厚さぶん外へ押し出す（§639）。
     次の層はいつも前の層の表面の上に乗るので、**隙間が構造的にできない**（前は固定 39mm ずつ上げていて、立上りと手前の端が空いていた）。
   ・WebGL の入れ物（renderer）は1つだけ作って使い回す（仕様を切り替えても作り直さない＝iPhoneのコンテキスト上限を踏まない）。
   ・描くのは操作があったときだけ（毎フレーム描かない）。
   ・「大きく」で全画面の dialog に同じ絵を移す（閉じると元の枠に戻す）。
   ・大きさは el.clientWidth/Height（zoom をかける前の px）、画素の密度は getBoundingClientRect との比でかける（罠1・§61）。 */
(function(){
'use strict';
const MODELS={};               /* 仕様番号 → 工程ごとの形を作る関数 */
let V=null;                    /* 使い回す3Dの道具一式 */
let loading=null;
const TILE_W=2.0, TILE_H=1.0;  /* コンクリート写真の1タイル（textures/README.md） */

function loadThree(){
  if(window.THREE) return Promise.resolve();
  if(loading) return loading;
  loading=new Promise((ok,ng)=>{ const s=document.createElement('script'); s.src='./vendor/three.min.js';
    s.onload=ok; s.onerror=()=>{ s.remove(); loading=null; ng(new Error('3D部品を読み込めませんでした')); }; document.head.appendChild(s); });
  return loading;
}
function css(){
  if(document.getElementById('nn-step3d-css')) return;
  const st=document.createElement('style'); st.id='nn-step3d-css';
  st.textContent=`
.s3root{position:absolute;inset:0;background:#8a6c49;overflow:hidden}
.s3root canvas{display:block;width:100%;height:100%;touch-action:none;outline:none}
.s3root .stlab{position:absolute;left:8px;top:8px;background:#1c6b3c;color:#fff;font-weight:900;font-size:14px;padding:3px 12px;border-radius:2px;z-index:2}
.s3root .s3nav{position:absolute;right:8px;top:8px;display:flex;gap:4px;z-index:2}
.s3root .s3nav button,.s3root .s3br button{width:30px;height:30px;min-height:0;padding:0;border:1px solid #6f7d6e;border-radius:2px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 0 #97a394;font:800 12px/1 'Zen Kaku Gothic New',sans-serif;color:#1e452c;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.s3root .s3nav button:hover,.s3root .s3br button:hover{background:#edf4e7}
.s3root .s3nav button.hold{background:#d9ead9;transform:translateY(1px);box-shadow:0 1px 0 #97a394}
.s3root .s3nav button img{width:22px;height:22px;display:block;pointer-events:none}
.s3root .s3br{position:absolute;right:8px;bottom:30px;display:flex;align-items:center;gap:8px;z-index:2}
.s3root .s3br .s3hint{font-size:10.5px;color:#fffffff0;text-shadow:0 1px 2px #000a;pointer-events:none}
.s3root .s3br button.s3exp{font-size:19px;line-height:1;font-weight:900}
.s3root .s3key{position:absolute;left:8px;bottom:30px;display:flex;gap:10px;background:#fffffff0;padding:3px 8px;font-size:11px;line-height:1.3;pointer-events:none;color:#26322c;z-index:2;border-left:3px solid #598065}
.s3root .s3key i{display:inline-block;width:13px;height:9px;background:#14181d;margin-right:4px;vertical-align:-1px;box-shadow:inset 0 2px 2px #5a6a80}
.s3root .s3key i.sheet{background:#3a332c;box-shadow:none}
.s3root .s3note{position:absolute;left:8px;top:40px;max-width:60%;background:#fff8dcf0;border-left:3px solid #e07800;color:#5d3a00;font-size:11px;font-weight:800;padding:3px 8px;z-index:2;pointer-events:none}
.s3root .s3note:empty{display:none}
dialog.s3big .s3root .s3note{left:14px;top:52px;font-size:13px}
.s3root .s3msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;text-shadow:0 1px 2px #0008;pointer-events:none;z-index:1}
dialog.s3big{position:fixed!important;inset:0!important;margin:0!important;padding:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;border:0!important;border-radius:0!important;overflow:hidden!important;background:#f4f4ef;color:#26322c;font:14px/1.45 'Zen Kaku Gothic New',sans-serif;box-shadow:none}
dialog.s3big[open]{display:grid!important;grid-template-rows:auto minmax(0,1fr)}
dialog.s3big::backdrop{background:#15291d}
dialog.s3big *{box-sizing:border-box}
dialog.s3big .s3head{display:flex;align-items:center;gap:10px;background:#285f3d;color:#fff;padding:8px 14px;min-height:50px}
dialog.s3big .s3head h2{font-size:18px;margin:0;line-height:1.2;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
dialog.s3big .s3head h2 small{font-size:12px;color:#d8e6d4;margin-left:10px;font-weight:700}
dialog.s3big .s3head button{font:inherit;font-weight:800;color:#1e452c;background:#fff;border:2px solid #173e29;border-radius:2px;min-height:38px;padding:4px 14px;cursor:pointer;box-shadow:0 3px #143920;white-space:nowrap}
dialog.s3big .s3head button:disabled{opacity:.45;cursor:default}
dialog.s3big .s3main{position:relative;min-height:0}
dialog.s3big .s3root .s3nav{right:14px;top:14px;flex-direction:column;gap:6px}
dialog.s3big .s3root .s3nav button{width:44px;height:44px}
dialog.s3big .s3root .s3nav button img{width:30px;height:30px}
dialog.s3big .s3root .s3br{right:14px;bottom:14px}
dialog.s3big .s3root .s3br button.s3exp{display:none}
dialog.s3big .s3root .s3br .s3hint{font-size:12px}
dialog.s3big .s3root .s3key{left:14px;bottom:14px;font-size:13px;padding:6px 12px}
dialog.s3big .s3root .s3key i{width:18px;height:11px}
dialog.s3big .s3root .stlab{left:14px!important;top:14px!important;font-size:16px!important;padding:4px 14px!important}
dialog.s3big .s3root .stbar{display:none!important}
html[data-nnphone="1"] dialog.s3big .s3root .s3nav button{width:40px;height:40px}
`;
  document.head.appendChild(st);
}

/* ---------- 空と地面（a1_model.js の「標準」と同じ：薄曇りの明るい屋外・地面は茶） ---------- */
const SKY={ zen:'#8fb3d6', mid:'#c9dbea', hor:'#eef2f5', haze:0.85, g0:'#9c7a52', g1:'#5f4a33',
  az:0.35, el:0.80, core:'#ffffff', glow:'rgba(255,255,255,.35)', cloud:0.30, ccol:'#ffffff',
  sun:1.9, scol:0xffffff, hemi:0.70, exp:0.96 };
function lcg(s){ let x=s>>>0; return ()=>{ x=(x*1664525+1013904223)>>>0; return x/4294967296; }; }
function skyCanvas(P,W,H){
  const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  let gr=g.createLinearGradient(0,0,0,H*0.5); gr.addColorStop(0,P.zen); gr.addColorStop(0.62,P.mid); gr.addColorStop(0.93,P.hor); gr.addColorStop(1,P.hor);
  g.fillStyle=gr; g.fillRect(0,0,W,H*0.5);
  gr=g.createLinearGradient(0,H*0.5,0,H); gr.addColorStop(0,P.g0); gr.addColorStop(1,P.g1); g.fillStyle=gr; g.fillRect(0,H*0.5,W,H*0.5);
  const hz=g.createLinearGradient(0,H*0.44,0,H*0.66); hz.addColorStop(0,'rgba(0,0,0,0)'); hz.addColorStop(0.28,P.hor); hz.addColorStop(0.5,P.hor); hz.addColorStop(1,'rgba(0,0,0,0)');
  g.globalAlpha=P.haze; g.fillStyle=hz; g.fillRect(0,H*0.44,W,H*0.22); g.globalAlpha=1;
  const r=lcg(7); try{ g.filter='blur(7px)'; }catch(_){ } g.fillStyle=P.ccol;
  for(let i=0;i<30;i++){ const cx=r()*W, cy=H*(0.04+r()*0.44), rx=W*(0.028+r()*0.075), ry=rx*(0.15+r()*0.13); g.globalAlpha=P.cloud*(0.30+r()*0.55);
    for(let k=-1;k<=1;k++){ g.beginPath(); g.ellipse(cx+k*W,cy,rx,ry,0,0,6.2832); g.fill(); } }
  g.globalAlpha=1; try{ g.filter='none'; }catch(_){ }
  const sx=P.az*W, sy=(0.5-P.el*0.5)*H, R=H*0.30, rg=g.createRadialGradient(sx,sy,0,sx,sy,R);
  rg.addColorStop(0,P.core); rg.addColorStop(0.05,P.core); rg.addColorStop(0.22,P.glow); rg.addColorStop(1,'rgba(255,255,255,0)');
  g.globalCompositeOperation='lighter'; g.fillStyle=rg; for(let k=-1;k<=1;k++){ g.beginPath(); g.arc(sx+k*W,sy,R,0,6.2832); g.fill(); }
  g.globalCompositeOperation='source-over'; return c;
}

/* ---------- 3Dの道具一式（1回だけ作る） ---------- */
function setup(){
  const T=window.THREE, phone=document.documentElement.dataset.nnphone==='1';
  const root=document.createElement('div'); root.className='s3root';
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false}); renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate=false;
  renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=SKY.exp;
  const canvas=renderer.domElement; canvas.setAttribute('aria-label','工程の3D。ドラッグで回転、ホイールで拡大。右上のボタンでも操作できます。'); root.appendChild(canvas);
  /* 右上の丸ボタン：図面・積算と同じ並び（左回り・右回り・起こす・倒す・真上・拡大・縮小・全体）。「大きく」は右下 */
  root.insertAdjacentHTML('beforeend',
    `<div class="stlab"></div>
     <div class="s3nav">${[['rl','左回り'],['rr','右回り'],['tup','起こす'],['tdn','倒す'],['plan','真上'],['zin','拡大'],['zout','縮小'],['iso','全体']]
       .map(([k,n])=>`<button type="button" data-nav="${k}" title="${n}${/^(rl|rr|tup|tdn|zin|zout)$/.test(k)?'（長押しで続けて動く）':''}" aria-label="${n}"><img src="./icons/btn_d3_${k}.png" alt=""></button>`).join('')}</div>
     <div class="s3br"><span class="s3hint">${phone?'指で回す／2本指で移動・拡大':'ドラッグ：回す　Shift＋ドラッグ：移動　ホイール：拡大'}</span><button type="button" class="s3exp" data-nav="big" title="大きく表示" aria-label="大きく表示">⤢</button></div>
     <div class="s3key"><span><i></i>溶融アスファルト</span><span><i class="sheet"></i>ルーフィング</span></div>
     <div class="s3note"></div>
     <div class="stbar"></div>`);
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(50,1,.01,60), target=new T.Vector3(0,.23,0);
  const hemi=new T.HemisphereLight(0xdceaff,0x8a9a8c,SKY.hemi); scene.add(hemi);
  /* 影：模型（半径 1.6m ほど）にぴったりの範囲で 2048（スマホ 1024）＝縁の点々（影の荒れ）を出さない */
  const light=new T.DirectionalLight(SKY.scol,SKY.sun); light.castShadow=true; light.shadow.mapSize.set(phone?512:1024,phone?512:1024);   /* 2048→1024：重さの半分は影だった（§640） */
  Object.assign(light.shadow.camera,{left:-1.8,right:1.8,top:1.8,bottom:-1.8,near:.5,far:12}); light.shadow.normalBias=.006; light.shadow.bias=-.0002; light.shadow.radius=2; scene.add(light);
  { const a=(SKY.az-.5)*Math.PI*2, e=SKY.el*Math.PI/2; light.position.set(5*Math.cos(a)*Math.cos(e),5*Math.sin(e),5*Math.sin(a)*Math.cos(e)); }
  const skyTex=new T.CanvasTexture(skyCanvas(SKY,1024,512)); skyTex.colorSpace=T.SRGBColorSpace; skyTex.mapping=T.EquirectangularReflectionMapping; scene.background=skyTex;
  { const small=new T.CanvasTexture(skyCanvas(SKY,256,128)); small.colorSpace=T.SRGBColorSpace; small.mapping=T.EquirectangularReflectionMapping;
    const pm=new T.PMREMGenerator(renderer); const env=pm.fromEquirectangular(small); small.dispose(); pm.dispose(); scene.environment=env.texture; }
  const model=new T.Group(); scene.add(model);
  const maxAniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  /* 手描きの粒（コンクリートの写真が読めないときの保険・ルーフィングの細かい粒。a1_model.js と同じ） */
  function grain(){ const c=document.createElement('canvas'); c.width=c.height=512; const ctx=c.getContext('2d'), im=ctx.createImageData(512,512); let seed=9127;
    for(let i=0;i<im.data.length;i+=4){ seed=(seed*1664525+1013904223)>>>0; const x=(i/4)%512, y=Math.floor(i/2048); const v=Math.max(60,Math.min(250,164+(seed%70)+15*Math.sin(x*.15)*Math.sin(y*.21))); im.data.set([v,v,v,255],i); }
    ctx.putImageData(im,0,0); const tex=new T.CanvasTexture(c); tex.wrapS=tex.wrapT=T.RepeatWrapping; tex.repeat.set(1,1); tex.anisotropy=maxAniso; tex.colorSpace=T.SRGBColorSpace; return tex; }
  const noise=grain();
  /* 溶融アスの流れ模様：流した向き（x）に長い、やわらかい濃淡 */
  const fc=document.createElement('canvas'); fc.width=fc.height=512; const fctx=fc.getContext('2d'), fim=fctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){ const v=128+9*Math.sin(y*.045+1.2*Math.sin(x*.011))+6*Math.sin(y*.13+x*.021+2*Math.sin(x*.007))+4*Math.sin(x*.09+y*.05)+3*Math.sin(x*.31+y*.17), k=(y*512+x)*4; fim.data.set([v,v,v,255],k); }
  fctx.putImageData(fim,0,0); const flow=new T.CanvasTexture(fc); flow.wrapS=flow.wrapT=T.RepeatWrapping; flow.repeat.set(1,1); flow.anisotropy=maxAniso;
  /* 材質は使い回して捨てない（罠15）。cur＝いま選んでいる工程（少し明るく） */
  const cache=new Map();
  function molten(cur){ const key='as:'+(cur?1:0); if(cache.has(key)) return cache.get(key);
    const m=new T.MeshPhysicalMaterial({color:cur?0x252c36:0x14181d,roughness:.30,metalness:0,clearcoat:.4,clearcoatRoughness:.2,bumpMap:flow,bumpScale:.0012,roughnessMap:flow,side:T.DoubleSide,envMapIntensity:.6});
    if(cur){ m.emissive=new T.Color(0x2a3a22); m.emissiveIntensity=.12; } m.userData.kind='asphalt'; m.userData.hi=()=>molten(true); cache.set(key,m); return m; }
  /* kind：concrete＝写真／sheet＝ルーフィング（黒系・つやなし・細かい粒）／それ以外＝平ら */
  function mat(color,rough,kind,cur){ const key=[color,rough,kind||'',cur?1:0].join(':'); if(cache.has(key)) return cache.get(key);
    const m=new T.MeshStandardMaterial({color,roughness:rough==null?.85:rough,metalness:0,side:T.DoubleSide,map:kind==='concrete'?noise:null,bumpMap:noise,bumpScale:kind==='concrete'?.003:kind==='sheet'?.0005:.001});
    if(cur){ m.emissive=new T.Color(0x3a4a2a); m.emissiveIntensity=.12; } m.userData.kind=kind||''; m.userData.base=color;
    m.userData.hi=()=>{ const h=mat(color,rough,kind,true); if(kind==='concrete'&&V.photo) V.photoOn(h); return h; }; cache.set(key,m); return m; }
  const steel=mat(0x666d67,.4); steel.metalness=.6;
  V={T,phone,root,renderer,canvas,scene,camera,target,light,model,molten,mat,steel,cache,dark:mat(0x252924,.5),
     theta:2.2,phi:1.02,distance:4.6,frame:0,key:null,el:null,big:null,cur:null,photo:0,layers:[],groups:[],baseRatio:1,low:false,note:'',noteOf:null,step:null};   /* theta 2.2＝切り欠いた階段（-x側）が手前・立上りが奥（田島の絵と同じ向き） */
  /* ---- 写真の質感（zumen_sekisan.html の nn-phototex-js と同じ考え）。UV は m 単位で作ってあるので repeat＝1/タイル ---- */
  const ver=(typeof window.NN_VER!=='undefined'&&window.NN_VER)?('?v='+window.NN_VER):'';
  const L=new T.TextureLoader(); const tex={};
  function load(name,key,srgb,tw,th){ return new Promise(res=>{ L.load('./textures/'+name+ver,t=>{ t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(1/tw,1/th); t.anisotropy=maxAniso; if(srgb) t.colorSpace=T.SRGBColorSpace; tex[key]=t; res(true); },undefined,()=>res(false)); }); }
  function photoOn(m){ /* 写真は材質の色に掛け算される。いちばん明るい成分を 1.0 にそろえて写真そのものの濃淡を出す（§2026-08-27g） */
    if(!tex.cc||m.map===tex.cc) return; const c=m.color, mx=Math.max(c.r,c.g,c.b)||1; c.setRGB(c.r/mx,c.g/mx,c.b/mx);
    m.map=tex.cc; m.bumpMap=null; if(tex.cn){ m.normalMap=tex.cn; m.normalScale.set(1,1); } if(tex.cr){ m.roughnessMap=tex.cr; m.roughness=1.0; } m.needsUpdate=true; }
  V.photoOn=photoOn;
  Promise.all([load('concrete_color.jpg','cc',true,TILE_W,TILE_H),load('concrete_normal.jpg','cn',false,TILE_W,TILE_H),load('concrete_rough.jpg','cr',false,TILE_W,TILE_H)]).then(()=>{
    V.photo=tex.cc?1:0; cache.forEach(m=>{ if(m.userData.kind==='concrete') photoOn(m); });
    renderer.shadowMap.needsUpdate=true; V.render(); });
  /* ---- 描く（求められたときだけ1回） ---- */
  V.render=function(){ if(V.frame) return; V.frame=requestAnimationFrame(()=>{ V.frame=0; const d=V.distance;
    camera.position.set(target.x+d*Math.sin(V.phi)*Math.cos(V.theta), target.y+d*Math.cos(V.phi), target.z+d*Math.sin(V.phi)*Math.sin(V.theta)); camera.lookAt(target); renderer.render(scene,camera); }); };
  V.resize=function(){ const host=root.parentElement; if(!host) return; const w=host.clientWidth, h=host.clientHeight; if(!w||!h) return;
    const rect=host.getBoundingClientRect(), scale=rect.width/w;            /* zoom のぶん（罠1） */
    /* 画素の密度：端末の倍率×zoom、上限2（図面・積算と同じ）。描くのは操作のときだけなので、画素の予算は大きめ */
    V.baseRatio=Math.min(devicePixelRatio*scale, 2, Math.sqrt((phone?1600000:3200000)/(w*h)));
    renderer.setPixelRatio(V.baseRatio*(V.low?.6:1)); renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); V.fit(); V.render(); };
  /* ドラッグ中だけ解像度を 6 割に落とす（離したら元に戻して描き直す）＝回転がなめらか（§640） */
  V.setLow=function(f){ if(V.low===f) return; V.low=f; const c=canvas; renderer.setPixelRatio(V.baseRatio*(f?.6:1)); renderer.setSize(c.clientWidth||1,c.clientHeight||1,false); V.render(); };
  /* 入れ物の縦横に合わせて、模型の箱の8つの角が全部おさまる距離にする（球で合わせると横長の枠で小さくなりすぎる） */
  V.fit=function(){ const T=V.T, box=new T.Box3(); model.children.forEach(g=>{ if(g.visible) box.expandByObject(g); }); if(box.isEmpty()) return; box.getCenter(target);
    const u=new T.Vector3(Math.sin(V.phi)*Math.cos(V.theta),Math.cos(V.phi),Math.sin(V.phi)*Math.sin(V.theta)); /* 的→カメラ */
    const up0=new T.Vector3(0,1,0), right=new T.Vector3().crossVectors(up0,u).normalize(), up=new T.Vector3().crossVectors(u,right).normalize();
    const tv=Math.tan(camera.fov*Math.PI/360), th=tv*camera.aspect; let D=0;
    for(let k=0;k<8;k++){ const c=new T.Vector3(k&1?box.max.x:box.min.x, k&2?box.max.y:box.min.y, k&4?box.max.z:box.min.z).sub(target);
      const dep=c.dot(u), x=Math.abs(c.dot(right)), y=Math.abs(c.dot(up)); D=Math.max(D, x/th+dep, y/tv+dep); }
    V.distance=Math.max(.5,D*1.06); };
  V.reset=function(){ V.theta=2.2; V.phi=1.02; V.fit(); V.render(); };
  /* ---- 操作：ドラッグで回す・ホイール／2本指で拡大 ---- */
  const ptr=new Map(); let pinch=null;
  /* 平行移動：画面の上下左右にそのまま動かす（カメラの向きは変えない）。1px＝的の距離での1px */
  V.pan=function(dx,dy){ const h=canvas.clientHeight||1, k=2*V.distance*Math.tan(camera.fov*Math.PI/360)/h; const z=canvas.getBoundingClientRect().height/h||1;
    const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0), up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
    target.addScaledVector(right,-dx/z*k).addScaledVector(up,dy/z*k); };
  canvas.oncontextmenu=e=>e.preventDefault();
  canvas.onpointerdown=e=>{ e.preventDefault(); canvas.setPointerCapture(e.pointerId); ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,pan:e.shiftKey||e.ctrlKey||e.button===2}); pinch=null; V.setLow(true); };
  canvas.onpointermove=e=>{ if(!ptr.has(e.pointerId)) return; e.preventDefault(); const last=ptr.get(e.pointerId); ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,pan:last.pan});
    if(ptr.size>=2){ const [a,b]=[...ptr.values()], d=Math.hypot(b.x-a.x,b.y-a.y), mx=(a.x+b.x)/2, my=(a.y+b.y)/2; if(pinch==null){ pinch={d,r:V.distance,mx,my}; return; }
      if(d>10&&pinch.d>10) V.distance=T.MathUtils.clamp(pinch.r*pinch.d/d,.3,25); V.pan(mx-pinch.mx,my-pinch.my); pinch.mx=mx; pinch.my=my; }
    else if(last.pan||e.shiftKey||e.ctrlKey||(e.buttons&2)){ V.pan(e.clientX-last.x,e.clientY-last.y); }   /* Shift／Ctrl／右ボタン＝移動（図面・積算と同じ） */
    else{ V.theta-=(e.clientX-last.x)*.006; V.phi=T.MathUtils.clamp(V.phi-(e.clientY-last.y)*.005,.15,Math.PI/2); }
    V.render(); };
  const up=e=>{ ptr.delete(e.pointerId); pinch=null; if(!ptr.size) V.setLow(false); }; canvas.onpointerup=up; canvas.onpointercancel=up; canvas.onlostpointercapture=up;
  canvas.addEventListener('wheel',e=>{ e.preventDefault(); V.distance=T.MathUtils.clamp(V.distance*(e.deltaY>0?1.12:1/1.12),.3,25); V.render(); },{passive:false});
  /* ---- 丸ボタン：1回押し＝1段、**長押し＝押しているあいだ続けて動く**（本人「長押しでちゃんと押せるように」・§639）。
     動きは pointerdown で起こし、click は使わない（両方だと2回動く）。真上・全体・大きくは1回だけ ---- */
  const step=k=>{ if(k==='zin') V.distance=Math.max(.3,V.distance/1.18); if(k==='zout') V.distance=Math.min(25,V.distance*1.18);
    if(k==='rl'||k==='rr'){ if(V.phi<.3) V.phi=.9; V.theta+=(k==='rl'?-8:8)*Math.PI/180; }
    if(k==='tup'||k==='tdn') V.phi=T.MathUtils.clamp(V.phi+(k==='tup'?-6:6)*Math.PI/180,.15,Math.PI/2);
    V.render(); };
  root.querySelectorAll('[data-nav]').forEach(b=>{ const k=b.dataset.nav;
    if(k==='plan'){ b.onclick=()=>{ V.theta=Math.PI/2; V.phi=.16; V.fit(); V.render(); }; return; }   /* 真上（図面・積算と同じ：立上りが画面の上） */
    if(k==='iso'){ b.onclick=()=>V.reset(); return; }
    if(k==='big'){ b.onclick=()=>openBig(); return; }
    let tm=null, iv=null; const stop=()=>{ clearTimeout(tm); clearInterval(iv); tm=iv=null; b.classList.remove('hold'); V.setLow(false); };
    b.onclick=e=>e.preventDefault();
    b.addEventListener('pointerdown',e=>{ e.preventDefault(); try{ b.setPointerCapture(e.pointerId); }catch(_){ } b.classList.add('hold'); step(k); tm=setTimeout(()=>{ V.setLow(true); iv=setInterval(()=>step(k),60); },300); });
    ['pointerup','pointercancel','lostpointercapture'].forEach(t=>b.addEventListener(t,stop));
    b.addEventListener('contextmenu',e=>e.preventDefault()); });
  canvas.addEventListener('webglcontextlost',e=>{ e.preventDefault(); msg('3D表示が中断しました。ページを開き直してください。'); });
  new ResizeObserver(()=>V.resize()).observe(root);
}
function msg(text){ let m=V.root.querySelector('.s3msg'); if(!text){ m&&m.remove(); return; } if(!m){ m=document.createElement('div'); m.className='s3msg'; V.root.appendChild(m); } m.textContent=text; }

/* ---------- 断面の折れ線（[z,y]…）の道具：層の積み上げ（§639） ---------- */
function cum(path){ const s=[0]; for(let i=1;i<path.length;i++) s.push(s[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1])); return s; }
function ptAt(path,s){ const c=cum(path); if(s<=0) return path[0].slice();
  for(let i=1;i<path.length;i++) if(s<=c[i]+1e-9){ const t=(s-c[i-1])/((c[i]-c[i-1])||1), a=path[i-1], b=path[i]; return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]; }
  return path[path.length-1].slice(); }
/* 平場（z が減る向きの区間）で z を通る道のり */
function sAtZ(path,z){ const c=cum(path); for(let i=1;i<path.length;i++){ const a=path[i-1], b=path[i]; if(b[0]<a[0]-1e-9&&(a[0]-z)*(b[0]-z)<=0) return c[i-1]+(c[i]-c[i-1])*((a[0]-z)/(a[0]-b[0])); } return 0; }
/* 面取り（斜めに上がる最初の区間）の始まりの道のり。継目の段（まっすぐ上がる）は数えない */
function sChamfer(path){ const c=cum(path); for(let i=1;i<path.length;i++) if(path[i][1]>path[i-1][1]+1e-6&&path[i][0]<path[i-1][0]-1e-6) return c[i-1]; return c[c.length-1]; }
/* 折れ線を厚さ t だけ外へ（進む向きの左＝平場なら上・立上りなら手前）押し出す。
   角は**隣り合う2辺の押し出した線の交点**（miter）。前は隣の点を結んだ弦の向きで法線を出していたが、
   継目の段のように 0.5mm の短い辺がはさまると弦がほぼ縦になり、角が 5mm 横へ飛んだ（§639 で実測）。
   曲がりが 120° より急な角は交点が遠くへ飛ぶので、2辺の法線の平均で止める（面取り） */
function offsetPts(lo,t,pinZ){ const n=lo.length, N=[]; for(let i=0;i<n-1;i++){ const dz=lo[i+1][0]-lo[i][0], dy=lo[i+1][1]-lo[i][1], l=Math.hypot(dz,dy)||1; N.push([dy/l,-dz/l]); }
  if(n===1) return [[lo[0][0],lo[0][1]+t]];
  /* 短い縦の段（張り掛けの端＝高さ 6cm 未満・ほぼ垂直に上がる）に接する点は z を動かさない＝上の層の端が**同じ位置に縦に積み重なる**
     （田島の絵のフックの列）。動かすと層ごとに 15mm ずつ手前へずれて、床に折れ線が走る（§640・本人の指摘） */
  /* 固定するのは「張り掛けの柱」（z＝pinZ）にある 3cm 未満の短い段だけ（アス 5mm・シート 10mm が同じ z に積み重なる＝1本の柱）。
     立上りの増張りの端の段などを固定すると、そこに 5mm の切れ込みができて層を重ねるごとに深くなる（§640 実測） */
  const riser=i=>{ if(pinZ==null||i<0||i>=n-1) return false; const a=lo[i], b=lo[i+1], h=b[1]-a[1]; return Math.abs(b[0]-a[0])<.002&&Math.abs(a[0]-pinZ)<.003&&h>.002&&h<.03; };
  return lo.map((p,i)=>{ const a=N[Math.max(0,i-1)], b=N[Math.min(n-2,i)], dot=a[0]*b[0]+a[1]*b[1]; let q;
    if(i===0||i===n-1||1+dot<0.5){ const mz=a[0]+b[0], my=a[1]+b[1], ml=Math.hypot(mz,my)||1; q=[p[0]+mz/ml*t, p[1]+my/ml*t]; }
    else { const k=t/(1+dot); q=[p[0]+(a[0]+b[0])*k, p[1]+(a[1]+b[1])*k]; }
    if(riser(i-1)||riser(i)) q=[p[0], p[1]+t]; return q; }); }
/* 張り掛けの始まり：z を通る道のり。すでにそこに段（前の層の張り掛けの縦の面）があれば、その**段の上端**に合わせる＝段が1本にそろう。
   合わせないと 0.5mm 奥に新しい段ができて、短い辺のせいで角が飛ぶ（§639） */
function sLap(path,z){ const c=cum(path), s=sAtZ(path,z); let j=1; while(j<path.length&&c[j]<s-1e-9) j++;
  if(j<path.length&&Math.abs(c[j]-s)<1e-6){ while(j+1<path.length&&Math.abs(path[j+1][0]-path[j][0])<.002&&path[j+1][1]>path[j][1]+.002) j++; return c[j]; }
  return s; }
/* 立上り（長い縦の区間）で y を通る道のり */
function sAtY(path,y){ const c=cum(path); for(let i=1;i<path.length;i++){ const a=path[i-1], b=path[i]; if(b[1]>a[1]+.05&&Math.abs(b[0]-a[0])<.01&&(a[1]-y)*(b[1]-y)<=0) return c[i-1]+(c[i]-c[i-1])*((y-a[1])/(b[1]-a[1])); } return c[c.length-1]; }
/* 道のり s0〜s1 の範囲を厚さ t だけ外へ押し出した新しい表面。lo＝元の表面のその範囲、hi＝押し出した線（lo と hi の間が層の断面）。
   bridgeEnd＝範囲の終わりの段（層の端の縦の面）を新しい表面に入れない＝次の層は端の上から斜めに下の面へ渡る。
   平場のシートの端（面取りの手前）で使う：端の縦面と面取りの間の 45° のくさびを折れ線のまま押し出すと、
   法線が反転して層を重ねるほど形が壊れる（§639 で実測：y が -14mm まで潜った）。くさびは張り掛けのシートの下に隠れる */
function offsetRange(path,s0,s1,t,bridgeEnd,pinZ){
  const c=cum(path), L=c[c.length-1]; s0=Math.max(0,s0); s1=Math.min(L,s1);
  const lo=[ptAt(path,s0)]; for(let i=0;i<path.length;i++) if(c[i]>s0+1e-9&&c[i]<s1-1e-9) lo.push(path[i].slice()); lo.push(ptAt(path,s1));
  const hi=offsetPts(lo,t,pinZ);
  const out=[]; for(let i=0;i<path.length;i++) if(c[i]<s0-1e-9) out.push(path[i].slice());
  if(s0>1e-9) out.push(lo[0].slice()); hi.forEach(p=>out.push(p.slice())); if(s1<L-1e-9&&!bridgeEnd) out.push(lo[lo.length-1].slice());
  for(let i=0;i<path.length;i++) if(c[i]>s1+1e-9) out.push(path[i].slice());
  return {path:out, lo, hi};
}

/* ---------- 形を作る道具 ---------- */
/* UV を「現場の m」で付け直す（写真の1タイル＝2m×1m を、どの面でも同じ大きさで貼るため。Box の既定 UV は面ごとに 0〜1 なので写真が伸びる） */
function uvWorld(geo){ const p=geo.attributes.position, n=geo.attributes.normal; if(!p||!n) return geo; const uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){ const nx=Math.abs(n.getX(i)), ny=Math.abs(n.getY(i)), nz=Math.abs(n.getZ(i)); let a,b;
    if(ny>=nx&&ny>=nz){ a=p.getX(i); b=p.getZ(i); } else if(nx>=nz){ a=p.getZ(i); b=p.getY(i); } else { a=p.getX(i); b=p.getY(i); } uv[i*2]=a; uv[i*2+1]=b; }
  geo.setAttribute('uv',new V.T.Float32BufferAttribute(uv,2)); return geo; }
function tools(g){
  const T=V.T;
  function add(geo,m){ const o=new T.Mesh(geo,m); o.castShadow=true; o.receiveShadow=true; g.add(o); return o; }
  function box(x,y,z,w,h,d,m){ const geo=new T.BoxGeometry(w,h,d); geo.translate(x,y,z); uvWorld(geo); return add(geo,m); }
  /* z/y の断面を x 方向に押し出す */
  function prism(pts,x0,x1,m){ const s=new T.Shape(); pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1])); s.closePath();
    const geo=new T.ExtrudeGeometry(s,{depth:x1-x0,bevelEnabled:false,steps:1}); const p=geo.attributes.position;
    for(let i=0;i<p.count;i++){ const z=p.getX(i), y=p.getY(i), x=p.getZ(i); p.setXYZ(i,x+x0,y,z); } geo.computeVertexNormals(); uvWorld(geo); return add(geo,m); }
  /* 層の断面（lo＝下の線・hi＝上の線）を x0〜x1 に押し出す＝シート・プライマー・絶縁用シート */
  function band(lo,hi,x0,x1,m){ return prism(lo.concat(hi.slice().reverse()),x0,x1,m); }
  /* 溶融アスファルト：断面の道（path＝[z,y]…）に沿って、厚さ th の層を x0〜x1 に流す。
     wavy＝切り欠いた端（x0側）を「流し広げた縁」にする：1cm ごとに点を打ったなめらかな波（波長 0.6／0.27／0.13m）＋
     縁から 3cm で厚さが 0 になる丸い盛り上がり（縁に縦の面を作らない・§638） */
  function coating(path,th,x0,x1,m,id,wavy){
    const step=V.phone?.025:.015, pts=[]; let length=0;   /* 1.5cm 刻み（波長 13cm の波に 8〜9 点＝十分なめらか）。1cm だと三角形が倍で重い（§640） */
    path.forEach((p,i)=>{ if(!i){ pts.push({z:p[0],y:p[1],s:0}); return; } const prev=path[i-1], dz=p[0]-prev[0], dy=p[1]-prev[1], len=Math.hypot(dz,dy), n=Math.max(1,Math.ceil(len/step));
      for(let k=1;k<=n;k++) pts.push({z:prev[0]+dz*k/n, y:prev[1]+dy*k/n, s:length+len*k/n}); length+=len; });
    const nx=V.phone?20:36, rows=pts.length, pos=[], uv=[], idx=[], LIP=.03;
    for(let side=0;side<2;side++) for(let j=0;j<rows;j++){ const p=pts[j], prev=pts[Math.max(0,j-1)], next=pts[Math.min(rows-1,j+1)], dz=next.z-prev.z, dy=next.y-prev.y, L=Math.hypot(dz,dy)||1, ny=-dz/L, nz=dy/L;
      const edge=wavy?(.016*Math.sin(p.s*10.5+id*1.7)+.009*Math.sin(p.s*23+.7*id)+.004*Math.sin(p.s*48+1.3*id)):0, xe=x0+edge;
      for(let k=0;k<=nx;k++){ const t=k/nx, u=wavy?Math.pow(t,1.6):t, x=xe+(x1-xe)*u, dEdge=x-xe;     /* 縁の近くに点を集める（丸みを出すため） */
        const lip=wavy?Math.sqrt(Math.min(1,dEdge/LIP)):1, h=side?th*lip+(lip>.999?.0004*Math.sin(x*23+p.s*11)+.0002*Math.cos(p.s*41+x*7):0):0;
        pos.push(x,p.y+ny*h,p.z+nz*h); uv.push(x,p.s); } }
    const stride=nx+1, off=rows*stride;
    for(let j=0;j<rows-1;j++) for(let k=0;k<nx;k++){ const a=j*stride+k, b=a+1, c=a+stride, d=c+1; idx.push(a,c,b,b,c,d,a+off,b+off,c+off,b+off,d+off,c+off); }
    /* 側面：道の始め・終わり・x1 側だけ（縁側は厚さ 0 なので要らない） */
    for(let k=0;k<nx;k++){ const a=k, b=k+1; idx.push(a,b,a+off,b,b+off,a+off); const c=(rows-1)*stride+k, d=c+1; idx.push(c,c+off,d,d,c+off,d+off); }
    for(let j=0;j<rows-1;j++){ const a=j*stride+nx, b=a+stride; idx.push(a,a+off,b,b,a+off,b+off); }
    if(!wavy) for(let j=0;j<rows-1;j++){ const a=j*stride, b=a+stride; idx.push(a,b,a+off,b,b+off,a+off); }
    const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.Float32BufferAttribute(pos,3)); geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); geo.setIndex(idx); geo.computeVertexNormals();
    geo.userData={stride,rows,wavy:!!wavy}; return add(geo,m); }   /* 検査用：点の並び（stride＝横の点数） */
  function rod(a,b,m){ const va=new T.Vector3(...a), vb=new T.Vector3(...b), v=vb.clone().sub(va), o=add(new T.CylinderGeometry(.003,.003,v.length(),6),m);
    o.position.copy(va.add(vb).multiplyScalar(.5)); o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()); return o; }
  /* ルーフィング（シート）：黒系・つやなし・細かい粒（本人「アス系のルーフィングは黒系で材料によって少し変える」） */
  function sheet(color){ return V.mat(color,.95,'sheet',false); }
  /* コンクリート：写真が読めていれば写真 */
  function concrete(color,rough){ const m=V.mat(color,rough,'concrete',false); if(V.photo) V.photoOn(m); return m; }
  return {add,box,prism,band,coating,rod,sheet,concrete,molten:()=>V.molten(false),mat:(c,r,k)=>V.mat(c,r,k,false)};
}
/* ルーフィングの色（材料ごとに少し変える）：アスファルトルーフィング1500＝黒、ストレッチ＝やや茶の黒、改質アスシート＝青みの黒、砂付＝灰 */
function sheetColor(w){ return /砂付/.test(w)?0x6b6a66 : /改質/.test(w)?0x1f2024 : /ストレッチ/.test(w)?0x3a332c : 0x2a2927; }

/* ---------- A-1 屋根保護防水密着工法（新築 表9.2.3）。下地 2,400×1,800mm・立上り高さ620mm・面取り80mm は説明用の寸法
   （面取りは 60→80mm：張り掛けのぶん平場側が層ごとに 10mm ずつ厚くなり、60mm だと4層で面取りが消えてしまう・§640）。
   立上りのルーフィングは平場へ **150mm** 張り掛ける（9.2.4(4)(ｲ)(f)）。張り掛けの端は層をまたいで同じ位置（zLap）。
   入隅には最初のルーフィングの前に幅 300mm のストレッチルーフィングを増張り（9.2.4(4)(ｱ)(c)・工程表に行は無いが仕様上必須＝先行作業として描く）。
   層ごとに左から 160mm ずつ切り欠いて（階段状）、下の層が見えるようにしてある（田島の仕様書の絵と同じ見せ方）。
   「いまの表面」surf（手前 z=.94 → 面取り → 立上り上端 y=.62 の折れ線）に層を順にのせる。
   工程 k（0始まり）の形を作る。i＝いま見ている工程（-1＝全体） ---------- */
MODELS['A-1']=function(sp){
  const T=V.T, model=V.model, n=sp.steps.length, X1=1.18;
  /* 下地（いつも出す）：スラブ・立上り（笠木つき）・入隅の面取り */
  { const g=new T.Group(); g.userData.k=-1; model.add(g); const t=tools(g); const c=t.concrete(0xb5b7b4,.97);
    t.box(0,-.12,.06,2.4,.24,1.8,c); t.box(0,.27,-.84,2.4,.78,.12,c); t.box(0,.675,-.84,2.4,.03,.16,c);
    t.prism([[-.78,0],[-.70,0],[-.78,.08]],-1.2,1.2,c); }
  let surf=[[.94,0],[-.70,0],[-.78,.08],[-.78,.62]];
  const zLap=-.70+.15, firstSheet=sp.steps.findIndex(x=>/ルーフィング/.test(x.w)&&/流し張り/.test(x.w));
  V.noteOf=i=>(i===firstSheet)?'先行：入隅に幅300mmのストレッチルーフィングを増張り（国交省 9.2.4）':'';
  const log=[]; V.layers=log; V.groups=[];
  const total=p=>cum(p)[p.length-1], wallZ=p=>p[p.length-1][0], fieldY=p=>ptAt(p,sAtZ(p,.5))[1];
  for(let k=0;k<n;k++){
    const g=new T.Group(); g.userData.k=k; model.add(g); V.groups[k]=g; const t=tools(g), id=k+1, x0=-1.18+k*.16, w=sp.steps[k].w;
    /* 範囲 s0〜s1 に厚さ th の層をのせる。kind：as＝溶融アス（波の縁）／sheet＝シート（アスの縁が見えるよう 65mm 奥から）／coat＝プライマー・絶縁用シート */
    const put=(s0,s1,th,m,kind,bridgeEnd)=>{ const r=offsetRange(surf,s0,s1,th,bridgeEnd,zLap);
      if(kind==='as') t.coating(r.lo,th,x0,X1,m,id,true); else t.band(r.lo,r.hi,kind==='sheet'?x0+.065:x0,X1,m);
      log.push({k,kind,th,lo:r.lo,hi:r.hi,prev:surf,path:r.path}); surf=r.path; return r; };
    const isSheet=/ルーフィング/.test(w)&&/流し張り/.test(w);
    if(/プライマー/.test(w)) put(0,total(surf),.004,t.mat(0x45392d,.45),'coat');
    else if(isSheet){
      /* 最初のルーフィングの前：入隅の増張り（平場 150＋面取り＋立上り 150 ≒ 幅300）。アスを流してストレッチルーフィングを張る */
      /* ★シートはアスより 4mm 短く終える：同じ高さで終えると、次の層がそこで「下がってから上がる」折り返しになり、層を重ねるごとに壁へ食い込む（§640 実測 z=-.842） */
      if(k===firstSheet){ put(sLap(surf,zLap),sAtY(surf,.23),.005,t.molten(),'as'); put(sLap(surf,zLap),sAtY(surf,.226),.010,t.sheet(sheetColor('ストレッチ')),'sheet'); }
      /* 溶融アスを全面に流す → 平場のシート（面取りの手前まで）→ 立上りのシート（平場へ 150mm 張り掛け・zLap から上端まで） */
      put(0,total(surf),.005,t.molten(),'as');
      const m=t.sheet(sheetColor(w));
      const r1=put(0,sChamfer(surf),.010,m,'sheet',true);
      /* 幅方向の継目（100mm 重ね・上下の層でずらす）：2枚目が1枚目に乗るぶんの薄い段 */
      const seam=-.35+(k-1)*.19, a=Math.max(x0+.065,seam), b=Math.min(X1,seam+.10);
      if(b>a){ const zf=r1.lo[0][0], zc=r1.lo[r1.lo.length-1][0], yt=r1.hi[0][1]; t.box((a+b)/2,yt+.00075,(zf+zc)/2,b-a,.0015,zf-zc,m); }
      put(sLap(surf,zLap),total(surf),.010,m,'sheet');
    }
    else if(/はけ塗り/.test(w)){
      put(0,total(surf),.004,t.molten(),'as');
      /* 2回目のはけ塗りで立上りの端部を押え金物＋シール材で納める */
      if(k>0&&/はけ塗り/.test(sp.steps[k-1].w)){ const zw=wallZ(surf);
        t.box((x0+X1)/2,.628,zw+.0075,X1-x0,.030,.015,V.steel); t.box((x0+X1)/2,.648,zw+.0045,X1-x0,.010,.009,V.dark);
        for(let x=x0+.05;x<X1;x+=.4){ const s=t.add(new T.SphereGeometry(.006,8,6),V.steel); s.position.set(x,.628,zw+.015); } }
    }
    else if(/絶縁用シート/.test(w)){
      /* 平場だけに敷く（面取りの途中まで 30mm ほど立ち上げる）。入隅に成形緩衝材 */
      const m=t.mat(0xe7dec0,.9); put(0,sChamfer(surf)+.045,.003,m,'coat');
      const c=ptAt(surf,sChamfer(surf)); t.box((x0+X1)/2,c[1]+.02,c[0]-.015,X1-x0,.04,.04,t.mat(0x978d70));
    }
    else if(/保護コンクリート/.test(w)){
      /* こて仕上げ 80mm・溶接金網（径6mm・100mm目）・立上りから 600mm に伸縮目地・立上りは乾式保護材の例。底はいまの表面（平場） */
      const m=t.concrete(0xd7d2c4,.95), yb=fieldY(surf), zw=wallZ(surf), zb=-.49, joint=.11, jw=.025, cx=Math.max(x0,.76);
      t.box((cx+X1)/2,yb+.04,(zb+joint-jw/2)/2,X1-cx,.08,joint-jw/2-zb,m);
      t.box((cx+X1)/2,yb+.04,(joint+jw/2+.94)/2,X1-cx,.08,.94-joint-jw/2,m);
      t.box((x0+X1)/2,yb+.04,joint,X1-x0,.08,jw,V.dark);
      for(let x=Math.ceil(x0*10)/10;x<X1;x+=.1){ t.rod([x,yb+.035,zb+.02],[x,yb+.035,joint-.025],V.steel); t.rod([x,yb+.035,joint+.025],[x,yb+.035,.92],V.steel); }
      for(let z=-.4;z<.94;z+=.1) if(Math.abs(z-joint)>.025) t.rod([x0,yb+.041,z],[X1,yb+.041,z],V.steel);
      const bb=yb+.08; t.box((x0+X1)/2,(bb+.64)/2,zw+.0235,X1-x0,.64-bb,.035,t.mat(0xc3b997,.9));
    }
  }
  return true;
};

/* ---------- 大きく見る（全画面の dialog に同じ絵を移す） ---------- */
function openBig(){
  if(V.big) return;
  const d=document.createElement('dialog'); d.className='s3big'; d.setAttribute('aria-label','工程の3D（大きく表示）');
  d.innerHTML=`<div class="s3head"><button type="button" data-prev>◀ 前の工程</button><h2></h2><button type="button" data-next>次の工程 ▶</button><button type="button" data-close>✕　閉じる</button></div><div class="s3main"></div>`;
  document.body.appendChild(d); V.big=d;
  /* ページの zoom で画面より大きくならないように（a1_model.js と同じ） */
  function fitD(){ let z=1; for(let e=d.parentElement;e;e=e.parentElement) z*=parseFloat(getComputedStyle(e).zoom)||1; d.style.zoom=String(1/z); }
  fitD(); d.querySelector('.s3main').appendChild(V.root); d.showModal(); window.addEventListener('resize',fitD);
  const nav=k=>{ if(typeof window.nnStepSel==='function'&&V.cur) window.nnStepSel(V.cur.i+k); };
  d.querySelector('[data-prev]').onclick=()=>nav(-1); d.querySelector('[data-next]').onclick=()=>nav(1);
  d.querySelector('[data-close]').onclick=()=>d.close();
  d.addEventListener('close',()=>{ window.removeEventListener('resize',fitD); if(V.el&&V.el.isConnected) V.el.appendChild(V.root); V.big=null; d.remove(); V.resize(); },{once:true});
  bigHead(); V.resize();
}
function bigHead(){ if(!V.big||!V.cur) return; const {sp,i}=V.cur, n=sp.steps.length;
  V.big.querySelector('h2').innerHTML=`${esc(sp.code)}　${esc(sp.name)}<small>${i<0?'全体（完成形）・'+n+'工程':'工程 '+esc(sp.steps[i].no)+'／'+n+'　'+esc(sp.steps[i].w)}</small>`;
  V.big.querySelector('[data-prev]').disabled=i<=0; V.big.querySelector('[data-next]').disabled=i>=n-1; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ---------- 入口 ---------- */
window.NN_STEP3D=function(el,sp,i){
  if(!el||!sp||!MODELS[sp.code]) return false;   /* 3Dが無い仕様は false → ページ側が今までの絵を出す */
  css();
  if(!window.THREE){
    /* 読み込み中：札と矢印だけ先に出す（読み込めたら描き直す） */
    el.innerHTML=`<div class="stlab">${i<0?'全体（完成形）':'工程 '+esc(sp.steps[i].no)}</div><div class="s3msg" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#5d503d">3Dを読み込み中…</div>`+bar(sp,i);
    el._nnReq={sp,i};
    loadThree().then(()=>{ if(el.isConnected&&el._nnReq) window.NN_STEP3D(el,el._nnReq.sp,el._nnReq.i); })
      .catch(e=>{ if(el.isConnected){ const m=el.querySelector('.s3msg'); if(m) m.textContent=e.message; } });
    return true;
  }
  if(!V) setup();
  const mounted=V.el!==el; let rebuilt=false;
  if(mounted){ el.innerHTML=''; el._nnReq=null; if(!V.big) el.appendChild(V.root); V.el=el; }
  V.cur={sp,i};
  V.root.querySelector('.stlab').textContent=i<0?'全体（完成形）':'工程 '+sp.steps[i].no;
  V.root.querySelector('.stbar').innerHTML=sp.steps.map((x,k)=>`<i class="${i<0||k<=i?'on':''}${k===i?' cur':''}"></i>`).join('');
  const key=sp.code+'|'+sp.id;
  if(V.key!==key){ V.key=key; V.model.traverse(o=>o.geometry&&o.geometry.dispose()); V.model.clear(); V.groups=[]; V.noteOf=null; V.step=null; MODELS[sp.code](sp); msg(''); rebuilt=true; }
  /* 工程の切替＝層の表示／非表示と、いまの工程の材質（少し明るい）の差し替えだけ（作り直さない＝重くない・§640） */
  const stepChanged=V.step!==i||rebuilt; V.step=i;
  if(stepChanged){ V.groups.forEach((g,k)=>{ g.visible=i<0||k<=i; g.traverse(o=>{ if(!o.isMesh) return; if(!o.userData.m0) o.userData.m0=o.material; o.material=(k===i&&o.userData.m0.userData.hi)?o.userData.m0.userData.hi():o.userData.m0; }); });
    V.renderer.shadowMap.needsUpdate=true; }
  V.root.querySelector('.s3note').textContent=(V.noteOf&&V.noteOf(i))||'';
  bigHead(); if(mounted) V.resize(); else if(stepChanged) V.fit(); V.render();
  return true;
};
window.NN_STEP3D.inspect=()=>V;   /* 検査用（読むだけ） */
window.NN_STEP3D.has=code=>!!MODELS[code];
function bar(sp,i){ return `<div class="stbar">${sp.steps.map((x,k)=>`<i class="${i<0||k<=i?'on':''}${k===i?' cur':''}"></i>`).join('')}</div>`; }
})();
