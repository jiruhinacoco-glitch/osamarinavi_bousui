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
.s3root .s3br button.s3thk{width:auto;height:26px;padding:0 8px;font-size:11px;white-space:nowrap}
dialog.s3big .s3root .s3br button.s3thk{height:34px;font-size:13px;padding:0 12px}
.s3root .s3key{position:absolute;left:8px;bottom:30px;display:flex;gap:10px;background:#fffffff0;padding:3px 8px;font-size:11px;line-height:1.3;pointer-events:none;color:#26322c;z-index:2;border-left:3px solid #598065}
.s3root .s3key i{display:inline-block;width:13px;height:9px;background:#14181d;margin-right:4px;vertical-align:-1px;box-shadow:inset 0 2px 2px #5a6a80}
.s3root .s3key i.sheet{background:#3a332c;box-shadow:none}
.s3root .s3note{position:absolute;left:8px;top:40px;max-width:60%;background:#fff8dcf0;border-left:3px solid #e07800;color:#5d3a00;font-size:11px;font-weight:800;padding:3px 8px;z-index:2;pointer-events:none}
.s3root .s3note:empty{display:none}
dialog.s3big .s3root .s3note{left:14px;top:52px;font-size:13px}
.s3root .s3msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;text-shadow:0 1px 2px #0008;pointer-events:none;z-index:1}
dialog.s3big{position:fixed!important;inset:0!important;margin:0!important;padding:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;border:0!important;border-radius:0!important;overflow:hidden!important;background:#f4f4ef;color:#26322c;font:14px/1.45 'Zen Kaku Gothic New',sans-serif;box-shadow:none}
dialog.s3big[open]{display:grid!important;grid-template-rows:auto minmax(0,1fr);grid-template-columns:minmax(0,1fr)}   /* ★列は minmax(0,1fr)：auto だと見出し（折り返さない題名＋ボタン）の最小幅で 556px に広がり、スマホで右側が見切れた（§643） */
dialog.s3big::backdrop{background:#15291d}
dialog.s3big *{box-sizing:border-box}
dialog.s3big .s3head{display:flex;align-items:center;gap:10px;background:#285f3d;color:#fff;padding:8px 14px;min-height:50px;min-width:0;overflow:hidden}
dialog.s3big .s3head h2{font-size:18px;margin:0;line-height:1.2;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
dialog.s3big .s3head h2 small{font-size:12px;color:#d8e6d4;margin-left:10px;font-weight:700}
dialog.s3big .s3head button{font:inherit;font-weight:800;color:#1e452c;background:#fff;border:2px solid #173e29;border-radius:2px;min-height:38px;padding:4px 14px;cursor:pointer;box-shadow:0 3px #143920;white-space:nowrap}
dialog.s3big .s3head button:disabled{opacity:.45;cursor:default}
dialog.s3big .s3main{position:relative;min-height:0;min-width:0;overflow:hidden}
dialog.s3big .s3head button[data-tbl]{background:#e8f3e8}
dialog.s3big .s3head button[data-tbl][aria-pressed="true"]{background:#fff}
.s3tbl{position:absolute;z-index:3;right:72px;top:14px;width:400px;height:auto;max-width:calc(100% - 28px);max-height:calc(100% - 28px);min-width:240px;min-height:110px;display:flex;flex-direction:column;background:#fffffff5;border:2px solid #3b4a3e;box-shadow:3px 3px 0 #0003;font:12.5px/1.35 'Zen Kaku Gothic New',sans-serif;color:#26322c}
.s3tbl[hidden]{display:none}
.s3tblh{display:flex;align-items:center;gap:8px;background:#285f3d;color:#fff;padding:5px 8px 5px 10px;cursor:move;user-select:none;-webkit-user-select:none;touch-action:none;flex:none}
.s3tblh b{font-size:13.5px}
.s3tblh span{font-size:10.5px;color:#d8e6d4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.s3tblh button{margin-left:auto;flex:none;width:28px;height:26px;min-height:0;padding:0;border:1px solid #173e29;border-radius:2px;background:#fff;color:#1e452c;font:900 14px/1 'Zen Kaku Gothic New',sans-serif;cursor:pointer;box-shadow:0 2px 0 #143920}
.s3tblb{flex:1 1 auto;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch}
.s3tbl table{width:100%;border-collapse:collapse}
.s3tbl th{position:sticky;top:0;background:#f1e7cf;color:#5d3a00;font-weight:900;font-size:11.5px;padding:4px 6px;text-align:left;border-bottom:1px solid #d9c9a3;white-space:nowrap}
.s3tbl td{padding:4px 6px;border-bottom:1px solid #e7eae4;vertical-align:top;cursor:pointer}
.s3tbl td.no{text-align:center;font-weight:900;width:2.2em;white-space:nowrap}
.s3tbl td.use{text-align:center;white-space:nowrap;width:3.6em}
.s3tbl tr:hover td{background:#eef5ea}
.s3tbl tr.on td{background:#fff4c2;box-shadow:inset 3px 0 #e07800}
.s3tbl tr.done td{background:#f0f6ee}
.s3tbl tr.all td{font-weight:900;color:#1c6b3c}
.s3tblg{position:absolute;right:0;bottom:0;width:20px;height:20px;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 55%,#3b4a3e 55%)}
.s3tble{position:absolute;top:0;bottom:22px;width:10px;cursor:ew-resize;touch-action:none;z-index:1}.s3tble.l{left:-5px}.s3tble.r{right:-5px}   /* 左右の縁＝横幅だけ伸ばす（§649） */
html[data-nnphone="1"] .s3tbl{right:14px;top:auto;bottom:14px;width:calc(100% - 28px);max-height:45%}
.stlab:empty{display:none}   /* ★2026-10-13za 「全体（完成形）」の札は出さない（本人） */
.s3tbl .sg{white-space:nowrap}
.s3tbl td,.s3tbl th{line-height:1.3}
html[data-nnphone="1"] .s3tbl{max-height:34%}
html[data-nnphone="1"] .s3tbl td{font-size:11px;padding:2px 4px}
html[data-nnphone="1"] .s3tbl th{font-size:10px;padding:2px 4px}
html[data-nnphone="1"] .s3tblh{padding:3px 6px}
html[data-nnphone="1"] .s3tblh b{font-size:12px}
html[data-nnphone="1"] .s3tblh button{width:24px;height:22px}   /* ★2026-10-13za 全画面の工程表を小さく（本人「デカすぎ・邪魔にならないように」） */
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
/* ★2026-10-11q 図面・積算の 3D と同じ作り（本人「3D図面みたいにボタンも配置して」）：絵がボタンそのものなので白い枠・背景・影は出さない。
   全画面では右に縦一列（46×40・間 5px）、移動パッド（黄色い十字）は左下。iPhone のノッチ・ホームバーの分（safe-area）を空ける */
.s3root .s3nav button,.s3root .s3nav button:hover,.s3root .s3nav button.hold{width:32px;height:28px;background:none;border:0;box-shadow:none;padding:0}
.s3root .s3nav button:hover{filter:brightness(1.08)}
.s3root .s3nav button.hold{transform:translateY(1px);filter:brightness(.92)}
.s3root .s3nav button img{width:32px;height:28px;object-fit:contain}
.s3root .s3pan{display:none}
dialog.s3big .s3root .s3nav{right:8px;top:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));flex-direction:column;gap:5px;align-items:flex-end;overflow-y:auto;scrollbar-width:none}
dialog.s3big .s3root .s3nav::-webkit-scrollbar{display:none}
dialog.s3big .s3root .s3nav button,html[data-nnphone="1"] dialog.s3big .s3root .s3nav button{width:46px;height:40px;flex:none}
dialog.s3big .s3root .s3nav button img{width:46px;height:40px}
dialog.s3big .s3root .s3pan{display:block;position:absolute;left:14px;bottom:calc(66px + env(safe-area-inset-bottom,0px));width:56px;height:56px;z-index:2;touch-action:none;cursor:grab;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
dialog.s3big .s3root .s3pan img{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;filter:drop-shadow(0 3px 0 rgba(0,0,0,.25))}
dialog.s3big .s3root .s3pan.on img{transform:scale(1.08)}
html[data-nnphone="1"] dialog.s3big .s3root .s3pan{width:46px;height:46px;bottom:calc(60px + env(safe-area-inset-bottom,0px))}
dialog.s3big .s3head{padding-top:calc(8px + env(safe-area-inset-top,0px))}
dialog.s3big .s3root .s3key{bottom:calc(14px + env(safe-area-inset-bottom,0px))}
dialog.s3big .s3root .s3br{bottom:calc(14px + env(safe-area-inset-bottom,0px))}
dialog.s3big .s3root .stlab{top:calc(14px + env(safe-area-inset-top,0px))!important}
html[data-nnphone="1"] dialog.s3big .s3head h2 small{display:none}
html[data-nnphone="1"] dialog.s3big .s3head{gap:6px;padding-left:8px;padding-right:8px}
html[data-nnphone="1"] dialog.s3big .s3head button{padding:4px 7px;font-size:12px;min-height:34px}
html[data-nnphone="1"] dialog.s3big .s3root .s3br .s3hint{display:none}
html[data-nnphone="1"] .s3tbl{right:62px;width:calc(100% - 86px)}   /* ★2026-10-12h 幅は 100%−86px（左 24px）。§649 で max-width を 100%−28px に広げたら、スマホは right:62px＋width 100%−28px で左端が画面の外（−34px）へ出た（検査 step3d ⑮ で実測・§650） */
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
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFShadowMap; renderer.shadowMap.autoUpdate=false;   /* ★2026-10-12 PCFSoft→PCF：1画素あたりの影の読み取りが 9→4 回（本人「高性能PCでもカクつく」・§644） */
  renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=SKY.exp;
  const canvas=renderer.domElement; canvas.setAttribute('aria-label','工程の3D。ドラッグで回転、ホイールで拡大。右上のボタンでも操作できます。'); root.appendChild(canvas);
  /* 右上の丸ボタン：図面・積算と同じ並び（左回り・右回り・起こす・倒す・真上・拡大・縮小・全体）。「大きく」は右下 */
  root.insertAdjacentHTML('beforeend',
    `<div class="stlab"></div>
     <div class="s3nav">${[['zin','拡大'],['zout','縮小'],['tup','起こす'],['tdn','倒す'],['rl','左回り'],['rr','右回り'],['plan','真上'],['iso','全体']]
       .map(([k,n])=>`<button type="button" data-nav="${k}" title="${n}${/^(rl|rr|tup|tdn|zin|zout)$/.test(k)?'（長押しで続けて動く）':''}" aria-label="${n}"><img src="./icons/btn_d3_${k}.png" alt=""></button>`).join('')}</div>
     <div class="s3pan" title="つまんで動かす＝視点を移動"><img src="./icons/btn_pan.png" alt="移動"></div>
     <div class="s3br"><span class="s3hint">${phone?'指で回す／2本指で移動・拡大':'ドラッグ：回す　Shift＋ドラッグ：移動　ホイール：拡大　オレンジのつまみ：保護コンを伸縮'}</span><button type="button" class="s3thk" data-nav="thick" title="層の厚さ：実寸 ⇄ 見やすさのため約7倍">厚さ：実寸</button><button type="button" class="s3exp" data-nav="big" title="大きく表示" aria-label="大きく表示">⤢</button></div>
     <div class="s3key"><span><i></i>溶融アスファルト</span><span><i class="sheet"></i>ルーフィング</span></div>
     <div class="s3note"></div>
     <div class="stbar"></div>`);
  /* ★2026-10-12g near .01→.1：near が小さいと奥行きの精度が落ち（6m 先で 0.2mm）、実寸 0.5mm の絶縁用シート越しに下の黒いアスファルトがちらついて
     「黒い謎の跡」に見えた（本人の質問・§649）。いちばん寄れる距離は .3 なので .1 で足りる */
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(50,1,.1,60), target=new T.Vector3(0,.23,0);
  const hemi=new T.HemisphereLight(0xdceaff,0x8a9a8c,SKY.hemi); scene.add(hemi);
  /* 影：模型（半径 1.6m ほど）にぴったりの範囲で 2048（スマホ 1024）＝縁の点々（影の荒れ）を出さない */
  const light=new T.DirectionalLight(SKY.scol,SKY.sun); light.castShadow=true; light.shadow.mapSize.set(phone?512:1024,phone?512:1024);   /* 2048→1024：重さの半分は影だった（§640） */
  Object.assign(light.shadow.camera,{left:-3.4,right:3.4,top:3.4,bottom:-3.4,near:.5,far:14}); light.shadow.normalBias=.006; light.shadow.bias=-.0002; light.shadow.radius=2; scene.add(light);
  { const a=(SKY.az-.5)*Math.PI*2, e=SKY.el*Math.PI/2; light.position.set(8*Math.cos(a)*Math.cos(e),8*Math.sin(e),8*Math.sin(a)*Math.cos(e)); }
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
  const grip=new T.MeshStandardMaterial({color:0xff7a00,emissive:0x9a3f00,emissiveIntensity:.55,roughness:.5,metalness:0}); grip.userData.kind='grip';   /* 保護コンの切れ目のつまみ（§651） */
  V={T,phone,root,renderer,canvas,scene,camera,target,light,model,molten,mat,steel,grip,cache,dark:mat(0x252924,.5),
     theta:2.2,phi:1.02,distance:4.6,frame:0,key:null,el:null,big:null,cur:null,photo:0,layers:[],groups:[],baseRatio:1,low:false,note:'',noteOf:null,step:null,
     tbl:{open:true},thick:'real'};   /* thick：層の厚さ real＝実寸（既定）／x7＝見やすさのため約7倍（§645） */   /* 全画面の工程表：開閉と位置・大きさ（ページを開いているあいだ覚える） */   /* theta 2.2＝切り欠いた階段（-x側）が手前・立上りが奥（田島の絵と同じ向き） */
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
    V.baseRatio=Math.min(devicePixelRatio*scale, phone?2:1.5, Math.sqrt((phone?1600000:2400000)/(w*h)));   /* ★2026-10-12 PC は上限 1.5・予算 2.4M 画素（§644） */
    renderer.setPixelRatio(V.baseRatio*(V.low?.5:1)); renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); V.fit(); V.render(); };
  /* ドラッグ中だけ解像度を 6 割に落とす（離したら元に戻して描き直す）＝回転がなめらか（§640） */
  V.setLow=function(f){ if(V.low===f) return; V.low=f; const c=canvas; renderer.setPixelRatio(V.baseRatio*(f?.5:1)); renderer.setSize(c.clientWidth||1,c.clientHeight||1,false); V.render(); };   /* 動かしているあいだは画素を 1/4 に */
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
  /* ★2026-10-12i 保護コンの切れ目のつまみ（§651）：押した所がつまみ（画面上 14px・スマホ 22px 以内）なら、回転ではなく切れ目を動かす。
     位置は「コンクリの天端の高さの面」と視線の交点の x（rayAtY）。つまんだ瞬間のずれ（off）を保って飛ばない */
  const scrOf=v=>{ const r=canvas.getBoundingClientRect(), q=v.clone().project(camera); return [r.left+(q.x+1)/2*r.width, r.top+(1-q.y)/2*r.height]; };
  const rayAtY=(e,y)=>{ const r=canvas.getBoundingClientRect(), nx=((e.clientX-r.left)/r.width)*2-1, ny=-((e.clientY-r.top)/r.height)*2+1;
    const p=new T.Vector3(nx,ny,.5).unproject(camera), o=camera.position, d=p.sub(o).normalize(); if(Math.abs(d.y)<1e-6) return null; const t=(y-o.y)/d.y; if(t<0) return null; return [o.x+d.x*t, o.z+d.z*t]; };
  const hitGrip=e=>{ const gp=V.conGrip, g=V.groups[V.conK]; if(!gp||!g||!g.visible||!V.conBuild) return false;
    const a=scrOf(new T.Vector3(gp.x,gp.y,gp.z0)), b=scrOf(new T.Vector3(gp.x,gp.y,gp.z1)), dx=b[0]-a[0], dy=b[1]-a[1], l2=dx*dx+dy*dy||1;
    let t=((e.clientX-a[0])*dx+(e.clientY-a[1])*dy)/l2; t=Math.max(0,Math.min(1,t)); const dist=Math.hypot(e.clientX-(a[0]+dx*t), e.clientY-(a[1]+dy*t));
    const z=canvas.getBoundingClientRect().width/(canvas.clientWidth||1); return dist<=(V.phone?22:14)*z; };
  canvas.addEventListener('pointermove',e=>{ if(ptr.size||V.phone||e.pointerType!=='mouse') return; canvas.style.cursor=hitGrip(e)?'ew-resize':''; });
  /* 平行移動：画面の上下左右にそのまま動かす（カメラの向きは変えない）。1px＝的の距離での1px */
  V.pan=function(dx,dy){ const h=canvas.clientHeight||1, k=2*V.distance*Math.tan(camera.fov*Math.PI/360)/h; const z=canvas.getBoundingClientRect().height/h||1;
    const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0), up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
    target.addScaledVector(right,-dx/z*k).addScaledVector(up,dy/z*k); };
  canvas.oncontextmenu=e=>e.preventDefault();
  canvas.onpointerdown=e=>{ e.preventDefault(); try{ canvas.setPointerCapture(e.pointerId); }catch(_){ }
    if(!ptr.size&&!e.shiftKey&&!e.ctrlKey&&e.button!==2&&hitGrip(e)){ const pt=rayAtY(e,V.conGrip.y); ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,grip:{off:V.conGrip.x-(pt?pt[0]:V.conGrip.x)}}); pinch=null; V.setLow(true); return; }
    ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,pan:e.shiftKey||e.ctrlKey||e.button===2}); pinch=null; V.setLow(true); };
  canvas.onpointermove=e=>{ if(!ptr.has(e.pointerId)) return; e.preventDefault(); const last=ptr.get(e.pointerId); ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,pan:last.pan,grip:last.grip});
    if(last.grip){ const pt=rayAtY(e,V.conGrip.y); if(pt&&V.conBuild) V.conBuild(pt[0]+last.grip.off); V.render(); return; }   /* つまみ＝切れ目を動かす（§651） */
    if(ptr.size>=2){ const [a,b]=[...ptr.values()], d=Math.hypot(b.x-a.x,b.y-a.y), mx=(a.x+b.x)/2, my=(a.y+b.y)/2; if(pinch==null){ pinch={d,r:V.distance,mx,my}; return; }
      if(d>10&&pinch.d>10) V.distance=T.MathUtils.clamp(pinch.r*pinch.d/d,.3,25); V.pan(mx-pinch.mx,my-pinch.my); pinch.mx=mx; pinch.my=my; }
    else if(last.pan||e.shiftKey||e.ctrlKey||(e.buttons&2)){ V.pan(e.clientX-last.x,e.clientY-last.y); }   /* Shift／Ctrl／右ボタン＝移動（図面・積算と同じ） */
    else{ V.theta-=(e.clientX-last.x)*.006; V.phi=T.MathUtils.clamp(V.phi-(e.clientY-last.y)*.005,.15,Math.PI/2); }
    V.render(); };
  const up=e=>{ ptr.delete(e.pointerId); pinch=null; if(!ptr.size) V.setLow(false); }; canvas.onpointerup=up; canvas.onpointercancel=up; canvas.onlostpointercapture=up;
  canvas.addEventListener('wheel',e=>{ e.preventDefault(); V.distance=T.MathUtils.clamp(V.distance*(e.deltaY>0?1.12:1/1.12),.3,25); V.render(); },{passive:false});
  /* ---- 丸ボタン：1回押し＝1段、**長押し＝押しているあいだ続けて動く**（本人「長押しでちゃんと押せるように」・§639）。
     動きは pointerdown で起こし、click は使わない（両方だと2回動く）。真上・全体・大きくは1回だけ ---- */
  /* ★2026-10-11q 図面・積算の 3D と同じ動き（本人「操作性もそれと同じに」）：
     タップ＝1回ぶん（回る 45°・起こす/倒す 12°・拡大縮小 1.3倍）。0.25秒押し続けると毎フレーム少しずつ（0.9°／0.5°／1.012倍）動き、
     離したところで止まる。前は押した瞬間に 8° 動いたうえ 60ms ごとに 8°＝速すぎた（本人「少し押しただけでも移動しすぎる」） */
  const zoom=k=>{ V.distance=T.MathUtils.clamp(V.distance*k,.3,25); }, rot=d=>{ if(V.phi<.3) V.phi=.9; V.theta+=d*Math.PI/180; }, tilt=d=>{ V.phi=T.MathUtils.clamp(V.phi+d*Math.PI/180,.15,Math.PI/2); };
  const TAP={zin:()=>zoom(1/1.3), zout:()=>zoom(1.3), tup:()=>tilt(-12), tdn:()=>tilt(12), rl:()=>rot(-45), rr:()=>rot(45)};
  const HOLD={zin:()=>zoom(1/1.012), zout:()=>zoom(1.012), tup:()=>tilt(-.5), tdn:()=>tilt(.5), rl:()=>rot(-.9), rr:()=>rot(.9)};
  let hIv=0, hFn=null, hTimer=0, hArmed=null, hHeld=false;   /* 押しっぱなしは 20ms ごと（rAF だと内蔵ブラウザの裏の画面で止まる。描くのは render の rAF が間引く） */
  root.querySelectorAll('[data-nav]').forEach(b=>{ const k=b.dataset.nav;
    if(k==='plan'){ b.onclick=()=>{ V.theta=Math.PI/2; V.phi=.16; V.fit(); V.render(); }; return; }   /* 真上（図面・積算と同じ：立上りが画面の上） */
    if(k==='iso'){ b.onclick=()=>V.reset(); return; }
    if(k==='big'){ b.onclick=()=>openBig(); return; }
    if(k==='thick'){ b.onclick=()=>{ V.thick=V.thick==='real'?'x7':'real'; V.key=null; if(V.cur&&V.el) window.NN_STEP3D(V.el,V.cur.sp,V.cur.i); }; return; }   /* 実寸 ⇄ 約7倍（作り直す） */
    b.onclick=e=>e.preventDefault();
    b.addEventListener('pointerdown',e=>{ e.preventDefault(); try{ b.setPointerCapture(e.pointerId); }catch(_){ } hArmed=k; hHeld=false; b.classList.add('hold'); clearTimeout(hTimer);
      hTimer=setTimeout(()=>{ hHeld=true; hFn=HOLD[k]; V.setLow(true); clearInterval(hIv); hIv=setInterval(()=>{ if(hFn){ hFn(); V.render(); } },20); },250); });
    const stop=()=>{ if(hArmed!==k) return; hArmed=null; clearTimeout(hTimer); clearInterval(hIv); hIv=0; const w=hHeld; hHeld=false; hFn=null; b.classList.remove('hold'); V.setLow(false); if(!w){ TAP[k](); V.render(); } };
    ['pointerup','pointercancel','lostpointercapture'].forEach(t=>b.addEventListener(t,stop));
    b.addEventListener('contextmenu',e=>e.preventDefault()); });
  /* 移動パッド（黄色い十字）：つまんで動かすと視点が平行移動（図面・積算と同じ） */
  const pad=root.querySelector('.s3pan'); let pd=null;
  pad.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); pd={x:e.clientX,y:e.clientY}; pad.classList.add('on'); try{ pad.setPointerCapture(e.pointerId); }catch(_){ } V.setLow(true); });
  pad.addEventListener('pointermove',e=>{ if(!pd) return; e.preventDefault(); V.pan(e.clientX-pd.x,e.clientY-pd.y); pd={x:e.clientX,y:e.clientY}; V.render(); });
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>pad.addEventListener(t,()=>{ pd=null; pad.classList.remove('on'); V.setLow(false); }));
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
  const riser=i=>{ if(pinZ==null||i<0||i>=n-1) return false; const a=lo[i], b=lo[i+1], h=b[1]-a[1]; return Math.abs(b[0]-a[0])<.002&&Math.abs(a[0]-pinZ)<.003&&h>.0004&&h<.03; };
  return lo.map((p,i)=>{ const a=N[Math.max(0,i-1)], b=N[Math.min(n-2,i)], dot=a[0]*b[0]+a[1]*b[1]; let q;
    if(i===0||i===n-1||1+dot<0.5){ const mz=a[0]+b[0], my=a[1]+b[1], ml=Math.hypot(mz,my)||1; q=[p[0]+mz/ml*t, p[1]+my/ml*t]; }
    else { const k=t/(1+dot); q=[p[0]+(a[0]+b[0])*k, p[1]+(a[1]+b[1])*k]; }
    if(riser(i-1)||riser(i)) q=[p[0], p[1]+t]; return q; }); }
/* 張り掛けの始まり：z を通る道のり。すでにそこに段（前の層の張り掛けの縦の面）があれば、その**段の上端**に合わせる＝段が1本にそろう。
   合わせないと 0.5mm 奥に新しい段ができて、短い辺のせいで角が飛ぶ（§639） */
function sLap(path,z){ const c=cum(path), s=sAtZ(path,z); let j=1; while(j<path.length&&c[j]<s-1e-9) j++;
  if(j<path.length&&Math.abs(c[j]-s)<1e-6){ while(j+1<path.length&&Math.abs(path[j+1][0]-path[j][0])<.002&&path[j+1][1]>path[j][1]+.0004) j++; return c[j]; }
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
function tools(g,mirror){
  const T=V.T;
  /* mirror（右の立上り用・§649）：z/y の断面を x 方向へ押し出して作った形を、入隅から手前へ 45° の対角線で折り返す＝x/y の断面を z 方向へ押し出した形になる。
     M(x,y,z)＝(mirror−z, y, mirror−x)、mirror＝XB+ZA。鏡映で面の表裏が入れ替わるが、材質は全部 DoubleSide（表裏とも描く）なので見た目は変わらない */
  const mm=mirror==null?null:new T.Matrix4().set(0,0,-1,mirror, 0,1,0,0, -1,0,0,mirror, 0,0,0,1);
  /* ★鏡映は三角形の回る向き（表裏）を裏返す。そのままだと表裏判定が逆になり、右の壁側の帯が暗く見え、さらに上に乗るはずの保護コンクリートの上に描かれた
     （§649 実測：帯を隠すとコンクリートが見える）。各三角形の 2・3 番目の点を入れ替えて向きを戻す */
  function flipWinding(geo){ const ix=geo.index; if(ix){ const a=ix.array; for(let i=0;i+2<a.length;i+=3){ const t=a[i+1]; a[i+1]=a[i+2]; a[i+2]=t; } ix.needsUpdate=true; return; }
    for(const name of Object.keys(geo.attributes)){ const at=geo.attributes[name], n=at.itemSize, arr=at.array; for(let i=0;i+2<at.count;i+=3) for(let k=0;k<n;k++){ const p=(i+1)*n+k, q=(i+2)*n+k, t=arr[p]; arr[p]=arr[q]; arr[q]=t; } at.needsUpdate=true; } }
  function add(geo,m){ if(mm){ geo.applyMatrix4(mm); flipWinding(geo); } const o=new T.Mesh(geo,m); o.castShadow=true; o.receiveShadow=true; g.add(o); return o; }
  function box(x,y,z,w,h,d,m){ const geo=new T.BoxGeometry(w,h,d); geo.translate(x,y,z); uvWorld(geo); return add(geo,m); }
  function sphere(x,y,z,r,m){ const geo=new T.SphereGeometry(r,8,6); geo.translate(x,y,z); return add(geo,m); }
  /* z/y の断面を x 方向に押し出す。x1 が関数（z→x）のときは押し出した先の端を断面の点ごとに変える（右端＝対角線）。
     そのときは先の端のふた（面）を付けない：対角線は帯の内側で、相手の帯のふたと同じ場所に重なってちらつくだけ */
  function prism(pts,x0,x1,m){ const s=new T.Shape(); pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1])); s.closePath();
    const fn=typeof x1==='function', depth=fn?1:(x1-x0);
    const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1}); let p=geo.attributes.position;
    if(fn){ const uv=geo.attributes.uv, keep=[]; for(let i=0;i<p.count;i+=3){ if(p.getZ(i)>depth-1e-6&&p.getZ(i+1)>depth-1e-6&&p.getZ(i+2)>depth-1e-6) continue; keep.push(i,i+1,i+2); }
      const np=new Float32Array(keep.length*3), nu=new Float32Array(keep.length*2); keep.forEach((i,j)=>{ np[j*3]=p.getX(i); np[j*3+1]=p.getY(i); np[j*3+2]=p.getZ(i); nu[j*2]=uv.getX(i); nu[j*2+1]=uv.getY(i); });
      geo.setAttribute('position',new T.Float32BufferAttribute(np,3)); geo.setAttribute('uv',new T.Float32BufferAttribute(nu,2)); geo.deleteAttribute('normal'); p=geo.attributes.position; }
    for(let i=0;i<p.count;i++){ const z=p.getX(i), y=p.getY(i), e=p.getZ(i); p.setXYZ(i,fn?(e>depth/2?x1(z):x0):(e+x0),y,z); } geo.computeVertexNormals(); uvWorld(geo); return add(geo,m); }
  /* 層の断面（lo＝下の線・hi＝上の線）を x0〜x1 に押し出す＝シート・プライマー・絶縁用シート */
  function band(lo,hi,x0,x1,m){ return prism(lo.concat(hi.slice().reverse()),x0,x1,m); }
  /* 溶融アスファルト：断面の道（path＝[z,y]…）に沿って、厚さ th の層を x0〜x1 に流す（x1 は関数＝対角線でもよい）。
     wavy＝切り欠いた端（x0側）を「流し広げた縁」にする：1cm ごとに点を打ったなめらかな波（波長 0.6／0.27／0.13m）＋
     縁から 3cm で厚さが 0 になる丸い盛り上がり（縁に縦の面を作らない・§638） */
  function coating(path,th,x0,x1,m,id,wavy){
    const fn=typeof x1==='function', step=V.phone?.03:.02, pts=[]; let length=0;   /* 1.5cm 刻み（波長 13cm の波に 8〜9 点＝十分なめらか）。1cm だと三角形が倍で重い（§640） */
    path.forEach((p,i)=>{ if(!i){ pts.push({z:p[0],y:p[1],s:0}); return; } const prev=path[i-1], dz=p[0]-prev[0], dy=p[1]-prev[1], len=Math.hypot(dz,dy), n=Math.max(1,Math.ceil(len/step));
      for(let k=1;k<=n;k++) pts.push({z:prev[0]+dz*k/n, y:prev[1]+dy*k/n, s:length+len*k/n}); length+=len; });
    const nx=V.phone?16:24, rows=pts.length, pos=[], uv=[], idx=[], LIP=.03;
    for(let side=0;side<2;side++) for(let j=0;j<rows;j++){ const p=pts[j], prev=pts[Math.max(0,j-1)], next=pts[Math.min(rows-1,j+1)], dz=next.z-prev.z, dy=next.y-prev.y, L=Math.hypot(dz,dy)||1, ny=-dz/L, nz=dy/L;
      const edge=wavy?(.016*Math.sin(p.s*10.5+id*1.7)+.009*Math.sin(p.s*23+.7*id)+.004*Math.sin(p.s*48+1.3*id)):0, xe=x0+edge, x1r=fn?Math.max(xe,x1(p.z)):x1;   /* 対角線が波の縁より左に来る列（切り口のすぐそば）は幅 0 にする：負の幅だと sqrt(負)＝NaN で模型が丸ごと消える（§649 実測） */
      for(let k=0;k<=nx;k++){ const t=k/nx, u=wavy?Math.pow(t,1.6):t, x=xe+(x1r-xe)*u, dEdge=x-xe;     /* 縁の近くに点を集める（丸みを出すため） */
        const ra=Math.min(1,th/.005), lip=wavy?Math.sqrt(Math.min(1,dEdge/LIP)):1, h=side?th*lip+(lip>.999?ra*(.0004*Math.sin(x*23+p.s*11)+.0002*Math.cos(p.s*41+x*7)):0):0;   /* 表面の波は厚さに比例（実寸 1mm のときは 0.08mm） */
        pos.push(x,p.y+ny*h,p.z+nz*h); uv.push(x,p.s); } }
    const stride=nx+1, off=rows*stride;
    for(let j=0;j<rows-1;j++) for(let k=0;k<nx;k++){ const a=j*stride+k, b=a+1, c=a+stride, d=c+1; idx.push(a,c,b,b,c,d,a+off,b+off,c+off,b+off,d+off,c+off); }
    /* 側面：道の始め・終わり・x1 側（x1 が対角線のときは付けない＝帯の内側）だけ（縁側は厚さ 0 なので要らない） */
    for(let k=0;k<nx;k++){ const a=k, b=k+1; idx.push(a,b,a+off,b,b+off,a+off); const c=(rows-1)*stride+k, d=c+1; idx.push(c,c+off,d,d,c+off,d+off); }
    if(!fn) for(let j=0;j<rows-1;j++){ const a=j*stride+nx, b=a+stride; idx.push(a,a+off,b,b,a+off,b+off); }
    if(!wavy) for(let j=0;j<rows-1;j++){ const a=j*stride, b=a+stride; idx.push(a,b,a+off,b,b+off,a+off); }
    const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.Float32BufferAttribute(pos,3)); geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); geo.setIndex(idx); geo.computeVertexNormals();
    geo.userData={stride,rows,wavy:!!wavy}; return add(geo,m); }   /* 検査用：点の並び（stride＝横の点数） */
  function rod(a,b,m){ const va=new T.Vector3(...a), vb=new T.Vector3(...b); if(mm){ va.applyMatrix4(mm); vb.applyMatrix4(mm); }
    const v=vb.clone().sub(va), o=new T.Mesh(new T.CylinderGeometry(.003,.003,v.length(),6),m); o.castShadow=true; o.receiveShadow=true; g.add(o);
    o.position.copy(va.add(vb).multiplyScalar(.5)); o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()); return o; }
  /* ルーフィング（シート）：黒系・つやなし・細かい粒（本人「アス系のルーフィングは黒系で材料によって少し変える」） */
  function sheet(color){ return V.mat(color,.95,'sheet',false); }
  /* コンクリート：写真が読めていれば写真 */
  function concrete(color,rough){ const m=V.mat(color,rough,'concrete',false); if(V.photo) V.photoOn(m); return m; }
  return {add,box,sphere,prism,band,coating,rod,sheet,concrete,molten:()=>V.molten(false),mat:(c,r,k)=>V.mat(c,r,k,false)};
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
/* ★2026-10-12d 寸法（本人の指示）：平場 5,000×5,000 → ★2026-10-12f 平場 4,000×4,000 に（本人の指示・§648）・防水の立上り高さ 300（立上り躯体はスラブ天端から 340＋笠木 30）。
   面取り 80・張り掛け 150・増張り 300・階段の切り欠き 160／層・保護コンクリート 80・伸縮目地は立上りから 600 と以後 3m ごと（§647） */
const DIM={W:4.0, D:4.0, H:.30, slab:.24, wall:.12, cap:.03, chamfer:.08};
/* ★2026-10-12g 立上りを奥（z＝ZA）と右（x＝XB）の2面にして入隅を出す（本人「右上側にも再現して。入隅が把握できるように」・§649）。
   層は「断面の折れ線を x 方向へ押し出す帯」（奥の壁用・t）と、それを入隅から手前へ 45° の対角線で折り返した帯（右の壁用・tB＝tools の mirror）の2枚。
   どちらも対角線（z−ZA＝XB−x）で終わる＝重ならない。同じ断面なので対角線の上で高さが一致し、折れ目がそのまま入隅の形（45° の折り）になる */
const ZA=-.78, XB=DIM.W/2-.06;   /* 奥の立上りの内側の面 z／右の立上りの内側の面 x（壁 120 の半分がスラブの外。奥の壁と同じ納まり） */
/* 断面の折れ線（手前 ZF から奥へ）を z≤zmax に切る。切り欠きの端と対角線が交わる z より手前には、どちらの帯も無い */
function clipZ(path,zmax){ if(path[0][0]<=zmax+1e-9) return path; const out=[]; for(let i=1;i<path.length;i++){ const a=path[i-1], b=path[i]; if(b[0]>zmax+1e-9) continue;
  if(a[0]>zmax+1e-9&&!out.length){ const t=(a[0]-zmax)/((a[0]-b[0])||1); out.push([zmax, a[1]+(b[1]-a[1])*t]); } out.push(b.slice()); } return out; }
MODELS['A-1']=function(sp){
  const T=V.T, model=V.model, n=sp.steps.length, X1=DIM.W/2-.02, ZF=-.84+DIM.D-.02, HW=DIM.H+.04;   /* -X1＝切り欠きの左端・ZF＝層の手前の端（スラブの端から 20mm 内）・HW＝躯体の立上り高さ */
  const MIR=XB+ZA, xOf=z=>MIR-z, xF=xOf(ZF), x1D=z=>MIR-z;   /* xOf：奥の壁から z の位置 ⇄ 右の壁から同じ距離の x。xF＝右の帯の手前の端（折り返す前の x）。x1D＝帯の右端＝対角線 */
  /* 下地（いつも出す）：スラブ・立上り2面（笠木つき・外の角まで閉じる）・入隅の面取り2本（角で重なる＝高い方が見える＝45° で合う） */
  { const g=new T.Group(); g.userData.k=-1; model.add(g); const t=tools(g), tB=tools(g,MIR); const c=t.concrete(0xb5b7b4,.97), zr1=-.84+DIM.D;
    t.box(0,-DIM.slab/2,-.84+DIM.D/2,DIM.W,DIM.slab,DIM.D,c);
    t.box(.03,(HW-.12)/2,-.84,DIM.W+.06,HW+.12,DIM.wall,c); t.box(.04,HW+DIM.cap/2,-.84,DIM.W+.08,DIM.cap,.16,c);
    t.box(DIM.W/2,(HW-.12)/2,(ZA+zr1)/2,DIM.wall,HW+.12,zr1-ZA,c); t.box(DIM.W/2,HW+DIM.cap/2,(-.76+zr1)/2,.16,DIM.cap,zr1+.76,c);
    const ch=[[ZA,0],[ZA+DIM.chamfer,0],[ZA,DIM.chamfer]]; t.prism(ch,-DIM.W/2,XB,c); tB.prism(ch,xOf(zr1),XB,c); }
  let surf=[[ZF,0],[ZA+DIM.chamfer,0],[ZA,DIM.chamfer],[ZA,DIM.H]];
  /* 層の厚さ（m）。real＝実寸：アスファルトルーフィング1500≒1.1mm・ストレッチ1000≒1.0mm・流し張りのアス 1.0kg/㎡≒1mm・はけ塗り≒1mm・
     プライマー／絶縁用シートは実際 0.1〜0.2mm だが描ける最小 0.5mm。x7＝見やすさのため約7倍（a1_model.js と同じ値） */
  const TH=V.thick==='real'?{prime:.0005,as:.001,coat:.001,sheet:.0011,stretch:.001,sep:.0005}:{prime:.004,as:.005,coat:.004,sheet:.010,stretch:.010,sep:.003};
  const zLap=-.70+.15, firstSheet=sp.steps.findIndex(x=>/ルーフィング/.test(x.w)&&/流し張り/.test(x.w));
  V.noteOf=i=>(i===firstSheet)?'先行：入隅に幅300mmのストレッチルーフィングを増張り（国交省 9.2.4）':''   /* ★2026-10-13z 保護コンの「つまんで横へ引くと伸び縮み」の案内は出さない（本人「文章自体不要」） */;
  const log=[]; V.layers=log; V.groups=[];
  const total=p=>cum(p)[p.length-1], wallZ=p=>p[p.length-1][0], fieldY=p=>ptAt(p,sAtZ(p,.5))[1];
  for(let k=0;k<n;k++){
    const g=new T.Group(); g.userData.k=k; model.add(g); V.groups[k]=g; const t=tools(g), tB=tools(g,MIR), id=k+1, x0=-X1+k*.16, w=sp.steps[k].w;
    /* 範囲 s0〜s1 に厚さ th の層をのせる。kind：as＝溶融アス（波の縁）／sheet＝シート（アスの縁が見えるよう 65mm 奥から）／coat＝プライマー・絶縁用シート
       奥の壁の帯（t・x0〜対角線）と右の壁の帯（tB・xF〜対角線を折り返す）を同じ断面で作る。断面は対角線が切り欠きの端 xs と交わる z（zc）で切る。
       右の帯の手前は切り口なので波にしない */
    const put=(s0,s1,th,m,kind,bridgeEnd)=>{ const r=offsetRange(surf,s0,s1,th,bridgeEnd,zLap), xs=kind==='sheet'?x0+.065:x0, zc=xOf(xs);
      if(kind==='as'){ const lo=clipZ(r.lo,zc); t.coating(lo,th,xs,x1D,m,id,true); tB.coating(lo,th,xF,x1D,m,id,false); }
      else { const lo=clipZ(r.lo,zc), hi=clipZ(r.hi,zc); t.band(lo,hi,xs,x1D,m); tB.band(lo,hi,xF,x1D,m); }
      log.push({k,kind,th,lo:r.lo,hi:r.hi,prev:surf,path:r.path}); surf=r.path; return r; };
    const isSheet=/ルーフィング/.test(w)&&/流し張り/.test(w);
    if(/プライマー/.test(w)) put(0,total(surf),TH.prime,t.mat(0x45392d,.45),'coat');
    else if(isSheet){
      /* 最初のルーフィングの前：入隅の増張り（平場 150＋面取り＋立上り 150 ≒ 幅300）。アスを流してストレッチルーフィングを張る */
      /* ★シートはアスより 4mm 短く終える：同じ高さで終えると、次の層がそこで「下がってから上がる」折り返しになり、層を重ねるごとに壁へ食い込む（§640 実測 z=-.842） */
      if(k===firstSheet){ put(sLap(surf,zLap),sAtY(surf,.23),TH.as,t.molten(),'as'); put(sLap(surf,zLap),sAtY(surf,.23-TH.stretch*.4-.001),TH.stretch,t.sheet(sheetColor('ストレッチ')),'sheet'); }
      /* 溶融アスを全面に流す → 平場のシート（面取りの手前まで）→ 立上りのシート（平場へ 150mm 張り掛け・zLap から上端まで） */
      put(0,total(surf),TH.as,t.molten(),'as');
      const m=t.sheet(sheetColor(w)), ts=/ストレッチ/.test(w)?TH.stretch:TH.sheet;
      const r1=put(0,sChamfer(surf),ts,m,'sheet',true);
      /* 幅方向の継目（100mm 重ね・上下の層でずらす）：2枚目が1枚目に乗るぶんの薄い段。対角線の手前で止め、右の壁側は折り返して同じものを置く */
      const seam=-.35+(k-1)*.19, a=Math.max(x0+.065,seam), b=Math.min(X1,seam+.10);
      if(b>a){ const zf=Math.min(r1.lo[0][0],xOf(b)), zc=r1.lo[r1.lo.length-1][0], yt=r1.hi[0][1]; if(zf>zc){ t.box((a+b)/2,yt+ts*.075,(zf+zc)/2,b-a,ts*.15,zf-zc,m); tB.box((a+b)/2,yt+ts*.075,(zf+zc)/2,b-a,ts*.15,zf-zc,m); } }
      put(sLap(surf,zLap),total(surf),ts,m,'sheet');
    }
    else if(/はけ塗り/.test(w)){
      put(0,total(surf),TH.coat,t.molten(),'as');
      /* 2回目のはけ塗りで立上りの端部を押え金物＋シール材で納める。奥の壁は x0〜右の壁の表面 xw、右の壁は奥の壁の金物（15mm）の手前から＝角で重ねない */
      if(k>0&&/はけ塗り/.test(sp.steps[k-1].w)){ const zw=wallZ(surf), xw=xOf(zw), ym=DIM.H+.008;
        t.box((x0+xw)/2,ym,zw+.0075,xw-x0,.030,.015,V.steel); t.box((x0+xw)/2,ym+.02,zw+.0045,xw-x0,.010,.009,V.dark);
        tB.box((xF+xw-.015)/2,ym,zw+.0075,xw-.015-xF,.030,.015,V.steel); tB.box((xF+xw-.015)/2,ym+.02,zw+.0045,xw-.015-xF,.010,.009,V.dark);
        for(let x=x0+.05;x<xw-.03;x+=.4) t.sphere(x,ym,zw+.015,.006,V.steel);
        for(let x=xF+.05;x<xw-.03;x+=.4) tB.sphere(x,ym,zw+.015,.006,V.steel); }
    }
    else if(/絶縁用シート/.test(w)){
      /* 平場だけに敷く（面取りの途中まで 30mm ほど立ち上げる）。入隅に成形緩衝材 40×40：奥の壁は右の壁の緩衝材の内側の面まで、右の壁はその手前から（角で重ねない） */
      const m=t.mat(0xe7dec0,.9); put(0,sChamfer(surf)+.045,TH.sep,m,'coat');
      const c=ptAt(surf,sChamfer(surf)), xc=xOf(c[0]), bm=t.mat(0x978d70);
      t.box((x0+xc-.005)/2,c[1]+.02,c[0]-.015,xc-.005-x0,.04,.04,bm); tB.box((xF+xc-.005)/2,c[1]+.02,c[0]-.015,xc-.005-xF,.04,.04,bm);
    }
    else if(/保護コンクリート/.test(w)){
      /* こて仕上げ 80mm・溶接金網（径6mm・100mm目）・伸縮目地は立上りから 600 と以後 3m ごと（奥の壁と平行＋右の壁と平行の両方＝本人「クロス方向にも」）・立上りは乾式保護材の例。
         底はいまの表面（平場）。コンクリートは乾式保護材（壁の表面から 6〜41mm）の手前から（前は固定 -.49 で壁との間が 29cm 空いていた）。
         ★2026-10-12i 切れ目（コンクリートの端 cx）は**本人がつまんで伸縮**できる（本人「自由に伸ばしたり短くしたり」・§651）：
         切れ目の天端にオレンジのつまみ（V.conGrip＝当たり判定の線・V.grip＝見た目）。つまんで横へ引くと V.conBuild(cx) でこの群だけ作り直す。
         位置は V.conX に覚える（厚さの切替で作り直しても同じ所）。動かせる範囲 V.conLim＝切り欠きの端+100mm〜右の壁の手前 300mm。
         金網を見せるのは切れ目の手前 300 だけ（本人「金網が伸びすぎてる」。前は切り欠きの端から 600） */
      const yb=fieldY(surf), zw=wallZ(surf), xw=xOf(zw), jw=.025, zb=zw+.041, xe=xw-.041;
      const lim=x=>Math.min(xe-.3,Math.max(x0+.1,x)); V.conLim=[+(x0+.1).toFixed(4),+(xe-.3).toFixed(4)]; V.conK=k;
      const build=cx0=>{ const cx=lim(cx0); V.conX=cx; const m=t.concrete(0xd7d2c4,.95);
        const jz=[], jx=[]; for(let z=zw+.60; z<ZF-.3; z+=3.0) jz.push(z); for(let x=xw-.60; x>cx+.3; x-=3.0) jx.push(x); jx.sort((p,q)=>p-q);
        const segs=(lo,js,hi)=>{ const c=[lo].concat(js.flatMap(j=>[j-jw/2,j+jw/2])).concat([hi]), o=[]; for(let i=0;i<c.length;i+=2) o.push([c[i],c[i+1]]); return o; };
        const sz=segs(zb,jz,ZF), sx=segs(cx,jx,xe);
        sz.forEach(([za,zb2])=>sx.forEach(([xa,xb])=>t.box((xa+xb)/2,yb+.04,(za+zb2)/2,xb-xa,.08,zb2-za,m)));
        jz.forEach(j=>t.box((cx+xe)/2,yb+.04,j,xe-cx,.08,jw,V.dark));                                /* 奥の壁と平行の目地（x に長い） */
        jx.forEach(j=>sz.forEach(([za,zb2])=>t.box(j,yb+.04,(za+zb2)/2,jw,.08,zb2-za,V.dark)));      /* 右の壁と平行の目地（z に長い）：上の目地で切る＝重ねない */
        const inJz=z=>jz.some(j=>Math.abs(z-j)<=.025), inJx=x=>jx.some(j=>Math.abs(x-j)<=.025), mx0=Math.max(x0,cx-.30);   /* 金網は切れ目の手前 300 から */
        for(let x=Math.ceil(mx0*10)/10;x<xe-.02;x+=.1){ if(inJx(x)) continue; let a=zb+.02; jz.forEach(j=>{ t.rod([x,yb+.035,a],[x,yb+.035,j-.025],V.steel); a=j+.025; }); t.rod([x,yb+.035,a],[x,yb+.035,ZF-.02],V.steel); }
        for(let z=Math.ceil(zb*10)/10;z<ZF-.02;z+=.1){ if(inJz(z)) continue; let a=mx0; jx.forEach(j=>{ t.rod([a,yb+.041,z],[j-.025,yb+.041,z],V.steel); a=j+.025; }); t.rod([a,yb+.041,z],[xe-.02,yb+.041,z],V.steel); }
        const bb=yb+.08, bt=DIM.H+.02, bm=t.mat(0xc3b997,.9);   /* 乾式保護材 35mm：奥の壁は x0〜xe、右の壁は zb〜ZF（角は奥の壁の分が占める） */
        t.box((x0+xe)/2,(bb+bt)/2,zw+.0235,xe-x0,bt-bb,.035,bm); tB.box((xF+xe)/2,(bb+bt)/2,zw+.0235,xe-xF,bt-bb,.035,bm);
        /* つまみ：切れ目の天端の角に沿ったオレンジの棒。当たり判定は画面に投影した線からの距離（罠16） */
        t.box(cx,yb+.08+.003,(zb+ZF)/2,.016,.010,ZF-zb,V.grip); V.conGrip={x:cx,y:yb+.08,z0:zb,z1:ZF}; };
      build(V.conX!=null?V.conX:Math.min(x0+.6,xe-.6));
      V.conBuild=cx=>{ g.traverse(o=>o.geometry&&o.geometry.dispose()); g.clear(); build(cx);
        g.traverse(o=>{ if(!o.isMesh) return; o.userData.m0=o.material; if(V.step===k&&o.material.userData.hi) o.material=o.material.userData.hi(); }); V.renderer.shadowMap.needsUpdate=true; };
    }
  }
  return true;
};

/* ---------- 大きく見る（全画面の dialog に同じ絵を移す） ---------- */
function openBig(){
  if(V.big) return;
  const d=document.createElement('dialog'); d.className='s3big'; d.setAttribute('aria-label','工程の3D（大きく表示）');
  d.innerHTML=`<div class="s3head"><button type="button" data-prev>◀ 前の工程</button><h2></h2><button type="button" data-tbl aria-pressed="false" title="施工工程表を出す／しまう">工程表</button><button type="button" data-next>次の工程 ▶</button><button type="button" data-close>✕　閉じる</button></div><div class="s3main"></div>`;
  document.body.appendChild(d); V.big=d;
  /* ★2026-10-11q スマホはページが width=980（拡大縮小つき）なので、100vw の dialog が画面より広くなり右側のボタンが見切れた（本人の iPhone）。
     開いているあいだだけ viewport を端末の幅にする（kokkosho の a1_model.js と同じ）。閉じたら元に戻す */
  const vp=document.querySelector('meta[name="viewport"]'), vp0=vp?vp.getAttribute('content'):null;
  if(V.phone&&vp) vp.setAttribute('content','width=device-width, initial-scale=1, user-scalable=yes, viewport-fit=cover');
  buildTbl(d);
  /* ページの zoom で画面より大きくならないように（a1_model.js と同じ） */
  function fitD(){ let z=1; for(let e=d.parentElement;e;e=e.parentElement) z*=parseFloat(getComputedStyle(e).zoom)||1; d.style.zoom=String(1/z); }
  fitD(); d.querySelector('.s3main').appendChild(V.root); d.showModal(); window.addEventListener('resize',fitD);
  const nav=k=>{ if(typeof window.nnStepSel==='function'&&V.cur) window.nnStepSel(V.cur.i+k); };
  d.querySelector('[data-prev]').onclick=()=>nav(-1); d.querySelector('[data-next]').onclick=()=>nav(1);
  d.querySelector('[data-close]').onclick=()=>d.close();
  d.addEventListener('close',()=>{ window.removeEventListener('resize',fitD); if(V.el&&V.el.isConnected) V.el.appendChild(V.root); V.big=null; V.tblEl=null; d.remove(); if(V.phone&&vp&&vp0!=null) vp.setAttribute('content',vp0); V.resize(); },{once:true});
  bigHead(); V.resize();
}
/* ---------- 全画面の施工工程表（本人「右側に施工工程表を貼って。✕で閉じる。移動やサイズ変更も」・§641）
   行を押すとその工程へ（nnStepSel）。見出しをつまんで移動、右下の角で大きさ。✕で閉じ、見出しの「工程表」ボタンで出し入れ。
   位置・大きさ・開閉はページを開いているあいだ覚える（V.tbl）。マウスの動きは zoom で割る（罠1） ---------- */
function buildTbl(d){
  const main=d.querySelector('.s3main'), btn=d.querySelector('[data-tbl]'), sp=V.cur&&V.cur.sp; if(!sp) return;
  const box=document.createElement('div'); box.className='s3tbl';
  box.innerHTML=`<div class="s3tblh"><b>施工工程表</b><span>⠿ つまんで移動</span><button type="button" data-tclose title="閉じる" aria-label="工程表を閉じる">✕</button></div>
    <div class="s3tblb"><table><tr><th>工程</th><th>材料・工法</th><th>使用量<br>(kg/㎡)</th><th>対応製品</th></tr>
    <tr class="all" data-k="-1"><td class="no">全</td><td colspan="3">全体</td></tr>
    ${sp.steps.map((st,k)=>`<tr data-k="${k}"><td class="no">${esc(st.no)}</td><td>${segs(st.w)}</td><td class="use">${esc(st.wu||'—')}</td><td>${segs(st.p||'—')}</td></tr>`).join('')}</table></div>
    <div class="s3tblg" title="大きさを変える"></div><div class="s3tble l" title="左右に伸ばす"></div><div class="s3tble r" title="左右に伸ばす"></div>`;
  main.appendChild(box); V.tblEl=box;
  const t=V.tbl; if(t.w){ box.style.width=t.w+'px'; if(t.h) box.style.height=t.h+'px'; } if(t.x!=null){ box.style.left=t.x+'px'; box.style.top=t.y+'px'; box.style.right='auto'; box.style.bottom='auto'; }
  const show=o=>{ t.open=!!o; box.hidden=!t.open; btn.setAttribute('aria-pressed',t.open?'true':'false'); }; show(t.open);
  btn.onclick=()=>show(!t.open); box.querySelector('[data-tclose]').onclick=()=>show(false);
  box.querySelectorAll('tr[data-k]').forEach(tr=>tr.onclick=()=>{ if(typeof window.nnStepSel==='function') window.nnStepSel(+tr.dataset.k); });
  /* 移動（見出し）と大きさ（右下の角） */
  const zoomOf=()=>main.getBoundingClientRect().width/(main.offsetWidth||1);
  const drag=(el,fn)=>{ el.addEventListener('pointerdown',e=>{ if(e.target.closest('button')) return; e.preventDefault(); try{ el.setPointerCapture(e.pointerId); }catch(_){ }
    const z=zoomOf(), x0=e.clientX, y0=e.clientY, r=box.getBoundingClientRect(), m=main.getBoundingClientRect(), st={x:(r.left-m.left)/z, y:(r.top-m.top)/z, w:r.width/z, h:r.height/z};
    const mv=ev=>fn((ev.clientX-x0)/z,(ev.clientY-y0)/z,st); const up=()=>{ el.removeEventListener('pointermove',mv); el.removeEventListener('pointerup',up); el.removeEventListener('pointercancel',up); };
    el.addEventListener('pointermove',mv); el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up); }); };
  drag(box.querySelector('.s3tblh'),(dx,dy,st)=>{ const W=main.offsetWidth, H=main.offsetHeight; t.x=Math.round(Math.max(0,Math.min(W-60,st.x+dx))); t.y=Math.round(Math.max(0,Math.min(H-40,st.y+dy)));
    box.style.left=t.x+'px'; box.style.top=t.y+'px'; box.style.right='auto'; box.style.bottom='auto'; });
  /* 大きさを変えるときは左上を固定する（右寄せ right:72px のままだと、広げても右端が動かず「左右に伸ばせない」ように見えた・本人の指摘・§649） */
  const pin=(x,y)=>{ t.x=Math.round(x); t.y=Math.round(y); box.style.left=t.x+'px'; box.style.top=t.y+'px'; box.style.right='auto'; box.style.bottom='auto'; };
  drag(box.querySelector('.s3tblg'),(dx,dy,st)=>{ pin(st.x,st.y); t.w=Math.round(Math.max(240,st.w+dx)); t.h=Math.round(Math.max(110,st.h+dy)); box.style.width=t.w+'px'; box.style.height=t.h+'px'; });
  /* 左右の縁：横幅だけ。右の縁＝右端が動く。左の縁＝左端が動く（右端は止まったまま） */
  drag(box.querySelector('.s3tble.r'),(dx,dy,st)=>{ pin(st.x,st.y); t.w=Math.round(Math.max(240,st.w+dx)); box.style.width=t.w+'px'; });
  drag(box.querySelector('.s3tble.l'),(dx,dy,st)=>{ const w=Math.round(Math.max(240,st.w-dx)); pin(st.x+st.w-w,st.y); t.w=w; box.style.width=w+'px'; });
  tblMark();
}
function tblMark(){ const b=V.tblEl; if(!b||!V.cur) return; const i=V.cur.i; b.querySelectorAll('tr[data-k]').forEach(tr=>{ const k=+tr.dataset.k; tr.classList.toggle('on',k===i); tr.classList.toggle('done',i>=0&&k>=0&&k<i); });
  const on=b.querySelector('tr.on'), sb=b.querySelector('.s3tblb'); if(on&&sb){ const top=on.offsetTop-sb.offsetTop; if(top<sb.scrollTop||top+on.offsetHeight>sb.scrollTop+sb.clientHeight) sb.scrollTop=Math.max(0,top-sb.clientHeight/2); } }   /* 枠の中だけスクロール（scrollIntoView は外側まで動く） */
function bigHead(){ if(!V.big||!V.cur) return; const {sp,i}=V.cur, n=sp.steps.length; tblMark();
  V.big.querySelector('h2').innerHTML=`${esc(sp.code)}　${esc(sp.name)}<small>${i<0?n+'工程':'工程 '+esc(sp.steps[i].no)+'／'+n+'　'+esc(sp.steps[i].w)}</small>`;
  V.big.querySelector('[data-prev]').disabled=i<=0; V.big.querySelector('[data-next]').disabled=i>=n-1; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
/* ★2026-10-13za 材料名は全角スペースの所でだけ折り返す（「アスファルトルーフィング　ア／スファルト流し張り」と言葉の途中で切れていた・本人） */
function segs(s){ return String(s==null?'':s).split(/[　 ]+/).filter(Boolean).map(x=>'<span class="sg">'+esc(x)+'</span>').join(' '); }

/* ---------- 入口 ---------- */
window.NN_STEP3D=function(el,sp,i){
  if(!el||!sp||!MODELS[sp.code]) return false;   /* 3Dが無い仕様は false → ページ側が今までの絵を出す */
  css();
  if(!window.THREE){
    /* 読み込み中：札と矢印だけ先に出す（読み込めたら描き直す） */
    el.innerHTML=`<div class="stlab">${i<0?'':'工程 '+esc(sp.steps[i].no)}</div><div class="s3msg" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#5d503d">3Dを読み込み中…</div>`+bar(sp,i);
    el._nnReq={sp,i};
    loadThree().then(()=>{ if(el.isConnected&&el._nnReq) window.NN_STEP3D(el,el._nnReq.sp,el._nnReq.i); })
      .catch(e=>{ if(el.isConnected){ const m=el.querySelector('.s3msg'); if(m) m.textContent=e.message; } });
    return true;
  }
  if(!V) setup();
  const mounted=V.el!==el; let rebuilt=false;
  if(mounted){ el.innerHTML=''; el._nnReq=null; if(!V.big) el.appendChild(V.root); V.el=el; }
  V.cur={sp,i};
  V.root.querySelector('.stlab').textContent=i<0?'':'工程 '+sp.steps[i].no;
  V.root.querySelector('.stbar').innerHTML=sp.steps.map((x,k)=>`<i class="${i<0||k<=i?'on':''}${k===i?' cur':''}"></i>`).join('');
  const key=sp.code+'|'+sp.id;
  if(V.key!==key){ V.key=key; V.model.traverse(o=>o.geometry&&o.geometry.dispose()); V.model.clear(); V.groups=[]; V.noteOf=null; V.step=null; MODELS[sp.code](sp); msg(''); rebuilt=true; }
  /* 工程の切替＝層の表示／非表示と、いまの工程の材質（少し明るい）の差し替えだけ（作り直さない＝重くない・§640） */
  const stepChanged=V.step!==i||rebuilt; V.step=i;
  if(stepChanged){ V.groups.forEach((g,k)=>{ g.visible=i<0||k<=i; g.traverse(o=>{ if(!o.isMesh) return; if(!o.userData.m0) o.userData.m0=o.material; o.material=(k===i&&o.userData.m0.userData.hi)?o.userData.m0.userData.hi():o.userData.m0; }); });
    V.renderer.shadowMap.needsUpdate=true; }
  V.root.querySelector('.s3note').textContent=(V.noteOf&&V.noteOf(i))||'';
  V.root.querySelector('[data-nav=thick]').textContent=V.thick==='real'?'厚さ：実寸':'厚さ：約7倍';
  bigHead(); if(mounted) V.resize(); else if(stepChanged) V.fit(); V.render();
  return true;
};
window.NN_STEP3D.inspect=()=>V;   /* 検査用（読むだけ） */
window.NN_STEP3D.has=code=>!!MODELS[code];
function bar(sp,i){ return `<div class="stbar">${sp.steps.map((x,k)=>`<i class="${i<0||k<=i?'on':''}${k===i?' cur':''}"></i>`).join('')}</div>`; }
})();
