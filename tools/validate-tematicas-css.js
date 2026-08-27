const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cssPath = path.join(root, 'public/assets/css/tematicas.css');
const jsPath = path.join(root, 'public/assets/js/tematicas-form.js');
const bladePaths = [
    'resources/views/partials/tematicas/modales.blade.php',
    'resources/views/partials/tematicas/_filtros.blade.php',
    'resources/views/partials/tematicas/_tabla.blade.php',
    'resources/views/panel/catalogo/tematicas/index.blade.php',
    'resources/views/admin/catalogo/tematicas/index.blade.php',
    'resources/views/superAdmin/catalogo/tematicas/index.blade.php',
];

const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const blades = bladePaths.map((p) => fs.readFileSync(path.join(root, p), 'utf8')).join('\n');

const errors = [];
const warnings = [];

// 1. Brace balance
let depth = 0;
for (const ch of css) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth < 0) errors.push('CSS: llave de cierre sin apertura');
}
if (depth !== 0) errors.push(`CSS: desbalance de llaves (depth=${depth})`);

// 2. Defined classes from CSS (only .class selectors, skip pseudo)
const defined = new Set();
for (const block of css.match(/[^{]+{[^}]*}/g) || []) {
    const selector = block.split('{')[0];
    if (selector.includes('@')) continue;
    for (const part of selector.split(',')) {
        for (const m of part.matchAll(/\.([a-zA-Z_][\w-]*)/g)) {
            defined.add(m[1]);
        }
    }
}

// 3. Used classes from blades + js
const used = new Set();
const classAttrRe = /class=(?:"([^"]*)"|'([^']*)')/g;
for (const src of [blades, js]) {
    let m;
    while ((m = classAttrRe.exec(src))) {
        const raw = m[1] ?? m[2] ?? '';
        raw.split(/\s+/).filter(Boolean).forEach((c) => {
            if (!c.includes('${')) used.add(c);
        });
    }
}

// JS template literals with known prefixes
for (const m of js.matchAll(/\b(tematicas?[-\w]*|exp[-\w]*|material[-\w]*|indicador[-\w]*|dba[-\w]*|selector-dba[-\w]*|cfg[-\w]*|badge[-\w]*|btn-(?:material|publicar|despublicar|toggle|limpiar)[-\w]*)\b/g)) {
    used.add(m[1]);
}
used.add('star');
used.add('badge-colegio');
used.add('es-activa');
used.add('es-archivada');
used.add('es-borrador');

const featureUsed = [...used].filter((c) =>
    /^(tematica|tematicas|exp-|material-|indicador|dba-|selector-dba|cfg-|badge-estado|badge-colegio|btn-material|btn-publicar|btn-despublicar|btn-toggle|btn-limpiar|star$)/.test(c)
    || c.startsWith('tematica-card')
    || c.startsWith('tematica-meta')
);

const missingInCss = featureUsed.filter((c) => !defined.has(c) && !['es-activa', 'es-archivada', 'es-borrador'].includes(c));
if (missingInCss.length) {
    warnings.push('Clases usadas sin regla CSS propia: ' + [...new Set(missingInCss)].sort().join(', '));
}

// 4. CSS feature classes possibly unused
const featureDefined = [...defined].filter((c) =>
    c.startsWith('tematic') || c.startsWith('exp-') || c.startsWith('material-') || c.startsWith('cfg-') || c.startsWith('badge-estado') || c.startsWith('btn-') || c === 'star' || c === 'badge-colegio'
);
const unusedCss = featureDefined.filter((c) => !used.has(c));
if (unusedCss.length) {
    warnings.push('Reglas CSS posiblemente sin uso: ' + unusedCss.sort().join(', '));
}

// 5. Custom properties
const varDefs = new Set([...css.matchAll(/(--tm-[\w-]+)\s*:/g)].map((m) => m[1]));
const varUses = [...css.matchAll(/var\((--tm-[\w-]+)/g)].map((m) => m[1]);
const undefinedVars = [...new Set(varUses.filter((v) => !varDefs.has(v)))];
if (undefinedVars.length) {
    errors.push('Variables --tm-* usadas pero no definidas: ' + undefinedVars.join(', '));
}

// 6. Inline styles in blades
const inline = blades.match(/style="[^"]+"/g) || [];
if (inline.length) {
    warnings.push(`Estilos inline en vistas (${inline.length}): ${inline.join('; ')}`);
}

// 7. Badge class conflict check
if (js.includes('badge-estado-exp badge-estado-activo')) {
    warnings.push('JS mezcla badge-estado-exp + badge-estado-activo: el verde de .es-activa puede no aplicarse (esperado verde activo/inactivo distinto)');
}

// 8. Readonly modal buttons - check ids exist in blade
const readonlyIds = ['btnGuardarTematica', 'btnAgregarIndicador', 'btnAgregarDba', 'btnCrearExperienciaDesdeTematica'];
for (const id of readonlyIds) {
    if (!blades.includes(`id="${id}"`)) {
        warnings.push(`CSS is-readonly referencia #${id} que no está en modales.blade.php`);
    }
}
if (blades.includes('id="btnAgregarExperiencia"') && !css.includes('#btnAgregarExperiencia')) {
    warnings.push('btnAgregarExperiencia no se oculta en is-readonly (puede ser intencional)');
}

// 9. Token scope: classes using var(--tm-*) outside scope roots
const scopeRoots = ['.tematicas-page-header', '.tematicas-app', '#modalTematica', '#modalSelectorDba', '#modalExperienciaRapida'];
const usesTmVar = css.includes('var(--tm-');
if (!usesTmVar) warnings.push('No se usan variables --tm-*');

console.log('=== Validación tematicas.css ===\n');
console.log('Archivo CSS:', cssPath);
console.log('Líneas:', css.split('\n').length);
console.log('Selectores de clase definidos:', defined.size);
console.log('Clases feature usadas:', featureUsed.length);
console.log('');

if (errors.length) {
    console.log('ERRORES (' + errors.length + '):');
    errors.forEach((e) => console.log('  ✗', e));
} else {
    console.log('ERRORES: ninguno');
}

console.log('');
if (warnings.length) {
    console.log('ADVERTENCIAS (' + warnings.length + '):');
    warnings.forEach((w) => console.log('  ⚠', w));
} else {
    console.log('ADVERTENCIAS: ninguna');
}

console.log('');
console.log(errors.length === 0 ? 'RESULTADO: OK (sin errores de sintaxis/variables)' : 'RESULTADO: FALLÓ');
process.exit(errors.length ? 1 : 0);
