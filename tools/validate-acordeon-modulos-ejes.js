/**
 * Prueba estática del acordeón módulos/ejes (sin duplicar listeners por contenedor).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const uiPath = path.join(root, 'public/assets/js/configuracion-ejes-ui.js');
const adminPath = path.join(root, 'public/assets/js/admin/catalogo-modulos-ejes.js');
const saPath = path.join(root, 'public/assets/js/superAdmin/catalogo-modulos-ejes.js');

const ui = fs.readFileSync(uiPath, 'utf8');
const admin = fs.readFileSync(adminPath, 'utf8');
const sa = fs.readFileSync(saPath, 'utf8');

const errors = [];
const warnings = [];

if (!ui.includes('dataset.ambAcordeonBound')) {
    errors.push('configuracion-ejes-ui.js: falta guard por contenedor (ambAcordeonBound)');
}
if (!ui.includes('dataset.modAcordeonBound')) {
    errors.push('configuracion-ejes-ui.js: falta guard por contenedor (modAcordeonBound)');
}
if (!ui.includes("container.addEventListener('click'")) {
    errors.push('configuracion-ejes-ui.js: no usa delegación de eventos');
}

const duplicateAmbBind =
    /querySelectorAll\('\[data-amb-toggle\]'\)\.forEach\(\(head\)\s*=>\s*\{\s*head\.addEventListener\('click'/;
if (duplicateAmbBind.test(admin)) {
    errors.push('admin/catalogo-modulos-ejes.js: aún registra listeners directos en [data-amb-toggle]');
}
if (duplicateAmbBind.test(sa)) {
    errors.push('superAdmin/catalogo-modulos-ejes.js: aún registra listeners directos en [data-amb-toggle]');
}

const bladePaths = [
    'resources/views/panel/catalogo/modulos/_modulos.blade.php',
    'resources/views/panel/catalogo/ejes/_ejes.blade.php',
    'resources/views/admin/catalogo/modulos/_modulos.blade.php',
    'resources/views/admin/catalogo/ejes/_ejes.blade.php',
    'resources/views/superAdmin/catalogo/modulos/index.blade.php',
    'resources/views/superAdmin/catalogo/ejes/index.blade.php',
];

bladePaths.forEach((rel) => {
    const html = fs.readFileSync(path.join(root, rel), 'utf8');
    if (!html.includes('data-amb-toggle')) {
        warnings.push(`${rel}: sin data-amb-toggle`);
    }
    if (!html.includes('amb-body-inner')) {
        errors.push(`${rel}: falta .amb-body-inner (grid collapse no anima)`);
    }
    if (rel.includes('ejes') && !html.includes('mod-ejes-body-inner')) {
        errors.push(`${rel}: falta .mod-ejes-body-inner`);
    }
});

const uiAutoBind = fs.readFileSync(uiPath, 'utf8');
if (!uiAutoBind.includes('other.contains(el)')) {
    errors.push('configuracion-ejes-ui.js: autoBind no filtra contenedores anidados');
}

const catalogoEjes = fs.readFileSync(path.join(root, 'public/assets/js/panel/catalogo-ejes.js'), 'utf8');
if (/bindAmbienteToggles\(rootEjes\)/.test(catalogoEjes)) {
    warnings.push('catalogo-ejes.js: re-bind anidado en rootEjes puede anular el acordeón');
}

const css = fs.readFileSync(path.join(root, 'public/assets/css/superAdmin/configuracion.css'), 'utf8');
if (!css.includes('.amb-group.is-collapsed .amb-body')) {
    errors.push('configuracion.css: falta regla collapsed para .amb-body');
}
if (!css.includes('.mod-ejes-group.is-collapsed .mod-ejes-body')) {
    errors.push('configuracion.css: falta regla collapsed para .mod-ejes-body');
}

console.log('=== Validación acordeón módulos/ejes ===\n');
if (errors.length) {
    console.log('ERRORES:');
    errors.forEach((e) => console.log('  ✗', e));
} else {
    console.log('ERRORES: ninguno');
}
console.log('');
if (warnings.length) {
    console.log('ADVERTENCIAS:');
    warnings.forEach((w) => console.log('  ⚠', w));
} else {
    console.log('ADVERTENCIAS: ninguna');
}
console.log('');
console.log(errors.length === 0 ? 'RESULTADO: OK' : 'RESULTADO: FALLÓ');
process.exit(errors.length ? 1 : 0);
