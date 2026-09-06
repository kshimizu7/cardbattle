# -*- coding: utf-8 -*-
"""段ばしごの比較シート。
   実際に表示される大きさ（盤面136px／図鑑352px）で並べる。
   原寸で見て直すべきかを決めると、見えない細部まで直すことになる。"""
import os, sys, io
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, 'art', 'char')
LADDERS = [
    ('人・剣',   [('knight','騎士',1),('paladin','聖騎士',2),('paladinking','聖騎士王',3)]),
    ('人・力',   [('warrior','戦士',1),('berserker','狂戦士',2),('warfiend','戦鬼',3)]),
    ('人・影',   [('rogue','盗賊',1),('assassin','暗殺者',2),('shadowblade','闇の刃',3)]),
    ('人・術',   [('mage','魔法使い',1),('archmage','大魔法使い',2),('grandsage','大賢者',3)]),
    ('人・祈',   [('priest','僧侶',1),('highpriest','高僧',2),('saint','聖者',3)]),
    ('竜',       [('whelp','幼竜',1),('dragon','竜',2)]),
]
def font(sz):
    for p in ['/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
              '/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc']:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, sz)
            except Exception: pass
    return ImageFont.load_default()

def sheet(sizes, out, scale=1):
    F, Fs = font(int(15*scale)), font(int(12*scale))
    pad, gap, lab = int(16*scale), int(12*scale), int(20*scale)
    colw = max(sizes) * scale
    rows = []
    for name, chain in LADDERS:
        rows.append((name, chain))
    W = pad*2 + int(72*scale) + (colw+gap)*3
    rowh = max(sizes)*scale + lab + gap
    H = pad*2 + int(26*scale) + rowh*len(rows)
    im = Image.new('RGB', (W, H), (12, 14, 22))
    d = ImageDraw.Draw(im)
    d.text((pad, pad), '段ばしご ── 表示される大きさで並べたもの（%s px）' % '/'.join(str(s) for s in sizes),
           fill=(242,198,92), font=F)
    y = pad + int(26*scale)
    for name, chain in rows:
        d.text((pad, y + int(30*scale)), name, fill=(140,160,200), font=F)
        x = pad + int(72*scale)
        for cid, jp, tier in chain:
            p = os.path.join(DST, cid + '.webp')
            d.text((x, y), '%s（%d の段）' % (jp, tier), fill=(230,238,252), font=Fs)
            if os.path.exists(p):
                s = sizes[0]*scale
                a = Image.open(p).convert('RGB').resize((s, s), Image.LANCZOS)
                im.paste(a, (x, y + lab))
            x += colw + gap
        y += rowh
    im.save(out)
    print(out, im.size)

if __name__ == '__main__':
    sheet([136], os.path.join(ROOT, 'docs', '段ばしご_盤面136px.png'), scale=2)
    sheet([352], os.path.join(ROOT, 'docs', '段ばしご_図鑑352px.png'), scale=1)
