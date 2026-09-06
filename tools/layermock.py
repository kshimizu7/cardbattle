# -*- coding: utf-8 -*-
"""重ね順の試作：地(色) → 段の枠 → 切り抜き → 縁の光。実寸(136/352)で確認シートを作る。
   python3 tools/layermock.py out.png knight:1 paladin:2 ..."""
import sys, os, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT,'tools'))
from bgpalette import lch_to_rgb
PAL=json.load(open('/tmp/pal_v2.json')) if os.path.exists('/tmp/pal_v2.json') else {}
LINEAGE_OF={'paladin':'knight','paladinking':'knight','berserker':'warrior','warfiend':'warrior','assassin':'rogue','shadowblade':'rogue',
 'archmage':'mage','grandsage':'mage','highpriest':'priest','saint':'priest','dragon':'whelp','ancientdragon':'whelp'}
def colour(cid):
    k=LINEAGE_OF.get(cid,cid); L,C,h=PAL.get(k,[50,20,250]); return L,C,h
def rgb(L,C,h): return tuple(int(round(v)) for v in lch_to_rgb(L,C,h))
def ground(S, L,C,h):
    """D案：暗めの地（0.62L, 0.55C）に、人物の後ろだけ色の光（L+6, 1.3C）"""
    top=np.array(rgb(L*0.62+4,C*0.55,h),float); bot=np.array(rgb(L*0.62-4,C*0.55,h),float)
    t=np.linspace(0,1,S)[:,None,None]; img=top*(1-t)+bot*t; img=np.repeat(img,S,1)
    yy,xx=np.mgrid[0:S,0:S]; cx,cy=S*0.5,S*0.52; r=np.sqrt(((xx-cx)/(S*0.36))**2+((yy-cy)/(S*0.44))**2)
    g=np.clip(1-r,0,1)**1.6; glow=np.array(rgb(min(L+6,95),C*1.3,h),float)
    img=img*(1-g[...,None])+glow*g[...,None]
    return Image.fromarray(img.astype(np.uint8),'RGB')
def frame(S, tier):
    fr=Image.open(os.path.join(ROOT,'art','ui','frame_t%d.png'%tier)).convert('RGBA')
    m=int(round(S*0.035)); return fr.resize((S+2*m,S+2*m),Image.LANCZOS), -m
def figure(S, cid):
    cut=Image.open(os.path.join(ROOT,'art','cut',cid+'.png')).convert('RGBA')
    a=np.asarray(cut)[...,3]>8; ys=np.where(a.any(1))[0]; xs=np.where(a.any(0))[0]
    cut=cut.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
    sc=min(S*0.88/cut.height, S*0.92/cut.width); cut=cut.resize((max(1,int(cut.width*sc)),max(1,int(cut.height*sc))),Image.LANCZOS)
    return cut
def rim(fig, S):
    """縁の光：切り抜きのアルファを少し広げてぼかし、乳白で薄く"""
    a=fig.split()[3]; pad=int(S*0.02)
    big=Image.new('L',(fig.width+2*pad,fig.height+2*pad),0); big.paste(a,(pad,pad))
    halo=big.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(S*0.012))
    col=Image.new('RGBA',big.size,(255,245,225,0)); col.putalpha(halo.point(lambda v:int(v*0.55)))
    return col,pad
def unit(cid, tier, S):
    L,C,h=colour(cid); im=ground(S,L,C,h).convert('RGBA')
    fr,off=frame(S,tier); im.alpha_composite(fr,(off,off))  # はみ出しは切れる（実装では overflow:visible）
    fig=figure(S,cid); x=(S-fig.width)//2; y=(S-fig.height)//2
    halo,pad=rim(fig,S); im.alpha_composite(halo,(x-pad,y-pad)); im.alpha_composite(fig,(x,y))
    return im
def sheet(items, out):
    sizes=[(136,'盤面136'),(352,'図鑑352')]
    W=sum(s+16 for s,_ in sizes)*1+16; H=16
    cells=[]
    for cid,tier in items:
        row=[unit(cid,tier,S*3).resize((S,S),Image.LANCZOS) for S,_ in sizes]   # 3倍で作って縮小
        cells.append((cid,row))
    W=16+sum(s+16 for s,_ in sizes); H=16+sum(352+24 for _ in cells)
    canvas=Image.new('RGB',(W,H),(40,40,40)); d=ImageDraw.Draw(canvas); y=16
    for cid,row in cells:
        x=16
        for (S,_),im in zip(sizes,row):
            canvas.paste(im.convert('RGB'),(x,y)); x+=S+16
        d.text((16,y+354),cid,fill=(220,220,220)); y+=352+24
    canvas.save(out); print(out,canvas.size)
if __name__=='__main__':
    out=sys.argv[1]; items=[(s.split(':')[0],int(s.split(':')[1])) for s in sys.argv[2:]]
    sheet(items,out)
