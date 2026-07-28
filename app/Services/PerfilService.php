<?php

namespace App\Services;

use App\Models\User;
use App\Services\Perfil\PerfilAdminService;
use App\Services\Perfil\PerfilDocenteService;

class PerfilService
{
    private const AVATAR_COLOR = '#3155C6';

    public function __construct(
        protected PerfilAdminService $admin,
        protected PerfilDocenteService $docente,
        protected PerfilFotoService $perfilFoto,
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
     * - rutas.foto / foto_eliminar: solo docente (foto en tabla docentes)
     */
    private function metadatosVista(User $usuario): array
    {
        $esAdmin = $usuario->esAdmin();
        $puedeCambiarFoto = ! $esAdmin && $usuario->docente !== null;
        $fotoRelativa = $usuario->docente?->foto_url;

        return [
            'layout' => $esAdmin ? 'layouts.admin' : 'layouts.panel',
            'puedeCambiarFoto' => $puedeCambiarFoto,
            'foto' => $fotoRelativa,
            'fotoUrlPublica' => $this->perfilFoto->urlPublica($fotoRelativa),
            'iniciales' => $this->perfilFoto->iniciales($usuario),
            'avatarColor' => self::AVATAR_COLOR,
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
                'foto' => $puedeCambiarFoto ? route('panel.perfil.foto') : null,
                'foto_eliminar' => $puedeCambiarFoto ? route('panel.perfil.foto.eliminar') : null,
            ],
        ];
    }
}
