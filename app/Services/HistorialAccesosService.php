<?php

namespace App\Services;

use App\Models\User;

class HistorialAccesosService
{
  public function paraUsuario(User $usuario, int $limite = 30): array
  {
    $accesos = $usuario->accesos()
      ->where('tipo', \App\Models\LoginLog::TIPO_INICIO_SESION)
      ->orderByDesc('fecha')
      ->limit($limite)
      ->get()
      ->map(function ($acceso) {
        $ipFueraRango = ! $this->ipPermitida($acceso->ip);

        return [
          'fecha' => optional($acceso->fecha)->format('d/m/Y'),
          'hora' => optional($acceso->fecha)->format('H:i:s'),
          'ip' => $acceso->ip ?: 'Sin registrar',
          'ip_fuera_rango' => $ipFueraRango,
        ];
      });

    return [
      'usuario' => [
        'id' => $usuario->id,
        'nombre' => trim($usuario->nombre.' '.$usuario->apellido),
        'email' => $usuario->email,
      ],
      'accesos' => $accesos,
      'tiene_accesos_fuera_rango' => $accesos->contains('ip_fuera_rango', true),
      'rango_permitido' => '192.168.1.0/24',
    ];
  }

  private function ipPermitida(?string $ip): bool
  {
    if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
      return false;
    }

    $ipLong = ip2long($ip);

    return $ipLong >= ip2long('192.168.1.0')
      && $ipLong <= ip2long('192.168.1.255');
  }
}
