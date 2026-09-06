# -*- coding: utf-8 -*-
"""台帳から、2体ずつの便（第01便〜第15便）を組み立てて docs/便/ に書き出す。
   python3 tools/bingen.py            → docs/便/第NN便.txt と 全便.txt を更新"""
import os, io, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from promptgen import block, ART, ROOT
BINS=[('knight','paladin'),('paladinking','warfiend'),('warrior','berserker'),('spearman','shieldguard'),
      ('archer','rogue'),('assassin','shadowblade'),('mage','archmage'),('grandsage','saint'),
      ('priest','highpriest'),('bard','shaman'),('ogre','troll'),('werewolf','harpy'),
      ('whelp','dragon'),('salamander','frost'),('valkyrie','golem')]
HEAD='''■ 第%02d便：%s ／ %s
共通指定に従います。前の便で描いた絵は参考にしません。この2体の個別指定だけを見てください。
・横長 1536×1024 のシート。左の枠（768×1024）に【1】、右の枠に【2】
・背景はシート全体をマゼンタ #FF00FF の平らな一色。縁の光なし。地面なし
・最初に添付した3枚（吟遊詩人・大賢者・闇の刃）と同じ画風・同じ塗りの厚み。頭身は各キャラの指定に従う
・体の向きは、顔・肩・足の「見えるもの」で確認すること（共通指定の■体の向き）
'''
EXTRA={13:'・この便は、添付した2枚の見本（幼竜・竜）の姿勢・向き・構図をそのまま使って描き直す便です。変えるのは個別指定に書いた色と翼の膜だけ\n',
       10:'・【1】吟遊詩人は、最初に添付した見本「吟遊詩人」の顔・衣・竪琴を土台にしてよい。ただし体の向きは個別指定の「真横」に変える\n',
       8:'・【1】大賢者は、最初に添付した見本「大賢者」の顔と衣を土台にしてよい。ただし杖の持ち方と光の表現は、個別指定に従って変える\n',
       6:'・【2】闇の刃は、添付した見本「闇の刃」の姿をそのまま描き直す。姿・構え・装備は見本のまま。変えるのは個別指定に書いた点だけ。【1】暗殺者は見本なし。個別指定だけで描く\n'}
def bin_text(n, ids):
    names=[ART[c]['日本語名'] for c in ids]
    return HEAD%(n,names[0],names[1])+EXTRA.get(n,'')+'\n'+'\n\n'.join(block(c,i+1) for i,c in enumerate(ids))+'\n'
def main():
    d=os.path.join(ROOT,'docs','便'); os.makedirs(d,exist_ok=True)
    alltxt=[]
    for i,ids in enumerate(BINS,1):
        t=bin_text(i,ids); alltxt.append(t)
        with io.open(os.path.join(d,'第%02d便.txt'%i),'w',encoding='utf-8-sig',newline='\r\n') as f: f.write(t)
    with io.open(os.path.join(d,'全便.txt'),'w',encoding='utf-8-sig',newline='\r\n') as f:
        f.write('\n\n'.join(alltxt))
    used={c for b in BINS for c in b}; print('便:',len(BINS),'体:',len(used),'未収録:',sorted(set(ART)-used))
if __name__=='__main__': main()
