# -*- coding: utf-8 -*-
"""
art_src/ の絵を、ゲームで使う形に整える。
  python3 tools/artprep.py

・art_src/<id>.png … 1体ずつの絵。そのまま使う
・art_src/sheets.txt … 何体かをまとめた1枚を、どう切り分けるかの表
      batch1.png = knight, warrior, berserker, spearman, shieldguard, paladin
  左上から右へ、次の段へ、の順に切り分ける。列数は体数から決める（6体なら3列2段）

・人物を検出して、上に12%・下に8%の余白がつくように縮めて置き直す
  （生成AIは枠いっぱいに描く癖があり、盤面で頭が切れるため）
・空いた余白は、左右の端から拾った背景色を上下に伸ばして継ぐ
・1024×1024 の WebP にして art/char/<id>.webp へ書き出す
"""
import os, sys, glob, io
from PIL import Image
import numpy as np

TOP, BOT, SIZE, Q = 0.12, 0.08, 1024, 82
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DST = os.path.join(ROOT, 'art_src'), os.path.join(ROOT, 'art', 'char')

def figure_rows(im):
    """背景は横方向になめらか。人物のある行は横方向のばらつきが大きい"""
    a = np.asarray(im.convert('L')).astype(float)
    v = a[:, int(a.shape[1]*.15):int(a.shape[1]*.85)].std(axis=1)
    thr = max(v.min() + (v.max() - v.min()) * 0.18, 6.0)
    r = np.where(v > thr)[0]
    return (int(r[0]), int(r[-1])) if len(r) else (0, im.size[1]-1)

def edge_color(im, y, h):
    """その高さ帯の、左右の端（背景であることが多い）の色"""
    W = im.size[0]
    a = np.asarray(im.convert('RGB')).astype(float)
    y0, y1 = max(0, y), min(a.shape[0], y+h)
    if y1 <= y0: y0, y1 = 0, 1
    left  = a[y0:y1, :int(W*0.06)].reshape(-1, 3)
    right = a[y0:y1, int(W*0.94):].reshape(-1, 3)
    return np.median(np.vstack([left, right]), axis=0)

def bar(c0, c1, W, H):
    """c0 から c1 へ縦にグラデーションする帯"""
    if H <= 0: return None
    t = np.linspace(0, 1, H)[:, None]
    col = (c0[None, :] * (1-t) + c1[None, :] * t)
    return Image.fromarray(np.repeat(col[:, None, :], W, axis=1).astype(np.uint8), 'RGB')

def prep(src):
    im = src if isinstance(src, Image.Image) else Image.open(src)
    im = im.convert('RGB')
    if im.size[0] != im.size[1]:
        s = min(im.size); im = im.crop(((im.size[0]-s)//2, (im.size[1]-s)//2,
                                        (im.size[0]-s)//2+s, (im.size[1]-s)//2+s))
    im = im.resize((SIZE, SIZE), Image.LANCZOS)
    W = H = SIZE
    t, b = figure_rows(im)
    fh = b - t + 1
    s = (H * (1 - TOP - BOT)) / fh
    nw, nh = max(1, round(W*s)), max(1, round(H*s))
    r = im.resize((nw, nh), Image.LANCZOS)
    oy, ox = round(H*TOP - t*s), (W - nw)//2

    out = Image.new('RGB', (W, H))
    top_c, bot_c = edge_color(im, 0, max(2, t)), edge_color(im, b, max(2, H-b))
    tb = bar(top_c*0.86, top_c, W, max(0, oy))            # 上へ行くほど少し暗く
    if tb: out.paste(tb, (0, 0))
    by = oy + nh
    bb = bar(bot_c, bot_c*0.80, W, max(0, H-by))          # 下へ行くほど暗く
    if bb: out.paste(bb, (0, by))
    if ox > 0:                                            # 左右は、行ごとの背景色で埋める
        a = np.asarray(r.convert('RGB')).astype(float)
        lcol = np.median(a[:, :max(2, int(nw*0.03))], axis=1)     # 各行の左端の色
        rcol = np.median(a[:, nw-max(2, int(nw*0.03)):], axis=1)  # 各行の右端の色
        lbar = Image.fromarray(np.repeat(lcol[:, None, :], ox+1, axis=1).astype(np.uint8), 'RGB')
        rbar = Image.fromarray(np.repeat(rcol[:, None, :], W-ox-nw+1, axis=1).astype(np.uint8), 'RGB')
        out.paste(lbar, (0, oy)); out.paste(rbar, (ox+nw-1, oy))
    out.paste(r, (ox, oy))
    return out

def read_sheets():
    """sheets.txt を読む。{ファイル名: [id, ...]} を返す"""
    p = os.path.join(SRC, 'sheets.txt')
    if not os.path.exists(p): return {}
    out = {}
    for line in io.open(p, encoding='utf-8'):
        line = line.split('#')[0].strip()
        if '=' not in line: continue
        f, ids = line.split('=', 1)
        ids = [x.strip() for x in ids.replace('、', ',').split(',') if x.strip()]
        if ids: out[f.strip()] = ids
    return out

def split_sheet(path, ids):
    """1枚のシートを、体数から決めた格子で切り分ける"""
    n = len(ids)
    cols = 3 if n > 4 else (2 if n > 1 else 1)
    rows = (n + cols - 1) // cols
    im = Image.open(path).convert('RGB')
    W, H = im.size
    cw, ch = W // cols, H // rows
    out = []
    for i, cid in enumerate(ids):
        r, c = i // cols, i % cols
        out.append((cid, im.crop((c*cw, r*ch, (c+1)*cw, (r+1)*ch))))
    return out

def main():
    os.makedirs(DST, exist_ok=True)
    sheets = read_sheets()
    jobs = []                                   # (id, 画像 or パス)
    for f, ids in sheets.items():
        p = os.path.join(SRC, f)
        if not os.path.exists(p):
            print('  ' + f + ' … sheets.txt にあるが、まだ置かれていない'); continue
        print(f + ' を ' + str(len(ids)) + ' 体に切り分けます')
        jobs += split_sheet(p, ids)
    used = set(os.path.basename(f) for f in sheets)
    for f in sorted(glob.glob(os.path.join(SRC, '*.png')) + glob.glob(os.path.join(SRC, '*.jpg'))):
        if os.path.basename(f) in used: continue
        jobs.append((os.path.splitext(os.path.basename(f))[0], f))
    if not jobs:
        print('art_src に画像がありません'); return
    for cid, srcimg in jobs:
        out = prep(srcimg)
        p = os.path.join(DST, cid + '.webp')
        out.save(p, 'WEBP', quality=Q, method=6)
        t, b = figure_rows(out)
        print(f'{cid:14s} 上 {t/SIZE*100:4.1f}%  下 {(SIZE-b)/SIZE*100:4.1f}%  {os.path.getsize(p)//1024} KB')

if __name__ == '__main__':
    main()
