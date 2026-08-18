# -*- coding: utf-8 -*-
# 断面図モード → 「断面詳細図モード」に作り直す。
#  ・パラペット（立上り）の納まりを大きく描く＝PDFの「断面詳細図」と同じ中身を画面で
#  ・部位と辺を選ぶと、その辺の立上りH・天端Wで描き直す
#  ・文字はすべて横書き（縦書きの札は廃止）
import io, sys

PATH = '/home/user/osamarinavi_bousui/zumen_sekisan.html'
s = io.open(PATH, encoding='utf-8', newline='').read().replace('\r\n', '\n')

# --- 図面タブの赤い切断線は不要になったので外す ---
old_line = """  /* ★断面の切断線（図面タブのとき。断面図と2枚で対応させるため） */
  if(tab==='zu'&&window.nnSecLine)nnSecLine(ctx,W,H,_T);
"""
assert s.count(old_line) == 1, '切断線の呼び出しが見つからない'
s = s.replace(old_line, '')
print('OK  図面タブの切断線を外した')

# --- nn-draw-js の中の layersOf / majorHW を外から使えるように ---
old_pub = "  const layersOf=sp=>LAYERS[sp.code]||LAYERS['AS-T1'];"
assert s.count(old_pub) == 1
s = s.replace(old_pub,
  "  const layersOf=sp=>LAYERS[sp.code]||LAYERS['AS-T1'];\n"
  "  /* ★断面詳細図モード（画面）からも同じ層構成・代表寸法を使う（1箇所で管理する） */\n"
  "  window.nnLayersOf=layersOf; window.nnMajorHW=()=>majorHW();")
print('OK  層構成と代表寸法を公開')

# --- 旧「断面図モード」のブロックを丸ごと差し替え ---
a = s.index('\n<style id="nn-sect">')
b = s.index('</script>', s.index('<script id="nn-sect-js">')) + len('</script>')
NEW = r"""
<style id="nn-sect">
/* ============================================================
   断面詳細図モード（2026-08-06p）
   パラペット（立上り）の納まりを大きく描いて、材料と寸法を確認する画面。
   PDFの「断面詳細図」と同じ中身を、その場で見られるようにしたもの。
   ★文字はすべて横書き（縦に回した札は読みにくいので使わない）。
   ============================================================ */
#secwrap{position:absolute; inset:0; display:none; background:#fbfcf9;}
#secwrap.on{display:block;}
html[data-nntheme="dark"] #secwrap{background:#0d161d;}
#secCv{display:block; width:100%; height:100%; touch-action:none;}
#secBar{position:absolute; left:0; right:0; top:0; z-index:6;
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  padding:7px 10px; background:rgba(255,255,255,.93); border-bottom:1px solid var(--line);}
html[data-nntheme="dark"] #secBar{background:rgba(16,26,34,.93);}
#secBar .lb{font-size:12px; font-weight:800; color:var(--ink-sub); white-space:nowrap;}
#secBar select{border:1px solid var(--line); border-radius:7px; padding:4px 7px;
  font-size:12.5px; font-weight:800; background:#fff; color:var(--ink); font-family:inherit; max-width:44vw;}
html[data-nntheme="dark"] #secBar select{background:#1d2b36; color:#e7eff4;}
#secBar .pdf{margin-left:auto; border:1px solid var(--green-deep); background:linear-gradient(180deg,#fff,#e8f3e6);
  color:var(--green-deep); border-radius:8px; padding:5px 12px; font-size:12.5px; font-weight:800;
  font-family:inherit; cursor:pointer; white-space:nowrap;}
html[data-nntheme="dark"] #secBar .pdf{background:#1d2b36; color:#8fe0ad;}
#secNote{position:absolute; left:10px; bottom:10px; z-index:6; font-size:11px; font-weight:700;
  color:var(--ink-sub); background:rgba(255,255,255,.86); border-radius:6px; padding:3px 8px;}
html[data-nntheme="dark"] #secNote{background:rgba(16,26,34,.86); color:#9db2be;}
</style>
<script id="nn-sect-js">
/* 断面詳細図モード。上の <style id="nn-sect"> とセット。 */
(function(){
"use strict";
const wrap=document.getElementById('canvaswrap');
const box=document.createElement('div'); box.id='secwrap';
box.innerHTML='<canvas id="secCv"></canvas>'
  +'<div id="secBar">'
  +'<span class="lb">部位</span><select id="sec_poly"></select>'
  +'<span class="lb">辺</span><select id="sec_edge"></select>'
  +'<button class="pdf" type="button" id="sec_pdf">📐 PDFで出す</button>'
  +'</div>'
  +'<div id="secNote"></div>';
wrap.appendChild(box);
const cvS=document.getElementById('secCv');
const cS=cvS.getContext('2d');
let selP=0, selE=-1;      /* selE=-1 は「いちばん多い納まり（代表）」 */

/* --- 選べる辺の一覧（立上りのある辺だけ） --- */
function edgesOf(pi){
  const p=state.polys[pi]; if(!p)return [];
  const out=[];
  ringsOf(p).forEach((r,ri)=>r.pts.forEach((q,i)=>{
    const e=ek(r.edges[i]||{});
    if(e.h>0) out.push({ri, i, e, label:'辺'+(out.length+1)+'（'+(e.k==='kabe'?'壁当り':'パラペット')+' H'+e.h+(e.k==='kabe'?'':' / W'+(e.w||0))+'）'});
  }));
  return out;
}
function fillSelects(){
  const sp=document.getElementById('sec_poly'), se=document.getElementById('sec_edge');
  sp.innerHTML=state.polys.map((p,i)=>'<option value="'+i+'">'+(p.name||('部位'+(i+1)))+'</option>').join('')
    || '<option>（部位がありません）</option>';
  sp.value=String(Math.min(selP,Math.max(0,state.polys.length-1)));
  const eds=edgesOf(+sp.value||0);
  se.innerHTML='<option value="-1">いちばん多い納まり（代表）</option>'
    +eds.map((x,i)=>'<option value="'+i+'">'+x.label+'</option>').join('');
  se.value=String(selE);
}
document.getElementById('sec_poly').addEventListener('change',function(){ selP=+this.value||0; selE=-1; fillSelects(); nnSecDraw(); });
document.getElementById('sec_edge').addEventListener('change',function(){ selE=+this.value; nnSecDraw(); });
document.getElementById('sec_pdf').addEventListener('click',()=>{ if(window.nnSectionPDF)nnSectionPDF(); });

/* --- いま描く納まりの寸法（立上りH・天端W・種別） --- */
function target(){
  const eds=edgesOf(selP);
  if(selE>=0 && eds[selE]) return {h:eds[selE].e.h, w:eds[selE].e.w||0, k:eds[selE].e.k, lb:eds[selE].label};
  const m=(window.nnMajorHW?nnMajorHW():{H:300,W:250});
  return {h:m.H, w:m.W, k:'para', lb:'いちばん多い納まり（代表）'};
}

/* --- 断面詳細図を描く --- */
window.nnSecDraw=function(){
  const wrapEl=document.getElementById('secwrap');
  if(!wrapEl||!wrapEl.classList.contains('on'))return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const W=wrapEl.clientWidth, Hh=wrapEl.clientHeight;
  if(cvS.width!==Math.round(W*dpr)||cvS.height!==Math.round(Hh*dpr)){
    cvS.width=Math.round(W*dpr); cvS.height=Math.round(Hh*dpr);
  }
  cS.setTransform(dpr,0,0,dpr,0,0);
  const TH=(typeof nnTH==='function')?nnTH():{paper:'#fbfcf9',scale:'#8a978c',labBg:'rgba(255,255,255,.94)',dim:'#14449c'};
  const dark=(typeof nnTheme!=='undefined'&&nnTheme==='dark');
  cS.clearRect(0,0,W,Hh); cS.fillStyle=TH.paper; cS.fillRect(0,0,W,Hh);

  const note=document.getElementById('secNote');
  if(!state.polys.length){
    note.textContent='屋根をかくと、その立上りの納まり詳細が出ます。';
    return;
  }
  const sp=spec(), t=target();
  const HH=Math.max(50,t.h), WW=Math.max(0,t.w||0), KABE=(t.k==='kabe');
  note.textContent='立上り '+HH+'mm ／ 天端 '+(KABE?'—':WW+'mm')+'　'+t.lb+'　（材料は工法「'+sp.name+'」による）';

  /* 図の範囲（mm）。原点＝入隅（平場と立上りの交わり） */
  const PL=900, SLAB=150, CAP=40, BRK=420;          /* 平場の長さ・スラブ厚・笠木・破断線までの深さ */
  const x0=-PL-60, x1=WW+180, y0=-(SLAB+BRK), y1=HH+CAP+130;
  const barH=(document.getElementById('secBar')||{}).offsetHeight||40;
  const navH=(document.getElementById('nav')||{}).offsetHeight||0;
  const padL=26, padR=210, padT=barH+30, padB=118+Math.min(90,navH);   /* 右は引出線の文字ぶん空ける */
  const kx=(W-padL-padR)/(x1-x0), ky=(Hh-padT-padB)/(y1-y0);
  const K=Math.max(0.02,Math.min(kx,ky));
  const ox=padL+((W-padL-padR)-(x1-x0)*K)/2, oy=padT+((Hh-padT-padB)-(y1-y0)*K)+ (y1)*K;
  const X=mm=>ox+mm*K, Y=mm=>oy-mm*K;

  const bodyC=dark?'#33414e':'#d9d5cc', bodyE=dark?'#5a6b7a':'#8d9298';
  const ink=dark?'#dbe7ee':'#233';
  const dimC=dark?'#7cc0ff':'#14449c';

  /* --- 躯体（スラブ＋パラペット。下端は破断線） --- */
  cS.fillStyle=bodyC; cS.strokeStyle=bodyE; cS.lineWidth=1.2;
  cS.beginPath();
  cS.moveTo(X(-PL),Y(0)); cS.lineTo(X(0),Y(0));
  if(!KABE){ cS.lineTo(X(0),Y(HH)); cS.lineTo(X(WW),Y(HH)); cS.lineTo(X(WW),Y(-SLAB)); }
  else { cS.lineTo(X(0),Y(HH+900)); cS.lineTo(X(220),Y(HH+900)); cS.lineTo(X(220),Y(-SLAB)); }
  cS.lineTo(X(-PL),Y(-SLAB));
  cS.closePath(); cS.fill(); cS.stroke();
  /* 破断線（左端。ここから先は省略の意味） */
  cS.strokeStyle=bodyE; cS.lineWidth=1.4; cS.beginPath();
  let zy=Y(-SLAB), sgn=1;
  cS.moveTo(X(-PL),zy);
  for(let yy=-SLAB; yy>-(SLAB+180); yy-=22){ cS.lineTo(X(-PL)+sgn*7, Y(yy)); sgn=-sgn; }
  cS.stroke();

  /* --- 入隅の面木（三角 75×75） --- */
  if(!KABE||true){
    cS.fillStyle=dark?'#4a4230':'#e8e2d6'; cS.strokeStyle=dark?'#6d6248':'#8a8172'; cS.lineWidth=1;
    cS.beginPath(); cS.moveTo(X(0),Y(0)); cS.lineTo(X(75),Y(0)); cS.lineTo(X(0),Y(75)); cS.closePath();
    cS.fill(); cS.stroke();
  }

  /* --- 防水層（層のかさなりを3本の平行線で表す） --- */
  const path=[[-PL,0],[75,0],[0,75],[0,HH]];
  if(!KABE)path.push([WW,HH]);
  const drawLayer=(off,wdt,col)=>{
    cS.strokeStyle=col; cS.lineWidth=wdt; cS.lineJoin='round'; cS.lineCap='round';
    cS.beginPath();
    /* 平場→面木→立上り→天端。offはその面から外向きの離れ（mm） */
    cS.moveTo(X(-PL),Y(off));
    cS.lineTo(X(75),Y(off));
    cS.lineTo(X(off),Y(75));
    cS.lineTo(X(off),Y(HH));
    if(!KABE)cS.lineTo(X(WW),Y(HH+off));
    cS.stroke();
  };
  drawLayer(3, 2.0, dark?'#7a8f6a':'#9db38f');       /* 下地処理・プライマー相当 */
  drawLayer(9, 3.4, sp.color||'#5a4a42');            /* 主材（工法色） */
  drawLayer(15,2.0, dark?'#c3d4ad':'#c9c2b4');       /* 仕上げ・保護 */

  /* --- 笠木（アルミ）とシーリング --- */
  if(!KABE){
    cS.fillStyle=dark?'#6b7a89':'#9aa2ab'; cS.strokeStyle=dark?'#8b9aa9':'#6f7780'; cS.lineWidth=1;
    cS.beginPath(); cS.rect(X(-35),Y(HH+CAP+20), (WW+70)*K, CAP*K); cS.fill(); cS.stroke();
    cS.fillStyle=dark?'#caa66a':'#d8b477';
    cS.beginPath(); cS.rect(X(-35),Y(HH+20), 26*K, 20*K); cS.fill();
  }

  /* ===== 寸法（数値はすべて横書き） ===== */
  const dimTx=(tx,x,y)=>{
    cS.font='800 12px sans-serif'; cS.textAlign='center'; cS.textBaseline='middle';
    const w=cS.measureText(tx).width+10;
    cS.fillStyle=TH.labBg; cS.fillRect(x-w/2,y-9,w,18);
    cS.strokeStyle=dimC; cS.lineWidth=.9; cS.strokeRect(x-w/2,y-9,w,18);
    cS.fillStyle=dimC; cS.fillText(tx,x,y); cS.textAlign='left'; cS.textBaseline='alphabetic';
  };
  const dot=(x,y)=>{ cS.beginPath(); cS.arc(x,y,2.6,0,7); cS.fillStyle=dimC; cS.fill(); };
  cS.strokeStyle=dimC; cS.lineWidth=1;
  /* 立上りH（左に縦の寸法線。★数値は横書きで線の左に置く） */
  const hx=X(-PL)-14;
  cS.beginPath(); cS.moveTo(hx,Y(0)); cS.lineTo(hx,Y(HH)); cS.stroke();
  dot(hx,Y(0)); dot(hx,Y(HH));
  cS.beginPath(); cS.moveTo(hx,Y(0)); cS.lineTo(X(0),Y(0)); cS.moveTo(hx,Y(HH)); cS.lineTo(X(0),Y(HH)); cS.stroke();
  dimTx('立上り H='+HH, hx+2, (Y(0)+Y(HH))/2);
  /* 天端W（上に横の寸法線） */
  if(!KABE&&WW>0){
    const wy=Y(HH+CAP+58);
    cS.beginPath(); cS.moveTo(X(0),wy); cS.lineTo(X(WW),wy); cS.stroke();
    dot(X(0),wy); dot(X(WW),wy);
    cS.beginPath(); cS.moveTo(X(0),wy); cS.lineTo(X(0),Y(HH)); cS.moveTo(X(WW),wy); cS.lineTo(X(WW),Y(HH)); cS.stroke();
    dimTx('天端 W='+WW, (X(0)+X(WW))/2, wy-16);
  }
  /* スラブ厚 */
  const sx=X(-PL)+40;
  cS.beginPath(); cS.moveTo(sx,Y(0)); cS.lineTo(sx,Y(-SLAB)); cS.stroke();
  dot(sx,Y(0)); dot(sx,Y(-SLAB));
  dimTx('スラブ t='+SLAB, sx+58, (Y(0)+Y(-SLAB))/2);

  /* ===== 引出線＋材料名（右に1列そろえる。文字は横書き） ===== */
  const items=[];
  if(!KABE){ items.push(['アルミ笠木＋シーリング', WW/2, HH+CAP+40]);
             items.push(['防水層 天端まで巻き込み', WW*0.7, HH+12]); }
  items.push(['防水層（立上り）', 12, HH*0.55]);
  items.push(['入隅 面木 75×75', 40, 40]);
  items.push(['防水層（平場）', -PL*0.45, 12]);
  items.push(['コンクリート躯体', -PL*0.75, -SLAB*0.6]);
  const lx=W-padR+26;
  cS.font='700 12px sans-serif'; cS.textBaseline='middle';
  items.forEach((it,i)=>{
    const ty=padT+26+i*26;
    const px=X(it[1]), py=Y(it[2]);
    cS.strokeStyle=dark?'#8aa0ad':'#666'; cS.lineWidth=.9;
    cS.beginPath(); cS.moveTo(px,py); cS.lineTo(lx-12,ty); cS.lineTo(lx-4,ty); cS.stroke();
    cS.beginPath(); cS.arc(px,py,2.4,0,7); cS.fillStyle=dark?'#8aa0ad':'#666'; cS.fill();
    cS.fillStyle=ink; cS.fillText(it[0], lx, ty);
  });
  cS.textBaseline='alphabetic';

  /* ===== 見出し・層構成（横書き） ===== */
  cS.fillStyle=ink; cS.font='800 14px sans-serif';
  cS.fillText('断面詳細図（'+(KABE?'壁当り':'パラペット立上り')+'の納まり）', 12, barH+20);
  cS.fillStyle=TH.scale; cS.font='700 11px sans-serif';
  cS.fillText(sp.name+'　／　1mm＝'+K.toFixed(2)+'px　／　寸法の単位＝mm', 12, barH+36);

  const LS=(window.nnLayersOf?nnLayersOf(sp):[]);
  let ly=Hh-padB+34;
  cS.fillStyle=ink; cS.font='800 12px sans-serif';
  cS.fillText('層構成（下から順＝施工の順番）', 12, ly); ly+=17;
  cS.font='700 11.5px sans-serif';
  LS.forEach((L,i)=>{
    if(ly>Hh-8)return;
    cS.fillStyle=L[2]; cS.fillRect(12, ly-9, 11, 11);
    cS.strokeStyle=bodyE; cS.lineWidth=.8; cS.strokeRect(12, ly-9, 11, 11);
    cS.fillStyle=ink; cS.fillText((i+1)+'. '+L[0]+'　'+L[1], 30, ly);
    ly+=16;
  });
};

window.nnSecRefresh=function(){ fillSelects(); nnSecDraw(); };
addEventListener('resize',()=>{ try{ nnSecDraw(); }catch(_){}} );
addEventListener('orientationchange',()=>setTimeout(()=>{ try{ nnSecDraw(); }catch(_){}},250));
fillSelects();
})();
</script>"""
s = s[:a] + '\n' + NEW.strip() + s[b:]
print('OK  断面詳細図モードに差し替え')

# setTab で断面に入るとき、部位・辺の一覧も作り直す
old_tab = "  if(t==='sec'&&window.nnSecDraw)nnSecDraw();"
assert s.count(old_tab) == 1
s = s.replace(old_tab, "  if(t==='sec'&&window.nnSecRefresh)nnSecRefresh();")
print('OK  setTab で一覧を作り直す')

io.open(PATH, 'w', encoding='utf-8', newline='').write(s)
print('書き込み完了')
