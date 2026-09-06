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

def lab_to_srgb(lab):
    fy = (lab[...,0] + 16) / 116.0
    fx = fy + lab[...,1] / 500.0
    fz = fy - lab[...,2] / 200.0
    def g(t): return np.where(t**3 > 0.008856, t**3, (t - 16/116.0) / 7.787)
    xyz = np.stack([g(fx)*0.9505, g(fy)*1.0, g(fz)*1.089], -1)
    M = np.array([[3.2406,-1.5372,-0.4986],[-0.9689,1.8758,0.0415],[0.0557,-0.2040,1.0570]])
    c = np.clip(xyz @ M.T, 0, 1)
    c = np.where(c <= 0.0031308, 12.92*c, 1.055*(c**(1/2.4)) - 0.055)
    return np.clip(c, 0, 1) * 255.0

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
    raw = core.copy()                       # 穴埋め前の「模様のある塊」
    core = ndimage.binary_fill_holes(core)
    # 小さなごみ（にじみの粒）は人物から外す
    lbl, n = ndimage.label(core)
    if n:
        sizes = ndimage.sum(core, lbl, range(1, n+1))
        big = [i+1 for i, v in enumerate(sizes) if v > core.size * 0.004]
        core = np.isin(lbl, big)
    # ここで人物を一律に削ってはいけない。弓の弦、ぼろ布をつなぐ細い筋、
    # 触角のような細い部分は、数ピクセルしかないので消し飛んでしまう。
    # 人物のまわりに残る元の背景は、このあと「色で確かめながら」削り取る。
    # 穴埋め（fill_holes）で人物に取り込んでしまった「背景の島」を、核から外す。
    # 弓と弦のあいだ、浮遊する環の内側などが、ここで人物側に飲み込まれていた。
    #
    # ただし「背景と似た色の服」を誤って外さないように、判定は厳しくする。
    # 本物の背景は、その行の背景色と**どの行でも**ぴたりと一致する（同じ縦の
    # グラデーションに乗っている）。服はたまたま色が近くても、行ごとにずれる。
    e0 = max(3, int(W*edge))
    _rowbg = np.median(np.concatenate([lab[:, :e0], lab[:, -e0:]], axis=1), axis=1)
    dist = np.linalg.norm(lab - _rowbg[:, None, :], axis=-1)
    holes = ndimage.binary_fill_holes(raw) & ~ndimage.binary_dilation(raw, np.ones((3,3)))
    hl, hn = ndimage.label(holes)
    isles = np.zeros_like(holes)
    for i in range(1, hn+1):
        sel = hl == i
        if sel.sum() < holes.size * 0.0008: continue
        if np.percentile(dist[sel], 85) < 8.0:      # どの行でもぴたりと一致する
            isles |= sel
    core = core & ~isles
    m = ~core
    e = max(3, int(W*edge))
    side = np.concatenate([lab[:, :e], lab[:, -e:]], axis=1)
    rowbg = np.median(side, axis=1)                       # 各行の背景色

    lbl, n = ndimage.label(m)
    keep = set(np.unique(np.concatenate([lbl[0], lbl[-1], lbl[:,0], lbl[:,-1]])))
    keep.discard(0)
    # 外周とつながっていなくても、背景と同じ色をしている塊は背景とみなす。
    # 弓の弦の内側、浮遊する環の内側など、人物に囲まれた背景がここに当たる。
    # これを拾わないと、そこだけ元の色が島のように残る。
    if n:
        dist = np.linalg.norm(lab - rowbg[:, None, :], axis=-1)
        med = ndimage.labeled_comprehension(dist, lbl, np.arange(1, n+1),
                                            np.median, float, 999.0)
        sizes = ndimage.sum(m, lbl, np.arange(1, n+1))
        for i in range(n):
            if (i+1) not in keep and med[i] < tol and sizes[i] > 40:
                keep.add(i+1)
    m = np.isin(lbl, list(keep))

    # 人物のまわりに残った元の背景を、色を確かめながら1段ずつ削り取る。
    # 「いま背景と決まっている場所のとなり」で、かつ「その行の背景色と一致する」
    # 画素だけを背景に加える。細い弦やぼろ布は色が違うので、削られない。
    step = np.ones((3, 3), bool)
    for _ in range(7):
        cand = ndimage.binary_dilation(m, step) & ~m & (dist < 11.0)
        if not cand.any(): break
        m = m | cand
    return m, rowbg

def repaint(img, name, glow=True):
    """背景の色みだけを差し替える。明るさの起伏はそのまま残す。

      背景を単色で塗りつぶすと、そこにあった弱い模様まで消える。
      弓の弦のように、背景とほとんど同じ明るさの細い線は、これで消えてしまう。
      そこで塗りつぶさず、**その行の背景色からのズレ（明暗）を保ったまま**、
      色み（色相と鮮やかさ）だけを指定色に置き換える。
      ・平らな背景 … ズレ0なので、指定色そのものになる
      ・弦や薄い筋 … 少し明るいズレとして残り、指定色の中に線として見える
      ・人物のまわりのにじみ … 少し暗いズレとして残り、影として自然に見える
    """
    rgb = np.array(img.convert('RGB'))
    H, W, _ = rgb.shape
    m, rowbg = bg_mask(rgb)
    lab = srgb_to_lab(rgb)
    L, C, h = PALETTE[name]
    # 上を少し明るく、下を少し暗く（共通指定の「ごく緩やかなグラデーション」）
    ys = np.linspace(0, 1, H)[:, None]
    tgtL = (L + 7) + ((L - 9) - (L + 7)) * ys                    # (H,1)
    ta = C * math.cos(math.radians(h))
    tb = C * math.sin(math.radians(h))
    if glow:   # 人物の後ろにごく淡い光。真っ平らにしないため
        yy, xx = np.mgrid[0:H, 0:W]
        r = np.sqrt(((xx-W*0.5)/(W*0.62))**2 + ((yy-H*0.42)/(H*0.72))**2)
        tgtL = tgtL + 5.0 * np.clip(1.0 - r, 0, 1)**2
    else:
        tgtL = np.broadcast_to(tgtL, (H, W))
    # もとの背景の「なめらかな面」を作る（背景の画素だけから、ぼかして推定する）。
    # 行ごとの中央値だと、人物が端まで来ている行で値が壊れ、四角い染みになる。
    sig = max(6.0, W * 0.035)
    w = m.astype(np.float64)
    num = ndimage.gaussian_filter(lab[..., 0] * w, sig)
    den = ndimage.gaussian_filter(w, sig)
    base = num / np.maximum(den, 1e-6)
    base = np.where(den > 0.02, base, rowbg[:, None, 0])
    # 面からの細かいズレだけを、新しい色へ移す（弦のような細い線がここに残る）
    dL = np.clip(lab[..., 0] - base, -22, 22)
    newlab = np.stack([np.clip(tgtL + dL, 2, 98),
                       np.full((H, W), ta), np.full((H, W), tb)], -1)
    grad = lab_to_srgb(newlab)
    soft = ndimage.gaussian_filter(m.astype(np.float64), 1.4)[..., None]
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
