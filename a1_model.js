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
 dialog.innerHTML=`<div class="a1-head"><div><h2>A-1　屋根保護防水密着工法</h2><small>国交省 令和7年版｜新築・コンクリート下地｜納まりナビ独自模型</small></div><button type="button" data-close aria-label="3D模型を閉じる">閉じる ✕</button></div>
 <div class="a1-tools"><label>表示 <select data-mode><option value="cut">各層を見せる断面</option><option value="upto">選んだ工程まで</option><option value="only">選んだ工程だけ</option><option value="complete">完成状態</option><option value="explode">層を離して見る</option></select></label><label>視点 <select data-view><option value="all">全体</option><option value="corner">入隅・増張り</option><option value="lap">平場と立上りの張掛け</option><option value="top">立上り端部</option><option value="steel">保護層・金網</option><option value="plan">真上</option></select></label><button type="button" data-zoom="in" aria-label="拡大">＋</button><button type="button" data-zoom="out" aria-label="縮小">−</button><button type="button" data-reset>視点を戻す</button><label><input type="checkbox" data-color>層を色分け</label></div>
 <div class="a1-main"><div class="a1-view"><div class="a1-overlay">読み込み中…</div><div class="a1-help">ドラッグで回転／ホイール・2本指で拡大／材料を押して工程確認</div></div><aside class="a1-steps" aria-label="施工工程">${steps.map((s,i)=>`<button type="button" class="a1-step" data-step="${i}" aria-pressed="false"><b>${s.no}</b><span>${s.name}</span></button>`).join('')}</aside></div>
 <section class="a1-info" aria-live="polite"></section><div class="a1-status">断面表示の切欠き・層間の隙間・防水材の厚さは、内部を見せるための表現です。</div>
 <details><summary>原典・模型の条件・表示していない範囲</summary><p>出典：<a href="${SOURCE}#page=105" target="_blank" rel="noopener">公共建築工事標準仕様書（建築工事編）令和7年版（2025/5/12改定）</a>。表9.2.3（本文p.99）、材料p.96〜98、施工p.105〜108を基に納まりナビが独自に作成。国土交通省が作成・認定した模型ではありません。</p><p>下地2,400×1,800mm、立上り端部高さ620mm、面取り60mmは説明用の設定。立上り保護は乾式保護材を選ぶ例です。平場保護80mm・金網径6mm/100mm目・目地幅25mmは形に反映。防水材は薄層を識別できるよう厚さを誇張し、使用量から厚さを換算していません。選択色は説明用で製品色を保証しません。</p><p>排水勾配・ドレン・配管・出隅・下地目地・改修下地は今回の模型の範囲外。平場の幅方向継目と立上りとの張掛けを示し、長手方向継目や金網の継手は省略。勾配・端部高さ・材料・立上り保護の仕様は実際の設計図書と製造所仕様で確認してください。</p></details>`;
 const owned=dialog;document.body.append(owned);owned.showModal();
 owned.querySelector('[data-close]').onclick=()=>owned.close();
 owned.addEventListener('close',()=>{cleanup?.();cleanup=null;owned.remove();if(phone&&viewport)viewport.content=previousViewport;},{once:true});
 try{await loadThree();if(dialog===owned&&owned.isConnected&&owned.open)build(owned);}catch(e){if(owned.isConnected){owned.querySelector('.a1-view').innerHTML='<p class="a1-error"></p>';owned.querySelector('.a1-error').textContent=e.message;}}
}
function build(root){
 const T=window.THREE,view=root.querySelector('.a1-view'),info=root.querySelector('.a1-info'),overlay=root.querySelector('.a1-overlay');
 const scene=new T.Scene();scene.background=new T.Color(0xeee7d7);
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
 const canvas=renderer.domElement;canvas.setAttribute('aria-label','A-1防水模型。回転・拡大は上の視点と拡大ボタンでも操作できます。');view.prepend(canvas);
 const camera=new T.PerspectiveCamera(38,1,.01,40),target=new T.Vector3(0,.23,0);
 let theta=.68,phi=.90,distance=4.6,selected=6,mode='cut',colors=false,disposed=false;
 const model=new T.Group();scene.add(model);const groups=[];const mats=new Set(),textures=new Set();
 const hemi=new T.HemisphereLight(0xfff8e4,0x7c817a,2.2);scene.add(hemi);
 const light=new T.DirectionalLight(0xfff6e5,3.2);light.position.set(-2,5,4);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:12});light.shadow.normalBias=.015;scene.add(light);
 const fill=new T.DirectionalLight(0xe0ebff,.9);fill.position.set(3,2,-1);scene.add(fill);
 function grain(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),im=ctx.createImageData(128,128);let seed=9127;for(let i=0;i<im.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=170+(seed%65);im.data.set([v,v,v,255],i);}ctx.putImageData(im,0,0);const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(5,5);textures.add(tex);return tex;}
 const noise=grain();
 function material(color,rough= .85,concrete=false){const m=new T.MeshStandardMaterial({color,roughness:rough,metalness:0,side:T.DoubleSide,map:concrete?noise:null,bumpMap:noise,bumpScale:concrete?.002:.0005});m.userData.base=color;mats.add(m);return m;}
 const concrete=material(0xb5afa2,.98,true),steel=material(0x666d67,.4),dark=material(0x252924,.5);steel.metalness=.6;
 function add(g,geo,mat,id){const m=new T.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;m.userData.step=id;g.add(m);return m;}
 function box(g,x,y,z,w,h,d,mat,id){const m=add(g,new T.BoxGeometry(w,h,d),mat,id);m.position.set(x,y,z);return m;}
 // Extrude an independently defined z/y section along the x axis.
 function prism(g,pts,x0,x1,mat,id){const s=new T.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));s.closePath();const geo=new T.ExtrudeGeometry(s,{depth:x1-x0,bevelEnabled:false,steps:1});const p=geo.attributes.position;for(let i=0;i<p.count;i++){const z=p.getX(i),y=p.getY(i),x=p.getZ(i);p.setXYZ(i,x+x0,y,z);}geo.computeVertexNormals();return add(g,geo,mat,id);}
 function ribbon(g,path,th,x0,x1,mat,id){const outer=path.map(([z,y])=>[z+th,y+th]);return prism(g,path.concat(outer.reverse()),x0,x1,mat,id);}
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
   const col=colors?accents[i]:(i>=3&&i<=6?0x565750:steps[i].color),m=material(col,i===1||i===7||i===8?.48:.9,i===10);
   m.userData.layer=i;m.emissive.setHex(i===selected?0x594317:0);m.emissiveIntensity=.35;
   if(i===1){ribbon(g,[[.94,offset],[-.72+offset,offset],[-.78+offset,.06+offset],[-.78+offset,.62]],.005,x0,x1,m,i);offset+=.006;}
   else if(i===2){ribbon(g,[[-.58,offset],[-.72+offset,offset],[-.78+offset,.06+offset],[-.78+offset,.20]],.008,x0,x1,m,i);offset+=.01;}
   else if(i>=3&&i<=6){
    // Floor sheets: 100 mm transverse lap; adjacent layers have staggered seams.
    const seam=-.35+(i-3)*.19,split=Math.max(x0,Math.min(x1,seam));
    const asphalt=material(0x242922,.45);asphalt.userData.layer=i;
    ribbon(g,[[.94,offset],[-.58,offset]],.005,x0,x1,asphalt,i);
    if(split>x0)box(g,(x0+split+.10)/2,offset+.011,.18,split+.10-x0,.010,1.52,m,i);
    if(split<x1)box(g,(split+x1)/2,offset+.018,.18,x1-split,.010,1.52,m,i);
    // Separate upstand sheet laps the floor by 180 mm beyond z=-.58.
    ribbon(g,[[-.40,offset+.026],[-.72+offset,offset+.026],[-.78+offset,.06+offset],[-.78+offset,.62]],.010,x0,x1,m,i);
    offset+=.039;
   }else if(i===7||i===8){ribbon(g,[[.94,offset],[-.72+offset,offset],[-.78+offset,.06+offset],[-.78+offset,.62]],.007,x0,x1,m,i);offset+=.009;
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
  root.dataset.stateMode=mode;root.dataset.stateStep=steps[selected].id;
  overlay.textContent=mode==='cut'?'各層を切り欠いた説明用断面':mode==='explode'?'層間を離した説明表示（実際は密着）':mode==='only'?'選択工程のみ・下地を併記':mode==='upto'?'選択した工程までを表示':'完成状態（乾式立上り保護の一例）';
  paint();render();
 }
 function paint(){const s=steps[selected];root.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.step)===selected?'true':'false'));info.innerHTML=`<h3>${s.no==='増'?'先行処理':s.no==='下地'?'施工前':'工程 '+s.no}　${s.name}</h3><p>${s.body}</p><p class="a1-ref">根拠：${s.ref}</p>`;}
 function render(){if(disposed)return;camera.position.set(target.x+distance*Math.sin(phi)*Math.sin(theta),target.y+distance*Math.cos(phi),target.z+distance*Math.sin(phi)*Math.cos(theta));camera.lookAt(target);renderer.render(scene,camera);}
 function resize(){const w=view.clientWidth,h=view.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render();}}
 function choose(i){selected=i;rebuild();}
 root.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.step)));
 root.querySelector('[data-mode]').onchange=e=>{mode=e.target.value;rebuild();};
 root.querySelector('[data-color]').onchange=e=>{colors=e.target.checked;rebuild();};
 function reset(){theta=.68;phi=.9;distance=4.6;target.set(0,.23,0);render();}
 root.querySelector('[data-reset]').onclick=()=>{root.querySelector('[data-view]').value='all';reset();};
 root.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{distance=T.MathUtils.clamp(distance*(b.dataset.zoom==='in'?.8:1.25),.5,10);render();});
 root.querySelector('[data-view]').onchange=e=>{const v=e.target.value;reset();if(v==='corner'){target.set(-.45,.15,-.52);distance=1.7;phi=1.0;}if(v==='lap'){target.set(-.1,.2,-.35);distance=1.65;phi=.7;}if(v==='top'){target.set(.1,.60,-.63);distance=1.6;phi=1.05;}if(v==='steel'){target.set(.65,.3,.2);distance=2;phi=.55;}if(v==='plan'){phi=.02;theta=0;}render();};
 const pointers=new Map();let down=null,pinch=0,moved=false;
 canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);down=[e.clientX,e.clientY];moved=false;if(pointers.size===2){const a=[...pointers.values()];pinch=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);moved=true;}};
 canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;const last=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const a=[...pointers.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);if(d&&pinch)distance=T.MathUtils.clamp(distance*pinch/d,.5,10);pinch=d;moved=true;}else{theta-=(e.clientX-last[0])*.008;phi=T.MathUtils.clamp(phi+(e.clientY-last[1])*.008,.03,1.50);if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>4)moved=true;}render();};
 canvas.onpointerup=e=>{pointers.delete(e.pointerId);if(!moved&&down){const r=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(model.children,true).find(h=>{let o=h.object;while(o!==model){if(!o.visible)return false;o=o.parent;}return true;});if(hit)choose(hit.object.userData.step);}down=null;};
 canvas.onpointercancel=e=>{pointers.delete(e.pointerId);down=null;moved=true;};
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=T.MathUtils.clamp(distance*Math.exp(e.deltaY*.001),.5,10);render();},{passive:false});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();overlay.textContent='3D表示が中断しました。一度閉じて開き直してください。';});
 const observer=new ResizeObserver(resize);observer.observe(view);
 cleanup=()=>{disposed=true;observer.disconnect();clearModel();for(const m of mats)m.dispose();for(const t of textures)t.dispose();renderer.dispose();renderer.forceContextLoss();};
 // Read-only inspection hook for regression checks (actual rendered geometry).
 root._a1={scene,model,camera,renderer,groups};
 rebuild();resize();root.querySelector('[data-close]').focus();
}
window.NN_A1={open};
document.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).get('model')==='A-1'&&typeof specById!=='undefined'){const s=Object.values(specById).find(s=>s.code==='A-1');if(s){selectAndShow({type:'std',id:s.id});open();}}});
})();
