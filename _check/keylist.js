/* 保存キーが「設定→データの書き出し／読み込み」の一覧（index.html の LIST）に
   もれなく入っているか（§46）。もれると引っ越し・機種変更でそのデータだけ消える。
   ★ブラウザは使わない静的な検査。使い方: node _check/keylist.js */
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const PAGES=fs.readdirSync(ROOT).filter(f=>/\.html$/.test(f) && !/^_/.test(f));
const JSF =fs.readdirSync(ROOT).filter(f=>/\.js$/.test(f) && !/^_/.test(f));
/* キーではないもの（保存の中身の目印・ファイル名・書きかけの前置き） */
const SKIP=new Set(['nn_backup','osamari_','osamarinavi_data_']);
/* わざと入れていないもの（そのデータ自身ではなく「いつ書き出したか」の控え） */
const OK_OUT=new Set(['nn_bk_last','nn_bk_snooze']);

const found=new Map();
[...PAGES,...JSF].forEach(f=>{
  const s=fs.readFileSync(path.join(ROOT,f),'utf8');
  (s.match(/'(nn_|osamari)[A-Za-z0-9_]+'/g)||[]).forEach(m=>{
    const k=m.slice(1,-1);
    if(SKIP.has(k))return;
    if(!found.has(k))found.set(k,f);
  });
});
const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const m=idx.match(/const LIST\s*=\s*\[([\s\S]*?)\n\s*\];/);
if(!m){ console.log('★NG index.html の LIST が見つからない'); process.exit(1); }
const listed=new Set((m[1].match(/'[A-Za-z0-9_]+'/g)||[]).map(x=>x.slice(1,-1)));

let ng=0;
[...found.keys()].sort().forEach(k=>{
  if(listed.has(k)||OK_OUT.has(k))return;
  console.log('★NG 書き出しの一覧に無い保存キー: '+k+'  （'+found.get(k)+'）');
  ng++;
});
console.log('     見つけた保存キー '+found.size+'／一覧に '+listed.size+'件');
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
process.exit(ng?1:0);
