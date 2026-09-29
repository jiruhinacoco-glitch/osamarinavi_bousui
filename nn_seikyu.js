/* ============================================================
   ★2026-09-29g 請求日と「請求し忘れ」のお知らせ（桑原建材ヒアリング①）
   ------------------------------------------------------------
   ・物件の「請求日」から入金予定日を出す（未請求なら今までどおり完成日から見込み）。
   ・元請の締め日・支払日は客先登録（nn_tokui_v1 の moto）の「締め・入金日」を読む。
       例：毎月末締・翌月末払／毎月20日締・翌々月10日払／請求書発行後14日以内
     読めない書き方は null（推測しない）。
   ・「必着」の元請：締め日に請求書が届いていないといけない会社。
       客先登録の hitchaku＝「何日前に出すか」（既定0）。出した日＋hitchaku日 を締めの判定に使う。
   ・計算はここ1か所（記録帳の登録画面・ダッシュボード・ホームが同じ関数を使う）。
   ============================================================ */
(function(){ 'use strict';
if(window.nnSeikyu) return;
var endOf=function(y,m){ return new Date(y,m+1,0); };
function day0(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function addD(d,n){ var x=day0(d); x.setDate(x.getDate()+n); return x; }
function iso(d){ return d?d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'):''; }
function fromIso(s){ var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(s||'')); return m?new Date(+m[1],+m[2]-1,+m[3]):null; }
/* 締め・入金の書き方を読む。{cd:締め日(31=末), add:何か月後, pd:支払日(31=末)} か {after:発行後の日数} */
function parse(rule){
  rule=String(rule||'').normalize('NFKC');
  var ha=/発行後\s*(\d+)\s*日/.exec(rule); if(ha) return {after:+ha[1]};
  var sm=/(\d+)日締/.exec(rule), sEnd=/末締/.test(rule);
  var pm=/(翌々々|翌々|翌)月(末|(\d+)日)/.exec(rule);
  if(!(sm||sEnd)||!pm) return null;
  return {cd:sEnd?31:+sm[1], add:pm[1]==='翌'?1:pm[1]==='翌々'?2:3, pd:pm[2]==='末'?31:+pm[3]};
}
/* その日を含む締め（その日が締め日を過ぎていたら翌月の締め） */
function closeFor(r,d){
  var y=d.getFullYear(), m=d.getMonth();
  if(d.getDate()>Math.min(r.cd,endOf(y,m).getDate())) m+=1;
  var e=endOf(y,m); return new Date(e.getFullYear(),e.getMonth(),Math.min(r.cd,e.getDate()));
}
function payFor(r,close){
  var e=endOf(close.getFullYear(),close.getMonth()+r.add);
  return new Date(e.getFullYear(),e.getMonth(),Math.min(r.pd,e.getDate()));
}
/* 請求書を inv の日に出したとき：{close:締め日, pay:入金予定日}。読めなければ null */
function invoice(rule,inv,hit){
  var r=parse(rule); if(!r||!inv) return null; hit=Math.max(0,+hit||0);
  if(r.after) return {close:null, pay:addD(inv,r.after)};
  var c=closeFor(r,addD(inv,hit)); return {close:c, pay:payFor(r,c)};
}
/* 今日（today）の時点で：次の締め・いつまでに出せば間に合うか・今日出した場合／締めを過ぎた場合の入金日 */
function due(rule,hit,today){
  var r=parse(rule); if(!r) return null; hit=Math.max(0,+hit||0); today=day0(today);
  if(r.after) return {after:r.after, payToday:addD(today,r.after)};
  var c0=closeFor(r,addD(today,hit)), send=addD(c0,-hit), c1=closeFor(r,addD(c0,1));
  return {close:c0, sendBy:send, days:Math.round((send-today)/864e5), payToday:payFor(r,c0), close2:c1, payLate:payFor(r,c1)};
}
/* 元請の締め・入金日と必着日数（客先登録。無ければ物件の支払条件そのものを読んでみる） */
var norm=function(s){ return String(s||'').normalize('NFKC').replace(/株式会社|有限会社|\(株\)|\(有\)|\s/g,''); };
function motoRule(moto,sh){
  var list=[];
  try{ list=window.nnMaster?nnMaster.tokuiLoad().moto:[]; }catch(e){ list=[]; }
  var t=(list||[]).filter(function(x){ return x&&norm(x.name)===norm(moto); })[0];
  if(t&&parse(t.nyukin)) return {rule:t.nyukin, hit:Math.max(0,+t.hitchaku||0), src:'客先登録'};
  if(parse(sh)) return {rule:sh, hit:t?Math.max(0,+t.hitchaku||0):0, src:'支払条件'};
  return {rule:t?t.nyukin||'':'', hit:t?Math.max(0,+t.hitchaku||0):0, src:t?'客先登録':''};
}
/* 未請求の物件の並べ替え用の行（締め日が近い順・締めなし・読めないもの の順） */
function rows(items,today){
  return (items||[]).map(function(it){ var d=due(it.rule,it.hit,today); return Object.assign({},it,{d:d}); })
    .sort(function(a,b){
      var ka=a.d?(a.d.after?1:0):2, kb=b.d?(b.d.after?1:0):2; if(ka!==kb) return ka-kb;
      if(ka===0){ var x=a.d.sendBy-b.d.sendBy; if(x) return x; }
      return String(a.fb||'').localeCompare(String(b.fb||''))||((+a.id||0)-(+b.id||0));   /* 同点を残さない */
    });
}
var CACHE='nn_seikyu_due_v1';
window.nnSeikyu={parse:parse, invoice:invoice, due:due, motoRule:motoRule, rows:rows, iso:iso, fromIso:fromIso, addD:addD, CACHE:CACHE};
})();
