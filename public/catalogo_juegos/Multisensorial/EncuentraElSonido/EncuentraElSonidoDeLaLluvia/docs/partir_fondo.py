# Parte img/fondo.svg en capas (img/capas) para animarlas en clima.js (CAPAS y NUBES).
# Uso, desde img/:  python ../docs/partir_fondo.py fondo.svg capas
# Los índices son los hijos del grupo .cls-2 de fondo.svg; si el dibujo cambia, hay que revisarlos.
#   0 = cielo (se quita: el cielo lo pinta clima.js según el tiempo)
#   1, 35-40 = nubes (cada una en su archivo; viajan por detrás de las colinas)
import copy, sys, xml.etree.ElementTree as ET
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS); ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
src, out = sys.argv[1], sys.argv[2]
root = ET.parse(src).getroot()
def grupo(r):
    for g in r.iter('{%s}g' % NS):
        if g.get('class') == 'cls-2': return g
NUBES = {1: (967, 300, 157, 45), 35: (907, 81, 86, 50), 36: (565, 43, 101, 51), 37: (1069, 201, 92, 51),
         38: (107, 101, 86, 50), 39: (269, 191, 92, 51), 40: (622, 257, 90, 52)}
n = len(list(grupo(root)))
assert n == 41, n
capas = {'fondo_base': (set(range(2, 35)), (0, 0, 1280, 720))}
for k, (i, b) in enumerate(sorted(NUBES.items())):
    capas['nube_%d' % (k + 1)] = ({i}, (b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8))
for nombre, (idx, (x, y, w, h)) in capas.items():
    r = copy.deepcopy(root); g = grupo(r)
    for k, el in reversed(list(enumerate(list(g)))):
        if k not in idx: g.remove(el)
    r.set('viewBox', '%g %g %g %g' % (x, y, w, h)); r.set('width', str(w)); r.set('height', str(h))
    ET.ElementTree(r).write('%s/%s.svg' % (out, nombre), encoding='unicode')
    print(nombre, (x, y, w, h))
