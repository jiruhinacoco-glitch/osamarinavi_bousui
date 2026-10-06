/* ★2026-10-06a 登録デモ（ホームの「登録デモ」ボタン）。
   ・本番の認証ではない。入力はこの端末の中（localStorage）だけに保存し、外へは送らない。
   ・それでも本番と同じ考え方で作る：パスワードはそのまま保存せず「元に戻せない形（PBKDF2）」にして保存／
     確認コードで本人確認／5回まちがえたら一時ロック／一定時間さわらなければ自動ログアウト。
   ・見た目は現場記録帳の編集画面（緑の見出し帯・クリーム地・オレンジの決定ボタン）に合わせる。 */
(function(){
  const KEY='nn_auth_demo_v1';     /* アカウント（パスワードは変換後の値だけ） */
  const SK='nn_auth_sess';         /* ログイン中の印（sessionStorage＝タブを閉じると消える） */
  const ITER=600000;               /* 変換のくり返し回数（多いほど総当たりに強い） */
  const IDLE=30*60*1000;           /* 30分さわらなければ自動ログアウト */
  const MAXFAIL=5, LOCKMS=60*1000; /* 5回まちがえたら60秒ロック */
  const WEAK=['password','password1','12345678','123456789','1234567890','qwerty','qwertyuiop','abc12345','111111111','iloveyou','admin123','letmein','osamari','bousui','sapporo'];

  /* ---------- 保存（読み書きとも守る） ---------- */
  function load(){ try{ const v=JSON.parse(localStorage.getItem(KEY)||'{}'); return (v&&typeof v==='object'&&!Array.isArray(v)&&v.users&&typeof v.users==='object')?v:{users:{}}; }catch(e){ return {users:{}}; } }
  function save(db){ try{ localStorage.setItem(KEY,JSON.stringify(db)); return true; }catch(e){ return false; } }
  function sess(){ try{ const s=JSON.parse(sessionStorage.getItem(SK)||'null'); if(!s||!s.id) return null; if(Date.now()-s.at>IDLE){ sessionStorage.removeItem(SK); return null; } return s; }catch(e){ return null; } }
  function setSess(id){ try{ sessionStorage.setItem(SK,JSON.stringify({id,at:Date.now()})); }catch(e){} }
  function touch(){ const s=sess(); if(s) setSess(s.id); }
  function logout(){ try{ sessionStorage.removeItem(SK); }catch(e){} }

  /* ---------- 文字・暗号の道具 ---------- */
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const b64=u=>btoa(String.fromCharCode(...new Uint8Array(u)));
  const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  const canCrypto=()=>!!(window.crypto&&crypto.subtle&&window.isSecureContext);
  async function derive(pw,salt,iter){
    const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw.normalize('NFKC')),'PBKDF2',false,['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:iter},k,256));
  }
  function same(a,b){ if(a.length!==b.length) return false; let d=0; for(let i=0;i<a.length;i++) d|=a[i]^b[i]; return d===0; } /* 比べる時間を一定に */
  function code6(){ const u=new Uint32Array(1); crypto.getRandomValues(u); return String(u[0]%1000000).padStart(6,'0'); }

  /* ---------- パスワードの強さ ---------- */
  function rules(pw,id,mail){
    const low=pw.toLowerCase(), kinds=[/[a-z]/,/[A-Z]/,/[0-9]/,/[^A-Za-z0-9]/].filter(r=>r.test(pw)).length;
    const r=[
      {ok:pw.length>=12, t:'12文字以上'},
      {ok:kinds>=2, t:'英字・数字・記号のうち2種類以上'},
      {ok:!!pw && !(id&&low.includes(id.toLowerCase())) && !(mail&&low.includes(mail.split('@')[0].toLowerCase())), t:'IDやメールの文字を含まない'},
      {ok:!!pw && !WEAK.some(w=>low.includes(w)) && !/(.)\1{3,}/.test(pw), t:'よくある並び（password・1234…）ではない'},
    ];
    const score=r.filter(x=>x.ok).length+(pw.length>=16?1:0)+(kinds>=3?1:0);
    return {r,score,pass:r.every(x=>x.ok)};
  }

  /* ---------- 見た目 ---------- */
  const st=document.createElement('style');
  st.id='nn-auth-demo';
  st.textContent=`
  #authBtn{display:flex; align-items:center; gap:8px; margin-top:6px; cursor:pointer;
    font:inherit; text-align:left; padding:7px 13px 7px 9px; border-radius:4px;
    border:1.5px solid #b35f00; color:#fff;
    background:linear-gradient(#ff9d1e 0%,#ff9d1e 46%,#e07800 47%,#e07800 100%);
    box-shadow:0 1px 0 rgba(255,255,255,.28) inset, 0 2px 5px rgba(0,0,0,.28);}
  #authBtn .ic{width:40px; height:40px; display:flex; align-items:center; justify-content:center; font-size:26px; line-height:1;}
  #authBtn .tx{font-size:13px; font-weight:900; letter-spacing:.04em; line-height:1.25; text-shadow:0 1px 0 rgba(0,0,0,.3);}
  #authBtn .tx small{display:block; font-size:9.5px; font-weight:700; opacity:.92; letter-spacing:.02em;}
  #authBtn:active{filter:brightness(.92);}
  #nnAuthBg{position:fixed; inset:0; background:rgba(0,0,0,.45); display:none; align-items:center; justify-content:center; z-index:3000; padding:12px; box-sizing:border-box;}
  #nnAuthBg.open{display:flex;}
  #nnAuthBg .nnau{width:min(460px,100%); max-height:calc(100% - 8px); overflow:auto; box-sizing:border-box;
    background:#fffdf4; border:2px solid #1c6b3c; border-radius:10px; padding:13px 15px; color:#222;
    box-shadow:0 3px 0 #124a28, 0 14px 32px rgba(0,0,0,.3); font-family:inherit;}
  #nnAuthBg h3{display:flex; align-items:center; font-size:13.5px; font-weight:700; color:#fff; margin:-13px -15px 10px; letter-spacing:.04em;
    background:repeating-linear-gradient(-55deg, rgba(255,255,255,.04) 0 12px, transparent 12px 24px), linear-gradient(180deg,#48c274,#2e9e58);
    padding:7px 8px 7px 15px; border-bottom:2px solid #124a28; border-radius:7px 7px 0 0; text-shadow:0 1px 1px rgba(18,74,40,.55); position:sticky; top:-13px; z-index:2;}
  #nnAuthBg h3 .demo{margin-left:8px; font-size:10px; background:#fff; color:#e07800; border-radius:3px; padding:1px 5px; text-shadow:none; font-weight:900;}
  #nnAuthBg h3 .x{margin-left:auto; width:26px; height:26px; border:1.5px solid #124a28; border-radius:6px; background:#fff; color:#1c6b3c; font-weight:900; font-size:15px; line-height:1; cursor:pointer; font-family:inherit;}
  #nnAuthBg .nnnote{font-size:11.5px; line-height:1.55; background:#fff6e0; border:1px solid #f0c27a; border-radius:6px; padding:6px 9px; color:#6b4a12;}
  #nnAuthBg .tabs{display:flex; gap:6px; margin:10px 0 2px;}
  #nnAuthBg .tabs button{flex:1; padding:6px 0; font:inherit; font-size:13px; font-weight:700; border:1.5px solid #a9a99f; border-radius:8px 8px 0 0; background:linear-gradient(180deg,#f2f2ee,#dcdcd4); color:#555; cursor:pointer;}
  #nnAuthBg .tabs button.on{background:linear-gradient(180deg,#48c274,#2e9e58); border-color:#124a28; color:#fff; text-shadow:0 1px 1px rgba(18,74,40,.55);}
  #nnAuthBg label{display:block; font-size:12.5px; font-weight:700; margin:8px 0 2px; color:#4a5a4e;}
  #nnAuthBg label .req{color:#b0392f; font-size:10.5px; margin-left:4px;}
  #nnAuthBg input[type=text],#nnAuthBg input[type=email],#nnAuthBg input[type=password]{width:100%; box-sizing:border-box; height:34px; border:1.5px solid #b9c4b4; border-radius:7px; padding:0 10px; font:inherit; font-size:16px; background:#fff; box-shadow:inset 0 2px 4px rgba(0,0,0,.07);}
  #nnAuthBg input:focus{border-color:#2e9e58; outline:none;}
  #nnAuthBg .pw{position:relative;}
  #nnAuthBg .pw input{padding-right:58px;}
  #nnAuthBg .pw .eye{position:absolute; right:4px; top:4px; height:26px; padding:0 8px; font:inherit; font-size:11px; font-weight:700; border:1px solid #b9c4b4; border-radius:5px; background:#f4f6f1; color:#1c6b3c; cursor:pointer;}
  #nnAuthBg .meter{height:6px; background:#e6e9e2; border-radius:3px; margin-top:5px; overflow:hidden;}
  #nnAuthBg .meter i{display:block; height:100%; width:0; transition:width .15s;}
  #nnAuthBg .mlbl{font-size:11px; font-weight:700; margin-top:2px;}
  #nnAuthBg ul.rl{list-style:none; margin:4px 0 0; padding:0; font-size:11.5px; line-height:1.6;}
  #nnAuthBg ul.rl li::before{content:'・'; }
  #nnAuthBg ul.rl li.ok{color:#1c6b3c;} #nnAuthBg ul.rl li.ok::before{content:'✓ '; font-weight:900;}
  #nnAuthBg ul.rl li.ng{color:#8a8a80;}
  #nnAuthBg .chk{display:flex; align-items:flex-start; gap:6px; font-size:12px; margin-top:10px; font-weight:500; color:#333;}
  #nnAuthBg .chk input{margin-top:2px;}
  #nnAuthBg .err{color:#b0392f; font-size:12px; font-weight:700; margin-top:8px; min-height:1em;}
  #nnAuthBg .btns{display:flex; gap:8px; justify-content:flex-end; margin-top:13px; flex-wrap:wrap;}
  #nnAuthBg .btns button{font:inherit; font-size:13.5px; cursor:pointer; border-radius:8px; font-weight:700;}
  #nnAuthBg .btns .cancel{background:linear-gradient(180deg,#f2f2ee,#dcdcd4); border:1.5px solid #a9a99f; padding:6px 13px; color:#333; box-shadow:inset 0 1px 0 rgba(255,255,255,.8), 0 2px 0 #8b8b81;}
  #nnAuthBg .btns .ok{background:linear-gradient(180deg,#ff9d1e,#e07800); color:#fff; border:1.5px solid #b35f00; padding:6px 17px; letter-spacing:.02em; text-shadow:0 1px 0 rgba(0,0,0,.3); box-shadow:inset 0 1px 0 rgba(255,255,255,.4), 0 2px 0 #b35f00;}
  #nnAuthBg .btns .danger{background:#fff; color:#b0392f; border:1.5px solid #b0392f; padding:6px 12px; box-shadow:0 2px 0 #8c2c1e;}
  #nnAuthBg .btns button:active{transform:translateY(2px); box-shadow:none;}
  #nnAuthBg .btns button:disabled{opacity:.55; cursor:default; transform:none;}
  #nnAuthBg .mail{border:1.5px dashed #2e9e58; background:#fff; border-radius:8px; padding:8px 10px; font-size:12px; line-height:1.6; margin-top:8px;}
  #nnAuthBg .mail b.cd{font-size:22px; letter-spacing:.25em; color:#1c6b3c; display:block; text-align:center; margin:4px 0;}
  #nnAuthBg input.code{font-size:22px!important; letter-spacing:.3em; text-align:center; height:42px!important;}
  #nnAuthBg .card{border:1.5px solid #b9c4b4; border-radius:8px; background:#fff; padding:8px 11px; margin-top:8px; font-size:13px; line-height:1.7;}
  #nnAuthBg .card .k{display:inline-block; min-width:7.5em; color:#58665c; font-size:12px; font-weight:700;}
  #nnAuthBg .sec{border-top:1px dashed #c2ccbc; margin-top:12px; padding-top:8px;}
  #nnAuthBg .sec h5{margin:0 0 4px; font-size:12.5px; color:#1c6b3c;}
  #nnAuthBg pre.raw{font-size:10.5px; line-height:1.45; background:#f4f6f1; border:1px solid #d5dccf; border-radius:6px; padding:6px 8px; white-space:pre-wrap; overflow-wrap:anywhere; margin:4px 0 0; max-height:180px; overflow:auto;}
  #nnAuthBg .tip{font-size:11.5px; line-height:1.6; color:#4a5a4e; margin:4px 0 0; padding-left:1.2em;}
  #nnAuthBg .busy{font-size:12px; color:#1c6b3c; font-weight:700; margin-top:8px;}
  `;
  document.head.appendChild(st);

  /* ---------- ホームのボタン ---------- */
  function paintBtn(){
    const b=document.getElementById('authBtn'); if(!b) return;
    const s=sess(), u=s&&load().users[s.id];
    b.querySelector('.tx').innerHTML=u?`ログイン中<small>${esc(u.name)} さん（デモ）</small>`:`登録デモ<small>ID・パスワード作成</small>`;
  }

  /* ---------- 画面 ---------- */
  let bg=null, view='reg', pending=null;
  function shell(){
    if(bg) return bg;
    bg=document.createElement('div'); bg.id='nnAuthBg';
    bg.innerHTML=`<div class="nnau" role="dialog" aria-modal="true" aria-labelledby="nnAuthTtl">
      <h3 id="nnAuthTtl"><span>アカウント</span><span class="demo">DEMO</span><button type="button" class="x" aria-label="閉じる">×</button></h3>
      <div class="nnnote">これは<b>お試し版</b>です。入力した内容は<b>この端末の中だけ</b>に保存され、外へは送られません。<b>普段お使いのパスワードは入れないでください。</b></div>
      <div class="tabs"><button type="button" data-t="reg">新規登録</button><button type="button" data-t="login">ログイン</button></div>
      <form class="body" novalidate autocomplete="on" onsubmit="return false"></form></div>`;
    bg.querySelector('.x').onclick=close;
    /* 入力欄で Enter ＝ その画面の決定ボタン */
    bg.querySelector('.body').addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.tagName==='INPUT'&&e.target.type!=='checkbox'&&!e.isComposing){ e.preventDefault(); const g=bg.querySelector('#au_go'); if(g&&!g.disabled) g.click(); } });
    bg.addEventListener('pointerdown',e=>{ if(e.target===bg) bg.dataset.down='1'; else delete bg.dataset.down; });
    bg.addEventListener('click',e=>{ if(e.target===bg&&bg.dataset.down) close(); });
    bg.querySelectorAll('.tabs button').forEach(t=>t.onclick=()=>{ view=t.dataset.t; render(); });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&bg.classList.contains('open')) close(); });
    document.body.appendChild(bg);
    return bg;
  }
  function close(){ if(bg) bg.classList.remove('open'); paintBtn(); }
  function open(){
    shell(); const s=sess();
    view = s&&load().users[s.id] ? 'me' : (pending?'verify':(Object.keys(load().users).length?'login':'reg'));
    render(); bg.classList.add('open');
    const f=bg.querySelector('.body input'); if(f&&!(document.documentElement.getAttribute('data-nnphone')==='1')) f.focus();
  }
  function render(){
    const body=bg.querySelector('.body'), tabs=bg.querySelector('.tabs');
    tabs.style.display=(view==='me'||view==='verify')?'none':'';
    tabs.querySelectorAll('button').forEach(t=>t.classList.toggle('on',t.dataset.t===view));
    bg.querySelector('#nnAuthTtl span').textContent={reg:'アカウント登録',login:'ログイン',verify:'メールの確認',me:'マイアカウント'}[view];
    if(!canCrypto()&&view!=='me'){ body.innerHTML='<p class="err">この画面は https のページでのみ動きます（安全な変換の仕組みが使えないため）。</p>'; return; }
    ({reg:vReg,login:vLogin,verify:vVerify,me:vMe})[view](body);
    touch();
  }
  const pwField=(id,ph,ac)=>`<div class="pw"><input type="password" id="${id}" autocomplete="${ac}" placeholder="${ph}" maxlength="128"><button type="button" class="eye" data-for="${id}">表示</button></div>`;
  function wireEyes(body){ body.querySelectorAll('.eye').forEach(b=>b.onclick=()=>{ const i=body.querySelector('#'+b.dataset.for); const sh=i.type==='password'; i.type=sh?'text':'password'; b.textContent=sh?'隠す':'表示'; }); }

  /* 新規登録 */
  function vReg(body){
    body.innerHTML=`
      <label>会社名<span class="req">必須</span></label><input type="text" id="au_co" autocomplete="organization" maxlength="60" placeholder="例）株式会社〇〇防水">
      <label>お名前<span class="req">必須</span></label><input type="text" id="au_nm" autocomplete="name" maxlength="40" placeholder="例）納まり 太郎">
      <label>メールアドレス<span class="req">必須</span></label><input type="email" id="au_ml" autocomplete="email" maxlength="120" placeholder="例）taro@example.com">
      <label>ログインID<span class="req">必須</span><small style="font-weight:500;color:#8a8a80;margin-left:6px">半角英数・4〜20文字</small></label><input type="text" id="au_id" autocomplete="username" maxlength="20" autocapitalize="off" spellcheck="false" placeholder="例）miura01">
      <label>パスワード<span class="req">必須</span></label>${pwField('au_pw','12文字以上','new-password')}
      <div class="meter"><i></i></div><div class="mlbl"></div><ul class="rl"></ul>
      <label>パスワード（確認）<span class="req">必須</span></label>${pwField('au_pw2','もう一度入力','new-password')}
      <label class="chk"><input type="checkbox" id="au_ok"><span>利用規約とプライバシーポリシー（デモのため本文なし）に同意します</span></label>
      <div class="err" id="au_err"></div>
      <div class="btns"><button type="button" class="cancel" data-act="close">キャンセル</button><button type="button" class="ok" id="au_go">登録する</button></div>`;
    wireEyes(body);
    body.querySelector('[data-act=close]').onclick=close;
    const $=s=>body.querySelector(s), pw=$('#au_pw'), meter=$('.meter i'), lbl=$('.mlbl'), rl=$('.rl');
    function upd(){
      const R=rules(pw.value,$('#au_id').value.trim(),$('#au_ml').value.trim());
      rl.innerHTML=R.r.map(x=>`<li class="${x.ok?'ok':'ng'}">${x.t}</li>`).join('');
      const lv=!pw.value?0:!R.pass?1:R.score>=6?3:2;
      meter.style.width=['0%','33%','66%','100%'][lv]; meter.style.background=['#ccc','#d9534f','#f0a020','#2e9e58'][lv];
      lbl.textContent=['','弱い：条件を満たしていません','ふつう：使えます','強い：とても安全です'][lv]; lbl.style.color=meter.style.background;
    }
    ['#au_pw','#au_id','#au_ml'].forEach(s=>$(s).addEventListener('input',upd)); upd();
    $('#au_go').onclick=async()=>{
      const err=$('#au_err'), co=$('#au_co').value.trim(), nm=$('#au_nm').value.trim(), ml=$('#au_ml').value.trim(), id=$('#au_id').value.trim(), p1=pw.value, p2=$('#au_pw2').value;
      err.textContent='';
      if(!co||!nm||!ml||!id||!p1) return err.textContent='必須の項目が空いています。';
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ml)) return err.textContent='メールアドレスの形が正しくありません。';
      if(!/^[A-Za-z0-9_.-]{4,20}$/.test(id)) return err.textContent='ログインIDは半角英数（_ . - も可）で4〜20文字にしてください。';
      const db=load(); if(db.users[id.toLowerCase()]) return err.textContent='このログインIDはすでに使われています。';
      if(Object.values(db.users).some(u=>u.email.toLowerCase()===ml.toLowerCase())) return err.textContent='このメールアドレスはすでに登録されています。';
      if(!rules(p1,id,ml).pass) return err.textContent='パスワードが条件を満たしていません（下の✓を全部そろえてください）。';
      if(p1!==p2) return err.textContent='確認用のパスワードが一致しません。';
      if(!$('#au_ok').checked) return err.textContent='利用規約への同意にチェックを入れてください。';
      const go=$('#au_go'); go.disabled=true; go.textContent='安全な形に変換中…';
      try{
        const salt=crypto.getRandomValues(new Uint8Array(16)), h=await derive(p1,salt,ITER);
        pending={user:{id:id.toLowerCase(),idShow:id,company:co,name:nm,email:ml,salt:b64(salt),hash:b64(h),iter:ITER,algo:'PBKDF2-SHA256',created:new Date().toISOString(),fails:0,lockUntil:0},code:code6(),exp:Date.now()+10*60*1000,tries:0};
        view='verify'; render();
      }catch(e){ go.disabled=false; go.textContent='登録する'; err.textContent='変換に失敗しました：'+e.message; }
    };
  }

  /* メールの確認（デモ：届いたメールを画面に出す） */
  function vVerify(body){
    if(!pending||Date.now()>pending.exp){ pending=null; view='reg'; return render(); }
    body.innerHTML=`
      <p style="font-size:12.5px;line-height:1.6;margin:0">${esc(pending.user.email)} に6けたの確認コードを送りました。<br>コードを入れると登録が完了します（10分間有効）。</p>
      <div class="mail">📩 <b>届いたメール（デモ）</b><br>件名：【納まりナビ】確認コードのお知らせ<b class="cd">${pending.code}</b><span style="font-size:11px;color:#8a8a80">本番では、ここは本人のメールにだけ届きます。</span></div>
      <label>確認コード</label><input type="text" id="au_cd" class="code" inputmode="numeric" data-nopad autocomplete="one-time-code" maxlength="6" placeholder="------">
      <div class="err" id="au_err"></div>
      <div class="btns"><button type="button" class="cancel" id="au_back">やり直す</button><button type="button" class="ok" id="au_go">確認する</button></div>`;
    body.querySelector('#au_back').onclick=()=>{ pending=null; view='reg'; render(); };
    body.querySelector('#au_go').onclick=()=>{
      const err=body.querySelector('#au_err'), v=body.querySelector('#au_cd').value.replace(/\D/g,'');
      if(Date.now()>pending.exp){ pending=null; view='reg'; render(); return; }
      if(v!==pending.code){ pending.tries++; if(pending.tries>=MAXFAIL){ pending=null; view='reg'; render(); bg.querySelector('#au_err').textContent='確認コードを5回まちがえたため、登録をやり直してください。'; return; } err.textContent=`コードが違います（あと${MAXFAIL-pending.tries}回）。`; return; }
      const db=load(); db.users[pending.user.id]={...pending.user,verified:true};
      if(!save(db)){ err.textContent='保存できませんでした（端末の空き容量か、プライベートブラウズを確認してください）。'; return; }
      setSess(pending.user.id); db.users[pending.user.id].lastLogin=new Date().toISOString(); save(db);
      pending=null; view='me'; render(); paintBtn();
    };
  }

  /* ログイン */
  function vLogin(body){
    body.innerHTML=`
      <label>ログインID または メールアドレス</label><input type="text" id="au_id" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="120">
      <label>パスワード</label>${pwField('au_pw','','current-password')}
      <div class="err" id="au_err"></div>
      <div class="btns"><button type="button" class="cancel" data-act="close">キャンセル</button><button type="button" class="ok" id="au_go">ログイン</button></div>
      <div class="sec"><h5>パスワードを忘れたとき</h5><p class="tip" style="padding:0">本番では、登録メールに「再設定用のリンク」を送ります（このデモでは、アカウントを作り直してください）。</p></div>`;
    wireEyes(body);
    body.querySelector('[data-act=close]').onclick=close;
    const go=body.querySelector('#au_go'), err=body.querySelector('#au_err');
    go.onclick=async()=>{
      err.textContent='';
      const key=body.querySelector('#au_id').value.trim().toLowerCase(), pw=body.querySelector('#au_pw').value;
      if(!key||!pw) return err.textContent='IDとパスワードを入れてください。';
      const db=load(), u=db.users[key]||Object.values(db.users).find(x=>x.email.toLowerCase()===key);
      if(u&&u.lockUntil>Date.now()) return err.textContent=`まちがいが続いたため一時的にロック中です（あと${Math.ceil((u.lockUntil-Date.now())/1000)}秒）。`;
      go.disabled=true; go.textContent='確認中…';
      let okp=false;
      try{
        /* 存在しないIDでも同じだけ計算する＝「このIDは有る／無い」を時間差で見抜かれないように */
        const salt=u?unb64(u.salt):crypto.getRandomValues(new Uint8Array(16)), h=await derive(pw,salt,u?u.iter:ITER);
        okp=!!u&&same(h,unb64(u.hash));
      }catch(e){}
      go.disabled=false; go.textContent='ログイン';
      if(!okp){
        if(u){ u.fails=(u.fails||0)+1; if(u.fails>=MAXFAIL){ u.fails=0; u.lockUntil=Date.now()+LOCKMS; } save(db); }
        err.textContent='IDまたはパスワードが違います。'; /* どちらが違うかは言わない */
        return;
      }
      u.fails=0; u.lockUntil=0; u.prevLogin=u.lastLogin||''; u.lastLogin=new Date().toISOString(); save(db);
      setSess(u.id); view='me'; render(); paintBtn();
    };
  }

  /* ログイン後 */
  const fmt=s=>{ if(!s) return '—'; const d=new Date(s); return isNaN(d)?'—':`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
  function vMe(body){
    const s=sess(), db=load(), u=s&&db.users[s.id];
    if(!u){ view='login'; return render(); }
    const raw={...u}; delete raw.fails; delete raw.lockUntil;
    body.innerHTML=`
      <div class="card">
        <div><span class="k">お名前</span>${esc(u.name)} さん</div>
        <div><span class="k">会社名</span>${esc(u.company)}</div>
        <div><span class="k">ログインID</span>${esc(u.idShow||u.id)}</div>
        <div><span class="k">メール</span>${esc(u.email)} <span style="color:#1c6b3c;font-size:11px;font-weight:700">✓確認済み</span></div>
        <div><span class="k">前回のログイン</span>${fmt(u.prevLogin)}</div>
      </div>
      <p class="tip" style="padding:0;margin-top:6px">30分さわらないと自動でログアウトします。タブを閉じてもログアウトします。</p>
      <div class="sec"><h5>🔒 この端末に保存されている中身</h5>
        <p class="tip" style="padding:0">パスワードそのものは<b>どこにも保存されていません</b>。下の「hash」は元に戻せない形に変換した値で、ログインのたびに同じ変換をして一致するかだけを見ています。</p>
        <pre class="raw">${esc(JSON.stringify(raw,null,1))}</pre></div>
      <div class="btns"><button type="button" class="danger" id="au_del">アカウント削除</button><button type="button" class="cancel" id="au_out">ログアウト</button><button type="button" class="ok" data-act="close">閉じる</button></div>`;
    body.querySelector('[data-act=close]').onclick=close;
    body.querySelector('#au_out').onclick=()=>{ logout(); view='login'; render(); paintBtn(); };
    body.querySelector('#au_del').onclick=()=>{
      if(!confirm('このデモアカウントを削除します。よろしいですか？')) return;
      const d=load(); delete d.users[u.id]; save(d); logout(); view='reg'; render(); paintBtn();
    };
  }

  window.nnAuthOpen=open;
  ['pointerdown','keydown'].forEach(t=>document.addEventListener(t,()=>{ if(bg&&bg.classList.contains('open')) touch(); },{passive:true}));
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',paintBtn); else paintBtn();
})();
