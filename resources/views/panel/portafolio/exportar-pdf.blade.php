<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portafolio de {{ $estudiante->nombre }}</title>
    <style>
        body { font-family: sans-serif; margin: 40px; color: #333; }
        h1 { font-size: 1.5rem; border-bottom: 2px solid #333; padding-bottom: 8px; }
        h2 { font-size: 1.1rem; margin-top: 24px; }
        p  { margin: 4px 0; }
        .obs-tipo { font-weight: bold; text-transform: uppercase; font-size: 0.75rem; color: #666; }
        @media print { .no-print { display: none; } }
    </style>
</head>
<body>
    <h1>Avance de {{ $estudiante->nombre }}</h1>
    <p><em>Iniciales: {{ $estudiante->iniciales }} &mdash; Condición: {{ $estudiante->condicion }}</em></p>

    <h2>Observaciones</h2>
    @forelse($observaciones as $obs)
        <p>
            <span class="obs-tipo">{{ $obs->tipo }}</span>
            @if($obs->docente) <em>({{ $obs->docente->nombre }})</em> @endif
            &mdash; {{ $obs->contenido }}
        </p>
    @empty
        <p>Sin observaciones registradas.</p>
    @endforelse

    <h2>Portafolio</h2>
    @forelse($portafolios as $p)
        <p>
            <strong>{{ $p->creado_en ?? '' }}</strong>
            {{ $p->tipo_registro ?? '' }}
        </p>
    @empty
        <p>Sin entradas de portafolio.</p>
    @endforelse
</body>
</html>
