# -*- coding: utf-8 -*-
"""
art_src/ の絵を、ゲームで使う形に整える。
  python3 tools/artprep.py

・art_src/<id>.png … 1体ずつの絵。そのまま使う
・art_src/sheets.txt … 何体かをまとめた1枚を、どう切り分けるかの表
      batch1.png = knight, warrior, berserker, spearman, shieldguard, paladin
  左上から右へ、次の段へ、の順に切り分ける。列数は体数から決める（6体なら3列2段）

・背景を tools/bgpalette.py で決めた色に塗り替える（26体ぶんの色を先に設計してある）
・人物を検出して、上に12%・下に8%の余白がつくように縮めて置き直す
  （生成AIは枠いっぱいに描く癖があり、盤面で頭が切れるため）
・空いた余白は、左右の端から拾った背景色を上下に伸ばして継ぐ
・1024×1024 の WebP にして art/char/<id>.webp へ書き出す
"""
import os, sys, glob, io
from PIL import Image
import numpy as np
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from bgpaint import repaint          # 背景をこちらで決めた色に塗り替える
    from bgpalette import PALETTE
except Exception:
    repaint, PALETTE = None, {}

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

def prep(src, cid=None):
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

    # 余白は「元の絵の端を外へ伸ばし、そのあとぼかす」ことで作る。
    # 平らな色で埋めると継ぎ目に段差が出るし、行ごとの色を伸ばすと
    # 人物が端まで来ている行で横向きの筋になる。伸ばしてぼかせば、どちらも起きない。
    a = np.asarray(r.convert('RGB')).astype(np.float32)
    canvas = np.zeros((H, W, 3), np.float32)
    ys = np.clip(np.arange(H) - oy, 0, nh - 1)
    xs = np.clip(np.arange(W) - ox, 0, nw - 1)
    canvas[:, :, :] = a[ys[:, None], xs[None, :], :]     # 端を外へ伸ばす
    pad = np.ones((H, W), np.float32)                    # 1=余白 / 0=元の絵
    y0, y1 = max(0, oy), min(H, oy + nh)
    x0, x1 = max(0, ox), min(W, ox + nw)
    pad[y0:y1, x0:x1] = 0.0
    if pad.any():
        soft = ndimage.gaussian_filter(pad, 16.0)[..., None]
        blur = np.stack([ndimage.gaussian_filter(canvas[..., c], 70.0) for c in range(3)], -1)
        canvas = canvas * (1 - soft) + blur * soft
    out = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8), 'RGB')
    # 背景を、台帳で決めた色に塗り替える。
    # 余白を足したあとに行う。先に塗ると、継ぎ足した帯との境目に線が出る
    if repaint and cid in PALETTE:
        out, _ = repaint(out, cid)
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
    # 枠のあいだの仕切り線を拾わないよう、少し内側で切る。
    # 拾ってしまうと、背景を塗り替えたあとに細い明るい線として残る
    ix, iy = int(cw*0.015), int(ch*0.015)
    for i, cid in enumerate(ids):
        r, c = i // cols, i % cols
        out.append((cid, im.crop((c*cw+ix, r*ch+iy, (c+1)*cw-ix, (r+1)*ch-iy))))
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
        out = prep(srcimg, cid)
        p = os.path.join(DST, cid + '.webp')
        out.save(p, 'WEBP', quality=Q, method=6)
        t, b = figure_rows(out)
        print(f'{cid:14s} 上 {t/SIZE*100:4.1f}%  下 {(SIZE-b)/SIZE*100:4.1f}%  {os.path.getsize(p)//1024} KB')

if __name__ == '__main__':
    main()
