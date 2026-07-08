<?php

namespace App\Services;

use App\Models\User;
use App\Services\Perfil\PerfilAdminService;
use App\Services\Perfil\PerfilDocenteService;

class PerfilService
{
    public function __construct(
        protected PerfilAdminService $admin,
        protected PerfilDocenteService $docente,
    ) {}

    /**
     * Construye el array de datos que recibe la vista perfil.index.
     *
     * Combina datos específicos del rol (admin/docente) con metadatos de layout y rutas AJAX.
     */
    public function construir(User $usuario): array
    {
        $datos = $usuario->esAdmin()
            ? $this->admin->construir($usuario)
            : $this->docente->construir($usuario);

        return array_merge($datos, $this->metadatosVista($usuario));
    }

    /**
     * Rutas y layout compartidos por las vistas de perfil.
     *
     * - layout: admin usa layouts.admin, docente usa layouts.panel
     * - rutas.actualizar: endpoint de cuenta (nombre, email)
     * - rutas.informacion_personal: solo docente (teléfono, dirección, etc.)
     * - rutas.validar_datos: unicidad de email al editar perfil (AJAX)
     * - rutas.contrasena: cambio de contraseña propio (sin cerrar sesión)
     */
    private function metadatosVista(User $usuario): array
    {
        $esAdmin = $usuario->esAdmin();

        return [
            'layout' => $esAdmin ? 'layouts.admin' : 'layouts.panel',
            'rutas' => [
                'accesos' => $esAdmin
                    ? route('admin.perfil.accesos')
                    : route('panel.perfil.accesos'),
                'actualizar' => $esAdmin
                    ? route('admin.usuarios.perfil.update', $usuario->id)
                    : route('panel.perfil.update'),
                'validar_datos' => $esAdmin
                    ? route('admin.perfil.validarDatos')
                    : route('panel.perfil.validarDatos'),
                'contrasena' => $esAdmin
                    ? route('admin.perfil.contrasena')
                    : route('panel.perfil.contrasena'),
                'informacion_personal' => $esAdmin
                    ? null
                    : route('panel.perfil.informacion-personal'),
            ],
        ];
    }
}
