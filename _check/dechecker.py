# 市松模様（透過を表す灰色の格子）を消して、本当の透過PNGに戻す。
# アプリがwebpに変換すると透過が失われ、市松がそのまま絵として焼き込まれる。
from PIL import Image
import numpy as np
from collections import deque


def dechecker(path, out):
    im = Image.open(path).convert('RGB')
    a = np.array(im).astype(int)
    h, w, _ = a.shape
    mx = a.max(2); mn = a.min(2); mean = a.mean(2)
    # 市松の2色（およそ254 と 242）を含む「ほぼ無彩色で明るい」画素
    isbg = (mx - mn < 14) & (mean >= 228)

    # ★色で一括判定してはいけない（絵の中の白まで消える）。
    #   画像のフチからつながっている範囲だけを塗りつぶしで背景とみなす。
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if isbg[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if isbg[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and isbg[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))

    alpha = np.where(seen, 0, 255).astype(float)

    # フチのギザギザをやわらげる（背景に接する薄い画素を半透明に）
    edge = np.zeros((h, w), bool)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
        sh = np.roll(np.roll(seen, dy, 0), dx, 1)
        edge |= sh
    edge &= ~seen
    soft = edge & (mx - mn < 30) & (mean >= 205)
    alpha = np.where(soft, np.clip((255 - mean) / 50 * 255, 0, 255), alpha)

    rgba = np.dstack([a, alpha]).astype('uint8')
    Image.fromarray(rgba, 'RGBA').save(out)
    print(out, ' 背景と判定した割合', round(seen.sum() / (h * w) * 100, 1), '%')


if __name__ == '__main__':
    dechecker('src_new_0.png', 'clean_settei.png')
    dechecker('src_new_1.png', 'clean_yougo.png')
