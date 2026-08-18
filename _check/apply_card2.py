# 現場一覧カードの大改修（2026-08-13a）
# ①カードの帯を見本のレイアウトに（1行目=名前・状態・単価・元請・金額3種／2行目=住所／3行目=工法・数量・記号・メーカー）
# ②枠を細く(3px→1.5px)、絞り込みチップを検索欄のすぐ右に
# ③一覧の上（タブ・検索の行）をスマホでうすく
# ④囲みの項目はその場でタップ→入力できる（詳細を開かずに編集）
import io

P = '/home/user/osamarinavi_bousui/kirokucho_demo.html'
s = io.open(P, encoding='utf-8', newline='').read()
n_rep = 0

def rep(a, b):
    global s, n_rep
    assert s.count(a) == 1, '一致しない: ' + a[:60]
    s = s.replace(a, b)
    n_rep += 1

# ---------- 1) カードの雛形を差し替え ----------
old = """    return `<div class="pcard st-${p.stRaw}${p.id===selectedId?' sel':''}" data-pid="${p.id}">
      <div class="pph"><img src="./icons/roofph_${(p.id%6)+1}.jpg" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></div>
      <div class="pbd">
      <div class="row1"><h3>${p.name}</h3><span class="area">数量：${(p.m||0).toLocaleString()}${p.un||'㎡'}</span></div>
      <div class="roofs">
        <div class="roofline"><b>${p.kouhou||p.hou}</b>　<span class="badge ${badgeCls(p.spec||'')}">${p.spec||'—'}</span>
        　${(p.m||0).toLocaleString()}${p.un||'㎡'}${p.tan?`　単価 ¥${p.tan.toLocaleString()}/${p.un}`:''}　${p.maker||''}</div>
      </div>
      ${window.nnDefRow?nnDefRow(p,0):''}
      <div class="row3">
        <span>${p.addr}</span><span>${p.date}</span>
        <span class="status" style="background:${ST_COLOR[p.status]}">${p.status}</span>
        <span>元請：${p.moto}</span>
        ${ex?`<span class="exflag">⚠ 追加工事未回収 ${ex}件</span>`:''}
        <span class="money">
          <span class="order">受注金額：${yen(p.order)}</span><br>
          <span class="profit">利益予定額：${pr!=null?yen(pr):'策定中'}</span>
        </span>
      </div></div></div>`;"""
new = """    return `<div class="pcard st-${p.stRaw}${p.id===selectedId?' sel':''}" data-pid="${p.id}">
      <div class="pph"><img src="./icons/roofph_${(p.id%6)+1}.jpg" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></div>
      <div class="pbd">
      <div class="prow r1">
        <span class="ebox ttl" data-f="name" title="タップで編集">${p.name}</span>
        <span class="status stsel" data-f="status" title="タップで変更" style="background:${ST_COLOR[p.status]}">${p.status} ▾</span>
        <span class="ebox" data-f="tan"><i>請負単価</i>¥${(p.tan||0).toLocaleString()}/${p.un||'㎡'}</span>
        <span class="ebox" data-f="moto"><i>元請</i>${p.moto}</span>
        <span class="ebox" data-f="order"><i>請負金額</i>${yen(p.order)}</span>
        <span class="ebox" data-f="mat"><i>材料金額</i>${yen(p.mat)}</span>
        <span class="ebox" data-f="jin"><i>工賃</i>${yen(p.jin)}</span>
        <span class="ebox" data-f="hoka"><i>他</i>${yen((p.other||0)+(p.keihi||0))}</span>
      </div>
      <div class="prow r2">
        <span class="ebox" data-f="addr">${p.addr}</span><span class="pdate">${p.date}</span>
        ${ex?`<span class="exflag">⚠ 追加工事未回収 ${ex}件</span>`:''}
        <span class="pprofit">利益予定額：${pr!=null?yen(pr):'策定中'}</span>
      </div>
      <div class="prow r3">
        <span class="ebox" data-f="kouhou">${p.kouhou||p.hou} ▾</span>
        <span class="ebox" data-f="m">${(p.m||0).toLocaleString()}${p.un||'㎡'}</span>
        <span class="badge ${badgeCls(p.spec||'')}">${p.spec||'—'}</span>
        ${p.maker?`<span class="mkchip">${p.maker}</span>`:''}
      </div>
      ${window.nnDefRow?nnDefRow(p,0):''}
      </div></div>`;"""
rep(old, new)

# ---------- 2) カードの見た目（nn-pwcard を丸ごと書き換え） ----------
i0 = s.find('<style id="nn-pwcard">')
i1 = s.find('</style>', i0) + len('</style>')
assert i0 > 0
css = """<style id="nn-pwcard">
/* ============ 現場一覧カード：ゲームUI風・その場で編集（2026-08-13a） ============
   ・角の丸みなし・状態ごとの色枠（施工中=橙／見積済=青／完成済=緑／引合い=黄／契約済=赤）
   ・枠は細く1.5px（「太すぎる」の指摘で3pxから変更）
   ・左に現場写真（icons/roofph_1〜6.jpg は見た目確認用の仮画像。実写が来たら差し替え）
   ・囲み（.ebox）はタップでその場入力。処理は <script id="nn-inline-edit"> */
#list .pcard{
  --stc:#8f9a90;
  display:flex; align-items:stretch; padding:0;
  border-radius:0 !important;
  border:1.5px solid var(--stc);
  box-shadow:0 1px 0 rgba(0,0,0,.10);
}
#list .pcard.st-kou{--stc:#ff8a1e;}
#list .pcard.st-mit,
#list .pcard.st-chosa{--stc:#2f9dff;}
#list .pcard.st-kan{--stc:#21a53f;}
#list .pcard.st-hikiai{--stc:#f0c419;}
#list .pcard.st-keiyaku{--stc:#d84343;}
#list .pcard .pph{flex:0 0 185px; margin:2px; overflow:hidden; background:#dfe4dd; display:flex;}
#list .pcard .pph img{width:100%; height:100%; object-fit:cover; display:block;}
#list .pcard .pbd{flex:1; min-width:0; padding:7px 12px 7px; display:flex; flex-direction:column; gap:5px; justify-content:center;}
#list .pcard.sel{box-shadow:0 0 0 2px var(--green-lite,#cfe8d9), 0 2px 8px rgba(0,0,0,.12);}
/* 行 */
#list .pcard .prow{display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:13px; color:var(--ink);}
/* 囲み＝その場で編集できる項目 */
#list .pcard .ebox{
  display:inline-block; background:#fff; border:1px solid #b9c2b6; border-radius:0;
  padding:2px 8px; font-weight:700; cursor:pointer; white-space:nowrap;
  max-width:100%; overflow:hidden; text-overflow:ellipsis;
}
#list .pcard .ebox:hover{border-color:var(--green-deep,#1c6b3c); background:#f4faf6;}
#list .pcard .ebox i{font-style:normal; font-weight:700; font-size:10.5px; color:var(--ink-sub);
  margin-right:5px; padding-right:5px; border-right:1px solid #d5dcd2;}
#list .pcard .ebox.ttl{font-size:15.5px; font-weight:800;}
#list .pcard .ebox input,#list .pcard .ebox select{
  border:0; outline:none; background:#fffbe6; font:inherit; font-size:16px; padding:0; margin:0;
  width:100%; min-width:60px;}
#list .pcard .stsel{cursor:pointer;}
#list .pcard .pdate{color:var(--ink-sub); font-size:12px;}
#list .pcard .pprofit{margin-left:auto; color:var(--profit); font-weight:800; font-size:13.5px; white-space:nowrap;}
#list .pcard .mkchip{background:#8fd08f; color:#0e3c20; font-weight:800; font-size:12px; padding:2px 10px;}
/* 絞り込みチップ：検索欄のすぐ右へ（右寄せをやめる。件数の札は今までどおり右端） */
#toolbar .chips{margin-left:0;}
/* スマホ：写真は小さく・本文を詰める */
html[data-nnphone="1"] #list .pcard .pph{flex:0 0 108px;}
html[data-nnphone="1"] #list .pcard .pbd{padding:4px 8px; gap:3px;}
html[data-nnphone="1"] #list .pcard .prow{gap:4px; font-size:12px;}
html[data-nnphone="1"] #list .pcard .ebox{padding:1px 6px;}
html[data-nnphone="1"] #list .pcard .ebox.ttl{font-size:13.5px;}
/* スマホ：上のタブと検索の行をうすく（「タテに太い」の指摘） */
html[data-nnphone="1"] #viewtabs{padding:2px 8px 0 !important; gap:4px !important;}
html[data-nnphone="1"] #viewtabs button{padding:4px 10px !important; font-size:12px !important;}
html[data-nnphone="1"] .toolbar{padding:3px 8px !important; gap:5px !important;}
html[data-nnphone="1"] .search{flex:0 1 200px;}
html[data-nnphone="1"] .search input{padding:3px 8px 3px 26px;}
html[data-nnphone="1"] .chip>button{padding:4px 9px; font-size:11.5px;}
</style>"""
s = s[:i0] + css + s[i1:]
n_rep += 1

# ---------- 3) その場で編集の処理 ----------
js = """<script id="nn-inline-edit">
/* ============ 一覧カードのその場編集（2026-08-13a） ============
   ・囲み（.ebox）をタップ → その場が入力欄になり、Enter か外タップで確定
   ・状態（.stsel）と工法はプルダウン
   ・確定すると props を直接書き換えて recalcProp → 一覧・集計とも反映
   ・保存の永続化は既存の編集フォームと同じ「ページを開いている間」
   ★カードの「1回目タップ=黄色選択」より先に captureフェーズで受け取り、
     編集のタップがカードの選択・移動として扱われないよう stopPropagation する */
(function(){
'use strict';
const num=v=>{const x=parseFloat(String(v).replace(/[^\\d.\\-]/g,'')); return isNaN(x)?0:x;};
function commit(p,f,val){
  const src=p.a||p.y;   /* 表示しているコストの出どころ（実績があれば実績） */
  if(f==='name'){ const v=val.trim(); if(v)p.name=v; }
  else if(f==='addr'){ const v=val.trim(); if(v){p.addr=v;
    p.area=(p.addr.match(/^東京都[^区]+区|^[^市]+市|^[^町]+町/)||['その他'])[0];} }
  else if(f==='moto'){ const v=val.trim(); if(v)p.moto=v; }
  else if(f==='tan'){ p.tan=Math.max(0,Math.round(num(val))); }
  else if(f==='m'){ p.m=Math.max(0,num(val)); if(p.roofs&&p.roofs[0])p.roofs[0].hiraba=p.m; }
  else if(f==='order'){ p.order=Math.max(0,Math.round(num(val))); }
  else if(f==='mat'){ if(src){src[0]=Math.max(0,Math.round(num(val)));} }
  else if(f==='jin'){ if(src){src[1]=Math.max(0,Math.round(num(val)));} }
  else if(f==='hoka'){ if(src){src[2]=Math.max(0,Math.round(num(val))-(src[3]||0));} }
  if(src){ p.mat=src[0]; p.jin=src[1]; p.other=src[2]; p.keihi=src[3]; }
  if(typeof recalcProp==='function')recalcProp(p);
  dashDirty=true; if(typeof buildChips==='function')buildChips();
  if(typeof lfCounts==='function')lfCounts();
  toast('保存しました（この画面での変更はサンプルのため、再読み込みで元に戻ります）');
  render();
  if(document.getElementById('mainview').classList.contains('show-detail'))renderDetail();
}
function commitSel(p,f,val){
  if(f==='status'){ p.status=val; p.stRaw=ST_INV[val]||'hikiai'; }
  else if(f==='kouhou'){ p.kouhou=val; p.hou=HOU_MAP(val); p.spec=CODE_MAP(val);
    const mk=KO_MASTER[val]; if(mk){p.maker=mk[0]; p.sozai=mk[1]; p.shiire=mk[0];}
    if(p.roofs&&p.roofs[0])p.roofs[0].hCode=p.spec; }
  if(typeof recalcProp==='function')recalcProp(p);
  dashDirty=true; if(typeof buildChips==='function')buildChips();
  if(typeof lfCounts==='function')lfCounts();
  toast('保存しました（この画面での変更はサンプルのため、再読み込みで元に戻ります）');
  render();
}
function startEdit(box){
  if(box.querySelector('input,select'))return;      /* すでに編集中 */
  const card=box.closest('.pcard'); if(!card)return;
  const p=props.find(x=>x.id===+card.dataset.pid); if(!p)return;
  const f=box.dataset.f;
  /* プルダウン型（状態・工法） */
  if(f==='status'||f==='kouhou'){
    const sel=document.createElement('select');
    const opts=f==='status'
      ? Object.keys(ST_INV)
      : [...new Set([...Object.keys(KO_MASTER), ...props.map(x=>x.kouhou).filter(Boolean)])];
    opts.forEach(o=>{const op=document.createElement('option'); op.value=op.textContent=o; sel.appendChild(op);});
    sel.value=f==='status'?p.status:(p.kouhou||'');
    box.innerHTML=''; box.appendChild(sel); sel.focus();
    let done=false;
    sel.onchange=()=>{done=true; commitSel(p,f,sel.value);};
    sel.onblur=()=>{ if(!done)render(); };
    return;
  }
  /* 入力型 */
  const NUMF=['tan','m','order','mat','jin','hoka'];
  const cur = f==='name'?p.name : f==='addr'?p.addr : f==='moto'?p.moto
    : f==='tan'?(p.tan||0) : f==='m'?(p.m||0) : f==='order'?(p.order||0)
    : f==='mat'?(p.mat||0) : f==='jin'?(p.jin||0) : (p.other||0)+(p.keihi||0);
  const inp=document.createElement('input');
  inp.type='text';
  if(NUMF.includes(f))inp.inputMode='decimal';      /* iPhoneで数字キーパッド */
  inp.value=cur;
  const w=Math.max(60,Math.min(320,box.getBoundingClientRect().width));
  box.innerHTML=''; box.appendChild(inp); box.style.minWidth=w+'px';
  inp.focus(); inp.select();
  let done=false;
  const fin=ok2=>{ if(done)return; done=true; if(ok2)commit(p,f,inp.value); else render(); };
  inp.onkeydown=e=>{ if(e.key==='Enter')fin(true); else if(e.key==='Escape')fin(false); };
  inp.onblur=()=>fin(true);
}
/* カードの選択処理（#list の pointerdown / click）より先に受け取る */
document.addEventListener('pointerdown',e=>{
  const t=e.target.closest&&e.target.closest('#list .pcard .ebox, #list .pcard .stsel');
  if(t)e.stopPropagation();
},true);
document.addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('#list .pcard .ebox, #list .pcard .stsel');
  if(!t)return;
  e.stopPropagation(); e.preventDefault();
  startEdit(t);
},true);
})();
</script>
"""
a = "\\n</body>\\n</html>"
a = "\n</body>\n</html>"
assert s.count(a) == 1
s = s.replace(a, "\n" + js + "</body>\n</html>")
n_rep += 1

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('置換', n_rep, '件 完了')
