# -*- coding: utf-8 -*-
"""ゲーム本体と同じ切り取り方（fitFace）で、実寸の見え方を作る。
   src/ui.js の fitFace と同じ計算：目の点を 幅50% / 高さ30% に置き、覆うように拡大（zoom 1.25）
   python3 tools/facemock.py out.png spearman spearmaster dragonslayer"""
import sys, os, json
from PIL import Image, ImageDraw
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FACE=json.load(open(os.path.join(ROOT,'art','face.json'),encoding='utf-8'))
AT_X, AT_Y, ZOOM = 0.5, 0.30, 1.25
def render(cid, box):
    im=Image.open(os.path.join(ROOT,'art','cut',cid+'.webp')).convert('RGBA')
    iw,ih=im.size
    f=FACE.get(cid,[0.5,0.12]); fx,fy=f[0],f[1]
    z=f[2] if len(f)>2 else ZOOM
    s=max(box/iw, box/ih)*z
    W,H=int(iw*s),int(ih*s)
    big=im.resize((W,H),Image.LANCZOS)
    left=box*AT_X-fx*W; top=min(box*AT_Y-fy*H, box*0.12)
    out=Image.new('RGBA',(box,box),(58,66,86,255))
    out.alpha_composite(big,(int(round(left)),int(round(top))))
    return out
def main():
    out=sys.argv[1]; ids=sys.argv[2:]
    pad=14; sizes=[136,352]
    W=sum(sum(sizes)+pad*3 for _ in [0]) ; 
    rows=[]
    for cid in ids:
        row=Image.new('RGBA',(sizes[0]+sizes[1]+pad*3, sizes[1]+pad),(24,24,30,255))
        row.alpha_composite(render(cid,sizes[0]),(pad, (sizes[1]-sizes[0])//2))
        row.alpha_composite(render(cid,sizes[1]),(pad*2+sizes[0], 0))
        d=ImageDraw.Draw(row); d.text((pad, sizes[1]+2), cid, fill=(150,160,180))
        rows.append(row)
    sheet=Image.new('RGB',(rows[0].width, sum(r.height for r in rows)),(24,24,30))
    y=0
    for r in rows: sheet.paste(r,(0,y),r); y+=r.height
    sheet.save(out); print(out, sheet.size)
if __name__=='__main__': main()
