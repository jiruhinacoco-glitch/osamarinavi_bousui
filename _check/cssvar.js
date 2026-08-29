/* 予備値のない CSS 変数を使っていないか（全11ページ・ブラウザ不要）
   ★共通ヘッダー帯で「色は必ず var(--green-deep,#1c6b3c) のように予備値つきで書くこと」。
     現場マップは --green-deep を定義しておらず、予備値なしだと帯が真っ白になった。
   ★あわせて、共通8色（common.css）をページ側で上書きしていないかも見る
     （上書きすると「色は common.css の1箇所を変える」という決まりが崩れる）。
   使い方: node _check/cssvar.js */
const fs=require('fs'), path=require('path');
const R=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const PAGES=['index','kirokucho_demo','genba_map_v36','hacchu','kokkosho','camera','library',
             'zumen_sekisan','shiyo_toroku','zairyo_toroku','yougo'].map(x=>x+'.html');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
const css=R('common.css');
const common=[...css.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map(m=>m[1]);
const commonSet=new Set(common);
console.log('     common.css の共通色 '+commonSet.size+'種：'+[...commonSet].join(' '));

PAGES.forEach(f=>{
  const s=R(f);
  const defined=new Set([...s.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map(m=>m[1]));
  [...s.matchAll(/setProperty\(\s*['"](--[a-zA-Z0-9_-]+)/g)].forEach(m=>defined.add(m[1]));
  commonSet.forEach(v=>defined.add(v));
  const bad={};
  for(const m of s.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)\s*(,)?/g)){
    if(m[2]) continue;                       /* 予備値つきは合格 */
    if(!defined.has(m[1])) bad[m[1]]=(bad[m[1]]||0)+1;
  }
  ok(Object.keys(bad).length===0, f.padEnd(20)+'予備値なしの未定義変数なし '+
     (Object.keys(bad).length?JSON.stringify(bad):''));
});

/* common.css を読んでいるか。
   ★現場マップ（genba_map_v36）だけは昔から読んでおらず、自前の配色を持っている。
     読ませると緑の色味が変わる＝見た目が変わるので、指示なしには直さない（既知の例外）。 */
const NOCOMMON=new Set(['genba_map_v36.html']);
PAGES.forEach(f=>{
  const has=/href=["'](?:\.\/)?common\.css["']/.test(R(f));
  if(NOCOMMON.has(f)) ok(!has, f.padEnd(20)+'（既知の例外）common.css を読んでいない・自前の配色');
  else ok(has, f.padEnd(20)+'common.css を読んでいる');
});

/* 共通8色をページ側で上書きしていないか（:root で再定義していないか） */
PAGES.filter(f=>!NOCOMMON.has(f)).forEach(f=>{
  const s=R(f);
  const roots=[...s.matchAll(/:root\s*\{([\s\S]*?)\}/g)].map(m=>m[1]).join('\n');
  const over=[...new Set([...roots.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map(m=>m[1]))]
    .filter(v=>commonSet.has(v));
  ok(over.length===0, f.padEnd(20)+'共通色を :root で上書きしていない '+(over.length?over.join(','):''));
});
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
process.exit(ng?1:0);
