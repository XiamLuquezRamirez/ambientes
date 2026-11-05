{{-- Base de la app ('' en la raíz; '/ambientes' si se sirve en ingeer.co/ambientes/). Ver App\Support\SubcarpetaPublica. --}}
<script>
    window.PEDNIA_BASE = @json(rtrim(request()->getBaseUrl(), '/'));
    window.pedniaUrl = function (ruta) {
        ruta = ruta == null ? '' : String(ruta);
        if (ruta.charAt(0) !== '/' || ruta.charAt(1) === '/') return ruta;
        var base = window.PEDNIA_BASE || '';
        if (!base || ruta === base || ruta.indexOf(base + '/') === 0) return ruta;
        return base + ruta;
    };
    window.pedniaRuta = function (path) {
        path = path == null ? '' : String(path);
        var base = window.PEDNIA_BASE || '';
        if (base && (path === base || path.indexOf(base + '/') === 0)) return path.slice(base.length) || '/';
        return path;
    };
    // fetch('/panel/...') y $.ajax({ url: '/admin/...' }) toman la base sin tocar cada llamada.
    if (window.PEDNIA_BASE && window.fetch && !window.fetch.__pednia) {
        var fetchOriginal = window.fetch;
        window.fetch = function (recurso, opciones) {
            return fetchOriginal.call(this, typeof recurso === 'string' ? window.pedniaUrl(recurso) : recurso, opciones);
        };
        window.fetch.__pednia = true;
    }
    window.pedniaEngancharJquery = function () {
        if (!window.PEDNIA_BASE || !window.jQuery || window.jQuery.__pednia) return;
        window.jQuery.__pednia = true;
        window.jQuery.ajaxPrefilter(function (opciones) {
            if (typeof opciones.url === 'string') opciones.url = window.pedniaUrl(opciones.url);
        });
    };
    window.pedniaEngancharJquery();
    document.addEventListener('DOMContentLoaded', window.pedniaEngancharJquery);
</script>
