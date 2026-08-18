# 現場マップの BASE_SITES を、現場記録帳の RAW（100件）から作り直す。
# 座標は「およその位置」を入れておき、実機では住所からのジオコーディングで正確な位置に直る。
import io, json, re

raw = json.load(open('raw_new.json'))

# ステータスの対応：完成済→done／施工中→work／それ以外（契約済・見積済・調査済・引合い）→quote
ST = {'kan':'done','kou':'work','keiyaku':'quote','mit':'quote','chosa':'quote','hikiai':'quote'}

# 札幌の区ごとの中心（およそ）
WARD = {
 '中央区':(43.060,141.348),'北区':(43.090,141.340),'東区':(43.078,141.365),
 '白石区':(43.048,141.410),'豊平区':(43.030,141.380),'南区':(42.990,141.350),
 '西区':(43.075,141.302),'手稲区':(43.122,141.245),'厚別区':(43.037,141.475),'清田区':(42.980,141.445),
}
# 追加分は建物ごとの座標（およそ）
PLACE = {
 'フィール旭川':(43.7649,142.3600),'サイパル':(43.7539,142.3672),'大雪アリーナ':(43.7448,142.3565),
 'イオンモール旭川駅前':(43.7637,142.3585),'旭川市民文化会館':(43.7705,142.3648),
 '道の駅あさひかわ':(43.7469,142.3597),'旭川市中央図書館':(43.7729,142.3499),'旭川デザインセンター':(43.7890,142.4100),
 '苫小牧市民会館':(42.6389,141.5900),'イオンモール苫小牧':(42.6560,141.6300),
 '苫小牧市総合体育館':(42.6340,141.5960),'苫小牧港フェリーターミナル':(42.6335,141.6320),
 'とかちプラザ':(42.9180,143.2010),'帯広市民文化ホール':(42.9210,143.1980),'帯広の森体育館':(42.8960,143.1660),
 '函館アリーナ':(41.7810,140.7860),'函館市民会館':(41.7815,140.7845),'キラリス函館':(41.7737,140.7263),
 '恵庭市民会館':(42.8820,141.5780),'花ロードえにわ':(42.8600,141.5640),
 '千歳市民文化センター':(42.8200,141.6520),'レラ':(42.8140,141.6690),
 '三井アウトレットパーク札幌北広島':(42.9540,141.5140),'北広島市総合体育館':(42.9750,141.5630),
 '北広島市芸術文化ホール':(42.9760,141.5670),
 '東京流通センター':(35.5790,139.7490),'大田区産業プラザ':(35.5570,139.7230),
 '京浜トラックターミナル':(35.5830,139.7440),'大井競馬場':(35.5900,139.7430),
 '横浜市中央卸売市場':(35.4690,139.6280),'金沢産業振興センター':(35.3400,139.6420),
 '横浜市泉区総合庁舎':(35.4170,139.4890),
}

def latlng(d, i):
    for k, ll in PLACE.items():
        if k in d['n'] or k in d['ad']:
            return ll
    ad = d['ad']
    for w, (la, ln) in WARD.items():
        if w in ad:
            # 同じ区の物件が重ならないよう、番号から決まる小さなズレを足す
            return (round(la + ((i*37) % 21 - 10)/1000.0, 4), round(ln + ((i*53) % 21 - 10)/1000.0, 4))
    return (43.062, 141.354)

sites = []
for i, d in enumerate(raw):
    la, ln = latlng(d, i)
    st = ST[d['st']]
    workers = max(2, min(8, round(d['nin']/10))) if d['st'] == 'kou' else 0
    sites.append({'id': i+1, 'name': d['n'], 'addr': d['ad'], 'm2': d['m'],
                  'st': st, 'method': d['ko'], 'workers': workers, 'prog': d['p'],
                  'lat': la, 'lng': ln, 'brg': (i*37) % 180 - 90})

def row(s):
    return ('  {id:%d, name:%s, addr:%s, m2:%d, st:"%s", method:%s, workers:%d, prog:%d, lat:%.4f, lng:%.4f, brg:%d}'
            % (s['id'], json.dumps(s['name'], ensure_ascii=False), json.dumps(s['addr'], ensure_ascii=False),
               s['m2'], s['st'], json.dumps(s['method'], ensure_ascii=False),
               s['workers'], s['prog'], s['lat'], s['lng'], s['brg']))

block = ('/* ★2026-08-12v：現場記録帳（kirokucho_demo.html の RAW）と同じ100件。\n'
         '   座標はおよその位置。実機では下のジオコーディングで住所から正確な位置に直る。\n'
         '   記録帳の物件を変えたときは scratchpad/mapsync.py で作り直すこと。 */\n'
         'const BASE_SITES=[\n' + ',\n'.join(row(s) for s in sites) + '\n];')

P = '/home/user/osamarinavi_bousui/genba_map_v36.html'
s = io.open(P, encoding='utf-8', newline='').read()
m = re.search(r'const BASE_SITES=\[.*?\n\];', s, re.S)
assert m, 'BASE_SITES が見つからない'
s = s[:m.start()] + block + s[m.end():]

# ジオコーディング：住所に市名・都県名が入ったので「北海道札幌市」決め打ちをやめる
a = 'const r=await gc.geocode({address:"北海道札幌市"+s.addr, region:"jp"});'
b = ('const q=s.addr.startsWith("東京都")?s.addr:(s.addr.startsWith("横浜市")?"神奈川県"+s.addr:"北海道"+s.addr);\n'
     '        const r=await gc.geocode({address:q, region:"jp"});')
assert s.count(a) == 1
s = s.replace(a, b)

# 手で直したピン位置の保存はデータ総入れ替えで番号がずれるため、保存名を新しく
a = 'const POS_STORE="osamari_pos";'
b = 'const POS_STORE="osamari_pos_v2";  /* 2026-08-12v データ総入れ替えのため版上げ（旧保存は使わない） */'
assert s.count(a) == 1
s = s.replace(a, b)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('BASE_SITES', len(sites), '件で書き換え完了')
print('状態内訳:', {k: sum(1 for x in sites if x['st'] == k) for k in ['work','quote','done']})
