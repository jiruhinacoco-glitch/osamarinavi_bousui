/* ============================================================
   ★2026-09-29h 写真の保存場所を IndexedDB へ（桑原建材ヒアリング②）
   ------------------------------------------------------------
   それまで写真は localStorage（端末全体で約5MB）に文字（dataURL）で入れていたので、
   数十枚で満杯になり、ほかのデータ（物件・図面）の保存まで失敗していた。
   ・写真は IndexedDB（数百MB〜）の 'nn_photos_v1' に入れる。1枚＝1件（ns＋id）。
   ・ns は今までの localStorage のキー名をそのまま使う（書き出しファイルの形を変えないため）。
       nn_zumen_photos_v1    … 図面・積算の現場写真ピン（id→{d,t,code,bukken,w,h,memo}）
       nn_kirokucho_photo_v1 … 現場記録帳の一覧カードの写真（物件コード→dataURL）
   ・load(ns)：localStorage に残っている写真を移し替え（入ったことを数えて確かめてから localStorage を消す）→ 全件を返す。
     IndexedDB が使えない端末では null（呼ぶ側は今までどおり localStorage で動く）。
   ・put/del は Promise<boolean>。容量不足は false と nnPhotos.FULL_MSG で知らせる（黙って消さない・§199）。
   ============================================================ */
(function(){ 'use strict';
if(window.nnPhotos) return;
var DBN='nn_photos_v1', ST='photos', dbp=null;
var NS=['nn_zumen_photos_v1','nn_kirokucho_photo_v1'];
function open(){
  if(dbp) return dbp;
  dbp=new Promise(function(res,rej){
    var q; try{ q=indexedDB.open(DBN,1); }catch(e){ rej(e); return; }
    q.onupgradeneeded=function(){ var s=q.result.createObjectStore(ST,{keyPath:'k'}); s.createIndex('ns','ns',{unique:false}); };
    q.onsuccess=function(){ res(q.result); }; q.onerror=function(){ rej(q.error); }; q.onblocked=function(){ rej(Error('blocked')); };
  });
  dbp.catch(function(){ dbp=null; });
  /* 端末が空き容量不足のときに勝手に消されないよう、長く残す許可を求める（断られても動く） */
  try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(function(){}); }catch(_){}
  return dbp;
}
var key=function(ns,id){ return ns+'\u0001'+id; };
function tx(mode,fn){ return open().then(function(d){ return new Promise(function(res,rej){
  var t=d.transaction(ST,mode), s=t.objectStore(ST), out=fn(s);
  t.oncomplete=function(){ res(out&&('result' in out)?out.result:true); };
  t.onerror=function(){ rej(t.error); }; t.onabort=function(){ rej(t.error||Error('abort')); };
}); }); }
function all(ns){ return tx('readonly',function(s){ return s.index('ns').getAll(ns); }).then(function(rs){
  var m={}; (rs||[]).forEach(function(r){ if(r&&typeof r.id==='string') m[r.id]=r.v; }); return m; }); }
/* localStorage → IndexedDB。読んだ形が違う保存は触らない（消さない） */
function migrate(ns){
  var raw=null; try{ raw=localStorage.getItem(ns); }catch(_){ return Promise.resolve(0); }
  if(raw==null) return Promise.resolve(0);
  var o=null; try{ o=JSON.parse(raw); }catch(_){ return Promise.resolve(0); }
  if(!o||typeof o!=='object'||Array.isArray(o)) return Promise.resolve(0);
  var ids=Object.keys(o).filter(function(k){ return k&&k.length<200; });
  return tx('readwrite',function(s){ ids.forEach(function(id){ s.put({k:key(ns,id), ns:ns, id:id, v:o[id]}); }); })
    .then(function(){ return all(ns); })
    .then(function(m){ var miss=ids.filter(function(id){ return !(id in m); });
      if(!miss.length){ try{ localStorage.removeItem(ns); }catch(_){} }   /* 全部入ったと確かめてから消す */
      return ids.length-miss.length; });
}
var loads={};
function load(ns){
  if(NS.indexOf(ns)<0) return Promise.resolve(null);
  if(!window.indexedDB) return Promise.resolve(null);
  return loads[ns]||(loads[ns]=migrate(ns).then(function(){ return all(ns); }).catch(function(){ loads[ns]=null; return null; }));
}
function isFull(e){ return !!e&&(e.name==='QuotaExceededError'||/quota/i.test(String(e.message||e))); }
var FULL_MSG='写真を保存する場所がいっぱいです。ホームの「設定」でデータを書き出してから、要らない写真を消してください。';
var last=null;
function put(ns,id,v){ return tx('readwrite',function(s){ s.put({k:key(ns,id), ns:ns, id:String(id), v:v}); }).then(function(){ return true; })
  .catch(function(e){ last=e; return false; }); }
function putMany(ns,map){ var ids=Object.keys(map||{}); if(!ids.length) return Promise.resolve(true);
  return tx('readwrite',function(s){ ids.forEach(function(id){ s.put({k:key(ns,id), ns:ns, id:id, v:map[id]}); }); }).then(function(){ return true; })
  .catch(function(e){ last=e; return false; }); }
function del(ns,ids){ ids=[].concat(ids||[]); if(!ids.length) return Promise.resolve(true);
  return tx('readwrite',function(s){ ids.forEach(function(id){ s.delete(key(ns,id)); }); }).then(function(){ return true; })
  .catch(function(e){ last=e; return false; }); }
/* 書き出し・読み込み用：ns ごとに、今までの localStorage と同じ形の JSON 文字列にする／戻す */
function exportAll(){
  return Promise.all(NS.map(function(ns){ return load(ns).then(function(m){ return [ns,m]; }); })).then(function(rs){
    var o={}; rs.forEach(function(r){ if(r[1]&&Object.keys(r[1]).length) o[r[0]]=JSON.stringify(r[1]); }); return o; });
}
function importOne(ns,json){
  var o=null; try{ o=JSON.parse(json); }catch(_){ return Promise.resolve(false); }
  if(!o||typeof o!=='object'||Array.isArray(o)) return Promise.resolve(false);
  return load(ns).then(function(m){ if(m===null) return false;
    return del(ns,Object.keys(m)).then(function(){ return putMany(ns,o); }).then(function(ok){ loads[ns]=null; return ok; }); });
}
window.nnPhotos={NS:NS, load:load, put:put, putMany:putMany, del:del, exportAll:exportAll, importOne:importOne,
  isFull:isFull, FULL_MSG:FULL_MSG, lastError:function(){ return last; }};
})();
