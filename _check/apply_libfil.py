# -*- coding: utf-8 -*-
# ライブラリ：検索欄と絞り込みを1行にまとめ、現場記録帳と同じ
# 「チェックボックス付きメニュー（複数選べる）＋件数」の方式にする
import io, sys

PATH = '/home/user/osamarinavi_bousui/library.html'
s = io.open(PATH, encoding='utf-8', newline='').read().replace('\r\n', '\n')
reps = []

# 検索の帯と絞り込みの帯を1つにまとめる
reps.append((
"""<div class="searchbar">
  <div class="box">
    <span class="ai">✨</span>
    <input id="q" placeholder="現場の言葉で検索（例：パラペットが低い時のトーチ端末）" onkeydown="if(event.key==='Enter')doSearch()">
    <button onclick="doSearch()">AI検索</button>
  </div>
</div>

<div class="filterbar">
  <span class="fl">絞り込み：</span>
  <select id="f-bui" onchange="render()"><option value="">部位：すべて</option></select>
  <select id="f-kou" onchange="render()"><option value="">工法：すべて</option></select>
  <select id="f-kbn" onchange="render()"><option value="">区分：すべて</option><option>改修</option><option>新築</option></select>
  <select id="f-sort" onchange="render()">
    <option value="new">並び：新しい順</option>
    <option value="reuse">並び：転用が多い順</option>
    <option value="warn">並び：注意あり優先</option>
  </select>
  <span class="clear" onclick="clearFilter()">クリア</span>""",
"""<div class="searchbar" id="nnLibBar">
  <div class="box">
    <span class="ai">✨</span>
    <input id="q" placeholder="現場の言葉で検索" onkeydown="if(event.key==='Enter')doSearch()">
    <button onclick="doSearch()">AI検索</button>
  </div>
  <div class="lchips" id="lchips"></div>
  <span class="lc" id="nnLibCount"></span>
</div>

<div class="filterbar" style="display:none">
  <span class="fl">絞り込み：</span>
  <select id="f-bui" onchange="render()"><option value="">部位：すべて</option></select>
  <select id="f-kou" onchange="render()"><option value="">工法：すべて</option></select>
  <select id="f-kbn" onchange="render()"><option value="">区分：すべて</option><option>改修</option><option>新築</option></select>
  <select id="f-sort" onchange="render()">
    <option value="new">並び：新しい順</option>
    <option value="reuse">並び：転用が多い順</option>
    <option value="warn">並び：注意あり優先</option>
  </select>
  <span class="clear" onclick="clearFilter()">クリア</span>""",
'L1 帯を1つにまとめる'))

# 絞り込みの判定にチップの選択を足す
reps.append((
"""function filtered(){
  let list=allItems();
  const fb=document.getElementById('f-bui').value;
  const fk=document.getElementById('f-kou').value;
  const fkb=document.getElementById('f-kbn').value;
  if(fb)list=list.filter(it=>it.bui.includes(fb));
  if(fk)list=list.filter(it=>it.kou===fk);
  if(fkb)list=list.filter(it=>it.kbn===fkb);""",
"""function filtered(){
  let list=allItems();
  if(window.nnLibPass)list=list.filter(nnLibPass);      /* チップ（複数選べる絞り込み） */
  const fb=document.getElementById('f-bui').value;
  const fk=document.getElementById('f-kou').value;
  const fkb=document.getElementById('f-kbn').value;
  if(fb)list=list.filter(it=>it.bui.includes(fb));
  if(fk)list=list.filter(it=>it.kou===fk);
  if(fkb)list=list.filter(it=>it.kbn===fkb);""",
'L2 絞り込みの判定'))

# 並び順もチップから
reps.append((
"""  const s=document.getElementById('f-sort').value;
  if(s==='reuse')list.sort((a,b)=>reuseOf(b)-reuseOf(a));
  else if(s==='warn')list.sort((a,b)=>(b.warn?1:0)-(a.warn?1:0));
  else list.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return list;""",
"""  const s=(window.nnLibSort&&nnLibSort())||document.getElementById('f-sort').value;
  if(s==='reuse')list.sort((a,b)=>reuseOf(b)-reuseOf(a));
  else if(s==='warn')list.sort((a,b)=>(b.warn?1:0)-(a.warn?1:0));
  else list.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return list;""",
'L3 並び順'))

# 一覧を描いたら件数とチップを更新
reps.append((
"""function render(){
  document.getElementById('hcount').textContent=`登録 ${allItems().length}件`;
  const c=document.getElementById('content');
  if(detailId){ renderDetail(c); return; }
  renderGrid(c);
  window.scrollTo(0,0);
}""",
"""function render(){
  document.getElementById('hcount').textContent=`登録 ${allItems().length}件`;
  const c=document.getElementById('content');
  if(window.nnLibChips)nnLibChips();                    /* 絞り込みチップ（件数つき）を作り直す */
  if(detailId){ renderDetail(c); return; }
  renderGrid(c);
  if(window.nnLibCountShow)nnLibCountShow(filtered().length, allItems().length);
  window.scrollTo(0,0);
}""",
'L4 render で更新'))

ok = True
for old, new, name in reps:
    c = s.count(old)
    print(('OK  ' if c == 1 else '★NG ') + name + f'  一致{c}件')
    if c != 1: ok = False
if not ok: sys.exit('中断')
for old, new, name in reps: s = s.replace(old, new)

BLOCK = r"""
<style id="nn-libfil">
/* ============================================================
   ライブラリの絞り込み（2026-08-06r）
   検索欄・絞り込み・件数を1行に。絞り込みは現場記録帳と同じ
   「チェックボックス付きメニュー（複数選べる）」にそろえた。
   ★このブロックは他の指定より後に置くこと（後に書いた方が勝つ）。
   ============================================================ */
#nnLibBar{display:flex; align-items:center; gap:8px; flex-wrap:nowrap;
  padding:7px 14px 7px !important; overflow:visible;}
#nnLibBar .box{flex:0 1 260px; min-width:150px; margin:0 !important; max-width:none !important;}
#nnLibBar input{font-size:16px;}          /* 16px未満だとiPhoneがタップ時に拡大する */
#nnLibBar .box button{padding:6px 12px !important; font-size:12.5px !important;}
#nnLibBar .lchips{flex:1 1 200px; min-width:0; display:flex; align-items:center; gap:6px;
  overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch;}
#nnLibBar .lchips::-webkit-scrollbar{display:none;}
#nnLibBar .lc{flex:none; white-space:nowrap; font-size:12.5px; font-weight:800;
  color:var(--green-deep); background:#fff; border:1.5px solid #b4d3bf; border-radius:999px; padding:3px 11px;}
#nnLibBar .lc b{font-size:15px;}
/* チップ（現場記録帳と同じ見た目） */
.lfil{position:relative; flex:none;}
.lfil>button{border:1px solid #3a4a3f; background:linear-gradient(180deg,#4a5a4e,#33413a); color:#fff;
  border-radius:8px; padding:5px 11px; font-size:12.5px; font-weight:800; cursor:pointer;
  font-family:inherit; white-space:nowrap; display:flex; align-items:center; gap:4px;}
.lfil>button.on{background:linear-gradient(180deg,#2e9e58,#1c6b3c); border-color:#1c6b3c;}
.lfil>button b{background:#ffd94d; color:#4a3800; border-radius:999px; padding:0 6px; font-size:11px;}
.lfil>button .car{font-size:9px; opacity:.8;}
/* メニュー（body直下のポータルに複製して出す＝親の overflow に閉じ込められない） */
#nnLibPortal{position:fixed; z-index:9990; display:none; background:#fff; border:1.5px solid var(--green-deep);
  border-radius:10px; box-shadow:0 10px 28px rgba(0,0,0,.3); padding:5px; min-width:190px;
  max-height:320px; overflow-y:auto; -webkit-overflow-scrolling:touch;}
#nnLibPortal.open{display:block;}
#nnLibPortal .dfclear{font-size:12px; font-weight:800; color:var(--warn); padding:6px 10px; cursor:pointer;
  border-bottom:1px solid var(--line); margin-bottom:3px;}
#nnLibPortal .dfrow{display:flex; align-items:center; gap:7px; padding:6px 10px; font-size:13px;
  font-weight:700; cursor:pointer; border-radius:6px;}
#nnLibPortal .dfrow:hover{background:var(--green-lite);}
#nnLibPortal .dfrow.sel{background:var(--green-lite);}
#nnLibPortal .dfrow input{width:16px; height:16px; accent-color:var(--green-deep); flex:none;}
#nnLibPortal .dfrow .vn{flex:1; min-width:0;}
#nnLibPortal .dfrow .vc{font-size:11.5px; color:var(--ink-sub); font-weight:800; white-space:nowrap;}
html[data-nnphone="1"] #nnLibBar{padding:6px 12px !important; gap:6px;}
html[data-nnphone="1"] #nnLibBar .box{flex:0 1 190px; min-width:120px;}
html[data-nnphone="1"] #nnLibBar .lc{font-size:11.5px; padding:3px 9px;}
html[data-nnphone="1"] #nnLibBar .lc b{font-size:13.5px;}
html[data-nnphone="1"] .lfil>button{font-size:11.5px; padding:4px 9px;}
</style>
<script id="nn-libfil-js">
/* ライブラリの絞り込みチップ。上の <style id="nn-libfil"> とセット。 */
(function(){
"use strict";
const FIL=[
  {k:'bui',  label:'部位',  vals:it=>it.bui||[]},
  {k:'kou',  label:'工法',  vals:it=>[it.kou]},
  {k:'kbn',  label:'区分',  vals:it=>[it.kbn]},
];
const SORTS=[['new','新しい順'],['reuse','転用が多い順'],['warn','注意あり優先']];
const sel={}; FIL.forEach(f=>sel[f.k]=new Set());
let sortKey='new', open=null;

window.nnLibPass=function(it){
  return FIL.every(f=>{
    if(!sel[f.k].size)return true;
    const v=f.vals(it)||[];
    for(const x of sel[f.k]) if(v.includes(x))return true;
    return false;
  });
};
window.nnLibSort=()=>sortKey;
window.nnLibCountShow=function(n,all){
  const el=document.getElementById('nnLibCount');
  if(el)el.innerHTML='<b>'+n+'</b>件 / 全<b>'+all+'</b>件';
};

/* --- メニューを body 直下に出す（帯が横スクロールの箱でも閉じ込められない） --- */
function portal(){
  let p=document.getElementById('nnLibPortal');
  if(!p){ p=document.createElement('div'); p.id='nnLibPortal'; document.body.appendChild(p);
    p.addEventListener('pointerdown',e=>e.stopPropagation()); }
  return p;
}
function closeMenu(){ open=null; const p=document.getElementById('nnLibPortal'); if(p)p.classList.remove('open');
  document.querySelectorAll('#lchips .lfil>button.open').forEach(b=>b.classList.remove('open')); }
window.nnLibCloseMenu=closeMenu;
document.addEventListener('pointerdown',e=>{
  if(Date.now()-(window.__nnLibTap||0)<60)return;
  if(e.target.closest&&(e.target.closest('#nnLibPortal')||e.target.closest('#lchips')))return;
  closeMenu();
});
function showMenu(key, btn, html){
  const p=portal(); p.innerHTML=html; p.classList.add('open');
  const b=btn.getBoundingClientRect();
  p.style.maxHeight=Math.max(140,Math.min(320, innerHeight-b.bottom-16))+'px';
  p.style.top=Math.min(b.bottom+4, innerHeight-160)+'px';
  p.style.left=Math.max(6, Math.min(b.left, innerWidth-p.offsetWidth-6))+'px';
  open=key;
}
window.nnLibToggle=function(e,key){
  e.stopPropagation(); if(e.preventDefault)e.preventDefault();
  window.__nnLibTap=Date.now();
  const btn=e.target.closest('.lfil').querySelector('button');
  if(open===key){ closeMenu(); return; }
  closeMenu(); btn.classList.add('open');
  showMenu(key, btn, menuHTML(key));
};
function counts(f){
  const m=new Map();
  (typeof allItems==='function'?allItems():[]).forEach(it=>{
    (f.vals(it)||[]).forEach(v=>{ if(v==null||v==='')return; m.set(v,(m.get(v)||0)+1); });
  });
  return [...m.entries()].sort((a,b)=>b[1]-a[1]);
}
function menuHTML(key){
  if(key==='sort'){
    return '<div class="dfclear" onclick="nnLibSetSort(\'new\')">✕ 並びを既定（新しい順）に戻す</div>'
      + SORTS.map(([v,lb])=>'<div class="dfrow'+(sortKey===v?' sel':'')+'" onclick="nnLibSetSort(\''+v+'\')"><span class="vn">'+lb+'</span></div>').join('');
  }
  const f=FIL.find(x=>x.k===key); if(!f)return '';
  const rows=counts(f).map(([v,c],i)=>
    '<label class="dfrow"><input type="checkbox" '+(sel[key].has(v)?'checked':'')+
    ' onchange="nnLibChk(\''+key+'\',this.getAttribute(\'data-v\'))" data-v="'+String(v).replace(/"/g,'&quot;')+'">'+
    '<span class="vn">'+v+'</span><span class="vc">'+c+'件</span></label>').join('');
  return '<div class="dfclear" onclick="nnLibClear(\''+key+'\')">✕ すべて解除（全件に戻す）</div>'+rows;
}
window.nnLibChk=function(key,v){
  if(sel[key].has(v))sel[key].delete(v); else sel[key].add(v);
  render();
  /* 開いたままにする */
  const btn=document.querySelector('#lchips .lfil[data-k="'+key+'"] button');
  if(btn){ btn.classList.add('open'); showMenu(key, btn, menuHTML(key)); }
};
window.nnLibClear=function(key){ sel[key].clear(); closeMenu(); render(); };
window.nnLibSetSort=function(v){ sortKey=v; closeMenu(); render(); };
window.nnLibClearAll=function(){ FIL.forEach(f=>sel[f.k].clear()); sortKey='new'; closeMenu(); render(); };

/* --- チップを作り直す（件数つき） --- */
window.nnLibChips=function(){
  const wrap=document.getElementById('lchips'); if(!wrap)return;
  const any=FIL.some(f=>sel[f.k].size)||sortKey!=='new';
  wrap.innerHTML=FIL.map(f=>
    '<span class="lfil" data-k="'+f.k+'"><button type="button" class="'+(sel[f.k].size?'on':'')+'"'+
    ' onpointerdown="nnLibToggle(event,\''+f.k+'\')" onclick="event.preventDefault();event.stopPropagation();">'+
    f.label+(sel[f.k].size?'<b>'+sel[f.k].size+'</b>':'')+'<span class="car">▼</span></button></span>').join('')
    +'<span class="lfil" data-k="sort"><button type="button" class="'+(sortKey!=='new'?'on':'')+'"'+
    ' onpointerdown="nnLibToggle(event,\'sort\')" onclick="event.preventDefault();event.stopPropagation();">'+
    '並び<span class="car">▼</span></button></span>'
    +(any?'<span class="lfil"><button type="button" onclick="nnLibClearAll()">✕ 解除</button></span>':'');
};
/* 既存の「クリア」からも解除できるように */
const oldClear=window.clearFilter;
window.clearFilter=function(){ FIL.forEach(f=>sel[f.k].clear()); sortKey='new'; closeMenu(); if(oldClear)oldClear(); else render(); };
addEventListener('resize',closeMenu);
try{ render(); }catch(_){}
})();
</script>
"""
anchor = "\n</body>\n</html>"
assert s.count(anchor) == 1
s = s.replace(anchor, "\n" + BLOCK + anchor)
print('OK  絞り込みチップの本体')

io.open(PATH, 'w', encoding='utf-8', newline='').write(s)
print('書き込み完了')
