@extends('layouts.panel')

@section('title', 'Monitor de Sesión')

@section('content')

    <div class="page-header">
        <div>
            <h1>Monitor de Sesión</h1>
            <p id="ultimaActualizacion">
                Actualizado hace unos segundos
            </p>
        </div>
    </div>

    <div id="monitorGrid" class="monitor-grid">

    </div>

@endsection

@push('scripts')
    <script>
        async function cargarMonitor() {

            const estudiantes = await ajaxRequest('/panel/sesion/estudiantes');

            const grid = document.getElementById('monitorGrid');

            grid.innerHTML = '';

            if (estudiantes.length === 0) {

                grid.innerHTML = `
                <div class="monitor-empty">
                    No hay estudiantes conectados.
                </div>
            `;

                return;
            }

            estudiantes.forEach(estudiante => {

                const avatar = estudiante.avatar ?
                    `/storage/${estudiante.avatar}` :
                    null;

                grid.innerHTML += `
                <div class="monitor-card">

                    <div class="monitor-avatar">

                        ${
                            avatar
                            ? `<img src="${avatar}" alt="${estudiante.nombre}">`
                            : `<span>${estudiante.iniciales}</span>`
                        }

                    </div>

                   <div class="monitor-info">

    <h4>${estudiante.nombre}</h4>

    <div class="estado-online">

        <span class="online-dot"></span>

        <span>Conectado</span>

    </div>

</div>

                </div>
            `;

            });

            document.getElementById('ultimaActualizacion').innerHTML =
                'Actualizado: ' + new Date().toLocaleTimeString();

        }

        cargarMonitor();

        setInterval(cargarMonitor, 30000);
    </script>
@endpush
