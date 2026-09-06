# -*- coding: utf-8 -*-
"""マゼンタ背景のシートを切り分け、背景を抜いて RGBA にする。
   python3 tools/keyout.py art_src/v2/bin01.png knight paladin  → art/cut/<id>.png (768x1024 RGBA)"""
import sys, os
import numpy as np
from PIL import Image
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def bg_colour(a):
    r,g,b=a[...,0],a[...,1],a[...,2]
    m=(r>200)&(b>200)&(g<80)
    return a[m].mean(0)
def key(a, bg, t0=40.0, t1=150.0):
    """bgからの距離でアルファを決め、半透明の縁からは背景色を差し引く（色かぶり取り）"""
    d=np.sqrt(((a-bg)**2).sum(-1))
    alpha=np.clip((d-t0)/(t1-t0),0,1)
    # 煙のような半透明の灰色：bgからの距離に比例したアルファにする（不透明の灰色でd≈210）
    # 色みの無い画素だけに適用し、衣装の色が薄くなるのを防ぐ
    soft=np.clip(d/210.0,0,1)
    al0=np.maximum(soft,0.02)[...,None]
    fg0=np.clip((a-(1-al0)*bg)/al0,0,255)      # 「半透明の灰」と仮定して復元した色
    chroma=fg0.max(-1)-fg0.min(-1)             # 本当に灰なら色みが消える
    grey=np.clip((40-chroma)/25.0,0,1)          # chroma<=15 → 1, >=40 → 0
    soft=np.where(d>12,soft,0)                 # 背景のむら（σ≈2）は拾わない
    alpha=alpha*(1-grey)+soft*grey
    # 縁の色かぶり：pix = alpha*fg + (1-alpha)*bg  →  fg = (pix-(1-alpha)*bg)/alpha
    al=alpha[...,None]
    fg=np.where(al>0.02,(a-(1-al)*bg)/np.maximum(al,0.02),a)
    fg=np.clip(fg,0,255)
    # 残ったマゼンタ寄りの色を中和（r,b が g より大きく突出している画素）
    # 半透明の画素（縁・煙）で、赤紫に寄った色は明るさだけ残して無彩色に寄せる
    r,g,b=fg[...,0],fg[...,1],fg[...,2]
    spill=np.clip((np.minimum(r,b)-g)/40.0,0,1)    # 赤紫の偏りが40で全消し
    edge=(alpha<0.97)&(alpha>0)
    k=np.where(edge,spill,0)[...,None]
    lum=((r+g+b)/3.0)[...,None]
    fg=fg*(1-k)+lum*k
    # 透明な画素の色はマゼンタのまま残さない（縮小時に縁へにじむ）。灰に置き換える
    fg=np.where(al>0.02,fg,120.0)
    out=np.concatenate([fg,alpha[...,None]*255],-1)
    return out.astype(np.uint8)
def process(path, ids, outdir=None):
    """シート全体を抜いてから、つながった塊ごとに「どの枠の者か」を決める。
       仕切り線をまたいだ剣先や槍先も、その者の側に付いて残る"""
    from scipy import ndimage
    outdir=outdir or os.path.join(ROOT,'art','cut'); os.makedirs(outdir,exist_ok=True)
    im=Image.open(path).convert('RGB'); a=np.asarray(im).astype(float); bg=bg_colour(a)
    W,H=im.size; n=len(ids); cw=W/n
    rgba=key(a,bg).astype(float)
    alpha=rgba[...,3]>6
    # 仕切り線（縦に長い細い塊）を消す
    colfrac=alpha.mean(0)
    for k in range(1,n):
        xc=int(round(k*cw))
        for x in range(max(0,xc-8),min(W,xc+9)):
            if colfrac[x]>0.85:                      # 枠の境目付近で、縦に通った線だけ
                alpha[:,max(0,x-2):x+3]=False; rgba[:,max(0,x-2):x+3,3]=0
    # 仕切りで切れた剣先などを元の塊につなぐため、横に少し太らせてから塊を数える
    grown=ndimage.binary_dilation(alpha, structure=np.ones((1,9),bool))
    lab,nl=ndimage.label(grown)
    owner={}
    for i in range(1,nl+1):
        ys,xs=np.where(lab==i)
        if len(xs)<30: continue
        owner[i]=int(np.clip(np.median(xs)//cw,0,n-1))
    res=[]
    for k,cid in enumerate(ids):
        keep=np.isin(lab,[i for i,o in owner.items() if o==k])
        out=rgba.copy(); out[...,3]=np.where(keep,out[...,3],0)
        ys,xs=np.where(keep)
        if len(xs)==0: print(cid,'なし'); continue
        crop=out[ys.min():ys.max()+1, xs.min():xs.max()+1]
        cwid=max(768,crop.shape[1]); chei=max(1024,crop.shape[0])
        canvas=np.zeros((chei,cwid,4)); canvas[...,:3]=120
        y0=(chei-crop.shape[0])//2
        x0=(cwid-crop.shape[1])//2
        canvas[y0:y0+crop.shape[0], x0:x0+crop.shape[1]]=crop
        pth=os.path.join(outdir,cid+'.png'); Image.fromarray(canvas.astype(np.uint8),'RGBA').save(pth)
        res.append(pth); print(cid,pth,'w',crop.shape[1],'h',crop.shape[0])
    return res
if __name__=='__main__':
    process(sys.argv[1], sys.argv[2:])
