/* step3d.js ― 仕様・材料（shiyo_toroku.html）の「工程イラスト（3D）」。
   差し込み口：window.NN_STEP3D(el, sp, i)（§632）。el＝#st3d、sp＝仕様、i＝工程の番号（0始まり・-1は全体＝完成形）。
   描けたら true、その仕様の3Dが無ければ false（ページ側が今までの絵を出す）。
   いまあるのは A-1（屋根保護防水密着工法・9工程）だけ。溶融アスファルトの見た目は国交省仕様ページの a1_model.js と同じ作り。
   ・WebGL の入れ物（renderer）は1つだけ作って使い回す（仕様を切り替えても作り直さない＝iPhoneのコンテキスト上限を踏まない）。
   ・描くのは操作があったときだけ（毎フレーム描かない）。
   ・「拡大」で全画面の dialog に同じ絵を移す（閉じると元の枠に戻す）。
   ・大きさは el.clientWidth/Height（zoom をかける前の px）、画素の密度は getBoundingClientRect との比でかける（罠1・§61）。 */
(function(){
'use strict';
const MODELS={};               /* 仕様番号 → 工程ごとの形を作る関数 */
let V=null;                    /* 使い回す3Dの道具一式 */
let loading=null;

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
.s3root .stlab{position:absolute;left:8px;top:8px;background:#1c6b3c;color:#fff;font-weight:900;font-size:13px;padding:2px 10px;border-radius:2px;z-index:2}
.s3root .s3nav{position:absolute;right:6px;top:6px;display:flex;gap:3px;z-index:2}
.s3root .s3nav button{width:24px;height:24px;min-height:0;padding:0;border:1px solid #6f7d6e;border-radius:2px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 0 #97a394;font:800 11px/1 'Zen Kaku Gothic New',sans-serif;color:#1e452c}
.s3root .s3nav button:hover{background:#edf4e7}
.s3root .s3nav button img{width:18px;height:18px;display:block;pointer-events:none}
.s3root .s3nav button.s3txt{width:auto;padding:0 7px;white-space:nowrap}
.s3root .s3key{position:absolute;left:6px;bottom:26px;display:flex;gap:9px;background:#fffffff0;padding:2px 7px;font-size:10px;line-height:1.3;pointer-events:none;color:#26322c;z-index:2;border-left:3px solid #598065}
.s3root .s3key i{display:inline-block;width:12px;height:8px;background:#1a1f25;margin-right:4px;vertical-align:-1px}
.s3root .s3key i.sheet{background:#8a7458}
.s3root .s3msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;text-shadow:0 1px 2px #0008;pointer-events:none;z-index:1}
.s3root .s3hint{position:absolute;right:6px;bottom:26px;font-size:10px;color:#fffffff0;text-shadow:0 1px 2px #000a;pointer-events:none;z-index:2}
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
dialog.s3big .s3root .s3nav button.s3txt{display:none}
dialog.s3big .s3root .s3key{left:14px;bottom:14px;font-size:13px;padding:6px 12px}
dialog.s3big .s3root .s3key i{width:18px;height:11px}
dialog.s3big .s3root .stlab{left:14px!important;top:14px!important;font-size:16px!important;padding:4px 14px!important}
dialog.s3big .s3root .stbar{display:none!important}
dialog.s3big .s3root .s3hint{right:14px;bottom:14px;font-size:12px}
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
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFShadowMap; renderer.shadowMap.autoUpdate=false;
  renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=SKY.exp;
  const canvas=renderer.domElement; canvas.setAttribute('aria-label','工程の3D。ドラッグで回転、ホイールで拡大。右上のボタンでも操作できます。'); root.appendChild(canvas);
  root.insertAdjacentHTML('beforeend',
    `<div class="stlab"></div>
     <div class="s3nav">${[['rl','左回り'],['rr','右回り'],['tup','起こす'],['tdn','倒す'],['zin','拡大'],['zout','縮小'],['iso','全体']]
       .map(([k,n])=>`<button type="button" data-nav="${k}" title="${n}" aria-label="${n}"><img src="./icons/btn_d3_${k}.png" alt=""></button>`).join('')}<button type="button" class="s3txt" data-nav="big" title="大きく見る">⤢ 大きく</button></div>
     <div class="s3key"><span><i></i>溶融アスファルト</span><span><i class="sheet"></i>ルーフィング</span></div>
     <div class="s3hint">${phone?'指で回す':'ドラッグで回す'}</div>
     <div class="stbar"></div>`);
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(50,1,.01,60), target=new T.Vector3(0,.23,0);
  const hemi=new T.HemisphereLight(0xdceaff,0x8a9a8c,SKY.hemi); scene.add(hemi);
  const light=new T.DirectionalLight(SKY.scol,SKY.sun); light.castShadow=true; light.shadow.mapSize.set(phone?512:1024,phone?512:1024);
  Object.assign(light.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:12}); light.shadow.normalBias=.0004; light.shadow.bias=-.00002; scene.add(light);
  { const a=(SKY.az-.5)*Math.PI*2, e=SKY.el*Math.PI/2; light.position.set(5*Math.cos(a)*Math.cos(e),5*Math.sin(e),5*Math.sin(a)*Math.cos(e)); }
  const skyTex=new T.CanvasTexture(skyCanvas(SKY,1024,512)); skyTex.colorSpace=T.SRGBColorSpace; skyTex.mapping=T.EquirectangularReflectionMapping; scene.background=skyTex;
  { const small=new T.CanvasTexture(skyCanvas(SKY,256,128)); small.colorSpace=T.SRGBColorSpace; small.mapping=T.EquirectangularReflectionMapping;
    const pm=new T.PMREMGenerator(renderer); const env=pm.fromEquirectangular(small); small.dispose(); pm.dispose(); scene.environment=env.texture; }
  const model=new T.Group(); scene.add(model);
  /* ざらつき（コンクリート）と流れ（溶融アス）の模様。a1_model.js と同じ作り */
  function grain(){ const c=document.createElement('canvas'); c.width=c.height=512; const ctx=c.getContext('2d'), im=ctx.createImageData(512,512); let seed=9127;
    for(let i=0;i<im.data.length;i+=4){ seed=(seed*1664525+1013904223)>>>0; const x=(i/4)%512, y=Math.floor(i/2048); const v=Math.max(60,Math.min(250,164+(seed%70)+15*Math.sin(x*.15)*Math.sin(y*.21))); im.data.set([v,v,v,255],i); }
    ctx.putImageData(im,0,0); const tex=new T.CanvasTexture(c); tex.wrapS=tex.wrapT=T.RepeatWrapping; tex.repeat.set(2,2); tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy()); tex.colorSpace=T.SRGBColorSpace; return tex; }
  const noise=grain();
  const fc=document.createElement('canvas'); fc.width=fc.height=512; const fctx=fc.getContext('2d'), fim=fctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){ const v=128+24*Math.sin(y*.12+2*Math.sin(x*.018))+10*Math.sin(y*.42+x*.017)+5*Math.sin(x*.51+y*.27), k=(y*512+x)*4; fim.data.set([v,v,v,255],k); }
  fctx.putImageData(fim,0,0); const flow=new T.CanvasTexture(fc); flow.wrapS=flow.wrapT=T.RepeatWrapping; flow.repeat.set(2,2); flow.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  /* 材質は使い回して捨てない（罠15）。cur＝いま選んでいる工程（少し明るく） */
  const cache=new Map();
  function molten(cur){ const key='as:'+(cur?1:0); if(cache.has(key)) return cache.get(key);
    const m=new T.MeshPhysicalMaterial({color:cur?0x2a3340:0x151a20,roughness:.35,metalness:0,clearcoat:.3,clearcoatRoughness:.24,bumpMap:flow,bumpScale:.0015,roughnessMap:flow,side:T.DoubleSide,envMapIntensity:.5});
    if(cur){ m.emissive=new T.Color(0x2a3a22); m.emissiveIntensity=.12; } m.userData.kind='asphalt'; cache.set(key,m); return m; }
  function mat(color,rough,concrete,cur){ const key=[color,rough,concrete?1:0,cur?1:0].join(':'); if(cache.has(key)) return cache.get(key);
    const m=new T.MeshStandardMaterial({color,roughness:rough==null?.85:rough,metalness:0,side:T.DoubleSide,map:concrete?noise:null,bumpMap:noise,bumpScale:concrete?.003:.001});
    if(cur){ m.emissive=new T.Color(0x3a4a2a); m.emissiveIntensity=.12; } cache.set(key,m); return m; }
  const steel=mat(0x666d67,.4); steel.metalness=.6;
  V={T,phone,root,renderer,canvas,scene,camera,target,light,model,molten,mat,steel,dark:mat(0x252924,.5),concrete:mat(0xb5b7b4,.97,true),
     theta:2.2,phi:1.02,distance:4.6,frame:0,key:null,el:null,big:null,cur:null};   /* theta 2.2＝切り欠いた階段（-x側）が手前・立上りが奥（田島の絵と同じ向き） */
  /* ---- 描く（求められたときだけ1回） ---- */
  V.render=function(){ if(V.frame) return; V.frame=requestAnimationFrame(()=>{ V.frame=0; const d=V.distance;
    camera.position.set(target.x+d*Math.sin(V.phi)*Math.cos(V.theta), target.y+d*Math.cos(V.phi), target.z+d*Math.sin(V.phi)*Math.sin(V.theta)); camera.lookAt(target); renderer.render(scene,camera); }); };
  V.resize=function(){ const host=root.parentElement; if(!host) return; const w=host.clientWidth, h=host.clientHeight; if(!w||!h) return;
    const rect=host.getBoundingClientRect(), scale=rect.width/w;            /* zoom のぶん（罠1） */
    renderer.setPixelRatio(Math.min(devicePixelRatio*scale, phone?1.5:2, Math.sqrt((phone?900000:1800000)/(w*h))));
    renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); V.fit(); V.render(); };
  /* 入れ物の縦横に合わせて、模型の箱の8つの角が全部おさまる距離にする（球で合わせると横長の枠で小さくなりすぎる） */
  V.fit=function(){ const T=V.T, box=new T.Box3().setFromObject(model); if(box.isEmpty()) return; box.getCenter(target);
    const u=new T.Vector3(Math.sin(V.phi)*Math.cos(V.theta),Math.cos(V.phi),Math.sin(V.phi)*Math.sin(V.theta)); /* 的→カメラ */
    const up0=new T.Vector3(0,1,0), right=new T.Vector3().crossVectors(up0,u).normalize(), up=new T.Vector3().crossVectors(u,right).normalize();
    const tv=Math.tan(camera.fov*Math.PI/360), th=tv*camera.aspect; let D=0;
    for(let k=0;k<8;k++){ const c=new T.Vector3(k&1?box.max.x:box.min.x, k&2?box.max.y:box.min.y, k&4?box.max.z:box.min.z).sub(target);
      const dep=c.dot(u), x=Math.abs(c.dot(right)), y=Math.abs(c.dot(up)); D=Math.max(D, x/th+dep, y/tv+dep); }
    V.distance=Math.max(.5,D*1.06); };
  V.reset=function(){ V.theta=2.2; V.phi=1.02; V.fit(); V.render(); };
  /* ---- 操作：ドラッグで回す・ホイール／2本指で拡大 ---- */
  const ptr=new Map(); let pinch=null;
  canvas.oncontextmenu=e=>e.preventDefault();
  canvas.onpointerdown=e=>{ e.preventDefault(); canvas.setPointerCapture(e.pointerId); ptr.set(e.pointerId,{x:e.clientX,y:e.clientY}); pinch=null; };
  canvas.onpointermove=e=>{ if(!ptr.has(e.pointerId)) return; e.preventDefault(); const last=ptr.get(e.pointerId); ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptr.size>=2){ const [a,b]=[...ptr.values()], d=Math.hypot(b.x-a.x,b.y-a.y); if(pinch==null){ pinch={d,r:V.distance}; return; }
      if(d>10&&pinch.d>10) V.distance=T.MathUtils.clamp(pinch.r*pinch.d/d,.3,25); }
    else{ V.theta-=(e.clientX-last.x)*.006; V.phi=T.MathUtils.clamp(V.phi-(e.clientY-last.y)*.005,.15,Math.PI/2); }
    V.render(); };
  const up=e=>{ ptr.delete(e.pointerId); pinch=null; }; canvas.onpointerup=up; canvas.onpointercancel=up; canvas.onlostpointercapture=up;
  canvas.addEventListener('wheel',e=>{ e.preventDefault(); V.distance=T.MathUtils.clamp(V.distance*(e.deltaY>0?1.12:1/1.12),.3,25); V.render(); },{passive:false});
  root.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{ const k=b.dataset.nav;
    if(k==='zin') V.distance=Math.max(.3,V.distance/1.25); if(k==='zout') V.distance=Math.min(25,V.distance*1.25);
    if(k==='rl'||k==='rr'){ if(V.phi<.3) V.phi=.9; V.theta+=(k==='rl'?-15:15)*Math.PI/180; }
    if(k==='tup'||k==='tdn') V.phi=T.MathUtils.clamp(V.phi+(k==='tup'?-10:10)*Math.PI/180,.15,Math.PI/2);
    if(k==='iso') V.reset(); if(k==='big') openBig(); V.render(); });
  canvas.addEventListener('webglcontextlost',e=>{ e.preventDefault(); msg('3D表示が中断しました。ページを開き直してください。'); });
  new ResizeObserver(()=>V.resize()).observe(root);
}
function msg(text){ let m=V.root.querySelector('.s3msg'); if(!text){ m&&m.remove(); return; } if(!m){ m=document.createElement('div'); m.className='s3msg'; V.root.appendChild(m); } m.textContent=text; }

/* ---------- 形を作る道具（a1_model.js と同じ） ---------- */
function tools(g,cur){
  const T=V.T;
  function add(geo,m){ const o=new T.Mesh(geo,m); o.castShadow=true; o.receiveShadow=true; g.add(o); return o; }
  function box(x,y,z,w,h,d,m){ const o=add(new T.BoxGeometry(w,h,d),m); o.position.set(x,y,z); return o; }
  /* z/y の断面を x 方向に押し出す */
  function prism(pts,x0,x1,m){ const s=new T.Shape(); pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1])); s.closePath();
    const geo=new T.ExtrudeGeometry(s,{depth:x1-x0,bevelEnabled:false,steps:1}); const p=geo.attributes.position;
    for(let i=0;i<p.count;i++){ const z=p.getX(i), y=p.getY(i), x=p.getZ(i); p.setXYZ(i,x+x0,y,z); } geo.computeVertexNormals(); return add(geo,m); }
  function ribbon(path,th,x0,x1,m){ const outer=path.map(([z,y])=>[z+th,y+th]); return prism(path.concat(outer.reverse()),x0,x1,m); }
  /* 溶融アスファルト：塗り広げた端の揺らぎと表面の波（wavy＝切り欠いた端） */
  function coating(path,th,x0,x1,m,id,wavy){
    const pts=[]; let length=0;
    path.forEach((p,i)=>{ if(!i){ pts.push({z:p[0],y:p[1],s:0}); return; } const prev=path[i-1], dz=p[0]-prev[0], dy=p[1]-prev[1], len=Math.hypot(dz,dy), n=Math.ceil(len/(V.phone?.06:.04));
      for(let k=1;k<=n;k++) pts.push({z:prev[0]+dz*k/n, y:prev[1]+dy*k/n, s:length+len*k/n}); length+=len; });
    const nx=V.phone?16:24, rows=pts.length, pos=[], uv=[], idx=[];
    for(let side=0;side<2;side++) for(let j=0;j<rows;j++){ const p=pts[j], prev=pts[Math.max(0,j-1)], next=pts[Math.min(rows-1,j+1)], dz=next.z-prev.z, dy=next.y-prev.y, L=Math.hypot(dz,dy)||1, ny=-dz/L, nz=dy/L;
      for(let k=0;k<=nx;k++){ const u=k/nx, edge=wavy?(.013*Math.sin(p.s*19+id)+.006*Math.sin(p.s*47+.7*id)):0, x=x0+edge*(1-u)+(x1-x0)*u,
        rip=side?th+.0007*Math.sin(x*38+p.s*16)+.00035*Math.cos(p.s*73+x*9):0; pos.push(x,p.y+ny*rip,p.z+nz*rip); uv.push(x,p.s); } }
    const stride=nx+1, off=rows*stride;
    for(let j=0;j<rows-1;j++) for(let k=0;k<nx;k++){ const a=j*stride+k, b=a+1, c=a+stride, d=c+1; idx.push(a,c,b,b,c,d,a+off,b+off,c+off,b+off,d+off,c+off); }
    const rim=[]; for(let k=0;k<=nx;k++) rim.push(k); for(let j=1;j<rows;j++) rim.push(j*stride+nx); for(let k=nx-1;k>=0;k--) rim.push((rows-1)*stride+k); for(let j=rows-2;j>0;j--) rim.push(j*stride);
    rim.forEach((a,k)=>{ const b=rim[(k+1)%rim.length]; idx.push(a,b,a+off,b,b+off,a+off); });
    const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.Float32BufferAttribute(pos,3)); geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); geo.setIndex(idx); geo.computeVertexNormals(); return add(geo,m); }
  function rod(a,b,m){ const va=new T.Vector3(...a), vb=new T.Vector3(...b), v=vb.clone().sub(va), o=add(new T.CylinderGeometry(.003,.003,v.length(),6),m);
    o.position.copy(va.add(vb).multiplyScalar(.5)); o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()); return o; }
  return {add,box,prism,ribbon,coating,rod,molten:()=>V.molten(cur),mat:(c,r,k)=>V.mat(c,r,k,cur)};
}

/* ---------- A-1 屋根保護防水密着工法（新築 表9.2.3）。下地 2,400×1,800mm・立上り高さ620mm・面取り60mm は説明用の寸法。
   層ごとに左から 160mm ずつ切り欠いて（階段状）、下の層が見えるようにしてある（田島の仕様書の絵と同じ見せ方）。
   工程 k（0始まり）の形を作る。i＝いま見ている工程（-1＝全体） ---------- */
MODELS['A-1']=function(sp,i){
  const T=V.T, model=V.model, n=sp.steps.length, upto=i<0?n-1:i;
  /* 下地（いつも出す） */
  { const g=new T.Group(); model.add(g); const t=tools(g,false);
    t.box(0,-.12,.06,2.4,.24,1.8,V.concrete); t.box(0,.27,-.84,2.4,.78,.12,V.concrete); t.prism([[-.78,0],[-.72,0],[-.78,.06]],-1.2,1.2,V.concrete); }
  let offset=.003;
  const X1=1.18;
  for(let k=0;k<=upto;k++){
    const g=new T.Group(); model.add(g); const cur=k===i, t=tools(g,cur), id=k+1, x0=-1.18+k*.16, w=sp.steps[k].w;
    const isSheet=/ルーフィング/.test(w)&&/流し張り/.test(w);
    if(/プライマー/.test(w)){ t.ribbon([[.94,offset],[-.72+offset,offset],[-.78+offset,.06+offset],[-.78+offset,.62]],.005,x0,X1,t.mat(0x45392d,.45)); offset+=.006; }
    else if(isSheet){
      /* 平場：溶融アスを流してからシート（幅方向の継目 100mm 重ね・上下の層で継目をずらす）。立上り：別のシートを平場へ 180mm 張り掛ける */
      const stretch=/ストレッチ/.test(w), m=t.mat(stretch?0x8a7458:0x7d7f7a,.91), as=t.molten();
      const seam=-.35+(k-1)*.19, split=Math.max(x0,Math.min(X1,seam));
      t.coating([[.94,offset],[-.58,offset]],.006,x0,X1,as,id,true);
      t.coating([[-.40,offset+.019],[-.72+offset,offset+.019],[-.78+offset,.06+offset],[-.78+offset,.62]],.005,x0,X1,as,id,true);
      const sx=x0+.065, ss=Math.max(sx,split);
      if(ss>sx) t.box((sx+ss+.10)/2,offset+.012,.18,ss+.10-sx,.010,1.52,m);
      if(ss<X1) t.box((ss+X1)/2,offset+.023,.18,X1-ss,.010,1.52,m);
      t.ribbon([[-.40,offset+.026],[-.72+offset,offset+.026],[-.78+offset,.06+offset],[-.78+offset,.62]],.010,sx,X1,m);
      offset+=.039;
    }
    else if(/はけ塗り/.test(w)){
      t.coating([[.94,offset],[-.72+offset,offset],[-.78+offset,.06+offset],[-.78+offset,.62]],.007,x0,X1,t.molten(),id,true); offset+=.009;
      /* 2回目のはけ塗りで立上りの端部を押え金物＋シール材で納める */
      if(k>0&&/はけ塗り/.test(sp.steps[k-1].w)){ t.box((x0+X1)/2,.628,-.78+offset,X1-x0,.030,.015,V.steel); t.box((x0+X1)/2,.648,-.78+offset,X1-x0,.010,.009,V.dark);
        for(let x=x0+.05;x<X1;x+=.4){ const s=t.add(new T.SphereGeometry(.006,8,6),V.steel); s.position.set(x,.628,-.755+offset); } }
    }
    else if(/絶縁用シート/.test(w)){
      /* 平場だけに敷く。端は 30mm ほど立ち上げ、入隅に成形緩衝材 */
      const m=t.mat(0xe7dec0,.9), zb=-.51;
      t.box((x0+X1)/2,offset+.002,(zb+.94)/2,X1-x0,.004,.94-zb,m); t.box((x0+X1)/2,offset+.015,zb,X1-x0,.030,.004,m);
      t.box((x0+X1)/2,offset+.042,zb-.022,X1-x0,.084,.04,t.mat(0x978d70)); offset+=.006;
    }
    else if(/保護コンクリート/.test(w)){
      /* こて仕上げ 80mm・溶接金網（径6mm・100mm目）・立上りから 600mm に伸縮目地・立上りは乾式保護材の例 */
      const m=t.mat(0xc4bda9,.85), zb=-.49, joint=.11, jw=.025, cx=Math.max(x0,.76);
      t.box((cx+X1)/2,offset+.04,(zb+joint-jw/2)/2,X1-cx,.08,joint-jw/2-zb,m);
      t.box((cx+X1)/2,offset+.04,(joint+jw/2+.94)/2,X1-cx,.08,.94-joint-jw/2,m);
      t.box((x0+X1)/2,offset+.04,joint,X1-x0,.08,jw,V.dark);
      for(let x=Math.ceil(x0*10)/10;x<X1;x+=.1){ t.rod([x,offset+.035,zb+.02],[x,offset+.035,joint-.025],V.steel); t.rod([x,offset+.035,joint+.025],[x,offset+.035,.92],V.steel); }
      for(let z=-.4;z<.94;z+=.1) if(Math.abs(z-joint)>.025) t.rod([x0,offset+.041,z],[X1,offset+.041,z],V.steel);
      t.box((x0+X1)/2,.44,-.52,X1-x0,.38,.035,t.mat(0xc3b997,.9));
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
  const key=sp.code+'|'+sp.id+'|'+i;
  if(V.key!==key){ V.key=key; V.model.traverse(o=>o.geometry&&o.geometry.dispose()); V.model.clear(); MODELS[sp.code](sp,i); V.renderer.shadowMap.needsUpdate=true; msg(''); rebuilt=true; }
  bigHead(); if(mounted) V.resize(); else if(rebuilt) V.fit(); V.render();
  return true;
};
window.NN_STEP3D.inspect=()=>V;   /* 検査用（読むだけ） */
window.NN_STEP3D.has=code=>!!MODELS[code];
function bar(sp,i){ return `<div class="stbar">${sp.steps.map((x,k)=>`<i class="${i<0||k<=i?'on':''}${k===i?' cur':''}"></i>`).join('')}</div>`; }
})();
