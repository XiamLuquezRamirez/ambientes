<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso Docente — Aulas Reggio</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background: #060C0A;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Nunito', sans-serif;
            color: #F0FAF4;
        }
        .card {
            background: #0F172A;
            border: 1px solid #0F6E56;
            border-radius: 16px;
            padding: 48px 40px;
            width: 100%;
            max-width: 420px;
        }
        .logo { font-family: 'Fredoka One', cursive; font-size: 2rem; color: #0F6E56; text-align: center; }
        .subtitle { text-align: center; color: #94A3B8; margin-bottom: 32px; font-size: 0.9rem; }
        label { display: block; font-size: 0.85rem; color: #94A3B8; margin-bottom: 6px; }
        input[type="email"], input[type="password"] {
            width: 100%;
            background: #1E293B;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 12px 14px;
            color: #F0FAF4;
            font-family: 'Nunito', sans-serif;
            font-size: 1rem;
            margin-bottom: 20px;
            outline: none;
            transition: border-color 0.2s;
        }
        input:focus { border-color: #0F6E56; }
        .remember { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #94A3B8; margin-bottom: 24px; }
        .btn-submit {
            width: 100%;
            background: #0F6E56;
            color: #F0FAF4;
            border: none;
            border-radius: 8px;
            padding: 14px;
            font-family: 'Fredoka One', cursive;
            font-size: 1.1rem;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn-submit:hover { background: #0a5441; }
        .error-box {
            background: #3B0F0F;
            border: 1px solid #DC2626;
            border-radius: 8px;
            padding: 12px 16px;
            color: #FCA5A5;
            font-size: 0.85rem;
            margin-bottom: 20px;
        }
        .back-link { display: block; text-align: center; margin-top: 20px; color: #475569; font-size: 0.8rem; text-decoration: none; }
        .back-link:hover { color: #94A3B8; }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">Aulas Reggio</div>
        <div class="subtitle">Acceso Docente</div>

        @if(session('error'))
            <div class="error-box">{{ session('error') }}</div>
        @endif

        @if($errors->any())
            <div class="error-box">
                @foreach($errors->all() as $error)
                    <div>{{ $error }}</div>
                @endforeach
            </div>
        @endif

        <form method="POST" action="{{ route('docente.login.post') }}">
            @csrf
            <label for="email">Correo electrónico</label>
            <input type="email" id="email" name="email" value="{{ old('email') }}" required autofocus>

            <label for="password">Contraseña</label>
            <input type="password" id="password" name="password" required>

            <div class="remember">
                <input type="checkbox" id="recordar" name="recordar" value="1">
                <label for="recordar" style="margin:0">Recordarme</label>
            </div>

            <button type="submit" class="btn-submit">Ingresar</button>
        </form>

        <a href="/" class="back-link">← Volver al inicio</a>
    </div>
</body>
</html>
