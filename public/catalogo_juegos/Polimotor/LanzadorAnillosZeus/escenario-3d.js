/**
 * EscenarioAnillos — escena three.js de "El Lanzador de Anillos de Zeus" (window.EscenarioAnillos).
 *
 * Parque de puntería mágica al atardecer, hecho desde cero para este juego: una diana gigante pintada en el pasto
 * con el Cono Mágico Mástil en el centro, una tarima de madera con tres cojines de lanzamiento (rojo, azul y
 * amarillo), y al fondo una feria tranquila (carpas a rayas, rueda de la fortuna, banderines, guirnalda de
 * bombillos, nubes; árboles, casas, animales y césped del kit de las experiencias). Zeus (el GLB compartido, con sus propios clips) está de pie junto al cono.
 *
 * La escena DIBUJA y ANIMA; ReglasAnillos decide; script.js ordena el flujo. Todas las animaciones que el flujo
 * espera devuelven una Promise con respaldo por tiempo, y el bucle de dibujo tiene un respaldo con setInterval
 * para que todo avance aunque el navegador no pinte (pestaña o panel oculto).
 *
 * API:
 *   montar(host, cfg) → Promise<bool>        listo()             reacomodar()
 *   on({tomar, mover, soltar, tocarVacio})   bloquear(bool)      disponibles(ids)
 *   geometria(id) → {salida, cono, anguloCono, alto}
 *   lanzar(id, resultado, avisos) → Promise<bool>   devolver(id) → Promise   regresar(id) → Promise
 *   guia(id|null, opacidad)   resaltar(id|null)   destelloObjetivo(bool)
 *   presentar() → Promise     celebrar(id)        final() → Promise
 *   zeusGesto(nombre)  zeusHablar(bool)  zeusListo()
 *   puntoAnillo(id) → {x, y, r}   puntoCono() → {x, y}   puntoZeus() → {x, y}   puntoPantalla(x, y, z)
 *   demoTomar(id)  demoMover({x, y})  demoSoltar()
 */
import * as THREE from "three";
import { crearCargadorGltf } from "../../intro3d/js/cargador-gltf.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Zeus liviano de la intro (2,2 MB, ~242 000 triángulos, meshopt) en vez de zeus_animado_suave.glb (17,7 MB, ~425 000):
// mismo esqueleto y mismos clips que usa este juego. Pedido del usuario por lentitud en tabletas de 4 GB.
const URL_ZEUS = new URL("../../intro3d/models/nino.glb", import.meta.url).href;
const reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

// ------------------------------------------------------------------ medidas del mundo (unidades ≈ metros)

// posición del nivel 1; cambiarNivel() la mueve (CONO y ZEUS se leen siempre en vivo)
const CONO = { x: 0, z: -1.15, y0: 0.16, alto: 1.75, radioBase: 0.56, radioPunta: 0.07 };
const MASTIL_ALTO = 0.55;                                   // mástil dorado sobre la punta del cono
const PUNTA_Y = CONO.y0 + CONO.alto + MASTIL_ALTO;          // altura de la esfera mágica de la punta
const ANILLO = { R: 0.34, tubo: 0.095 };                      // radio del aro y grosor (agujero: 0.26)
const SLOT_Y = 0.6;
const SLOT_Z = 1.55;
const SLOT_X = [-1.3, 0, 1.3];
const ZEUS = { x: 1.6, z: -1.45, giro: -0.45, escala: 1.6 };
const ARRASTRE_Y = 0.72;
const Z_ARRASTRE_MIN = 0.35;   // borde de la zona de lanzamiento hacia el cono
const TILT_REPOSO = 0.55;

const P_CAMARA = new THREE.Vector3(0, 2.55, 6.3);
const P_MIRA = new THREE.Vector3(0, 1.05, -1.5);
const FOV = 40;

const DATOS_CONO = {
    y0: CONO.y0, alto: CONO.alto, radioBase: CONO.radioBase, radioPunta: CONO.radioPunta,
    radioInterior: ANILLO.R - ANILLO.tubo, tubo: ANILLO.tubo
};

// ------------------------------------------------------------------ estado

let host = null;
let cfg = null;
let renderer = null;
let scene = null;
let camera = null;
let reloj = 0;
let ultimoCuadro = 0;
let listoFlag = false;
let bloqueado = true;
let cb = {};
let anillos = {};             // id → {id, def, grupo, malla, mat, halo, cojin, slot, estado, fase, sel}
let ordenIds = [];
let ensartados = [];          // ids en el mástil, de abajo hacia arriba
let tweens = [];
let particulas = [];
let animables = [];           // funciones (t, dt) del ambiente
let disponiblesIds = null;    // null = todos los que están en reposo

let conoGrupo = null;
let diana = null;
let zeusSombra = null;
let conoCuerpoMat = null;
let puntaMat = null;
let puntaLuz = null;
let halo = null;
let destelloOn = false;
let pulsoCono = 0;
let doradoFinal = 0;
let luzHemi = null;
let luzSol = null;
let bombillos = [];
let rueda = null;
let ruedaVel = 0.12;
let fiesta = 0;               // 0..1: cuánto celebra el ambiente

let guiaGrupo = null;
let guiaPuntos = [];
let guiaId = null;
let guiaOpacidad = 0;
let guiaOpObjetivo = 0;
let resaltado = null;

// Zeus
let zeus = null;
let mixer = null;
let acciones = {};
let accionActual = null;
let zeusHabla = false;
let zeusEnGesto = false;
let nodos = {};
let turnoGesto = {};

// arrastre
let drag = null;              // {id, pointerId, muestras: [{x,y,t}], inicio:{x,y}, desfase: Vector3, objetivo: Vector3}

const raycaster = new THREE.Raycaster();
const vTmp = new THREE.Vector3();

// ------------------------------------------------------------------ utilidades

function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
}

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

const ease = {
    lineal: function (u) { return u; },
    sale: function (u) { return 1 - Math.pow(1 - u, 3); },
    entra: function (u) { return u * u * u; },
    suave: function (u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; },
    rebote: function (u) {
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
    }
};

/** Tween con respaldo por tiempo: la Promise se cumple aunque el bucle no avance. */
function animar(ms, fn, curva) {
    const dur = Math.max(1, reducido ? Math.min(ms, ms * 0.6) : ms);
    return new Promise(function (resolve) {
        const tw = { t0: performance.now(), dur: dur, fn: fn, curva: curva || ease.suave, fin: resolve, hecho: false };
        tweens.push(tw);
        setTimeout(function () {
            if (tw.hecho) return;
            tw.hecho = true;
            try { tw.fn(1, 1); } catch (e) { /* noop */ }
            tweens.splice(tweens.indexOf(tw), 1);
            resolve();
        }, dur + 400);
    });
}

function avanzarTweens(ahora) {
    for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        const u = clamp((ahora - tw.t0) / tw.dur, 0, 1);
        try { tw.fn(tw.curva(u), u); } catch (e) { /* noop */ }
        if (u >= 1 && !tw.hecho) {
            tw.hecho = true;
            tweens.splice(i, 1);
            tw.fin();
        }
    }
}

function lienzo(w, h, pintar) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    pintar(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

function bezier(a, b, c, u, out) {
    const v = 1 - u;
    out.x = v * v * a.x + 2 * v * u * b.x + u * u * c.x;
    out.y = v * v * a.y + 2 * v * u * b.y + u * u * c.y;
    out.z = v * v * a.z + 2 * v * u * b.z + u * u * c.z;
    return out;
}

function sombra(o, recibe) {
    o.traverse(function (m) {
        if (m.isMesh) {
            m.castShadow = true;
            if (recibe) m.receiveShadow = true;
        }
    });
    return o;
}

// ------------------------------------------------------------------ texturas propias

const texEstrella = lienzo(128, 128, function (g, w, h) {
    const cx = w / 2, cy = h / 2;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,240,180,0.9)");
    grad.addColorStop(1, "rgba(255,200,80,0)");
    g.fillStyle = grad;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? w * 0.48 : w * 0.18;
        const a = -Math.PI / 2 + i * Math.PI / 5;
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
});

const texBrillo = lienzo(128, 128, function (g, w, h) {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.2, "rgba(255,246,210,0.85)");
    grad.addColorStop(0.55, "rgba(255,214,120,0.25)");
    grad.addColorStop(1, "rgba(255,200,90,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
});

/** Textura del aro: color de base y un dibujo propio (rayas, puntos o zigzag) para no depender solo del color. */
function texturaAnillo(def) {
    return lienzo(512, 64, function (g, w, h) {
        const grad = g.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, def.brillo || def.color);
        grad.addColorStop(0.5, def.color);
        grad.addColorStop(1, def.color);
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
        g.fillStyle = "rgba(255,255,255,0.95)";
        if (def.dibujo === "rayas") {
            for (let i = 0; i < 10; i++) {
                const x = i * w / 10;
                g.beginPath();
                g.moveTo(x, 0);
                g.lineTo(x + 18, 0);
                g.lineTo(x + 30, h);
                g.lineTo(x + 12, h);
                g.closePath();
                g.fill();
            }
        } else if (def.dibujo === "puntos") {
            for (let i = 0; i < 14; i++) {
                for (let j = 0; j < 2; j++) {
                    g.beginPath();
                    g.arc((i + (j ? 0.5 : 0)) * w / 14 + 10, h * (0.28 + j * 0.46), 7, 0, Math.PI * 2);
                    g.fill();
                }
            }
        } else {
            g.strokeStyle = "rgba(255,255,255,0.95)";
            g.lineWidth = 9;
            g.lineJoin = "round";
            g.beginPath();
            for (let i = 0; i <= 16; i++) g.lineTo(i * w / 16, i % 2 ? h * 0.2 : h * 0.8);
            g.stroke();
        }
    });
}

// ------------------------------------------------------------------ cielo, suelo y luz

function crearCielo() {
    const geo = new THREE.SphereGeometry(70, 32, 16);
    const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
            arriba: { value: new THREE.Color("#3f8fe6") },
            medio: { value: new THREE.Color("#8cc8f5") },
            horizonte: { value: new THREE.Color("#ffd9a6") },
            sol: { value: new THREE.Vector3(-0.55, 0.16, -0.82).normalize() }
        },
        vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: [
            "uniform vec3 arriba; uniform vec3 medio; uniform vec3 horizonte; uniform vec3 sol; varying vec3 vDir;",
            "void main(){",
            "  float h = clamp(vDir.y, -0.2, 1.0);",
            "  vec3 c = mix(horizonte, medio, smoothstep(0.0, 0.22, h));",
            "  c = mix(c, arriba, smoothstep(0.22, 0.75, h));",
            "  float s = max(dot(normalize(vDir), sol), 0.0);",
            "  c += vec3(1.0, 0.82, 0.5) * pow(s, 60.0) * 0.9 + vec3(1.0, 0.7, 0.4) * pow(s, 6.0) * 0.18;",
            "  gl_FragColor = vec4(c, 1.0);",
            "}"
        ].join("\n")
    });
    const cielo = new THREE.Mesh(geo, mat);
    scene.add(cielo);

    // sol bajo de la tarde (disco + halo)
    const sol = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo, color: 0xfff1c8, transparent: true, depthWrite: false, fog: false }));
    sol.position.set(-0.55, 0.16, -0.82).multiplyScalar(60);
    sol.scale.setScalar(14);
    scene.add(sol);

    // nubes de algodón que se desplazan despacio
    const matNube = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffe9d6, emissiveIntensity: 0.35 });
    for (let i = 0; i < 7; i++) {
        const nube = new THREE.Group();
        const n = 4 + (i % 3);
        for (let k = 0; k < n; k++) {
            const b = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), matNube);
            b.scale.set(1.4 + Math.random(), 0.8 + Math.random() * 0.4, 1);
            b.position.set(k * 1.5 - n * 0.7, Math.random() * 0.5, Math.random() * 0.6);
            nube.add(b);
        }
        const x0 = -34 + i * 11;
        nube.position.set(x0, 11 + (i % 3) * 2.5, -32 - (i % 2) * 8);
        nube.scale.setScalar(0.9 + (i % 3) * 0.3);
        scene.add(nube);
        const v = 0.25 + (i % 3) * 0.1;
        animables.push(function (t) {
            nube.position.x = ((x0 + t * v + 40) % 80) - 40;
        });
    }
}

function crearSuelo() {
    const pasto = lienzo(512, 512, function (g, w, h) {
        g.fillStyle = "#6cc04a";
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) {
            const x = Math.random() * w, y = Math.random() * h;
            const tono = Math.random();
            g.fillStyle = tono < 0.5 ? "rgba(70,150,50,0.35)" : "rgba(150,220,100,0.35)";
            g.fillRect(x, y, 2, 5 + Math.random() * 5);
        }
    });
    pasto.wrapS = pasto.wrapT = THREE.RepeatWrapping;
    pasto.repeat.set(26, 26);
    const suelo = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshLambertMaterial({ map: pasto }));
    suelo.rotation.x = -Math.PI / 2;
    // queda debajo del césped de las experiencias (cargarCesped); solo se ve mientras carga y más allá de las baldosas
    suelo.position.y = -0.09;
    suelo.receiveShadow = true;
    scene.add(suelo);

    // colinas suaves en el horizonte
    const colores = [0x8fd06a, 0x7cc35e, 0x9bd877, 0x6fb653];
    for (let i = 0; i < 9; i++) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshLambertMaterial({ color: colores[i % 4] }));
        const ang = -1.2 + i * 0.3;
        c.position.set(Math.sin(ang) * 34, -2, -Math.cos(ang) * 34);
        c.scale.set(9 + (i % 3) * 3, 4.5 + (i % 2) * 2.5, 7);
        scene.add(c);
    }
}

function crearLuces() {
    luzHemi = new THREE.HemisphereLight(0xcfe8ff, 0x7aa35a, 1.35);
    scene.add(luzHemi);
    scene.add(new THREE.AmbientLight(0xfff2e0, 0.55));
    luzSol = new THREE.DirectionalLight(0xffe2b8, 2.6);
    luzSol.position.set(-5.5, 9, 6);
    luzSol.target.position.set(0, 0, -1);
    luzSol.castShadow = true;
    luzSol.shadow.mapSize.set(2048, 2048);
    luzSol.shadow.camera.left = -7;
    luzSol.shadow.camera.right = 7;
    luzSol.shadow.camera.top = 7;
    luzSol.shadow.camera.bottom = -6;
    luzSol.shadow.camera.near = 1;
    luzSol.shadow.camera.far = 30;
    luzSol.shadow.bias = -0.0006;
    luzSol.shadow.normalBias = 0.02;
    luzSol.shadow.radius = 4;
    scene.add(luzSol);
    scene.add(luzSol.target);
    // contraluz cálido desde el sol bajo
    const contra = new THREE.DirectionalLight(0xffc28a, 0.9);
    contra.position.set(-6, 3, -10);
    scene.add(contra);
    scene.fog = new THREE.Fog(0xffe2bd, 26, 62);
}

// ------------------------------------------------------------------ diana y tarima de lanzamiento

function crearDiana() {
    const tex = lienzo(1024, 1024, function (g, w) {
        const c = w / 2;
        const aros = ["#ff6b6b", "#fff4dc", "#4dabf7", "#fff4dc", "#ffd43b", "#fff4dc", "#ff8fab"];
        for (let i = 0; i < aros.length; i++) {
            g.fillStyle = aros[i];
            g.beginPath();
            g.arc(c, c, c * (1 - i / aros.length) - 2, 0, Math.PI * 2);
            g.fill();
        }
        // borde de puntitos dorados
        g.fillStyle = "#f59f00";
        for (let i = 0; i < 48; i++) {
            const a = i / 48 * Math.PI * 2;
            g.beginPath();
            g.arc(c + Math.cos(a) * (c - 22), c + Math.sin(a) * (c - 22), 9, 0, Math.PI * 2);
            g.fill();
        }
        // textura de tela
        g.globalAlpha = 0.06;
        for (let i = 0; i < w; i += 6) {
            g.fillStyle = "#000";
            g.fillRect(i, 0, 1, w);
            g.fillRect(0, i, w, 1);
        }
    });
    diana = new THREE.Mesh(new THREE.CircleGeometry(1.75, 72), new THREE.MeshLambertMaterial({ map: tex }));
    diana.rotation.x = -Math.PI / 2;
    diana.position.set(CONO.x, 0.012, CONO.z);
    diana.receiveShadow = true;
    scene.add(diana);
}

function crearTarima() {
    const madera = lienzo(512, 256, function (g, w, h) {
        g.fillStyle = "#d9a066";
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 8; i++) {
            g.fillStyle = i % 2 ? "#cf935a" : "#e2ab72";
            g.fillRect(0, i * h / 8, w, h / 8 - 3);
            g.fillStyle = "rgba(120,70,30,0.35)";
            g.fillRect(0, (i + 1) * h / 8 - 3, w, 3);
        }
        g.strokeStyle = "rgba(140,85,40,0.25)";
        for (let i = 0; i < 40; i++) {
            const y = Math.random() * h;
            g.beginPath();
            g.moveTo(Math.random() * w, y);
            g.bezierCurveTo(Math.random() * w, y + 4, Math.random() * w, y - 4, Math.random() * w, y + 2);
            g.stroke();
        }
    });
    const forma = new THREE.Shape();
    const W = 4.9, H = 1.5, r = 0.35;
    forma.moveTo(-W / 2 + r, -H / 2);
    forma.lineTo(W / 2 - r, -H / 2);
    forma.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + r);
    forma.lineTo(W / 2, H / 2 - r);
    forma.quadraticCurveTo(W / 2, H / 2, W / 2 - r, H / 2);
    forma.lineTo(-W / 2 + r, H / 2);
    forma.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - r);
    forma.lineTo(-W / 2, -H / 2 + r);
    forma.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + r, -H / 2);
    const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.14, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 3 });
    geo.rotateX(-Math.PI / 2);
    // UV planas para la madera
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W * 2, (pos.getZ(i) + H / 2) / H);
    const tarima = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: madera, roughness: 0.8 }));
    tarima.position.set(0, 0, SLOT_Z);
    tarima.receiveShadow = true;
    tarima.castShadow = true;
    scene.add(tarima);

    // línea de lanzamiento: rayitas blancas en el borde que mira al cono
    const matLinea = new THREE.MeshBasicMaterial({ color: 0xfffbf0 });
    for (let i = 0; i < 15; i++) {
        const raya = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 0.06), matLinea);
        raya.position.set(-2.1 + i * 0.3, 0.215, SLOT_Z - H / 2 + 0.14);
        scene.add(raya);
    }
}

/** Cojín de lanzamiento: anillo de luz del color del aro (marca dónde vive cada anillo). */
function crearCojin(def, x) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.6, 0.08, 40),
        new THREE.MeshStandardMaterial({ color: 0xfff4e2, roughness: 0.6 })
    );
    base.position.y = 0.04;
    base.receiveShadow = true;
    g.add(base);
    const borde = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.035, 10, 48),
        new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.25, roughness: 0.4 })
    );
    borde.rotation.x = -Math.PI / 2;
    borde.position.y = 0.085;
    g.add(borde);
    const luz = new THREE.Mesh(
        new THREE.RingGeometry(0.2, 0.62, 40),
        new THREE.MeshBasicMaterial({ color: def.brillo || def.color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    luz.rotation.x = -Math.PI / 2;
    luz.position.y = 0.092;
    g.add(luz);
    g.position.set(x, 0.21, SLOT_Z);
    scene.add(g);
    return { grupo: g, luz: luz, borde: borde };
}

// ------------------------------------------------------------------ Cono Mágico Mástil

function crearCono() {
    conoGrupo = new THREE.Group();
    conoGrupo.position.set(CONO.x, 0, CONO.z);

    // base: plataforma octogonal turquesa con ribete dorado
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.76, 0.86, CONO.y0, 8),
        new THREE.MeshStandardMaterial({ color: 0x20c4b4, roughness: 0.35, metalness: 0.1 })
    );
    base.position.y = CONO.y0 / 2;
    conoGrupo.add(base);
    const ribete = new THREE.Mesh(
        new THREE.TorusGeometry(0.77, 0.03, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffc94a, metalness: 0.7, roughness: 0.25, emissive: 0x8a5a00, emissiveIntensity: 0.3 })
    );
    ribete.rotation.x = -Math.PI / 2;
    ribete.rotation.z = Math.PI / 8;
    ribete.position.y = CONO.y0;
    conoGrupo.add(ribete);

    // cuerpo del cono: bandas de colores con estrellitas
    const tex = lienzo(256, 1024, function (g, w, h) {
        const bandas = ["#7b2ff7", "#fff3e0", "#ff5fa2", "#fff3e0", "#ff8a1f", "#fff3e0", "#ffc21a"];
        const alto = h / bandas.length;
        bandas.forEach(function (c, i) {
            g.fillStyle = c;
            g.fillRect(0, h - (i + 1) * alto, w, alto + 1);
        });
        g.fillStyle = "rgba(255,255,255,0.85)";
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * w, y = Math.random() * h, r = 2 + Math.random() * 3;
            g.beginPath();
            for (let k = 0; k < 8; k++) {
                const a = k * Math.PI / 4;
                const rr = k % 2 ? r * 0.4 : r;
                g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
            }
            g.fill();
        }
    });
    conoCuerpoMat = new THREE.MeshPhysicalMaterial({
        map: tex, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2,
        emissive: new THREE.Color(0xff9a3c), emissiveIntensity: 0.06
    });
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(CONO.radioPunta, CONO.radioBase, CONO.alto, 56, 1, false), conoCuerpoMat);
    cuerpo.position.y = CONO.y0 + CONO.alto / 2;
    conoGrupo.add(cuerpo);

    // mástil dorado y esfera mágica de la punta
    const mastil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.06, MASTIL_ALTO, 16),
        new THREE.MeshStandardMaterial({ color: 0xffd060, metalness: 0.85, roughness: 0.22, emissive: 0x7a4c00, emissiveIntensity: 0.35 })
    );
    mastil.position.y = CONO.y0 + CONO.alto + MASTIL_ALTO / 2 - 0.02;
    conoGrupo.add(mastil);
    puntaMat = new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: 0xffb92e, emissiveIntensity: 1.1, roughness: 0.2 });
    const punta = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), puntaMat);
    punta.position.y = PUNTA_Y;
    conoGrupo.add(punta);
    puntaLuz = new THREE.PointLight(0xffc75a, 1.2, 4.5, 1.6);
    puntaLuz.position.y = PUNTA_Y;
    conoGrupo.add(puntaLuz);

    // halo del objetivo (destello en la punta)
    halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo, color: 0xffe08a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.y = PUNTA_Y;
    halo.scale.setScalar(0.75);
    conoGrupo.add(halo);

    sombra(conoGrupo, true);
    scene.add(conoGrupo);

    animables.push(function (t, dt) {
        pulsoCono = Math.max(0, pulsoCono - dt * 1.3);
        const respira = 0.5 + 0.5 * Math.sin(t * 2.2);
        const objetivo = destelloOn ? 1 : 0;
        halo.material.opacity = 0.32 + respira * 0.18 + objetivo * (0.35 + respira * 0.3) + pulsoCono * 0.8 + doradoFinal * 0.5;
        halo.scale.setScalar(0.7 + respira * 0.12 + objetivo * (0.4 + respira * 0.3) + pulsoCono * 1.6 + doradoFinal * 0.9);
        puntaLuz.intensity = 1.1 + respira * 0.4 + pulsoCono * 9 + doradoFinal * 5;
        puntaMat.emissiveIntensity = 1 + pulsoCono * 2 + doradoFinal * 1.5;
        conoCuerpoMat.emissiveIntensity = 0.06 + pulsoCono * 0.5 + doradoFinal * 0.35;
        if (doradoFinal > 0) conoCuerpoMat.emissive.setRGB(1, 0.75 + 0.1 * respira, 0.25);
    });
}

// ------------------------------------------------------------------ anillos

function crearAnillo(def, i) {
    const grupo = new THREE.Group();
    grupo.rotation.order = "YXZ";
    const mat = new THREE.MeshPhysicalMaterial({
        map: texturaAnillo(def), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12,
        emissive: new THREE.Color(def.color), emissiveIntensity: 0.08
    });
    const malla = new THREE.Mesh(new THREE.TorusGeometry(ANILLO.R, ANILLO.tubo, 24, 72), mat);
    malla.rotation.x = -Math.PI / 2;      // acostado: el agujero mira hacia arriba
    malla.castShadow = true;
    grupo.add(malla);
    // aura cuando se selecciona o se resalta
    const aura = new THREE.Mesh(
        new THREE.TorusGeometry(ANILLO.R, ANILLO.tubo * 1.9, 12, 48),
        new THREE.MeshBasicMaterial({ color: def.brillo || def.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    aura.rotation.x = -Math.PI / 2;
    grupo.add(aura);
    const slot = new THREE.Vector3(SLOT_X[i], SLOT_Y, SLOT_Z);
    grupo.position.copy(slot);
    grupo.rotation.set(TILT_REPOSO, 0, 0);
    scene.add(grupo);
    const cojin = crearCojin(def, SLOT_X[i]);
    return {
        id: def.id, def: def, grupo: grupo, malla: malla, mat: mat, aura: aura, cojin: cojin, slot: slot,
        estado: "reposo", fase: i * 2.1, sel: 0, giro: 0, visible: true, objetivo: null
    };
}

function enReposo(a) {
    return a && a.estado === "reposo";
}

function animarAnillos(t, dt) {
    ordenIds.forEach(function (id) {
        const a = anillos[id];
        const quiereSel = (drag && drag.id === id) ? 1 : (resaltado === id ? 0.6 + 0.4 * Math.sin(t * 6) : 0);
        a.sel += (quiereSel - a.sel) * Math.min(1, dt * 10);
        a.aura.material.opacity = a.sel * 0.55;
        a.mat.emissiveIntensity = 0.08 + a.sel * 0.35;
        const esc = 1 + a.sel * 0.12;
        a.malla.scale.setScalar(esc);
        a.aura.scale.setScalar(esc);
        if (a.estado === "reposo") {
            a.grupo.position.y = a.slot.y + Math.sin(t * 1.7 + a.fase) * 0.05;
            a.grupo.rotation.x = TILT_REPOSO + Math.sin(t * 1.3 + a.fase) * 0.05;
            a.malla.rotation.z += dt * 0.25;
            a.grupo.rotation.z = Math.sin(t * 1.1 + a.fase) * 0.04;
        } else if (a.estado === "arrastre" && a.objetivo) {
            const g = a.grupo.position;
            const vx = (a.objetivo.x - g.x), vz = (a.objetivo.z - g.z);
            g.x += vx * Math.min(1, dt * 18);
            g.z += vz * Math.min(1, dt * 18);
            g.y += (a.objetivo.y - g.y) * Math.min(1, dt * 10);
            // se inclina hacia donde va el dedo
            a.grupo.rotation.x += ((TILT_REPOSO * 0.6 + clamp(vz * 0.8, -0.4, 0.4)) - a.grupo.rotation.x) * Math.min(1, dt * 8);
            a.grupo.rotation.z += (clamp(-vx * 0.8, -0.4, 0.4) - a.grupo.rotation.z) * Math.min(1, dt * 8);
            a.malla.rotation.z += dt * 0.6;
        }
        // el cojín se enciende cuando su anillo está en casa
        const enCasa = a.estado === "reposo" || a.estado === "arrastre";
        const luzObj = enCasa ? 0.3 + 0.08 * Math.sin(t * 2 + a.fase) : 0.06;
        a.cojin.luz.material.opacity += (luzObj - a.cojin.luz.material.opacity) * Math.min(1, dt * 4);
    });
}

// ------------------------------------------------------------------ feria del fondo

function crearRueda() {
    const g = new THREE.Group();
    const matSoporte = new THREE.MeshLambertMaterial({ color: 0xf8f0ff });
    [-1, 1].forEach(function (lado) {
        [-1, 1].forEach(function (z) {
            const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.4, 8), matSoporte);
            pata.position.set(lado * 1.1, 2.05, z * 0.45);
            pata.rotation.z = -lado * 0.26;
            g.add(pata);
        });
    });
    rueda = new THREE.Group();
    rueda.position.y = 4.1;
    const matAro = new THREE.MeshStandardMaterial({ color: 0xff5fa2, roughness: 0.5 });
    [-0.35, 0.35].forEach(function (z) {
        const aro = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.06, 8, 64), matAro);
        aro.position.z = z;
        rueda.add(aro);
    });
    const matRayo = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const cabinas = [];
    const coloresCabina = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x51cf66, 0xcc5de8, 0xff922b, 0x22b8cf, 0xf06595];
    for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const rayo = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.7, 0.05), matRayo);
        rayo.position.set(Math.cos(a) * 1.35, Math.sin(a) * 1.35, 0);
        rayo.rotation.z = a - Math.PI / 2;
        rueda.add(rayo);
        const cabina = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.42, 10), new THREE.MeshLambertMaterial({ color: coloresCabina[i] }));
        cabina.position.set(Math.cos(a) * 2.7, Math.sin(a) * 2.7 - 0.3, 0);
        rueda.add(cabina);
        cabinas.push(cabina);
    }
    // bombillos del aro
    for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
        b.position.set(Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0.4);
        rueda.add(b);
        bombillos.push({ m: b, fase: i * 0.7, base: new THREE.Color(0xfff3b0) });
    }
    const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1, 12), new THREE.MeshStandardMaterial({ color: 0xffd060, metalness: 0.6 }));
    eje.rotation.x = Math.PI / 2;
    rueda.add(eje);
    g.add(rueda);
    g.position.set(6.4, 0, -13);
    g.rotation.y = -0.35;
    scene.add(g);
    animables.push(function (t, dt) {
        rueda.rotation.z += dt * (ruedaVel + fiesta * 0.5);
        cabinas.forEach(function (c) { c.rotation.z = -rueda.rotation.z; });
    });
}

/** Cuerda colgante con banderines o bombillos entre dos puntos (catenaria simple). */
function cuerda(a, b, comba, n, crear) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        pts.push(new THREE.Vector3(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u - Math.sin(u * Math.PI) * comba, a.z + (b.z - a.z) * u));
    }
    const curva = new THREE.CatmullRomCurve3(pts);
    const hilo = new THREE.Mesh(new THREE.TubeGeometry(curva, 48, 0.012, 4), new THREE.MeshBasicMaterial({ color: 0x6b4b3a }));
    scene.add(hilo);
    for (let i = 1; i < n; i++) crear(curva.getPoint(i / n), i);
}

function crearBanderines() {
    const colores = [0xff6b6b, 0xffd43b, 0x4dabf7, 0x69db7c, 0xcc5de8, 0xff922b];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-0.17, 0, 0, 0.17, 0, 0, 0, -0.38, 0], 3));
    geo.computeVertexNormals();
    const postes = [[-5.2, -4.6], [5.2, -4.6]];
    const matPoste = lienzo(64, 256, function (g, w, h) {
        for (let i = 0; i < 12; i++) {
            g.fillStyle = i % 2 ? "#ffffff" : "#ff5fa2";
            g.fillRect(0, i * h / 12, w, h / 12 + 1);
        }
    });
    postes.forEach(function (p) {
        const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 4.2, 10), new THREE.MeshLambertMaterial({ map: matPoste }));
        poste.position.set(p[0], 2.1, p[1]);
        poste.castShadow = true;
        scene.add(poste);
        const bola = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffd060, metalness: 0.6, roughness: 0.3 }));
        bola.position.set(p[0], 4.25, p[1]);
        scene.add(bola);
    });
    cuerda(new THREE.Vector3(-5.2, 4.05, -4.6), new THREE.Vector3(5.2, 4.05, -4.6), 0.65, 22, function (pt, i) {
        const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: colores[i % colores.length], side: THREE.DoubleSide }));
        m.position.copy(pt);
        scene.add(m);
        animables.push(function (t) {
            m.rotation.x = Math.sin(t * 2.4 + i * 0.7) * (0.18 + fiesta * 0.35);
        });
    });
    cuerda(new THREE.Vector3(-5.2, 3.75, -4.6), new THREE.Vector3(5.2, 3.75, -4.6), 0.95, 30, function (pt, i) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1b8 }));
        b.position.copy(pt);
        scene.add(b);
        bombillos.push({ m: b, fase: i * 1.3, base: new THREE.Color([0xfff1b8, 0xffc9de, 0xc5f6fa][i % 3]) });
    });
    animables.push(function (t) {
        bombillos.forEach(function (b) {
            const k = 0.65 + 0.35 * Math.sin(t * 3 + b.fase) + fiesta * (0.6 + 0.4 * Math.sin(t * 14 + b.fase));
            b.m.material.color.copy(b.base).multiplyScalar(clamp(k, 0.3, 1.6));
        });
    });
}

// ------------------------------------------------------------------ mundo con los modelos de las experiencias
//
// Árboles, arbustos, casas y animales son los GLB del kit low-poly de las experiencias (public/assets/modelos,
// el mismo que arma el mundo en assets/js/mapa-mundo.js). Cada GLB se carga una vez y se clona; los animales
// pasean alrededor de su "casa" con sus propios clips (caminar, reposo, pastar, picotear, volar), como en el
// mundo de las experiencias. Todo queda al fondo, lejos del cono, la tarima y los anillos.

const URL_KIT = new URL("../../../assets/modelos/", import.meta.url);
const kit = new Map();

function cargarKit(ruta) {
    if (!kit.has(ruta)) {
        kit.set(ruta, crearCargadorGltf().loadAsync(new URL(ruta + ".glb", URL_KIT).href).then(function (gltf) {
            const root = gltf.scene;
            root.traverse(function (o) {
                if (o.isMesh && o.material && !o.material.userData.kit) {
                    o.material.flatShading = true;      // mismo acabado facetado que en las experiencias
                    o.material.needsUpdate = true;
                    o.material.userData.kit = true;
                }
            });
            root.updateMatrixWorld(true);
            const caja = new THREE.Box3().setFromObject(root);
            return { root: root, animaciones: gltf.animations || [], alto: Math.max(0.01, caja.max.y - caja.min.y), piso: caja.min.y };
        }));
    }
    return kit.get(ruta);
}

/**
 * Versión "fundida" de un modelo quieto (árbol, arbusto, casa): todas sus piezas del mismo material en una sola
 * malla. Una casa del kit tiene 90-135 piezas; fundida queda en una por material (de 1100 a ~250 dibujos por cuadro).
 */
function fundido(m, celda) {
    if (m.fundido) return m.fundido;
    const porMat = new Map();
    m.root.updateMatrixWorld(true);
    m.root.traverse(function (o) {
        if (!o.isMesh || !o.geometry) return;
        let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        Object.keys(g.attributes).forEach(function (n) { if (n !== "position" && n !== "normal") g.deleteAttribute(n); });
        if (!g.attributes.normal) g.computeVertexNormals();
        g.morphAttributes = {};
        g.applyMatrix4(o.matrixWorld);
        if (celda) {
            const s = simplificar(g, celda);
            g.dispose();
            g = s;
        }
        const lista = porMat.get(o.material) || [];
        lista.push(g);
        porMat.set(o.material, lista);
    });
    const grupo = new THREE.Group();
    porMat.forEach(function (geos, mat) {
        const unida = mergeGeometries(geos, false);
        geos.forEach(function (g) { g.dispose(); });
        if (unida) grupo.add(new THREE.Mesh(unida, mat));
    });
    m.fundido = grupo;
    return grupo;
}

/**
 * Baja la resolución de una geometría (sin índice, ya en coordenadas del modelo) agrupando vértices en celdas de
 * `celda` de lado: los vértices de una misma celda se juntan en su promedio y los triángulos que quedan aplastados se
 * descartan. Solo para este juego y en memoria; los .glb del kit no se tocan.
 */
function simplificar(g, celda) {
    const pos = g.attributes.position, nor = g.attributes.normal;
    const n = pos.count;
    const clave = new Array(n);
    const suma = new Map();
    for (let i = 0; i < n; i++) {
        const k = Math.round(pos.getX(i) / celda) + "," + Math.round(pos.getY(i) / celda) + "," + Math.round(pos.getZ(i) / celda);
        clave[i] = k;
        let c = suma.get(k);
        if (!c) suma.set(k, c = [0, 0, 0, 0]);
        c[0] += pos.getX(i); c[1] += pos.getY(i); c[2] += pos.getZ(i); c[3]++;
    }
    const P = [], N = [];
    for (let i = 0; i + 2 < n; i += 3) {
        const a = clave[i], b = clave[i + 1], c = clave[i + 2];
        if (a === b || b === c || a === c) continue;
        [i, i + 1, i + 2].forEach(function (j) {
            const q = suma.get(clave[j]);
            P.push(q[0] / q[3], q[1] / q[3], q[2] / q[3]);
            N.push(nor.getX(j), nor.getY(j), nor.getZ(j));
        });
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    out.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    return out;
}

/** Clona un modelo del kit con el alto pedido (en metros de la escena) y lo apoya en el pasto. */
async function colocarKit(ruta, x, z, alto, giro, opts) {
    const m = await cargarKit(ruta);
    const o = (opts && opts.estatico ? fundido(m, opts.celda ? m.alto * opts.celda : 0) : m.root).clone(true);
    const k = alto / m.alto;
    o.scale.setScalar(k);
    o.position.set(x, -m.piso * k, z);
    o.rotation.y = giro || 0;
    o.traverse(function (c) {
        if (c.isMesh) {
            c.castShadow = !(opts && opts.sinSombra);
            c.receiveShadow = true;
        }
    });
    scene.add(o);
    return { o: o, m: m, k: k };
}

const ARBOLES_KIT = [
    // [modelo, x, z, alto, giro]
    ["02_vegetacion/ceiba", -8.2, -6.6, 5.2, 0.4],
    ["02_vegetacion/mango", -10.4, -10.6, 4.6, 1.2],
    ["02_vegetacion/canaguate", -6.9, -14.2, 4.8, 2],
    ["02_vegetacion/palma_coco", 8.8, -6.6, 5.4, 0.6],
    ["02_vegetacion/mango", 10.6, -11, 4.4, 2.6],
    ["02_vegetacion/ceiba", -13.5, -16.5, 6, 1],
    ["02_vegetacion/canaguate", 13.4, -16.8, 5, 0.3],
    ["02_vegetacion/palma_coco", -4.2, -17.5, 5.6, 1.9],
    ["02_vegetacion/platanera", 2.4, -17.6, 2.6, 0.8],
    ["02_vegetacion/platanera", -9.4, -2.9, 2.2, 0.5],
    ["02_vegetacion/cardon_cactus", 10.1, -2.8, 2, 0]
];

const ARBUSTOS_KIT = [[-3.6, 0.7], [3.0, 0.7], [-3.2, -0.8], [2.8, -0.6], [-4.7, -1.8], [4.3, -1.6], [-6.5, -4.4], [6.8, -4.9]];

const CASAS_KIT = [
    ["07_casas_tematicas/polimotor", -1.9, -13.2, 3.8, 0.12],
    ["10_edificios/casa_refugio", -6.4, -9.4, 3.1, 0.5],
    ["07_casas_tematicas/multisaberes", 2.6, -10.8, 3.3, -0.3]
];

const CELDA_CASAS = 0.02;

const MARIPOSAS_KIT = [[-3.4, 0.9], [3.2, 0.9], [-4.4, -1.6]];

function accionDe(mixer, clips, nombre, unaVez) {
    const c = clips.find(function (x) { return x.name === nombre; });
    if (!c) return null;
    const a = mixer.clipAction(c);
    if (unaVez) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
    } else {
        a.setLoop(THREE.LoopRepeat, Infinity);
    }
    return a;
}

/** Mariposas que revolotean sobre las flores de los lados. */
async function mariposasKit() {
    for (let i = 0; i < MARIPOSAS_KIT.length; i++) {
        const c = MARIPOSAS_KIT[i];
        // el modelo es casi plano (2 cm de alto): a esta escala queda de ~13 cm de ala a ala (pequeñita)
        const r = await colocarKit("05_aves_insectos_peces/mariposa", c[0], c[1], 0.01, 0, { sinSombra: true });
        const mixer = new THREE.AnimationMixer(r.o);
        const volar = accionDe(mixer, r.m.animaciones, "volar");
        if (volar) volar.play();
        animables.push(function (t, dt) {
            const k = t * 0.8 + i * 2.1;
            r.o.position.set(c[0] + Math.cos(k) * 0.6 + Math.sin(k * 2.3) * 0.2, 0.55 + Math.sin(t * 3 + i) * 0.18, c[1] + Math.sin(k) * 0.45);
            r.o.rotation.y = Math.atan2(-Math.sin(k), Math.cos(k));
            mixer.update(dt);
        });
    }
}

async function cargarMundoExperiencias() {
    const tareas = [];
    ARBOLES_KIT.forEach(function (a, i) {
        tareas.push(colocarKit(a[0], a[1], a[2], a[3], a[4], { estatico: true }).then(function (r) {
            // las copas se mecen apenas con el viento
            const g0 = r.o.rotation.z;
            animables.push(function (t) { r.o.rotation.z = g0 + Math.sin(t * 0.8 + i) * 0.012; });
        }));
    });
    ARBUSTOS_KIT.forEach(function (p, i) {
        tareas.push(colocarKit("02_vegetacion/arbusto", p[0], p[1], 0.55 + (i % 3) * 0.08, i * 1.3, { estatico: true }));
    });
    // casas en menor resolución (celda = 2 % de su alto, ~7 cm): al fondo no se nota y alivia tabletas modestas
    CASAS_KIT.forEach(function (c) { tareas.push(colocarKit(c[0], c[1], c[2], c[3], c[4], { estatico: true, celda: CELDA_CASAS })); });
    // sin animales ni aves (lentitud en tabletas de 4 GB): solo las mariposas
    tareas.push(mariposasKit());
    await Promise.all(tareas);
}

/**
 * Detalle de briznas para el césped: textura clara (casi blanca) con briznas más oscuras y puntas brillantes que
 * multiplica el color por vértice del césped de las experiencias, así conserva sus tonos y gana textura de pasto.
 * Se dibuja sin costuras (cada brizna cerca del borde se repite del otro lado).
 */
function texturaBriznas() {
    const t = lienzo(1024, 1024, function (g, w, h) {
        g.fillStyle = "#f2fbe9";
        g.fillRect(0, 0, w, h);
        // manchas suaves de luz y sombra
        for (let i = 0; i < 70; i++) {
            const x = Math.random() * w, y = Math.random() * h, r = 40 + Math.random() * 110;
            const claro = Math.random() < 0.5;
            [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]].forEach(function (o) {
                const gr = g.createRadialGradient(x + o[0], y + o[1], 0, x + o[0], y + o[1], r);
                gr.addColorStop(0, claro ? "rgba(255,255,240,0.35)" : "rgba(120,150,90,0.22)");
                gr.addColorStop(1, "rgba(0,0,0,0)");
                g.fillStyle = gr;
                g.fillRect(x + o[0] - r, y + o[1] - r, r * 2, r * 2);
            });
        }
        const tonos = ["#a9cf8f", "#b9d99f", "#98c47c", "#c8e4b0", "#8fbb72", "#d6ecc2"];
        g.lineCap = "round";
        for (let i = 0; i < 14000; i++) {
            const x = Math.random() * w, y = Math.random() * h;
            const largo = 7 + Math.random() * 13;
            const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
            const dx = Math.cos(ang) * largo, dy = Math.sin(ang) * largo;
            const ancho = 1.4 + Math.random() * 1.8;
            const color = tonos[(Math.random() * tonos.length) | 0];
            [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]].forEach(function (o) {
                const x0 = x + o[0], y0 = y + o[1];
                if (x0 < -30 || x0 > w + 30 || y0 < -30 || y0 > h + 30) return;
                g.strokeStyle = color;
                g.lineWidth = ancho;
                g.beginPath();
                g.moveTo(x0, y0);
                g.quadraticCurveTo(x0 + dx * 0.3 + (Math.random() - 0.5) * 3, y0 + dy * 0.6, x0 + dx, y0 + dy);
                g.stroke();
                // punta con luz
                g.strokeStyle = "rgba(255,255,235,0.55)";
                g.lineWidth = ancho * 0.6;
                g.beginPath();
                g.moveTo(x0 + dx * 0.75, y0 + dy * 0.75);
                g.lineTo(x0 + dx, y0 + dy);
                g.stroke();
            });
        }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 8;
    return t;
}

/**
 * Césped de las experiencias: baldosas de 20 m de `01_relieve/terreno_tile_20m.glb` (césped con color por vértice,
 * matas de pasto y pétalos), las mismas del mundo de las experiencias. Se funden en una malla por material y:
 *   - el relieve se aplana casi del todo y queda bajo y = 0 (la diana, la tarima y los cojines no se hunden);
 *   - las matas y los pétalos se quitan donde estorban: diana y cono de los dos niveles, tarima, cojines y pies de Zeus.
 * Cada baldosa va girada un cuarto de vuelta distinto para que no se note la repetición.
 */
function zonasDespejadas() {
    const zonas = [];
    const rondas = (cfg && cfg.rondas && cfg.rondas.length) ? cfg.rondas : [{ cono: { x: CONO.x, z: CONO.z }, zeus: { x: ZEUS.x, z: ZEUS.z } }];
    rondas.forEach(function (r) {
        if (r.cono) zonas.push({ x: Number(r.cono.x) || 0, z: Number(r.cono.z), r: 2.05 });
        if (r.zeus) zonas.push({ x: Number(r.zeus.x), z: Number(r.zeus.z), r: 0.75 });
    });
    return function despejado(x, z) {
        // tarima de lanzamiento y su borde
        if (Math.abs(x) < 2.85 && z > 0.55 && z < 2.55) return true;
        for (let i = 0; i < zonas.length; i++) {
            if (Math.hypot(x - zonas[i].x, z - zonas[i].z) < zonas[i].r) return true;
        }
        return false;
    };
}

async function cargarCesped() {
    const gltf = await crearCargadorGltf().loadAsync(new URL("01_relieve/terreno_tile_20m.glb", URL_KIT).href);
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    const despejado = zonasDespejadas();
    const porMat = new Map();      // material → {pos: [], nor: [], col: [] | null}
    const m4 = new THREE.Matrix4();
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const nm = new THREE.Matrix3();
    let k = 0;
    for (let ix = -40; ix <= 40; ix += 20) {
        for (let iz = -50; iz <= 10; iz += 20) {
            const giro = new THREE.Matrix4().makeRotationY((k++ % 4) * Math.PI / 2);
            const lugar = new THREE.Matrix4().makeTranslation(ix, 0, iz).multiply(giro);
            root.traverse(function (o) {
                if (!o.isMesh || !o.geometry) return;
                const esCesped = o.material && o.material.name === "cesped";
                const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
                const P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color;
                m4.multiplyMatrices(lugar, o.matrixWorld);
                nm.getNormalMatrix(m4);
                let d = porMat.get(o.material);
                if (!d) {
                    d = { pos: [], nor: [], col: esCesped && C ? [] : null, cesped: esCesped };
                    porMat.set(o.material, d);
                }
                for (let t = 0; t < P.count; t += 3) {
                    // centro del triángulo, para despejar las matas y los pétalos donde se juega
                    if (!esCesped) {
                        v.set(0, 0, 0);
                        for (let q = 0; q < 3; q++) v.add(new THREE.Vector3().fromBufferAttribute(P, t + q).applyMatrix4(m4));
                        v.multiplyScalar(1 / 3);
                        if (despejado(v.x, v.z)) continue;
                    }
                    for (let q = 0; q < 3; q++) {
                        v.fromBufferAttribute(P, t + q).applyMatrix4(m4);
                        // el relieve casi plano y apenas bajo el suelo; las matas se apoyan igual
                        if (esCesped) v.y = v.y * 0.3 - 0.04;
                        else v.y -= 0.07;
                        d.pos.push(v.x, v.y, v.z);
                        if (N) {
                            n.fromBufferAttribute(N, t + q).applyMatrix3(nm).normalize();
                            d.nor.push(n.x, n.y, n.z);
                        } else {
                            d.nor.push(0, 1, 0);
                        }
                        if (d.col) d.col.push(C.getX(t + q), C.getY(t + q), C.getZ(t + q));
                    }
                }
            });
        }
    }
    porMat.forEach(function (d, mat) {
        if (!d.pos.length) return;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(d.pos, 3));
        geo.setAttribute("normal", new THREE.Float32BufferAttribute(d.nor, 3));
        if (d.col) geo.setAttribute("color", new THREE.Float32BufferAttribute(d.col, 3));
        if (d.cesped) {
            // coordenadas de textura en el plano: las briznas se repiten cada 2,2 m
            const uv = new Float32Array(d.pos.length / 3 * 2);
            for (let i = 0, j = 0; i < d.pos.length; i += 3, j += 2) {
                uv[j] = d.pos[i] / 2.2;
                uv[j + 1] = d.pos[i + 2] / 2.2;
            }
            geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
            mat.map = texturaBriznas();
            mat.flatShading = false;
        } else {
            mat.flatShading = true;
        }
        mat.vertexColors = !!d.col;
        mat.needsUpdate = true;
        const malla = new THREE.Mesh(geo, mat);
        malla.receiveShadow = true;
        malla.castShadow = false;
        scene.add(malla);
    });
}

/** Letrero de feria hecho para este juego. */
function crearLetrero() {
    const tex = lienzo(512, 192, function (g, w, h) {
        g.fillStyle = "#fff4dc";
        g.beginPath();
        g.roundRect(6, 6, w - 12, h - 12, 36);
        g.fill();
        g.lineWidth = 12;
        g.strokeStyle = "#ff5fa2";
        g.stroke();
        g.fillStyle = "#ffc21a";
        for (let i = 0; i < 14; i++) {
            g.beginPath();
            g.arc(30 + i * (w - 60) / 13, 22, 7, 0, Math.PI * 2);
            g.arc(30 + i * (w - 60) / 13, h - 22, 7, 0, Math.PI * 2);
            g.fill();
        }
        g.fillStyle = "#7b2ff7";
        g.font = "700 64px Fredoka, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("¡PUNTERÍA!", w / 2, h / 2 + 4);
    });
    const g = new THREE.Group();
    const tabla = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.64), new THREE.MeshLambertMaterial({ map: tex, transparent: true }));
    tabla.position.y = 1.55;
    g.add(tabla);
    [-0.6, 0.6].forEach(function (x) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.3, 8), new THREE.MeshLambertMaterial({ color: 0x8a5a3b }));
        p.position.set(x, 0.65, -0.02);
        g.add(p);
    });
    g.position.set(-3.3, 0, -3.4);
    g.rotation.y = 0.35;
    sombra(g);
    scene.add(g);
}

function crearFlores() {
    const colores = [0xff6b9a, 0xffd43b, 0xffffff, 0xb197fc, 0xff922b];
    const matTallo = new THREE.MeshLambertMaterial({ color: 0x3f9b39 });
    const zonas = [[-3.3, 0.9], [3.3, 0.9], [-2.9, -0.6], [3.1, -0.4], [-4.4, -1.6], [4.6, -1.4]];
    zonas.forEach(function (z, zi) {
        for (let i = 0; i < 7; i++) {
            const g = new THREE.Group();
            const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 4), matTallo);
            tallo.position.y = 0.14;
            g.add(tallo);
            const flor = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshLambertMaterial({ color: colores[(i + zi) % colores.length], emissive: 0x221100, emissiveIntensity: 0.2 }));
            flor.position.y = 0.3;
            flor.scale.y = 0.6;
            g.add(flor);
            g.position.set(z[0] + Math.cos(i * 2.4) * 0.4 * (i % 3), 0, z[1] + Math.sin(i * 2.4) * 0.3 * (i % 3));
            scene.add(g);
            const fase = i + zi * 3;
            animables.push(function (t) {
                g.rotation.z = Math.sin(t * 1.6 + fase) * 0.08;
            });
        }
    });
}

/** Motas de luz mágica que flotan por el parque. */
function crearMotas() {
    const n = 70;
    const pos = new Float32Array(n * 3);
    const datos = [];
    for (let i = 0; i < n; i++) {
        datos.push({ x: (Math.random() - 0.5) * 12, y: Math.random() * 4, z: -6 + Math.random() * 8, v: 0.1 + Math.random() * 0.2, f: Math.random() * 6 });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: texBrillo, size: 0.14, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0c0 });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    animables.push(function (t) {
        for (let i = 0; i < n; i++) {
            const d = datos[i];
            const y = (d.y + t * d.v) % 4.2;
            pos[i * 3] = d.x + Math.sin(t * 0.6 + d.f) * 0.4;
            pos[i * 3 + 1] = 0.2 + y;
            pos[i * 3 + 2] = d.z + Math.cos(t * 0.5 + d.f) * 0.3;
        }
        geo.attributes.position.needsUpdate = true;
        mat.size = 0.14 + fiesta * 0.08;
    });
}

// ------------------------------------------------------------------ partículas (estrellas, confeti, serpentinas, fuegos)

function chispa(p, v, opts) {
    const o = opts || {};
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: o.mapa || texEstrella, color: o.color || 0xffffff, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false
    }));
    sp.position.copy(p);
    const tam = o.tam || 0.22;
    sp.scale.setScalar(tam);
    scene.add(sp);
    particulas.push({ o: sp, v: v.clone(), vida: o.vida || 1, t: 0, g: o.g != null ? o.g : 2.5, tam: tam, giro: (Math.random() - 0.5) * 6, tipo: "chispa" });
}

function estallidoEstrellas(centro, n, fuerza, colores) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const e = Math.random() * 0.9 + 0.2;
        const v = new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) + 0.3, Math.sin(a) * Math.cos(e)).multiplyScalar(fuerza * (0.6 + Math.random() * 0.6));
        chispa(centro, v, { color: colores ? colores[i % colores.length] : 0xffe58a, tam: 0.14 + Math.random() * 0.18, vida: 0.9 + Math.random() * 0.6 });
    }
}

function confeti(centro, n, ancho) {
    const colores = [0xff6b6b, 0xffd43b, 0x4dabf7, 0x69db7c, 0xcc5de8, 0xff922b, 0xffffff];
    for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.11), new THREE.MeshLambertMaterial({ color: colores[i % colores.length], side: THREE.DoubleSide, emissive: 0x222222 }));
        m.position.set(centro.x + (Math.random() - 0.5) * (ancho || 1), centro.y + Math.random() * 0.4, centro.z + (Math.random() - 0.5) * (ancho || 1) * 0.6);
        scene.add(m);
        particulas.push({
            o: m, v: new THREE.Vector3((Math.random() - 0.5) * 2.2, 1.5 + Math.random() * 2.2, (Math.random() - 0.5) * 1.6),
            vida: 2.6 + Math.random(), t: 0, g: 3.2, giro: (Math.random() - 0.5) * 12, tipo: "confeti", aire: 2.4
        });
    }
}

function serpentinas(n) {
    const colores = [0xff5fa2, 0xffd43b, 0x4dabf7, 0x69db7c, 0xcc5de8];
    for (let i = 0; i < n; i++) {
        const pts = [];
        for (let k = 0; k <= 30; k++) {
            const u = k / 30;
            pts.push(new THREE.Vector3(Math.cos(u * 18) * 0.12, -u * 1.1, Math.sin(u * 18) * 0.12));
        }
        const m = new THREE.Mesh(
            new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.018, 4),
            new THREE.MeshLambertMaterial({ color: colores[i % colores.length], emissive: 0x332211 })
        );
        m.position.set((Math.random() - 0.5) * 7, 4.5 + Math.random() * 2.5, -2.5 + Math.random() * 3);
        scene.add(m);
        particulas.push({ o: m, v: new THREE.Vector3((Math.random() - 0.5) * 0.4, -0.6 - Math.random() * 0.5, 0), vida: 6 + Math.random() * 2, t: 0, g: 0, giro: 1.5 + Math.random(), tipo: "serpentina" });
    }
}

function fuegoArtificial(p, color) {
    for (let i = 0; i < 36; i++) {
        const a = i / 36 * Math.PI * 2;
        const b = (Math.random() - 0.5) * 1.2;
        const v = new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b) * 0.9 + 0.2, Math.sin(a) * Math.cos(b) * 0.4).multiplyScalar(3.2);
        chispa(p, v, { mapa: texBrillo, color: color, tam: 0.35, vida: 1.4, g: 1.4 });
    }
}

function avanzarParticulas(dt) {
    for (let i = particulas.length - 1; i >= 0; i--) {
        const q = particulas[i];
        q.t += dt;
        const u = q.t / q.vida;
        if (u >= 1) {
            scene.remove(q.o);
            if (q.o.geometry && q.o.geometry !== undefined && !q.o.isSprite) q.o.geometry.dispose();
            if (q.o.material) q.o.material.dispose();
            particulas.splice(i, 1);
            continue;
        }
        q.v.y -= q.g * dt;
        if (q.aire) {
            q.v.x *= 1 - Math.min(1, q.aire * dt * 0.5);
            q.v.z *= 1 - Math.min(1, q.aire * dt * 0.5);
            if (q.v.y < -0.9) q.v.y = -0.9;
        }
        q.o.position.addScaledVector(q.v, dt);
        if (q.tipo === "chispa") {
            q.o.material.rotation += q.giro * dt;
            q.o.material.opacity = 1 - u * u;
            q.o.scale.setScalar(q.tam * (1 + u * 0.4));
        } else if (q.tipo === "confeti") {
            q.o.rotation.x += q.giro * dt;
            q.o.rotation.y += q.giro * 0.7 * dt;
            if (q.o.position.y < 0.02) {
                q.o.position.y = 0.02;
                q.v.set(0, 0, 0);
                q.g = 0;
            }
            q.o.material.transparent = true;
            q.o.material.opacity = u > 0.8 ? (1 - u) * 5 : 1;
        } else if (q.tipo === "serpentina") {
            q.o.rotation.y += q.giro * dt;
            q.o.material.transparent = true;
            q.o.material.opacity = u > 0.85 ? (1 - u) / 0.15 : 1;
        }
    }
}

// ------------------------------------------------------------------ guía punteada (anillo → punta del cono)

function crearGuia() {
    guiaGrupo = new THREE.Group();
    for (let i = 0; i < 18; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrillo, color: 0xfff3c4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
        sp.renderOrder = 10;
        guiaGrupo.add(sp);
        guiaPuntos.push(sp);
    }
    // punta de flecha: estrella al final
    const fin = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEstrella, color: 0xffe066, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    fin.renderOrder = 11;
    guiaGrupo.add(fin);
    guiaPuntos.push(fin);
    scene.add(guiaGrupo);
}

const gA = new THREE.Vector3(), gB = new THREE.Vector3(), gC = new THREE.Vector3(), gP = new THREE.Vector3();

function animarGuia(t, dt) {
    guiaOpacidad += (guiaOpObjetivo - guiaOpacidad) * Math.min(1, dt * 5);
    const a = guiaId ? anillos[guiaId] : null;
    if (!a || guiaOpacidad < 0.01) {
        guiaPuntos.forEach(function (s) { s.material.opacity = 0; });
        return;
    }
    gA.copy(a.grupo.position);
    gC.set(CONO.x, PUNTA_Y + 0.28, CONO.z);
    gB.set((gA.x + gC.x) / 2, Math.max(gA.y, gC.y) + 1.1, (gA.z + gC.z) / 2);
    const n = guiaPuntos.length - 1;
    const fase = (t * 0.9) % 1;
    for (let i = 0; i < n; i++) {
        const u = (i + fase) / n;
        bezier(gA, gB, gC, 0.06 + u * 0.9, gP);
        const s = guiaPuntos[i];
        s.position.copy(gP);
        s.scale.setScalar(0.13 + 0.05 * Math.sin((u - t) * 9));
        s.material.opacity = guiaOpacidad * (0.35 + 0.65 * Math.sin(u * Math.PI));
    }
    const fin = guiaPuntos[n];
    fin.position.copy(gC);
    fin.scale.setScalar(0.42 + 0.08 * Math.sin(t * 6));
    fin.material.rotation = t * 1.5;
    fin.material.opacity = guiaOpacidad;
}

// ------------------------------------------------------------------ Zeus (GLB compartido)

const GESTOS = {
    saluda: ["Saludar"],
    senala: ["Senalar"],
    celebra: ["Celebrar", "Aplaudir", "Porra_con_pompones", "Saltar"],
    animo: ["Decir_si", "Aplaudir"],
    baila: ["Bailar"],
    final: ["Porra_con_pompones"]
};

function zeusCruzar(sig, dur) {
    if (!sig || sig === accionActual) return;
    sig.reset();
    sig.setEffectiveWeight(1);
    sig.play();
    if (accionActual) accionActual.crossFadeTo(sig, dur != null ? dur : 0.3, false);
    accionActual = sig;
}

function zeusBase() {
    return zeusHabla ? (acciones.Hablar || acciones.Quieto) : acciones.Quieto;
}

async function cargarZeus() {
    try {
        const gltf = await new Promise(function (resolve, reject) {
            crearCargadorGltf().load(URL_ZEUS, resolve, undefined, reject);
        });
        zeus = gltf.scene;
        zeus.scale.setScalar(ZEUS.escala);
        zeus.position.set(ZEUS.x, 0, ZEUS.z);
        zeus.rotation.y = ZEUS.giro;
        zeus.traverse(function (o) {
            if (o.name) nodos[o.name] = o;
            if (o.isMesh) {
                o.castShadow = true;
                o.receiveShadow = false;
            }
        });
        scene.add(zeus);
        mixer = new THREE.AnimationMixer(zeus);
        (gltf.animations || []).forEach(function (c) { acciones[c.name] = mixer.clipAction(c); });
        ["Quieto", "Hablar", "Bailar"].forEach(function (n) {
            if (acciones[n]) acciones[n].setLoop(THREE.LoopRepeat, Infinity);
        });
        mixer.addEventListener("finished", function (ev) {
            if (ev.action !== accionActual) return;
            zeusEnGesto = false;
            zeusCruzar(zeusBase(), 0.35);
        });
        zeusCruzar(zeusBase(), 0);
        // sombra de contacto suave bajo los pies
        const s = zeusSombra = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ map: texBrillo, color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
        s.rotation.x = -Math.PI / 2;
        s.position.set(ZEUS.x, 0.014, ZEUS.z);
        scene.add(s);
        return true;
    } catch (e) {
        console.warn("[EscenarioAnillos] no se pudo cargar Zeus", e);
        return false;
    }
}

function zeusGesto(nombre) {
    if (!mixer) return;
    const lista = GESTOS[nombre];
    if (!lista) return;
    turnoGesto[nombre] = (turnoGesto[nombre] || 0) + 1;
    const a = acciones[lista[(turnoGesto[nombre] - 1) % lista.length]];
    if (!a) return;
    if (nombre === "baila") {
        a.setLoop(THREE.LoopRepeat, Infinity);
    } else {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
    }
    zeusEnGesto = true;
    accionActual = null;
    zeusCruzar(a, 0.25);
    Object.keys(acciones).forEach(function (k) {
        if (acciones[k] !== a && acciones[k].isRunning()) acciones[k].fadeOut(0.25);
    });
}

function zeusHablar(on) {
    zeusHabla = !!on;
    if (!mixer || zeusEnGesto) return;
    zeusCruzar(zeusBase(), 0.25);
}

// ------------------------------------------------------------------ cámara y tamaño

function puntosClave() {
    const pts = [];
    SLOT_X.forEach(function (x) {
        pts.push(new THREE.Vector3(x - 0.55, SLOT_Y, SLOT_Z), new THREE.Vector3(x + 0.55, SLOT_Y, SLOT_Z));
        pts.push(new THREE.Vector3(x, 0.21, SLOT_Z + 0.62), new THREE.Vector3(x, SLOT_Y + 0.15, SLOT_Z - 0.4));
    });
    pts.push(new THREE.Vector3(CONO.x, PUNTA_Y + 0.25, CONO.z));
    pts.push(new THREE.Vector3(ZEUS.x + 0.45, 1.75, ZEUS.z), new THREE.Vector3(ZEUS.x - 0.3, 1.8, ZEUS.z));
    pts.push(new THREE.Vector3(-2.2, 0, CONO.z));
    return pts;
}

function encuadrar() {
    if (!renderer || !host) return;
    const w = Math.max(64, host.clientWidth);
    const h = Math.max(64, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = FOV;
    camera.updateProjectionMatrix();
    // margen superior para la cabecera (reiniciar, progreso) y algo abajo
    const techo = 1 - 2 * Math.min(0.2, 96 / h);
    const piso = -0.95;
    const pts = puntosClave();
    const cabe = function (s) {
        camera.position.copy(P_MIRA).addScaledVector(vTmp.copy(P_CAMARA).sub(P_MIRA), s);
        camera.lookAt(P_MIRA);
        camera.updateMatrixWorld(true);
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i].clone().project(camera);
            if (p.x < -0.95 || p.x > 0.95 || p.y > techo || p.y < piso) return false;
        }
        return true;
    };
    let lo = 0.55, hi = 2.6;
    if (!cabe(hi)) {
        lo = hi;
    } else {
        for (let k = 0; k < 18; k++) {
            const m = (lo + hi) / 2;
            if (cabe(m)) hi = m;
            else lo = m;
        }
    }
    // el centro vertical se corre un poco para usar el espacio sobrante sin cortar nada
    cabe(hi);
}

function aPantalla(v) {
    if (!renderer) return null;
    const r = renderer.domElement.getBoundingClientRect();
    const p = v.clone().project(camera);
    return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
}

function rayoDesde(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray;
}

function puntoEnPlano(cx, cy, y) {
    const rayo = rayoDesde(cx, cy);
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    const out = new THREE.Vector3();
    return rayo.intersectPlane(plano, out) ? out : null;
}

function puntoAnillo(id) {
    const a = anillos[id];
    if (!a) return null;
    const c = aPantalla(a.grupo.position);
    const b = aPantalla(a.grupo.position.clone().add(new THREE.Vector3(ANILLO.R + ANILLO.tubo, 0, 0)));
    return { x: c.x, y: c.y, r: Math.abs(b.x - c.x) };
}

// ------------------------------------------------------------------ entrada (ratón y dedo)

function puedeTomar(a) {
    if (!enReposo(a)) return false;
    return !disponiblesIds || disponiblesIds.indexOf(a.id) >= 0;
}

/** El anillo más cercano al dedo (zona táctil generosa: 1,45 × el radio dibujado, mínimo 64 px). */
function anilloBajo(cx, cy) {
    let mejor = null;
    let dMejor = Infinity;
    ordenIds.forEach(function (id) {
        const a = anillos[id];
        if (!puedeTomar(a)) return;
        const p = puntoAnillo(id);
        if (!p) return;
        const d = Math.hypot(cx - p.x, (cy - p.y) * 1.15);
        const r = Math.max(64, p.r * 1.45);
        if (d < r && d < dMejor) {
            dMejor = d;
            mejor = a;
        }
    });
    return mejor;
}

function empezarArrastre(a, cx, cy, pointerId) {
    const ahora = performance.now();
    const golpe = puntoEnPlano(cx, cy, ARRASTRE_Y) || a.grupo.position.clone();
    drag = {
        id: a.id, pointerId: pointerId, muestras: [{ x: cx, y: cy, t: ahora }], inicio: { x: cx, y: cy, t: ahora },
        desfase: new THREE.Vector3(a.grupo.position.x - golpe.x, 0, a.grupo.position.z - golpe.z)
    };
    a.estado = "arrastre";
    // el gesto se mide desde aquí: la dirección al cono también (no desde donde quedó el anillo al soltarlo)
    a.tomadoEn = aPantalla(a.grupo.position);
    a.objetivo = a.grupo.position.clone();
    if (cb.tomar) cb.tomar(a.id);
}

function moverArrastre(cx, cy) {
    if (!drag) return;
    const ahora = performance.now();
    drag.muestras.push({ x: cx, y: cy, t: ahora });
    if (drag.muestras.length > 60) drag.muestras.shift();
    const a = anillos[drag.id];
    // dedo por encima del horizonte: no corta el suelo; se trata como "más allá del borde"
    const p = puntoEnPlano(cx, cy, ARRASTRE_Y) || new THREE.Vector3(a ? a.grupo.position.x : 0, ARRASTRE_Y, -1e3);
    if (a) {
        p.add(drag.desfase);
        // el anillo se queda en la zona de lanzamiento (no se puede llevar con la mano hasta el cono).
        // Si el dedo sube más allá del borde, el anillo se eleva junto al dedo en ese borde en vez de seguir el punto
        // del suelo: ese punto se va al fondo y, por la perspectiva, arrastraba de lado los anillos de las esquinas.
        let y = ARRASTRE_Y;
        if (p.z < Z_ARRASTRE_MIN) {
            const rayo = rayoDesde(cx, cy);
            const t = (Z_ARRASTRE_MIN - drag.desfase.z - rayo.origin.z) / (rayo.direction.z || -1e-6);
            if (t > 0) {
                p.x = rayo.origin.x + rayo.direction.x * t + drag.desfase.x;
                y = clamp(rayo.origin.y + rayo.direction.y * t, ARRASTRE_Y, ARRASTRE_Y + 0.9);
            }
        }
        a.objetivo = new THREE.Vector3(clamp(p.x, -2.6, 2.6), y, clamp(p.z, Z_ARRASTRE_MIN, 2.4));
    }
    const prev = drag.muestras[drag.muestras.length - 2];
    if (prev && cb.mover) {
        const v = Math.hypot(cx - prev.x, cy - prev.y) / Math.max(1, ahora - prev.t);
        cb.mover(drag.id, clamp(v / 2, 0, 1));
    }
}

function gestoDe(d) {
    const m = d.muestras;
    const fin = m[m.length - 1];
    let j = m.length - 1;
    while (j > 0 && fin.t - m[j - 1].t < 120) j--;
    const ini = m[Math.max(0, j - 1)];
    const dtF = Math.max(16, fin.t - ini.t);
    return {
        dx: fin.x - d.inicio.x,
        dy: fin.y - d.inicio.y,
        ms: fin.t - d.inicio.t,
        dxFin: fin.x - ini.x,
        dyFin: fin.y - ini.y,
        vel: Math.hypot(fin.x - ini.x, fin.y - ini.y) / (dtF / 1000)
    };
}

function terminarArrastre(cancelado) {
    if (!drag) return;
    const d = drag;
    drag = null;
    const a = anillos[d.id];
    if (!a) return;
    const gesto = gestoDe(d);
    a.objetivo = null;
    if (cancelado || !cb.soltar) {
        regresar(d.id);
        return;
    }
    cb.soltar(d.id, gesto);
}

function enlazarEntrada() {
    const el = renderer.domElement;
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", function (ev) {
        if (ev.button != null && ev.button > 0) return;
        if (bloqueado || drag) return;
        const a = anilloBajo(ev.clientX, ev.clientY);
        if (!a) {
            if (cb.tocarVacio) cb.tocarVacio(ev.clientX, ev.clientY);
            return;
        }
        ev.preventDefault();
        try { el.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        empezarArrastre(a, ev.clientX, ev.clientY, ev.pointerId);
    });
    el.addEventListener("pointermove", function (ev) {
        if (!drag || drag.pointerId !== ev.pointerId) return;
        ev.preventDefault();
        const lista = typeof ev.getCoalescedEvents === "function" ? ev.getCoalescedEvents() : null;
        if (lista && lista.length) lista.forEach(function (e2) { moverArrastre(e2.clientX, e2.clientY); });
        else moverArrastre(ev.clientX, ev.clientY);
    });
    const fin = function (ev) {
        if (!drag || drag.pointerId !== ev.pointerId) return;
        try { el.releasePointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        terminarArrastre(ev.type === "pointercancel");
    };
    el.addEventListener("pointerup", fin);
    el.addEventListener("pointercancel", fin);
    el.addEventListener("lostpointercapture", function (ev) {
        if (drag && drag.pointerId === ev.pointerId) terminarArrastre(false);
    });
    // sin menú contextual ni arrastre de imagen al mantener presionado
    el.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
}

// ------------------------------------------------------------------ vuelos del anillo

function geometria(id) {
    const a = anillos[id];
    const h = renderer ? renderer.domElement.getBoundingClientRect().height : 600;
    const pa = a.tomadoEn || aPantalla(a.grupo.position);
    const pc = aPantalla(new THREE.Vector3(CONO.x, PUNTA_Y, CONO.z));
    return {
        salida: { x: a.grupo.position.x, z: a.grupo.position.z },
        cono: { x: CONO.x, z: CONO.z },
        anguloCono: Math.atan2(pc.x - pa.x, -(pc.y - pa.y)),
        alto: h
    };
}

/** Vuelo por una curva: el anillo gira sobre sí mismo y termina acostado. */
function volar(a, desde, control, hasta, ms, giros, alAvance) {
    const p = new THREE.Vector3();
    const rx0 = a.grupo.rotation.x, rz0 = a.grupo.rotation.z, ry0 = a.malla.rotation.z;
    return animar(ms, function (u) {
        bezier(desde, control, hasta, u, p);
        a.grupo.position.copy(p);
        a.malla.rotation.z = ry0 + giros * Math.PI * 2 * u;
        // bamboleo que se apaga al llegar
        a.grupo.rotation.x = rx0 * (1 - u) + Math.sin(u * 9) * 0.22 * (1 - u);
        a.grupo.rotation.z = rz0 * (1 - u) + Math.cos(u * 7) * 0.18 * (1 - u);
        if (alAvance) alAvance(u, p);
    }, ease.lineal);
}

function estela(a) {
    if (Math.random() < 0.55) {
        chispa(a.grupo.position, new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.2, (Math.random() - 0.5) * 0.3), { color: new THREE.Color(a.def.brillo || a.def.color), tam: 0.12, vida: 0.5, g: 0.4 });
    }
}

/**
 * Lanza el anillo según el resultado de ReglasAnillos.evaluar.
 * avisos: {vuelo(ms), encaje(), rebote(k), recuperar(), ensartado(), fallo()}
 * Devuelve Promise<bool> (true si quedó ensartado).
 */
async function lanzar(id, res, avisos) {
    const a = anillos[id];
    if (!a) return false;
    const av = avisos || {};
    a.estado = "vuelo";
    const desde = a.grupo.position.clone();
    if (res.acierto) {
        const k = ensartados.length;
        const yFin = ReglasAnillos.alturaApilado(k, DATOS_CONO);
        const arriba = new THREE.Vector3(CONO.x, PUNTA_Y + 0.4, CONO.z);
        const ctrl = new THREE.Vector3((desde.x + arriba.x) / 2, Math.max(desde.y, arriba.y) + 1.25, (desde.z + arriba.z) / 2 + 0.2);
        const ms = 900;
        if (av.vuelo) av.vuelo(ms);
        await volar(a, desde, ctrl, arriba, ms, 2.2, function () { estela(a); });
        // baja por el mástil: cae con gravedad, asienta y se bambolea un poquito
        ensartados.push(id);
        const y0 = arriba.y;
        const rot0 = a.malla.rotation.z;
        await animar(480, function (u) {
            a.grupo.position.set(CONO.x, y0 + (yFin - y0) * u, CONO.z);
            a.malla.rotation.z = rot0 + u * 1.2;
            a.grupo.rotation.x = Math.sin(u * 10) * 0.05 * (1 - u);
        }, ease.entra);
        if (av.encaje) av.encaje();
        await animar(260, function (u) {
            a.grupo.position.y = yFin + Math.sin(u * Math.PI) * 0.035 * (1 - u);
            a.grupo.rotation.x = Math.sin(u * 14) * 0.06 * (1 - u);
            a.grupo.rotation.z = Math.cos(u * 12) * 0.05 * (1 - u);
        }, ease.lineal);
        a.grupo.rotation.x = 0;
        a.grupo.rotation.z = 0;
        a.estado = "ensartado";
        if (av.ensartado) av.ensartado();
        return true;
    }

    // ---- fallo: sigue su trayectoria, cae, rebota y vuelve a su cojín
    const obst = [
        { x: CONO.x, z: CONO.z, r: 0.9 + ANILLO.R + ANILLO.tubo },
        { x: ZEUS.x, z: ZEUS.z, r: 0.45 + ANILLO.R + ANILLO.tubo }
    ];
    let T = { x: clamp(res.destino.x, -4.2, 4.2), z: clamp(res.destino.z, -6.6, 0.5) };
    T = ReglasAnillos.caidaSegura(T, obst, 0.08);
    const suelo = ANILLO.tubo + 0.01;
    const hasta = new THREE.Vector3(T.x, suelo, T.z);
    // si la recta pasa cerca del cono o de Zeus, la curva sube lo suficiente para pasar por encima
    let alto = Math.max(desde.y, 0.5) + 0.9;
    if (ReglasAnillos.distanciaSegmento(desde, T, obst[0]) < obst[0].r + 0.1) alto = Math.max(alto, PUNTA_Y + 1.5);
    if (ReglasAnillos.distanciaSegmento(desde, T, obst[1]) < obst[1].r + 0.1) alto = Math.max(alto, 2 * 1.85 + 0.6);
    const ctrl = new THREE.Vector3((desde.x + T.x) / 2, alto, (desde.z + T.z) / 2);
    const largo = Math.hypot(T.x - desde.x, T.z - desde.z);
    const ms = clamp(520 + largo * 110, 600, 1150);
    if (av.vuelo) av.vuelo(ms);
    await volar(a, desde, ctrl, hasta, ms, 1.6, function () { estela(a); });
    if (av.fallo) av.fallo();
    // botes hacia adelante, cada vez más cortos
    let dir = new THREE.Vector2(T.x - desde.x, T.z - desde.z);
    if (dir.lengthSq() < 1e-4) dir.set(0, -1);
    dir.normalize();
    const botes = [[0.42, 0.22, 330], [0.18, 0.07, 220]];
    for (let k = 0; k < botes.length; k++) {
        if (av.rebote) av.rebote(k);
        const p0 = a.grupo.position.clone();
        let q = { x: p0.x + dir.x * botes[k][0], z: p0.z + dir.y * botes[k][0] };
        q = ReglasAnillos.caidaSegura({ x: clamp(q.x, -4.4, 4.4), z: clamp(q.z, -6.8, 0.6) }, obst, 0.05);
        const alt = botes[k][1];
        const rx0 = a.grupo.rotation.x;
        await animar(botes[k][2], function (u) {
            a.grupo.position.set(p0.x + (q.x - p0.x) * u, suelo + Math.sin(u * Math.PI) * alt, p0.z + (q.z - p0.z) * u);
            a.grupo.rotation.x = rx0 * (1 - u) + Math.sin(u * Math.PI) * 0.35 * (k === 0 ? 1 : 0.5);
            a.malla.rotation.z += 0.04;
        }, ease.lineal);
    }
    await animar(260, function (u) {
        a.grupo.rotation.x = Math.sin(u * 12) * 0.08 * (1 - u);
        a.grupo.rotation.z = Math.cos(u * 10) * 0.08 * (1 - u);
    }, ease.lineal);
    await sleep(420);
    if (av.recuperar) av.recuperar();
    await regresar(id);
    return false;
}

/** El anillo vuelve volando a su cojín (con brillitos), listo para otro intento. */
async function regresar(id) {
    const a = anillos[id];
    if (!a) return;
    a.estado = "regreso";
    const desde = a.grupo.position.clone();
    const hasta = a.slot.clone();
    const lejos = desde.distanceTo(hasta);
    if (lejos < 0.05) {
        a.estado = "reposo";
        return;
    }
    const ctrl = new THREE.Vector3((desde.x + hasta.x) / 2, Math.max(desde.y, hasta.y) + 0.4 + lejos * 0.25, (desde.z + hasta.z) / 2);
    const rx0 = a.grupo.rotation.x;
    const ms = clamp(300 + lejos * 160, 320, 900);
    await animar(ms, function (u) {
        bezier(desde, ctrl, hasta, u, a.grupo.position);
        a.grupo.rotation.x = rx0 + (TILT_REPOSO - rx0) * u;
        a.malla.rotation.z += 0.05;
        if (lejos > 0.6) estela(a);
    }, ease.suave);
    a.grupo.position.copy(hasta);
    a.estado = "reposo";
}

/** Demo: el anillo sube del mástil y vuelve a su cojín (la demo no cuenta). */
async function devolver(id) {
    const a = anillos[id];
    if (!a) return;
    const i = ensartados.indexOf(id);
    if (i >= 0) ensartados.splice(i, 1);
    a.estado = "regreso";
    const y0 = a.grupo.position.y;
    await animar(420, function (u) {
        a.grupo.position.set(CONO.x, y0 + (PUNTA_Y + 0.4 - y0) * u, CONO.z);
        a.malla.rotation.z += 0.06;
    }, ease.sale);
    await regresar(id);
}

// ------------------------------------------------------------------ niveles

/**
 * Pasa al nivel siguiente: los anillos salen del mástil y vuelven a sus cojines; luego el cono (con su diana) y
 * Zeus se van caminando hasta su nuevo lugar, más lejos. def: {cono: {x, z}, zeus: {x, z, giro}}.
 */
async function cambiarNivel(def) {
    const ids = ensartados.slice().reverse();
    await Promise.all(ids.map(function (id, i) {
        return sleep(i * 220).then(function () { return devolver(id); });
    }));
    const c0 = { x: CONO.x, z: CONO.z };
    const c1 = { x: Number(def.cono.x) || 0, z: Number(def.cono.z) };
    const z0 = { x: ZEUS.x, z: ZEUS.z };
    const z1 = { x: Number(def.zeus.x), z: Number(def.zeus.z) };
    const giro = def.zeus.giro != null ? Number(def.zeus.giro) : ZEUS.giro;
    // Zeus camina de espaldas a la cámara hasta su nuevo lugar (clip "Caminar" del GLB) y se vuelve a girar
    const caminar = acciones.Caminar;
    if (caminar) {
        caminar.setLoop(THREE.LoopRepeat, Infinity);
        zeusEnGesto = true;
        accionActual = null;
        zeusCruzar(caminar, 0.3);
    }
    const yaw0 = zeus ? zeus.rotation.y : 0;
    const espalda = Math.PI - 0.3;
    await animar(1900, function (u, crudo) {
        CONO.x = c0.x + (c1.x - c0.x) * u;
        CONO.z = c0.z + (c1.z - c0.z) * u;
        conoGrupo.position.set(CONO.x, 0, CONO.z);
        if (diana) diana.position.set(CONO.x, 0.012, CONO.z);
        ZEUS.x = z0.x + (z1.x - z0.x) * crudo;
        ZEUS.z = z0.z + (z1.z - z0.z) * crudo;
        if (zeus) {
            zeus.position.set(ZEUS.x, 0, ZEUS.z);
            const w = crudo < 0.15 ? crudo / 0.15 : (crudo > 0.85 ? (1 - crudo) / 0.15 : 1);
            const fin = crudo > 0.5 ? giro : yaw0;
            zeus.rotation.y = fin + (espalda - fin) * w;
        }
        if (zeusSombra) zeusSombra.position.set(ZEUS.x, 0.014, ZEUS.z);
    }, ease.suave);
    ZEUS.giro = giro;
    if (zeus) zeus.rotation.y = giro;
    zeusEnGesto = false;
    zeusCruzar(zeusBase(), 0.35);
    pulsoCono = 0.8;
    estallidoEstrellas(new THREE.Vector3(CONO.x, PUNTA_Y, CONO.z), 16, 1.8, [0xffe58a, 0xffffff]);
}

// ------------------------------------------------------------------ celebraciones

function celebrar(id) {
    const a = anillos[id];
    pulsoCono = 1;
    fiesta = Math.max(fiesta, 1);
    const tope = new THREE.Vector3(CONO.x, PUNTA_Y, CONO.z);
    const color = a ? new THREE.Color(a.def.brillo || a.def.color) : new THREE.Color(0xffe58a);
    estallidoEstrellas(tope, reducido ? 12 : 30, 2.6, [0xffe58a, 0xffffff, color.getHex()]);
    confeti(new THREE.Vector3(CONO.x, PUNTA_Y + 0.2, CONO.z), reducido ? 16 : 40, 1.6);
    // onda de luz que sale del anillo recién ensartado
    if (a) {
        const onda = new THREE.Mesh(
            new THREE.RingGeometry(0.45, 0.55, 48),
            new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
        );
        onda.rotation.x = -Math.PI / 2;
        onda.position.copy(a.grupo.position);
        scene.add(onda);
        animar(700, function (u) {
            onda.scale.setScalar(1 + u * 2.6);
            onda.material.opacity = 0.8 * (1 - u);
        }, ease.sale).then(function () {
            scene.remove(onda);
            onda.geometry.dispose();
            onda.material.dispose();
        });
    }
}

async function presentar() {
    // los anillos aparecen con un pop, uno por uno, y la punta del cono brilla
    ordenIds.forEach(function (id) { anillos[id].grupo.scale.setScalar(0.001); });
    for (let i = 0; i < ordenIds.length; i++) {
        const a = anillos[ordenIds[i]];
        animar(520, function (u) { a.grupo.scale.setScalar(Math.max(0.001, u)); }, ease.rebote);
        estallidoEstrellas(a.grupo.position, 10, 1.2, [new THREE.Color(a.def.brillo).getHex(), 0xffffff]);
        if (cb.aparece) cb.aparece(a.id);
        await sleep(330);
    }
    pulsoCono = 0.8;
    await sleep(300);
}

async function final() {
    fiesta = 1;
    ruedaVel = 0.35;
    animar(1400, function (u) {
        doradoFinal = u;
        luzHemi.intensity = 1.35 + u * 0.4;
        luzSol.color.setRGB(1, 0.886 - u * 0.05, 0.72 - u * 0.12);
    });
    const tope = new THREE.Vector3(CONO.x, PUNTA_Y, CONO.z);
    estallidoEstrellas(tope, 40, 3.2, [0xffe58a, 0xffffff, 0xffc21a]);
    serpentinas(reducido ? 6 : 18);
    confeti(new THREE.Vector3(0, 3.6, -1.5), reducido ? 30 : 90, 6);
    const colores = [0xff6b9a, 0xffd43b, 0x4dabf7, 0x69db7c, 0xcc5de8];
    for (let i = 0; i < (reducido ? 2 : 6); i++) {
        setTimeout(function () {
            fuegoArtificial(new THREE.Vector3(-4 + Math.random() * 8, 5.2 + Math.random() * 1.6, -6 - Math.random() * 3), colores[i % colores.length]);
            if (cb.fuego) cb.fuego();
        }, 300 + i * 650);
    }
    await sleep(900);
}

function finalLluvia() {
    confeti(new THREE.Vector3(0, 3.8, -1.2), reducido ? 20 : 60, 6);
    estallidoEstrellas(new THREE.Vector3(CONO.x, PUNTA_Y, CONO.z), 20, 2.4, [0xffe58a, 0xffffff]);
    pulsoCono = 0.7;
}

// ------------------------------------------------------------------ bucle

function cuadro(ahora) {
    const dt = Math.min(0.05, Math.max(0.001, (ahora - ultimoCuadro) / 1000));
    ultimoCuadro = ahora;
    reloj += reducido ? dt * 0.5 : dt;
    avanzarTweens(ahora);
    animables.forEach(function (f) { f(reloj, dt); });
    animarAnillos(reloj, dt);
    animarGuia(reloj, dt);
    avanzarParticulas(dt);
    fiesta = Math.max(doradoFinal > 0 ? 0.6 : 0, fiesta - dt * 0.35);
    if (doradoFinal <= 0) ruedaVel += (0.12 - ruedaVel) * dt * 0.5;
    if (mixer) mixer.update(reducido ? dt * 0.7 : dt);
    renderer.render(scene, camera);
}

function bucle() {
    requestAnimationFrame(bucle);
    cuadro(performance.now());
}

// ------------------------------------------------------------------ montaje

function webgl() {
    try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch (e) {
        return false;
    }
}

async function montar(el, config) {
    if (renderer) return true;
    host = el;
    cfg = config || {};
    if (!host || !webgl()) return false;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 160);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "lanzador-canvas";
    host.appendChild(renderer.domElement);

    crearLuces();
    crearCielo();
    crearSuelo();
    // árboles, casas y animales: modelos del kit de las experiencias (se cargan sin frenar el juego)
    cargarCesped().catch(function (e) { console.warn("[EscenarioAnillos] césped de las experiencias", e); });
    cargarMundoExperiencias().catch(function (e) { console.warn("[EscenarioAnillos] modelos de las experiencias", e); });
    crearRueda();
    crearBanderines();
    crearLetrero();
    crearFlores();
    crearMotas();
    crearDiana();
    crearTarima();
    crearCono();
    (cfg.anillos || []).forEach(function (def, i) {
        const a = crearAnillo(def, i);
        anillos[def.id] = a;
        ordenIds.push(def.id);
    });
    crearGuia();
    enlazarEntrada();
    encuadrar();
    ultimoCuadro = performance.now();
    bucle();
    // respaldo: si el navegador no pinta (panel oculto), la escena igual avanza
    setInterval(function () {
        const ahora = performance.now();
        if (ahora - ultimoCuadro > 110) cuadro(ahora);
    }, 50);
    if (typeof ResizeObserver === "function") new ResizeObserver(encuadrar).observe(host);
    else window.addEventListener("resize", encuadrar);

    await cargarZeus();
    listoFlag = true;
    return true;
}

window.EscenarioAnillos = {
    montar: montar,
    listo: function () { return listoFlag; },
    reacomodar: encuadrar,
    on: function (c) { cb = c || {}; },
    bloquear: function (b) {
        bloqueado = !!b;
        if (bloqueado && drag) terminarArrastre(true);
    },
    disponibles: function (ids) { disponiblesIds = ids ? ids.slice() : null; },
    estado: function (id) { return anillos[id] ? anillos[id].estado : null; },
    ensartados: function () { return ensartados.slice(); },
    arrastrando: function () { return drag ? drag.id : null; },
    geometria: geometria,
    lanzar: lanzar,
    regresar: regresar,
    devolver: devolver,
    guia: function (id, op) {
        guiaId = id || null;
        guiaOpObjetivo = id ? (op != null ? op : 1) : 0;
    },
    resaltar: function (id) { resaltado = id || null; },
    destelloObjetivo: function (on) { destelloOn = !!on; },
    presentar: presentar,
    nivel: cambiarNivel,
    celebrar: celebrar,
    final: final,
    finalLluvia: finalLluvia,
    zeusGesto: zeusGesto,
    zeusHablar: zeusHablar,
    zeusListo: function () { return !!mixer; },
    puntoAnillo: puntoAnillo,
    puntoCono: function () { return aPantalla(new THREE.Vector3(CONO.x, PUNTA_Y, CONO.z)); },
    puntoZeus: function () {
        const n = nodos.cabeza;
        if (n) {
            n.updateWorldMatrix(true, false);
            return aPantalla(n.localToWorld(new THREE.Vector3(0, 0, 44)));
        }
        return aPantalla(new THREE.Vector3(ZEUS.x, 1.8, ZEUS.z));
    },
    puntoPantalla: function (x, y, z) { return aPantalla(new THREE.Vector3(x, y, z)); },
    // la demo mueve el anillo con la "mano" usando el mismo arrastre del juego
    demoTomar: function (id) {
        const a = anillos[id];
        if (!a || drag) return;
        const p = puntoAnillo(id);
        empezarArrastre(a, p.x, p.y, -1);
    },
    demoMover: function (p) { moverArrastre(p.x, p.y); },
    demoSoltar: function () {
        if (!drag) return null;
        const d = drag;
        drag = null;
        const a = anillos[d.id];
        if (a) a.objetivo = null;
        return gestoDe(d);
    },
    _depurar: function () { return { anillos: anillos, camera: camera, scene: scene, renderer: renderer }; }
};
