import sys, json
d = json.loads(sys.stdin.read()); print(d['etat'], d['erreur'], d['journal']); r = json.loads(d['rapport'])
for k in ('normal', 'foulePressee'):
    x = r if k == 'normal' else r[k]; print(k, {a: b for a, b in x.items() if a not in ('foulePressee', 'faceAFace', 'melees')})
print('faceAFace', r['faceAFace']); print('melees', r.get('melees'))
