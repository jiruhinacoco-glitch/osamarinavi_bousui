const fs=require('fs');
let ng=0;
function ok(cond,msg){ console.log((cond?'○':'★NG')+' '+msg); if(!cond)ng++; }
const css=fs.existsSync('phone_portrait.css')?fs.readFileSync('phone_portrait.css','utf8'):'';
const pages=['index','kirokucho_demo','zumen_sekisan','genba_map_v36','hacchu','kokkosho','camera','library','shiyo_toroku','yougo','zairyo_toroku'].map(x=>x+'.html');
ok(css.includes('orientation:portrait')&&css.includes('grid-template-columns:repeat(5'), 'スマホ縦画面の下部ナビを5列×2段に固定');
ok(css.includes('env(safe-area-inset-top')&&css.includes('min-height'), '上帯をDynamic Islandより下に置き、押しやすい高さを確保');
ok(css.includes('header .hicon img')&&css.includes('header h1 img'), '上帯のページアイコンと題名を拡大');
ok(pages.every(f=>fs.readFileSync(f,'utf8').includes('phone_portrait.css')), '全11ページが縦画面レイアウトを読み込む');
const kk=fs.readFileSync('kokkosho.html','utf8');
ok(kk.includes("screen.width<=screen.height?760:980"), '国交省仕様の縦一覧を980pxから760pxへ拡大');
process.exitCode=ng?1:0;
