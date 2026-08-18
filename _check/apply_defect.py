# -*- coding: utf-8 -*-
# 現場記録帳に「不具合・現場条件タグ」を組み込む。
# 方式：置換が各1件ずつ成功したときだけ書き込む（CLAUDE.mdの取り決め）。
import io, sys

PATH = '/home/user/osamarinavi_bousui/kirokucho_demo.html'
s = io.open(PATH, encoding='utf-8', newline='').read().replace('\r\n', '\n')

reps = []

def rep(old, new, name):
    reps.append((old, new, name))

# R1: 一覧カードにタグの行（工法の行と row3 の間）
rep("""　${p.maker||''}</div>
      </div>
      <div class="row3">""",
    """　${p.maker||''}</div>
      </div>
      ${window.nnDefRow?nnDefRow(p,0):''}
      <div class="row3">""",
    'R1 一覧カード')

# R2: 物件詳細（meta の下・タブの上）にタグの行＋編集ボタン
rep("""        <span class="profit">利益予定額：${pr!=null?yen(pr):'策定中'}</span>
      </div>
      <div class="tabs">""",
    """        <span class="profit">利益予定額：${pr!=null?yen(pr):'策定中'}</span>
      </div>
      ${window.nnDefRow?nnDefRow(p,1):''}
      <div class="tabs">""",
    'R2 物件詳細')

# R3: 絞り込みの判定に不具合を追加
rep("""    if(q && !(p.name.includes(q)||p.addr.includes(q)))return false;
    return lfPass(p);""",
    """    if(q && !(p.name.includes(q)||p.addr.includes(q)))return false;
    if(window.nnDefPass&&!nnDefPass(p))return false;
    return lfPass(p);""",
    'R3 filtered')

# R4: 「絞り込み中」タグの一覧に不具合を追加
rep("""  const pf=filterState['profit']; if(pf)t.push(['profit','並び',pf]);
  return t;""",
    """  const pf=filterState['profit']; if(pf)t.push(['profit','並び',pf]);
  if(window.nnDefTags)nnDefTags(t);
  return t;""",
    'R4 lfTags')

# R5: タグの✕で不具合の絞り込みを外せるように
rep("""window.lfDrop=function(k,v){ if(k==='profit'){delete filterState['profit'];} else listFil[k].delete(v); buildChips(); render(); };""",
    """window.lfDrop=function(k,v){ if(k==='defect'&&window.nnDefDrop){nnDefDrop(v);} else if(k==='profit'){delete filterState['profit'];} else listFil[k].delete(v); buildChips(); render(); };""",
    'R5 lfDrop')

# R6: 検索リセットで不具合の絞り込みも解除
rep("""  LIST_FIL.forEach(f=>listFil[f.key].clear());
  delete filterState['profit'];""",
    """  LIST_FIL.forEach(f=>listFil[f.key].clear());
  delete filterState['profit'];
  if(window.nnDefClear)nnDefClear();""",
    'R6 lfResetAll')

# R7: 絞り込みバーの右端に「不具合別」チップを追加
rep("""      </div></span>`;
  if(lfOpen)requestAnimationFrame(placeLfMenu);""",
    """      </div></span>`
    +(window.nnDefChipHTML?nnDefChipHTML():'');
  if(lfOpen)requestAnimationFrame(placeLfMenu);""",
    'R7 buildChips')

# R8: 末尾に本体（スタイル＋スクリプト）。
#    ★目印は改行つきの \n</body>\n</html>（印刷用HTML文字列の中の </body></html> と区別するため）
BLOCK = """
<style id="nn-defect">
/* ============================================================
   不具合・現場条件タグ（2026-08-06e）
   膨れ・口開き・漏水などの防水の不具合を、物件にタグとして付けて
   一覧カード・物件詳細に表示し、「不具合別」で絞り込めるようにする。
   ・アイコン画像は icons/def_<キー>.png（背景透過PNG・高さ168px・幅は絵なり）。
     置くだけで文字チップの左に絵が出る。無い間は文字だけ（onerrorで自動非表示）。
   ・グループごとに色を分ける：症状=赤／原因=茶／部位の注意=緑／対応・宿題=黄
   ・保存は localStorage('nn_kirokucho_def_v1')＝{物件番号J◯◯◯:[キー,…]}。
     保存が無い物件はサンプル（SAMPLE）を表示する。
   ============================================================ */
.defrow{display:flex; flex-wrap:wrap; gap:4px 5px; margin-top:6px; align-items:center;}
.defrow .dlb{font-size:12px; font-weight:800; color:var(--ink-sub,#5a6b52); white-space:nowrap;}
.defrow .dnone{font-size:12px; color:#999;}
.defchip{display:inline-flex; align-items:center; gap:3px; padding:2px 8px; border-radius:999px;
  font-size:12px; font-weight:700; line-height:1.5; border:1.3px solid #999; background:#fff; white-space:nowrap;}
.defchip img{height:15px; width:auto; display:block;}
.defchip.g-sym  {color:#b23b2e; border-color:#c46a5e; background:#fdeeea;}
.defchip.g-cause{color:#7a4a1d; border-color:#a5804f; background:#f6eee2;}
.defchip.g-part {color:#4f6b2e; border-color:#87a05e; background:#f0f4e3;}
.defchip.g-todo {color:#a8730a; border-color:#cfa14a; background:#fdf3d7;}
.defrow .defedit{font-size:12px; font-weight:800;}
/* 編集画面：選ばれていないチップは灰色、タップで色が付く */
#nnDefModal .modal{width:min(640px,94vw);}
#nnDefModal .dnote{font-size:12.5px; color:#666; margin:-6px 0 4px;}
#nnDefModal .dgh{font-size:13px; font-weight:800; color:var(--green-deep,#1c6b3c); margin:12px 0 5px;
  border-left:4px solid var(--green-deep,#1c6b3c); padding-left:7px;}
#nnDefModal .dgrid{display:flex; flex-wrap:wrap; gap:6px;}
#nnDefModal .defchip{cursor:pointer; font-size:13.5px; padding:5px 11px; user-select:none;}
#nnDefModal .defchip:not(.on){color:#888; border-color:#ccc; background:#fafafa;}
#nnDefModal .defchip.on::before{content:'✓ '; font-weight:900;}
/* 絞り込みメニューのグループ見出し */
.dfmenu .dfgh{font-size:11.5px; font-weight:800; color:#888; padding:6px 10px 2px; border-top:1px solid #eee;}
</style>
<script id="nn-defect-js">
/* 不具合・現場条件タグ。上の <style id="nn-defect"> とセット。
   本文側の差し込み7か所（R1〜R7）から window.nnDef◯◯ を呼ぶ。 */
(function(){
"use strict";
const GROUPS={sym:'症状（見つけた不具合）', cause:'原因・環境', part:'部位の注意', todo:'対応・宿題'};
const DEFS=[
 ['fukure','膨れ','sym'],['kuchiaki','口開き','sym'],['tsuppari','突っ張り','sym'],['rosui','漏水','sym'],
 ['choking','チョーキング','sym'],['genmo','減耗','sym'],['sunaochi_geki','砂落ち激しい','sym'],['sunaochi','砂落ち','sym'],
 ['gamahada','ガマ肌','sym'],['pool','プール','sym'],['drain','ドレン詰まり','sym'],['osamari','納まり不良','sym'],
 ['toriai_furyo','取り合い不良','sym'],['tanmatsu','端末不具合','sym'],
 ['shitaji','下地起因','cause'],['togai','凍害','cause'],
 ['fukuzatsu','複雑形状','part'],['kyosho','狭小部位','part'],['toriai','取り合い発生','part'],
 ['settyaku','要接着試験','todo'],['hikinuki','要引き抜き試験','todo'],
 ['maker','メーカー相談','todo'],['maker_chu','メーカー相談中','todo'],['maker_zumi','メーカー相談済','todo'],
];
const BYKEY={}; DEFS.forEach(d=>BYKEY[d[0]]=d);
const BYLABEL={}; DEFS.forEach(d=>BYLABEL[d[1]]=d[0]);
const KEY='nn_kirokucho_def_v1';
let store={};
try{ store=JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(_){ store={}; }
function saveStore(){ try{ localStorage.setItem(KEY,JSON.stringify(store)); }catch(_){}}
/* サンプル（調査済・見積済・施工中・引合いの物件に、ありそうな組み合わせで） */
const SAMPLE={
 J064:['fukure','kuchiaki','drain'],
 J065:['fukure','sunaochi_geki','pool','settyaku'],
 J066:['choking','genmo','rosui','maker_chu'],
 J067:['gamahada','shitaji','hikinuki'],
 J068:['tanmatsu','toriai','fukuzatsu'],
 J057:['kuchiaki','tsuppari','togai','maker_zumi'],
 J058:['sunaochi','pool'],
 J060:['tanmatsu','kyosho'],
 J051:['toriai_furyo','osamari'],
 J053:['fukure','drain'],
 J070:['rosui','maker'],
 J072:['rosui','fukure'],
};
/* 各物件に反映（自分で編集した保存があれば保存を優先） */
props.forEach(p=>{ p.defects=(store[p.code]||SAMPLE[p.code]||[]).filter(k=>BYKEY[k]).slice(); });

function chipHTML(k, cls, on){
  const d=BYKEY[k]; if(!d)return '';
  return `<span class="defchip g-${d[2]}${on?' on':''}"${cls||''}><img src="./icons/def_${k}.png" alt="" onerror="this.style.display='none'">${d[1]}</span>`;
}
/* 一覧カード（detail=0）と物件詳細（detail=1）のタグの行 */
window.nnDefRow=function(p,detail){
  const chips=(p.defects||[]).map(k=>chipHTML(k)).join('');
  if(!detail) return chips?`<div class="defrow">${chips}</div>`:'';
  return `<div class="defrow"><span class="dlb">不具合・現場条件：</span>${chips||'<span class="dnone">なし</span>'}
    <button class="icon-mini defedit" onclick="nnDefEdit(${p.id})" title="不具合・現場条件タグを付け外しする">✎ タグを編集</button></div>`;
};

/* ---------- 編集（物件詳細の「✎ タグを編集」） ---------- */
let edId=null;
function ensureModal(){
  if(document.getElementById('nnDefModal'))return;
  const w=document.createElement('div'); w.id='nnDefModal'; w.className='modal-bg';
  w.innerHTML=`<div class="modal"><h3>不具合・現場条件タグ</h3>
    <p class="dnote">当てはまるものをタップして付け外しします（複数OK）。その場で保存されます。</p>
    <div id="nnDefBody"></div>
    <div class="btns"><button class="ok" onclick="nnDefClose()">閉じる</button></div></div>`;
  w.addEventListener('click',e=>{ if(e.target===w)nnDefClose(); });
  document.body.appendChild(w);
}
function paint(){
  const p=props.find(x=>x.id===edId); if(!p)return;
  document.getElementById('nnDefBody').innerHTML=Object.keys(GROUPS).map(g=>
    `<div class="dgh">${GROUPS[g]}</div><div class="dgrid">${
      DEFS.filter(d=>d[2]===g).map(d=>
        `<span class="defchip g-${d[2]}${p.defects.includes(d[0])?' on':''}" onclick="nnDefTgl('${d[0]}')"><img src="./icons/def_${d[0]}.png" alt="" onerror="this.style.display='none'">${d[1]}</span>`
      ).join('')}</div>`).join('');
}
window.nnDefEdit=function(id){ edId=id; ensureModal(); paint(); document.getElementById('nnDefModal').classList.add('open'); };
window.nnDefTgl=function(k){
  const p=props.find(x=>x.id===edId); if(!p)return;
  const i=p.defects.indexOf(k); if(i>=0)p.defects.splice(i,1); else p.defects.push(k);
  store[p.code]=p.defects.slice(); saveStore(); paint();
};
window.nnDefClose=function(){
  document.getElementById('nnDefModal').classList.remove('open');
  buildChips(); render();      /* 一覧カード・詳細・絞り込みの件数に反映 */
};

/* ---------- 絞り込み（「不具合別」チップ） ---------- */
const defFil=new Set();
window.nnDefPass=function(p){
  if(!defFil.size)return true;
  const s=p.defects||[]; let hit=false; defFil.forEach(k=>{ if(s.includes(k))hit=true; });
  return hit;                 /* 複数チェック＝どれか1つでも付いていれば表示（他の絞り込みと同じOR方式） */
};
window.nnDefTags=function(t){ defFil.forEach(k=>{ const d=BYKEY[k]; if(d)t.push(['defect','不具合',d[1]]); }); };
window.nnDefDrop=function(label){ const k=BYLABEL[label]; if(k)defFil.delete(k); };
window.nnDefClear=function(){ defFil.clear(); };
window.nnDefChipHTML=function(){
  const counts={}; props.forEach(p=>(p.defects||[]).forEach(k=>counts[k]=(counts[k]||0)+1));
  const rows=Object.keys(GROUPS).map(g=>{
    const items=DEFS.filter(d=>d[2]===g&&counts[d[0]]);
    if(!items.length)return '';
    return `<div class="dfgh">${GROUPS[g]}</div>`+items.map(d=>
      `<label class="dfrow"><input type="checkbox" ${defFil.has(d[0])?'checked':''} onchange="nnDefChk(event,'${d[0]}')"><span class="vn">${d[1]}</span><span class="vc">${counts[d[0]]}件</span></label>`).join('');
  }).join('');
  return `<span class="dfil${lfOpen==='defect'?' open':''}" data-k="defect">
      <button class="stchip ${defFil.size?'on':''}" onpointerdown="lfToggle(event,'defect')" onclick="event.preventDefault();event.stopPropagation();">不具合別${defFil.size?`<b>${defFil.size}</b>`:''}<span class="dfbtn-car">▼</span></button>
      <div class="dfmenu${lfOpen==='defect'?' open':''}" onpointerdown="event.stopPropagation()">
        <div class="dfclear" onclick="event.stopPropagation();nnDefClear();buildChips();render();">✕ すべて解除（全件に戻す）</div>
        ${rows}
      </div></span>`;
};
window.nnDefChk=function(e,k){
  if(defFil.has(k))defFil.delete(k); else defFil.add(k);
  buildChips(); render();
  /* 開いたままにする（lfChk と同じ作法） */
  const wrap=document.querySelector('#chips .dfil[data-k="defect"]');
  if(wrap){ wrap.classList.add('open'); lfOpen='defect'; nnShowPortal(wrap.querySelector('.dfmenu'), wrap.querySelector('button'), 0); }
};

/* 初期表示に反映（このスクリプトは本文の初回描画より後に読まれるため、1回描き直す） */
try{ buildChips(); render(); }catch(_){}
})();
</script>
"""
rep("\n</body>\n</html>", "\n" + BLOCK + "\n</body>\n</html>", 'R8 末尾ブロック')

ok = True
for old, new, name in reps:
    c = s.count(old)
    print(('OK  ' if c == 1 else '★NG ') + name + f'  一致{c}件')
    if c != 1:
        ok = False
if not ok:
    sys.exit('中断：一致が1件でない置換がある')
for old, new, name in reps:
    s = s.replace(old, new)
io.open(PATH, 'w', encoding='utf-8', newline='').write(s)
print('書き込み完了')
