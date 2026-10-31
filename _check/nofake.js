/* デバッグ巡回（2026-10-31）：押しても何もしないのに「〜しました（デモ）」と出るボタンが無いこと（全ページの元の文を見る）。node _check/nofake.js */
const fs=require('fs'), path=require('path'), root=path.resolve(__dirname,'..');
const files=['index.html','kirokucho_demo.html','zumen_sekisan.html','genba_map_v36.html','hacchu.html','kokkosho.html','camera.html','library.html','shiyo_toroku.html','yougo.html','zairyo_toroku.html'];
let ng=0; const bad=[];
files.forEach(f=>{ const s=fs.readFileSync(path.join(root,f),'utf8'); const re=/toast\([^)]*(しました|します)[^)]*[（(]デモ[)）]/g; let m; while((m=re.exec(s))) bad.push(f+': '+m[0].slice(0,80)); });
console.log(bad.length?'★NG 押しても何もしない「（デモ）」のボタン '+JSON.stringify(bad):'○ 「〜しました（デモ）」と出るだけのボタンは無い'); if(bad.length) ng++;
console.log(ng?'★NG '+ng:'全部○');
