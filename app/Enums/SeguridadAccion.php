<?php

namespace App\Enums;

enum SeguridadAccion: string
{
    case LOGIN = 'login';

    case LOGOUT = 'logout';

    case USER_CREATED = 'user_created';

    case PASSWORD_CHANGED = 'password_changed';

    case PASSWORD_RESET = 'password_reset';

    case ACCOUNT_ACTIVATED = 'account_activated';

    case ACCOUNT_DEACTIVATED = 'account_deactivated';

    case ACCOUNT_DELETED = 'account_deleted';

    case EMAIL_CHANGED = 'email_changed';

    case PROFILE_UPDATED = 'profile_updated';

    case AMBIENTE_EDITED = 'ambiente_edited';

    case SOLICITUD_APPROVED = 'solicitud_approved';

    public function etiqueta(): string
    {
        return match ($this) {
            self::LOGIN => 'Inicio de sesión',
            self::LOGOUT => 'Cierre de sesión',
            self::USER_CREATED => 'Usuario creado',
            self::PASSWORD_CHANGED => 'Contraseña actualizada',
            self::PASSWORD_RESET => 'Contraseña restablecida',
            self::ACCOUNT_ACTIVATED => 'Cuenta activada',
            self::ACCOUNT_DEACTIVATED => 'Cuenta desactivada',
            self::ACCOUNT_DELETED => 'Cuenta eliminada',
            self::EMAIL_CHANGED => 'Correo actualizado',
            self::PROFILE_UPDATED => 'Perfil actualizado',
            self::AMBIENTE_EDITED => 'Ambiente editado',
            self::SOLICITUD_APPROVED => 'Solicitud aprobada',
        };
    }

    public function icono(): string
    {
        return match ($this) {
            self::USER_CREATED => 'fa-user-plus',
            self::AMBIENTE_EDITED => 'fa-building',
            self::SOLICITUD_APPROVED => 'fa-circle-check',
            self::PASSWORD_CHANGED, self::PASSWORD_RESET => 'fa-key',
            self::LOGIN => 'fa-right-to-bracket',
            self::LOGOUT => 'fa-right-from-bracket',
            default => 'fa-pen',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::USER_CREATED => 'success',
            self::AMBIENTE_EDITED => 'primary',
            self::SOLICITUD_APPROVED => 'info',
            self::PASSWORD_CHANGED, self::PASSWORD_RESET => 'warning',
            self::LOGIN => 'success',
            self::ACCOUNT_DEACTIVATED, self::ACCOUNT_DELETED => 'danger',
            default => 'secondary',
        };
    }
}
