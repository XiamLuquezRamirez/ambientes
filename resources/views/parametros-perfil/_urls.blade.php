@php
    $rutasPorPrefijo = [
        'admin' => [
            'catalogo' => route('admin.configuracion.parametros-perfil.catalogo'),
            'perfilesFormales' => route('admin.configuracion.parametros-perfil.perfiles-formales'),
            'perfilesPersonalizados' => route('admin.configuracion.parametros-perfil.perfiles-personalizados'),
            'inclusionShow' => route('admin.configuracion.parametros-perfil.inclusion.show', ['perfilAprendizajeInclusion' => '__ID__']),
            'inclusionSave' => route('admin.configuracion.parametros-perfil.inclusion.guardar', ['perfilAprendizajeInclusion' => '__ID__']),
            'inclusionReset' => route('admin.configuracion.parametros-perfil.inclusion.restablecer', ['perfilAprendizajeInclusion' => '__ID__']),
            'personalizadoShow' => route('admin.configuracion.parametros-perfil.personalizado.show', ['perfilAprendizajePersonalizado' => '__ID__']),
            'personalizadoSave' => route('admin.configuracion.parametros-perfil.personalizado.guardar', ['perfilAprendizajePersonalizado' => '__ID__']),
            'personalizadoReset' => route('admin.configuracion.parametros-perfil.personalizado.restablecer', ['perfilAprendizajePersonalizado' => '__ID__']),
            'personalizadoDestroy' => route('admin.configuracion.perfil-aprendizaje-personalizado.eliminar', ['perfilAprendizajePersonalizado' => '__ID__']),
            'personalizadoCrear' => route('admin.configuracion.perfil-aprendizaje-personalizado.guardar'),
        ],
        'panel' => [
            'catalogo' => route('panel.inclusion.parametros-perfil.catalogo'),
            'perfilesFormales' => route('panel.inclusion.parametros-perfil.perfiles-formales'),
            'perfilesPersonalizados' => route('panel.inclusion.parametros-perfil.perfiles-personalizados'),
            'inclusionShow' => route('panel.inclusion.parametros-perfil.inclusion.show', ['perfilAprendizajeInclusion' => '__ID__']),
            'inclusionSave' => route('panel.inclusion.parametros-perfil.inclusion.guardar', ['perfilAprendizajeInclusion' => '__ID__']),
            'inclusionReset' => route('panel.inclusion.parametros-perfil.inclusion.restablecer', ['perfilAprendizajeInclusion' => '__ID__']),
            'personalizadoShow' => route('panel.inclusion.parametros-perfil.personalizado.show', ['perfilAprendizajePersonalizado' => '__ID__']),
            'personalizadoSave' => route('panel.inclusion.parametros-perfil.personalizado.guardar', ['perfilAprendizajePersonalizado' => '__ID__']),
            'personalizadoReset' => route('panel.inclusion.parametros-perfil.personalizado.restablecer', ['perfilAprendizajePersonalizado' => '__ID__']),
            'personalizadoDestroy' => route('panel.inclusion.perfil-aprendizaje-personalizado.eliminar', ['perfilAprendizajePersonalizado' => '__ID__']),
            'personalizadoCrear' => route('panel.inclusion.perfil-aprendizaje-personalizado.guardar'),
        ],
        'superadmin' => [
            'catalogo' => route('superadmin.parametros-perfil.catalogo'),
            'perfilesFormales' => route('superadmin.parametros-perfil.perfiles-formales'),
            'perfilesPersonalizados' => route('superadmin.parametros-perfil.perfiles-personalizados'),
            'inclusionShow' => route('superadmin.parametros-perfil.inclusion.show', ['perfilAprendizajeInclusion' => '__ID__']),
            'inclusionSave' => route('superadmin.parametros-perfil.inclusion.guardar', ['perfilAprendizajeInclusion' => '__ID__']),
            'inclusionReset' => route('superadmin.parametros-perfil.inclusion.restablecer', ['perfilAprendizajeInclusion' => '__ID__']),
            'personalizadoShow' => route('superadmin.parametros-perfil.personalizado.show', ['perfilAprendizajePersonalizado' => '__ID__']),
            'personalizadoSave' => route('superadmin.parametros-perfil.personalizado.guardar', ['perfilAprendizajePersonalizado' => '__ID__']),
            'personalizadoReset' => route('superadmin.parametros-perfil.personalizado.restablecer', ['perfilAprendizajePersonalizado' => '__ID__']),
        ],
    ];

    $urls = $rutasPorPrefijo[$prefijo] ?? $rutasPorPrefijo['admin'];
@endphp

@push('scripts')
<script>
window.PARAMETROS_PERFIL = {
    urls: @json($urls),
    csrf: @json(csrf_token()),
    modo: @json($modo ?? 'institucion'),
};
</script>
@endpush
