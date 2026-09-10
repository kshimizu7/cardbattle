# -*- coding: utf-8 -*-
"""切り抜き後に残った「紫のふち」を消す。
   マゼンタ背景が純色でないシート（再エンコードされた画像など）で出る。
   python3 tools/despill.py spearmaster dragonslayer"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def fix(cid, width=3, thr=18.0):
    p=os.path.join(ROOT,'art','cut',cid+'.png')
    a=np.asarray(Image.open(p).convert('RGBA')).astype(float)
    rgb, al = a[...,:3], a[...,3]
    vis = al>10
    # 輪郭から width 画素ぶんの帯
    inner = ndimage.binary_erosion(vis, structure=np.ones((3,3),bool), iterations=width)
    band = vis & ~inner
    r,g,b = rgb[...,0],rgb[...,1],rgb[...,2]
    spill = np.clip((np.minimum(r,b)-g-thr)/30.0, 0, 1) * band
    lum = rgb.mean(-1)[...,None]
    k = spill[...,None]
    out = rgb*(1-k) + lum*k
    a[...,:3]=out
    n=int((spill>0.05).sum())
    # 内側に残った濃い紫の点（毛や房のすきまから背景が抜けきらなかったもの）を、
    # 近くの「紫でない」画素の色で埋める
    rgb=a[...,:3]
    r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    hole=((np.minimum(r,b)-g)>35)&(a[...,3]>20)
    m=0
    if hole.any():
        ok=(a[...,3]>20)&~hole
        for c in range(3):
            ch=rgb[...,c]
            num=ndimage.uniform_filter(np.where(ok,ch,0),size=9)
            den=ndimage.uniform_filter(ok.astype(float),size=9)
            fill=np.where(den>0.02, num/np.maximum(den,1e-6), ch)
            rgb[...,c]=np.where(hole, fill, ch)
        a[...,:3]=rgb; m=int(hole.sum())
    Image.fromarray(a.astype(np.uint8),'RGBA').save(p)
    print(cid, 'ふちの紫を中和', n, '／内側の紫の点を埋めた', m)
if __name__=='__main__':
    for c in sys.argv[1:]: fix(c)
