# -*- coding: utf-8 -*-
"""現場記録帳「工法別 受注・利益」
 ① いま何で並べているかを分かるようにする（見出しの帯＋列の色分け）
 ② 比率バーが「選んだ列の比率」であることを明示する
置換が各1件ずつ成功したときだけ書き込む。"""
import io, sys

P = '/home/user/osamarinavi_bousui/kirokucho_demo.html'
s = io.open(P, encoding='utf-8', newline='').read().replace('\r\n', '\n')
rep = []

def sub(old, new, tag):
    global s
    n = s.count(old)
    if n != 1:
        rep.append('★NG %s：%d件' % (tag, n)); return
    s = s.replace(old, new); rep.append('○ ' + tag)

# ---------------------------------------------------------------- ①②の計算部
sub(
"""  const hmKey=(dashSort.hou&&HOU_METRIC[dashSort.hou.col])?dashSort.hou.col:'order';
  const hmGet=HOU_METRIC[hmKey][1];
  const hmMax=Math.max(...houRows.map(hmGet),0.0001);
  const hmTot=houRows.reduce((a2,r)=>a2+hmGet(r),0)||1;""",
"""  const hmKey=(dashSort.hou&&HOU_METRIC[dashSort.hou.col])?dashSort.hou.col:'order';
  const hmGet=HOU_METRIC[hmKey][1];
  const hmMax=Math.max(...houRows.map(hmGet),0.0001);
  const hmTot=houRows.reduce((a2,r)=>a2+hmGet(r),0)||1;
  /* ★2026-08-08h いま何で並べ替えているかを分かりやすくする
     ・見出しの下に「◯◯の大きい順／バーは◯◯の比率」の帯を出す
     ・並び替え中の列は、見出しも中身も黄色くする */
  const HOU_NAME={name:'工法',bar:'比率',area:'面積',order:'受注額',profit:'利益額',rate:'平均利益率',n:'実績数'};
  const hSortCol=dashSort.hou?dashSort.hou.col:null;
  const hSortDir=dashSort.hou?dashSort.hou.dir:0;
  const hSortText=hSortCol
    ? (HOU_NAME[hSortCol]||hSortCol)+(hSortDir>0?' の小さい順':' の大きい順')
    : '平均利益率の高い順（既定）';
  const hmName=HOU_METRIC[hmKey][0];
  /* 表の中身に「並び替え中」の目印を付ける（class を足すだけ） */
  const hAddCls=(html,cls)=> /^<t[dh]\\s+class="/.test(html)
    ? html.replace(/^(<t[dh]\\s+class=")/, '$1'+cls+' ')
    : html.replace(/^(<t[dh])/, '$1 class="'+cls+'"');
  const houTh=c=>{ let t=houCell[c.id].th.replace('</th>',sortBtn('hou',c.id)+'</th>');
    return (c.id===hSortCol)?hAddCls(t,'hsorted'):t; };
  const houTd=(c,r)=>{ const t=houCell[c.id].td(r);
    return (c.id===hSortCol)?hAddCls(t,'hsorted'):t; };""",
'①②計算部（並び順の文言・列の目印）')

# ---------------------------------------------------------------- 比率バーの見出しと中身
sub(
"""    bar:{th:`<th style="min-width:140px">比率（${HOU_METRIC[hmKey][0]}）</th>`,td:r=>{const v=hmGet(r);const pct=hmKey==='rate'?(r.rate||0):v/hmTot*100;return `<td><div class="houbar"><i style="width:${(v/hmMax*100).toFixed(1)}%"></i><b>${pct.toFixed(1)}%</b></div></td>`;}},""",
"""    /* ★バーは「並び替えに選んだ列」の比率になる（面積を選べば面積の比率）。
       平均利益率だけは「比率」に意味がないので、率そのものの大きさを見せる。 */
    bar:{th:`<th style="min-width:150px"><span class="hbarlb">${hmKey==='rate'?'大きさ':'比率'}</span><span class="hbarmt">${HOU_METRIC[hmKey][0]}</span></th>`,
      td:r=>{const v=hmGet(r);const pct=hmKey==='rate'?(r.rate||0):v/hmTot*100;
      return `<td><div class="houbar"><i style="width:${(v/hmMax*100).toFixed(1)}%"></i><b>${pct.toFixed(1)}%</b></div></td>`;}},""",
'②比率バーの見出しを分かりやすく')

# ---------------------------------------------------------------- パネルの描画
sub(
"""    <div class="dpanel"><h4><span class="httl sq">工法別 受注・利益</span>${colBtn('hou')}${zBtn()}</h4>
      <div style="overflow-x:auto"><table class="mini-tbl">
      <tr>${houCols.map(c=>houCell[c.id].th.replace('</th>',sortBtn('hou',c.id)+'</th>')).join('')}</tr>
      ${applySort(houRows,'hou',HOU_GET).map(r=>`<tr>${houCols.map(c=>houCell[c.id].td(r)).join('')}</tr>`).join('')}
      </table></div>
    </div>""",
"""    <div class="dpanel"><h4><span class="httl sq">工法別 受注・利益</span>${colBtn('hou')}${zBtn()}</h4>
      <div class="housort">
        <span class="hsl">並び順</span><b class="hsv">${hSortText}</b>
        <span class="hsl">バーの${hmKey==='rate'?'大きさ':'比率'}</span><b class="hsv hsv2">${hmName}</b>
        ${hSortCol?`<button class="hsreset" onclick="event.stopPropagation();houSortReset()">↺ 並びを戻す</button>`:''}
        <span class="hsnote">見出しの ▼ を押すと、その項目で並び替わり、バーもその比率に変わります</span>
      </div>
      <div style="overflow-x:auto"><table class="mini-tbl hou-tbl">
      <tr>${houCols.map(c=>houTh(c)).join('')}</tr>
      ${applySort(houRows,'hou',HOU_GET).map(r=>`<tr>${houCols.map(c=>houTd(c,r)).join('')}</tr>`).join('')}
      </table></div>
    </div>""",
'①パネルに並び順の帯を出す')

# ---------------------------------------------------------------- 並びを戻すボタンの処理
sub(
"""function dashSortSet(t,c){const s=dashSort[t];dashSort[t]=(s&&s.col===c)?(s.dir>0?null:{col:c,dir:1}):{col:c,dir:-1};renderDash();}""",
"""function dashSortSet(t,c){const s=dashSort[t];dashSort[t]=(s&&s.col===c)?(s.dir>0?null:{col:c,dir:1}):{col:c,dir:-1};renderDash();}
/* 工法別の「↺ 並びを戻す」（既定＝平均利益率の高い順・バーは受注額の比率） */
window.houSortReset=function(){ dashSort.hou=null; renderDash(); };""",
'①「並びを戻す」の処理')

# ---------------------------------------------------------------- CSS（末尾に足す）
BLOCK = r'''
<style id="nn-housort">
/* ★2026-08-08h 工法別 受注・利益：いま何で並べているかを分かるようにする（本人の指示）
   ・見出しの下に「並び順」「バーの比率」を帯で出す
   ・並び替え中の列は、見出しも中身も黄色くして一目で分かるようにする
   ・比率バーは元から「選んだ列の比率」だったが、それが伝わる見出しに変えた */

/* --- 見出しの下の帯 --- */
.housort{display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:0 0 7px;
  font-size:11.5px; line-height:1.5;}
.housort .hsl{color:var(--ink-sub); font-weight:800;}
.housort .hsv{
  background:linear-gradient(180deg,#fff7d6,#ffe08a);
  border:1.5px solid #d9a300; border-radius:999px; padding:2px 11px;
  font-weight:900; color:#5f4400; white-space:nowrap;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.85), 0 1px 0 rgba(0,0,0,.10);}
.housort .hsv2{
  background:linear-gradient(180deg,#e9f7ec,#c8ecd4);
  border-color:#3a9e52; color:#14522c;}
.housort .hsreset{
  background:linear-gradient(180deg,#fff,#eef2ec); border:1px solid var(--line);
  border-radius:999px; padding:2px 10px; font-size:11px; font-weight:800;
  color:var(--ink-sub); cursor:pointer; font-family:inherit;}
.housort .hsreset:active{transform:translateY(1px);}
.housort .hsnote{color:var(--ink-sub); font-size:10.5px; font-weight:600;}

/* --- 並び替え中の列（見出し・中身とも黄色） --- */
.mini-tbl.hou-tbl th.hsorted{
  background:linear-gradient(180deg,#fff6cf,#ffe58a) !important;
  color:#5f4400 !important; font-weight:900 !important;
  box-shadow:inset 0 -3px 0 #d9a300;}
.mini-tbl.hou-tbl td.hsorted{ background:#fffbe9; }
.mini-tbl.hou-tbl th.hsorted .sortbtn{ color:#8a6100; font-size:12px; }

/* --- 比率の列見出し（「比率」＋対象の名前を2段で） --- */
.mini-tbl.hou-tbl th .hbarlb{display:block; font-size:9.5px; color:var(--ink-sub); font-weight:800; line-height:1.2;}
.mini-tbl.hou-tbl th.hsorted .hbarlb{color:#7a5b00;}
.mini-tbl.hou-tbl th .hbarmt{display:block; font-size:12px; font-weight:900; color:var(--green-deep); line-height:1.25;}
.mini-tbl.hou-tbl th.hsorted .hbarmt{color:#5f4400;}

/* --- スマホでは帯を1段にたたむ --- */
html[data-nnphone="1"] .housort{gap:4px; font-size:10.5px; margin-bottom:5px;}
html[data-nnphone="1"] .housort .hsv{padding:1px 8px;}
html[data-nnphone="1"] .housort .hsnote{display:none;}
</style>

</body>
</html>
'''
OLD = '\n</body>\n</html>\n'
if s.count(OLD) != 1:
    rep.append('★NG 末尾の目印：%d件' % s.count(OLD))
else:
    s = s.replace(OLD, BLOCK); rep.append('○ CSSを追加')

print('\n'.join(rep))
if any(r.startswith('★') for r in rep):
    print('→ 失敗があるので書き込みません'); sys.exit(1)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('→ 書き込みました')
