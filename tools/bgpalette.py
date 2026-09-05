# -*- coding: utf-8 -*-
"""26体ぶんの背景色。CIELCh（明度・鮮やかさ・色相）で決める。
   色相を色相環の上で散らし、隣り合う色相どうしは明るさをずらす。
   これで、盤面に12体並んでも「どれも別の色」に見える。"""
import math

# 名前: (L* 明るさ0-100, C* 鮮やかさ, h° 色相)
PALETTE = {
 'knight':       (41, 42, 250),
 'warrior':      (24, 46, 45),
 'berserker':    (22, 39, 15),
 'spearman':     (47, 40, 140),
 'shieldguard':  (43, 17, 290),
 'paladin':      (46, 46, 85),
 'archer':       (35, 42, 195),
 'rogue':        (50, 14, 115),
 'assassin':     (54, 28, 0),
 'mage':         (66, 50, 60),
 'archmage':     (42, 43, 310),
 'priest':       (70, 15, 25),
 'highpriest':   (70, 34, 95),
 'bard':         (66, 40, 170),
 'shaman':       (22, 28, 330),
 'salamander':   (50, 55, 40),
 'frost':        (49, 22, 225),
 'golem':        (22, 26, 75),
 'ogre':         (22, 34, 125),
 'troll':        (24, 14, 155),
 'werewolf':     (22, 24, 265),
 'harpy':        (68, 38, 210),
 'valkyrie':     (62, 36, 275),
 'whelp':        (47, 32, 55),
 'dragon':       (43, 46, 10),
 'yeti':         (72, 14, 240),
}
JP = {'knight':'騎士','warrior':'戦士','berserker':'狂戦士','spearman':'槍兵',
 'shieldguard':'護衛兵','paladin':'聖騎士','archer':'弓兵','rogue':'盗賊','assassin':'暗殺者',
 'mage':'魔法使い','archmage':'大魔法使い','priest':'僧侶','highpriest':'高僧','bard':'吟遊詩人',
 'shaman':'呪術師','salamander':'サラマンダー','frost':'フリム','golem':'ゴーレム','ogre':'オーク',
 'troll':'トロール','werewolf':'人狼','harpy':'ハーピー','valkyrie':'ヴァルキリー','whelp':'幼竜',
 'dragon':'竜','yeti':'イエティ'}

def lch_to_rgb(L, C, h):
    a = C * math.cos(math.radians(h)); b = C * math.sin(math.radians(h))
    fy = (L + 16) / 116.0; fx = fy + a / 500.0; fz = fy - b / 200.0
    def g(t): return t**3 if t**3 > 0.008856 else (t - 16/116.0) / 7.787
    X, Y, Z = g(fx)*0.9505, g(fy)*1.0, g(fz)*1.089
    r =  X*3.2406 + Y*-1.5372 + Z*-0.4986
    gg = X*-0.9689 + Y*1.8758 + Z*0.0415
    bb = X*0.0557 + Y*-0.2040 + Z*1.0570
    def s(c):
        c = max(0.0, min(1.0, c))
        return 12.92*c if c <= 0.0031308 else 1.055*(c**(1/2.4)) - 0.055
    return tuple(int(round(max(0, min(1, s(v)))*255)) for v in (r, gg, bb))

def rgb_of(name):
    return lch_to_rgb(*PALETTE[name])

def de(n1, n2):
    L1,C1,h1 = PALETTE[n1]; L2,C2,h2 = PALETTE[n2]
    a1,b1 = C1*math.cos(math.radians(h1)), C1*math.sin(math.radians(h1))
    a2,b2 = C2*math.cos(math.radians(h2)), C2*math.sin(math.radians(h2))
    return math.sqrt((L1-L2)**2 + (a1-a2)**2 + (b1-b2)**2)

if __name__ == '__main__':
    ks = list(PALETTE)
    pairs = sorted((de(a,b), a, b) for i,a in enumerate(ks) for b in ks[i+1:])
    print('いちばん近い10組（ΔE）')
    for d,a,b in pairs[:10]:
        print('  %5.1f  %s ↔ %s' % (d, JP[a], JP[b]))
    print('\n最小 ΔE = %.1f ／ 26体すべての組み合わせ %d 組' % (pairs[0][0], len(pairs)))
    print('\n色の一覧')
    for k in ks:
        L,C,h = PALETTE[k]
        print('  %-12s %-8s L%2d C%2d h%3d  RGB%s' % (k, JP[k], L, C, h, rgb_of(k)))
