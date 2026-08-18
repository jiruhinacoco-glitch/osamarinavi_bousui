# 図面・積算の10件改修（2026-08-13d）
import io

P='/home/user/osamarinavi_bousui/zumen_sekisan.html'
s=io.open(P,encoding='utf-8',newline='').read()
n=0
def rep(a,b,cnt=1):
    global s,n
    assert s.count(a)==cnt, ('一致しない(%d件): '%s.count(a))+a[:80]
    s=s.replace(a,b); n+=1

# ---------- ① 全削除しても3Dに影が残る ----------
# 影の計算は「部位があるとき」しか needsUpdate していなかった。空になったときも1回計算し直す。
rep("""    if(T.ground){ T.ground.position.set(cx, -0.002, cz); T.ground.scale.set(rad*6, rad*6, 1); }
    T.sun.shadow.needsUpdate=true;
  }""",
"""    if(T.ground){ T.ground.position.set(cx, -0.002, cz); T.ground.scale.set(rad*6, rad*6, 1); }
    T.sun.shadow.needsUpdate=true;
  }
  /* ★2026-08-13d 全削除で空になったときも影を1回計算し直す。
     これが無いと、建物を消しても最後の影が地面に残り続ける（実際に指摘された）。 */
  else if(T.sun){ T.sun.shadow.needsUpdate=true; }""")

# ---------- ③ ズームで近づくとカメラが上を向く ----------
# カメラの高さに注視点の高さ(0.4m)を足していなかったため、寄るほどカメラが地面に沈み、
# 注視点(0.4m)を見上げる形になっていた。
rep("""      T.tx + T.r*Math.sin(T.phi)*Math.cos(T.theta),
      T.r*Math.cos(T.phi),
      T.tz + T.r*Math.sin(T.phi)*Math.sin(T.theta));
    camera.lookAt(T.tx,0.4,T.tz);""",
"""      T.tx + T.r*Math.sin(T.phi)*Math.cos(T.theta),
      0.4 + T.r*Math.cos(T.phi),   /* ★2026-08-13d 注視点(0.4m)を中心に回る。足さないと寄ったとき見上げになる */
      T.tz + T.r*Math.sin(T.phi)*Math.sin(T.theta));
    camera.lookAt(T.tx,0.4,T.tz);""")
rep("window.d3Zoom=function(k){ if(T) T.r=Math.min(2500,Math.max(0.25,T.r*k)); };",
    "window.d3Zoom=function(k){ if(T) T.r=Math.min(2500,Math.max(0.6,T.r*k)); };")
rep("el.addEventListener('wheel',e=>{e.preventDefault(); T.r=Math.min(2500,Math.max(0.25,T.r*(e.deltaY>0?1.12:1/1.12)));},{passive:false});",
    "el.addEventListener('wheel',e=>{e.preventDefault(); T.r=Math.min(2500,Math.max(0.6,T.r*(e.deltaY>0?1.12:1/1.12)));},{passive:false});")
rep("if(d>10&&tg.d>10) T.r=Math.min(2500,Math.max(0.25, tg.r*tg.d/d));",
    "if(d>10&&tg.d>10) T.r=Math.min(2500,Math.max(0.6, tg.r*tg.d/d));")

# ---------- ② 初期値 立上り高さ／天端幅を変えたら、既にかいた辺にも反映できるように ----------
rep('<label>初期値 立上り高さ</label><input type="number" inputmode="decimal" id="defH" value="300" step="50" min="0" onchange="saveState()"><span class="u">mm</span>',
    '<label>初期値 立上り高さ</label><input type="number" inputmode="decimal" id="defH" value="300" step="50" min="0" onchange="nnDefApply(\'h\',this.value)"><span class="u">mm</span>')
rep('<label>初期値 天端幅</label><input type="number" inputmode="decimal" id="defW" value="250" step="10" min="0" onchange="saveState()"><span class="u">mm</span>',
    '<label>初期値 天端幅</label><input type="number" inputmode="decimal" id="defW" value="250" step="10" min="0" onchange="nnDefApply(\'w\',this.value)"><span class="u">mm</span>')

# ---------- ⑤ 寸法・角度の文字を大きく（特にPC） ----------
rep("""          ctx.font='700 11.5px sans-serif';
          const txt=f1(L)+'m';
          const w=ctx.measureText(txt).width+6;""",
"""          ctx.font='700 '+(NN_PHONE?11.5:15)+'px sans-serif';
          const txt=f1(L)+'m';
          const w=ctx.measureText(txt).width+7;""")
rep("""          const dp=nnPlaceBox(mx-nrm.x*15, my-nrm.y*15, w, 14, -nrm.x, -nrm.y);
          ctx.fillStyle='rgba(255,255,255,.85)'; ctx.fillRect(dp.x-w/2,dp.y-7,w,14);
          ctx.fillStyle='#33413a'; ctx.textAlign='center'; ctx.fillText(txt,dp.x,dp.y+4);""",
"""          const bh=NN_PHONE?14:18;
          const dp=nnPlaceBox(mx-nrm.x*15, my-nrm.y*15, w, bh, -nrm.x, -nrm.y);
          ctx.fillStyle='rgba(255,255,255,.85)'; ctx.fillRect(dp.x-w/2,dp.y-bh/2,w,bh);
          ctx.fillStyle='#33413a'; ctx.textAlign='center'; ctx.fillText(txt,dp.x,dp.y+bh*0.28);""")
rep("""            const tag=(e.k==='kabe'?'壁H':'H')+e.h;
            ctx.font='800 10px sans-serif';
            const tw=ctx.measureText(tag).width+8;""",
"""            const tag=(e.k==='kabe'?'壁H':'H')+e.h;
            ctx.font='800 '+(NN_PHONE?10:12.5)+'px sans-serif';
            const tw=ctx.measureText(tag).width+8;""")
rep("""            const hOut=(tab==='wf');
            const hp=hOut ? nnPlaceBox(mx-nrm.x*34, my-nrm.y*34, tw, 15, -nrm.x, -nrm.y)
                          : nnPlaceBox(mx+nrm.x*18, my+nrm.y*18, tw, 15,  nrm.x,  nrm.y);
            ctx.fillStyle=isSel?'#e8760a':(e.k==='kabe'?'#a05a10':'#2456b8');
            roundRect(ctx,hp.x-tw/2,hp.y-7.5,tw,15,4); ctx.fill();
            ctx.fillStyle='#fff'; ctx.fillText(tag,hp.x,hp.y+3.5);""",
"""            const hOut=(tab==='wf');
            const hb=NN_PHONE?15:18;
            const hp=hOut ? nnPlaceBox(mx-nrm.x*34, my-nrm.y*34, tw, hb, -nrm.x, -nrm.y)
                          : nnPlaceBox(mx+nrm.x*18, my+nrm.y*18, tw, hb,  nrm.x,  nrm.y);
            ctx.fillStyle=isSel?'#e8760a':(e.k==='kabe'?'#a05a10':'#2456b8');
            roundRect(ctx,hp.x-tw/2,hp.y-hb/2,tw,hb,4); ctx.fill();
            ctx.fillStyle='#fff'; ctx.fillText(tag,hp.x,hp.y+hb*0.24);""")
rep("""  ctx.font='800 12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(txt).width+11, h=19;
  const p=nnPlaceBox(mx+nx*14, my+ny*14, w, h, nx, ny);
  roundRect(ctx, p.x-w/2, p.y-9.5, w, h, 6);""",
"""  ctx.font='800 '+(NN_PHONE?12:15.5)+'px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(txt).width+11, h=NN_PHONE?19:23;
  const p=nnPlaceBox(mx+nx*14, my+ny*14, w, h, nx, ny);
  roundRect(ctx, p.x-w/2, p.y-h/2, w, h, 6);""")
rep("""  const txt=Math.round(deg)+'°';
  ctx.font='800 12.5px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(txt).width+9, h=19;
  const p=nnPlaceBox(vtx.x+Math.cos(mid)*(R+15), vtx.y+Math.sin(mid)*(R+15),
                     w, h, Math.cos(mid), Math.sin(mid));
  roundRect(ctx, p.x-w/2, p.y-9.5, w, h, 6);""",
"""  const txt=Math.round(deg)+'°';
  ctx.font='800 '+(NN_PHONE?12.5:15.5)+'px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const w=ctx.measureText(txt).width+9, h=NN_PHONE?19:23;
  const p=nnPlaceBox(vtx.x+Math.cos(mid)*(R+15), vtx.y+Math.sin(mid)*(R+15),
                     w, h, Math.cos(mid), Math.sin(mid));
  roundRect(ctx, p.x-w/2, p.y-h/2, w, h, 6);""")

# ---------- ⑥ 完成した形の寸法：表示・非表示ボタン＋出やすく ----------
rep("        if(epx>=44 && cellPx>=13){",
    "        if((typeof nnDimsOn==='undefined'||nnDimsOn) && epx>=34 && cellPx>=8){")
rep("          if(e.h>0 && epx>=64){",
    "          if(e.h>0 && epx>=48){")
rep('<button class="tbtn on" id="tl_grid" onclick="nnToggleGrid()" title="方眼（マス）を出す・消す。消すと図面らしい見た目になります">▦ マス</button>',
    '<button class="tbtn on" id="tl_grid" onclick="nnToggleGrid()" title="方眼（マス）を出す・消す。消すと図面らしい見た目になります">▦ マス</button>\n      <button class="tbtn on" id="tl_dims" onclick="nnToggleDims()" title="完成した形の寸法（◯m・H◯◯◯）を出す・消す">📏 寸法</button>\n      <button class="tbtn" id="tl_save" onclick="nnSaveDwg()" title="いまの図面に名前を付けて保存します">💾 保存</button>\n      <button class="tbtn" id="tl_open" onclick="nnOpenDwg()" title="保存した図面を開きます">📂 開く</button>')

# ---------- ⑨ Shift＝90度（水平・垂直）固定 ----------
rep("""  /* 角度を5度きざみに丸める */
  const deg=Math.round(Math.atan2(dy,dx)*180/Math.PI/NN_ANG_STEP)*NN_ANG_STEP;""",
"""  /* 角度を5度きざみに丸める。★Shiftを押している間は90度きざみ＝水平・垂直だけ */
  const stepA=(typeof mouse!=='undefined'&&mouse.shift)?90:NN_ANG_STEP;
  const deg=Math.round(Math.atan2(dy,dx)*180/Math.PI/stepA)*stepA;""")
rep("｜配置は0.1マス単位・<b>Shift＝1マススナップ</b>｜",
    "｜線は5度きざみ・<b>Shift＝90度ずつ（水平・垂直）</b>｜")

# ---------- ⑦ 役物が図面に出ない（★致命バグ：タブ名の取り違え） ----------
rep("  if(typeof tab!=='undefined' && tab!=='draw' && tab!=='wf') return;",
    "  /* ★2026-08-13d タブ名は 'zu'（'draw'ではない）。取り違えで①図面タブに役物が一切出ていなかった */\n  if(typeof tab!=='undefined' && tab!=='zu' && tab!=='wf') return;")
rep("""    /* 名前は回さずに水平で書く（読みやすさ優先） */
    if(Math.min(w,h)>=16){
      const tx=ox+it.x*cellPx, ty=oy+it.y*cellPx;
      ctx2.save();
      ctx2.font='700 11px system-ui,sans-serif'; ctx2.textAlign='center'; ctx2.textBaseline='middle';
      ctx2.lineWidth=3; ctx2.strokeStyle='rgba(255,255,255,.9)';
      ctx2.strokeText(P.name, tx, ty); ctx2.fillStyle='#14449c'; ctx2.fillText(P.name, tx, ty);
      ctx2.restore();
    }""",
"""    /* 名前は回さずに水平で書く（読みやすさ優先）。
       ★小さい役物は箱の上に出す（中に入らず「どこに置いたか分からない」ため） */
    {
      const tx=ox+it.x*cellPx, ty=oy+it.y*cellPx;
      const small=Math.min(w,h)<16;
      ctx2.save();
      ctx2.font='700 '+(NN_PHONE?11:12.5)+'px system-ui,sans-serif'; ctx2.textAlign='center'; ctx2.textBaseline='middle';
      ctx2.lineWidth=3; ctx2.strokeStyle='rgba(255,255,255,.9)';
      const ly=small? ty-h/2-10 : ty;
      ctx2.strokeText(P.name, tx, ly); ctx2.fillStyle=on?'#c96a00':'#14449c'; ctx2.fillText(P.name, tx, ly);
      ctx2.restore();
    }""")

# 役物ライブラリへ外から1件足せる口（3D押し出しが使う）
rep("window.nnPartsLib=()=>LIB;",
    "window.nnPartsLib=()=>LIB;\nwindow.nnPartsAddLib=function(item){ LIB.push(item); saveLib(); return item; };")

# ---------- 3Dペインに「押し出し」ボタン ----------
rep('<div id="three-wrap"><button id="d3wari" class="tbtn on" style="position:absolute;top:10px;left:10px;z-index:6" onclick="d3WariToggle()">🧵 割り付け表示</button>',
    '<div id="three-wrap"><button id="d3wari" class="tbtn on" style="position:absolute;top:10px;left:10px;z-index:6" onclick="d3WariToggle()">🧵 割り付け表示</button><button id="d3ext" class="tbtn" style="position:absolute;top:10px;left:152px;z-index:6" onclick="nnExtArm()">⬛ 押し出し</button>')

# ---------- スマホの「⋯道具」メニューに新ボタンを移す ----------
rep("['tl_hole','tl_split','tl_rect','tl_pan','tl_ang','tl_wfdim','tl_theme','tl_grid','tl_photo','tl_2pane']",
    "['tl_hole','tl_split','tl_rect','tl_pan','tl_ang','tl_wfdim','tl_theme','tl_grid','tl_dims','tl_photo','tl_2pane','tl_save','tl_open']")

# ---------- 末尾に：寸法トグル・初期値の一括反映・保存/開く・作図中の3Dプレビュー・押し出し ----------
add = """<script id="nn-fix10-js">
/* ============ 2026-08-13d：寸法トグル・初期値の一括反映・保存/開く・
   作図中の3Dプレビュー・3D押し出し ============ */
(function(){
'use strict';

/* ---- ⑥ 完成した形の寸法の表示・非表示 ---- */
window.nnDimsOn = localStorage.getItem('nn_zumen_dims')!=='0';
window.nnToggleDims=function(){
  window.nnDimsOn=!window.nnDimsOn;
  try{ localStorage.setItem('nn_zumen_dims', nnDimsOn?'1':'0'); }catch(_){}
  const b=document.getElementById('tl_dims'); if(b)b.classList.toggle('on',nnDimsOn);
  draw(); toast(nnDimsOn?'寸法を表示します':'寸法を隠しました（📏 寸法 で戻せます）');
};
addEventListener('load',function(){ const b=document.getElementById('tl_dims'); if(b)b.classList.toggle('on',nnDimsOn); });

/* ---- ② 初期値を変えたら、既にかいた辺にも反映できる ---- */
window.nnDefApply=function(kind,val){
  const v=Math.max(0,+val||0);
  saveState();
  if(!state.polys.length){ return; }
  const tgt=kind==='h'?'立上り高さ':'天端幅';
  if(!confirm('既にかいた辺の'+tgt+'も、すべて '+v+'mm に変えますか？\\n（キャンセル＝これから描く辺だけに効きます）'))return;
  let cnt=0;
  state.polys.forEach(p=>ringsOf(p).forEach(r=>r.edges.forEach(e=>{
    const kk=e.k||'para';
    if(kind==='h' && kk!=='free'){ e.h=v; cnt++; }
    if(kind==='w' && kk==='para'){ e.w=v; cnt++; }
  })));
  saveState(); renderEdgeEdit(); draw();
  toast(cnt+'辺の'+tgt+'を '+v+'mm にそろえました（3D・断面・PDFにも反映）');
};

/* ---- ④ 保存・開く（localStorage に名前を付けて保存） ---- */
const SKEY='nn_zumen_saves_v1';
function loadSaves(){ try{ return JSON.parse(localStorage.getItem(SKEY)||'[]'); }catch(_){ return []; } }
window.nnSaveDwg=function(){
  const d=new Date();
  const def='図面 '+(d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  const name=prompt('保存名（物件名を入れておくと現場記録帳から探しやすくなります）', def);
  if(name===null)return;
  const list=loadSaves();
  list.unshift({id:'s'+Date.now().toString(36), name:(name||def).trim()||def,
    date:d.toLocaleDateString('ja-JP'), data:JSON.stringify(state)});
  while(list.length>30)list.pop();
  try{ localStorage.setItem(SKEY, JSON.stringify(list)); toast('保存しました：'+(name||def)); }
  catch(e){ toast('保存できませんでした（この端末の保存容量がいっぱいです）'); }
};
window.nnOpenDwg=function(){
  let ov=document.getElementById('nnDwgList');
  if(ov){ ov.remove(); return; }
  const list=loadSaves();
  ov=document.createElement('div'); ov.id='nnDwgList';
  ov.innerHTML='<div class="bx"><h5>📂 保存した図面'+(list.length?'（開くと今の画面は置き換わります）':'')+'</h5>'
    +(list.length? list.map(it=>'<div class="rw" data-id="'+it.id+'"><span class="nm">'+it.name.replace(/</g,'&lt;')
      +'</span><span class="dt">'+it.date+'</span><button class="op">開く</button><button class="de">削除</button></div>').join('')
      : '<div class="no">まだ保存がありません。「💾 保存」で名前を付けて保存できます。</div>')
    +'<button class="cl">✕ 閉じる</button></div>';
  document.body.appendChild(ov);
  ov.addEventListener('click',e=>{
    const rw=e.target.closest('.rw');
    if(e.target.classList.contains('cl')||e.target===ov){ ov.remove(); return; }
    if(!rw)return;
    const it=loadSaves().find(x=>x.id===rw.dataset.id); if(!it)return;
    if(e.target.classList.contains('op')){
      if(!confirm('「'+it.name+'」を開きますか？（いまの図面は上書きされます。必要なら先に保存してください）'))return;
      localStorage.setItem('nn_zumen_v1', it.data); location.reload();
    }
    if(e.target.classList.contains('de')){
      if(!confirm('「'+it.name+'」を削除しますか？'))return;
      localStorage.setItem(SKEY, JSON.stringify(loadSaves().filter(x=>x.id!==it.id)));
      ov.remove(); nnOpenDwg();
    }
  });
};
/* 現場記録帳の「作成図面」タブからのリンク（?open=保存ID）で開く */
(function(){
  const m=location.search.match(/[?&]open=([a-z0-9]+)/i); if(!m)return;
  const it=loadSaves().find(x=>x.id===m[1]); if(!it)return;
  localStorage.setItem('nn_zumen_v1', it.data);
  history.replaceState(null,'',location.pathname);
  location.reload();
})();

/* ---- ⑧ 作図中（まだ閉じていない形）も3Dへ出す ----
   2画面のとき、描きかけの点が3つ以上あれば「立上りなしの仮の面」として3Dに足す。
   ★カメラは動かさない（組み直しのたびに全体表示へ戻ると作図の邪魔になるため） */
let lastSig='', hadPrev=false;
setInterval(function(){
  if(!document.body.classList.contains('nnsplit2'))return;
  if(typeof THREE==='undefined'||!T)return;
  const drawing=(tool==='draw'&&drawPts.length>=3);
  if(!drawing){
    if(hadPrev){ hadPrev=false; lastSig='';
      const cam={tx:T.tx,tz:T.tz,r:T.r,fk:d3FitKey};
      try{ build3D(); }catch(_){}
      T.tx=cam.tx; T.tz=cam.tz; T.r=cam.r; d3FitKey=cam.fk; T.rev=(T.rev|0)+1; }
    return;
  }
  const sig=drawPts.length+':'+drawPts.map(p=>p.x+','+p.y).join(';');
  if(sig===lastSig)return; lastSig=sig;
  const tmp={name:'（作図中）',
    lv:(state.active>=0&&state.polys[state.active])?(+state.polys[state.active].lv||0):0,
    pts:drawPts.map(p=>({x:p.x,y:p.y})), holes:[],
    edges:drawPts.map(()=>({h:0,w:0,k:'free'}))};
  const cam={tx:T.tx,tz:T.tz,r:T.r,fk:d3FitKey};
  state.polys.push(tmp);
  try{ build3D(); }catch(_){}
  state.polys.pop();
  T.tx=cam.tx; T.tz=cam.tz; T.r=cam.r; d3FitKey=cam.fk; T.rev=(T.rev|0)+1;
  hadPrev=true;
},450);

/* ---- ⑩ 3Dの面をタップ→押し出し（第1弾＝箱の押し出し） ----
   面を選んで大きさを入れると、その場所に立体（役物あつかい）を置く。
   2D図面にも同じ位置に出て、動かす・回す・消すは役物と同じ操作。 */
window.nnExtArm=function(){
  window._nnExtOn=!window._nnExtOn;
  const b=document.getElementById('d3ext'); if(b)b.classList.toggle('on',!!window._nnExtOn);
  toast(window._nnExtOn?'押し出し：3Dの屋根・壁の面をタップ → 大きさを入れると、その場所に立体を置きます（2D図面にも出ます）'
                       :'押し出しをやめました');
};
function hookExt(){
  if(typeof THREE==='undefined'||!T||!T.renderer)return;
  const el=T.renderer.domElement;
  if(el._nnExt)return; el._nnExt=1;
  let dp=null;
  el.addEventListener('pointerdown',e=>{ dp=[e.clientX,e.clientY]; });
  el.addEventListener('pointerup',e=>{
    if(!window._nnExtOn||!dp)return;
    if(Math.hypot(e.clientX-dp[0],e.clientY-dp[1])>8)return;   /* ドラッグは無視 */
    const r=el.getBoundingClientRect();
    const v=new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1);
    const rc=new THREE.Raycaster(); rc.setFromCamera(v,T.camera);
    const hits=rc.intersectObjects(T.scene.children,true)||[];
    const hit=hits.find(h=>h.object!==T.ground);
    if(!hit){ toast('面に当たりませんでした。屋根や壁の上をタップしてください'); return; }
    const sM=state.scaleM||0.5;
    const gx=hit.point.x/sM, gy=hit.point.z/sM;
    nnNumAsk('押し出し：幅（m）','2',function(w){ if(w===null)return;
      nnNumAsk('押し出し：奥行（m）','0.5',function(d){ if(d===null)return;
        nnNumAsk('押し出し：高さ（m）','0.6',function(h){ if(h===null)return;
          w=Math.max(0.05,+w||1); d=Math.max(0.05,+d||0.5); h=Math.max(0,+h||0.5);
          const name='押出し '+w+'×'+d+'×'+h+'m';
          let it=(window.nnPartsLib? nnPartsLib().find(x=>x.name===name) : null);
          if(!it && window.nnPartsAddLib){
            it=nnPartsAddLib({id:'x'+Date.now().toString(36), name, kind:'other',
              w:Math.round(w*1000), d:Math.round(d*1000), h:Math.round(h*1000),
              price:0, addM2:0, sealM:0, memo:'3Dの押し出しで作成'});
          }
          if(!it){ toast('役物の登録に失敗しました'); return; }
          state.parts=state.parts||[];
          state.parts.push({p:it.id, x:Math.round(gx*10)/10, y:Math.round(gy*10)/10, r:0});
          saveState(); draw(); try{ build3D(); }catch(_){}
          toast('置きました：'+name+'（2D図面の同じ位置にも出ています。役物と同じく移動・削除できます）');
        });});});
  });
}
setInterval(hookExt,800);
})();
</script>
<style id="nn-fix10">
#d3ext.on{background:var(--green-deep,#1c6b3c); color:#fff; border-color:var(--green-deep,#1c6b3c);}
#nnDwgList{position:fixed; inset:0; z-index:60; background:rgba(20,30,24,.45); display:flex; align-items:center; justify-content:center;}
#nnDwgList .bx{background:#fff; border-radius:12px; padding:14px 16px; width:min(92vw,460px); max-height:80vh; overflow-y:auto; box-shadow:0 8px 30px rgba(0,0,0,.3);}
#nnDwgList h5{font-size:14px; margin-bottom:9px; color:var(--green-deep,#1c6b3c);}
#nnDwgList .rw{display:flex; align-items:center; gap:8px; padding:7px 2px; border-top:1px solid #e2e8e0;}
#nnDwgList .nm{flex:1; font-weight:800; font-size:13.5px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
#nnDwgList .dt{font-size:11px; color:#7a877c; flex:none;}
#nnDwgList button{border:1px solid #b9c2b6; background:#fff; border-radius:7px; padding:5px 11px; font-size:12.5px; font-weight:800; cursor:pointer;}
#nnDwgList .op{color:var(--green-deep,#1c6b3c); border-color:var(--green-deep,#1c6b3c);}
#nnDwgList .de{color:#b3261e;}
#nnDwgList .cl{margin-top:10px; width:100%;}
#nnDwgList .no{color:#7a877c; font-size:12.5px; padding:8px 0;}
</style>
"""
a="\n</body>\n</html>"
assert s.count(a)==1
s=s.replace(a,"\n"+add+"</body>\n</html>")
n+=1

io.open(P,'w',encoding='utf-8',newline='').write(s)
print('zumen 置換', n, '件')

# ---------- kirokucho：作成図面タブに保存図面の一覧 ----------
P2='/home/user/osamarinavi_bousui/kirokucho_demo.html'
s2=io.open(P2,encoding='utf-8',newline='').read()
a="""      :'<p class="hint">まだ図面がありません。図面／積算機能で作成した平面図・納まり3DCGがここに紐づきます。</p>'}`;
    wireDrop(document.getElementById('dz'),p.id);"""
b="""      :'<p class="hint">まだ図面がありません。図面／積算機能で作成した平面図・納まり3DCGがここに紐づきます。</p>'}
      ${(window.nnZuSaves?nnZuSaves():'')}`;
    wireDrop(document.getElementById('dz'),p.id);"""
assert s2.count(a)==1
s2=s2.replace(a,b)

add2="""<script id="nn-zusaves-js">
/* 図面・積算「💾 保存」で保存した図面を、作成図面タブに一覧で出す（2026-08-13d）。
   「開く」を押すと図面・積算がその図面で開く（?open=保存ID）。 */
window.nnZuSaves=function(){
  let list=[]; try{ list=JSON.parse(localStorage.getItem('nn_zumen_saves_v1')||'[]'); }catch(_){}
  if(!list.length) return '<div class="hint" style="margin-top:10px;">図面・積算の「💾 保存」で保存した図面が、ここに一覧で出ます。</div>';
  return '<div style="margin-top:12px;"><b style="font-size:13px;color:var(--green-deep)">📐 図面・積算で保存した図面</b>'
    + list.map(it=>'<div style="display:flex;align-items:center;gap:8px;padding:6px 2px;border-bottom:1px dashed var(--line);font-size:13px;">'
      +'<span style="flex:1;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+String(it.name).replace(/</g,'&lt;')+'</span>'
      +'<span style="color:var(--ink-sub);font-size:11px;">'+it.date+'</span>'
      +'<a href="./zumen_sekisan.html?open='+it.id+'" style="font-weight:800;color:var(--green-deep);white-space:nowrap;">開く →</a></div>').join('')
    +'</div>';
};
</script>
"""
a2="\n</body>\n</html>"
assert s2.count(a2)==1
s2=s2.replace(a2,"\n"+add2+"</body>\n</html>")
io.open(P2,'w',encoding='utf-8',newline='').write(s2)
print('kirokucho 置換 2件')

# ---------- index.html：バックアップ対象に追加 ----------
P3='/home/user/osamarinavi_bousui/index.html'
s3=io.open(P3,encoding='utf-8',newline='').read()
a="  ['nn_zumen_parts_v1','図面・積算：登録した役物・架台'],"
b=a+"\n  ['nn_zumen_saves_v1','図面・積算：保存した図面'],"
assert s3.count(a)==1
s3=s3.replace(a,b)
io.open(P3,'w',encoding='utf-8',newline='').write(s3)
print('index 置換 1件')
