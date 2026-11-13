# Parte img/tren_escena.svg en cuerpo (sin ruedas) y ruedas sueltas, para que giren en tren.js.
# Uso, desde img/:  python ../docs/partir_tren.py tren_escena.svg
# Índices = hijos de <svg> sin contar <defs> (medidos con getBoundingClientRect en el navegador).
import copy, sys, xml.etree.ElementTree as ET
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS); ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
src = sys.argv[1]
root = ET.parse(src).getroot()
RUEDA_GRANDE = [27, 28, 29, 41, 42, 43, 44, 45]          # locomotora, centro 946,320 r53
RUEDA = [141, 142, 143, 144]                               # vagón, centro 424,335 r40
TODAS = set(RUEDA_GRANDE + [46, 47, 48, 49, 75, 76, 77, 78, 79, 80, 81, 82, 108, 109, 110, 111,
                            112, 113, 114, 115, 141, 142, 143, 144, 145, 146, 147, 148,
                            174, 175, 176, 177, 178, 179, 180, 181])
def armar(nombre, quedan, caja):
    r = copy.deepcopy(root)
    kids = [c for c in list(r) if not c.tag.endswith('defs')]
    assert len(kids) == 182, len(kids)
    for i, el in enumerate(kids):
        if not quedan(i): r.remove(el)
    x, y, w, h = caja
    r.set('viewBox', '%g %g %g %g' % (x, y, w, h)); r.set('width', str(w)); r.set('height', str(h))
    ET.ElementTree(r).write(nombre, encoding='unicode')
    print(nombre, caja)
# Cuerpo: todo menos las ruedas; se recorta el vacío de abajo (el dibujo termina en y 376).
armar('tren_cuerpo.svg', lambda i: i not in TODAS, (0, 0, 1214, 380))
armar('rueda.svg', lambda i: i in RUEDA, (382, 293, 84, 84))
armar('rueda_grande.svg', lambda i: i in RUEDA_GRANDE, (891, 265, 110, 110))
