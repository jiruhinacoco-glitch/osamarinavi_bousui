/* ============================================================
   面（部位）の内訳 ― 試作データと共通の言い回し
   ★2026-08-15 屋根が1つではない物件（20面あるような大きな現場）の
     見せ方を試すためのもの。現場記録帳と現場マップの**両方**がこの
     1ファイルを読むので、数字と言い回しが食い違わない。
   ★いまは物件名をキーにしている（記録帳・マップとも同じ名前のため）。
     本番にするときは物件番号（J100 など）をキーにし、マップ側の
     BASE_SITES にも code:"J100" を持たせること（mapsync.py で作れる）。
   ============================================================ */
(function(){
  /* q＝数量／un＝単位（省略は㎡）／ko＝工法／sp＝仕様記号 */
  const F={
  "三井アウトレットパーク札幌北広島 屋上防水":[
    {n:"A棟 屋上",            ko:"塩ビシート 機械的固定工法", sp:"S-M1", q:640},
    {n:"B棟 屋上",            ko:"塩ビシート 機械的固定工法", sp:"S-M1", q:520},
    {n:"C棟 屋上",            ko:"塩ビシート 機械的固定工法", sp:"S-M1", q:480},
    {n:"フードコート屋根",    ko:"塩ビシート 機械的固定工法", sp:"S-M1", q:200},
    {n:"キャノピー（南）",    ko:"塩ビシート 機械的固定工法", sp:"S-M1", q:145},
    {n:"キャノピー（北）",    ko:"塩ビシート 機械的固定工法", sp:"S-M1", q:132},
    {n:"車寄せ屋根",          ko:"塩ビシート 機械的固定工法", sp:"S-M1", q:105},
    {n:"連絡通路①",          ko:"ウレタン塗膜 通気緩衝工法", sp:"X-1",  q:120},
    {n:"連絡通路②",          ko:"ウレタン塗膜 通気緩衝工法", sp:"X-1",  q:110},
    {n:"連絡通路③",          ko:"ウレタン塗膜 通気緩衝工法", sp:"X-1",  q:95},
    {n:"機械基礎まわり",      ko:"ウレタン塗膜 通気緩衝工法", sp:"X-1",  q:66},
    {n:"排煙窓まわり平場",    ko:"ウレタン塗膜 通気緩衝工法", sp:"X-1",  q:24},
    {n:"A棟 塔屋",            ko:"改質アスファルト 常温粘着工法", sp:"AS-J1", q:85},
    {n:"B棟 塔屋",            ko:"改質アスファルト 常温粘着工法", sp:"AS-J1", q:78},
    {n:"EVシャフト上部",      ko:"改質アスファルト 常温粘着工法", sp:"AS-J1", q:42},
    {n:"ハト小屋（8か所）",   ko:"改質アスファルト 常温粘着工法", sp:"AS-J1", q:36},
    {n:"荷捌きヤード庇",      ko:"超速硬化ウレタン 吹付工法", sp:"X-2H", q:88},
    {n:"サービスヤード屋根",  ko:"超速硬化ウレタン 吹付工法", sp:"X-2H", q:76},
    {n:"屋上駐車場スロープ",  ko:"超速硬化ウレタン 吹付工法", sp:"X-2H", q:58},
    {n:"ALC目地シール",       ko:"シーリング（変成シリコーン）", sp:"—", q:180, un:"m"}
  ],
  "東京流通センター 物流ビルB棟 屋上防水改修":[
    {n:"B棟 屋上（東区画）",  ko:"塩ビシート 機械的固定工法", sp:"S-M1", q:1250},
    {n:"B棟 屋上（西区画）",  ko:"塩ビシート 機械的固定工法", sp:"S-M1", q:1180},
    {n:"トラックバース庇",    ko:"超速硬化ウレタン 吹付工法", sp:"X-2H", q:420},
    {n:"塔屋・EV機械室",      ko:"改質アスファルト 常温粘着工法", sp:"AS-J1", q:260},
    {n:"連絡ブリッジ屋根",    ko:"ウレタン塗膜 通気緩衝工法", sp:"X-1",  q:190},
    {n:"ハト小屋・架台まわり",ko:"ウレタン塗膜 通気緩衝工法", sp:"X-1",  q:100}
  ]};
  window.NN_FACES=F;
  /* その物件の面の一覧（無ければ null） */
  window.nnFaceList=function(name){ const a=F[name]; return (a&&a.length)?a:null; };
  /* 合計（単位ごと）と、工法ごとの小計 */
  window.nnFaceSum=function(name){
    const a=window.nnFaceList(name); if(!a)return null;
    const units={}, kos=[];
    a.forEach(f=>{
      const u=f.un||'㎡';
      units[u]=(units[u]||0)+(+f.q||0);
      let k=kos.find(x=>x.ko===f.ko);
      if(!k){ k={ko:f.ko, sp:f.sp, un:u, q:0, n:0}; kos.push(k); }
      k.q+=(+f.q||0); k.n++;
    });
    kos.sort((x,y)=>y.q-x.q);
    return {faces:a.length, units, kos, main:kos[0]};
  };
  const num=v=>(+v||0).toLocaleString();
  /* 「3,100㎡（20面）」＋別単位があれば「＋シール180m」 */
  window.nnFaceQtyText=function(name){
    const s=window.nnFaceSum(name); if(!s)return null;
    const us=Object.keys(s.units);
    const head=num(s.units['㎡']!==undefined?s.units['㎡']:s.units[us[0]])+(s.units['㎡']!==undefined?'㎡':us[0]);
    const rest=us.filter(u=>u!=='㎡').map(u=>'＋'+num(s.units[u])+u).join('');
    return head+rest+'（'+s.faces+'面）';
  };
  /* 「塩ビシート 機械的固定工法 ほか4工法」 */
  window.nnFaceKoText=function(name){
    const s=window.nnFaceSum(name); if(!s)return null;
    return s.main.ko+(s.kos.length>1?' ほか'+(s.kos.length-1)+'工法':'');
  };
})();
