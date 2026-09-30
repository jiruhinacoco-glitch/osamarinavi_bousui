/* ============================================================
   ★2026-09-29i 材料の「製品区分」と「イラスト」（本人の指示）
   ------------------------------------------------------------
   ・製品区分＝絵が変わる単位（アスファルトコンパウンド・プライマー・ルーフィング…）。
     カタログの中分類（c2）から自動で決める。中分類だけでは分けられないものは材料IDで決める
     （例：中分類「アスファルト」のうち アスタイトM〜ハイタイトJ＝アスファルトコンパウンド、アスキング＝シール材）。
   ・イラストは既定で製品区分の絵。利用者が材料ごとに別の絵を選べる（item.ill。空＝製品区分に合わせる）。
   ・絵のファイルは icons/mat_<キー>.png（無いうちは区分名の色札を出す）。
     ★絵を足したら sw.js の ASSETS にも足す。同じ名前で差し替えたら ?v= を上げる（ILL_VER）。
   ============================================================ */
(function(){ 'use strict';
if(window.nnMatIll) return;
var ILL_VER='2026-09-30i';   /* ★絵を同じ名前で差し替えたら上げる（上げないと古い絵が出続ける） */
var KUBUN=[
 ['asphalt_compound','アスファルトコンパウンド','#6b4a2a'],
 ['primer','プライマー','#8a5a12'],
 ['shitaji','下地調整材','#7a6f5a'],
 ['roofing_sand','砂付ルーフィング','#6a5f4a'],
 ['roofing','その他のルーフィング','#3d4a57'],
 ['kaishitsu_sheet','改質アスファルトシート','#2f3b45'],
 ['tape','テープ','#50606b'],
 ['pvc_sheet','塩ビシート','#2c6e8f'],
 ['rubber_sheet','ゴムシート','#3a3f44'],
 ['tomaku','塗膜防水材','#2e7d5b'],
 ['topcoat','トップコート・仕上塗料','#3f8f3a'],
 ['hokyofu','補強布','#8b7d3a'],
 ['kanshou','緩衝・絶縁シート','#6a5a8c'],
 ['dannetsu','断熱材','#b0632a'],
 ['drain','ドレン','#5a6570'],
 ['dakki','脱気筒','#6e7a84'],
 ['seal','シール材','#7a3f5c'],
 ['secchaku','接着剤','#8c4a3a'],
 ['yakumono','成型役物','#4a6f7a'],
 ['fukushizai','その他副資材','#5c6662']
];
var BY={}; KUBUN.forEach(function(k){ BY[k[0]]={k:k[0],label:k[1],color:k[2]}; });
/* 材料IDで決めるもの（中分類だけでは分けられない） */
var BY_ID={M005:'asphalt_compound',M006:'asphalt_compound',M007:'asphalt_compound',M008:'asphalt_compound',M009:'seal'};
/* 中分類 → 製品区分（上から順に、含む文字で判定） */
var BY_C2=[
 [/プライマー/,'primer'],[/下地調整/,'shitaji'],[/テープ/,'tape'],
 [/改質アスファルトシート/,'kaishitsu_sheet'],[/塩化ビニル|塩ビ/,'pvc_sheet'],[/加硫ゴム|ゴム系ルーフィングシート|EPDM/,'rubber_sheet'],[/ルーフィングシート/,'pvc_sheet'],[/ルーフィング/,'roofing'],
 [/仕上塗料|保護塗料|トップコート/,'topcoat'],[/防水材/,'tomaku'],[/補強布/,'hokyofu'],
 [/通気緩衝|絶縁|脱気材|緩衝/,'kanshou'],[/断熱/,'dannetsu'],[/ドレン/,'drain'],[/脱気筒/,'dakki'],
 [/シール/,'seal'],[/接着剤/,'secchaku'],[/キャント|役物|コーナー/,'yakumono'],[/^アスファルト$/,'asphalt_compound']
];
function auto(m){
  if(!m) return 'fukushizai';
  var id=m.catalogId||m.i||''; if(BY_ID[id]) return BY_ID[id];
  var c2=String(m.c2||''), k='fukushizai';
  for(var i=0;i<BY_C2.length;i++) if(BY_C2[i][0].test(c2)){ k=BY_C2[i][1]; break; }
  /* ★2026-09-29r ルーフィングのうち、中分類か製品名に「砂付」があれば砂付ルーフィング（例：砂付ガムトップは中分類が改質アスファルトルーフィング） */
  if(k==='roofing' && /砂付/.test(c2+' '+String(m.n||''))) k='roofing_sand';
  return k;
}
/* ★2026-09-29r 旧キー「合成高分子シート（polymer_sheet）」は塩ビシート／ゴムシートに分けた。
   前に保存した材料はここで読み替える（自動の結果が塩ビ・ゴムならそれ、違えば塩ビシート） */
function legacy(k,m){ if(k!=='polymer_sheet') return k; var a=auto(m); return (a==='pvc_sheet'||a==='rubber_sheet')?a:'pvc_sheet'; }
/* 材料の製品区分（登録で選んだもの＞自動）とイラスト（選んだ絵＞製品区分の絵） */
function kubunOf(m){ var k=m&&legacy(m.kubun,m); return (k&&BY[k])?k:auto(m); }
function illOf(m){ var k=m&&legacy(m.ill,m); return (k&&BY[k])?k:kubunOf(m); }
function src(k){ return './icons/mat_'+k+'.png?v='+ILL_VER; }
var esc=function(t){ return String(t==null?'':t).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
/* 絵1枚（無いときは区分名の色札）。size＝高さ px。★2026-09-30b 枠は横長（4:3）。
   絵は余白を切って元の縦横比のまま保存してあるので、枠いっぱいに収まる（正方形の枠だと横長の巻物が小さく見えた・§557） */
function html(k,size){
  var b=BY[k]||BY.fukushizai; size=size||64; var w=Math.round(size*4/3);
  return '<span class="nnmi" data-k="'+b.k+'" style="width:'+w+'px;height:'+size+'px;--mic:'+b.color+'">'
    +'<img src="'+src(b.k)+'" alt="'+esc(b.label)+'" onerror="this.parentNode.classList.add(\'noimg\');this.remove()">'
    +'<i>'+esc(b.label)+'</i></span>';
}
var css=document.createElement('style'); css.id='nn-matill-css';
css.textContent=[
'.nnmi{position:relative; display:inline-flex; align-items:center; justify-content:center; flex:none; background:#fff; border:2px solid var(--mic); border-radius:2px; overflow:hidden; vertical-align:middle;}',
'.nnmi img{width:100%; height:100%; object-fit:contain; display:block; padding:3px; box-sizing:border-box;}',
'.nnmi i{display:none;}',
'.nnmi.noimg{background:var(--mic);}',
'.nnmi.noimg i{display:block; font-style:normal; color:#fff; font-weight:900; font-size:10.5px; line-height:1.2; text-align:center; padding:2px; word-break:break-all;}',
'#nnMiPick{position:fixed; inset:0; z-index:99996; background:rgba(0,0,0,.45); display:flex; align-items:flex-start; justify-content:center; overflow-y:auto; padding:12px;}',
'#nnMiPick .box{width:min(620px,100%); margin:auto; background:#fffdf4; border:2px solid #1c6b3c; box-shadow:0 3px 0 #124a28;}',
'#nnMiPick .hd{display:flex; align-items:center; gap:8px; padding:8px 12px; background:#2e9e58; color:#fff; font-weight:900; font-size:15px;}',
'#nnMiPick .hd button{margin-left:auto; width:36px; height:36px; border:0; background:rgba(0,0,0,.28); color:#fff; font-size:17px; font-weight:900; cursor:pointer;}',
'#nnMiPick .gr{display:grid; grid-template-columns:repeat(auto-fill,minmax(108px,1fr)); gap:8px; padding:12px;}',
'#nnMiPick .gr button{display:flex; flex-direction:column; align-items:center; gap:4px; padding:6px 4px; background:#fff; border:2px solid #c9d2c6; border-radius:2px; cursor:pointer; font:inherit; font-size:11.5px; font-weight:800; color:#222826; min-height:44px;}',
'#nnMiPick .gr button.on{border-color:#a87f00; background:#ffe46b; box-shadow:0 3px 0 #7d5f00;}',
'#nnMiPick .gr button.auto{grid-column:1/-1; flex-direction:row; justify-content:center; font-size:13px;}',
'.nnmi-btn{display:inline-flex; align-items:center; gap:10px; padding:4px 12px 4px 4px; background:#fff; border:2px solid #1c6b3c; border-radius:2px; box-shadow:0 3px 0 #124a28; cursor:pointer; font:inherit; font-weight:800; color:#1c6b3c; min-height:44px;}',
'.nnmi-btn:active{transform:translateY(2px); box-shadow:0 1px 0 #124a28;}'
].join('\n');
(document.head||document.documentElement).appendChild(css);
/* 絵を選ぶ小窓。cur＝いま選んでいる絵（空＝製品区分に合わせる）、kubun＝製品区分、cb(選んだキー or '') */
function pick(cur,kubun,cb){
  var old=document.getElementById('nnMiPick'); if(old) old.remove();
  var bg=document.createElement('div'); bg.id='nnMiPick';
  bg.innerHTML='<div class="box"><div class="hd">イラストを選ぶ<button type="button" aria-label="閉じる">✕</button></div><div class="gr">'
    +'<button type="button" class="auto'+(cur?'':' on')+'" data-k="">'+html(kubun,40)+'<span>製品区分（'+esc((BY[kubun]||BY.fukushizai).label)+'）に合わせる</span></button>'
    +KUBUN.map(function(k){ return '<button type="button" data-k="'+k[0]+'"'+(cur===k[0]?' class="on"':'')+'>'+html(k[0],64)+'<span>'+esc(k[1])+'</span></button>'; }).join('')
    +'</div></div>';
  document.body.appendChild(bg);
  var close=function(){ bg.remove(); };
  bg.addEventListener('click',function(e){
    if(e.target===bg||e.target.closest('.hd button')){ close(); return; }
    var b=e.target.closest('.gr button'); if(!b) return; close(); cb(b.getAttribute('data-k')||'');
  });
}
window.nnMatIll={KUBUN:KUBUN, BY:BY, auto:auto, kubunOf:kubunOf, illOf:illOf, src:src, html:html, pick:pick, VER:ILL_VER};
})();
