/* ============================================================
   納まりナビ「きく」 v3  2026-09-04j
   佐野さん発案：元請の前で「あの現場の単価いくらだっけ」に3秒で答える。
   ★2026-09-04j 本人の指示で全面改修：
     ・音声で来た人には音声で返す（既定オン）。答えの文字は声と同時に流れる（リアルタイム）
     ・防水材の単価だけでなく、納まりナビに登録してあること全部（入金日・着工日・完成予定・請負金額・
       利益・進捗・工法・メーカー・住所・元請・ステータス・連絡先・支払条件・発注履歴・保存図面・不具合タグ）
     ・声は端末で使える中でいちばん自然なもの（Siri／拡張／Natural／Google）を自動で選ぶ。
       さらに「高品質音声（クラウドTTS・APIキー）」を使えば最新AIと同じ声になる（任意・利用者の鍵）

   ★設計の芯：数字は絶対に推測しない。
     見つからなければ「登録がありません」と言う。あいまいなら候補を出して選ばせる。
     答えを作る側にAI（通信）は使わない ＝ 圏外でも動く・0円・毎回まったく同じ答え。

   ★どこから答えるか（すべて端末の中の実データ）
     ・物件一覧  window.NN_BUKKEN（bukken_list.js＝現場記録帳RAWの写し）… 日程・お金・工法・元請・住所
     ・発注履歴  nn_hacchu_hist … その現場でその材料をいくらで買ったか（lines[].p）
     ・材料登録  nn_materials_v1 … 通常単価（price）と価格改定の履歴（hist）
     ・客先登録  nn_tokui_v1 … 元請・仕入業者の連絡先・入金条件
     ・保存図面  nn_zumen_saves_v1 … 図面の有無・平場面積
     ・不具合タグ nn_kirokucho_def_v1 … 現場の不具合・現場条件

   使い方：<script src="./nn_ask.js"></script> を置いて window.nnAskOpen() を呼ぶだけ。
   検査用：window.NN_ASK.answer('質問') が答えのオブジェクトを返す（画面なしで検算できる）。
   ============================================================ */
(function(){
if(window.NN_ASK) return;

/* ---------- 保存の読み出し（壊れていても落ちない・§199/§210） ---------- */
function ls(k){ try{ return localStorage.getItem(k); }catch(_){ return null; } }
function okObj(o){ return o && typeof o==='object' && !Array.isArray(o); }
function jarr(k){ try{ var v=JSON.parse(ls(k)||'[]'); return Array.isArray(v)?v.filter(okObj):[]; }catch(_){ return []; } }
function hist(){ return jarr('nn_hacchu_hist'); }
function mats(){ return jarr('nn_materials_v1'); }
function buks(){ var v=window.NN_BUKKEN; return Array.isArray(v)?v.filter(okObj):[]; }
function tokui(){
  try{ var v=JSON.parse(ls('nn_tokui_v1')||'null'); if(!okObj(v)) return {moto:[],shi:[]};
       return {moto:Array.isArray(v.moto)?v.moto.filter(okObj):[],
               shi :Array.isArray(v.shi )?v.shi .filter(okObj):(Array.isArray(v.shiire)?v.shiire.filter(okObj):[])}; }catch(_){ return {moto:[],shi:[]}; }
}
function saves(){ return jarr('nn_zumen_saves_v1'); }
function defs(){ try{ var v=JSON.parse(ls('nn_kirokucho_def_v1')||'{}'); return okObj(v)?v:{}; }catch(_){ return {}; } }
/* 物件一覧がまだ読まれていないページでは、開いたときに読む（55KB・開いたときだけ） */
function ensureBukken(cb){
  if(Array.isArray(window.NN_BUKKEN) || document.getElementById('nnAskBk')){ cb&&cb(); return; }
  var s=document.createElement('script'); s.id='nnAskBk'; s.src='./bukken_list.js';
  s.onload=function(){ cb&&cb(); }; s.onerror=function(){ cb&&cb(); };
  document.head.appendChild(s);
}

/* ---------- 文字の正規化（全角/半角・大小・カナのゆれを吸収） ---------- */
function norm(s){
  s=String(s==null?'':s);
  s=s.replace(/[Ａ-Ｚａ-ｚ０-９]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0xFEE0);});
  s=s.toLowerCase();
  s=s.replace(/[\s　・･,，、。．.\-ー―‐−（）()「」『』【】\[\]／\/？?！!]/g,'');
  return s;
}
function grams(s){ var a=[],i; for(i=0;i<s.length-1;i++) a.push(s.substr(i,2)); return a; }
function score(qN, cand){
  var c=norm(cand); if(c.length<2) return 0;
  var g=grams(c), n=0, i;
  for(i=0;i<g.length;i++) if(qN.indexOf(g[i])>=0) n++;
  return n;
}
function pick(qN, list, key, min){
  min=min||2;
  var scored=list.map(function(o){ return {o:o, s:score(qN, typeof key==='function'?key(o):o[key])}; })
                 .filter(function(x){ return x.s>=min; })
                 .sort(function(a,b){ return b.s-a.s; });
  if(!scored.length) return {best:null, cands:[]};
  var top=scored[0].s;
  var tie=scored.filter(function(x){ return x.s>=top-1; });
  return {best:scored[0].o, cands:tie.slice(0,5).map(function(x){return x.o;}), sure:tie.length===1, top:top};
}

/* ---------- お金・日付の見た目と読み方 ---------- */
function yen(n){ return '¥'+Math.round(n).toLocaleString('ja-JP'); }
function man(n){ n=Math.round(n); if(Math.abs(n)>=10000) return (Math.round(n/10000)).toLocaleString('ja-JP')+'万円'; return n.toLocaleString('ja-JP')+'円'; }
/* 読み上げ用の金額：カンマを入れない（読み上げ部品が「10」「500」に切ることがある） */
function manS(n){ n=Math.round(n); if(Math.abs(n)>=10000) return Math.round(n/10000)+'万円'; return n+'円'; }
function now(){ try{ if(window.NN_ASK_NOW) return new Date(window.NN_ASK_NOW); }catch(_){} return new Date(); }
function dparse(s){ var m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m?new Date(+m[1],+m[2]-1,+m[3]):null; }
function isDate(s){ return !!dparse(s); }
function jdate(s){ var m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (m[1]+'年'+(+m[2])+'月'+(+m[3])+'日') : String(s||''); }
/* 読み上げの日付：今年なら年を省く（人が言うときと同じ） */
function sdate(s){ var d=dparse(s); if(!d) return String(s||''); var y=now().getFullYear();
  return (d.getFullYear()===y?'':(d.getFullYear()+'年'))+(d.getMonth()+1)+'月'+d.getDate()+'日'; }
function daysFrom(s){ var d=dparse(s); if(!d) return null; var t=now(); t=new Date(t.getFullYear(),t.getMonth(),t.getDate());
  return Math.round((d-t)/86400000); }
function rel(s){ var n=daysFrom(s); if(n==null) return ''; if(n===0) return '今日'; if(n>0) return 'あと'+n+'日'; return Math.abs(n)+'日前'; }
function relS(s){ var n=daysFrom(s); if(n==null) return ''; if(n===0) return '今日です'; if(n>0) return 'あと'+n+'日です'; return Math.abs(n)+'日前です'; }
function vendorName(vid){
  var t=tokui().shi, i;
  for(i=0;i<t.length;i++) if(t[i].id===vid || t[i].name===vid) return t[i].name||String(vid);
  return '';
}

/* ---------- 言葉のゆれ（2026-09-02e）AIは使わない。言い換えの表と、利用者が覚えさせた言い方だけ ---------- */
var SYN=[
  ['プライマー','下塗り','下塗','下地材','プライマ'],
  ['笠木','コーピング','かさぎ','コービング'],
  ['脱気筒','脱気装置','脱気','だっき'],
  ['ドレン','排水口','ルーフドレン','どれん'],
  ['シート','ルーフィング','ルーフイング'],
  ['ウレタン','塗膜','ウレタン塗膜'],
  ['シール','シーリング','コーキング','シーラント'],
  ['絶縁','通気緩衝','緩衝','脱気シート'],
  ['アスファルト','アス','溶融アス'],
  ['改質アス','改質アスファルト','改質'],
  ['粘着','常温粘着','自着'],
  ['トーチ','炙り','あぶり'],
  ['塩ビ','塩化ビニル','塩ビシート'],
  ['機械固定','機械的固定','ディスク'],
  ['面木','入隅面木','キャント'],
  ['押え金物','端末金物','アングル','押えアングル']
];
var LEARN='nn_ask_yomi_v1';
function learned(){ try{ var v=JSON.parse(ls(LEARN)||'{}'); return okObj(v)?v:{}; }catch(_){ return {}; } }
function learn(word, name){ if(!word||!name) return; try{ var m=learned(); m[norm(word)]=name; localStorage.setItem(LEARN, JSON.stringify(m)); }catch(_){} }
function expand(qN){
  var out=qN, i, j, g;
  for(i=0;i<SYN.length;i++){ g=SYN[i];
    for(j=0;j<g.length;j++){ if(qN.indexOf(norm(g[j]))>=0){ out += g.map(norm).join(''); break; } } }
  var m=learned(); for(var k in m){ if(k && qN.indexOf(k)>=0) out += norm(m[k]); }
  return out;
}
var STOP=/(いくら|単価|金額|価格|値段|現場|物件|材料|教え|なに|何|です|ます|でし|ました|入って|回答|来て|とき|くらい|って|だっけ|だった|予定)/g;
function aliasWord(q, bkName){
  var t=String(q||'').replace(STOP,' ');
  if(bkName){ var bn=String(bkName); for(var i=0;i<bn.length-1;i++){ t=t.split(bn.substr(i,2)).join(' '); } }
  var best='';
  (t.match(/[ァ-ヶー一-龠A-Za-z0-9]{2,}/g)||[]).forEach(function(w){ if(w.length>best.length) best=w; });
  return best;
}
window.nnAskLearn=learn;

/* 不具合・現場条件タグの呼び名（現場記録帳 DEFS と同じ） */
var DEFL={fukure:'膨れ',kuchiaki:'口開き',tsuppari:'突っ張り',rosui:'漏水',choking:'チョーキング',genmo:'減耗',
  sunaochi_geki:'砂落ち激しい',sunaochi:'砂落ち',gamahada:'ガマ肌',pool:'プール',drain:'ドレン詰まり',osamari:'納まり不良',
  toriai_furyo:'取り合い不良',tanmatsu:'端末不具合',shokubutsu:'植物繁茂',shitaji:'下地起因',togai:'凍害',fukuzatsu:'複雑形状',
  kyosho:'狭小部位',toriai:'取り合い発生',settyaku:'要接着試験',hikinuki:'要引き抜き試験',maker:'メーカー相談',
  maker_chu:'メーカー相談中',maker_zumi:'メーカー相談済',tebodori:'手戻り',tenaoshi:'手直し',claim:'クレーム',zougaku:'増額あり'};

/* ============================================================
   質問の意図（何を聞かれたか）
   ============================================================ */
var FIELDS=[
  ['nyukin',  /入金|振込|振り込|回収|お金.*(いつ|入)|支払.*(いつ|日)/],
  ['shime',   /締め|締日|しめ日/],
  ['chakko',  /着工|工事.*始|始ま|開始|いつから|着手|入り(日|は)/],
  ['kansei',  /完成|完了|終わ|引き渡|引渡|竣工|いつまで|上がり/],
  ['keiyaku', /契約日|契約は|契約いつ|契約.*いつ/],
  ['shiharai',/支払条件|支払い条件|サイト|支払は|支払いは/],
  ['rieki',   /利益|粗利|儲|もうけ|残る/],
  ['shinchoku',/進捗|進み|どこまで|何％|何%|進行|進んで/],
  ['nin',     /人工|人数|工数|何人/],
  ['tanka',   /請負単価|平米単価|㎡単価|単価は|単価いくら|単価/],
  ['kingaku', /請負|受注金額|受注額|工事金額|見積金額|売上|金額|総額|いくら/],
  ['kouhou',  /工法|仕様|どんな防水|防水は|防水の種類|何防水|何の防水|どういう防水/],
  ['maker',   /メーカー|材料は|材料.*どこ|どこの材料|製品/],
  ['suryo',   /数量|何㎡|何平米|面積|平米/],
  ['addr',    /住所|場所|どこにある|所在|どこ$|どこ？|どこ\?/],
  ['moto',    /元請|ゼネコン|発注者|お客|施主|誰の|どこの現場/],
  ['status',  /状況|ステータス|どうなって|どんな状態|進んでる|状態/],
  ['biko',    /備考|メモ|注意点|留意/],
  ['defect',  /不具合|タグ|膨れ|漏水|口開き|ふくれ|問題|症状|劣化/],
  ['zumen',   /図面|平面図|矩計|3d|３d|かいた|描いた/i],
  ['hacchu',  /発注(は|した|履歴|内容|何)|何を(買|発注|頼)|仕入/]
];
function fieldIntent(q){
  for(var i=0;i<FIELDS.length;i++) if(FIELDS[i][1].test(q)) return FIELDS[i][0];
  return null;
}
/* 材料（単価）の質問か＝発注履歴・材料登録に当たる名前があるとき */
function matIntent(q){
  if(/いくら|単価|金額|価格|円|値段/.test(q)) return 'price';
  if(/何缶|何本|何袋|何セット|数量|いくつ/.test(q))  return 'qty';
  if(/いつ|何日|日付|発注日/.test(q))                return 'date';
  return 'price';
}
var LISTW=/一覧|何件|どれ|全部|リスト|ある\?|ある？|ありますか|教えて$|どの現場|どこの現場|現場は|現場を|物件は|物件を|まとめ/;
var STW={kou:/施工中|工事中|やってる|進行中/, keiyaku:/契約済|受注済|受注した/, mit:/見積済|見積中|見積り中|見積もり中/, chosa:/調査済/, hikiai:/引合|引き合い|引合い/, kan:/完成済|完成した|終わった|完了した/};
function stName(k){ return {kan:'完成済',kou:'施工中',keiyaku:'契約済',mit:'見積済',chosa:'見積済(調査済)',hikiai:'引合いあり'}[k]||k; }

/* 質問の中の地名（〇〇市／〇〇区／〇〇町）。いちばん長いものを採る */
function areaOf(q){
  var m=String(q||'').match(/[一-龠ぁ-んァ-ヶA-Za-z]{1,8}?(?:市[一-龠ぁ-ん]{1,6}区|市|区|町|村)/g)||[];
  m=m.filter(function(t){ return !/^(現|物|都|全|各|同)/.test(t) && t.length>=2; });
  m.sort(function(a,b){ return b.length-a.length; });
  return m[0]||'';
}

/* ============================================================
   本体：質問 → 答え
   返すもの {ok, head（大きく出す一言）, sub, lines[]（根拠）, cands[]（あいまいなときの候補）, speak（読み上げ文）}
   ============================================================ */
var ctx={bk:null};
/* 材料の言葉（〇〇材・プライマー・缶…）。これが入っていれば材料の話として扱う */
var MATW=/材|プライマー|シート|ウレタン|塗料|アス|塩ビ|シール|笠木|ドレン|脱気|缶|袋|セット|kg/i;
function answer(q){
  q=String(q||'').trim();
  if(!q) return {ok:false, head:'聞きたいことを入れてください', lines:[], speak:'聞きたいことを言ってください'};
  var qN0=norm(q), qN=expand(qN0), H=hist(), M=mats(), B=buks();
  var fi=fieldIntent(q);

  /* --- 物件をさがす（番号 J051 が最優先） --- */
  var codeM=q.match(/[Jj]\s?(\d{3})/), bk=null, bkCands=[], bkSure=true;
  if(codeM) bk=B.filter(function(b){ return String(b.code).toUpperCase()==='J'+codeM[1]; })[0]||null;
  if(!bk){
    /* ★名前で当てる。住所だけで当てると「札幌市西区の現場」が1件の物件に化けるので、住所は一覧（area）に任せる */
    var pb=pick(qN0, B, function(b){ return (b.name||''); }, 3);
    bk=pb.best; bkCands=pb.cands; bkSure=!!pb.sure;
  }
  /* --- 元請をさがす（物件名に当たらないときの受け皿） --- */
  var motos=uniq(B.map(function(b){ return b.moto||''; }).filter(Boolean));
  var pmoto=pick(qN0, motos.map(function(n){return {n:n};}), 'n', 3);
  /* ★元請名は短いので「名前の半分以上が質問に入っている」ときだけ当てる。
     「防水工事」だけで「〇〇防水工事（株）」に化けるのを防ぐ（実際に化けた） */
  if(pmoto.best && pmoto.top < Math.max(3, Math.ceil((norm(pmoto.best.n).length-1)*0.5))) pmoto={best:null,cands:[]};
  var motoN=pmoto.best?pmoto.best.n:'';
  /* --- 状態・地名（一覧の質問） --- */
  var stK=null; for(var k in STW){ if(STW[k].test(q)){ stK=k; break; } }
  var area=areaOf(q);

  /* ① 連絡先 */
  if(/電話|連絡先|連絡|担当者|担当|メール|tel/i.test(q) && !/入金|着工|完成/.test(q)) return contactAnswer(q, qN0, bk, motoN);

  /* ② 一覧・集計（「施工中の現場は？」「札幌市西区の現場」「今月の入金」「〇〇の現場は何件」） */
  var wantList = LISTW.test(q) || (!bk && (stK || area || (motoN && !fi) || /今月|来月|今週|今年度|年度/.test(q)));
  if(wantList && !(bk && bkSure && fi && !stK && !area)) {
    var la=listAnswer(q, B, {stK:stK, area:area, moto:motoN, fi:fi});
    if(la) return la;
  }

  /* ③ 材料の名前が入っているなら、材料の話（単価・数量・発注日）を先に（「〇〇のプライマー いくら？」） */
  var matIn=hasMat(qN, H, M);
  /* 材料の言葉（〇〇材・プライマー・缶…）が入っていれば、名前が当たらなくても材料の話＝候補を出して覚える。
     「請負」「受注」「売上」など現場のお金の言葉があるときは現場の話 */
  if(matIn || (MATW.test(q) && !/請負|受注|工事金額|売上|利益|粗利/.test(q) && !fi)) { var ma0=matAnswer(q, qN, bk, H, M); if(ma0){ if(bk) ctx.bk=bk; return ma0; } }
  if(!matIn && MATW.test(q) && /いくら|単価|価格|値段|何缶|何本|何袋|何セット/.test(q) && !/請負|受注|工事金額|売上|利益|粗利/.test(q)){ var ma1=matAnswer(q, qN, bk, H, M); if(ma1){ if(bk) ctx.bk=bk; return ma1; } }

  /* ④ 物件の項目（日程・お金・工法…）。物件が無くても、直前の現場が分かるならそれで答える */
  if(fi && fi!=='hacchu' && fi!=='tanka'){
    if(!bk && !motoN && ctx.bk && !/現場|物件/.test(q)) bk=ctx.bk;
    if(bk){
      ctx.bk=bk;
      var fa=fieldAnswer(bk, fi, q);
      if(!bkSure && bkCands.length>1) fa.cands=bkCands;
      return fa;
    }
    if(motoN) return motoAnswer(motoN, fi, B);
  }
  /* 単価＝現場が分かって材料が無ければ請負単価、材料があれば材料の単価 */
  if(fi==='tanka' && bk && !matIn){ ctx.bk=bk; return fieldAnswer(bk,'tanka',q); }

  /* ⑤ 材料の単価・数量・発注日（名前が特定できなかったときの受け皿＝候補を出して覚える） */
  var ma=matAnswer(q, qN, bk, H, M);
  if(ma) { if(bk) ctx.bk=bk; return ma; }

  /* ⑥ 物件名だけ言われた＝その現場の概要 */
  if(bk){ ctx.bk=bk; var fs=fieldAnswer(bk,'summary',q); if(!bkSure && bkCands.length>1) fs.cands=bkCands; return fs; }
  if(motoN) return motoAnswer(motoN, 'summary', B);

  /* ⑦ どれにも当たらない */
  return {ok:false, head:'うまく聞き取れませんでした',
    lines:['現場名・元請名・材料名のどれかを入れて聞いてください',
           '例：「サン太平の入金日は？」「丸彦渡辺建設の現場は？」「札幌市西区の現場」「施工中の現場は？」「サン太平のプライマー いくら？」'],
    speak:'うまく聞き取れませんでした。現場名か元請名を入れて、もう一度聞いてください'};
}
function uniq(a){ var s={},r=[]; a.forEach(function(x){ if(!s[x]){s[x]=1;r.push(x);} }); return r; }
function miss(head, lines, sp){ return {ok:false, head:head, lines:lines||[], speak:sp||head}; }
function hasMat(qN, H, M){
  var names={}; H.forEach(function(h){ (Array.isArray(h.lines)?h.lines:[]).forEach(function(l){ if(okObj(l)&&l.n) names[l.n]=1; }); });
  M.forEach(function(m){ if(m.n) names[m.n]=1; });
  var pm=pick(qN, Object.keys(names).map(function(n){return {n:n};}), 'n', 3);
  return !!pm.best;
}

/* ---------- 物件の項目 ---------- */
function cost(b){ var a=(Array.isArray(b.a)&&b.a.length)?b.a:(Array.isArray(b.y)?b.y:[]); var s=0; a.forEach(function(x){ s+=(+x||0); }); return {sum:s, real:(Array.isArray(b.a)&&b.a.length>0)}; }
function fieldAnswer(b, fi, q){
  var L=[], head='', sub=b.name, sp='', ok=true, nm=b.name, st=b.st||'';
  var kan=(b.stk==='kan'), kou=(b.stk==='kou'), pre=(b.stk==='mit'||b.stk==='chosa'||b.stk==='hikiai');
  function stLine(){ L.push('状態：'+st+(b.p!==''&&b.p!=null&&(kou)?('（進捗 '+b.p+'%）'):'')); }
  function motoLine(){ if(b.moto) L.push('元請：'+b.moto); }
  switch(fi){
  case 'nyukin':
    if(isDate(b.nb)){
      head='入金予定 '+jdate(b.nb)+(rel(b.nb)?('（'+rel(b.nb)+'）'):'');
      sp=nm+'の入金予定は、'+sdate(b.nb)+'です。'+(daysFrom(b.nb)>=0?relS(b.nb)+'。':'');
    }else{ head='入金予定は未登録'; sp=nm+'の入金予定は、まだ登録されていません。'; ok=false; }
    if(b.sh) { L.push('支払条件：'+b.sh); sp+='支払条件は'+b.sh+'です。'; }
    if(isDate(b.sb)) L.push('締め処理：'+jdate(b.sb));
    if(b.amt) { L.push('請負金額：'+yen(b.amt)); sp+='請負金額は'+manS(b.amt)+'です。'; }
    motoLine(); stLine();
    break;
  case 'shime':
    if(isDate(b.sb)){ head='締め処理 '+jdate(b.sb); sp=nm+'の締め処理日は、'+sdate(b.sb)+'です。'; }
    else { head='締め処理日は未登録'; sp=nm+'の締め処理日は、登録されていません。'; ok=false; }
    if(isDate(b.nb)) { L.push('入金予定：'+jdate(b.nb)); sp+='入金予定は'+sdate(b.nb)+'です。'; }
    if(b.sh) L.push('支払条件：'+b.sh); motoLine();
    break;
  case 'chakko':
    if(isDate(b.cb)){
      var past=daysFrom(b.cb)<0;
      head=(past?'着工 ':'着工予定 ')+jdate(b.cb)+(rel(b.cb)?('（'+rel(b.cb)+'）'):'');
      sp=nm+'は、納まりナビの登録では'+sdate(b.cb)+(past?'に着工しています。':'より着工の予定です。');
      if(!past&&daysFrom(b.cb)>0) sp+=relS(b.cb)+'。';
    }else{
      head=pre?'着工はまだ決まっていません':'着工日は未登録'; ok=false;
      sp=nm+'は、'+(pre?('まだ'+st+'の段階で、着工日は決まっていません。'):'着工日が登録されていません。');
    }
    if(isDate(b.kb)) L.push('契約：'+jdate(b.kb));
    if(kan&&isDate(b.fb)) L.push('完成：'+jdate(b.fb)); else if(b.fy) L.push('完成予定：'+(isDate(b.fy)?jdate(b.fy):b.fy));
    if(b.ko) L.push('工法：'+b.ko); motoLine(); stLine();
    break;
  case 'kansei':
    if(kan&&isDate(b.fb)){ head='完成 '+jdate(b.fb); sp=nm+'は、'+sdate(b.fb)+'に完成しています。'; }
    else if(b.fy){ head='完成予定 '+(isDate(b.fy)?jdate(b.fy):b.fy)+(rel(b.fy)?('（'+rel(b.fy)+'）'):'');
      sp=nm+'の完成予定は、'+(isDate(b.fy)?sdate(b.fy):b.fy)+'です。'+(daysFrom(b.fy)>0?relS(b.fy)+'。':''); }
    else if(isDate(b.fb)){ head='完成予定 '+jdate(b.fb); sp=nm+'の完成予定は、'+sdate(b.fb)+'です。'; }
    else { head='完成予定は未登録'; ok=false; sp=nm+'の完成予定は、登録されていません。'; }
    if(isDate(b.cb)) L.push('着工：'+jdate(b.cb)); stLine(); motoLine();
    if(kou&&b.p!=='') sp+='進捗は'+b.p+'パーセントです。';
    break;
  case 'keiyaku':
    if(isDate(b.kb)){ head='契約 '+jdate(b.kb); sp=nm+'の契約日は、'+sdate(b.kb)+'です。'; }
    else { head='契約日は未登録'; ok=false; sp=nm+'の契約日は登録されていません。'+(pre?'まだ'+st+'の段階です。':''); }
    if(b.amt) L.push('請負金額：'+yen(b.amt)); if(b.sh) L.push('支払条件：'+b.sh); motoLine(); stLine();
    break;
  case 'shiharai':
    if(b.sh){ head=b.sh; sp=nm+'の支払条件は、'+b.sh+'です。'; } else { head='支払条件は未登録'; ok=false; sp=nm+'の支払条件は登録されていません。'; }
    if(isDate(b.nb)) { L.push('入金予定：'+jdate(b.nb)); sp+='入金予定は'+sdate(b.nb)+'です。'; }
    motoLine();
    var tk=tokui().moto.filter(function(m){ return norm(m.name)===norm(b.moto); })[0];
    if(tk&&tk.nyukin) L.push('客先登録：'+tk.nyukin+(tk.site?('／サイト '+tk.site):''));
    break;
  case 'rieki':
    var c=cost(b);
    if(b.amt&&c.sum){ var g=b.amt-c.sum, r=g/b.amt*100;
      head=(c.real&&kan?'利益 ':'利益見込 ')+yen(g)+'（'+r.toFixed(1)+'%）';
      sp=nm+'の'+(c.real&&kan?'利益は':'利益見込みは')+manS(g)+'、利益率'+r.toFixed(1)+'パーセントです。';
      L.push('請負金額：'+yen(b.amt)); L.push((c.real?'実績原価：':'予算原価：')+yen(c.sum)
        +'（材料 '+yen(b.a&&b.a.length?b.a[0]:(b.y[0]||0))+'／労務 '+yen(b.a&&b.a.length?b.a[1]:(b.y[1]||0))+'）');
    } else { head='利益は計算できません'; ok=false; sp=nm+'の利益は、金額の登録が足りず計算できません。'; }
    stLine(); motoLine();
    break;
  case 'shinchoku':
    if(kou&&b.p!==''){ head='進捗 '+b.p+'%'; sp=nm+'の進捗は'+b.p+'パーセントです。'; }
    else if(kan){ head='完成済（100%）'; sp=nm+'は完成しています。'; }
    else { head=st; sp=nm+'は、いま'+st+'の段階です。'; }
    if(isDate(b.cb)) L.push('着工：'+jdate(b.cb)); if(b.fy||b.fb) L.push((kan?'完成：':(isDate(b.fy)||!b.fy)?'完成予定：':'予定：')+(kan?jdate(b.fb):(isDate(b.fy)?jdate(b.fy):(b.fy||jdate(b.fb)))));
    motoLine();
    break;
  case 'nin':
    if(b.nin){ head=b.nin+'人工'; sp=nm+'は'+b.nin+'人工'+(kan?'かかりました。':'の予定です。');
      if(b.m&&b.un==='㎡') L.push('歩掛：'+(b.nin/b.m).toFixed(3)+' 人工/㎡（'+b.m+'㎡）'); }
    else { head='人工は未登録'; ok=false; sp=nm+'の人工は登録されていません。'; }
    break;
  case 'tanka':
    if(b.tan){ head=yen(b.tan)+'/'+(b.un||'㎡'); sp=nm+'の請負単価は、1'+(b.un||'平米')+'あたり'+b.tan+'円です。';
      if(b.m) L.push('数量：'+b.m+(b.un||'')+'　請負金額：'+yen(b.amt)); if(b.ko) L.push('工法：'+b.ko); }
    else { head='請負単価は未登録'; ok=false; sp=nm+'の請負単価は登録されていません。'; }
    break;
  case 'kingaku':
    if(b.amt){ head=yen(b.amt); sub=nm+'　請負金額'; sp=nm+'の請負金額は、'+manS(b.amt)+'です。';
      if(b.tan&&b.m) { L.push('内訳：'+b.m+(b.un||'')+' × '+yen(b.tan)); sp+='単価'+b.tan+'円、数量'+b.m+(b.un==='㎡'?'平米':(b.un||''))+'です。'; }
      var c2=cost(b); if(c2.sum) L.push((c2.real&&kan?'利益：':'利益見込：')+yen(b.amt-c2.sum)+'（'+((b.amt-c2.sum)/b.amt*100).toFixed(1)+'%）'); }
    else { head='請負金額は未登録'; ok=false; sp=nm+'の請負金額は登録されていません。'; }
    stLine(); motoLine();
    break;
  case 'kouhou':
    if(b.ko){ head=b.ko; sp=nm+'の工法は、'+b.ko.replace(/\([^)]*\)/,'')+'です。'; if(b.mk) { L.push('メーカー：'+b.mk+(b.sz?('　'+b.sz):'')); sp+='メーカーは'+b.mk+(b.sz?('、材料は'+b.sz):'')+'です。'; } if(b.m) L.push('数量：'+b.m+(b.un||'')); }
    else { head='工法は未登録'; ok=false; sp=nm+'の工法は登録されていません。'; }
    break;
  case 'maker':
    if(b.mk){ head=b.mk; sub=nm+(b.sz?('　'+b.sz):''); sp=nm+'のメーカーは'+b.mk+(b.sz?('、材料は'+b.sz):'')+'です。'; if(b.ko) L.push('工法：'+b.ko); }
    else { head='メーカーは未登録'; ok=false; sp=nm+'のメーカーは登録されていません。'; }
    break;
  case 'suryo':
    if(b.m){ head=b.m+(b.un||''); sp=nm+'の数量は、'+b.m+(b.un==='㎡'?'平米':(b.un||''))+'です。'; if(b.ko) L.push('工法：'+b.ko); if(b.tan) L.push('単価：'+yen(b.tan)+'　請負金額：'+yen(b.amt)); }
    else { head='数量は未登録'; ok=false; sp=nm+'の数量は登録されていません。'; }
    break;
  case 'addr':
    if(b.addr){ head=b.addr; sp=nm+'は、'+b.addr+'です。'; } else { head='住所は未登録'; ok=false; sp=nm+'の住所は登録されていません。'; }
    motoLine(); stLine();
    break;
  case 'moto':
    if(b.moto){ head=b.moto; sp=nm+'の元請は、'+b.moto+'です。'; if(b.sh) L.push('支払条件：'+b.sh); } else { head='元請は未登録'; ok=false; sp=nm+'の元請は登録されていません。'; }
    break;
  case 'status':
    head=st+(kou&&b.p!==''?('　進捗 '+b.p+'%'):''); sp=nm+'は、いま'+st+(kou&&b.p!==''?('、進捗'+b.p+'パーセント'):'')+'です。';
    if(isDate(b.cb)) L.push((daysFrom(b.cb)<0?'着工：':'着工予定：')+jdate(b.cb));
    if(kan&&isDate(b.fb)) L.push('完成：'+jdate(b.fb)); else if(b.fy) L.push((isDate(b.fy)?'完成予定：':'予定：')+(isDate(b.fy)?jdate(b.fy):b.fy));
    if(isDate(b.nb)) L.push('入金予定：'+jdate(b.nb)); motoLine();
    if(!kan&&!kou&&b.fy&&!isDate(b.fy)) sp+='予定は、'+b.fy+'です。';
    if(b.tb) { L.push('備考：'+b.tb); sp+='備考、'+b.tb+'。'; }
    break;
  case 'biko':
    if(b.tb){ head=b.tb; sp=nm+'の備考は、'+b.tb+'です。'; } else { head='備考はありません'; sp=nm+'に備考はありません。'; }
    break;
  case 'defect':
    var tg=(defs()[b.code]||[]).map(function(k){ return DEFL[k]||k; });
    if(tg.length){ head=tg.join('・'); sp=nm+'の不具合・現場条件は、'+tg.join('、')+'です。'; }
    else { head='不具合タグはありません'; sp=nm+'に不具合タグは付いていません。'; }
    break;
  case 'zumen':
    var sv=saves().filter(function(s){ return s.code===b.code || (s.bukken&&norm(s.bukken)===norm(nm)); });
    if(sv.length){ head='図面 '+sv.length+'件'; sp=nm+'の図面は'+sv.length+'件保存されています。';
      sv.slice(0,5).forEach(function(s){ var ar=areaOfSave(s); L.push((s.name||'（無題）')+'　'+(s.date?String(s.date).slice(0,10):'')+(ar!=null?('　平場 '+ar.toFixed(1)+'㎡'):'')); });
      var a0=areaOfSave(sv[0]); if(a0!=null) sp+='最新の図面の平場は'+a0.toFixed(1)+'平米です。'; }
    else { head='図面はまだありません'; ok=false; sp=nm+'の図面は、まだ保存されていません。'; L.push('図面・積算でかいて「💾 保存」すると、ここから引けます'); }
    break;
  default: /* summary */
    head=nm; sub=st+(b.moto?('　'+b.moto):'');
    if(b.ko) L.push('工法：'+b.ko+(b.mk?('　'+b.mk):''));
    if(b.amt) L.push('請負金額：'+yen(b.amt)+(b.m?('（'+b.m+(b.un||'')+(b.tan?('×'+yen(b.tan)):'')+'）'):''));
    var dts=[]; if(isDate(b.kb)) dts.push('契約 '+jdate(b.kb)); if(isDate(b.cb)) dts.push('着工 '+jdate(b.cb));
    if(kan&&isDate(b.fb)) dts.push('完成 '+jdate(b.fb)); else if(b.fy) dts.push('完成予定 '+(isDate(b.fy)?jdate(b.fy):b.fy));
    if(dts.length) L.push(dts.join('　→　'));
    if(isDate(b.nb)) L.push('入金予定：'+jdate(b.nb)+(b.sh?('（'+b.sh+'）'):''));
    if(b.addr) L.push('住所：'+b.addr);
    if(b.tb) L.push('備考：'+b.tb);
    sp=nm+'は、'+st+(b.moto?('、元請は'+b.moto):'')+(b.ko?('、工法は'+b.ko.replace(/\([^)]*\)/,'')):'')+(b.amt?('、請負金額は'+manS(b.amt)):'')+'です。'
      +(kou&&isDate(b.fy||b.fb)?('完成予定は'+sdate(b.fy||b.fb)+'です。'):'')
      +(isDate(b.nb)&&(kou||kan||b.stk==='keiyaku')?('入金予定は'+sdate(b.nb)+'です。'):'');
  }
  return {ok:ok, head:head, sub:sub, lines:L, speak:sp, bk:b.code};
}
/* 保存図面の平場面積（保存の中身から自分で計算＝図面ページの関数は使わない） */
function areaOfSave(s){
  try{ var st=JSON.parse(s.data||'null'); if(!okObj(st)||!Array.isArray(st.polys)) return null;
    var sc=+st.scaleM||0.5, tot=0;
    st.polys.forEach(function(p){ if(!p||!Array.isArray(p.pts)||p.pts.length<3) return; var a=0, n=p.pts.length;
      for(var i=0;i<n;i++){ var u=p.pts[i], v=p.pts[(i+1)%n]; a+=(u.x*v.y-v.x*u.y); } tot+=Math.abs(a)/2*sc*sc; });
    return tot; }catch(_){ return null; }
}

/* ---------- 元請の答え（物件名に当たらないとき） ---------- */
function motoAnswer(mn, fi, B){
  var arr=B.filter(function(b){ return b.moto===mn; }), L=[], head='', sp='';
  var tk=tokui().moto.filter(function(m){ return norm(m.name)===norm(mn); })[0];
  if(fi==='nyukin'||fi==='shime'){
    var up=arr.filter(function(b){ return isDate(b.nb) && daysFrom(b.nb)>=0 && b.stk!=='mit'&&b.stk!=='chosa'&&b.stk!=='hikiai'; })
             .sort(function(a,b){ return a.nb<b.nb?-1:1; });
    if(up.length){ var f=up[0]; head='次の入金 '+jdate(f.nb)+'（'+rel(f.nb)+'）'; L.push(f.name+'　'+yen(f.amt||0));
      sp=mn+'の次の入金予定は、'+sdate(f.nb)+'、'+f.name+'の'+manS(f.amt||0)+'です。';
      up.slice(1,4).forEach(function(b){ L.push('つづいて '+jdate(b.nb)+'　'+b.name+'　'+yen(b.amt||0)); });
      if(up.length>1) sp+='そのあと'+(up.length-1)+'件の入金予定があります。'; }
    else { var last=arr.filter(function(b){ return isDate(b.nb); }).sort(function(a,b){ return a.nb<b.nb?1:-1; })[0];
      head='これからの入金予定はありません'; sp=mn+'で、これからの入金予定は登録されていません。';
      if(last) { L.push('直近：'+jdate(last.nb)+'　'+last.name); sp+='直近は'+sdate(last.nb)+'、'+last.name+'でした。'; } }
    var sh=(tk&&(tk.nyukin||tk.joken))||uniq(arr.map(function(b){return b.sh||'';}).filter(Boolean))[0];
    if(sh){ L.push('支払条件：'+sh); sp+='支払条件は'+sh+'です。'; }
    return {ok:!!up.length, head:head, sub:mn, lines:L, speak:sp};
  }
  if(fi==='shiharai'){
    var sh2=(tk&&(tk.nyukin||tk.joken))||uniq(arr.map(function(b){return b.sh||'';}).filter(Boolean)).join('／');
    if(sh2){ return {ok:true, head:sh2, sub:mn, lines:tk&&tk.site?['支払サイト：'+tk.site]:[], speak:mn+'の支払条件は、'+sh2+'です。'}; }
    return miss(mn+'の支払条件は登録がありません', [], mn+'の支払条件は登録されていません。');
  }
  /* 一覧（概要） */
  var cnt={}; arr.forEach(function(b){ cnt[b.st]=(cnt[b.st]||0)+1; });
  var tot=0; arr.forEach(function(b){ if(b.stk==='kou'||b.stk==='kan'||b.stk==='keiyaku') tot+=(+b.amt||0); });
  head=mn+'　'+arr.length+'件'; 
  L.push(Object.keys(cnt).map(function(k){ return k+' '+cnt[k]+'件'; }).join('／'));
  L.push('受注済（契約済＋施工中＋完成済）の合計：'+yen(tot));
  arr.filter(function(b){return b.stk==='kou'||b.stk==='keiyaku';}).slice(0,5).forEach(function(b){ L.push(b.st+'　'+b.name+(isDate(b.fy||b.fb)?('　完成予定 '+jdate(b.fy||b.fb)):'')); });
  var act=arr.filter(function(b){return b.stk==='kou';}).length;
  sp=mn+'の現場は全部で'+arr.length+'件、'+(act?('施工中が'+act+'件、'):'')+'受注済の合計は'+manS(tot)+'です。';
  return {ok:true, head:head, lines:L, speak:sp};
}

/* ---------- 一覧・集計 ---------- */
function listAnswer(q, B, o){
  var arr=B.slice(), desc=[], sp='', L=[], head='';
  if(o.moto){ arr=arr.filter(function(b){ return b.moto===o.moto; }); desc.push(o.moto); }
  if(o.area){ arr=arr.filter(function(b){ return String(b.addr||'').indexOf(o.area)>=0; }); desc.push(o.area); }
  if(o.stK){ arr=arr.filter(function(b){ return b.stk===o.stK; }); desc.push(stName(o.stK)); }
  var t=now(), y=t.getFullYear(), m=t.getMonth();
  var monthF=null;
  if(/今月/.test(q)) monthF=[y,m]; else if(/来月/.test(q)) monthF=[m===11?y+1:y,(m+1)%12]; else if(/先月/.test(q)) monthF=[m===0?y-1:y,(m+11)%12];
  var fi=o.fi;
  if(fi==='nyukin'){
    arr=arr.filter(function(b){ return isDate(b.nb) && (b.stk==='kou'||b.stk==='kan'||b.stk==='keiyaku'); });
    if(monthF) arr=arr.filter(function(b){ var d=dparse(b.nb); return d.getFullYear()===monthF[0]&&d.getMonth()===monthF[1]; });
    else arr=arr.filter(function(b){ return daysFrom(b.nb)>=0; });
    arr.sort(function(a,b){ return a.nb<b.nb?-1:1; });
    var sum=0; arr.forEach(function(b){ sum+=(+b.amt||0); });
    head=(monthF?((monthF[1]+1)+'月の入金予定 '):'これからの入金予定 ')+arr.length+'件　'+yen(sum);
    arr.slice(0,8).forEach(function(b){ L.push(jdate(b.nb)+'　'+b.name+'　'+yen(b.amt||0)+(b.moto?('　'+b.moto):'')); });
    sp=(desc.length?desc.join('、')+'で、':'')+(monthF?((monthF[1]+1)+'月の入金予定は'):'これからの入金予定は')+arr.length+'件、合計'+manS(sum)+'です。'
      +(arr[0]?('いちばん近いのは'+sdate(arr[0].nb)+'、'+arr[0].name+'です。'):'');
    return {ok:arr.length>0, head:head, sub:desc.join('・'), lines:L.length?L:['該当する入金予定はありません'], speak:sp};
  }
  if(fi==='chakko'||fi==='kansei'){
    var key=(fi==='chakko')?'cb':'fy', lab=(fi==='chakko')?'着工':'完成';
    arr=arr.filter(function(b){ var v=b[key]||(fi==='kansei'?b.fb:''); return isDate(v)&&(b.stk!=='kan'||fi==='kansei'); });
    if(monthF) arr=arr.filter(function(b){ var d=dparse(b[key]||b.fb); return d.getFullYear()===monthF[0]&&d.getMonth()===monthF[1]; });
    else arr=arr.filter(function(b){ return daysFrom(b[key]||b.fb)>=0; });
    arr.sort(function(a,b){ return (a[key]||a.fb)<(b[key]||b.fb)?-1:1; });
    head=(monthF?((monthF[1]+1)+'月'):'これから')+lab+'の現場 '+arr.length+'件';
    arr.slice(0,8).forEach(function(b){ L.push(jdate(b[key]||b.fb)+'　'+b.name+(b.moto?('　'+b.moto):'')); });
    sp=(desc.length?desc.join('、')+'で、':'')+(monthF?((monthF[1]+1)+'月に'):'これから')+lab+'の現場は'+arr.length+'件です。'+(arr[0]?('いちばん近いのは'+sdate(arr[0][key]||arr[0].fb)+'、'+arr[0].name+'です。'):'');
    return {ok:arr.length>0, head:head, sub:desc.join('・'), lines:L.length?L:['該当する現場はありません'], speak:sp};
  }
  if(!desc.length && !/現場|物件/.test(q)) return null;      /* 絞り込みが無い「一覧」は答えない */
  if(!desc.length) return null;
  if(!arr.length) return {ok:false, head:desc.join('・')+'の現場はありません', lines:[], speak:desc.join('、')+'の現場は登録にありません。'};
  var cnt={}; arr.forEach(function(b){ cnt[b.st]=(cnt[b.st]||0)+1; });
  var tot=0; arr.forEach(function(b){ if(b.stk==='kou'||b.stk==='kan'||b.stk==='keiyaku') tot+=(+b.amt||0); });
  head=desc.join('・')+'の現場 '+arr.length+'件';
  if(!o.stK) L.push(Object.keys(cnt).map(function(k){ return k+' '+cnt[k]+'件'; }).join('／'));
  var ord={kou:0,keiyaku:1,mit:2,chosa:3,hikiai:4,kan:5};
  arr.sort(function(a,b){ return (ord[a.stk]||9)-(ord[b.stk]||9); });
  arr.slice(0,10).forEach(function(b){ L.push(b.st+'　'+b.name+(b.stk==='kou'&&b.p!==''?('　進捗'+b.p+'%'):'')+(isDate(b.cb)&&b.stk==='keiyaku'?('　着工 '+jdate(b.cb)):'')); });
  if(arr.length>10) L.push('ほか '+(arr.length-10)+'件');
  sp=desc.join('、')+'の現場は'+arr.length+'件です。'+(o.stK?'':(cnt['施工中']?('施工中が'+cnt['施工中']+'件、'):''))
    +arr.slice(0,3).map(function(b){ return b.name; }).join('、')+(arr.length>3?'、ほか'+(arr.length-3)+'件です。':'です。');
  return {ok:true, head:head, lines:L, speak:sp};
}

/* ---------- 連絡先 ---------- */
function contactAnswer(q, qN, bk, motoN){
  var T=tokui(), all=T.moto.concat(T.shi);
  var pc=pick(qN, all, function(o){ return (o.name||'')+' '+(o.tanto||''); }, 2);
  var c=pc.best;
  if(!c && bk && bk.moto) c=all.filter(function(o){ return norm(o.name)===norm(bk.moto); })[0]||null;
  if(!c && motoN) c=all.filter(function(o){ return norm(o.name)===norm(motoN); })[0]||null;
  if(!c){
    var nm=motoN||(bk&&bk.moto)||'';
    /* 客先登録に無くても、物件一覧が知っていること（支払条件・件数）は答える。電話は推測しない */
    var arr=nm?buks().filter(function(b){ return b.moto===nm; }):[];
    var sh=uniq(arr.map(function(b){ return b.sh||''; }).filter(Boolean)).join('／');
    var L0=['電話・担当者は未登録です（ホーム →「客先登録」に登録すると、ここから引けます）'];
    if(sh) L0.unshift('支払条件：'+sh);
    if(arr.length) L0.push('現場：'+arr.length+'件（'+arr.slice(0,3).map(function(b){return b.name;}).join('／')+(arr.length>3?'…':'')+'）');
    return {ok:false, head:nm?(nm+'　電話・担当は未登録'):'その相手は客先登録にありません', sub:nm||'', lines:L0,
      speak:(nm?nm+'の':'その相手の')+'電話番号と担当者は、まだ登録されていません。'+(sh?('支払条件は'+sh+'です。'):'')};
  }
  var L=[];
  if(c.tel&&c.tel!=='—')   L.push('電話：'+c.tel);
  if(c.tanto) L.push('担当：'+c.tanto);
  if(c.mail&&c.mail!=='—')  L.push('メール：'+c.mail);
  if(c.nyukin) L.push('入金：'+c.nyukin+(c.site?('（サイト '+c.site+'）'):''));
  if(c.shiharai||c.joken) L.push('支払条件：'+(c.shiharai||c.joken));
  if(c.memo) L.push('メモ：'+c.memo);
  return {ok:true, head:(c.name||''), sub:c.tanto||'', lines:L.length?L:['登録は名前だけです'],
          speak:(c.name||'')+'です。'+(c.tanto?('担当は'+c.tanto+'。'):'')+((c.tel&&c.tel!=='—')?('電話は、'+String(c.tel).replace(/-/g,'、')+'です。'):'電話の登録はありません。')
                +(c.nyukin?('入金は'+c.nyukin+'です。'):'')};
}

/* ---------- 材料の単価・数量・発注日（もとの得意技） ---------- */
function matAnswer(q, qN, bk, H, M){
  var it=matIntent(q);
  var lineNames={};
  H.forEach(function(h){ (Array.isArray(h.lines)?h.lines:[]).forEach(function(l){ if(okObj(l)&&l.n) lineNames[l.n]=1; }); });
  var matPool = Object.keys(lineNames).map(function(n){ return {n:n, _fromHist:1}; })
    .concat(M.map(function(m){ return {n:m.n, s:m.s, c2:m.c2, maker:m.maker, price:m.price, hist:m.hist, ou:m.ou, _m:m}; }));
  var pm=pick(qN, matPool, function(o){ return (o.n||'')+' '+(o.s||'')+' '+(o.c2||'')+' '+(o.maker||''); }, 3);
  var wantsMat=MATW.test(q) || /いくら|単価|価格|値段/.test(q);

  if(!pm.best){
    if(bk && /発注|一覧|なに|何を|買|仕入/.test(q)) return propSummary(bk, H);
    if(!wantsMat) return null;
    if(bk && !MATW.test(q)) return null;  /* 「〇〇いくら？」だけなら請負金額へ */
    var names=matPool.map(function(o){ return o.n; }).filter(function(x,i,a){ return x&&a.indexOf(x)===i; }).slice(0,6);
    return {ok:false, head:'その材料は見つかりませんでした',
      lines:['下から選ぶと、その言い方を覚えます（次からは通ります）','例：「サン太平のプライマー、いくらで入ってた？」'],
      teach:{word:aliasWord(q, bk&&bk.name), names:names}, speak:'その材料は見つかりませんでした'};
  }
  var matName=pm.best.n;
  var found=null, others=[];
  H.forEach(function(h){
    (Array.isArray(h.lines)?h.lines:[]).forEach(function(l){
      if(!okObj(l)||!l.n) return; if(norm(l.n)!==norm(matName)) return;
      var rec={h:h, l:l};
      if(bk && String(h.gid)===String(bk.code)) { if(!found||h.date>found.h.date) found=rec; } else others.push(rec);
    });
  });
  var reg = pm.best._m || M.filter(function(m){ return norm(m.n)===norm(matName); })[0] || null;
  var regPrice = reg && reg.price>0 ? Math.round(reg.price) : null;
  var otherPrices = others.map(function(r){ return Math.round(r.l.p); }).filter(function(p){ return p>0; });

  if(bk && !found){
    var L1=['この現場（'+bk.name+'）の発注履歴に「'+matName+'」がありません'];
    if(otherPrices.length) L1.push('他の現場では '+uniq(otherPrices).map(yen).join('／')+' で入っています');
    if(regPrice) L1.push('材料登録の単価：'+yen(regPrice));
    return {ok:false, head:'この現場の登録がありません', lines:L1, speak:bk.name+'では、'+matName+'の発注履歴がありません'};
  }
  if(!bk && !found){
    if(!otherPrices.length && !regPrice)
      return miss('「'+matName+'」の単価が登録されていません', ['材料登録で単価を入れるか、発注すると記録されます']);
    var L2=['※現場が特定できませんでした。下は通常の単価です'];
    if(regPrice) L2.push('材料登録の単価：'+yen(regPrice)+(reg&&reg.ou?('／'+reg.ou):''));
    if(otherPrices.length) L2.push('直近の発注実績：'+uniq(otherPrices).map(yen).join('／'));
    if(reg && Array.isArray(reg.hist) && reg.hist.length){
      var p0=reg.hist[reg.hist.length-1];
      if(okObj(p0)&&p0.p>0) L2.push('価格改定：'+jdate(p0.d)+' に '+yen(p0.p)+' → 現在 '+yen(regPrice||p0.p));
    }
    L2.push('※現場名も一緒に言うと、その現場の単価が出ます');
    return {ok:true, head:'通常単価 '+yen(regPrice||otherPrices[0]), sub:matName, lines:L2,
            speak:'現場が特定できませんでした。'+matName+'の通常単価は、'+(regPrice||otherPrices[0])+'円です'};
  }
  var p=Math.round(found.l.p), base=regPrice, L=[], sp;
  if(base==null && otherPrices.length){ base=uniq(otherPrices).sort(function(a,b){return b-a;})[0]; }
  L.push('現場：'+bk.name+'（'+bk.code+'）');
  L.push('発注：'+jdate(found.h.date)+(vendorName(found.h.vid)?('　'+vendorName(found.h.vid)):'')+(found.h.no?('　'+found.h.no):''));
  if(found.l.q>0) L.push('数量：'+found.l.q+(found.l.u||'')+'　金額：'+yen(p*found.l.q));
  sp=bk.name+'の'+matName+'は、'+p+'円です。';
  if(base!=null && base!==p){
    var d=p-base;
    L.push(d<0 ? ('通常より '+yen(-d)+' 安く入っています（通常 '+yen(base)+'）') : ('通常より '+yen(d)+' 高く入っています（通常 '+yen(base)+'）'));
    sp += '通常より'+Math.abs(d)+'円'+(d<0?'安く':'高く')+'入っています。通常単価は'+base+'円です。';
  }else if(base!=null){ L.push('通常単価と同じです（'+yen(base)+'）'); sp += '通常単価と同じです。'; }
  else{ L.push('※通常単価は材料登録に入っていません（入れると差が出ます）'); }
  if(it==='qty' && found.l.q>0) return {ok:true, head:found.l.q+(found.l.u||''), lines:L, speak:bk.name+'の'+matName+'は、'+found.l.q+(found.l.u||'')+'です'};
  if(it==='date') return {ok:true, head:jdate(found.h.date), lines:L, speak:bk.name+'の'+matName+'は、'+sdate(found.h.date)+'に発注しています'};
  return {ok:true, head:yen(p), sub:matName, lines:L, speak:sp};
}
function propSummary(bk, H){
  var rows=[], tot=0;
  H.forEach(function(h){ if(String(h.gid)!==String(bk.code)) return;
    (Array.isArray(h.lines)?h.lines:[]).forEach(function(l){ if(okObj(l)&&l.n){ rows.push(l.n+'　'+yen(l.p)+(l.q>0?('　×'+l.q+(l.u||'')):'')); tot+=(+l.p||0)*(+l.q||0); } }); });
  if(!rows.length) return {ok:false, head:bk.name, lines:['この現場の発注履歴はまだありません'], speak:bk.name+'の発注履歴はまだありません'};
  return {ok:true, head:bk.name+'　発注 '+rows.length+'件', sub:tot?('合計 '+yen(tot)):'', lines:['発注した材料：'].concat(rows),
    speak:bk.name+'の発注は'+rows.length+'件'+(tot?('、合計'+manS(tot)):'')+'です'};
}

/* ============================================================
   読み上げ（声）
   ★2026-09-04j 「機械音声で聞いてて不快。最新AIと同じレベルで流暢に」
   ①端末の声の中からいちばん自然なものを自動で選ぶ（Siri／拡張／Natural／Google を優先）。設定で選び直せる
   ②文を句点で切って1文ずつ渡す＝間（ま）が入って聞きやすい。文字は声と同時に流れる
   ③「高品質音声」＝クラウドTTS（OpenAI の gpt-4o-mini-tts）。利用者が自分のAPIキーを入れたときだけ使う。
     通信できない・失敗したときは①に戻る。★答えを作る側にAIは使っていない（数字は検索のまま）
   ============================================================ */
var SPK_KEY='nn_ask_spk_v1', VKEY='nn_ask_voice_v1', RKEY='nn_ask_rate_v1', TKEY='nn_ask_tts_v1';
var speakOn=(ls(SPK_KEY)!=='0');
var voices=[], jaVoice=null;
function rankVoice(v){
  var n=((v.name||'')+' '+(v.voiceURI||'')).toLowerCase(), s=0;
  if(/siri/.test(n)) s+=60;
  if(/premium|拡張|enhanced|プレミアム/.test(n)) s+=50;
  if(/natural|neural|multilingual/.test(n)) s+=45;
  if(/google/.test(n)) s+=30;
  if(/nanami|keita|ayumi|ichiro|haruka/.test(n)) s+=20;
  if(/o-?ren|otoya|hattori|kyoko|eddy|flo|reed|sandy|shelley|grandma|grandpa/.test(n)) s+=12;
  if(/compact|コンパクト/.test(n)) s-=30;
  if(v.default) s+=2;
  return s;
}
function pickVoice(){
  try{
    voices=(speechSynthesis.getVoices()||[]).filter(function(v){ return /^ja/i.test(v.lang||''); });
    var want=ls(VKEY);
    jaVoice=null;
    if(want) jaVoice=voices.filter(function(v){ return v.voiceURI===want||v.name===want; })[0]||null;
    if(!jaVoice) jaVoice=voices.slice().sort(function(a,b){ return rankVoice(b)-rankVoice(a); })[0]||null;
  }catch(_){}
}
try{ if('speechSynthesis' in window){ pickVoice(); speechSynthesis.onvoiceschanged=function(){ pickVoice(); try{ renderVoiceSel(); }catch(_){} }; } }catch(_){}
function rate(){ var r=parseFloat(ls(RKEY)); return (r>=0.6&&r<=1.6)?r:1.0; }
function ttsCfg(){ try{ var v=JSON.parse(ls(TKEY)||'null'); return okObj(v)?v:{}; }catch(_){ return {}; } }
function useCloud(){ var c=ttsCfg(); return !!(c.key && /^sk-/.test(String(c.key))); }

/* 文を1文ずつに切る（長い文は「、」でも切る） */
function chunks(t){
  /* ★lookbehind の正規表現は古いiPhoneで読み込み自体が止まるので使わない（手で切る） */
  var parts=[], buf='', src=String(t||'').replace(/\s+/g,' ');
  for(var i=0;i<src.length;i++){ buf+=src[i]; if(/[。！？!?]/.test(src[i])){ parts.push(buf.trim()); buf=''; } }
  if(buf.trim()) parts.push(buf.trim());
  parts=parts.filter(Boolean);
  var out=[]; parts.forEach(function(p){
    if(p.length<=46){ out.push(p); return; }
    var i=p.indexOf('、', Math.floor(p.length*0.4));
    if(i>0 && i<p.length-4){ out.push(p.slice(0,i+1)); out.push(p.slice(i+1)); } else out.push(p);
  });
  return out;
}
var curSpeak=null;                 /* いま話している答え（{stop, ...}） */
function stopSpeak(){
  try{ if(curSpeak&&curSpeak.stop) curSpeak.stop(); }catch(_){}
  curSpeak=null;
  try{ speechSynthesis.cancel(); }catch(_){}
  try{ if(audioEl){ audioEl.pause(); } }catch(_){}
}
/* 端末の声で話す。onProgress(文字数) で文字が追いつく。onEnd() で終わり */
function speakLocal(text, onProgress, onEnd){
  var cs=chunks(text), idx=0, off=0, done=false, timer=0, gotBoundary=false, stopped=false;
  function finish(){ if(done) return; done=true; if(timer){ clearInterval(timer); timer=0; } try{ onProgress&&onProgress(text.length); }catch(_){} try{ onEnd&&onEnd(); }catch(_){} }
  function next(){
    if(stopped) return;
    if(idx>=cs.length){ finish(); return; }
    var t=cs[idx], u=new SpeechSynthesisUtterance(t), start=off, t0=Date.now(), r=rate();
    u.lang='ja-JP'; u.rate=r; u.pitch=1.0;
    if(!jaVoice) pickVoice(); if(jaVoice) u.voice=jaVoice;
    gotBoundary=false;
    u.onboundary=function(e){ gotBoundary=true; try{ onProgress&&onProgress(start+(e.charIndex||0)); }catch(_){} };
    u.onend=function(){ off=start+t.length; idx++; try{ onProgress&&onProgress(off); }catch(_){} if(timer){ clearInterval(timer); timer=0; } setTimeout(next, 90); };
    u.onerror=function(){ off=start+t.length; idx++; if(timer){ clearInterval(timer); timer=0; } setTimeout(next, 30); };
    /* 境目の合図（onboundary）が来ない端末＝時間で文字を進める（1秒に約7文字×速さ） */
    if(timer) clearInterval(timer);
    timer=setInterval(function(){ if(gotBoundary) return; var n=Math.floor((Date.now()-t0)/1000*7*r); try{ onProgress&&onProgress(Math.min(start+n, start+t.length)); }catch(_){} }, 80);
    try{ speechSynthesis.speak(u); }catch(_){ u.onerror(); }
  }
  try{ speechSynthesis.cancel(); speechSynthesis.resume(); }catch(_){}
  next();
  return {stop:function(){ stopped=true; if(timer){ clearInterval(timer); timer=0; } done=true; }};
}
/* ★クラウドTTS（利用者のAPIキー）。iPhoneでは「操作の中」で一度 Audio を鳴らしておかないと後から鳴らせない（unlock） */
var audioEl=null, audioUnlocked=false;
function unlockAudio(){
  try{
    if(!audioEl){ audioEl=new Audio(); audioEl.preload='auto'; }
    if(audioUnlocked) return;
    audioEl.src='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
    var pr=audioEl.play(); if(pr&&pr.then) pr.then(function(){ audioUnlocked=true; },function(){});
  }catch(_){}
}
function speakCloud(text, onProgress, onEnd, onFail){
  var c=ttsCfg(), stopped=false, url=null, tm=0;
  function fail(){ if(stopped) return; stopped=true; if(tm){ clearInterval(tm); } try{ onFail&&onFail(); }catch(_){} }
  try{
    fetch('https://api.openai.com/v1/audio/speech',{method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.key},
      body:JSON.stringify({model:c.model||'gpt-4o-mini-tts', voice:c.voice||'nova', input:String(text), response_format:'mp3', speed:rate(),
        instructions:'日本の建設会社のアシスタント。落ち着いた自然な日本語で、数字と固有名詞をはっきり。早口にしない。'})})
    .then(function(r){ if(!r.ok) throw new Error('tts '+r.status); return r.blob(); })
    .then(function(b){
      if(stopped) return;
      url=URL.createObjectURL(b);
      if(!audioEl) audioEl=new Audio();
      audioEl.src=url; audioEl.playbackRate=1.0;
      audioEl.onended=function(){ if(stopped) return; stopped=true; if(tm) clearInterval(tm); try{ onProgress&&onProgress(text.length); }catch(_){} try{ onEnd&&onEnd(); }catch(_){} try{ URL.revokeObjectURL(url); }catch(_){} };
      audioEl.onerror=fail;
      tm=setInterval(function(){ try{ if(audioEl.duration>0) onProgress&&onProgress(Math.floor(text.length*audioEl.currentTime/audioEl.duration)); }catch(_){} }, 60);
      var pr=audioEl.play(); if(pr&&pr.then) pr.then(null, fail);
    }).catch(fail);
  }catch(_){ fail(); }
  return {stop:function(){ stopped=true; if(tm) clearInterval(tm); try{ audioEl&&audioEl.pause(); }catch(_){} }};
}
function speak(text, onProgress, onEnd){
  stopSpeak();
  if(!text) { try{ onEnd&&onEnd(); }catch(_){} return; }
  if(!('speechSynthesis' in window) && !useCloud()){ try{ onProgress&&onProgress(text.length); onEnd&&onEnd(); }catch(_){} return; }
  if(useCloud()){
    curSpeak=speakCloud(text, onProgress, onEnd, function(){ curSpeak=speakLocal(text, onProgress, onEnd); });
  }else curSpeak=speakLocal(text, onProgress, onEnd);
}
try{
  window.addEventListener('pagehide', stopSpeak);
  document.addEventListener('visibilitychange', function(){ if(document.hidden) stopSpeak(); });
}catch(_){}

/* ============================================================
   画面（音声が主役・ソシャゲの作法＝押す所がはっきり・状態が色で分かる）
   ============================================================ */
var CSS = ''
+'#nnAsk{position:fixed; inset:0; z-index:100000; background:rgba(12,20,14,.58); display:none; align-items:flex-start; justify-content:center;}'
+'#nnAsk.on{display:flex;}'
+'#nnAskBox{background:#f2f3ec; width:100%; max-width:600px; height:100%; display:flex; flex-direction:column;'
+'  font-family:"Zen Kaku Gothic New","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif; color:#22301f;'
+'  padding-top:env(safe-area-inset-top,0px); padding-bottom:env(safe-area-inset-bottom,0px); box-shadow:0 0 40px rgba(0,0,0,.35);}'
+'#nnAskHd{display:flex; align-items:center; gap:8px; padding:8px 10px 8px 14px; background:linear-gradient(180deg,#22804a,#1c6b3c); color:#fff; flex:none; border-bottom:2px solid #124a28;}'
+'#nnAskHd .ttl{display:flex; flex-direction:column; line-height:1.15;}'
+'#nnAskHd b{font-size:17px; font-weight:900; letter-spacing:.06em;}'
+'#nnAskHd small{font-size:10.5px; opacity:.85; font-weight:700;}'
+'#nnAskHd .sp{margin-left:auto; display:flex; align-items:center; gap:6px;}'
+'#nnAskHd button{font:inherit; font-size:12px; font-weight:800; padding:0 10px; border-radius:8px; min-height:36px; min-width:36px;'
+'  display:inline-flex; align-items:center; justify-content:center; gap:4px; border:1.5px solid rgba(255,255,255,.55); background:rgba(255,255,255,.08); color:#fff; cursor:pointer;}'
+'#nnAskHd button.on{background:linear-gradient(180deg,#ffe873 0%,#ffe873 46%,#ffd23e 47%,#ffd23e 100%); border-color:#a87f00; color:#153f25;}'
+'#nnAskHd .x{font-size:20px; padding:0; min-width:40px; min-height:40px; line-height:1;}'
/* 上の舞台：大きなマイク＋いまの状態 */
+'#nnAskStage{flex:none; display:flex; align-items:center; gap:14px; padding:12px 14px 10px; background:#e7efe6; border-bottom:1px solid #cfd8cb;}'
+'#nnAskMic{position:relative; flex:none; width:72px; height:72px; border-radius:50%; border:0; cursor:pointer; font-size:30px; color:#fff;'
+'  background:radial-gradient(circle at 35% 30%,#3fb56f,#1c6b3c 70%); box-shadow:0 4px 0 #124a28, 0 6px 14px rgba(0,0,0,.25); -webkit-tap-highlight-color:transparent;}'
+'#nnAskMic:active{transform:translateY(2px); box-shadow:0 2px 0 #124a28, 0 4px 10px rgba(0,0,0,.25);}'
+'#nnAskMic.rec{background:radial-gradient(circle at 35% 30%,#ff6b5b,#c0392b 70%); box-shadow:0 4px 0 #7a1f15, 0 6px 14px rgba(192,57,43,.35);}'
+'#nnAskMic.arm{background:radial-gradient(circle at 35% 30%,#ffe873,#f0b400 70%); color:#153f25; box-shadow:0 4px 0 #a87f00, 0 6px 14px rgba(240,180,0,.35);}'
+'#nnAskMic.rec::after,#nnAskMic.arm::after{content:""; position:absolute; inset:-6px; border-radius:50%; border:3px solid currentColor; opacity:.55; animation:nnAskPulse 1.2s ease-out infinite;}'
+'#nnAskMic.rec::after{border-color:#ff8a7a;} #nnAskMic.arm::after{border-color:#f0b400;}'
+'@keyframes nnAskPulse{0%{transform:scale(.92); opacity:.7} 100%{transform:scale(1.25); opacity:0}}'
+'#nnAskLive{flex:1; min-width:0;}'
+'#nnAskLive .st{font-size:15px; font-weight:900; color:#1c6b3c; line-height:1.3;}'
+'#nnAskLive .tx{font-size:13px; color:#3d4f3f; margin-top:3px; line-height:1.5; min-height:1.5em; word-break:break-all;}'
+'#nnAskLive .tx.live{color:#a3281a; font-weight:800;}'
+'#nnAskLive .hint{font-size:11px; color:#6a786c; margin-top:2px;}'
/* 答えのカード */
+'#nnAskBody{flex:1; overflow-y:auto; padding:12px 12px 8px; -webkit-overflow-scrolling:touch;}'
+'.nnAns{background:#fff; border:1.5px solid #cfd8cb; border-radius:10px; padding:12px 14px 12px; margin-bottom:10px; box-shadow:0 2px 0 #cfd8cb;}'
+'.nnAns.ng{border-color:#e0b4ad;} .nnAns.tip{background:#fbf7e3; border-color:#e0c86a;}'
+'.nnAns .q{font-size:12.5px; color:#3d4f3f; margin-bottom:8px; display:flex; gap:6px; align-items:flex-start;}'
+'.nnAns .q::before{content:"あなた"; flex:none; font-size:10px; font-weight:900; color:#fff; background:#6a786c; border-radius:4px; padding:2px 6px; margin-top:1px;}'
+'.nnAns .who{display:flex; align-items:center; gap:6px; font-size:10.5px; font-weight:900; color:#1c6b3c; margin-bottom:4px;}'
+'.nnAns .who .bars{display:inline-flex; gap:2px; align-items:flex-end; height:12px; visibility:hidden;}'
+'.nnAns.speaking .who .bars{visibility:visible;}'
+'.nnAns .who .bars i{display:block; width:3px; height:4px; background:#1c6b3c; border-radius:1px; animation:nnAskBar .9s ease-in-out infinite;}'
+'.nnAns .who .bars i:nth-child(2){animation-delay:.15s} .nnAns .who .bars i:nth-child(3){animation-delay:.3s} .nnAns .who .bars i:nth-child(4){animation-delay:.45s}'
+'@keyframes nnAskBar{0%,100%{height:4px} 50%{height:12px}}'
+'.nnAns .say{font-size:15.5px; line-height:1.75; color:#17301f; font-weight:700; min-height:1.75em; white-space:pre-wrap;}'
+'.nnAns .say .cur{display:inline-block; width:2px; height:1em; background:#1c6b3c; vertical-align:-2px; margin-left:1px; animation:nnAskCur .8s steps(2) infinite;}'
+'@keyframes nnAskCur{0%{opacity:1} 100%{opacity:0}}'
+'.nnAns .dtl{margin-top:9px; padding-top:9px; border-top:1px dashed #cfd8cb; opacity:0; max-height:0; overflow:hidden; transition:opacity .35s, max-height .35s;}'
+'.nnAns.done .dtl{opacity:1; max-height:1200px;}'
+'.nnAns.tip .dtl,.nnAns.now .dtl{opacity:1; max-height:none;}'
+'.nnAns .hd{font-size:26px; font-weight:900; color:#17301f; line-height:1.25; letter-spacing:.01em; word-break:break-all;}'
+'.nnAns.ng .hd{font-size:17px; color:#a3281a;}'
+'.nnAns.tip .hd{font-size:15.5px; color:#2f4a36;}'
+'.nnAns .sub{font-size:13px; font-weight:800; color:#2f4a36; margin-top:2px;}'
+'.nnAns ul{margin:8px 0 0; padding-left:1.1em;}'
+'.nnAns li{font-size:13px; line-height:1.8; color:#33402f;}'
+'.nnCand{display:flex; flex-wrap:wrap; gap:6px; margin-top:9px;}'
+'.nnCand button{font:inherit; font-size:12px; font-weight:700; padding:6px 11px; border:1.5px solid #1c6b3c; background:#fff; color:#1c6b3c; border-radius:999px; cursor:pointer; min-height:32px;}'
+'.nnAns .more{display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;}'
+'.nnAns .more button{font:inherit; font-size:11.5px; font-weight:800; padding:5px 10px; border:1px solid #b9c2b6; background:#f2f3ec; color:#2f4a36; border-radius:999px; cursor:pointer;}'
/* 下：例と文字入力 */
+'#nnAskFoot{flex:none; border-top:1px solid #cfd6cb; background:#fff; padding:8px 10px 10px;}'
+'#nnAskCats{display:flex; gap:5px; overflow-x:auto; padding-bottom:6px; -webkit-overflow-scrolling:touch; scrollbar-width:none;}'
+'#nnAskCats::-webkit-scrollbar{display:none}'
+'#nnAskCats button{font:inherit; font-size:11.5px; font-weight:900; padding:5px 11px; border:1.5px solid #b9c2b6; background:#f2f3ec; color:#3d4f3f; border-radius:999px; white-space:nowrap; cursor:pointer; flex:none;}'
+'#nnAskCats button.on{background:#1c6b3c; border-color:#1c6b3c; color:#fff;}'
+'#nnAskEx{display:flex; flex-wrap:wrap; gap:6px; padding:0 0 8px;}'
+'#nnAskEx button{font:inherit; font-size:12px; font-weight:700; padding:6px 10px; border:1px solid #cfd8cb; background:#fff; color:#22301f; border-radius:8px; white-space:nowrap; cursor:pointer; flex:none; box-shadow:0 1px 0 #cfd8cb;}'
+'#nnAskRow{display:flex; gap:6px; align-items:center;}'
+'#nnAskIn{flex:1; min-width:0; font:inherit; font-size:16px; padding:10px 12px; border:1.5px solid #b9c2b6; border-radius:10px; background:#fff; color:#22301f;}'
+'#nnAskIn:focus{outline:2px solid #3fb56f; border-color:#1c6b3c;}'
+'#nnAskGo{height:44px; padding:0 16px; font:inherit; font-size:14px; font-weight:900; border:0; border-radius:10px; background:linear-gradient(180deg,#22804a,#1c6b3c); color:#fff; cursor:pointer; box-shadow:0 2px 0 #124a28; flex:none;}'
/* 設定 */
+'#nnAskSet{display:none; flex:none; background:#fff; border-bottom:1px solid #cfd6cb; padding:10px 14px; font-size:12.5px;}'
+'#nnAskSet.on{display:block;}'
+'#nnAskSet .row{display:flex; align-items:center; gap:8px; margin:6px 0; flex-wrap:wrap;}'
+'#nnAskSet .row>b{flex:none; width:92px; font-size:12px; color:#2f4a36;}'
+'#nnAskSet select,#nnAskSet input[type=text],#nnAskSet input[type=password]{font:inherit; font-size:13px; padding:6px 8px; border:1px solid #b9c2b6; border-radius:6px; background:#fff; color:#22301f; flex:1; min-width:0;}'
+'#nnAskSet input[type=range]{flex:1;}'
+'#nnAskSet small{display:block; color:#6a786c; font-size:11px; line-height:1.5; margin-top:2px;}'
+'#nnAskSet button{font:inherit; font-size:12px; font-weight:800; padding:6px 12px; border:1px solid #1c6b3c; background:#fff; color:#1c6b3c; border-radius:8px; cursor:pointer;}'
+'@media (prefers-color-scheme:dark){'
+' #nnAskBox{background:#161a15; color:#e6ebe2;} #nnAskStage{background:#1b241c; border-color:#39423a;}'
+' #nnAskLive .st{color:#9ed8b3;} #nnAskLive .tx{color:#cfd8cb;} #nnAskLive .hint{color:#9aa896;}'
+' .nnAns{background:#1f251e; border-color:#39423a; box-shadow:0 2px 0 #39423a;} .nnAns.tip{background:#2a2a1a; border-color:#8a7a2a;}'
+' .nnAns .hd{color:#e6ebe2;} .nnAns.tip .hd{color:#ffe38a;} .nnAns.ng .hd{color:#ff9a86;} .nnAns .sub{color:#9ed8b3;} .nnAns li{color:#cfd8cb;} .nnAns .q{color:#cfd8cb;}'
+' .nnAns .say{color:#e6ebe2;} .nnAns .dtl{border-color:#39423a;}'
+' #nnAskFoot{background:#1f251e; border-color:#39423a;} #nnAskIn{background:#131a14; color:#e6ebe2; border-color:#3f4a40;}'
+' #nnAskEx button{background:#1b241c; color:#e6ebe2; border-color:#3f4a40; box-shadow:none;} #nnAskCats button{background:#1b241c; color:#cfd8cb; border-color:#3f4a40;}'
+' .nnCand button{background:#1b241c; color:#9ed8b3; border-color:#3f6a4a;} .nnAns .more button{background:#1b241c; color:#cfd8cb; border-color:#3f4a40;}'
+' #nnAskSet{background:#1f251e; border-color:#39423a;} #nnAskSet .row>b{color:#9ed8b3;} #nnAskSet select,#nnAskSet input[type=text],#nnAskSet input[type=password]{background:#131a14; color:#e6ebe2; border-color:#3f4a40;}}';

/* 例の質問（分野ごと）。★どれも端末の中の実データで答えられるものだけ */
var EXS={
  'お金':['サン太平の入金日は？','今月の入金予定は？','丸彦渡辺建設の次の入金は？','サン太平の請負金額は？','サン太平の利益は？'],
  '日程':['サン太平の着工日は？','発寒南倉庫の完成予定は？','これから着工の現場は？','今月完成の現場は？','篠路工場はいまどうなってる？'],
  '現場':['施工中の現場は？','札幌市西区の現場は？','丸彦渡辺建設の現場は？','サン太平の工法は？','サン太平の不具合は？'],
  '材料':['サン太平のプライマー いくら？','プライマーの通常単価は？','サン太平の発注は？','サン太平の図面ある？'],
  '連絡先':['丸彦渡辺建設の連絡先','北王リビングサービスの支払条件は？','大和ライフネクストの担当者は？']
};
var box=null, bodyEl=null, inEl=null, liveEl=null, rec=null, curCat='お金';

function build(){
  if(box) return;
  var st=document.createElement('style'); st.id='nn-ask-css'; st.textContent=CSS;
  document.head.appendChild(st);
  box=document.createElement('div'); box.id='nnAsk';
  box.innerHTML=''
   +'<div id="nnAskBox">'
   +'  <div id="nnAskHd"><span class="ttl"><b>きく</b><small>納まりナビに登録したことは、声で聞けます</small></span>'
   +'    <span class="sp"><button id="nnAskSpk" type="button" title="答えを声で読み上げる">🔊</button>'
   +'    <button id="nnAskSetBtn" type="button" title="声の設定" aria-label="設定">⚙</button>'
   +'    <button class="x" id="nnAskX" type="button" aria-label="閉じる">✕</button></span></div>'
   +'  <div id="nnAskSet"></div>'
   +'  <div id="nnAskStage">'
   +'    <button id="nnAskMic" type="button" aria-label="話す">🎤</button>'
   +'    <div id="nnAskLive"><div class="st">タップして、話してください</div><div class="tx"></div><div class="hint">例：「サン太平の入金日は？」「施工中の現場は？」「札幌市西区の現場」</div></div>'
   +'  </div>'
   +'  <div id="nnAskBody"></div>'
   +'  <div id="nnAskFoot">'
   +'    <div id="nnAskCats"></div><div id="nnAskEx"></div>'
   +'    <div id="nnAskRow">'
   +'      <input id="nnAskIn" type="text" inputmode="text" autocomplete="off" placeholder="文字で聞くときはここに">'
   +'      <button id="nnAskGo" type="button">きく</button>'
   +'    </div>'
   +'  </div>'
   +'</div>';
  document.body.appendChild(box);
  bodyEl=box.querySelector('#nnAskBody'); inEl=box.querySelector('#nnAskIn'); liveEl=box.querySelector('#nnAskLive');
  box.querySelector('#nnAskX').onclick=close;
  box.addEventListener('pointerdown',function(e){ unlockAudio(); if(e.target===box) close(); });
  box.querySelector('#nnAskGo').onclick=function(){ ask(inEl.value); };
  inEl.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); ask(inEl.value); } });
  inEl.addEventListener('input', onInputForVoice);
  spkBtn();
  box.querySelector('#nnAskSpk').onclick=function(){
    speakOn=!speakOn; spkBtn();
    try{ localStorage.setItem(SPK_KEY, speakOn?'1':'0'); }catch(_){}
    if(!speakOn) stopSpeak();
    else speak('読み上げをオンにしました');   /* 押した瞬間に声を出す＝iPhoneの許可もここで取れる */
  };
  box.querySelector('#nnAskSetBtn').onclick=function(){ var s=box.querySelector('#nnAskSet'); s.classList.toggle('on'); if(s.classList.contains('on')) renderSet(); };
  box.querySelector('#nnAskMic').onclick=mic;
  renderCats();
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&box.classList.contains('on')) close(); });
}
function spkBtn(){ var b=box.querySelector('#nnAskSpk'); b.classList.toggle('on',speakOn); b.textContent = speakOn?'🔊 声あり':'🔈 声なし'; b.title=speakOn?'答えを声で読み上げています（押すと止める）':'読み上げは止めています（押すと声で答える）'; }
function renderCats(){
  var c=box.querySelector('#nnAskCats'), ex=box.querySelector('#nnAskEx'); c.innerHTML=''; ex.innerHTML='';
  Object.keys(EXS).forEach(function(k){ var b=document.createElement('button'); b.type='button'; b.textContent=k; b.className=(k===curCat?'on':'');
    b.onclick=function(){ curCat=k; renderCats(); }; c.appendChild(b); });
  (EXS[curCat]||[]).forEach(function(t){ var b=document.createElement('button'); b.type='button'; b.textContent=t; b.onclick=function(){ unlockAudio(); ask(t); }; ex.appendChild(b); });
}
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function setLive(st, tx, live){
  try{ liveEl.querySelector('.st').textContent=st||''; var t=liveEl.querySelector('.tx'); t.textContent=tx||''; t.classList.toggle('live',!!live); }catch(_){}
}

/* ---------- 設定（声の種類・速さ・高品質音声） ---------- */
function renderVoiceSel(){
  var s=box&&box.querySelector('#nnAskVoice'); if(!s) return;
  var cur=jaVoice?jaVoice.voiceURI:'';
  s.innerHTML='<option value="">自動（いちばん自然な声）</option>'+voices.slice().sort(function(a,b){return rankVoice(b)-rankVoice(a);}).map(function(v){
    return '<option value="'+esc(v.voiceURI)+'"'+(ls(VKEY)===v.voiceURI?' selected':'')+'>'+esc(v.name)+(rankVoice(v)>=45?'（自然）':'')+'</option>'; }).join('');
  var n=box.querySelector('#nnAskVoiceNow'); if(n) n.textContent='いま：'+(jaVoice?jaVoice.name:'（日本語の声がありません）')+(useCloud()?'／高品質音声を使用':'');
}
function renderSet(){
  var s=box.querySelector('#nnAskSet'), c=ttsCfg();
  s.innerHTML=''
   +'<div class="row"><b>声</b><select id="nnAskVoice"></select></div><small id="nnAskVoiceNow"></small>'
   +'<small>★iPhoneで声が機械っぽいとき：設定 → アクセシビリティ → 読み上げコンテンツ → 声 → 日本語 で「Kyoko（拡張）」や「Siri」の声を追加すると、ここに出て自然になります。</small>'
   +'<div class="row"><b>速さ</b><input id="nnAskRate" type="range" min="0.7" max="1.4" step="0.05" value="'+rate()+'"><span id="nnAskRateV">'+rate().toFixed(2)+'</span></div>'
   +'<div class="row"><b>高品質音声</b><input id="nnAskKey" type="password" placeholder="OpenAI の APIキー（sk-…）を入れると最新AIの声になります" value="'+esc(c.key||'')+'">'
   +'<select id="nnAskCV"><option value="nova">nova（女性・落ち着き）</option><option value="shimmer">shimmer（女性・明るい）</option><option value="alloy">alloy（中性）</option><option value="onyx">onyx（男性・低い）</option><option value="echo">echo（男性）</option></select>'
   +'<button id="nnAskKeySave" type="button">保存</button><button id="nnAskKeyTest" type="button">試す</button></div>'
   +'<small>★任意。鍵は端末の中にだけ保存され、答えの文だけを音声に変えるために送ります（数字を作るのはこれまでどおり端末の検索＝推測しません）。通信できないときは端末の声に戻ります。料金は利用者のOpenAIアカウントに約1円／回。</small>';
  renderVoiceSel();
  var cv=s.querySelector('#nnAskCV'); cv.value=c.voice||'nova';
  s.querySelector('#nnAskVoice').onchange=function(){ try{ if(this.value) localStorage.setItem(VKEY,this.value); else localStorage.removeItem(VKEY); }catch(_){} pickVoice(); renderVoiceSel(); speak('この声で読み上げます'); };
  var rg=s.querySelector('#nnAskRate'); rg.oninput=function(){ s.querySelector('#nnAskRateV').textContent=(+this.value).toFixed(2); try{ localStorage.setItem(RKEY,this.value); }catch(_){} };
  rg.onchange=function(){ speak('この速さで読み上げます'); };
  s.querySelector('#nnAskKeySave').onclick=function(){ var k=s.querySelector('#nnAskKey').value.trim(); try{ localStorage.setItem(TKEY, JSON.stringify({key:k, voice:cv.value, model:'gpt-4o-mini-tts'})); }catch(_){} renderVoiceSel(); toastLive(k?'高品質音声を使います':'端末の声に戻しました'); };
  s.querySelector('#nnAskKeyTest').onclick=function(){ unlockAudio(); speak('こんにちは。納まりナビです。この声で答えます。'); };
  cv.onchange=function(){ var k=s.querySelector('#nnAskKey').value.trim(); try{ localStorage.setItem(TKEY, JSON.stringify({key:k, voice:cv.value, model:'gpt-4o-mini-tts'})); }catch(_){} };
}
function toastLive(t){ setLive(t,''); setTimeout(function(){ if(!rec&&!voiceArmed) setLive('タップして、話してください',''); },1800); }

/* ---------- 答えのカード（声と同時に文字が流れる） ---------- */
function render(q,a){
  var d=document.createElement('div');
  d.className='nnAns'+(a.ok?'':' ng')+(a.tip?' tip':'');
  var h='';
  if(q) h+='<div class="q">'+esc(q)+'</div>';
  if(!a.tip) h+='<div class="who">納まりナビ <span class="bars"><i></i><i></i><i></i><i></i></span></div><div class="say"></div>';
  h+='<div class="dtl"><div class="hd">'+esc(a.head)+'</div>';
  if(a.sub) h+='<div class="sub">'+esc(a.sub)+'</div>';
  if(a.lines&&a.lines.length) h+='<ul>'+a.lines.map(function(l){ return '<li>'+esc(l)+'</li>'; }).join('')+'</ul>';
  h+='</div>';
  d.innerHTML=h;
  var dtl=d.querySelector('.dtl');
  if(a.teach && a.teach.names && a.teach.names.length){
    var t=document.createElement('div'); t.className='nnCand';
    a.teach.names.forEach(function(nm){ var b=document.createElement('button'); b.type='button'; b.textContent=nm;
      b.onclick=function(){ if(a.teach.word) nnAskLearn(a.teach.word, nm); ask(q); }; t.appendChild(b); });
    dtl.appendChild(t);
  }
  if(a.cands&&a.cands.length>1){
    var c=document.createElement('div'); c.className='nnCand';
    var lab=document.createElement('div'); lab.style.cssText='font-size:11.5px;color:#6a786c;width:100%;'; lab.textContent='もしかして：'; c.appendChild(lab);
    a.cands.forEach(function(o){ var b=document.createElement('button'); b.type='button'; b.textContent=o.name||o.n||'';
      b.onclick=function(){ ask((o.name||o.n||'')+' '+q.replace(/^.*?の/,'')); }; c.appendChild(b); });
    dtl.appendChild(c);
  }
  /* 続けて聞きやすいように、同じ現場の別の項目をワンタップで */
  if(a.bk && !a.tip){
    var m=document.createElement('div'); m.className='more';
    [['入金日','の入金日は？'],['着工日','の着工日は？'],['完成予定','の完成予定は？'],['請負金額','の請負金額は？'],['利益','の利益は？'],['工法','の工法は？'],['発注','の発注は？'],['連絡先','の元請の連絡先']].forEach(function(x){
      var b=document.createElement('button'); b.type='button'; b.textContent=x[0];
      b.onclick=function(){ var bk=buks().filter(function(z){return z.code===a.bk;})[0]; ask((bk?bk.code:'')+' '+x[1].replace(/^の/,'')); }; m.appendChild(b); });
    dtl.appendChild(m);
  }
  bodyEl.insertBefore(d, bodyEl.firstChild);
  bodyEl.scrollTop=0;
  return d;
}
/* 文字を声に合わせて流す。声が無い（オフ・使えない）ときは速めに流す */
function stream(card, text, withVoice){
  var say=card.querySelector('.say'); if(!say){ card.classList.add('done'); return; }
  var n=0, full=String(text||''), fin=false;
  function show(k){ k=Math.max(n, Math.min(full.length, k|0)); n=k; say.innerHTML=esc(full.slice(0,k))+(k<full.length?'<span class="cur"></span>':''); }
  function done(){ if(fin) return; fin=true; show(full.length); card.classList.remove('speaking'); card.classList.add('done'); }
  show(0);
  if(withVoice){ card.classList.add('speaking'); speak(full, show, done);
    /* 声がいつまでも終わらない端末でも、文字と根拠は必ず出す（最長 文字数×0.16秒＋3秒） */
    setTimeout(done, Math.min(25000, full.length*160+3000));
  }else{
    var per=Math.max(12, Math.min(28, 1400/Math.max(1,full.length)));
    var tm=setInterval(function(){ if(n>=full.length){ clearInterval(tm); done(); return; } show(n+1); }, per);
  }
}

function ask(q){
  q=String(q||'').trim(); if(!q) return;
  armOff(); micReset();
  var a;
  try{ a=answer(q); }
  catch(err){ a={ok:false, head:'うまく調べられませんでした', lines:['もう一度、現場名や材料名を入れて聞いてください'], speak:'うまく調べられませんでした'}; }
  var card=render(q,a);
  inEl.value='';
  setLive('答えています…','');
  var voice=!!(speakOn && a.speak && (('speechSynthesis' in window)||useCloud()));
  stream(card, a.speak||a.head||'', voice);
  var t0=Date.now(); var wt=setInterval(function(){ if(card.classList.contains('done')||Date.now()-t0>26000){ clearInterval(wt); if(!rec&&!voiceArmed) setLive('タップして、もう一度話せます',''); } },200);
}

/* ---------- 話して入れる ----------
   ★2026-09-02f/h の知見をそのまま：
   ・iPhoneのホーム画面から起動したアプリ（PWA）では Apple の制限で音声認識が動かない → キーボードの🎤へ案内し、
     話し終わって1.4秒で答える（「きく」を押さなくてよい）
   ・Safariのタブなら本物の音声認識。始まった合図が来なければ切り替える
   ・聞き取っている途中の文字（interim）を舞台にそのまま出す＝「聞こえている」が見える */
function isIOS(){ try{ var p=navigator.platform||'', u=navigator.userAgent||'';
  return /iPad|iPhone|iPod/.test(p) || /iPhone|iPad|iPod/.test(u) || (/Mac/.test(p) && (navigator.maxTouchPoints||0) > 1); }catch(_){ return false; } }
function isStandalone(){ try{ return navigator.standalone===true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches); }catch(_){ return false; } }
var micT=0, micGot=false, armT=0, voiceArmed=false;
function micReset(){
  if(micT){ clearTimeout(micT); micT=0; }
  micGot=false;
  if(rec){ try{ rec.onstart=rec.onaudiostart=rec.onresult=rec.onerror=rec.onend=null; }catch(_){} try{ rec.abort?rec.abort():rec.stop(); }catch(_){} rec=null; }
  try{ box.querySelector('#nnAskMic').classList.remove('rec'); }catch(_){}
}
function armOff(){ voiceArmed=false; if(armT){ clearTimeout(armT); armT=0; } try{ box.querySelector('#nnAskMic').classList.remove('arm'); }catch(_){} }
function micGuide(){
  try{ bodyEl.querySelectorAll('.nnAns.tip').forEach(function(e){ e.remove(); }); }catch(_){}
  voiceArmed=true;
  try{ box.querySelector('#nnAskMic').classList.add('arm'); }catch(_){}
  setLive('キーボード右下の 🎤 を押して、話してください','話し終わって少し待つと、そのまま声で答えます');
  render('（声で入れる）', {ok:true, tip:true, head:'キーボード右下の🎤を押して、話してください',
    lines:['話し終わって少し待つと、そのまま答えます（「きく」を押さなくて大丈夫です）',
           'このアプリの🎤は、ホーム画面から起動したときは使えません（iPhoneの決まり）。Safariで開くと使えます']});
  try{ inEl.focus(); }catch(_){}
}
function onInputForVoice(){
  if(!voiceArmed) return;
  if(armT){ clearTimeout(armT); armT=0; }
  var v=String(inEl.value||'').trim(); if(!v) return;
  setLive('聞いています…', v, true);
  armT=setTimeout(function(){ armT=0; if(!voiceArmed) return; var t=String(inEl.value||'').trim(); if(t){ armOff(); ask(t); } }, 1400);
}
function mic(){
  if(!box) return;
  unlockAudio();
  if(rec){ micReset(); setLive('タップして、話してください',''); return; }
  stopSpeak();
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR || (isIOS() && isStandalone())){ micGuide(); return; }
  var btn=box.querySelector('#nnAskMic');
  try{
    rec=new SR(); rec.lang='ja-JP'; rec.interimResults=true; rec.maxAlternatives=1;
    rec.onstart=rec.onaudiostart=function(){ micGot=true; setLive('聞いています…','どうぞ話してください'); };
    rec.onresult=function(e){
      var fin='', tmp='', i0=(e.resultIndex|0), n=(e.results&&e.results.length)|0;
      for(var i=i0;i<n;i++){ var r=e.results[i]; if(!r||!r[0]) continue; if(r.isFinal!==false) fin+=r[0].transcript||''; else tmp+=r[0].transcript||''; }
      if(fin){ micReset(); armOff(); inEl.value=fin; ask(fin); } else if(tmp) setLive('聞いています…', tmp, true);
    };
    rec.onerror=function(){ micReset(); micGuide(); };
    rec.onend=function(){ if(rec){ micReset(); setLive('タップして、話してください',''); } };
    rec.start(); btn.classList.add('rec'); setLive('マイクを準備しています…','');
    var wait=(window.NN_ASK_MICWAIT>0)?window.NN_ASK_MICWAIT:6000;
    micT=setTimeout(function(){ if(!micGot){ micReset(); micGuide(); } else { micT=0; } }, wait);
  }catch(_){ micReset(); micGuide(); }
}

function open(q){
  build(); box.classList.add('on');
  ensureBukken(function(){
    if(!bodyEl.children.length){
      render('', {ok:true, tip:true, head:'声で、なんでも聞いてください',
        lines:['🎤を押して話す →「サン太平の入金日は？」「施工中の現場は？」「札幌市西区の現場」「丸彦渡辺建設の連絡先」',
               '日程・お金・工法・元請・住所・材料の単価・発注・図面・不具合タグ——納まりナビに登録したことなら答えます',
               '答えは端末の中の記録から引いています。推測はしません。見つからないときは「登録がありません」と正直に出ます']});
    }
    if(q) ask(q);
  });
}
function close(){ stopSpeak(); micReset(); armOff(); if(box){ box.classList.remove('on'); setLive('タップして、話してください',''); } }

/* ---------- どのページからも呼べる（共通ヘッダー帯に🎤を足す・2026-09-02e） ---------- */
function mountHeader(){
  try{
    if(window.NN_ASK_MOUNT===false) return;
    if(document.getElementById('askBtn')||document.getElementById('askHdBtn')) return;
    var h=document.querySelector('header'); if(!h) return;
    var b=document.createElement('button');
    b.id='askHdBtn'; b.type='button'; b.className='new-btn';
    b.title='きく（声で聞く：日程・お金・単価・連絡先）'; b.setAttribute('aria-label','きく');
    b.textContent='🎤'; b.style.padding='9px 11px';
    b.onclick=function(){ open(); };
    h.appendChild(b);
  }catch(_){}
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mountHeader);
else mountHeader();

window.nnAskOpen=open;
window.nnAskClose=close;
window.NN_ASK={ answer:answer, open:open, close:close, _norm:norm, _score:score, _chunks:chunks, _rankVoice:rankVoice, _areaOf:areaOf, _fieldIntent:fieldIntent };
})();
