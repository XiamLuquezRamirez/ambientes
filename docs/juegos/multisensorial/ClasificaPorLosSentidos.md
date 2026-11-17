# Multisensorial / Clasifica por los sentidos (rediseño con motor propio)

Fecha: 2026-11-17. Antes: 6 cuestionarios de tarjetas (canastas y laboratorio DOM). Ahora cada juego tiene un verbo físico propio,
objetos que llegan sin parar, 4 niveles, fondo vivo, presentador 3D, escena final e insignia (la del documento). Los textos de voz y los
retos del documento (`docs/requerimientos.md` de cada carpeta) se conservan: el reto del documento sale en uno de los niveles 1-3 y el resto
se genera al azar con un catálogo de 33 objetos con `sentido` en `config.elementos`.

| Juego | Edad | Sentido(s) | Mecánica | Mundo |
|---|---|---|---|---|
| CanastaDeLaVistaElOjo | 3-4 | vista | Sacudir (frotar de lado a lado o tocar 3 veces) la fruta que cuelga; cae a la canasta del ojo | `arbol.js` |
| CanastaDelOidoLaOreja | 3-4 | oído | Sacar del río lo que suena (arrastrar o tocar) antes de la cascada | `rio.js` |
| CanastaDelOlfatoLaNariz | 3-4 | olfato | Barrer con una escoba (física) hasta la canasta; un toque da un empujón | `escoba.js` |
| ClasificacionDobleVistaVsOido | 5-6 | vista / oído | Portero: soltar arriba (vista) o abajo (oído) lo que pasa por la cinta | `portero.js` |
| ClasificacionDobleOlfatoVsGusto | 5-6 | olfato / gusto | Ascensor: subir la cabina (olfato) o bajarla (gusto); error = la puerta no abre | `ascensor.js` |
| MultipleDiscriminacionTactoVsOlfatoVsOido | 5-6 | tacto / olfato / oído | Dibujar con el dedo la tubería de luz hasta el tubo correcto | `tuberias.js` |

## Escenarios propios (2026-11-17, segunda pasada)
El usuario dijo que los escenarios parecían los mismos (todos el parque de `vida.js`) y la interacción corta. Ahora: **árbol** = atardecer mágico (cielo
violeta→naranja, sol que se pone, estrellas, luciérnagas, flores brillantes), ramas dibujadas de donde cuelgan los objetos, copa que se mece, pájaro que se espanta,
estela de luz y destello en la canasta, arcoíris que se completa con los aciertos, hojas al viento. **Río** = valle de montaña (picos con nieve, pinos, cascada con roca y
bruma), ranas en nenúfares que croan al tocarlas, peces que saltan solos y al acertar, ondas y salpicaduras, red que sigue el dedo. Escoba y los 3 de 5-6 siguen con el escenario
de cocina / laboratorio: pendiente variarlos igual.

## Archivos
Todo lo común vive en `ClasificaPorLosSentidos/comun/`: `kit.js` (SentidosKit sobre `MemoriaKit.BASE`: niveles, `sacar`, `clasificar`, voces,
`propiedad` = lo que «hace» cada objeto según su sentido, canasta, tubo de ensayo, demo, final), `sfx.js` (estímulos del oído y efectos de cada sentido,
sintetizados), `script.js` (flujo; cada carpeta tiene una copia idéntica), los 6 mundos y `img/` (objetos y órganos compartidos).
Por carpeta: `index.html` (carga kit + su mundo), `config.json` (`elementos` iguales en los 6, `demo.ids`, un reto en `niveles`), `style.css`.
`MemoriaAuditiva/comun/kit.js` ahora expone `MemoriaKit.BASE`. Órganos vivos: `EncuentraLaPareja/comun/organos.js`.

## Niveles
3-4: meta 2/3/3/4 aciertos, 3-4 objetos a la vez, ritmo ×1 → ×1.7. 5-6: meta 4/5/6/7, 1/2/2/3 objetos a la vez. Error sin castigo: el objeto
hace lo suyo (suena, brilla, huele, ñam, raspa) y se explica con voz (`COMO` en kit.js).

## Cómo probar (solo horizontal)
`PedniaTutorial.mostrarIntroActiva = () => false; cerrar_anuncio()` con la pantalla de inicio oculta; con el panel oculto empujar
`setInterval(() => PedniaJuego.escena().game.loop.step(performance.now()), 16)`. `PedniaJuego.estado().extra` da posiciones (frutas, flota, suelo,
cinta, cabina/pisos, puestos/tubos) para un bot con `MouseEvent` sobre el canvas. Los 6 pasaron bot completo (4 niveles + error + fiesta) y demo en 1366×768; ascensor también en 898×551.

## Pendientes
- Registro en la base: sin cambios (mismos slugs); los iconos `.png` de portada no se tocaron.
- Los archivos antiguos (`logica.js`, `sfx.js` y `img/` de cada carpeta, `docs/requerimientos.md`) quedan sin uso.
- Escoba: el gato de `vida.gato` no se ve en la cocina; ajustar posición si se quiere.
