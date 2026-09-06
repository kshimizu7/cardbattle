# -*- coding: utf-8 -*-
"""art/cut/<id>.png（RGBAの切り抜き）→ art/cut/<id>.webp（高さ1024まで、画質68）。
   あわせて系譜ごとの背景色 art/bg_colours.json を書く。
   python3 tools/cut2webp.py            → 全部
   python3 tools/cut2webp.py knight ... → 指定した者だけ"""
import sys, os, glob, json
from PIL import Image
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT,'tools'))
from bgpalette import lch_to_rgb
CUT=os.path.join(ROOT,'art','cut'); H=1024; Q=68

def to_webp(cid):
    im=Image.open(os.path.join(CUT,cid+'.png')).convert('RGBA')
    if im.height>H: im=im.resize((round(im.width*H/im.height),H),Image.LANCZOS)
    out=os.path.join(CUT,cid+'.webp'); im.save(out,'WEBP',quality=Q,method=6)
    return os.path.getsize(out)

# 背景色：系譜ごとの落ち着いた色（L,C,h）。あとで数字を直せば全体が変わる
PAL={"frost":[24,14,10.0],"shieldguard":[52,23,28.9],"warrior":[70,26,47.9],"bard":[25,24,66.8],"priest":[45,21,85.8],
 "troll":[65,20,104.7],"rogue":[24,18,123.7],"werewolf":[44,26,142.6],"knight":[64,23,161.6],"shaman":[26,23,180.5],
 "golem":[49,21,199.5],"mage":[70,20,218.4],"harpy":[24,14,237.4],"spearman":[49,17,256.3],"ogre":[68,21,275.3],
 "whelp":[33,19,294.2],"salamander":[44,15,313.2],"valkyrie":[62,22,332.1],"archer":[30,20,351.1]}
LINEAGE_OF={'paladin':'knight','paladinking':'knight','berserker':'warrior','warfiend':'warrior','assassin':'rogue','shadowblade':'rogue',
 'archmage':'mage','grandsage':'mage','highpriest':'priest','saint':'priest','dragon':'whelp','ancientdragon':'whelp'}
def rgb(L,C,h):
    return '#%02x%02x%02x'%tuple(max(0,min(255,int(round(v)))) for v in lch_to_rgb(L,C,h))
def colours():
    out={}
    for cid in sorted(set(list(PAL)+list(LINEAGE_OF))):
        L,C,h=PAL[LINEAGE_OF.get(cid,cid)]
        # D案：暗めの地（上→下でわずかに暗く）、人物の後ろだけ色の光
        out[cid]={'top':rgb(L*0.62+4,C*0.55,h),'bot':rgb(L*0.62-4,C*0.55,h),'glow':rgb(min(L+6,95),C*1.3,h)}
    return out
if __name__=='__main__':
    ids=sys.argv[1:] or [os.path.basename(p)[:-4] for p in sorted(glob.glob(os.path.join(CUT,'*.png')))]
    tot=0
    for cid in ids:
        s=to_webp(cid); tot+=s; print('%-14s %4dKB'%(cid,s//1024))
    print('合計 %.2fMB'%(tot/1e6))
    json.dump(colours(),open(os.path.join(ROOT,'art','bg_colours.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
    print('art/bg_colours.json を書きました')
