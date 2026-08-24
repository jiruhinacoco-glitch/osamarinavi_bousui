/* 「直す前のファイル」を用意する小道具（変更前と見くらべる検査のため）
   ★git の履歴から取り出して _before.html に書き出す。
     こうしておけば、検査が「誰かが先に作ってくれている」前提にならず、単独で走る。
   使い方: const F=require('./mkbefore')();                  // 図面・積算の HEAD 版
           const F=require('./mkbefore')('kirokucho_demo.html');
           const F=require('./mkbefore')('zumen_sekisan.html','HEAD~3');
   戻り値は '_before.html'（うまくいかなかったときは null）。 */
const {execSync}=require('child_process');
const ROOT='/home/user/osamarinavi_bousui';
module.exports=function mkbefore(src, ref){
  src=src||'zumen_sekisan.html'; ref=ref||'HEAD';
  try{
    execSync('git show '+ref+':'+src+' > '+ROOT+'/_before.html', {cwd:ROOT});
    return '_before.html';
  }catch(e){ console.log('（変更前のファイルを取り出せませんでした：'+String(e.message).slice(0,60)+'）'); return null; }
};
