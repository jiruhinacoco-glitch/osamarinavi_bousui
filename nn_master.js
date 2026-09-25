/* ============================================================
   ★2026-09-25d 新規顧客登録・新規材料登録（共通の登録画面）
   ------------------------------------------------------------
   本人の指示「最適な場所に、新規顧客登録・新規材料登録の画面を、現場記録帳と同じデザインで」。
   ・見た目は現場記録帳の「新規物件登録」と同じ（緑の見出し帯・クリーム地・2列の欄・下に固定の キャンセル／保存する）
   ・保存先は今ある台帳をそのまま使う（新しい保存場所を増やさない＝ほかの画面・「きく」・設定の書き出しにそのまま出る）
       顧客 → 客先登録 nn_tokui_v1（moto＝元請／shiire＝仕入業者）
       材料 → 材料登録 nn_materials_v1（仕様・材料の「登録済み材料」・図面の積算・「きく」が読む）
   ・これまでの失敗から守っていること
       最初は必要な項目だけ・残りは「▼ 詳細入力」に畳む（§494）／選択欄は自前の一覧（nn_select.js・§495）
       スマホの文字は16px（iPhoneの自動拡大を防ぐ）・欄は小さめ・横にはみ出さない（列は minmax(0,1fr)）
       大きさを指で変えられない（textarea resize なし）・窓は上にそろえる（開閉で跳ねない）
       保存は読み書きとも守る（形が違う保存は使わない・書けないときは画面の中で知らせる）（§199）
       標準の確認窓（confirm/alert）は使わない：同じ名前があるときは欄の下に知らせて、もう一度押すと登録
       一覧表示（幅980を縮めて見るスマホ）でも実寸が同じになるよう、大きさは var(--nnsaf) 倍
   ============================================================ */
(function(){ 'use strict';
if(window.nnMaster) return;
var PH=document.documentElement.getAttribute('data-nnphone')==='1';
var S=function(px){ return 'calc('+px+'px * var(--nnsaf,1))'; };
/* ★マイナスの値は 'calc(-Npx * …)' で書く（'-calc(…)' は無効な書き方で、見出し帯が左右に届かなかった） */
var N=function(px){ return 'calc(-'+px+'px * var(--nnsaf,1))'; };
var css=document.createElement('style'); css.id='nn-master-css';
css.textContent=[
'#nnRegBg{position:fixed; inset:0; z-index:99995; background:rgba(0,0,0,.45); display:none; align-items:center; justify-content:center; overflow-y:auto; overscroll-behavior:contain; padding:'+S(12)+' 0;}',
'#nnRegBg.open{display:flex;}',
'html[data-nnphone="1"] #nnRegBg{align-items:flex-start;}',
'#nnReg{position:relative; box-sizing:border-box; width:min(560px,94vw); max-height:calc(92vh / var(--nnpzr,1)); overflow-y:auto; overscroll-behavior:contain;',
'  margin:auto; background:#fffdf4; border:2px solid var(--green-deep,#1c6b3c); border-radius:10px; padding:0 '+S(15)+' 0;',
'  box-shadow:0 3px 0 var(--green-edge,#124a28), 0 14px 32px rgba(0,0,0,.3); font-family:inherit; color:var(--ink,#222826); text-align:left;}',
'html[data-nnphone="1"] #nnReg{width:calc(100% - '+S(16)+'); margin:0 auto auto; padding:0 '+S(12)+';}',
'#nnReg *{box-sizing:border-box;}',
'#nnReg h3{position:sticky; top:0; z-index:3; margin:0 '+N(15)+' '+S(6)+'; padding:'+S(8)+' '+S(48)+' '+S(8)+' '+S(15)+';',
'  font-family:var(--font-title,inherit); font-size:'+S(15)+'; font-weight:700; letter-spacing:.05em; color:#fff; text-shadow:0 1px 1px rgba(18,74,40,.55);',
'  background:repeating-linear-gradient(-55deg, rgba(255,255,255,.04) 0 12px, transparent 12px 24px), linear-gradient(180deg,var(--green-hi,#48c274),var(--green,#2e9e58));',
'  border-bottom:2px solid var(--green-edge,#124a28); border-radius:7px 7px 0 0;}',
'html[data-nnphone="1"] #nnReg h3{margin:0 '+N(12)+' '+S(6)+';}',
'#nnReg .mx{position:absolute; top:'+S(5)+'; right:'+S(8)+'; z-index:4; width:'+S(32)+'; height:'+S(32)+'; border:0; border-radius:7px;',
'  background:rgba(0,0,0,.28); color:#fff; font-size:'+S(16)+'; font-weight:900; cursor:pointer; line-height:1;}',
'#nnReg .msec{margin:'+S(10)+' 0 0; padding-bottom:2px; font-family:var(--font-title,inherit); font-size:'+S(12)+'; font-weight:800; letter-spacing:.04em;',
'  color:var(--green-deep,#1c6b3c); border-bottom:1px solid var(--line,#d7dcd4);}',
'#nnReg .mgrid{display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); column-gap:'+S(10)+';}',
'#nnReg .mgrid>div{min-width:0;} #nnReg .mgrid .full{grid-column:1/-1;}',
'#nnReg label{display:block; margin:'+S(6)+' 0 2px; font-size:'+S(12)+'; font-weight:700; color:var(--ink-sub,#5c6662); line-height:1.3; cursor:pointer;}',
'#nnReg label b.req{color:#b62221; margin-left:4px;}',
'#nnReg input,#nnReg select,#nnReg textarea{display:block; width:100%; min-width:0; max-width:100%; margin:0; font-family:inherit; color:inherit;',
'  font-size:'+S(16)+' !important; height:'+S(36)+' !important; padding:0 '+S(9)+' !important; border:1.5px solid #b9c4b4; border-radius:7px; background:#fff; box-shadow:inset 0 2px 4px rgba(0,0,0,.07);}',
'#nnReg textarea{height:'+S(60)+' !important; padding:'+S(6)+' '+S(9)+' !important; resize:none; line-height:1.4;}',
'#nnReg input:focus,#nnReg select:focus,#nnReg textarea:focus{border-color:var(--green,#2e9e58); outline:none;}',
'#nnReg .unit{display:flex; gap:'+S(6)+'; align-items:center;} #nnReg .unit input{flex:1 1 auto;} #nnReg .unit select{flex:0 0 '+S(88)+';}',
'#nnReg .seg{display:flex; gap:'+S(6)+';} #nnReg .seg button{flex:1 1 0; min-width:0; height:'+S(36)+'; font-family:inherit; font-size:'+S(14)+'; font-weight:800; cursor:pointer;',
'  color:#1c6b3c; background:#fff; border:2px solid #1c6b3c; border-radius:4px; box-shadow:0 3px 0 #124a28;}',
'#nnReg .seg button.on{background:#ffe46b; color:#3d3208; border-color:#a87f00; box-shadow:0 3px 0 #7d5f00;}',
'#nnReg .seg button:active{transform:translateY(2px); box-shadow:0 1px 0 #124a28;}',
'#nnReg .adv{display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:0 8px; width:100%; margin:'+S(12)+' 0 2px; padding:'+S(8)+' '+S(10)+';',
'  font-family:inherit; font-size:'+S(14)+'; font-weight:800; color:#1c6b3c; cursor:pointer; background:#eef6ef; border:2px solid #1c6b3c; border-radius:4px; box-shadow:0 3px 0 #124a28;}',
'#nnReg .adv:active{transform:translateY(2px); box-shadow:0 1px 0 #124a28;}',
'#nnReg .adv b{white-space:nowrap;} #nnReg .adv small{font-size:'+S(11)+'; font-weight:700; color:#5a6b5f; white-space:nowrap;}',
'#nnReg:not(.advopen) .advbox{display:none;}',
'#nnReg .warn{margin:'+S(4)+' 0 0; padding:'+S(5)+' '+S(8)+'; font-size:'+S(12)+'; font-weight:800; color:#8c2c1e; background:#fdecea; border:1.5px solid #e0a39a; border-radius:4px; display:none;}',
'#nnReg .warn.on{display:block;}',
'#nnReg .hint{margin:'+S(3)+' 0 0; font-size:'+S(11)+'; font-weight:700; color:#5a6b5f;}',
'#nnReg .btns{position:sticky; bottom:0; z-index:3; display:flex; gap:'+S(8)+'; align-items:center; margin:'+S(12)+' '+N(15)+' 0; padding:'+S(8)+' '+S(15)+' '+S(10)+';',
'  background:#fffdf4; border-top:2px solid #c5d2c3;}',
'html[data-nnphone="1"] #nnReg .btns{margin:'+S(12)+' '+N(12)+' 0; padding:'+S(8)+' '+S(12)+' '+S(10)+';}',
'#nnReg .btns button{flex:1 1 0; min-width:0; min-height:'+S(40)+'; font-family:inherit; font-size:'+S(14)+'; font-weight:700; cursor:pointer; border-radius:8px; transition:transform .06s, box-shadow .06s;}',
'#nnReg .btns .cancel{background:linear-gradient(180deg,#f2f2ee,#dcdcd4); border:1.5px solid #a9a99f; color:var(--ink,#222826);',
'  box-shadow:inset 0 1px 0 rgba(255,255,255,.8), 0 2px 0 var(--edge-gray,#8b8b81);}',
'#nnReg .btns .ok{background:linear-gradient(180deg,var(--orange,#ff9d1e),var(--orange-deep,#e07800)); color:#fff; border:1.5px solid var(--orange-edge,#b35f00);',
'  letter-spacing:.02em; text-shadow:0 1px 0 rgba(0,0,0,.3); box-shadow:inset 0 1px 0 rgba(255,255,255,.4), 0 2px 0 var(--orange-edge,#b35f00);}',
'#nnReg .btns button:active{transform:translateY(2px); box-shadow:none;}',
'#nnReg .msg{min-height:0; margin:'+S(6)+' 0 0; font-size:'+S(12)+'; font-weight:800; color:#8c2c1e;}',
'@media print{#nnRegBg{display:none !important;}}'
].join('\n');
(document.head||document.documentElement).appendChild(css);

/* ---------------- 保存（読み書きとも守る） ---------------- */
var isBox=function(r){ return r&&typeof r==='object'&&!Array.isArray(r); };
function readJSON(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } }
function writeJSON(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); return true; }catch(e){ return false; } }
var uid=function(p){ return (p||'')+Date.now().toString(36)+Math.random().toString(36).slice(2,6); };

/* 客先登録（ホームの見本と同じ中身。保存が無いときはこれを土台にする＝見本の5社が消えない） */
var TOKUI_SEED={
 moto:[
  {id:'c1', name:'北王リビングサービス', tanto:'工事部 佐藤様', tel:'011-2XX-XXXX', mail:'koji@hokuo-living.example.jp',
   nyukin:'毎月末締・翌月末払', joken:'翌月末振込', site:'30日', memo:'検収書はメールで先行可'},
  {id:'c2', name:'大和ライフネクスト', tanto:'札幌支店 修繕課 田村様', tel:'011-2XX-XXXX', mail:'shuzen-spk@dlnext.example.co.jp',
   nyukin:'毎月20日締・翌月末払', joken:'翌月末振込', site:'40日', memo:''},
  {id:'c3', name:'丸彦渡辺建設', tanto:'建築部 工務課 渡辺様', tel:'011-6XX-XXXX', mail:'koumu@maruhiko.example.co.jp',
   nyukin:'毎月末締・翌々月10日払', joken:'翌々月10日振込', site:'70日', memo:'注文書・注文請書の取交し必須'},
  {id:'c4', name:'日本ハウズイング', tanto:'北海道支店 工事課 中島様', tel:'011-7XX-XXXX', mail:'kouji-hk@housing.example.co.jp',
   nyukin:'毎月末締・翌々月末払', joken:'翌々月末振込', site:'60日', memo:''},
  {id:'c5', name:'管理組合（直）', tanto:'（物件ごとの理事長）', tel:'—', mail:'—',
   nyukin:'理事会承認後・目安30日', joken:'理事会承認後振込', site:'約30日', memo:'総会・理事会の日程を確認してから請求'},
 ],
 shiire:[
  {id:'s1', name:'北海建材商事（株）', tanto:'資材部 高橋様', tel:'011-6XX-XXXX', fax:'011-6XX-XXXX',
   mail:'order@hokkai-kenzai.example.jp', memo:'ウレタン・アス系。FAX発注が既定'},
  {id:'s2', name:'サンエイ商会（株）', tanto:'営業2課 佐々木様', tel:'011-8XX-XXXX', fax:'011-8XX-XXXX',
   mail:'juchu@sanei-shokai.example.jp', memo:'塩ビ・FRP系。メール発注が既定'},
 ]};
function tokuiLoad(){
  var d=readJSON('nn_tokui_v1');
  if(isBox(d)&&Array.isArray(d.moto)&&Array.isArray(d.shiire)) return {moto:d.moto.filter(isBox), shiire:d.shiire.filter(isBox)};
  return JSON.parse(JSON.stringify(TOKUI_SEED));
}
/* 材料登録（仕様・材料の形 {v:1,items:[…]}。配列だけの古い形も読む） */
function matLoad(){
  var d=readJSON('nn_materials_v1');
  var a=Array.isArray(d)?d:(isBox(d)&&Array.isArray(d.items)?d.items:[]);
  return a.filter(isBox);
}
var C1=[['アスファルト防水','アス防水'],['アスファルト防水／改質アスファルトシート防水','アス共通'],['改質アスファルトシート防水','改質アス'],
  ['合成高分子系ルーフィングシート防水','シート防水'],['塗膜防水','塗膜防水'],['各種副資材','副資材']];
var OU=["缶","袋","巻","セット","本","枚","個","箱","梱包","式","㎡","m","kg"];
var CU=["kg","㎡","m","本","枚","個","cc","g","セット","式"];

function esc(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function opts(a,cur){ return a.map(function(x){ var v=Array.isArray(x)?x[0]:x, t=Array.isArray(x)?x[1]:x; return '<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(t)+'</option>'; }).join(''); }
var norm=function(s){ return String(s||'').normalize('NFKC').replace(/株式会社|有限会社|合同会社|\(株\)|\(有\)/g,'').replace(/[\s()]/g,'').toLowerCase(); };

/* ---------------- 窓の組み立て ---------------- */
var bg=null, box=null, cur=null, keep={cust:{},mat:{}};
function ensure(){
  if(bg&&bg.isConnected) return;
  bg=document.createElement('div'); bg.id='nnRegBg';
  bg.innerHTML='<div id="nnReg" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(bg); box=bg.firstChild;
  bg.addEventListener('pointerdown',function(e){ if(e.target===bg) close(); });
  /* 入力し直したら「同じ名前」の知らせを消す（もう一度押しての登録もやり直し） */
  box.addEventListener('input',function(e){ if(cur&&e.target&&e.target.id&&/^rg_/.test(e.target.id)){ cur.dup=false; warn(''); msg(''); } });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&bg.classList.contains('open')&&!document.querySelector('#nnSelPop.open')) close(); });
}
function field(id,label,html,cls,req){ return '<div'+(cls?' class="'+cls+'"':'')+'><label for="'+id+'">'+label+(req?'<b class="req">必須</b>':'')+'</label>'+html+'</div>'; }
function inp(id,ph,type,extra){ return '<input id="'+id+'"'+(type?' type="'+type+'"':'')+(ph?' placeholder="'+esc(ph)+'"':'')+(extra||'')+'>'; }
function g(id){ return document.getElementById(id); }
function open(kind,opt){
  ensure(); opt=opt||{}; cur={kind:kind,opt:opt,dup:false};
  box.classList.remove('advopen');
  box.innerHTML=(kind==='cust'?custHtml(opt):matHtml(opt));
  /* 前に閉じたときの入力を戻す（保存するまでは消さない） */
  var k=keep[kind]; if(!opt.fresh) Object.keys(k).forEach(function(id){ var e=g(id); if(e&&k[id]!=='') e.value=k[id]; });
  if(opt.name){ var n=g(kind==='cust'?'rg_name':'rg_mname'); if(n) n.value=opt.name; }
  if(kind==='cust') setSeg(opt.tab||k.__tab||'moto');
  var hasAdv=[].some.call(box.querySelectorAll('.advbox input,.advbox textarea'),function(e){ return e.value!==''; });
  if(hasAdv) box.classList.add('advopen');
  advLabel();
  box.querySelector('.adv').addEventListener('click',function(){ box.classList.toggle('advopen'); advLabel(); });
  box.querySelector('.mx').addEventListener('click',close);
  box.querySelector('.cancel').addEventListener('click',close);
  box.querySelector('.ok').addEventListener('click',kind==='cust'?saveCust:saveMat);
  bg.classList.add('open'); box.scrollTop=0;
}
function advLabel(){ var o=box.classList.contains('advopen'), b=box.querySelector('.adv'); if(!b) return;
  b.innerHTML=o?'<b>▲ 詳細入力を閉じる</b>':'<b>▼ 詳細入力</b><small>'+esc(b.dataset.more||'')+'（あとからでもOK）</small>'; }
function remember(){ if(!cur) return; var k={}; [].forEach.call(box.querySelectorAll('input,select,textarea'),function(e){ if(e.id) k[e.id]=e.value; });
  if(cur.kind==='cust') k.__tab=segVal(); keep[cur.kind]=k; }
function close(){ remember(); if(window.nnSelClose) nnSelClose(); if(bg) bg.classList.remove('open'); var c=cur; cur=null; if(c&&c.opt.onClose) try{ c.opt.onClose(); }catch(e){} }
function clearKeep(kind){ keep[kind]={}; }
function warn(t){ var w=box.querySelector('.warn'); if(w){ w.textContent=t; w.classList.toggle('on',!!t); } }
function msg(t){ var m=box.querySelector('.msg'); if(m) m.textContent=t; }
function btns(){ return '<div class="msg"></div><div class="btns"><button type="button" class="cancel">キャンセル</button><button type="button" class="ok">保存する</button></div>'; }

/* ---------------- 新規顧客登録 ---------------- */
function custHtml(o){
  return '<h3>新規顧客登録</h3><button type="button" class="mx" title="閉じる（入力は残ります）">✕</button>'
  +'<div class="msec">基本情報</div><div class="mgrid">'
  +'<div class="full"><label>区分</label><div class="seg" id="rg_seg"><button type="button" data-t="moto">元請（得意先）</button><button type="button" data-t="shiire">仕入業者</button></div></div>'
  +field('rg_name','会社名',inp('rg_name','例：◯◯建設（株）','',' autocomplete="organization"')+'<div class="warn"></div>','full',true)
  +field('rg_tanto','担当者',inp('rg_tanto','例：工事部 佐藤様'),'full')
  +field('rg_tel','電話',inp('rg_tel','例：011-000-0000','tel',' inputmode="tel"'))
  +field('rg_mail','メール',inp('rg_mail','例：koji@example.jp','email',' inputmode="email"'))
  +'</div>'
  +'<button type="button" class="adv" data-more="支払条件・住所・備考など"></button>'
  +'<div class="advbox">'
  +'<div class="msec motoOnly">支払条件（元請）</div><div class="mgrid motoOnly">'
  +field('rg_nyukin','締め・入金日',inp('rg_nyukin','例：毎月末締・翌月末払'),'full')
  +field('rg_joken','支払方法',inp('rg_joken','例：翌月末振込'))
  +field('rg_site','支払サイト',inp('rg_site','例：30日'))
  +'</div>'
  +'<div class="msec">連絡先・その他</div><div class="mgrid">'
  +field('rg_kana','ふりがな',inp('rg_kana','例：まるまるけんせつ'),'full')
  +'<div class="full shiireOnly">'+'<label for="rg_fax">FAX</label>'+inp('rg_fax','例：011-000-0001','tel',' inputmode="tel"')+'</div>'
  +field('rg_addr','住所',inp('rg_addr','例：札幌市中央区◯◯'),'full')
  +field('rg_memo','備考',"<textarea id=\"rg_memo\" placeholder=\"例：注文書・注文請書の取交し必須\"></textarea>",'full')
  +'</div></div>'+btns();
}
function segVal(){ var b=box.querySelector('#rg_seg button.on'); return b?b.dataset.t:'moto'; }
function setSeg(t){
  [].forEach.call(box.querySelectorAll('#rg_seg button'),function(b){ b.classList.toggle('on',b.dataset.t===t);
    b.onclick=function(){ setSeg(b.dataset.t); cur.dup=false; warn(''); }; });
  [].forEach.call(box.querySelectorAll('.motoOnly'),function(e){ e.style.display=t==='moto'?'':'none'; });
  [].forEach.call(box.querySelectorAll('.shiireOnly'),function(e){ e.style.display=t==='shiire'?'':'none'; });
}
function saveCust(){
  var tab=segVal(), v=function(id){ var e=g(id); return e?e.value.trim():''; };
  var name=v('rg_name');
  if(!name){ msg('会社名を入れてください'); g('rg_name').focus(); return; }
  var db=tokuiLoad();
  var same=db[tab].filter(function(x){ return norm(x.name)===norm(name); })[0];
  if(same&&!cur.dup){ cur.dup=true; warn('「'+same.name+'」はもう登録されています。別の会社として登録するときは、もう一度「保存する」を押してください。'); return; }
  var it={id:uid(tab==='moto'?'c':'s'), name:name, tanto:v('rg_tanto'), tel:v('rg_tel'), mail:v('rg_mail'),
    kana:v('rg_kana'), addr:v('rg_addr'), memo:v('rg_memo'), createdAt:Date.now()};
  if(tab==='moto'){ it.nyukin=v('rg_nyukin'); it.joken=v('rg_joken'); it.site=v('rg_site'); }
  else it.fax=v('rg_fax');
  db[tab].unshift(it);
  if(!writeJSON('nn_tokui_v1',db)){ msg('端末の保存容量がいっぱいで保存できませんでした。設定からデータを書き出して、要らない写真を消してください。'); return; }
  var c=cur; clearKeep('cust'); cur=null; if(window.nnSelClose) nnSelClose(); bg.classList.remove('open');
  if(typeof window.toast==='function') window.toast('顧客を登録しました：'+name);
  try{ window.dispatchEvent(new CustomEvent('nn-tokui-changed',{detail:{tab:tab,item:it}})); }catch(e){}
  if(c.opt.onSave) try{ c.opt.onSave(it,tab); }catch(e){}
}

/* ---------------- 新規材料登録 ---------------- */
function matHtml(o){
  return '<h3>新規材料登録</h3><button type="button" class="mx" title="閉じる（入力は残ります）">✕</button>'
  +'<div class="msec">基本情報</div><div class="mgrid">'
  +field('rg_mname','製品名',inp('rg_mname','例：△△プライマー')+'<div class="warn"></div>','full',true)
  +field('rg_maker','メーカー',inp('rg_maker','例：田島ルーフィング'),'full')
  +field('rg_c1','分類','<select id="rg_c1">'+opts(C1,o.c1||'各種副資材')+'</select>')
  +field('rg_ou','発注単位','<select id="rg_ou">'+opts(OU,'缶')+'</select>')
  +field('rg_price','単価（円・税抜）',inp('rg_price','あとで入力してもOK','number',' min="0" inputmode="numeric"'),'full')
  +'</div>'
  +'<button type="button" class="adv" data-more="規格・内容量・仕入先など"></button>'
  +'<div class="advbox">'
  +'<div class="msec">規格・内容量</div><div class="mgrid">'
  +field('rg_c2','中分類',inp('rg_c2','例：プライマー'))
  +field('rg_spec','規格・サイズ',inp('rg_spec','例：16kg/缶'))
  +'<div class="full"><label for="rg_cv">1単位の内容量</label><div class="unit">'+inp('rg_cv','例：16','number',' min="0" inputmode="decimal"')
  +'<select id="rg_cu" aria-label="内容量の単位">'+opts(CU,'kg')+'</select></div><div class="hint" id="rg_per"></div></div>'
  +'</div>'
  +'<div class="msec">仕入・メモ</div><div class="mgrid">'
  +field('rg_shiire','仕入先',inp('rg_shiire','例：北海建材商事（株）'),'full')
  +field('rg_mmemo','メモ',"<textarea id=\"rg_mmemo\" placeholder=\"例：冬季は硬化が遅い\"></textarea>",'full')
  +'</div></div>'+btns();
}
/* 内容量あたりの単価（例：16kg 8,000円 → 500円/kg）をその場で見せる */
document.addEventListener('input',function(e){
  if(!cur||cur.kind!=='mat') return; if(!/^rg_(price|cv|cu)$/.test(e.target.id||'')) return; per();
});
document.addEventListener('change',function(e){ if(cur&&cur.kind==='mat'&&(e.target.id==='rg_cu')) per(); });
function per(){ var p=parseFloat(g('rg_price').value), c=parseFloat(g('rg_cv').value), h=g('rg_per'); if(!h) return;
  h.textContent=(p>0&&c>0)?('＝ '+(Math.round(p/c*10)/10).toLocaleString()+'円/'+g('rg_cu').value):''; }
function saveMat(){
  var v=function(id){ var e=g(id); return e?e.value.trim():''; };
  var name=v('rg_mname');
  if(!name){ msg('製品名を入れてください'); g('rg_mname').focus(); return; }
  var price=parseFloat(v('rg_price')); if(v('rg_price')!==''&&!(price>=0)){ msg('単価は0以上の数字で入れてください'); return; }
  var maker=v('rg_maker')||'（メーカー未設定）';
  var raw=readJSON('nn_materials_v1'), items=matLoad();
  var same=items.filter(function(x){ return norm(x.n)===norm(name)&&norm(x.maker)===norm(maker); })[0];
  if(same&&!cur.dup){ cur.dup=true; warn('同じメーカーの「'+same.n+'」はもう登録されています。別の材料として登録するときは、もう一度「保存する」を押してください。'); return; }
  var now=Date.now();
  var it={id:uid('m'),catalogId:null,maker:maker,n:name,s:name,c1:v('rg_c1')||'各種副資材',c2:v('rg_c2')||'その他',
    sp:v('rg_spec')||'―',j:'',pk:'',cl:'',pr:'標準品',us:'',bk:'',pg:'',
    ou:v('rg_ou')||'缶',cv:parseFloat(v('rg_cv'))||1,cu:v('rg_cu')||'kg',
    price:price>0?Math.round(price):null,memo:[v('rg_shiire')?('仕入先：'+v('rg_shiire')):'',v('rg_mmemo')].filter(Boolean).join('／'),
    shiire:v('rg_shiire'),createdAt:now,updatedAt:now};
  items.push(it);
  /* 元の形のまま書き戻す（{v:1,items} の中のほかの値は消さない） */
  var out=isBox(raw)?Object.assign({},raw,{items:items}):{v:1,items:items};
  if(!writeJSON('nn_materials_v1',out)){ msg('端末の保存容量がいっぱいで保存できませんでした。設定からデータを書き出して、要らない写真を消してください。'); items.pop(); return; }
  var c=cur; clearKeep('mat'); cur=null; if(window.nnSelClose) nnSelClose(); bg.classList.remove('open');
  if(typeof window.toast==='function') window.toast('材料を登録しました：'+name);
  try{ window.dispatchEvent(new CustomEvent('nn-materials-changed',{detail:{item:it}})); }catch(e){}
  if(c.opt.onSave) try{ c.opt.onSave(it); }catch(e){}
}

window.nnMaster={ tokuiLoad:tokuiLoad, matLoad:matLoad, TOKUI_SEED:TOKUI_SEED,
  customer:function(o){ open('cust',o); }, material:function(o){ open('mat',o); }, close:close };
window.nnCustRegOpen=window.nnMaster.customer;
window.nnMatRegOpen=window.nnMaster.material;
})();
