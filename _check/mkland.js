/* よこ向きスマホ（iPhoneのノッチ 59pt）を再現したコピー _land.html を用意する。
   ★CLAUDE.md §7：よこ向きのiPhoneは左右に59ptの余白が入り、使える幅が 980→842px に減る。
     この40px弱の差で折り返しが起きるので、余白を入れないと実機の見え方を再現できない。
   ★2026-08-24q それまで各スクリプトは「誰かが先に作った _land.html」を当てにしていて、
     単独で走らせると 404 になり「showView is not defined」で丸ごと落ちていた。
     この小道具を先頭で呼べば、必ず自分で用意してから始められる。
   使い方: require('./mkland')();            // 現場記録帳から作る
           require('./mkland')('library.html');  // 別のページから作る */
const fs=require('fs');
const ROOT='/home/user/osamarinavi_bousui/';
module.exports=function mkland(src){
  src=src||'kirokucho_demo.html';
  let h=fs.readFileSync(ROOT+src,'utf8');
  h=h.split('env(safe-area-inset-left,0px)').join('59px')
     .split('env(safe-area-inset-right,0px)').join('59px')
     .split('env(safe-area-inset-left)').join('59px')
     .split('env(safe-area-inset-right)').join('59px');
  fs.writeFileSync(ROOT+'_land.html', h);
  return '_land.html';
};
