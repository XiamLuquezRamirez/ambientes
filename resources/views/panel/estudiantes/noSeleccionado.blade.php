@extends('layouts.panel')
@section('title', 'Ambiente no seleccionado')
@push('styles')
    <style>
          .ambiente-card {
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 16px;
            overflow: visible;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
            cursor: pointer;
            position: relative;
        }

        .ambiente-card:hover {
            transform: translateY(-4px) scale(1.01);
            box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
            border-color: #93C5FD;
        }

        .card-franja {
            height: 6px;
            border-radius: 14px 14px 0 0;
        }

        /* Cabecera */
        .card-head {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 18px 18px 0;
        }

        .card-icono {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            flex-shrink: 0;
        }

        .card-info {
            flex: 1;
            min-width: 0;
        }

        .card-nombre {
            font-weight: 700;
            font-size: .98rem;
            color: #1E293B;
        }

        .card-stats {
            display: flex;
            flex-wrap: wrap;
            /* Evita que los badges salten de línea */
            gap: 10px;
            /* Espacio horizontal entre los dos badges */
            padding: 12px 18px 16px;
            /* Ajustamos el padding inferior */
            align-items: center;
        }

        .badge-stat {
            white-space: nowrap;
            /* Evita que el texto interno se rompa en dos renglones */
            flex: 1;
            /* Hace que ambos compartan el espacio de forma equitativa (opcional) */
            text-align: center;
        }

        .bs-azul {
            background: #EFF6FF;
            color: #1D4ED8;
        }

        .bs-verde {
            background: #F0FDF4;
            color: #166534;
        }

        .bs-morado {
            background: #F5F3FF;
            color: #5B21B6;
        }

        .bs-slate {
            background: #F8FAFC;
            color: #475569;
            border: 1px solid #E2E8F0;
        }

    </style>
@endpush
@section('content')
    <div class="alert alert-warning">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <strong>No hay ambiente seleccionado</strong>
        <p>Debe seleccionar un ambiente antes de continuar.</p>
    </div>
    <div class="row">
        @foreach($ambientes as $amb)
            <div class="col-md-4">
                <div class="ambiente-card btn-seleccionar-ambiente" id="tarjeta-amb-{{ $amb->id }}"
                    data-id="{{ $amb->id }}" data-nombre="{{ $amb->nombre }}" onclick="seleccionarAmbiente(this, '{{ $url_actual }}')">

                    <div class="card-franja" style="background:{{ $amb->color_hex }}"></div>

                    <div class="py-3 px-4 d-flex align-items-center gap-3">
                        <div class="card-icono" style="background:{{ $amb->color_hex }}22">{{ $amb->icono }}</div>
                        <div class="card-info">
                            <div class="card-nombre" style="font-size: 1.1rem; font-weight: 600;">Ambiente {{ $amb->nombre }}</div>
                        </div>
                    </div>

                    <div class="card-stats">
                        <span class="badge-stat bs-azul">
                            <i class="fas fa-graduation-cap"></i> {{ $amb->grados_count }} grado(s)
                        </span>
                        
                        <span class="badge-stat bs-verde">
                            <i class="fas fa-child"></i> {{ $amb->grupos_count }} grupo(s)
                        </span>
                    </div>
                </div>
            </div>
        @endforeach
        <input type="hidden" id="crf-token" value="{{ csrf_token() }}">
    </div>
    @push('scripts')
        <script src="{{ asset('assets/js/seleccionar_ambiente.js') }}"></script>
    @endpush
@endsection
