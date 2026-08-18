# 現場記録帳の改修（2026-08-13n）
# ①工法アイコンの画像枠（絵はこれから作るので枠だけ）
# ②メーカー名はすべて省略名に（田島ルーフィング→田島 など）
# ③パソコンのときだけ、保管済みの写真を10枚まで一覧に出す（＋「他」）
# ④提出書類に 図面／写真台帳／施工要領書 を追加
import io

P='/home/user/osamarinavi_bousui/kirokucho_demo.html'
s=io.open(P,encoding='utf-8',newline='').read()
n=0
def rep(a,b):
    global s,n
    assert s.count(a)==1,('一致しない: '+a[:90])
    s=s.replace(a,b); n+=1

# ---------------------------------------------------------------- ②メーカー省略名
# ★データそのものを省略名にする（表示のたびに変換すると、絞り込みの中身と食い違う）。
#   正式名は makerFull に残し、提出する書類（物件報告書）ではそちらを使う。
rep("""const props=RAW.map((d,i)=>{""",
"""/* ★2026-08-13n メーカーは省略名で表示する（本人の指示「メーカーの省略名にして、すべて」）。
   一覧のチップ・詳細・表・絞り込みメニューまで、全部この短い名前になる。
   ★正式名は makerFull に残してあり、元請へ出す「物件報告書」だけは正式名を使う。
   新しいメーカーを増やしたら、ここに1行足すこと（足さないとその会社だけ長いまま出る）。 */
const MK_ABBR={
  '田島ルーフィング':'田島', 'ディックプルーフィング':'ディック', 'アーキヤマデ':'ヤマデ',
  'AGCポリマー建材':'AGC', 'ロンシール工業':'ロンシール', 'ダイフレックス':'ダイフレックス',
  'オート化学工業':'オート化学', '早川ゴム':'早川ゴム', 'ロンプルーフ':'ロンプルーフ',
};
function mkShort(v){ return v ? (MK_ABBR[v]||v) : v; }
const props=RAW.map((d,i)=>{""")

rep("    moto:d.e, tantou:'', shiire:d.mk, shiireTan:'', maker:d.mk, sozai:d.sz,",
    "    moto:d.e, tantou:'', shiire:d.mk, shiireTan:'', maker:mkShort(d.mk), makerFull:d.mk, sozai:d.sz,")

# 新規・編集フォーム
rep("    status:st, stRaw, kouhou:ko, hou:HOU_MAP(ko), spec:CODE_MAP(ko), maker:mk[0], sozai:mk[1], shiire:mk[0],",
    "    status:st, stRaw, kouhou:ko, hou:HOU_MAP(ko), spec:CODE_MAP(ko), maker:mkShort(mk[0]), makerFull:mk[0], sozai:mk[1], shiire:mk[0],")

# 一覧カードでの工法の付け替え（その場編集）
rep("    const mk=KO_MASTER[val]; if(mk){p.maker=mk[0]; p.sozai=mk[1]; p.shiire=mk[0];}",
    "    const mk=KO_MASTER[val]; if(mk){p.maker=mkShort(mk[0]); p.makerFull=mk[0]; p.sozai=mk[1]; p.shiire=mk[0];}")

# 施工中の表：もう props 側が短い名前なのでそのまま出す
rep("""  const MK_ABBR={'田島ルーフィング':'田島','アーキヤマデ':'ヤマデ','ディックプルーフィング':'ディック','オート化学工業':'オート化学'};
""", "")
rep("    maker:{th:'<th>メーカー</th>',td:p=>`<td>${MK_ABBR[p.maker]||p.maker||'—'}</td>`},",
    "    maker:{th:'<th>メーカー</th>',td:p=>`<td>${p.maker||'—'}</td>`},")

# 元請へ出す物件報告書だけは正式名
rep("              ['工　　法', p.spec||'—'],['メーカー', p.maker||'—'],['進　　捗', (p.prog||0)+' %']];",
    "              ['工　　法', p.spec||'—'],['メーカー', p.makerFull||p.maker||'—'],['進　　捗', (p.prog||0)+' %']];")

# ---------------------------------------------------------------- ①工法アイコンの枠
rep("""        <span class="status stsel" data-f="status" title="タップで変更" style="background:${ST_COLOR[p.status]}">${p.status} ▾</span>
        <span class="pprofit">利益予定額：${pr!=null?yen(pr):'策定中'}</span>""",
"""        <span class="status stsel" data-f="status" title="タップで変更" style="background:${ST_COLOR[p.status]}">${p.status} ▾</span>
        ${window.nnKiconHtml?nnKiconHtml(p):''}
        <span class="pprofit">利益予定額：${pr!=null?yen(pr):'策定中'}</span>""")

# ---------------------------------------------------------------- ③保管写真の一覧（パソコンのみ）
rep("""      <div class="prow rtag">
        ${window.nnDefRow?nnDefRow(p,0):''}
        <span class="ebox pmemo" data-f="tb"><b>メモ</b><u>${p.tb?String(p.tb):''}</u></span>
      </div>
      </div>""",
"""      <div class="prow rtag">
        ${window.nnDefRow?nnDefRow(p,0):''}
        <span class="ebox pmemo" data-f="tb"><b>メモ</b><u>${p.tb?String(p.tb):''}</u></span>
      </div>
      ${window.nnShotRow?nnShotRow(p):''}
      </div>""")

# ---------------------------------------------------------------- ④提出書類3つ追加
rep("""          <button class="doc" onclick="nnDoc(${p.id},'other')" title="保管資料を開く"><b>📁</b><span>他資料</span></button>
        </div>""",
"""          <button class="doc" onclick="nnDoc(${p.id},'other')" title="保管資料を開く"><b>📁</b><span>他資料</span></button>
        </div>
        <div class="db">
          <button class="doc" onclick="nnDoc(${p.id},'zumen')" title="この物件の作成図面を開く"><b>📐</b><span>図面</span></button>
          <button class="doc" onclick="nnDoc(${p.id},'daicho')" title="施工写真台帳"><b>📷</b><span>写真台帳</span></button>
          <button class="doc" onclick="nnDoc(${p.id},'youryou')" title="施工要領書"><b>📘</b><span>施工要領書</span></button>
        </div>""")

# nnDoc の分岐を増やす
rep("""  if(kind==='mitsumori'){ toast('見積書は準備中です（図面・積算の数量から作る予定）'); return; }""",
"""  if(kind==='zumen'){ selectedId=pid; curTab='作成図面'; showView('list'); openDetailFull(); return; }
  if(kind==='photos'){ selectedId=pid; curTab='写真'; showView('list'); openDetailFull(); return; }
  if(kind==='mitsumori'){ toast('見積書は準備中です（図面・積算の数量から作る予定）'); return; }
  if(kind==='daicho'){ toast('写真台帳は準備中です（保管した現場写真を、部位・工程ごとに並べた台帳にする予定）'); return; }
  if(kind==='youryou'){ toast('施工要領書は準備中です（仕様登録の工程と、材料登録の材料から作る予定）'); return; }""")

io.open(P,'w',encoding='utf-8',newline='').write(s)
print('置換', n, '件')
