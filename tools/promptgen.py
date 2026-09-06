# -*- coding: utf-8 -*-
"""台帳（docs/データ）から、便ごとのプロンプトを組み立てる。手書きしない。
   python3 tools/promptgen.py knight paladin paladinking   → その3体のブロックを出す"""
import csv, io, os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D=os.path.join(ROOT,'docs','データ')
def load(n): return list(csv.DictReader(io.open(os.path.join(D,n),encoding='utf-8-sig')))
ART={r['id']:r for r in load('絵の指定.csv')}
CH ={r['id']:r for r in load('キャラクター.csv')}
EQ ={r['系譜id']:r for r in load('装備可否.csv')}
LINE={'人':'人系','獣':'獣系','神獣':'神獣系','無生物':'無生物系','竜':'竜系','邪':'邪悪系','精霊':'精霊系'}
LINE_NOTE={'人':'万能。人間らしい体格と装備','獣':'はっきりした欠点と、その分だけ大きい長所。獣の特徴を隠さない',
 '神獣':'倒れても終わらない者。翼、光、神話的な意匠','無生物':'回復が効かない。石と金属と古い刻印',
 '竜':'全身を鱗が覆い、炎を吐く。鱗の質感を必ず見せる','邪':'相手の不幸が自分の得。呪具、骨、淀んだ色','精霊':'実体を持たない'}
TIER={'1':'一の段','2':'二の段','3':'三の段','':'段を持たない単体（質素な一の段として扱う）','-':'段を持たない単体（質素な一の段として扱う）'}
DIR={'浅い斜め20':'浅い斜め（20度・右向き／front three-quarter, almost frontal）※両目が同じ大きさ。正対にはしない',
     '斜め35':'斜め（35度・右向き／three-quarter view）※奥の目が小さく、奥の肩が狭い',
     '半身55':'半身（55度・右向き／deep three-quarter view）※奥の目が半分隠れ、奥の肩はほぼ隠れる',
     '真横85':'真横（85度・右向き／side profile）※目は手前のひとつだけ。鼻先が輪郭の外に出る',
     '背中側120':'背中側（120度・右向き）※必ず背中をこちらに向け、顔だけ振り返る'}
DIRSHORT={'浅い斜め20':'浅い斜め20度','斜め35':'斜め35度','半身55':'半身55度','真横85':'真横85度','背中側120':'背中側120度'}
def ladder(cid):
    root=CH[cid]['系譜']; chain=[c for c in CH.values() if c['系譜']==root and c['段']]
    chain.sort(key=lambda c:c['段']); me=CH[cid]['段']
    others=['%s＝%s'%({'1':'一','2':'二','3':'三'}[c['段']],c['日本語名']) for c in chain if c['段']!=me]
    return '（'+'、'.join(others)+'）' if others else ''
def gear(cid):
    root=CH[cid]['系譜']; e=EQ.get(root) or EQ.get(cid)
    if not e: return '（台帳に無し）'
    return '、'.join(k for k,v in e.items() if k!='系譜id' and v=='○')
def block(cid, n):
    a=ART[cid]; c=CH[cid]; race=c['種族']
    out=['──【%d】%s（%s）──'%(n,a['日本語名'],cid)]
    out.append('系統：%s（%s）　／　体格：%s　／　段：%s%s　／　性別：%s'%(LINE[race],LINE_NOTE[race],c['体格'],TIER.get(a['段'],a['段']),ladder(cid),a['性別']))
    out.append('体の向き：%s　／　カメラ：%s'%(DIR.get(a['向き'],a['向き']),a['カメラ']))
    out.append('持てるもの：%s　※これ以外は描かない'%gear(cid))
    out.append('象徴形：%s'%a['象徴形'])
    if a['服の傷み'] and a['服の傷み']!='－': out.append('服や布の傷み具合：%s'%a['服の傷み'])
    out.append('内側のごちゃつき：%s'%a['内側の密度'])
    if a.get('姿'): out.append('姿（%s・右向きで見た姿）：'%DIRSHORT.get(a['向き'],a['向き'])+a['姿'])
    for note in [x.strip() for x in a['個別の注意'].split('／') if x.strip()]:
        out.append('　※'+note)
    return '\n'.join(out)
if __name__=='__main__':
    ids=sys.argv[1:]
    print('\n\n'.join(block(c,i+1) for i,c in enumerate(ids)))
