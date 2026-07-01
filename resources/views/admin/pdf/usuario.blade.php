<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cuenta en la plataforma</title>
    <style>
        .email-header {
            padding: 24px 32px 0 32px;
        }

        .email-header img {
            height: 28px;
        }

        .email-body {
            padding: 16px 32px 32px 32px;
            font-size: 14px;
            line-height: 22px;
        }

        .greeting {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 16px;
        }

        .intro-text {
            margin-bottom: 16px;
        }

        .credentials-box {
            background-color: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 16px 20px;
            margin: 20px 0;
        }

        .credentials-box .label {
            font-size: 12px;
            color: #5f6368;
            margin-bottom: 2px;
        }

        .credentials-box .value {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 14px;
            word-break: break-all;
        }

        .credentials-box .value:last-child {
            margin-bottom: 0;
        }

        .access-link-label {
            margin-top: 20px;
            margin-bottom: 8px;
        }

        .access-button {
            display: inline-block;
            background-color: #1a73e8;
            color: #ffffff !important;
            text-decoration: none;
            font-size: 14px;
            font-weight: bold;
            padding: 10px 24px;
            border-radius: 4px;
            margin-top: 4px;
            margin-bottom: 20px;
        }

        .signature {
            margin-top: 24px;
        }

        .email-footer {
            font-size: 12px;
            color: #5f6368;
            border-top: 1px solid #e0e0e0;
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
        }

        .email-footer p {
            margin: 4px 0;
        }
    </style>
</head>

<body>

    <div class="email-header">
        {{-- Imagen de la organización
                <img src="{{ asset('images/logo.png') }}" alt="{{ config('app.name') }}"> --}}
    </div>

    <div class="email-body">
        <p class="greeting">Hola, {{ $usuario->nombre }}!</p>

        <p class="intro-text">
            Tiene una cuenta en la plataforma PedNia
        </p>

        <p class="intro-text">
            Ingresa a tu Cuenta para acceder a los servicios que brinda la plataforma.
            La plataforma de gestión de estudiantes es una herramienta digital que te permite gestionar
            los estudiantes de tu institución de manera eficiente y segura.
        </p>

        <div class="credentials-box">
            <div class="label">Su nombre de usuario</div>
            <div class="value">{{ $usuario->email }}</div>

            <div class="label">Contraseña</div>
            <div class="value">{{ $password }}</div>
        </div>

        <p class="access-link-label">Vínculo de acceso</p>
        <p>Acceda con el vínculo que aparece debajo:</p>

        <a href="{{ route('docente.login') }}" class="access-button">
            Ingresar a la plataforma
        </a>

        <p class="signature">
            Atentamente,<br>
            El equipo de PedNia
        </p>
    </div>

    <div class="email-footer">
        <p> {{ date('Y') }} - Lista de usuarios - Consola del administrador
        </p>
    </div>

</body>

</html>
