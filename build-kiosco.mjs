/**
 * build-kiosco.mjs — Bundle de los assets 3D del kiosco con esbuild.
 *
 * Toma el entrypoint modular `recorrido-camino-3d.js` (que importa Three.js y
 * los módulos de recorrido3d/) y produce UN archivo minificado que incluye todo,
 * servido con <script type="module">. No toca el pipeline de Vite del proyecto.
 *
 * Uso:  npm run build:kiosco        (una vez)
 *       npm run watch:kiosco        (re-bundlea al guardar)
 */
import * as esbuild from 'esbuild';

const config = {
    entryPoints: ['public/assets/js/recorrido-camino-3d.js'],
    bundle: true,
    format: 'esm',
    minify: true,
    sourcemap: true,
    // Three.js se importa como 'three'; lo resolvemos a la copia local del repo.
    alias: { three: './public/assets/vendor/three/three.module.js' },
    outfile: 'public/assets/dist/recorrido-camino-3d.bundle.js',
    logLevel: 'info',
    target: ['es2020'], // WebView Chromium moderno de la tablet
};

const watch = process.argv.includes('--watch');

if (watch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log('👀 build:kiosco en modo watch — Ctrl+C para salir');
} else {
    await esbuild.build(config);
    console.log('✅ bundle generado: public/assets/dist/recorrido-camino-3d.bundle.js');
}
