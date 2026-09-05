# -*- coding: utf-8 -*-
"""生成された絵の背景を、こちらで決めた色に塗り替える。

  なぜ機械でやるか：
  「背景は青緑・明るさ中・鮮やかさ中」と言葉で頼んでも、絵の生成側は守らない。
  実測すると、別々に指定したはずの背景が ΔE 4〜12（＝ほぼ同じ色）で並ぶ。
  盤面では背景の色だけが「誰がどこにいるか」を伝えているので、これは致命的。
  そこで、背景の指定はプロンプトから外し、こちらで塗り替える。

  やり方：
   1) 各行の左右4%から、その行の背景色を推定する
   2) その色に近い画素を背景とみなし、外周からつながっている塊だけを残す
   3) 背景を、指定色の縦グラデーション（上が少し明るい）で描き直す
   4) 境目を1.6pxぼかして合成する（人物の縁に輪が出ないように）
"""
import io, os, sys, math
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bgpalette import PALETTE, JP, lch_to_rgb

def srgb_to_lab(a):
    c = a.astype(np.float64) / 255.0
    c = np.where(c <= 0.04045, c/12.92, ((c+0.055)/1.055)**2.4)
    M = np.array([[0.4124,0.3576,0.1805],[0.2126,0.7152,0.0722],[0.0193,0.1192,0.9505]])
    xyz = c @ M.T / np.array([0.9505,1.0,1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787*xyz + 16/116.0)
    return np.stack([116*f[...,1]-16, 500*(f[...,0]-f[...,1]), 200*(f[...,1]-f[...,2])], -1)

def bg_mask(rgb, tol=13.0, edge=0.04):
    """背景とみなす画素。

      人物は「模様がある」、背景は「なめらか」。この差で分ける。
      色の近さだけで判定すると、人物のまわりに敷かれた薄暗いにじみ（ヴィネット）が
      背景として拾われず、塗り替えたあとに黒い輪として残る。
      そこで、まず「模様のある塊＝人物」を作り、それ以外を背景とする。
    """
    H, W, _ = rgb.shape
    lab = srgb_to_lab(rgb)
    lum = lab[..., 0]
    # 局所のばらつき（7x7）。人物は高く、背景は低い
    k = max(3, int(round(min(H, W) * 0.008)) | 1)
    mean = ndimage.uniform_filter(lum, k)
    var = ndimage.uniform_filter(lum*lum, k) - mean*mean
    std = np.sqrt(np.clip(var, 0, None))
    thr = max(2.2, np.percentile(std, 55))
    core = std > thr
    core = ndimage.binary_closing(core, np.ones((k*2+1, k*2+1)))
    core = ndimage.binary_fill_holes(core)
    # 小さなごみ（にじみの粒）は人物から外す
    lbl, n = ndimage.label(core)
    if n:
        sizes = ndimage.sum(core, lbl, range(1, n+1))
        big = [i+1 for i, v in enumerate(sizes) if v > core.size * 0.004]
        core = np.isin(lbl, big)
    # 少しだけ内側へ削る。人物のまわりに元の背景が輪として残らないように
    core = ndimage.binary_erosion(core, np.ones((5,5)))
    m = ~core
    lbl, n = ndimage.label(m)
    keep = set(np.unique(np.concatenate([lbl[0], lbl[-1], lbl[:,0], lbl[:,-1]])))
    keep.discard(0)
    m = np.isin(lbl, list(keep))
    e = max(3, int(W*edge))
    side = np.concatenate([lab[:, :e], lab[:, -e:]], axis=1)
    rowbg = np.median(side, axis=1)
    return m, rowbg

def repaint(img, name, glow=True):
    rgb = np.array(img.convert('RGB'))
    H, W, _ = rgb.shape
    m, rowbg = bg_mask(rgb)
    L, C, h = PALETTE[name]
    # 上を少し明るく、下を少し暗く（共通指定の「ごく緩やかなグラデーション」）
    ys = np.linspace(0, 1, H)[:, None]
    top, bot = L + 7, L - 9
    grad = np.zeros((H, W, 3), np.float64)
    for i in range(H):
        grad[i, :, :] = lch_to_rgb(top + (bot-top)*ys[i,0], C, h)
    if glow:  # 人物の後ろにごく淡い光。真っ平らにしないため
        yy, xx = np.mgrid[0:H, 0:W]
        r = np.sqrt(((xx-W*0.5)/(W*0.62))**2 + ((yy-H*0.42)/(H*0.72))**2)
        g = np.clip(1.0 - r, 0, 1)**2
        grad = np.clip(grad * (1.0 + 0.16*g[..., None]), 0, 255)
    soft = ndimage.gaussian_filter(m.astype(np.float64), 1.6)[..., None]
    out = rgb.astype(np.float64)*(1-soft) + grad*soft
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), float(m.mean())

def main():
    args = sys.argv[1:]
    if not args:
        print('使い方: python3 tools/bgpaint.py <画像> <名前> [出力]'); return
    src, name = args[0], args[1]
    dst = args[2] if len(args) > 2 else src
    im, frac = repaint(Image.open(src), name)
    im.save(dst)
    print('%s … %s に塗り替え（背景 %.0f%%）' % (JP.get(name,name), dst, frac*100))

if __name__ == '__main__':
    main()
