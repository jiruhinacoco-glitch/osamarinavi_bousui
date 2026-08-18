# 現場一覧の改修（2026-08-13h）
# ①写真の取り込みが iPhone で効かない → 本物の <input type=file> ＋ <label> 方式に作り直す
# ②検索チップが大きすぎて見切れる → 文字・枠を小さく
# ③並び替えUIの作り直し（利益だけ → 並び替え7種）
# ④カード右側に「提出書類」欄（見積・報告書・比較表・他資料）
import io

P='/home/user/osamarinavi_bousui/kirokucho_demo.html'
s=io.open(P,encoding='utf-8',newline='').read()
n=0
def rep(a,b):
    global s,n
    assert s.count(a)==1,('一致しない: '+a[:80])
    s=s.replace(a,b); n+=1

# ================= ① 写真：label ＋ 本物の input =================
# ★iOSは「利用者の操作の中」でしか写真の選択窓を開けない。
#   長押し(setTimeout)から input.click() を呼んでも無視される＝これが「効かない」正体。
#   label と input を実際に置けば、JSを通さずブラウザ自身が開くので必ず動く。
rep("""        <div class="pph" title="タップで写真を差し替え"><img src="${(window.nnPhotoOf&&nnPhotoOf(p))||('./icons/roofph_'+((p.id%6)+1)+'.jpg')}" alt="" loading="lazy" draggable="false" oncontextmenu="return false" onerror="this.style.visibility='hidden'"><span class="phhint">📷 写真を変える</span></div>""",
"""        <div class="pph"><img src="${(window.nnPhotoOf&&nnPhotoOf(p))||('./icons/roofph_'+((p.id%6)+1)+'.jpg')}" alt="" loading="lazy" draggable="false" oncontextmenu="return false" onerror="this.style.visibility='hidden'"><label class="phhint" for="nnph_${p.id}">📷 写真を選ぶ</label><input class="phinp" id="nnph_${p.id}" type="file" accept="image/*" onchange="nnPhotoSet(${p.id},this)"></div>""")

# ================= ④ 右側：提出書類 =================
rep("""      <span class="ebox pmemo" data-f="tb"><b>メモ</b><u>${p.tb?String(p.tb):''}</u></span>
      </div>""",
"""      <span class="ebox pmemo" data-f="tb"><b>メモ</b><u>${p.tb?String(p.tb):''}</u></span>
      <div class="pdocs">
        <div class="dh">提出書類</div>
        <div class="db">
          <button class="doc" onclick="nnDoc(${p.id},'mitsumori')" title="見積書"><b>📄</b><span>見積</span></button>
          <button class="doc" onclick="nnDoc(${p.id},'houkoku')" title="物件報告書を出す"><b>📑</b><span>報告書</span></button>
          <button class="doc" onclick="nnDoc(${p.id},'hikaku')" title="工法・見積の比較表"><b>📊</b><span>比較表</span></button>
          <button class="doc" onclick="nnDoc(${p.id},'other')" title="保管資料を開く"><b>📁</b><span>他資料</span></button>
        </div>
      </div>
      </div>""")

# ================= 見た目 =================
rep("""/* ★写真の帯は「押せる場所」。長押しが効かない端末でも、ここを1回タップすれば写真を選べる */
#list .pcard .pph .phhint{
  position:absolute; left:0; right:0; bottom:0; background:rgba(20,30,24,.62); color:#fff;
  font-size:10.5px; font-weight:800; text-align:center; padding:2px 0; letter-spacing:.04em;
  opacity:.9; transition:opacity .15s; pointer-events:none;}
#list .pcard .pph:hover .phhint{opacity:1;}""",
"""/* ★写真の帯は <label>。ブラウザ自身が写真の選択窓を開くので、iPhoneでも必ず動く
     （JSの click() は「利用者の操作の中」でしか許されず、長押しからでは開けない）。 */
#list .pcard .pph .phhint{
  position:absolute; left:0; right:0; bottom:0; background:rgba(20,30,24,.66); color:#fff;
  font-size:11px; font-weight:800; text-align:center; padding:4px 0; letter-spacing:.04em;
  cursor:pointer; display:block;}
#list .pcard .pph .phhint:hover{background:var(--green-deep,#1c6b3c);}
#list .pcard .pph .phinp{position:absolute; width:1px; height:1px; opacity:0; pointer-events:none;}""")

# 提出書類の見た目
rep("""#list .pcard .pmain .pprofit{align-self:center; margin-left:0;}""",
"""#list .pcard .pmain .pprofit{align-self:center; margin-left:0;}
/* 提出書類（カードの右端）（2026-08-13h） */
#list .pcard .pdocs{margin-left:auto; flex:none; align-self:stretch; display:flex; flex-direction:column;
  justify-content:center; border-left:1px dashed #c3cfc4; padding-left:9px;}
#list .pcard .pdocs .dh{font-size:9.5px; font-weight:800; color:var(--ink-sub); letter-spacing:.1em;
  text-align:center; margin-bottom:3px;}
#list .pcard .pdocs .db{display:flex; gap:4px;}
#list .pcard .pdocs .doc{
  display:flex; flex-direction:column; align-items:center; gap:1px; cursor:pointer;
  background:#fff; border:1px solid #b9c2b6; border-radius:0; padding:3px 7px; min-width:46px;
  font-family:inherit; color:var(--ink);}
#list .pcard .pdocs .doc:hover{border-color:var(--green-deep,#1c6b3c); background:#f4faf6;}
#list .pcard .pdocs .doc:active{transform:translateY(1px);}
#list .pcard .pdocs .doc b{font-size:15px; line-height:1;}
#list .pcard .pdocs .doc span{font-size:9.5px; font-weight:800; letter-spacing:.02em;}
html[data-nnphone="1"] #list .pcard .pdocs{margin-left:0; border-left:0; padding-left:0; align-self:flex-start;
  flex-direction:row; align-items:center; gap:6px; width:100%; margin-top:2px;}
html[data-nnphone="1"] #list .pcard .pdocs .dh{margin-bottom:0;}
html[data-nnphone="1"] #list .pcard .pdocs .doc{min-width:40px; padding:2px 5px;}
html[data-nnphone="1"] #list .pcard .pdocs .doc b{font-size:13px;}
html[data-nnphone="1"] #list .pcard .pdocs .doc span{font-size:8.5px;}""")

# ================= ② チップを小さく =================
rep("""#toolbar .chips{margin-left:0;}""",
"""#toolbar .chips{margin-left:0;}
/* ★2026-08-13h チップが大きすぎて右端が見切れていた。文字と枠を小さくする。 */
#toolbar .chips .stchip{font-size:11.5px !important; padding:4px 9px !important; border-radius:6px !important;}
#toolbar .chips .stchip .dfbtn-car{font-size:9px; margin-left:2px;}
#toolbar .chips .stchip b{font-size:11px; margin-left:3px;}
html[data-nnphone="1"] #toolbar .chips .stchip{font-size:10.5px !important; padding:3px 7px !important;}""")

# ================= ③ 並び替え：利益だけ → 7種 =================
rep("""      <button class="stchip ${filterState['profit']?'on':''}" onpointerdown="lfToggle(event,'profit')" onclick="event.preventDefault();event.stopPropagation();">利益<span class="dfbtn-car">▼</span></button>""",
"""      <button class="stchip ${filterState['profit']?'on':''}" onpointerdown="lfToggle(event,'profit')" onclick="event.preventDefault();event.stopPropagation();">${filterState['profit']?'並び：'+String(filterState['profit']).replace(/(順|が|の).*$/,''):'並び替え'}<span class="dfbtn-car">▼</span></button>""")
rep("""        ${['利益額が大きい順','利益率が高い順'].map(v=>`<div class="dfrow${filterState['profit']===v?' sel':''}" onclick="lfSort(event,'${v}')"><span class="vn">${v}</span></div>`).join('')}""",
"""        ${NN_SORTS.map(v=>`<div class="dfrow${filterState['profit']===v?' sel':''}" onclick="lfSort(event,'${v}')"><span class="vn">${v}</span></div>`).join('')}""")
rep("""  const pf=filterState['profit'];
  if(pf==='利益額が大きい順')arr=[...arr].sort((a,b)=>(profitOf(b)??-1)-(profitOf(a)??-1));
  if(pf==='利益率が高い順')arr=[...arr].sort((a,b)=>(profitRate(b)??-1)-(profitRate(a)??-1));
  return arr;""",
"""  const pf=filterState['profit'];
  const D=p=>(p.kbD||p.cbD||p.fbD||null);
  if(pf==='利益額が大きい順')arr=[...arr].sort((a,b)=>(profitOf(b)??-1)-(profitOf(a)??-1));
  if(pf==='利益率が高い順')arr=[...arr].sort((a,b)=>(profitRate(b)??-1)-(profitRate(a)??-1));
  if(pf==='受注金額が大きい順')arr=[...arr].sort((a,b)=>(b.order||0)-(a.order||0));
  if(pf==='数量が大きい順')  arr=[...arr].sort((a,b)=>(b.m||0)-(a.m||0));
  if(pf==='日付が新しい順')  arr=[...arr].sort((a,b)=>(D(b)?+D(b):0)-(D(a)?+D(a):0));
  if(pf==='日付が古い順')    arr=[...arr].sort((a,b)=>(D(a)?+D(a):0)-(D(b)?+D(b):0));
  if(pf==='物件名の五十音順')arr=[...arr].sort((a,b)=>a.name.localeCompare(b.name,'ja'));
  return arr;""")

# 並び替えの一覧（LIST_FIL のそば）
rep("""const listFil={}; LIST_FIL.forEach(f=>listFil[f.key]=new Set());""",
"""/* 並び替え（2026-08-13h：利益2種だけだったのを7種に）。
   ★絞り込み（どれを見るか）と並び替え（どの順に見るか）は役割が違うので、
     チップは同じ形でも「並び替え」だけ単一選択・いま何順かをチップに出す。 */
const NN_SORTS=['日付が新しい順','日付が古い順','受注金額が大きい順','利益額が大きい順',
  '利益率が高い順','数量が大きい順','物件名の五十音順'];
const listFil={}; LIST_FIL.forEach(f=>listFil[f.key]=new Set());""")

# ================= 処理：写真・提出書類 =================
rep("""window.nnPhotoPick=function(pid){""",
"""/* ★label から呼ばれる。ブラウザが開いた選択窓の結果を受け取るだけなので、iPhoneでも確実。 */
window.nnPhotoSet=function(pid, inp){
  const p=props.find(x=>x.id===pid); if(!p)return;
  const f=inp&&inp.files&&inp.files[0]; if(!f)return;
  shrink(f,dataUrl=>{
    inp.value='';
    if(!dataUrl){ toast('この写真は読み込めませんでした'); return; }
    PH[p.code]=dataUrl;
    const ok2=savePh();
    render();
    toast(ok2?'写真を差し替えました':'写真を差し替えました（保存容量がいっぱいのため、この画面を開いている間だけ有効です）');
  });
};
/* 提出書類のボタン */
window.nnDoc=function(pid,kind){
  event&&event.stopPropagation&&event.stopPropagation();
  const p=props.find(x=>x.id===pid); if(!p)return;
  if(kind==='houkoku'){
    if(typeof exportPDF==='function'){ exportPDF(pid); return; }
    toast('物件報告書はこの物件では出せません'); return;
  }
  if(kind==='other'){ selectedId=pid; curTab='保管資料'; showView('list'); openDetailFull(); return; }
  if(kind==='mitsumori'){ toast('見積書は準備中です（図面・積算の数量から作る予定）'); return; }
  if(kind==='hikaku'){ toast('比較表は準備中です（同じ工法の過去物件と単価・歩掛を並べる予定）'); return; }
};
window.nnPhotoPick=function(pid){""")

# 長押しは iOS で開けないので、印だけ付けて label を押してもらう案内に変える
rep("""    /* ★下の帯（📷 写真を変える）は1回タップで開く。長押しが効かない端末の逃げ道。 */
    const r=t.getBoundingClientRect();
    if(e.clientY > r.bottom-20){
      e.stopPropagation(); window._nnPhotoLP=true;
      nnPhotoPick(+card.dataset.pid); return;
    }
    el=t; sx=e.clientX; sy=e.clientY;""",
"""    /* ★下の帯は <label>。ブラウザが自分で開くので、ここでは何もしない（止めるだけ）。 */
    if(e.target.closest('.phhint')){ e.stopPropagation(); window._nnPhotoLP=true; return; }
    el=t; sx=e.clientX; sy=e.clientY;""")
rep("""    tm=setTimeout(()=>{
      t.classList.add('lp'); window._nnPhotoLP=true;
      nnPhotoPick(+card.dataset.pid);
      setTimeout(()=>{ t.classList.remove('lp'); },400);
      tm=null; el=null;
    },500);""",
"""    /* ★長押しは「これから写真を選ぶ」の合図までにする。
       iOSは利用者の操作の中でしか選択窓を開けないので、
       長押しの途中（タイマーの中）から開こうとしても無視される＝これが効かなかった正体。
       印を付けたうえで、指を離したとき（＝操作の中）に label を押す。 */
    tm=setTimeout(()=>{
      t.classList.add('lp'); window._nnPhotoLP=true; lpReady=t; tm=null;
    },500);""")
rep("""  ['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev,cancel,true));""",
"""  document.addEventListener('pointerup',e=>{
    /* 長押しが成立していたら、指を離したこの瞬間（利用者の操作の中）に選択窓を開く */
    if(lpReady){
      const inp=lpReady.querySelector('.phinp');
      lpReady.classList.remove('lp'); lpReady=null;
      if(inp){ try{ inp.click(); }catch(_){ } }
    }
    cancel();
  },true);
  document.addEventListener('pointercancel',cancel,true);""")
rep("""  let tm=null, el=null, sx=0, sy=0;
  const cancel=()=>{ clearTimeout(tm); tm=null; if(el)el.classList.remove('lp'); el=null; };""",
"""  let tm=null, el=null, sx=0, sy=0, lpReady=null;
  const cancel=()=>{ clearTimeout(tm); tm=null; if(el)el.classList.remove('lp'); el=null;
    if(lpReady){ lpReady.classList.remove('lp'); lpReady=null; } };""")

io.open(P,'w',encoding='utf-8',newline='').write(s)
print('kirokucho 置換', n, '件')
