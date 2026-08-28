/* 用語集の「現場フレーズ」が欠けていないか（ブラウザを使わない静的な検査）
   ★訳が1つでも抜けていると、その言語のボタンを押したときに空っぽになる。
   使い方: node _check/phrase1.js */
const fs=require('fs'), path=require('path');
const s=fs.readFileSync(path.join(__dirname,'..','yougo.html'),'utf8');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};

const i=s.indexOf('const PH=[');
ok(i>0,'フレーズの一覧（PH）がある');
const j=s.indexOf('\n  ];', i);
const block=s.slice(i,j);
const items=block.match(/\{[^{}]*\}/gs)||[];
ok(items.length>=32,'フレーズが32件以上ある ('+items.length+'件)');

const need=['ja','en','vi','zh','id','c'];
const bad=[];
items.forEach(it=>{
  const keys=new Set([...it.matchAll(/(?:^|[\s,{])([a-z]{1,2}):\s*'/g)].map(m=>m[1]));
  const miss=need.filter(k=>!keys.has(k));
  if(miss.length){ const m=it.match(/ja:\s*'([^']*)'/); bad.push((m?m[1]:'?').slice(0,16)+'→'+miss.join(',')); }
});
ok(bad.length===0,'日本語＋4言語＋場面がすべてそろっている '+bad.slice(0,4).join(' / '));

/* 空の訳が無いか */
const empty=[];
items.forEach(it=>{ ['en','vi','zh','id'].forEach(k=>{
  const m=it.match(new RegExp(k+":\\s*'([^']*)'"));
  if(m && !m[1].trim()){ const j2=it.match(/ja:\s*'([^']*)'/); empty.push((j2?j2[1]:'?').slice(0,14)+'/'+k); }
});});
ok(empty.length===0,'空っぽの訳が無い '+empty.slice(0,4).join(' / '));

/* 場面の id が、上の CATS に定義されているか */
const k=s.indexOf('const CATS=[', s.indexOf('nn-phrase-js'));
const cb=s.slice(k, s.indexOf('];',k));
const defined=[...cb.matchAll(/id:\s*'([^']*)'/g)].map(m=>m[1]);
const used=[...new Set([...block.matchAll(/c:\s*'([^']*)'/g)].map(m=>m[1]))];
ok(defined.length>=6,'場面が6つ定義されている ('+defined.length+')');
ok(used.every(x=>defined.includes(x)),'使われている場面がすべて定義ずみ '+used.filter(x=>!defined.includes(x)).join(','));
ok(defined.every(x=>used.includes(x)),'定義した場面がすべて使われている '+defined.filter(x=>!used.includes(x)).join(','));

/* 読み上げの言語コード */
const lb=s.slice(s.indexOf('const LANGS=['), s.indexOf('];', s.indexOf('const LANGS=[')));
['en-US','vi-VN','zh-CN','id-ID'].forEach(c=>ok(lb.includes(c),'読み上げの言語コード '+c+' がある'));

console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
process.exit(ng?1:0);
