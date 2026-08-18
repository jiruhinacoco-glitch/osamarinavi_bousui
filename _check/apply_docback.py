# -*- coding: utf-8 -*-
# 書類の別タブ（図面3種・工程表・物件報告書）に「← 戻る」ボタンを付ける。
# ホーム画面から起動したアプリはブラウザの戻るが無く、開いたら戻れなかった。
import io, sys

def patch(path, reps):
    s = io.open(path, encoding='utf-8', newline='').read().replace('\r\n', '\n')
    ok = True
    for old, new, name in reps:
        c = s.count(old)
        print(('OK  ' if c == 1 else '★NG ') + name + f'  一致{c}件')
        if c != 1:
            ok = False
    if not ok:
        sys.exit('中断: ' + path)
    for old, new, name in reps:
        s = s.replace(old, new)
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
    print('書き込み完了:', path)

# 帯用の戻る処理（'+' 連結の文字列版）。閉じる→履歴→元ページの3段構え。
BACKJS = (
    "      +'<script>var NN_BACK='+JSON.stringify(location.href)+';'\n"
    "      +'function nnDocBack(){'\n"
    "      +'try{window.close();}catch(e){}'\n"
    "      +'setTimeout(function(){'\n"
    "      +'if(window.closed)return;'\n"
    "      +'var did=false;'\n"
    "      +'try{if(history.length>1){did=true;history.back();}}catch(e){}'\n"
    "      +'setTimeout(function(){try{location.replace(NN_BACK);}catch(e){}}, did?600:0);'\n"
    "      +'},250);'\n"
    "      +'}'\n"
)

# ---------- 図面・積算（図面3種の帯） ----------
patch('/home/user/osamarinavi_bousui/zumen_sekisan.html', [
    ("      +'</style></head><body>'\n"
     "      +'<div id=\"nnbar\"><b>この図面は「よこ（'+(A3?'A3':'A4')+'横）」で印刷してください</b>'",
     "      +'</style></head><body>'\n"
     "      +'<div id=\"nnbar\"><button type=\"button\" onclick=\"nnDocBack()\">← 図面に戻る</button>'\n"
     "      +'<b>この図面は「よこ（'+(A3?'A3':'A4')+'横）」で印刷してください</b>'",
     'Z1 帯に戻るボタン'),
    ("      +'<script>(function(){'\n"
     "      +'var yoko=document.getElementById(\"pgYoko\").sheet, tate=document.getElementById(\"pgTate\").sheet;'",
     BACKJS +
     "      +'(function(){'\n"
     "      +'var yoko=document.getElementById(\"pgYoko\").sheet, tate=document.getElementById(\"pgTate\").sheet;'",
     'Z2 戻る処理'),
])

# ---------- 現場記録帳（工程表の帯） ----------
patch('/home/user/osamarinavi_bousui/kirokucho_demo.html', [
    ("      +'</style></head><body>'\n"
     "      +'<div id=\"nnbar2\"><b>この工程表は「よこ（A3横）」で印刷してください</b>'",
     "      +'</style></head><body>'\n"
     "      +'<div id=\"nnbar2\"><button type=\"button\" onclick=\"nnDocBack()\">← 記録帳に戻る</button>'\n"
     "      +'<b>この工程表は「よこ（A3横）」で印刷してください</b>'",
     'K1 帯に戻るボタン'),
    ("      +'<script>(function(){'\n"
     "      +'var yo=document.getElementById(\"pgYoko\").sheet, ta=document.getElementById(\"pgTate\").sheet;'",
     BACKJS +
     "      +'(function(){'\n"
     "      +'var yo=document.getElementById(\"pgYoko\").sheet, ta=document.getElementById(\"pgTate\").sheet;'",
     'K2 戻る処理'),
    # ---------- 物件報告書（帯そのものが無かった） ----------
    ("  </style></head><body>\n"
     "  <h1>${p.name}</h1><div class=\"sub\">${p.addr}　｜　${p.date}　｜　ステータス：${p.status}</div>",
     "  </style></head><body>\n"
     "  <div class=\"noprint\" style=\"position:sticky;top:0;z-index:9;margin:-28px -28px 18px;background:#1c6b3c;color:#fff;padding:9px 14px;display:flex;gap:10px;align-items:center;font-family:system-ui,-apple-system,sans-serif;\">\n"
     "    <button type=\"button\" onclick=\"nnDocBack()\" style=\"font:inherit;font-weight:800;padding:7px 14px;border:0;border-radius:7px;background:#fff;color:#1c6b3c;\">← 記録帳に戻る</button>\n"
     "    <button type=\"button\" onclick=\"print()\" style=\"font:inherit;font-weight:800;padding:7px 14px;border:0;border-radius:7px;background:#fff;color:#1c6b3c;\">🖨 印刷 / PDFに保存</button>\n"
     "  </div>\n"
     "  <script>var NN_BACK=${JSON.stringify(location.href)};\n"
     "  function nnDocBack(){try{window.close();}catch(e){}\n"
     "    setTimeout(function(){if(window.closed)return;var did=false;\n"
     "      try{if(history.length>1){did=true;history.back();}}catch(e){}\n"
     "      setTimeout(function(){try{location.replace(NN_BACK);}catch(e){}}, did?600:0);\n"
     "    },250);}<\\/script>\n"
     "  <h1>${p.name}</h1><div class=\"sub\">${p.addr}　｜　${p.date}　｜　ステータス：${p.status}</div>",
     'K3 報告書に帯を新設'),
])
print('すべて完了')
