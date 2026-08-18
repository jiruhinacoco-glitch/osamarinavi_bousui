# 現場一覧カードの改修（2026-08-13f）
# ①絞り込みチップの「〇〇別▼」→「〇〇▼」（件数の札との重なり解消）
# ②写真を長押し → スマホの写真を取り込み（縮小して保存）
# ③現場名称の文字を大きく
# ④写真の下に「既存の状態」＝既存防水／区分（新築・改修・増改築・部分補修）／構造体（RC・S・ALC・W・RCS）
import io

P='/home/user/osamarinavi_bousui/kirokucho_demo.html'
s=io.open(P,encoding='utf-8',newline='').read()
n=0
def rep(a,b):
    global s,n
    assert s.count(a)==1,('一致しない: '+a[:80])
    s=s.replace(a,b); n+=1

# ---------- ① チップの「別」を外す ----------
rep("""const LIST_FIL=[
 {key:'nendo',label:'年度別',   val:p=>p.nendo, sort:(a,b)=>nendoCmp(a,b)},
 {key:'moto', label:'元請別',   val:p=>p.moto},
 {key:'status',label:'ステータス別',val:p=>p.status},
 {key:'hou',  label:'工法別',   val:p=>p.hou},
 {key:'area', label:'地域別',   val:p=>p.area},
 {key:'maker',label:'メーカー別',val:p=>p.maker||'—'},
];""",
"""/* ★2026-08-13f チップの文字から「別」を外した（幅を詰めて件数の札との重なりをなくす）。
   絞り込み中のタグは lfTags() が label から「別」を消していたので、そのままで正しく出る。 */
const LIST_FIL=[
 {key:'nendo',label:'年度',   val:p=>p.nendo, sort:(a,b)=>nendoCmp(a,b)},
 {key:'moto', label:'元請',   val:p=>p.moto},
 {key:'status',label:'ステータス',val:p=>p.status},
 {key:'hou',  label:'工法',   val:p=>p.hou},
 {key:'area', label:'地域',   val:p=>p.area},
 {key:'maker',label:'メーカー',val:p=>p.maker||'—'},
];""")
rep("""      <button class="stchip ${filterState['profit']?'on':''}" onpointerdown="lfToggle(event,'profit')" onclick="event.preventDefault();event.stopPropagation();">利益別<span class="dfbtn-car">▼</span></button>""",
"""      <button class="stchip ${filterState['profit']?'on':''}" onpointerdown="lfToggle(event,'profit')" onclick="event.preventDefault();event.stopPropagation();">利益<span class="dfbtn-car">▼</span></button>""")

# 不具合別チップ（nn-defect-js 側）
rep('onclick="event.preventDefault();event.stopPropagation();">不具合別${defFil.size',
    'onclick="event.preventDefault();event.stopPropagation();">不具合${defFil.size')

# ---------- ②④ カードの雛形：写真の下に「既存の状態」 ----------
rep("""      <div class="pph"><img src="./icons/roofph_${(p.id%6)+1}.jpg" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></div>
      <div class="pbd">""",
"""      <div class="pcol">
        <div class="pph" title="長押しで写真を差し替え"><img src="${(window.nnPhotoOf&&nnPhotoOf(p))||('./icons/roofph_'+((p.id%6)+1)+'.jpg')}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span class="phhint">長押しで写真</span></div>
        <div class="pexist">
          <span class="ebox" data-f="kizon"><i>既存</i>${p.kizon||'不明'} ▾</span>
          <span class="ebox" data-f="kind"><i>区分</i>${p.kind||'改修'} ▾</span>
          <span class="ebox" data-f="kouzou"><i>構造</i>${p.kouzou||'RC'} ▾</span>
        </div>
      </div>
      <div class="pbd">""")

# ---------- ③④ 見た目 ----------
rep("""#list .pcard .pph{flex:0 0 185px; margin:2px; overflow:hidden; background:#dfe4dd; display:flex;}
#list .pcard .pph img{width:100%; height:100%; object-fit:cover; display:block;}""",
"""/* 左の列＝写真＋その下に「既存の状態」（2026-08-13f） */
#list .pcard .pcol{flex:0 0 185px; margin:2px; display:flex; flex-direction:column; gap:2px; min-width:0;}
#list .pcard .pph{flex:1 1 auto; min-height:74px; overflow:hidden; background:#dfe4dd; display:flex;
  position:relative; cursor:pointer;}
#list .pcard .pph img{width:100%; height:100%; object-fit:cover; display:block;}
#list .pcard .pph .phhint{
  position:absolute; left:0; right:0; bottom:0; background:rgba(20,30,24,.55); color:#fff;
  font-size:9.5px; font-weight:800; text-align:center; padding:1px 0; letter-spacing:.06em;
  opacity:0; transition:opacity .15s;}
#list .pcard .pph:hover .phhint{opacity:1;}
#list .pcard .pph.lp{outline:3px solid var(--green-deep,#1c6b3c); outline-offset:-3px;}
/* 既存の状態（既存防水・区分・構造体）＝写真の真下・カードの枠の中 */
#list .pcard .pexist{display:flex; flex-direction:column; gap:2px; flex:none;}
#list .pcard .pexist .ebox{width:100%; font-size:11px; padding:0 6px;}
#list .pcard .pexist .ebox i{font-size:9.5px; min-width:34px; justify-content:center;}""")

rep("#list .pcard .ebox.ttl{font-size:15.5px; font-weight:800; padding:1px 9px;}",
    "#list .pcard .ebox.ttl{font-size:18px; font-weight:800; padding:1px 10px;}")
rep('html[data-nnphone="1"] #list .pcard .ebox.ttl{font-size:12.5px;}',
    'html[data-nnphone="1"] #list .pcard .ebox.ttl{font-size:14.5px;}')
rep('html[data-nnphone="1"] #list .pcard .pph{flex:0 0 108px;}',
    'html[data-nnphone="1"] #list .pcard .pcol{flex:0 0 118px;}\n'
    'html[data-nnphone="1"] #list .pcard .pph{min-height:56px;}\n'
    'html[data-nnphone="1"] #list .pcard .pexist .ebox{font-size:9.5px;}\n'
    'html[data-nnphone="1"] #list .pcard .pexist .ebox i{font-size:8.5px; min-width:28px;}')
rep("""#list .pcard .pph{flex:0 0 150px; margin:2px; overflow:hidden; background:#dfe4dd; display:flex;}""",
    """#list .pcard .pcol{flex:0 0 150px;}""") if s.count("#list .pcard .pph{flex:0 0 150px; margin:2px; overflow:hidden; background:#dfe4dd; display:flex;}")==1 else None

# ---------- ②④ 処理：写真の長押し取り込み・新しい選択肢 ----------
rep("""  /* プルダウン型（状態・工法） */
  if(f==='status'||f==='kouhou'){
    const sel=document.createElement('select');
    const opts=f==='status'
      ? Object.keys(ST_INV)
      : [...new Set([...Object.keys(KO_MASTER), ...props.map(x=>x.kouhou).filter(Boolean)])];""",
"""  /* プルダウン型（状態・工法・既存防水・区分・構造体） */
  if(f==='status'||f==='kouhou'||f==='kizon'||f==='kind'||f==='kouzou'){
    const sel=document.createElement('select');
    const opts=f==='status'
      ? Object.keys(ST_INV)
      : f==='kizon' ? NN_KIZON
      : f==='kind'  ? NN_KIND
      : f==='kouzou'? NN_KOUZOU
      : [...new Set([...Object.keys(KO_MASTER), ...props.map(x=>x.kouhou).filter(Boolean)])];""")
rep("    sel.value=f==='status'?p.status:(p.kouhou||'');",
    "    sel.value=f==='status'?p.status:f==='kizon'?(p.kizon||'不明'):f==='kind'?(p.kind||'改修'):f==='kouzou'?(p.kouzou||'RC'):(p.kouhou||'');")
rep("""function commitSel(p,f,val){
  if(f==='status'){ p.status=val; p.stRaw=ST_INV[val]||'hikiai'; }""",
"""function commitSel(p,f,val){
  if(f==='kizon'||f==='kind'||f==='kouzou'){
    p[f]=val;
    dashDirty=true; if(typeof buildChips==='function')buildChips();
    toast('保存しました（この画面での変更はサンプルのため、再読み込みで元に戻ります）');
    render(); return;
  }
  if(f==='status'){ p.status=val; p.stRaw=ST_INV[val]||'hikiai'; }""")

# 選択肢の定義＋写真の長押し取り込みを nn-inline-edit の先頭に
rep("""(function(){
'use strict';
const num=v=>{const x=parseFloat(String(v).replace(/[^\\d.\\-]/g,'')); return isNaN(x)?0:x;};""",
"""(function(){
'use strict';
/* ---- 既存の状態の選択肢（2026-08-13f） ---- */
window.NN_KIZON=['不明','露出アスファルト防水','押えコンクリート','改質アスファルトシート',
  '塩ビシート防水','ゴムシート防水','ウレタン塗膜防水','FRP防水','金属屋根','モルタル・土間','新設（既存なし）'];
window.NN_KIND=['新築','改修','増改築','部分補修'];
window.NN_KOUZOU=['RC','S','ALC','W','RCS'];

/* ---- 写真：長押しでスマホの写真を取り込む ----
   ★写真はそのままだと保存容量をすぐ超えるので、横640pxのJPEGに縮めてから保存する。
     それでも入りきらない端末があるので、失敗しても画面には出るようにしてある。 */
const PHKEY='nn_kirokucho_photo_v1';
let PH={}; try{ PH=JSON.parse(localStorage.getItem(PHKEY)||'{}'); }catch(_){ PH={}; }
window.nnPhotoOf=p=>PH[p.code]||null;
function savePh(){ try{ localStorage.setItem(PHKEY, JSON.stringify(PH)); return true; }
  catch(_){ return false; } }
function shrink(file, cb){
  const fr=new FileReader();
  fr.onload=()=>{ const im=new Image();
    im.onload=()=>{
      const W=640, sc=Math.min(1, W/im.width);
      const c=document.createElement('canvas');
      c.width=Math.round(im.width*sc); c.height=Math.round(im.height*sc);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      cb(c.toDataURL('image/jpeg',0.75));
    };
    im.onerror=()=>cb(null); im.src=fr.result; };
  fr.onerror=()=>cb(null);
  fr.readAsDataURL(file);
}
window.nnPhotoPick=function(pid){
  const p=props.find(x=>x.id===pid); if(!p)return;
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='image/*';
  inp.onchange=()=>{
    const f=inp.files&&inp.files[0]; if(!f)return;
    shrink(f,dataUrl=>{
      if(!dataUrl){ toast('この写真は読み込めませんでした'); return; }
      PH[p.code]=dataUrl;
      const ok2=savePh();
      render();
      toast(ok2?'写真を差し替えました':'写真を差し替えました（保存容量がいっぱいのため、この画面を開いている間だけ有効です）');
    });
  };
  inp.click();
};
/* 長押し（0.5秒）で写真を選ぶ。指を動かしたら取り消し。
   ★長押しの直後のタップがカードの選択・移動にならないよう、印を付けて1回だけ止める。 */
(function(){
  let tm=null, el=null, sx=0, sy=0;
  const cancel=()=>{ clearTimeout(tm); tm=null; if(el)el.classList.remove('lp'); el=null; };
  document.addEventListener('pointerdown',e=>{
    const t=e.target.closest&&e.target.closest('#list .pcard .pph'); if(!t)return;
    const card=t.closest('.pcard'); if(!card)return;
    el=t; sx=e.clientX; sy=e.clientY;
    tm=setTimeout(()=>{
      t.classList.add('lp'); window._nnPhotoLP=true;
      nnPhotoPick(+card.dataset.pid);
      setTimeout(()=>{ t.classList.remove('lp'); },400);
      tm=null; el=null;
    },500);
  },true);
  document.addEventListener('pointermove',e=>{
    if(tm && (Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy))>10) cancel();
  },true);
  ['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev,cancel,true));
  document.addEventListener('click',e=>{
    if(window._nnPhotoLP){ window._nnPhotoLP=false; e.stopPropagation(); e.preventDefault(); }
  },true);
})();
const num=v=>{const x=parseFloat(String(v).replace(/[^\\d.\\-]/g,'')); return isNaN(x)?0:x;};""")

io.open(P,'w',encoding='utf-8',newline='').write(s)
print('kirokucho 置換', n, '件')

# ---------- バックアップの対象に写真を追加 ----------
P2='/home/user/osamarinavi_bousui/index.html'
s2=io.open(P2,encoding='utf-8',newline='').read()
a="  ['nn_zumen_saves_v1','図面・積算：保存した図面'],"
b=a+"\n  ['nn_kirokucho_photo_v1','現場記録帳：現場の写真'],"
assert s2.count(a)==1
io.open(P2,'w',encoding='utf-8',newline='').write(s2.replace(a,b))
print('index 置換 1件')
