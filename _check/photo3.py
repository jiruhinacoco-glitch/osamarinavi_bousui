# 現場一覧の写真まわり（2026-08-13k）
# ①写真があるときは右上に「＋」＝1クリックで拡大表示
# ②写真が無いとき（見本のまま）は＋を出さず、写真ぜんぶが「入れる」入口
# ③ドラッグ＆ドロップでも入れられる
# ④写真のタップで物件が選択されない・詳細へ飛ばない
import io

P='/home/user/osamarinavi_bousui/kirokucho_demo.html'
s=io.open(P,encoding='utf-8',newline='').read()
n=0
def rep(a,b):
    global s,n
    assert s.count(a)==1,('一致しない: '+a[:80])
    s=s.replace(a,b); n+=1

# ---------- 雛形 ----------
rep("""        <div class="pph"><img src="${(window.nnPhotoOf&&nnPhotoOf(p))||('./icons/roofph_'+((p.id%6)+1)+'.jpg')}" alt="" loading="lazy" draggable="false" oncontextmenu="return false" onerror="this.style.visibility='hidden'"><label class="phhint" for="nnph_${p.id}">📷 写真を選ぶ</label><input class="phinp" id="nnph_${p.id}" type="file" accept="image/*" onchange="nnPhotoSet(${p.id},this)"></div>""",
"""        ${(()=>{const _ph=window.nnPhotoOf&&nnPhotoOf(p);return `
        <div class="pph${_ph?' has':' none'}" data-pid="${p.id}">
          <img src="${_ph||('./icons/roofph_'+((p.id%6)+1)+'.jpg')}" alt="" loading="lazy" draggable="false" oncontextmenu="return false" onerror="this.style.visibility='hidden'">
          <label class="phfull" for="nnph_${p.id}" title="${_ph?'タップで写真を差し替え／ドラッグでも入れられます':'タップで写真を入れる／ドラッグでも入れられます'}"></label>
          ${_ph?`<button class="phzoom" onclick="nnPhotoZoom(${p.id})" title="写真を大きく見る">＋</button>`:''}
          <span class="phcap">${_ph?'📷 写真を変える':'📷 写真を入れる'}</span>
          <input class="phinp" id="nnph_${p.id}" type="file" accept="image/*" onchange="nnPhotoSet(${p.id},this)">
        </div>`;})()}""")

# ---------- 見た目 ----------
rep("""/* ★写真の帯は <label>。ブラウザ自身が写真の選択窓を開くので、iPhoneでも必ず動く
     （JSの click() は「利用者の操作の中」でしか許されず、長押しからでは開けない）。 */
#list .pcard .pph .phhint{
  position:absolute; left:0; right:0; bottom:0; background:rgba(20,30,24,.66); color:#fff;
  font-size:11px; font-weight:800; text-align:center; padding:4px 0; letter-spacing:.04em;
  cursor:pointer; display:block;}
#list .pcard .pph .phhint:hover{background:var(--green-deep,#1c6b3c);}
#list .pcard .pph .phinp{position:absolute; width:1px; height:1px; opacity:0; pointer-events:none;}""",
"""/* ★写真ぜんぶが <label>。ブラウザ自身が選択窓を開くので、iPhoneでも必ず動く
     （JSの click() は「利用者の操作の中」でしか許されず、長押しからでは開けない）。 */
#list .pcard .pph .phfull{
  position:absolute; inset:0; z-index:1; cursor:pointer; display:block;}
#list .pcard .pph .phcap{
  position:absolute; left:0; right:0; bottom:0; z-index:2; pointer-events:none;
  background:rgba(20,30,24,.66); color:#fff;
  font-size:11px; font-weight:800; text-align:center; padding:4px 0; letter-spacing:.04em;}
#list .pcard .pph:hover .phcap{background:var(--green-deep,#1c6b3c);}
/* 写真が入っていないときは「入れる場所」だと分かるように破線で囲む */
#list .pcard .pph.none{outline:2px dashed #9fb3a4; outline-offset:-3px;}
#list .pcard .pph.none img{opacity:.55;}
/* ★＋（拡大）は写真があるときだけ。label より上に置くので、押しても選択窓は開かない */
#list .pcard .pph .phzoom{
  position:absolute; top:4px; right:4px; z-index:3; width:26px; height:26px; padding:0;
  border:1.5px solid #fff; border-radius:50%; background:rgba(20,30,24,.62); color:#fff;
  font-size:17px; font-weight:800; line-height:1; cursor:pointer; font-family:inherit;
  display:flex; align-items:center; justify-content:center;}
#list .pcard .pph .phzoom:hover{background:var(--green-deep,#1c6b3c);}
#list .pcard .pph .phzoom:active{transform:translateY(1px);}
/* ドラッグ中の目印 */
#list .pcard .pph.drop{outline:3px solid var(--green-deep,#1c6b3c); outline-offset:-3px;}
#list .pcard .pph .phinp{position:absolute; width:1px; height:1px; opacity:0; pointer-events:none;}
/* 写真を大きく見る（ライトボックス） */
#nnPhotoBig{position:fixed; inset:0; z-index:70; background:rgba(12,18,14,.86);
  display:flex; align-items:center; justify-content:center; padding:24px; cursor:zoom-out;}
#nnPhotoBig img{max-width:96%; max-height:88%; object-fit:contain; box-shadow:0 8px 40px rgba(0,0,0,.6);}
#nnPhotoBig .cap{position:absolute; left:0; right:0; bottom:16px; text-align:center; color:#fff;
  font-size:14px; font-weight:800; text-shadow:0 1px 3px rgba(0,0,0,.8);}
#nnPhotoBig .cl{position:absolute; top:14px; right:18px; width:40px; height:40px; border-radius:50%;
  border:2px solid #fff; background:rgba(0,0,0,.35); color:#fff; font-size:20px; font-weight:800;
  cursor:pointer; font-family:inherit;}
html[data-nnphone="1"] #list .pcard .pph .phzoom{width:22px; height:22px; font-size:15px;}
html[data-nnphone="1"] #list .pcard .pph .phcap{font-size:9.5px; padding:3px 0;}""")

# 旧クラス名（.phhint）の指定を新しい名前に合わせる
rep("html[data-nnphone=\"1\"] #list .pcard .pph .phhint{font-size:9.5px;}", "")

# ---------- 処理：拡大・ドラッグ＆ドロップ ----------
rep("""/* ★label から呼ばれる。ブラウザが開いた選択窓の結果を受け取るだけなので、iPhoneでも確実。 */""",
"""/* 写真を大きく見る（＋ボタン） */
window.nnPhotoZoom=function(pid){
  if(event&&event.stopPropagation)event.stopPropagation();
  const p=props.find(x=>x.id===pid); if(!p)return;
  const src=nnPhotoOf(p); if(!src){ toast('この物件にはまだ写真が入っていません'); return; }
  const old=document.getElementById('nnPhotoBig'); if(old)old.remove();
  const ov=document.createElement('div'); ov.id='nnPhotoBig';
  ov.innerHTML='<img src="'+src+'" alt=""><button class="cl" title="閉じる">✕</button>'
    +'<div class="cap">'+String(p.name).replace(/</g,'&lt;')+'</div>';
  const close=()=>{ ov.remove(); document.removeEventListener('keydown',onKey); };
  const onKey=e=>{ if(e.key==='Escape')close(); };
  ov.addEventListener('click',close);
  document.addEventListener('keydown',onKey);
  document.body.appendChild(ov);
};
/* ドラッグ＆ドロップでも写真を入れられる（パソコン向け） */
(function(){
  const find=e=>e.target.closest&&e.target.closest('#list .pcard .pph');
  document.addEventListener('dragover',e=>{
    const t=find(e); if(!t)return;
    e.preventDefault(); t.classList.add('drop');
  });
  document.addEventListener('dragleave',e=>{ const t=find(e); if(t)t.classList.remove('drop'); });
  document.addEventListener('drop',e=>{
    const t=find(e); if(!t)return;
    e.preventDefault(); t.classList.remove('drop');
    const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
    if(!f){ toast('画像ファイルをドラッグしてください'); return; }
    if(!/^image\\//.test(f.type)){ toast('画像ファイルではありません'); return; }
    nnPhotoFile(+t.dataset.pid, f);
  });
})();
/* ★label から呼ばれる。ブラウザが開いた選択窓の結果を受け取るだけなので、iPhoneでも確実。 */""")

rep("""window.nnPhotoSet=function(pid, inp){
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
};""",
"""window.nnPhotoFile=function(pid, f){
  const p=props.find(x=>x.id===pid); if(!p||!f)return;
  shrink(f,dataUrl=>{
    if(!dataUrl){ toast('この写真は読み込めませんでした'); return; }
    PH[p.code]=dataUrl;
    const ok2=savePh();
    render();
    toast(ok2?'写真を入れました（＋で大きく見られます）'
             :'写真を入れました（保存容量がいっぱいのため、この画面を開いている間だけ有効です）');
  });
};
window.nnPhotoSet=function(pid, inp){
  const f=inp&&inp.files&&inp.files[0]; if(!f)return;
  nnPhotoFile(pid, f); inp.value='';
};""")

# ---------- ④ 写真は物件の選択・詳細移動に使わない ----------
rep("""  if(ev.target.closest('#list .pcard .phhint, #list .pcard .phinp, #list .pcard .ebox, #list .pcard .stsel, #list .pcard .pdocs'))return;
  pdWasArmed=el.classList.contains('armed');""",
"""  /* ★2026-08-13k 写真はまるごと「写真の操作」用。物件の選択・詳細への移動には使わない
     （本人の指示：画像は画像で、詳細ページに飛ばさない）。 */
  if(ev.target.closest('#list .pcard .pph, #list .pcard .ebox, #list .pcard .stsel, #list .pcard .pdocs'))return;
  pdWasArmed=el.classList.contains('armed');""")
rep("""  if(ev.target.closest('#list .pcard .phhint, #list .pcard .phinp, #list .pcard .ebox, #list .pcard .stsel, #list .pcard .pdocs'))return;
  if(!pdWasArmed)return;                      /* 1回目は pointerdown で着色済み */""",
"""  if(ev.target.closest('#list .pcard .pph, #list .pcard .ebox, #list .pcard .stsel, #list .pcard .pdocs'))return;
  if(!pdWasArmed)return;                      /* 1回目は pointerdown で着色済み */""")

# 写真まわりのタップは伝播も止める（label の既定動作は殺さない）
rep("""  document.addEventListener('click',e=>{
    if(e.target.closest&&e.target.closest('#list .pcard .phhint, #list .pcard .phinp')) e.stopPropagation();
  },true);""",
"""  document.addEventListener('click',e=>{
    if(e.target.closest&&e.target.closest('#list .pcard .pph')) e.stopPropagation();
  },true);""")

# 長押しの仕掛けはもう不要（写真ぜんぶが1タップで開くため）。印だけ残して誤爆を防ぐ
rep("""    /* ★下の帯は <label>。ブラウザが自分で開くので、ここでは伝播を止めるだけ。
       ★2026-08-13i 以前はここで印を立て、あとで preventDefault していたため、
         label 本来の「選択窓を開く」まで打ち消していた（＝クリックで写真が入らない正体）。 */
    if(e.target.closest('.phhint')){ e.stopPropagation(); return; }
    el=t; sx=e.clientX; sy=e.clientY;""",
"""    /* ★2026-08-13k 写真ぜんぶが <label>（1タップで選択窓が開く）になったので、
       長押しの仕掛けは不要。ここでは伝播を止めるだけにする。
       ★preventDefault は絶対にしないこと（label 本来の動きが死ぬ）。 */
    e.stopPropagation(); return;""")

io.open(P,'w',encoding='utf-8',newline='').write(s)
print('置換', n, '件')
