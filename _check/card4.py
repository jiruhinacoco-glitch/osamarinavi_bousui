# 現場一覧カードの作り直し（2026-08-13g）
# ①写真の長押しがiOS標準メニューに横取りされる → -webkit-touch-callout:none ＋ タップできる帯も付ける
# ②レイアウト：現場名＋ステータスを最上段、境界線、その下に元請・金額・住所
#   写真は横長に（縦長は現場写真に合わない）・既存防水の名前が見切れないよう列を広く
#   メモは長すぎるので幅を抑える
import io

P='/home/user/osamarinavi_bousui/kirokucho_demo.html'
s=io.open(P,encoding='utf-8',newline='').read()
n=0
def rep(a,b):
    global s,n
    assert s.count(a)==1,('一致しない: '+a[:80])
    s=s.replace(a,b); n+=1

# ---------- 雛形：上段＝物件名＋ステータス／境界線／下段＝元請・金額・住所 ----------
rep("""        <div class="pph" title="長押しで写真を差し替え"><img src="${(window.nnPhotoOf&&nnPhotoOf(p))||('./icons/roofph_'+((p.id%6)+1)+'.jpg')}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span class="phhint">長押しで写真</span></div>""",
"""        <div class="pph" title="タップで写真を差し替え"><img src="${(window.nnPhotoOf&&nnPhotoOf(p))||('./icons/roofph_'+((p.id%6)+1)+'.jpg')}" alt="" loading="lazy" draggable="false" oncontextmenu="return false" onerror="this.style.visibility='hidden'"><span class="phhint">📷 写真を変える</span></div>""")

rep("""      <div class="pbd">
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
      <div class="pmain">
      <div class="pleft">
      <div class="prow r2">
        <span class="ebox" data-f="addr">${p.addr}</span><span class="pdate">${p.date}</span>
        ${ex?`<span class="exflag">⚠ 追加工事未回収 ${ex}件</span>`:''}
      </div>
      <div class="prow r3">
        <span class="ebox" data-f="kouhou">${p.kouhou||p.hou} ▾</span>
        <span class="ebox" data-f="m">${(p.m||0).toLocaleString()}${p.un||'㎡'}</span>
        <span class="badge ${badgeCls(p.spec||'')}">${p.spec||'—'}</span>
        ${p.maker?`<span class="mkchip">${p.maker}</span>`:''}
      </div>""",
"""      <div class="pbd">
      <div class="prow rhead">
        <span class="ebox ttl" data-f="name" title="タップで編集">${p.name}</span>
        <span class="status stsel" data-f="status" title="タップで変更" style="background:${ST_COLOR[p.status]}">${p.status} ▾</span>
        <span class="pprofit">利益予定額：${pr!=null?yen(pr):'策定中'}</span>
      </div>
      <div class="pmain">
      <div class="pleft">
      <div class="prow r1">
        <span class="ebox" data-f="moto"><i>元請</i>${p.moto}</span>
        <span class="ebox" data-f="tan"><i>請負単価</i>¥${(p.tan||0).toLocaleString()}/${p.un||'㎡'}</span>
        <span class="ebox" data-f="order"><i>請負金額</i>${yen(p.order)}</span>
        <span class="ebox" data-f="mat"><i>材料金額</i>${yen(p.mat)}</span>
        <span class="ebox" data-f="jin"><i>工賃</i>${yen(p.jin)}</span>
        <span class="ebox" data-f="hoka"><i>他</i>${yen((p.other||0)+(p.keihi||0))}</span>
      </div>
      <div class="prow r2">
        <span class="ebox" data-f="addr">${p.addr}</span><span class="pdate">${p.date}</span>
        ${ex?`<span class="exflag">⚠ 追加工事未回収 ${ex}件</span>`:''}
      </div>
      <div class="prow r3">
        <span class="ebox" data-f="kouhou">${p.kouhou||p.hou} ▾</span>
        <span class="ebox" data-f="m">${(p.m||0).toLocaleString()}${p.un||'㎡'}</span>
        <span class="badge ${badgeCls(p.spec||'')}">${p.spec||'—'}</span>
        ${p.maker?`<span class="mkchip">${p.maker}</span>`:''}
      </div>""")

# 下段の「利益予定額」は上段へ移したので、メモの行からは外す
rep("""      <span class="ebox pmemo" data-f="tb"><b>メモ</b><u>${p.tb?String(p.tb):''}</u></span>
      <span class="pprofit">利益予定額：${pr!=null?yen(pr):'策定中'}</span>
      </div>""",
"""      <span class="ebox pmemo" data-f="tb"><b>メモ</b><u>${p.tb?String(p.tb):''}</u></span>
      </div>""")

# ---------- 見た目 ----------
rep("""/* 左の列＝写真＋その下に「既存の状態」（2026-08-13f） */
#list .pcard .pcol{flex:0 0 185px; margin:2px; display:flex; flex-direction:column; gap:2px; min-width:0;}
#list .pcard .pph{flex:1 1 auto; min-height:74px; overflow:hidden; background:#dfe4dd; display:flex;
  position:relative; cursor:pointer;}""",
"""/* 左の列＝写真＋その下に「既存の状態」（2026-08-13g で横長に広げた） */
#list .pcard .pcol{flex:0 0 258px; margin:2px; display:flex; flex-direction:column; gap:2px; min-width:0;}
#list .pcard .pph{flex:1 1 auto; min-height:118px; overflow:hidden; background:#dfe4dd; display:flex;
  position:relative; cursor:pointer;
  /* ★iPhoneは長押しで「共有／写真に保存／コピー」を出してしまい、こちらの長押しが効かない。
       画像の長押しメニューと選択・ドラッグを止める（§29・§31と同じ対処）。 */
  -webkit-touch-callout:none; -webkit-user-select:none; user-select:none;}
#list .pcard .pph img{-webkit-touch-callout:none; -webkit-user-drag:none; pointer-events:none;}""")

rep("""#list .pcard .pph .phhint{
  position:absolute; left:0; right:0; bottom:0; background:rgba(20,30,24,.55); color:#fff;
  font-size:9.5px; font-weight:800; text-align:center; padding:1px 0; letter-spacing:.06em;
  opacity:0; transition:opacity .15s;}
#list .pcard .pph:hover .phhint{opacity:1;}""",
"""/* ★写真の帯は「押せる場所」。長押しが効かない端末でも、ここを1回タップすれば写真を選べる */
#list .pcard .pph .phhint{
  position:absolute; left:0; right:0; bottom:0; background:rgba(20,30,24,.62); color:#fff;
  font-size:10.5px; font-weight:800; text-align:center; padding:2px 0; letter-spacing:.04em;
  opacity:.9; transition:opacity .15s; pointer-events:none;}
#list .pcard .pph:hover .phhint{opacity:1;}""")

rep("""#list .pcard .pexist .ebox{width:100%; font-size:11px; padding:0 6px;}
#list .pcard .pexist .ebox i{font-size:9.5px; min-width:34px; justify-content:center;}""",
"""#list .pcard .pexist .ebox{width:100%; font-size:11.5px; padding:0 6px; overflow:hidden; text-overflow:ellipsis;}
#list .pcard .pexist .ebox i{font-size:9.5px; min-width:36px; justify-content:center; flex:none;}""")

# 上段（物件名＋ステータス）と境界線
rep("""#list .pcard .prow{display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:13px; color:var(--ink);}""",
"""#list .pcard .prow{display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:13px; color:var(--ink);}
/* 上段＝現場名とステータス。その下に境界線を引いて、下段（元請・金額・住所）と分ける */
#list .pcard .rhead{padding-bottom:5px; border-bottom:2px solid var(--stc); margin-bottom:2px;}
#list .pcard .rhead .pprofit{margin-left:auto;}""")

# メモは長すぎるので幅を抑える
rep("""#list .pcard .pmemo{
  flex:1 1 190px; min-width:120px; min-height:44px; align-self:stretch;
  display:flex; align-items:stretch; padding:0; white-space:normal; background:#fff;
}""",
"""#list .pcard .pmemo{
  flex:0 1 340px; max-width:340px; min-width:120px; min-height:30px; align-self:center;
  display:flex; align-items:stretch; padding:0; white-space:normal; background:#fff;
}""")

# スマホ
rep('html[data-nnphone="1"] #list .pcard .pcol{flex:0 0 118px;}\n'
    'html[data-nnphone="1"] #list .pcard .pph{min-height:56px;}\n'
    'html[data-nnphone="1"] #list .pcard .pexist .ebox{font-size:9.5px;}\n'
    'html[data-nnphone="1"] #list .pcard .pexist .ebox i{font-size:8.5px; min-width:28px;}',
    'html[data-nnphone="1"] #list .pcard .pcol{flex:0 0 172px;}\n'
    'html[data-nnphone="1"] #list .pcard .pph{min-height:96px;}\n'
    'html[data-nnphone="1"] #list .pcard .pexist .ebox{font-size:10px;}\n'
    'html[data-nnphone="1"] #list .pcard .pexist .ebox i{font-size:8.5px; min-width:30px;}\n'
    'html[data-nnphone="1"] #list .pcard .pph .phhint{font-size:9.5px;}\n'
    'html[data-nnphone="1"] #list .pcard .pmemo{flex:1 1 100%; max-width:none; min-height:24px;}')

# ---------- 写真：帯のタップでも選べるようにする ----------
rep("""  document.addEventListener('pointerdown',e=>{
    const t=e.target.closest&&e.target.closest('#list .pcard .pph'); if(!t)return;
    const card=t.closest('.pcard'); if(!card)return;
    el=t; sx=e.clientX; sy=e.clientY;""",
"""  document.addEventListener('pointerdown',e=>{
    const t=e.target.closest&&e.target.closest('#list .pcard .pph'); if(!t)return;
    const card=t.closest('.pcard'); if(!card)return;
    /* ★下の帯（📷 写真を変える）は1回タップで開く。長押しが効かない端末の逃げ道。 */
    const r=t.getBoundingClientRect();
    if(e.clientY > r.bottom-20){
      e.stopPropagation(); window._nnPhotoLP=true;
      nnPhotoPick(+card.dataset.pid); return;
    }
    el=t; sx=e.clientX; sy=e.clientY;""")

io.open(P,'w',encoding='utf-8',newline='').write(s)
print('kirokucho 置換', n, '件')
