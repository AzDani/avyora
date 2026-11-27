# Convertit les modèles téléchargés (assets/) en fichiers que l'artefact sait servir (paquets/) :
#  - la géométrie et les animations : du JSON (le glTF tel quel + son binaire en base64), un fichier par famille ;
#  - les textures : de vraies images .jpg/.png dans paquets/img/ ;
#  - les ciels HDR : en base64 dans paquets/ciel.json.
# Usage : python3 -I empaqueter.py <dossier bureaux>
import base64, json, os, shutil, struct, sys
d = sys.argv[1]; A = os.path.join(d, 'assets'); P = os.path.join(d, 'paquets'); IMG = os.path.join(P, 'img')
shutil.rmtree(P, ignore_errors=True); os.makedirs(IMG)
EXT = {'image/png': '.png', 'image/jpeg': '.jpg'}
def depuis_glb(chemin, cle):
    b = open(chemin, 'rb').read(); assert b[:4] == b'glTF'
    n, t = struct.unpack('<II', b[12:20]); assert t == 0x4E4F534A
    g = json.loads(b[20:20 + n]); reste = b[20 + n:]; binaire = b''
    if reste: m, t2 = struct.unpack('<II', reste[:8]); assert t2 == 0x004E4942; binaire = reste[8:8 + m]
    for i, im in enumerate(g.get('images', [])):
        if 'bufferView' in im:
            v = g['bufferViews'][im.pop('bufferView')]; o = v.get('byteOffset', 0); nom = cle + '__' + str(i) + EXT[im.get('mimeType', 'image/png')]
            open(os.path.join(IMG, nom), 'wb').write(binaire[o:o + v['byteLength']]); im['uri'] = 'img/' + nom
    return g, binaire
def depuis_gltf(chemin, cle):
    g = json.load(open(chemin)); base = os.path.dirname(chemin)
    assert len(g['buffers']) == 1; binaire = open(os.path.join(base, g['buffers'][0]['uri']), 'rb').read()
    for im in g.get('images', []):
        nom = cle + '__' + os.path.basename(im['uri']); shutil.copyfile(os.path.join(base, im['uri']), os.path.join(IMG, nom)); im['uri'] = 'img/' + nom
    return g, binaire
def entree(chemin, cle):
    g, binaire = (depuis_glb if chemin.endswith('.glb') else depuis_gltf)(chemin, cle)
    assert not g.get('extensionsRequired'), cle
    g['buffers'] = [{'byteLength': len(binaire)}]
    return {'gltf': g, 'bin': base64.b64encode(binaire).decode('ascii')}
FAMILLES = {
  'meubles': {'canape': 'meubles/sofa_02/sofa_02_1k.gltf', 'tableBasse': 'meubles/coffee_table_round_01/coffee_table_round_01_1k.gltf', 'fauteuilSalon': 'meubles/modern_arm_chair_01/modern_arm_chair_01_1k.gltf',
              'plante': 'meubles/potted_plant_02/potted_plant_02_1k.gltf', 'etagere': 'meubles/steel_frame_shelves_01/steel_frame_shelves_01_1k.gltf', 'fauteuilBureau': 'objets/fauteuil_bureau.glb',
              'imprimante': 'objets/imprimante.glb', 'machineCafe': 'objets/machine_cafe.glb', 'portable': 'objets/portable.glb'},
  'gens': {'hommeCostume': 'gens/homme_costume.glb', 'homme': 'gens/homme.glb', 'hommeManches': 'gens/homme_manches.glb', 'femmeDecontractee': 'gens/femme_decontractee.glb',
           'femmeRobe': 'gens/femme_robe.glb', 'femmeVeste': 'gens/femme_veste.glb', 'ouvrier': 'gens/ouvrier.glb', 'robot': 'gens/robot.glb'},
  'ville': {'palmier0': 'ville/palmier_a.glb', 'palmier1': 'ville/palmier_b.glb', 'palmier2': 'ville/palmier_c.glb', 'voiture0': 'ville/voiture_berline.glb', 'voiture1': 'ville/voiture_compacte.glb',
            'voiture2': 'ville/voiture_suv.glb', 'voiture3': 'ville/voiture_sport.glb', 'yacht': 'ville/yacht.glb', 'voilier': 'ville/voilier.glb'},
}
for famille, modeles in FAMILLES.items():
    json.dump({cle: entree(os.path.join(A, rel), cle) for cle, rel in modeles.items()}, open(os.path.join(P, famille + '.json'), 'w'), separators=(',', ':'))
json.dump({k: base64.b64encode(open(os.path.join(A, 'ciel', k + '.hdr'), 'rb').read()).decode('ascii') for k in ('jour', 'nuit')}, open(os.path.join(P, 'ciel.json'), 'w'), separators=(',', ':'))
tot = 0
for r, _, fs in os.walk(P):
    for f in sorted(fs): t = os.path.getsize(os.path.join(r, f)); tot += t; print(os.path.relpath(os.path.join(r, f), d), round(t / 1e6, 2), 'Mo') if t > 1.2e6 or f.endswith('.json') else None
print('total', round(tot / 1e6, 1), 'Mo,', sum(len(fs) for _, _, fs in os.walk(P)), 'fichiers')
