<?php

namespace App\Services;

use App\Enums\SeguridadAccion;
use App\Models\SeguridadLog;
use App\Models\User;

class ActividadAdminService
{
  private const ACCIONES_RECIENTES = [
    SeguridadAccion::USER_CREATED,
    SeguridadAccion::AMBIENTE_EDITED,
    SeguridadAccion::SOLICITUD_APPROVED,
  ];

  public function actividadReciente(User $admin, int $limite = 5): array
  {
    return SeguridadLog::query()
      ->where('actor_user_id', $admin->id)
      ->whereIn('accion', array_map(fn (SeguridadAccion $a) => $a->value, self::ACCIONES_RECIENTES))
      ->latest()
      ->limit($limite)
      ->get()
      ->map(function (SeguridadLog $log) {
        $accion = $log->accion instanceof SeguridadAccion
          ? $log->accion
          : SeguridadAccion::tryFrom((string) $log->accion);

        return [
          'fecha' => $log->created_at->format('d/m/Y H:i'),
          'fecha_relativa' => $log->created_at->diffForHumans(),
          'accion' => $accion?->etiqueta() ?? (string) $log->accion,
          'registro' => $log->registro_afectado ?? '—',
          'icono' => $accion?->icono() ?? 'fa-pen',
          'color' => $accion?->color() ?? 'secondary',
        ];
      })
      ->all();
  }

  public function ultimoAcceso(User $admin): ?array
  {
    $acceso = $admin->relationLoaded('ultimoLogin')
      ? $admin->ultimoLogin
      : $admin->accesos()->orderByDesc('fecha')->first();

    if (! $acceso) {
      return null;
    }

    return [
      'fecha' => $acceso->fecha->format('d/m/Y H:i'),
      'fecha_relativa' => $acceso->fecha->diffForHumans(),
      'ip' => $acceso->ip ?: 'Sin registrar',
      'ambiente' => $acceso->ambiente,
    ];
  }
}
