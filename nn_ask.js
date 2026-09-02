/* ============================================================
   納まりナビ「きく」（AIチャット・手入力版／音声版の土台）  2026-09-02
   佐野さん発案：元請の前で「あの現場の単価いくらだっけ」に3秒で答える。

   ★設計の芯：数字は絶対に推測しない。
     見つからなければ「登録がありません」と言う。あいまいなら候補を出して選ばせる。
     AI（通信）は一切使わない ＝ 圏外でも動く・0円・毎回まったく同じ答え。
     将来AIを足す価値があるのは「言葉の揺れの吸収」だけ（数字は永久に検索から）。

   ★どこから答えるか（すべて端末の中の実データ）
     ・発注履歴  nn_hacchu_hist … その現場でその材料をいくらで買ったか（lines[].p）
     ・材料登録  nn_materials_v1 … 通常単価（price）と価格改定の履歴（hist）
     ・物件一覧  window.NN_BUKKEN（bukken_list.js）… 現場名・住所・元請
     ・客先登録  nn_tokui_v1 … 元請・仕入業者の連絡先

   使い方：<script src="./nn_ask.js"></script> を置いて window.nnAskOpen() を呼ぶだけ。
   検査用：window.NN_ASK.answer('質問') が答えのオブジェクトを返す（画面なしで検算できる）。
   ============================================================ */
(function(){
if(window.NN_ASK) return;

/* ---------- 保存の読み出し（壊れていても落ちない・§199/§210） ---------- */
function ls(k){ try{ return localStorage.getItem(k); }catch(_){ return null; } }
function jarr(k){ try{ var v=JSON.parse(ls(k)||'[]'); return Array.isArray(v)?v.filter(okObj):[]; }catch(_){ return []; } }
function okObj(o){ return o && typeof o==='object' && !Array.isArray(o); }
function hist(){ return jarr('nn_hacchu_hist'); }
function mats(){
  try{ var v=JSON.parse(ls('nn_materials_v1')||'[]');
       if(!Array.isArray(v)) return []; return v.filter(okObj); }catch(_){ return []; }
}
function buks(){ var v=window.NN_BUKKEN; return Array.isArray(v)?v.filter(okObj):[]; }
function tokui(){
  try{ var v=JSON.parse(ls('nn_tokui_v1')||'null'); if(!okObj(v)) return {moto:[],shi:[]};
       return {moto:Array.isArray(v.moto)?v.moto.filter(okObj):[],
               shi :Array.isArray(v.shi )?v.shi .filter(okObj):[]}; }catch(_){ return {moto:[],shi:[]}; }
}

/* ---------- 文字の正規化（全角/半角・大小・カナのゆれを吸収） ---------- */
function norm(s){
  s=String(s==null?'':s);
  s=s.replace(/[Ａ-Ｚａ-ｚ０-９]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0xFEE0);});
  s=s.replace(/[ｱ-ﾝﾞﾟ]/g,function(c){return c;});          /* 半角カナはそのまま（比較は2文字組なので影響小） */
  s=s.toLowerCase();
  s=s.replace(/[\s　・･,，、。．.\-ー―‐−（）()「」『』【】\[\]／\/]/g,'');
  return s;
}
/* 2文字組のかさなりで近さを測る（部分一致に強い・速い） */
function grams(s){ var a=[],i; for(i=0;i<s.length-1;i++) a.push(s.substr(i,2)); return a; }
function score(qN, cand){
  var c=norm(cand); if(c.length<2) return 0;
  var g=grams(c), n=0, i;
  for(i=0;i<g.length;i++) if(qN.indexOf(g[i])>=0) n++;
  return n;
}
/* 候補の中から最良を選ぶ。僅差なら「あいまい」として候補を返す */
function pick(qN, list, key, min){
  min=min||2;
  var scored=list.map(function(o){ return {o:o, s:score(qN, typeof key==='function'?key(o):o[key])}; })
                 .filter(function(x){ return x.s>=min; })
                 .sort(function(a,b){ return b.s-a.s; });
  if(!scored.length) return {best:null, cands:[]};
  var top=scored[0].s;
  var tie=scored.filter(function(x){ return x.s>=top-1; });
  return {best:scored[0].o, cands:tie.slice(0,5).map(function(x){return x.o;}), sure:tie.length===1};
}

/* ---------- お金・日付の見た目 ---------- */
function yen(n){ return '¥'+Math.round(n).toLocaleString('ja-JP'); }
function jdate(s){
  var m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (m[1]+'年'+(+m[2])+'月'+(+m[3])+'日') : String(s||'');
}
function vendorName(vid){
  var t=tokui().shi, i;
  for(i=0;i<t.length;i++) if(t[i].id===vid || t[i].name===vid) return t[i].name||String(vid);
  return '';   /* 分からないときは名乗らない（推測しない） */
}

/* ---------- ③ 言葉のゆれ（2026-09-02e） ----------
   ★AIは使わない。言い換えの表と、利用者が覚えさせた言い方だけ。
     「プライマー」「下塗り」「あの下地材」を同じものとして探せるようにする。 */
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
var LEARN='nn_ask_yomi_v1';                 /* {覚えさせた言い方: 正式な名前} */
function learned(){
  try{ var v=JSON.parse(ls(LEARN)||'{}'); return okObj(v)?v:{}; }catch(_){ return {}; }
}
function learn(word, name){
  if(!word||!name) return;
  try{ var m=learned(); m[norm(word)]=name;
       localStorage.setItem(LEARN, JSON.stringify(m)); }catch(_){}
}
/* 質問を「言い換えも足した形」にする（探すときだけ使う。表示は元のまま） */
function expand(qN){
  var out=qN, i, j, g;
  for(i=0;i<SYN.length;i++){
    g=SYN[i];
    for(j=0;j<g.length;j++){
      if(qN.indexOf(norm(g[j]))>=0){ out += g.map(norm).join(''); break; }
    }
  }
  var m=learned();
  for(var k in m){ if(k && qN.indexOf(k)>=0) out += norm(m[k]); }
  return out;
}
/* 覚えさせる語を質問から取り出す（現場名と、ありふれた言葉を除いた残り） */
var STOP=/(いくら|単価|金額|価格|値段|現場|物件|材料|教え|なに|何|です|ます|でし|ました|入って|回答|来て|とき|くらい)/g;
function aliasWord(q, bkName){
  var t=String(q||'');
  t=t.replace(STOP,' ');
  if(bkName){ var bn=String(bkName); for(var i=0;i<bn.length-1;i++){ t=t.split(bn.substr(i,2)).join(' '); } }
  var best='';
  (t.match(/[ァ-ヶー一-龠A-Za-z0-9]{2,}/g)||[]).forEach(function(w){ if(w.length>best.length) best=w; });
  return best;
}
window.nnAskLearn=learn;

/* ---------- 質問の意図 ---------- */
function intent(q){
  if(/いくら|単価|金額|価格|円|値段/.test(q)) return 'price';
  if(/何缶|何本|何袋|何セット|数量|いくつ/.test(q))  return 'qty';
  if(/いつ|何日|日付|発注日/.test(q))                return 'date';
  if(/電話|連絡|担当|メール|tel/i.test(q))           return 'contact';
  return 'price';                                    /* 既定は単価（いちばん多い） */
}

/* ============================================================
   本体：質問 → 答え
   返すもの {ok, head（大きく出す一言）, lines[]（根拠）, cands[]（あいまいなときの候補）, speak（読み上げ文）}
   ============================================================ */
function answer(q){
  q=String(q||'').trim();
  if(!q) return {ok:false, head:'聞きたいことを入れてください', lines:[]};
  var qN0=norm(q), qN=expand(qN0), H=hist(), M=mats(), B=buks(), it=intent(q);

  /* 物件番号（J051 など）を直に書かれたら最優先 */
  var codeM=q.match(/[Jj]\s?(\d{3})/);
  var bk=null, bkCands=[];
  if(codeM){
    bk=B.filter(function(b){ return String(b.code).toUpperCase()==='J'+codeM[1]; })[0]||null;
  }
  if(!bk){
    var pb=pick(qN, B, function(b){ return (b.name||'')+' '+(b.addr||''); }, 2);
    bk=pb.best; bkCands=pb.cands;
  }

  /* 連絡先を聞かれた場合 */
  if(it==='contact'){
    var T=tokui(), all=T.moto.concat(T.shi);
    var pc=pick(qN, all, function(o){ return (o.name||'')+' '+(o.tanto||''); }, 2);
    if(!pc.best) return miss('その相手は客先登録にありません', ['ホーム →「客先登録」に元請・仕入業者を登録すると、ここから引けます']);
    var c=pc.best, L=[];
    if(c.tel)   L.push('電話：'+c.tel);
    if(c.tanto) L.push('担当：'+c.tanto);
    if(c.mail)  L.push('メール：'+c.mail);
    if(c.shiharai) L.push('支払条件：'+c.shiharai);
    return {ok:true, head:(c.name||''), lines:L.length?L:['登録は名前だけです'],
            speak:(c.name||'')+'です。'+(c.tel?('電話は、'+String(c.tel).replace(/-/g,'、')+'です'):'電話の登録はありません')
                  +(c.tanto?('。担当は'+c.tanto+'さんです'):'')};
  }

  /* 材料をさがす（発注履歴の明細名 と 材料登録 の両方から） */
  var lineNames={};
  H.forEach(function(h){ (Array.isArray(h.lines)?h.lines:[]).forEach(function(l){
    if(okObj(l)&&l.n) lineNames[l.n]=1; }); });
  var matPool = Object.keys(lineNames).map(function(n){ return {n:n, _fromHist:1}; })
    .concat(M.map(function(m){ return {n:m.n, s:m.s, c2:m.c2, maker:m.maker, price:m.price, hist:m.hist, ou:m.ou, _m:m}; }));
  var pm=pick(qN, matPool, function(o){ return (o.n||'')+' '+(o.s||'')+' '+(o.c2||'')+' '+(o.maker||''); }, 3);

  if(!pm.best){
    /* ★材料が特定できないとき、現場の一覧へ逃げてはいけない（聞かれたことに答えていない）。
       「発注は？」のように材料を聞いていないときだけ一覧を出す。 */
    if(bk && /発注|一覧|なに|何を|教え/.test(q)) return propSummary(bk, H);
    /* ★選んで覚えさせられるようにする（次からその言い方で通る）。AIは使わない。 */
    var names=matPool.map(function(o){ return o.n; }).filter(function(x,i,a){ return x&&a.indexOf(x)===i; }).slice(0,6);
    return {ok:false, head:'その材料は見つかりませんでした',
      lines:['下から選ぶと、その言い方を覚えます（次からは通ります）',
             '例：「サン太平のプライマー、いくらで入ってた？」'],
      teach:{word:aliasWord(q, bk&&bk.name), names:names},
      speak:'その材料は見つかりませんでした'};
  }
  var matName=pm.best.n;

  /* その現場の発注履歴から実際の単価を引く（★ここが核） */
  var found=null, others=[];
  H.forEach(function(h){
    (Array.isArray(h.lines)?h.lines:[]).forEach(function(l){
      if(!okObj(l)||!l.n) return;
      if(norm(l.n)!==norm(matName)) return;
      var rec={h:h, l:l};
      if(bk && String(h.gid)===String(bk.code)) { if(!found||h.date>found.h.date) found=rec; }
      else others.push(rec);
    });
  });

  /* 通常単価：①材料登録の単価 ②他の現場の実績（どちらも実データ。無ければ言わない） */
  var reg = pm.best._m || M.filter(function(m){ return norm(m.n)===norm(matName); })[0] || null;
  var regPrice = reg && reg.price>0 ? Math.round(reg.price) : null;
  var otherPrices = others.map(function(r){ return Math.round(r.l.p); }).filter(function(p){ return p>0; });

  if(bk && !found){
    var L1=['この現場（'+bk.name+'）の発注履歴に「'+matName+'」がありません'];
    if(otherPrices.length) L1.push('他の現場では '+uniq(otherPrices).map(yen).join('／')+' で入っています');
    if(regPrice) L1.push('材料登録の単価：'+yen(regPrice));
    return {ok:false, head:'この現場の登録がありません', lines:L1,
            speak:bk.name+'では、'+matName+'の発注履歴がありません'};
  }
  if(!bk && !found){
    if(!otherPrices.length && !regPrice)
      return miss('「'+matName+'」の単価が登録されていません', ['材料登録で単価を入れるか、発注すると記録されます']);
    /* ★現場が言われていた（けれど特定できなかった）のに、そのまま金額だけ出すと
       「その現場の単価」と誤解される。元請の前でこれは危険なので、必ず断る。 */
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

  /* ★見つかった：その現場・その材料の実際の単価 */
  var p=Math.round(found.l.p), base=regPrice, L=[], sp;
  if(base==null && otherPrices.length){
    var mode=uniq(otherPrices).sort(function(a,b){return b-a;})[0];
    base=mode;
  }
  L.push('現場：'+bk.name+'（'+bk.code+'）');
  L.push('発注：'+jdate(found.h.date)+(vendorName(found.h.vid)?('　'+vendorName(found.h.vid)):'')+
         (found.h.no?('　'+found.h.no):''));
  if(found.l.q>0) L.push('数量：'+found.l.q+(found.l.u||'')+'　金額：'+yen(p*found.l.q));
  /* 読み上げ文＝人が答えるときの言い方（「10500円です。通常より300円安く入っています。
     通常単価は10800円です。」）。数字はカンマを入れない（読み上げが確実） */
  sp=bk.name+'の'+matName+'は、'+p+'円です。';
  if(base!=null && base!==p){
    var d=p-base;
    L.push(d<0 ? ('通常より '+yen(-d)+' 安く入っています（通常 '+yen(base)+'）')
               : ('通常より '+yen(d)+' 高く入っています（通常 '+yen(base)+'）'));
    sp += '通常より'+Math.abs(d)+'円'+(d<0?'安く':'高く')+'入っています。通常単価は'+base+'円です。';
  }else if(base!=null){
    L.push('通常単価と同じです（'+yen(base)+'）');
    sp += '通常単価と同じです。';
  }else{
    L.push('※通常単価は材料登録に入っていません（入れると差が出ます）');
  }
  if(it==='qty' && found.l.q>0) return {ok:true, head:found.l.q+(found.l.u||''), lines:L,
    speak:bk.name+'の'+matName+'は、'+found.l.q+(found.l.u||'')+'です'};
  if(it==='date') return {ok:true, head:jdate(found.h.date), lines:L, speak:bk.name+'の'+matName+'は、'+jdate(found.h.date)+'に発注しています'};
  return {ok:true, head:yen(p), sub:matName, lines:L, speak:sp};
}

function uniq(a){ var s={},r=[]; a.forEach(function(x){ if(!s[x]){s[x]=1;r.push(x);} }); return r; }
function miss(head, lines){ return {ok:false, head:head, lines:lines||[], speak:head}; }
function propSummary(bk, H){
  var rows=[];
  H.forEach(function(h){ if(String(h.gid)!==String(bk.code)) return;
    (Array.isArray(h.lines)?h.lines:[]).forEach(function(l){ if(okObj(l)&&l.n)
      rows.push(l.n+'　'+yen(l.p)+(l.q>0?('　×'+l.q+(l.u||'')):'')); }); });
  if(!rows.length) return {ok:false, head:bk.name, lines:['この現場の発注履歴はまだありません'],
    speak:bk.name+'の発注履歴はまだありません'};
  return {ok:true, head:bk.name, lines:['発注した材料：'].concat(rows),
    speak:bk.name+'の発注は'+rows.length+'件です'};
}

/* ============================================================
   画面
   ============================================================ */
var CSS = ''
+'#nnAsk{position:fixed; inset:0; z-index:100000; background:rgba(12,20,14,.55); display:none;'
+'  align-items:flex-start; justify-content:center; padding:0;}'
+'#nnAsk.on{display:flex;}'
+'#nnAskBox{background:#f6f5ef; width:100%; max-width:560px; height:100%; display:flex; flex-direction:column;'
+'  font-family:"Zen Kaku Gothic New","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;'
+'  padding-top:env(safe-area-inset-top,0px); padding-bottom:env(safe-area-inset-bottom,0px);}'
+'#nnAskHd{display:flex; align-items:center; gap:8px; padding:10px 12px; background:#1c6b3c; color:#fff; flex:none;}'
+'#nnAskHd b{font-size:15px; font-weight:900; letter-spacing:.05em;}'
+'#nnAskHd .sp{margin-left:auto; display:flex; align-items:center; gap:8px;}'
+'#nnAskHd button{font:inherit; font-size:12px; font-weight:700; padding:6px 11px; border-radius:3px;'
+'  min-height:34px; display:inline-flex; align-items:center; justify-content:center;'
+'  border:1px solid rgba(255,255,255,.55); background:transparent; color:#fff; cursor:pointer;}'
+'#nnAskHd button.on{background:#ffd23e; border-color:#ffd23e; color:#153f25;}'
+'#nnAskHd .x{font-size:21px; padding:0; border:0; min-width:40px; min-height:40px; line-height:1;}'
+'#nnAskBody{flex:1; overflow-y:auto; padding:14px 12px 8px;}'
+'.nnAns{background:#fff; border:1px solid #dcded2; border-left:5px solid #1c6b3c; padding:14px 16px; margin-bottom:10px;}'
+'.nnAns.ng{border-left-color:#c0392b;}'
+'.nnAns .q{font-size:12px; color:#5e6b5c; margin-bottom:6px;}'
+'.nnAns .hd{font-size:30px; font-weight:900; color:#17301f; line-height:1.25; letter-spacing:.01em;}'
+'.nnAns.ng .hd{font-size:17px; color:#a3281a;}'
+'.nnAns.tip .hd{font-size:16px; color:#2f4a36;}'
+'.nnAns .sub{font-size:13.5px; font-weight:700; color:#2f4a36; margin-top:2px;}'
+'.nnAns ul{margin:9px 0 0; padding-left:1.15em;}'
+'.nnAns li{font-size:13px; line-height:1.8; color:#33402f;}'
+'.nnCand{display:flex; flex-wrap:wrap; gap:6px; margin-top:9px;}'
+'.nnCand button{font:inherit; font-size:12px; padding:4px 10px; border:1px solid #b9c2b6; background:#fff;'
+'  color:#22301f; border-radius:2px; cursor:pointer;}'
+'#nnAskFoot{flex:none; border-top:1px solid #cfd6cb; background:#fff; padding:8px 10px 10px;}'
+'#nnAskRow{display:flex; gap:6px; align-items:center;}'
+'#nnAskIn{flex:1; min-width:0; font:inherit; font-size:16px; padding:9px 10px; border:1.5px solid #b9c2b6;'
+'  border-radius:3px; background:#fff; color:#22301f;}'
+'#nnAskRow button{font:inherit; font-weight:700; border:0; border-radius:3px; cursor:pointer; flex:none;}'
+'#nnAskMic{width:44px; height:42px; font-size:19px; background:#e7f0e6; color:#1c6b3c; border:1.5px solid #b9c2b6 !important;}'
+'#nnAskMic.rec{background:#c0392b; color:#fff; border-color:#c0392b !important;}'
+'#nnAskGo{height:42px; padding:0 16px; font-size:14px; background:#1c6b3c; color:#fff;}'
+'#nnAskEx{display:flex; flex-wrap:wrap; gap:6px; padding:8px 0 0;}'
+'#nnAskEx button{font:inherit; font-size:11.5px; padding:4px 9px; border:1px solid #b9c2b6; background:#f6f5ef;'
+'  color:#3d4f3f; border-radius:2px; white-space:nowrap; cursor:pointer; flex:none;}'
+'@media (prefers-color-scheme:dark){'
+' #nnAskBox{background:#161a15;} .nnAns{background:#1f251e; border-color:#39423a;}'
+' .nnAns .hd{color:#e6ebe2;} .nnAns.tip .hd{color:#9ed8b3;} .nnAns.ng .hd{color:#ff9a86;} .nnAns .sub{color:#9ed8b3;} .nnAns li{color:#cfd8cb;} .nnAns .q{color:#9aa896;}'
+' #nnAskFoot{background:#1f251e; border-color:#39423a;} #nnAskIn{background:#131a14; color:#e6ebe2; border-color:#3f4a40;}'
+' #nnAskEx button{background:#1b241c; color:#c6d3c4; border-color:#3f4a40;}'
+' .nnCand button{background:#1b241c; color:#c6d3c4; border-color:#3f4a40;}}';

/* ★2026-09-02g 読み上げは既定オン（本人の指示「文字だけだとそっけない」）。
   オフにしたら端末に覚える（nn_ask_spk_v1='0'）。元請の前で音を出したくないときは
   ボタン1つで止められ、次に開いてもオフのまま。 */
var SPK_KEY='nn_ask_spk_v1';
var box=null, bodyEl=null, inEl=null, speakOn=(ls(SPK_KEY)!=='0'), rec=null;

function build(){
  if(box) return;
  var st=document.createElement('style'); st.id='nn-ask-css'; st.textContent=CSS;
  document.head.appendChild(st);
  box=document.createElement('div'); box.id='nnAsk';
  box.innerHTML=''
   +'<div id="nnAskBox">'
   +'  <div id="nnAskHd"><b>きく</b>'
   +'    <span class="sp"><button id="nnAskSpk" type="button">🔈 読み上げ</button>'
   +'    <button class="x" id="nnAskX" type="button" aria-label="閉じる">✕</button></span></div>'
   +'  <div id="nnAskBody"></div>'
   +'  <div id="nnAskFoot">'
   +'    <div id="nnAskRow">'
   +'      <input id="nnAskIn" type="text" inputmode="text" autocomplete="off"'
   +'        placeholder="例：サン太平のプライマー いくら？">'
   +'      <button id="nnAskMic" type="button" aria-label="話す">🎤</button>'
   +'      <button id="nnAskGo" type="button">きく</button>'
   +'    </div>'
   +'    <div id="nnAskEx"></div>'
   +'  </div>'
   +'</div>';
  document.body.appendChild(box);
  bodyEl=box.querySelector('#nnAskBody'); inEl=box.querySelector('#nnAskIn');
  box.querySelector('#nnAskX').onclick=close;
  box.addEventListener('pointerdown',function(e){ if(e.target===box) close(); });
  box.querySelector('#nnAskGo').onclick=function(){ ask(inEl.value); };
  inEl.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); ask(inEl.value); } });
  function spkBtn(){ var b=box.querySelector('#nnAskSpk'); b.classList.toggle('on',speakOn);
    b.textContent = speakOn?'🔊 読み上げ オン':'🔈 読み上げ オフ'; }
  spkBtn();
  box.querySelector('#nnAskSpk').onclick=function(){
    speakOn=!speakOn; spkBtn();
    try{ localStorage.setItem(SPK_KEY, speakOn?'1':'0'); }catch(_){}
    if(!speakOn) stopSpeak();
    else speak('読み上げをオンにしました');   /* 押した瞬間に声を出す＝iPhoneの許可もここで取れる */
  };
  box.querySelector('#nnAskMic').onclick=mic;
  var ex=box.querySelector('#nnAskEx');
  ['サン太平のプライマー いくら？','この現場の発注は？','プライマーの通常単価は？','丸彦渡辺建設の連絡先']
    .forEach(function(t){ var b=document.createElement('button'); b.type='button'; b.textContent=t;
      b.onclick=function(){ inEl.value=t; ask(t); }; ex.appendChild(b); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&box.classList.contains('on')) close(); });
}

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

function render(q,a){
  var d=document.createElement('div');
  d.className='nnAns'+(a.ok?'':' ng')+(a.tip?' tip':'');
  var h='<div class="q">'+esc(q)+'</div><div class="hd">'+esc(a.head)+'</div>';
  if(a.sub) h+='<div class="sub">'+esc(a.sub)+'</div>';
  if(a.lines&&a.lines.length){
    h+='<ul>'+a.lines.map(function(l){ return '<li>'+esc(l)+'</li>'; }).join('')+'</ul>';
  }
  d.innerHTML=h;
  if(a.teach && a.teach.names && a.teach.names.length){
    var t=document.createElement('div'); t.className='nnCand';
    a.teach.names.forEach(function(nm){
      var b=document.createElement('button'); b.type='button'; b.textContent=nm;
      b.onclick=function(){ if(a.teach.word) nnAskLearn(a.teach.word, nm); ask(q); };
      t.appendChild(b);
    });
    d.appendChild(t);
  }
  if(a.cands&&a.cands.length>1){
    var c=document.createElement('div'); c.className='nnCand';
    a.cands.forEach(function(o){
      var b=document.createElement('button'); b.type='button';
      b.textContent=o.name||o.n||'';
      b.onclick=function(){ ask((o.name||o.n||'')+' '+q); };
      c.appendChild(b);
    });
    d.appendChild(c);
  }
  bodyEl.insertBefore(d, bodyEl.firstChild);
  bodyEl.scrollTop=0;
}

function ask(q){
  q=String(q||'').trim(); if(!q) return;
  var a;
  try{ a=answer(q); }
  catch(err){ a={ok:false, head:'うまく調べられませんでした', lines:['もう一度、現場名と材料名を入れて聞いてください']}; }
  render(q,a);
  inEl.value='';
  if(speakOn && a.speak) speak(a.speak);
}

/* ---------- 読み上げ（既定オン。ボタンで止められ、端末に覚える） ----------
   ★iPhoneの注意（§36 と同じ端末内蔵の speechSynthesis）
   ・cancel() のあと止まったまま（paused）になることがある → 話す前に resume()
   ・日本語の声は後から読み込まれる → あれば ja の声を選び、無ければ lang だけ指定
   ・ページを離れても喋り続ける → pagehide／visibilitychange で cancel */
var jaVoice=null;
function pickVoice(){
  try{
    var vs=speechSynthesis.getVoices()||[];
    jaVoice = vs.filter(function(v){ return /^ja/i.test(v.lang||''); })[0] || null;
  }catch(_){}
}
try{ if('speechSynthesis' in window){ pickVoice(); speechSynthesis.onvoiceschanged=pickVoice; } }catch(_){}
function stopSpeak(){ try{ speechSynthesis.cancel(); }catch(_){} }
function speak(t){
  try{
    if(!('speechSynthesis' in window) || !t) return;
    stopSpeak();
    try{ speechSynthesis.resume(); }catch(_){}
    var u=new SpeechSynthesisUtterance(String(t)); u.lang='ja-JP'; u.rate=1.0; u.pitch=1.0;
    if(!jaVoice) pickVoice();
    if(jaVoice) u.voice=jaVoice;
    speechSynthesis.speak(u);
  }catch(_){}
}
try{
  window.addEventListener('pagehide', stopSpeak);
  document.addEventListener('visibilitychange', function(){ if(document.hidden) stopSpeak(); });
}catch(_){}

/* ---------- 話して入れる ----------
   ★2026-09-02f iPhoneで🎤が赤いまま固まる不具合を直した。
     iOS は SpeechRecognition が「在るのに動かない」ことがある（とくにホーム画面から
     起動したとき）。start() は通って赤くなるが、結果もエラーも終了も返らないので
     ボタンが赤のまま固まり、利用者からは「反応しない」に見える。
     → iPhone では最初から使わず、キーボードのマイクに案内する（§89：こちらが確実）。
     → それ以外の端末でも、8秒返らなければ自分で止めて案内する（固まらせない）。 */
function isIOS(){
  try{
    var p=navigator.platform||'', u=navigator.userAgent||'';
    return /iPad|iPhone|iPod/.test(p) || /iPhone|iPad|iPod/.test(u) ||
           (/Mac/.test(p) && (navigator.maxTouchPoints||0) > 1);
  }catch(_){ return false; }
}
var micT=0;
function micReset(){
  if(micT){ clearTimeout(micT); micT=0; }
  if(rec){ try{ rec.onresult=rec.onerror=rec.onend=null; }catch(_){}
           try{ rec.abort?rec.abort():rec.stop(); }catch(_){} rec=null; }
  try{ box.querySelector('#nnAskMic').classList.remove('rec'); }catch(_){}
}
function micGuide(){
  inEl.focus();
  render('（声で入れる）', {ok:true, tip:true, head:'キーボードの🎤から話してください',
    lines:['入力欄が開いたら、キーボードのいちばん下にある🎤（マイク）を押して話します',
           '話し終わったら「きく」を押してください']});
}
function mic(){
  if(!box) return;
  if(rec){ micReset(); return; }                 /* もう一度押したら必ず止まる */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR || isIOS()){ micGuide(); return; }      /* ★iPhoneはここ（固まらせない） */
  var btn=box.querySelector('#nnAskMic');
  try{
    rec=new SR(); rec.lang='ja-JP'; rec.interimResults=false; rec.maxAlternatives=1;
    rec.onresult=function(e){ var t=e.results[0][0].transcript; micReset(); inEl.value=t; ask(t); };
    rec.onerror=function(){ micReset(); micGuide(); };
    rec.onend=function(){ micReset(); };
    rec.start(); btn.classList.add('rec');
    micT=setTimeout(function(){ micReset(); micGuide(); }, 8000);   /* 8秒で見切る */
  }catch(_){ micReset(); micGuide(); }
}

function open(q){
  build(); box.classList.add('on');
  if(!bodyEl.children.length){
    render('', {ok:true, tip:true, head:'なんでも聞いてください',
      lines:['「◯◯（現場名）の△△（材料名）、いくらで入ってた？」がいちばん得意です',
             '答えは端末の中の記録から引いています。推測はしません',
             '見つからないときは「登録がありません」と正直に出ます']});
  }
  if(q) ask(q); else setTimeout(function(){ try{ inEl.focus(); }catch(_){} },80);
}
function close(){ stopSpeak(); micReset(); if(box) box.classList.remove('on'); }

/* ---------- ① どのページからも呼べるようにする（2026-09-02e） ----------
   ★ページごとにHTMLを書き足さない。共通ヘッダー帯（§共通ヘッダー）に
     このファイル自身が小さな🎤ボタンを足す。読み込むだけで入口ができる。
     ホームは自前の大きなボタン（#askBtn）があるので足さない。 */
function mountHeader(){
  try{
    if(window.NN_ASK_MOUNT===false) return;
    if(document.getElementById('askBtn')||document.getElementById('askHdBtn')) return;
    var h=document.querySelector('header'); if(!h) return;
    var b=document.createElement('button');
    b.id='askHdBtn'; b.type='button'; b.className='new-btn';
    b.title='きく（単価・数量・連絡先）'; b.setAttribute('aria-label','きく');
    b.textContent='🎤';
    b.style.padding='9px 11px';
    b.onclick=function(){ open(); };
    h.appendChild(b);
  }catch(_){}
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mountHeader);
else mountHeader();

window.nnAskOpen=open;
window.nnAskClose=close;
window.NN_ASK={ answer:answer, open:open, close:close, _norm:norm, _score:score };
})();
