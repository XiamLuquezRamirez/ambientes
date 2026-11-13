# Parte img/fondo.svg en capas (img/capas) para animarlas en arbol.js (CAPAS y NUBES).
# Uso, desde img/:  python ../docs/partir_fondo.py fondo.svg capas
# Los índices son los hijos del grupo .cls-3 de fondo.svg; si el dibujo cambia, hay que revisarlos.
import copy, sys, xml.etree.ElementTree as ET
NS='http://www.w3.org/2000/svg'
ET.register_namespace('', NS); ET.register_namespace('xlink','http://www.w3.org/1999/xlink')
src=sys.argv[1]; out=sys.argv[2]
tree=ET.parse(src); root=tree.getroot()
def grupo(r):
    for g in r.iter('{%s}g'%NS):
        if g.get('class')=='cls-3': return g
nubes={1:(908,134,86,50),2:(523,37,101,51),3:(1055,251,92,51),4:(65,95,86,50),5:(212,212,92,51),6:(445,328,90,52)}
capas={'fondo_base':(set([0])|set(range(7,104)),(0,0,1280,720)),
       'copa_atras':(set(range(104,112)),(246,78,788,400)),
       'tronco':({112},(474,181,320,472)),
       'copa_frente':(set(range(113,131)),(403,151,453,270)),
       'frente':(set(range(131,185)),(455,335,367,302))}
for i,b in nubes.items(): capas['nube_%d'%i]=({i},b)
n=len(list(grupo(root)))
assert n==185, n
for nombre,(idx,(x,y,w,h)) in capas.items():
    r=copy.deepcopy(root); g=grupo(r)
    for k,el in reversed(list(enumerate(list(g)))):
        if k not in idx: g.remove(el)
    if nombre!='fondo_base':
        x-=4;y-=4;w+=8;h+=8
    r.set('viewBox','%g %g %g %g'%(x,y,w,h)); r.set('width',str(w)); r.set('height',str(h))
    ET.ElementTree(r).write('%s/%s.svg'%(out,nombre),encoding='unicode')
    print(nombre,(x,y,w,h))
