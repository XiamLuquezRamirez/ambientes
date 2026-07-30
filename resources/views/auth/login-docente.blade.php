<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso Docente — Aulas Reggio</title>
    <link rel="stylesheet" href="{{ asset('assets/css/fonts.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/fontawesome/css/all.min.css') }}">
    <style>
        :root {
            --ped-azul: #3B82F6;
            --ped-navy: #1E3A8A;
            --ped-morado: #8B5CF6;
            --ped-naranja: #F97316;
            --ped-amarillo: #FACC15;
            --ped-verde: #22C55E;
            --fondo: #EFF6FF;
            --tarjeta: #FFFFFF;
            --texto: #1E293B;
            --texto-suave: #64748B;
            --borde: #DBEAFE;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Nunito', sans-serif;
            color: var(--texto);
            background: var(--fondo);
            overflow: hidden;
            position: relative;
        }

        /* ── Patrones educativos de fondo ─────────────────────── */
        .patron-fondo {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
        }

        .circulo-patron {
            position: absolute;
            border-radius: 50%;
            opacity: .12;
            animation: flotar 5s ease-in-out infinite;
        }

        .circulo-patron.c1 {
            width: 320px;
            height: 320px;
            background: var(--ped-azul);
            top: -80px;
            left: -60px;
        }

        .circulo-patron.c2 {
            width: 200px;
            height: 200px;
            background: var(--ped-morado);
            top: 15%;
            right: 8%;
        }

        .circulo-patron.c3 {
            width: 140px;
            height: 140px;
            background: var(--ped-naranja);
            bottom: 20%;
            left: 10%;
        }

        .circulo-patron.c4 {
            width: 260px;
            height: 260px;
            background: var(--ped-verde);
            bottom: -70px;
            right: -40px;
        }

        .circulo-patron.c5 {
            width: 90px;
            height: 90px;
            background: var(--ped-amarillo);
            top: 40%;
            left: 22%;
        }

        .icono-flotante {
            position: absolute;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 1.2rem;
            box-shadow: 0 8px 24px rgba(30, 58, 138, .15);
            animation: flotar 5s ease-in-out infinite;
        }

        .icono-flotante.i1 {
            background: var(--ped-azul);
            top: 12%;
            left: 8%;
            animation-delay: 0s;
        }

        .icono-flotante.i2 {
            background: var(--ped-morado);
            top: 8%;
            right: 14%;
            animation-delay: .8s;
        }

        .icono-flotante.i3 {
            background: var(--ped-naranja);
            bottom: 28%;
            right: 10%;
            animation-delay: 1.6s;
        }

        .icono-flotante.i4 {
            background: var(--ped-amarillo);
            bottom: 18%;
            left: 6%;
            animation-delay: 2.4s;
            color: #713F12;
        }

        .icono-flotante.i5 {
            background: var(--ped-verde);
            top: 55%;
            right: 5%;
            animation-delay: 3.2s;
        }

        .puntos-educativos {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(circle, rgba(30, 58, 138, .08) 1.5px, transparent 1.5px);
            background-size: 28px 28px;
        }

        @keyframes flotar {

            0%,
            100% {
                transform: translateY(0) rotate(0deg);
            }

            50% {
                transform: translateY(-12px) rotate(4deg);
            }
        }

        /* ── Contenedor principal ─────────────────────────────── */
        .login-wrap {
            position: relative;
            z-index: 1;
            width: 100%;
            max-width: 500px;
            padding: 24px;
        }

        .login-card {
            background: var(--tarjeta);
            border-radius: 24px;
            padding: 40px 36px 32px;
            box-shadow:
                0 4px 6px rgba(37, 99, 235, .06),
                0 20px 48px rgba(30, 58, 138, .12);
            border: 1px solid var(--borde);
        }

        .login-logo {
            text-align: center;
            margin-bottom: 8px;
        }

        .login-logo img {
            max-width: 500px;
            width: 100%;
            height: auto;
        }

        .login-tagline {
            text-align: center;
            font-size: .82rem;
            font-style: italic;
            color: var(--ped-navy);
            margin-bottom: 28px;
            line-height: 1.4;
        }

        .franja-colores {
            display: flex;
            height: 5px;
            border-radius: 99px;
            overflow: hidden;
            margin-bottom: 28px;
        }

        .franja-colores span {
            flex: 1;
        }

        .franja-colores .fc-azul {
            background: var(--ped-azul);
        }

        .franja-colores .fc-morado {
            background: var(--ped-morado);
        }

        .franja-colores .fc-naranja {
            background: var(--ped-naranja);
        }

        .franja-colores .fc-amarillo {
            background: var(--ped-amarillo);
        }

        .franja-colores .fc-verde {
            background: var(--ped-verde);
        }

        .login-titulo {
            font-family: 'Fredoka One', cursive;
            font-size: 1.35rem;
            color: var(--ped-navy);
            text-align: center;
            margin-bottom: 7px;
        }

        .form-group {
            margin-bottom: 18px;
        }

        label {
            display: block;
            font-size: .85rem;
            font-weight: 600;
            color: var(--texto-suave);
            margin-bottom: 6px;
        }

        .input-wrap {
            position: relative;
        }

        .input-wrap i {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #94A3B8;
            font-size: .9rem;
        }

        input[type="email"],
        input[type="password"] {
            width: 100%;
            background: #F8FAFC;
            border: 1.5px solid var(--borde);
            border-radius: 12px;
            padding: 12px 14px 12px 42px;
            color: var(--texto);
            font-family: 'Nunito', sans-serif;
            font-size: .95rem;
            outline: none;
            transition: border-color .2s, box-shadow .2s;
        }

        input:focus {
            border-color: var(--ped-azul);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, .15);
            background: #fff;
        }

        .remember {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: .85rem;
            color: var(--texto-suave);
            margin: 4px 0 22px;
        }

        .remember input[type="checkbox"] {
            width: 16px;
            height: 16px;
            accent-color: var(--ped-navy);
        }

        .remember label {
            margin: 0;
            font-weight: 400;
            cursor: pointer;
        }

        .btn-submit {
            width: 100%;
            background: linear-gradient(135deg, var(--ped-navy) 0%, var(--ped-azul) 100%);
            color: #fff;
            border: none;
            border-radius: 12px;
            padding: 14px;
            font-family: 'Fredoka One', cursive;
            font-size: 1.05rem;
            letter-spacing: .3px;
            cursor: pointer;
            transition: transform .15s, box-shadow .2s;
            box-shadow: 0 4px 14px rgba(30, 58, 138, .3);
        }

        .btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(30, 58, 138, .35);
        }

        .btn-submit:active {
            transform: translateY(0);
        }

        .error-box {
            background: #FEF2F2;
            border: 1px solid #FECACA;
            border-radius: 12px;
            padding: 12px 16px;
            color: #991B1B;
            font-size: .85rem;
            margin-bottom: 18px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }

        .error-box i {
            margin-top: 2px;
            color: #DC2626;
        }

        .back-link {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-top: 22px;
            color: var(--texto-suave);
            font-size: .82rem;
            text-decoration: none;
            transition: color .15s;
        }

        .back-link:hover {
            color: var(--ped-navy);
        }

        @media (max-width: 480px) {
            .login-card {
                padding: 32px 24px 28px;
            }

            .icono-flotante {
                display: none;
            }
        }
    </style>
</head>

<body>

    <div class="patron-fondo" aria-hidden="true">
        <div class="puntos-educativos"></div>
        <div class="circulo-patron c1"></div>
        <div class="circulo-patron c2"></div>
        <div class="circulo-patron c3"></div>
        <div class="circulo-patron c4"></div>
        <div class="circulo-patron c5"></div>
        <div class="icono-flotante i1"><i class="fa-solid fa-hand"></i></div>
        <div class="icono-flotante i2"><i class="fa-solid fa-music"></i></div>
        <div class="icono-flotante i3"><i class="fa-solid fa-display"></i></div>
        <div class="icono-flotante i4"><i class="fa-solid fa-lightbulb"></i></div>
        <div class="icono-flotante i5"><i class="fa-solid fa-person-running"></i></div>
    </div>

    <div class="login-wrap">
        <div class="login-card">
            <div class="login-logo">
                <img src="{{ asset('assets/images/login-logo.png') }}" alt="PedNia — Aulas Reggio">
            </div>
            <h1 class="login-titulo">Iniciar sesión</h1>
           

            @if(session('error'))
            <div class="error-box">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span>{{ session('error') }}</span>
            </div>
            @endif

            @if($errors->any())
            <div class="error-box">
                <i class="fa-solid fa-circle-exclamation"></i>
                <div>
                    @foreach($errors->all() as $error)
                    <div>{{ $error }}</div>
                    @endforeach
                </div>
            </div>
            @endif

            <form method="POST" action="{{ route('docente.login.post') }}">
                @csrf

                <div class="form-group">
                    <label for="email">Correo electrónico</label>
                    <div class="input-wrap">
                        <i class="fa-solid fa-envelope"></i>
                        <input type="email" id="email" name="email" value="{{ old('email') }}" required autofocus
                            placeholder="tu@correo.com">
                    </div>
                </div>

                <div class="form-group">
                    <label for="password">Contraseña</label>
                    <div class="input-wrap">
                        <i class="fa-solid fa-lock"></i>
                        <input type="password" id="password" name="password" required
                            placeholder="••••••••">
                    </div>
                </div>

                <div class="remember">
                    <input type="checkbox" id="recordar" name="recordar" value="1">
                    <label for="recordar">Recordarme</label>
                </div>

                <button type="submit" class="btn-submit">Ingresar</button>
            </form>

            <a href="{{ route('auth.bienvenida') }}" class="back-link">
                <i class="fa-solid fa-arrow-left"></i> Volver al inicio
            </a>
        </div>
    </div>
</body>

</html>