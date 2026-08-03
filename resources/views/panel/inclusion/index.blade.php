@extends('layouts.panel')
@section('title', 'Inclusión')

@section('content')
    <div class="page-header" style="margin-bottom:24px">
        <h1 style="font-family: var(--font-display); font-size: 1.6rem; color: var(--color-primary-dark); margin:0 0 4px">
            Inclusión
        </h1>
        <p style="color:#64748B;margin:0">Herramientas de inclusión y seguimiento pedagógico</p>
    </div>

    <div class="row g-3">
        <div class="col-md-6 col-lg-4">
            <a href="{{ route('panel.inclusion.condiciones-transitorias') }}" class="c-card inclusion-nav-card"
                style="display:block;text-decoration:none;color:inherit;height:100%">
                <div style="display:flex;align-items:flex-start;gap:14px">
                    <div style="width:44px;height:44px;border-radius:12px;background:#FFF7ED;color:#C2410C;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                        <i class="fa-solid fa-puzzle-piece"></i>
                    </div>
                    <div>
                        <h3 style="margin:0 0 6px;font-size:1.05rem;font-weight:700;color:#0F172A">
                            Condiciones transitorias
                        </h3>
                        <p style="margin:0;color:#64748B;font-size:.9rem;line-height:1.45">
                            Consulta las opciones de tu institución, crea nuevas y gestiona solo las que tú hayas registrado.
                        </p>
                    </div>
                </div>
            </a>
        </div>
    </div>
@endsection
