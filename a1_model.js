/* A-1 independent educational model. Sources: MLIT R7, table 9.2.3,
   9.2.2, 9.2.4, 9.2.5. No manufacturer artwork or textures are included. */
(function(){
'use strict';
const SOURCE='https://www.mlit.go.jp/gobuild/content/001888816.pdf';
const steps=[
 {id:'base',no:'下地',name:'下地・45°面取り',color:0x9e9789,body:'十分に乾燥したコンクリート下地を清掃します。入隅・出隅は45°に面取りします。模型の面取り寸法60mm、立上り高さ・下地寸法は説明用の設定です。',ref:'9.2.4(1)(2)・本文p.105'},
 {id:'1',no:'1',name:'プライマー塗り',color:0x45392d,body:'アスファルトプライマー 0.2 kg/㎡。張りじまいまで均一に塗り、乾燥させます。この模型は新築・コンクリート下地を対象とします。',ref:'表9.2.3・9.2.4(2)'},
 {id:'reinforce',no:'増',name:'入隅の増張り',color:0x996342,body:'一般部の張付け前に、入隅へ幅300mm以上のストレッチルーフィングを最下層に増張りします。模型は展開幅約347mm。工程表の9工程とは別の先行処理です。',ref:'9.2.4(4)(ｱ)(c)・表9.2.10・本文p.106'},
 {id:'2',no:'2',name:'ルーフィング 第1層',color:0x686249,body:'アスファルトルーフィング1500を、アスファルト1.0 kg/㎡で流し張りします。平場と立上りを別々に張り、立上りのシートを平場へ150mm以上張り掛けます。模型の張掛けは180mmです。',ref:'表9.2.3・9.2.2(3)(ｱ)・9.2.4(4)(ｲ)(f)'},
 {id:'3',no:'3',name:'ストレッチ 第2層',color:0x786348,body:'ストレッチルーフィング1000を、アスファルト1.0 kg/㎡で流し張りします。上下層の継目を同じ位置にしません。継目は幅・長手方向とも100mm以上重ね、水下のシートを下側にします。',ref:'表9.2.3・9.2.2(3)(ｲ)・9.2.4(4)(ｲ)(c)(d)'},
 {id:'4',no:'4',name:'ストレッチ 第3層',color:0x69776b,body:'ストレッチルーフィング1000を、アスファルト1.0 kg/㎡で流し張りします。各層を下層に密着させ、空隙・気泡・しわがあれば各層ごとに補修します。',ref:'表9.2.3・9.2.4(4)(ｲ)(a)'},
 {id:'5',no:'5',name:'ルーフィング 第4層',color:0x867158,body:'アスファルトルーフィング1500を、アスファルト1.0 kg/㎡で流し張りします。ここまででシート4層です。使用量1.0 kg/㎡は張付け用アスファルトの量で、シート厚ではありません。',ref:'表9.2.3・9.2.2(3)(ｱ)'},
 {id:'6',no:'6',name:'アスファルト上掛け①',color:0x393a36,body:'アスファルトを1.0 kg/㎡ではけ塗りします。シートを増やす工程ではなく、表面をアスファルトで覆う工程です。',ref:'表9.2.3'},
 {id:'7',no:'7',name:'アスファルト上掛け②',color:0x474539,body:'さらにアスファルトを1.0 kg/㎡ではけ塗りします。4層のルーフィングと2回の上掛けで構成します。立上りは乾式保護材を採用する例として、端部をそろえ押え金物とシール材で納めます。',ref:'表9.2.3・9.2.4(4)(ｳ)(a)(d)'},
 {id:'8',no:'8',name:'絶縁用シート',color:0xe7dec0,body:'平場へ絶縁用シートを敷きます。模型は厚さ0.15mm以上のポリエチレンフィルムを選ぶ例で、重ね幅は100mm程度。立上り全面の層は省き、平場シートの端だけ立上り面等へ30mm程度張り上げます。入隅には成形緩衝材を設けます。',ref:'表9.2.3注1・9.2.2(10)・9.2.5(1)(3)'},
 {id:'9',no:'9',name:'保護コンクリート',color:0xc4bda9,body:'こて仕上げ・特記なしの例として平場80mm。内部に径6mm・100mm目の溶接金網を敷き込みます。立上り仕上り面から約600mmの位置に伸縮目地を示します。立上り保護は特記によるため、この模型では乾式保護材を仮定しています。',ref:'表9.2.3注2・3、9.2.2(11)、9.2.5(4)〜(6)'}
];
let dialog,cleanup,loading;
function loadThree(){
 if(window.THREE)return Promise.resolve();
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='./vendor/three.min.js';s.onload=resolve;s.onerror=()=>{s.remove();loading=null;reject(new Error('3D部品を読み込めませんでした。通信を確認して開き直してください。'));};document.head.appendChild(s);});return loading;
}
async function open(){
 if(dialog?.open)return;
 const viewport=document.querySelector('meta[name="viewport"]'),previousViewport=viewport?.content;
 const phone=document.documentElement.dataset.nnphone==='1';
 if(phone&&viewport)viewport.content='width=device-width, initial-scale=1, user-scalable=yes, viewport-fit=cover';
 dialog=document.createElement('dialog');dialog.id='a1-dialog';dialog.setAttribute('aria-label','A-1 施工工程の3D模型');
 dialog.innerHTML=`<div class="a1-head"><div><h2>A-1　屋根保護防水密着工法</h2><small>施工工程の3D模型　／　国交省 令和7年版・新築</small></div><button type="button" data-close aria-label="3D模型を閉じる">✕　閉じる</button></div>
 <div class="a1-tools"><label><span>表示</span><select data-mode><option value="cut">層の構成を見る</option><option value="upto">この工程まで</option><option value="only">この工程だけ</option><option value="complete">完成状態</option><option value="explode">分解して見る</option></select></label><label><span>注目する場所</span><select data-view><option value="all">全体</option><option value="corner">入隅・増張り</option><option value="lap">平場と立上りの張掛け</option><option value="top">立上り端部</option><option value="steel">保護層・金網</option></select></label><label><span>光</span><select data-sky><option value="std">標準</option><option value="asa">朝</option><option value="hiru">昼</option><option value="yuu">夕</option></select></label><label><input type="checkbox" data-color>層を色分け</label></div>
 <div class="a1-main"><div class="a1-view"><div class="a1-overlay">読み込み中…</div><div class="a1-pad">${[['zin','拡大'],['zout','縮小'],['rl','左回り'],['rr','右回り'],['tup','起こす'],['tdn','倒す'],['plan','真上'],['iso','全体']].map(([k,n])=>`<button type="button" data-nav="${k}" ${k==='iso'?'data-reset':''} title="${n}" aria-label="${n}"><img src="./icons/btn_d3_${k}.png" alt=""><span>${n}</span></button>`).join('')}</div><button class="a1-pan" type="button" aria-label="つまんで視点を移動" title="つまんで視点を移動"><img src="./icons/btn_pan.png" alt="移動"></button><div class="a1-key"><span><i></i>溶融アスファルト</span><span><i class="sheet"></i>ルーフィング</span></div></div>
 <aside class="a1-side"><div class="a1-side-title">施工工程 <small>押すと説明・表示が切り替わります</small></div><select data-step-mobile aria-label="施工工程を選ぶ">${steps.map((st,i)=>`<option value="${i}" ${i===3?'selected':''}>${st.no}　${st.name}</option>`).join('')}</select><div class="a1-steps">${steps.map((st,i)=>`<button type="button" class="a1-step" data-step="${i}" aria-pressed="false"><b>${st.no}</b><span>${st.name}</span></button>`).join('')}</div><label class="a1-component">材料を分ける <select data-component><option value="all">シート＋溶融アス</option><option value="asphalt">溶融アスだけ</option><option value="sheet">シートだけ</option></select></label><section class="a1-info" aria-live="polite"></section>
 <details><summary>原典・模型の条件・表示していない範囲</summary><p>出典：<a href="${SOURCE}#page=105" target="_blank" rel="noopener">公共建築工事標準仕様書（建築工事編）令和7年版（2025/5/12改定）</a>。表9.2.3（本文p.99）、材料p.96〜98、施工p.105〜108を基に納まりナビが独自に作成。国土交通省が作成・認定した模型ではありません。</p><p>下地2,400×1,800mm、立上り端部高さ620mm、面取り60mmは説明用の設定。立上り保護は乾式保護材を選ぶ例です。平場保護80mm・金網径6mm/100mm目・目地幅25mmは形に反映。防水材は薄層を識別できるよう厚さを誇張し、使用量から厚さを換算していません。溶融アスは塗り広げた端の揺らぎとはけ目を表現しています。大きな波打ち・しわ・塗りむらを良好な完成状態として示すものではありません。選択色は説明用で製品色を保証しません。</p><p>排水勾配・ドレン・配管・出隅・下地目地・改修下地は今回の模型の範囲外。平場の幅方向継目と立上りとの張掛けを示し、長手方向継目や金網の継手は省略。勾配・端部高さ・材料・立上り保護の仕様は実際の設計図書と製造所仕様で確認してください。</p></details></aside></div><div class="a1-footer"><span class="a1-pc-help">左ドラッグ：移動　｜　Ctrl＋左／右ドラッグ：回転　｜　ホイール：拡大</span><span>防水材の厚さ・切欠きは説明用に強調</span></div>`;
 const owned=dialog;document.body.append(owned);
 // Page CSS zoom must not enlarge a viewport-sized modal beyond the screen.
 function fitDialog(){let z=1;for(let e=owned.parentElement;e;e=e.parentElement)z*=parseFloat(getComputedStyle(e).zoom)||1;owned.style.zoom=String(1/z);}
 fitDialog();owned.showModal();const zoomObserver=new MutationObserver(fitDialog);zoomObserver.observe(document.body,{attributes:true,attributeFilter:['style','class']});zoomObserver.observe(document.documentElement,{attributes:true,attributeFilter:['style','class']});window.addEventListener('resize',fitDialog);
 owned.querySelector('[data-close]').onclick=()=>owned.close();
 owned.addEventListener('close',()=>{cleanup?.();cleanup=null;zoomObserver.disconnect();window.removeEventListener('resize',fitDialog);owned.remove();if(phone&&viewport)viewport.content=previousViewport;},{once:true});
 try{await loadThree();if(dialog===owned&&owned.isConnected&&owned.open)build(owned);}catch(e){if(owned.isConnected){owned.querySelector('.a1-view').innerHTML='<p class="a1-error"></p>';owned.querySelector('.a1-error').textContent=e.message;}}
}
// Same sky palettes and generation as zumen_sekisan.html, nn-sky-js.
var SKY={
  asa:{ n:'朝', zen:'#5b8fce', mid:'#9dc2e6', hor:'#ffd0a0', haze:0.70, g0:'#8d8f84', g1:'#55584f',
        az:0.28, el:0.16, core:'#fff6e2', glow:'rgba(255,198,138,.55)', cloud:0.55, ccol:'#fff3e4',
        sun:2.0, scol:0xffe2bc, hemi:0.42, env:0.95, exp:0.86, gnd:'#8a8d80', dark:false },
  hiru:{n:'昼', zen:'#1f5fbe', mid:'#5f9ede', hor:'#b9d6ee', haze:0.55, g0:'#8d9084', g1:'#565a50',
        az:0.30, el:0.62, core:'#ffffff', glow:'rgba(255,246,222,.50)', cloud:0.80, ccol:'#ffffff',
        sun:2.7, scol:0xfff6e8, hemi:0.40, env:1.00, exp:0.82, gnd:'#8b8e82', dark:false },
  yuu:{ n:'夕', zen:'#2b3f74', mid:'#7b6a9a', hor:'#ff9a52', g0:'#6a655c', g1:'#3b3a36',
        az:0.72, el:0.07, core:'#fff0c8', glow:'rgba(255,140,60,.60)', cloud:0.70, ccol:'#ffcfa0',
        sun:1.7, scol:0xffb070, hemi:0.34, env:0.85, exp:0.92, gnd:'#6b665d', dark:false },
  /* ★2026-09-04i 「夜」は削除（本人の指示「夜はいらない」）。
     代わりに「標準」＝ふつうに見やすい光（薄曇りの明るい屋外・太陽は高く影は短い・色かぶりなし）を
     いちばん前に置き、既定にした。朝・昼・夕は雰囲気を見たいときのため。 */
  /* ★2026-09-06f 標準の地面を茶色に（本人の指摘「背景がグレーだと自分で作った3Dが
     視認しづらい。標準は背景茶色のほうがよい。地面を連想するし対象物が目立つ」）。
     建物はコンクリートの灰色なので、地面を補色寄りの茶にすると輪郭が立つ。 */
  std:{ n:'標準', zen:'#8fb3d6', mid:'#c9dbea', hor:'#eef2f5', haze:0.85, g0:'#9c7a52', g1:'#5f4a33',
        az:0.35, el:0.80, core:'#ffffff', glow:'rgba(255,255,255,.35)', cloud:0.30, ccol:'#ffffff',
        sun:1.9, scol:0xffffff, hemi:0.70, env:1.05, exp:0.96, gnd:'#8a6c49', dark:false }
};
/* 標準を先頭に（表示順） */
SKY={std:SKY.std, asa:SKY.asa, hiru:SKY.hiru, yuu:SKY.yuu};
function lcg(s){ var x=s>>>0; return function(){ x=(x*1664525+1013904223)>>>0; return x/4294967296; }; }
function skyCanvas(P, W, H){
  W=W||1024; H=H||512;
  var c=document.createElement('canvas'); c.width=W; c.height=H;
  var g=c.getContext('2d');
  var gr=g.createLinearGradient(0,0,0,H*0.5);
  gr.addColorStop(0,P.zen); gr.addColorStop(0.62,P.mid); gr.addColorStop(0.93,P.hor); gr.addColorStop(1,P.hor);
  g.fillStyle=gr; g.fillRect(0,0,W,H*0.5);
  var gg=g.createLinearGradient(0,H*0.5,0,H);
  gg.addColorStop(0,P.g0); gg.addColorStop(1,P.g1);
  g.fillStyle=gg; g.fillRect(0,H*0.5,W,H*0.5);
  /* ★地平線のもや。無いと地面と空がすっぱり切れて、地面が砂漠のように見える */
  var hz=g.createLinearGradient(0,H*0.44,0,H*0.66);
  hz.addColorStop(0,'rgba(0,0,0,0)'); hz.addColorStop(0.28,P.hor);
  hz.addColorStop(0.5,P.hor); hz.addColorStop(1,'rgba(0,0,0,0)');
  g.globalAlpha=(P.haze==null?0.82:P.haze); g.fillStyle=hz; g.fillRect(0,H*0.44,W,H*0.22); g.globalAlpha=1;
  /* 雲（同じ絵になるよう自前の数列。左右の端をまたぐぶんも描いて継ぎ目を出さない） */
  var r=lcg(7);
  try{ g.filter='blur(7px)'; }catch(_){}
  g.fillStyle=P.ccol;
  for(var i=0;i<30;i++){
    var cx=r()*W, cy=H*(0.04+r()*0.44), rx=W*(0.028+r()*0.075), ry=rx*(0.15+r()*0.13);
    g.globalAlpha=P.cloud*(0.30+r()*0.55);
    for(var k=-1;k<=1;k++){ g.beginPath(); g.ellipse(cx+k*W, cy, rx, ry, 0, 0, 6.2832); g.fill(); }
  }
  g.globalAlpha=1; try{ g.filter='none'; }catch(_){}
  /* 太陽（月）。まわりのにじみも一緒に描く */
  var sx=P.az*W, sy=(0.5-P.el*0.5)*H, R=H*0.30;
  var rg=g.createRadialGradient(sx,sy,0,sx,sy,R);
  rg.addColorStop(0,P.core); rg.addColorStop(0.05,P.core);
  rg.addColorStop(0.22,P.glow); rg.addColorStop(1,'rgba(255,255,255,0)');
  g.globalCompositeOperation='lighter'; g.fillStyle=rg;
  for(var k2=-1;k2<=1;k2++){ g.beginPath(); g.arc(sx+k2*W, sy, R, 0, 6.2832); g.fill(); }
  g.globalCompositeOperation='source-over';
  return c;
}

function build(root){
 const T=window.THREE,view=root.querySelector('.a1-view'),info=root.querySelector('.a1-info'),overlay=root.querySelector('.a1-overlay');
 const scene=new T.Scene();
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
 const canvas=renderer.domElement;canvas.setAttribute('aria-label','A-1防水模型。回転・拡大は上の視点と拡大ボタンでも操作できます。');view.prepend(canvas);
 const camera=new T.PerspectiveCamera(50,1,.01,60),target=new T.Vector3(0,.23,0);
 let theta=.94,phi=1.02,distance=4.6,selected=3,mode='cut',component='all',colors=false,disposed=false;
 const model=new T.Group();scene.add(model);const groups=[];const mats=new Set(),textures=new Set();
 const hemi=new T.HemisphereLight(0xdceaff,0x8a9a8c,.70);scene.add(hemi);
 const light=new T.DirectionalLight(0xfff6e5,3.2);light.position.set(-2,5,4);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:12});light.shadow.normalBias=.0004;light.shadow.bias=-.00002;scene.add(light);
 let skyTexture,envTarget;
 function applySky(kind){const P=SKY[kind]||SKY.std;skyTexture?.dispose();envTarget?.dispose();skyTexture=new T.CanvasTexture(skyCanvas(P,1024,512));skyTexture.colorSpace=T.SRGBColorSpace;skyTexture.mapping=T.EquirectangularReflectionMapping;scene.background=skyTexture;const small=new T.CanvasTexture(skyCanvas(P,256,128));small.colorSpace=T.SRGBColorSpace;small.mapping=T.EquirectangularReflectionMapping;const pm=new T.PMREMGenerator(renderer);envTarget=pm.fromEquirectangular(small);small.dispose();pm.dispose();scene.environment=envTarget.texture;renderer.toneMappingExposure=P.exp;hemi.intensity=P.hemi;light.color.setHex(P.scol);light.intensity=P.sun;const a=(P.az-.5)*Math.PI*2,e=P.el*Math.PI/2;light.position.set(5*Math.cos(a)*Math.cos(e),5*Math.sin(e),5*Math.sin(a)*Math.cos(e));root.dataset.sky=kind;render();}
 let initialSky='std';try{const k=localStorage.getItem('nn_zumen_sky');if(SKY[k])initialSky=k;}catch(_){}
 root.querySelector('[data-sky]').value=initialSky;root.querySelector('[data-sky]').onchange=e=>applySky(e.target.value);
 applySky(initialSky);
 function grain(){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),im=ctx.createImageData(512,512);let seed=9127;for(let i=0;i<im.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const x=(i/4)%512,y=Math.floor(i/2048);const v=Math.max(60,Math.min(250,164+(seed%70)+15*Math.sin(x*.15)*Math.sin(y*.21)));im.data.set([v,v,v,255],i);}ctx.putImageData(im,0,0);const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(2,2);tex.anisotropy=renderer.capabilities.getMaxAnisotropy();tex.colorSpace=T.SRGBColorSpace;textures.add(tex);return tex;}
 const noise=grain();
 const flowCanvas=document.createElement('canvas');flowCanvas.width=flowCanvas.height=512;const flowCtx=flowCanvas.getContext('2d'),flowImage=flowCtx.createImageData(512,512);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){const v=128+24*Math.sin(y*.12+2*Math.sin(x*.018))+10*Math.sin(y*.42+x*.017)+5*Math.sin(x*.51+y*.27),k=(y*512+x)*4;flowImage.data.set([v,v,v,255],k);}flowCtx.putImageData(flowImage,0,0);
 const flow=new T.CanvasTexture(flowCanvas);flow.wrapS=flow.wrapT=T.RepeatWrapping;flow.repeat.set(2,2);flow.anisotropy=renderer.capabilities.getMaxAnisotropy();textures.add(flow);
 function molten(){const m=new T.MeshPhysicalMaterial({color:0x151a20,roughness:.29,metalness:0,clearcoat:.3,clearcoatRoughness:.24,bumpMap:flow,bumpScale:.0015,roughnessMap:flow,side:T.DoubleSide,envMapIntensity:1.1});m.userData.kind='asphalt';mats.add(m);return m;}
 function material(color,rough= .85,concrete=false){const m=new T.MeshStandardMaterial({color,roughness:rough,metalness:0,side:T.DoubleSide,map:concrete?noise:null,bumpMap:noise,bumpScale:concrete?.003:.001});m.userData.base=color;mats.add(m);return m;}
 const concrete=material(0xb5b7b4,.97,true),steel=material(0x666d67,.4),dark=material(0x252924,.5);steel.metalness=.6;
 function add(g,geo,mat,id){const m=new T.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;m.userData.step=id;g.add(m);return m;}
 function box(g,x,y,z,w,h,d,mat,id){const m=add(g,new T.BoxGeometry(w,h,d),mat,id);m.position.set(x,y,z);return m;}
 // Extrude an independently defined z/y section along the x axis.
 function prism(g,pts,x0,x1,mat,id){const s=new T.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));s.closePath();const geo=new T.ExtrudeGeometry(s,{depth:x1-x0,bevelEnabled:false,steps:1});const p=geo.attributes.position;for(let i=0;i<p.count;i++){const z=p.getX(i),y=p.getY(i),x=p.getZ(i);p.setXYZ(i,x+x0,y,z);}geo.computeVertexNormals();return add(g,geo,mat,id);}
 function ribbon(g,path,th,x0,x1,mat,id){const outer=path.map(([z,y])=>[z+th,y+th]);return prism(g,path.concat(outer.reverse()),x0,x1,mat,id);}
 function coating(g,path,th,x0,x1,mat,id,wavy){
  const pts=[];let length=0;path.forEach((p,i)=>{if(!i){pts.push({z:p[0],y:p[1],s:0});return;}const prev=path[i-1],dz=p[0]-prev[0],dy=p[1]-prev[1],len=Math.hypot(dz,dy),n=Math.ceil(len/.025);for(let k=1;k<=n;k++)pts.push({z:prev[0]+dz*k/n,y:prev[1]+dy*k/n,s:length+len*k/n});length+=len;});
  const nx=48,rows=pts.length,positions=[],uv=[],indices=[];
  for(let side=0;side<2;side++)for(let j=0;j<rows;j++){const p=pts[j],prev=pts[Math.max(0,j-1)],next=pts[Math.min(rows-1,j+1)],dz=next.z-prev.z,dy=next.y-prev.y,L=Math.hypot(dz,dy)||1,ny=-dz/L,nz=dy/L;
   for(let k=0;k<=nx;k++){const u=k/nx,edge=wavy?(.013*Math.sin(p.s*19+id)+.006*Math.sin(p.s*47+.7*id)):0,x=x0+edge*(1-u)+(x1-x0)*u,ripple=side?th+.0007*Math.sin(x*38+p.s*16)+.00035*Math.cos(p.s*73+x*9):0;positions.push(x,p.y+ny*ripple,p.z+nz*ripple);uv.push(x,p.s);}}
  const stride=nx+1,off=rows*stride;
  for(let j=0;j<rows-1;j++)for(let k=0;k<nx;k++){const a=j*stride+k,b=a+1,c=a+stride,d=c+1;indices.push(a,c,b,b,c,d,a+off,b+off,c+off,b+off,d+off,c+off);}
  const rim=[];for(let k=0;k<=nx;k++)rim.push(k);for(let j=1;j<rows;j++)rim.push(j*stride+nx);for(let k=nx-1;k>=0;k--)rim.push((rows-1)*stride+k);for(let j=rows-2;j>0;j--)rim.push(j*stride);
  rim.forEach((a,k)=>{const b=rim[(k+1)%rim.length];indices.push(a,b,a+off,b,b+off,a+off);});
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const m=add(g,geo,mat,id);m.userData.materialKind='asphalt';return m;
 }
 function clearModel(){model.traverse(o=>o.geometry?.dispose());model.clear();groups.length=0;for(const m of [...mats])if(![concrete,steel,dark].includes(m)){m.dispose();mats.delete(m);}}
 const accents=[0x9e9789,0x70502d,0xb37a3f,0x6a8153,0xb88647,0x59817b,0x936a50,0x485665,0x694e67,0xe2d4a1,0xbeb7a6];
 function rebuild(){
  clearModel();
  const isCut=mode==='cut',base=new T.Group();model.add(base);groups.push(base);
  box(base,0,-.12,.06,2.4,.24,1.8,concrete,0);box(base,0,.27,-.84,2.4,.78,.12,concrete,0);
  prism(base,[[-.78,0],[-.72,0],[-.78,.06]],-1.2,1.2,concrete,0);
  let offset=.003;
  for(let i=1;i<steps.length;i++){
   const g=new T.Group();g.userData.step=i;model.add(g);groups.push(g);
   g.visible=mode==='only'?i===selected:mode==='upto'?i<=selected:true;
   if(mode==='explode')g.position.set(0,i*.09,i*.02);
   const x0=isCut?-1.18+(i-1)*.16:-1.18,x1=1.18;
   const col=colors?accents[i]:(i>=2&&i<=6?0x545957:steps[i].color),m=(i===7||i===8)?molten():material(col,i===1?.45:.91,i===10);if(i>=3&&i<=6)m.userData.kind='sheet';
   m.userData.layer=i;if(colors&&i===selected){m.emissive.setHex(0x283522);m.emissiveIntensity=.15;}
   if(i===1){ribbon(g,[[.94,offset],[-.72+offset,offset],[-.78+offset,.06+offset],[-.78+offset,.62]],.005,x0,x1,m,i);offset+=.006;}
   else if(i===2){ribbon(g,[[-.58,offset],[-.72+offset,offset],[-.78+offset,.06+offset],[-.78+offset,.20]],.008,x0,x1,m,i);offset+=.01;}
   else if(i>=3&&i<=6){
    // Floor sheets: 100 mm transverse lap; adjacent layers have staggered seams.
    const seam=-.35+(i-3)*.19,split=Math.max(x0,Math.min(x1,seam));
    const asphalt=molten();asphalt.userData.layer=i;
    coating(g,[[.94,offset],[-.58,offset]],.006,x0,x1,asphalt,i,isCut);
    coating(g,[[-.40,offset+.019],[-.72+offset,offset+.019],[-.78+offset,.06+offset],[-.78+offset,.62]],.005,x0,x1,asphalt,i,isCut);
    const sheetX=isCut?x0+.065:x0;const sheetSplit=Math.max(sheetX,split);
    if(sheetSplit>sheetX)box(g,(sheetX+sheetSplit+.10)/2,offset+.012,.18,sheetSplit+.10-sheetX,.010,1.52,m,i);
    if(sheetSplit<x1)box(g,(sheetSplit+x1)/2,offset+.023,.18,x1-sheetSplit,.010,1.52,m,i);
    // Separate upstand sheet laps the floor by 180 mm beyond z=-.58.
    ribbon(g,[[-.40,offset+.026],[-.72+offset,offset+.026],[-.78+offset,.06+offset],[-.78+offset,.62]],.010,sheetX,x1,m,i);
    offset+=.039;
   }else if(i===7||i===8){coating(g,[[.94,offset],[-.72+offset,offset],[-.78+offset,.06+offset],[-.78+offset,.62]],.007,x0,x1,m,i,isCut);offset+=.009;
    if(i===8){box(g,(x0+x1)/2,.628,-.78+offset,(x1-x0),.030,.015,steel,i);box(g,(x0+x1)/2,.648,-.78+offset,(x1-x0),.010,.009,dark,i);for(let x=x0+.05;x<x1;x+=.4){const screw=add(g,new T.SphereGeometry(.006,8,6),steel,i);screw.position.set(x,.628,-.755+offset);}}
   }else if(i===9){
    // Flat separator with only a 30 mm perimeter upturn, not a full upstand layer.
    const zback=-.51;box(g,(x0+x1)/2,offset+.002,(zback+.94)/2,x1-x0,.004,.94-zback,m,i);box(g,(x0+x1)/2,offset+.015,zback,x1-x0,.030,.004,m,i);
    box(g,(x0+x1)/2,offset+.042,zback-.022,x1-x0,.084,.04,material(0x978d70),i);offset+=.006;
   }else if(i===10){
    const zback=-.49,joint=.11,jw=.025,coverX=isCut?Math.max(x0,.76):x0;
    box(g,(coverX+x1)/2,offset+.04,(zback+joint-jw/2)/2,x1-coverX,.08,joint-jw/2-zback,m,i);
    box(g,(coverX+x1)/2,offset+.04,(joint+jw/2+.94)/2,x1-coverX,.08,.94-joint-jw/2,m,i);
    box(g,(x0+x1)/2,offset+.04,joint,x1-x0,.08,jw,dark,i);
    // Welded wire mesh, 6 mm diameter at 100 mm centres. Reveal in cutaway only.
    const wireMat=steel;
    function rod(a,b){const va=new T.Vector3(...a),vb=new T.Vector3(...b),v=vb.clone().sub(va),mesh=add(g,new T.CylinderGeometry(.003,.003,v.length(),6),wireMat,i);mesh.position.copy(va.add(vb).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());}
    for(let x=Math.ceil(x0*10)/10;x<x1;x+=.1){rod([x,offset+.035,zback+.02],[x,offset+.035,joint-.025]);rod([x,offset+.035,joint+.025],[x,offset+.035,.92]);}
    for(let z=-.4;z<.94;z+=.1)if(Math.abs(z-joint)>.025)rod([x0,offset+.041,z],[x1,offset+.041,z]);
    box(g,(x0+x1)/2,.44,-.52,x1-x0,.38,.035,material(0xc3b997,.9),i);
   }
  }
  if(component!=='all'){groups.forEach((g,i)=>{g.visible=i===0||i===selected;if(i===selected)g.children.forEach(m=>m.visible=m.material.userData.kind===component);});}
  const part=root.querySelector('[data-component]');part.disabled=selected<3||selected>6;part.value=component;
  root.dataset.stateMode=mode;root.dataset.stateStep=steps[selected].id;
  overlay.textContent=mode==='cut'?'各層を切り欠いた説明用断面':mode==='explode'?'層間を離した説明表示（実際は密着）':mode==='only'?'選択工程のみ・下地を併記':mode==='upto'?'選択した工程までを表示':'完成状態（乾式立上り保護の一例）';
  paint();render();
 }
 function paint(){const s=steps[selected];root.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.step)===selected?'true':'false'));info.innerHTML=`<h3>${s.no==='増'?'先行処理':s.no==='下地'?'施工前':'工程 '+s.no}　${s.name}</h3><p>${s.body}</p><p class="a1-ref">根拠：${s.ref}</p>`;}
 function render(){if(disposed)return;camera.position.set(target.x+distance*Math.sin(phi)*Math.cos(theta),target.y+distance*Math.cos(phi),target.z+distance*Math.sin(phi)*Math.sin(theta));camera.lookAt(target);renderer.render(scene,camera);}
 function resize(){const w=view.clientWidth,h=view.clientHeight;if(w&&h){const rect=view.getBoundingClientRect(),scale=rect.width/w;renderer.setPixelRatio(Math.min(3,Math.max(1,devicePixelRatio*scale)));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(!root.dataset.sized){root.dataset.sized='1';reset();}render();}}
 function choose(i){selected=i;component='all';rebuild();root.querySelector('[data-step-mobile]').value=String(i);}
 root.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.step)));
 root.querySelector('[data-step-mobile]').onchange=e=>choose(Number(e.target.value));
 root.querySelector('[data-mode]').onchange=e=>{mode=e.target.value;component='all';rebuild();if(mode==='explode')fit();};
 root.querySelector('[data-component]').onchange=e=>{component=e.target.value;if(component!=='all'){mode='only';root.querySelector('[data-mode]').value='only';}rebuild();};
 root.querySelector('[data-color]').onchange=e=>{colors=e.target.checked;rebuild();};
 function fit(){const bounds=new T.Box3().setFromObject(model),sphere=bounds.getBoundingSphere(new T.Sphere());target.copy(sphere.center);const vfov=camera.fov*Math.PI/360,hfov=Math.atan(Math.tan(vfov)*camera.aspect);distance=Math.max(2.2,sphere.radius/Math.sin(Math.min(vfov,hfov)))*1.04;render();}
 function reset(){theta=.94;phi=1.02;fit();}
 function rotate(deg){if(phi<.3)phi=.9;theta+=deg*Math.PI/180;render();}
 function tilt(deg){phi=T.MathUtils.clamp(phi+deg*Math.PI/180,.15,Math.PI/2);render();}
 root.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{const k=b.dataset.nav;if(k==='zin')distance=Math.max(.15,distance/1.25);if(k==='zout')distance=Math.min(25,distance*1.25);if(k==='rl')rotate(-15);if(k==='rr')rotate(15);if(k==='tup')tilt(-10);if(k==='tdn')tilt(10);if(k==='plan'){theta=Math.PI/2;phi=.16;fit();}if(k==='iso'){root.querySelector('[data-view]').value='all';reset();}render();});
 root.querySelector('[data-view]').onchange=e=>{const v=e.target.value;reset();if(v==='corner'){target.set(-.45,.15,-.52);distance=1.7;phi=1.0;}if(v==='lap'){target.set(-.1,.2,-.35);distance=1.65;phi=.7;}if(v==='top'){target.set(.1,.60,-.63);distance=1.6;phi=1.05;}if(v==='steel'){target.set(.65,.3,.2);distance=2;phi=.55;}render();};
 // Match the actual camera basis, signs and sensitivity of the 3D projection.
 function pan(dx,dy){const k=distance*.0016;target.x-=(Math.sin(theta)*dx+Math.cos(theta)*dy)*k;target.z+=(Math.cos(theta)*dx-Math.sin(theta)*dy)*k;}
 const pointers=new Map();let down=null,gesture=null,moved=false,dragMode='pan';
 function regroup(){const ids=[...pointers.keys()];gesture=ids.length>=2?{a:ids[0],b:ids[1],fresh:false}:null;}
 canvas.oncontextmenu=e=>e.preventDefault();
 canvas.onpointerdown=e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});down={x:e.clientX,y:e.clientY,button:e.button};moved=false;dragMode=e.pointerType==='mouse'&&(e.button!==0||e.ctrlKey)?'orbit':'pan';regroup();if(pointers.size>1)moved=true;};
 canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;e.preventDefault();const last=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(gesture){moved=true;const a=pointers.get(gesture.a),b=pointers.get(gesture.b);if(!a||!b)return;if(e.pointerId!==gesture.a&&e.pointerId!==gesture.b)return;const d=Math.hypot(b.x-a.x,b.y-a.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;if(!gesture.fresh){Object.assign(gesture,{fresh:true,d,r:distance,mx,my});return;}if(d>10&&gesture.d>10)distance=T.MathUtils.clamp(gesture.r*gesture.d/d,.15,25);pan(mx-gesture.mx,my-gesture.my);gesture.mx=mx;gesture.my=my;
  }else{const dx=e.clientX-last.x,dy=e.clientY-last.y;if(dragMode==='orbit'){theta-=dx*.006;phi=T.MathUtils.clamp(phi-dy*.005,.15,Math.PI/2);}else pan(dx,dy);if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>4)moved=true;}render();};
 function release(e){pointers.delete(e.pointerId);regroup();}
 canvas.onpointerup=e=>{release(e);if(!moved&&down&&down.button===0&&!e.ctrlKey){const r=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(model.children,true).find(h=>{let o=h.object;while(o!==model){if(!o.visible)return false;o=o.parent;}return true;});if(hit)choose(hit.object.userData.step);}down=null;};
 const cancel=e=>{release(e);down=null;moved=true;};canvas.onpointercancel=cancel;canvas.onlostpointercapture=cancel;
 const resetGesture=()=>{pointers.clear();gesture=null;down=null;};window.addEventListener('blur',resetGesture);document.addEventListener('visibilitychange',resetGesture);
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=T.MathUtils.clamp(distance*(e.deltaY>0?1.12:1/1.12),.15,25);render();},{passive:false});
 const pad=root.querySelector('.a1-pan');let padDrag;
 pad.onpointerdown=e=>{e.preventDefault();pad.setPointerCapture(e.pointerId);padDrag={x:e.clientX,y:e.clientY,tx:target.x,tz:target.z};};
 pad.onpointermove=e=>{if(!padDrag)return;const k=distance*2.2/(view.clientHeight||600),dx=e.clientX-padDrag.x,dy=e.clientY-padDrag.y,fx=Math.cos(theta),fz=Math.sin(theta),rx=-fz,rz=fx;target.x=padDrag.tx-(rx*dx-fx*dy)*k;target.z=padDrag.tz-(rz*dx-fz*dy)*k;render();};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,()=>padDrag=null);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();overlay.textContent='3D表示が中断しました。一度閉じて開き直してください。';});
 const observer=new ResizeObserver(resize);observer.observe(view);
 cleanup=()=>{disposed=true;observer.disconnect();clearModel();for(const m of mats)m.dispose();for(const t of textures)t.dispose();skyTexture?.dispose();envTarget?.dispose();light.shadow.map?.dispose();window.removeEventListener('blur',resetGesture);document.removeEventListener('visibilitychange',resetGesture);renderer.dispose();renderer.forceContextLoss();};
 // Read-only inspection hook for regression checks (actual rendered geometry).
 root._a1={scene,model,camera,renderer,groups,get state(){return {theta,phi,distance,target:target.toArray(),pointers:pointers.size};}};
 rebuild();resize();root.querySelector('[data-close]').focus();
}
window.NN_A1={open};
document.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).get('model')==='A-1'&&typeof specById!=='undefined'){const s=Object.values(specById).find(s=>s.code==='A-1');if(s){selectAndShow({type:'std',id:s.id});open();}}});
})();
