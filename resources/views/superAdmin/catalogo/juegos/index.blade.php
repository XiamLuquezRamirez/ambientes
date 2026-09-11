@extends('layouts.superAdmin')
@section('title', 'Juegos')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/panel/estudiantes.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/constructor-vista-nino.css') }}?v={{ @filemtime(public_path('assets/css/constructor-vista-nino.css')) }}">
    <style>
        /* Hueco del header: play (36) + gap + menú (36) ≈ 80px */
        #juegosPage .student-top {
            padding-right: 88px;
        }
        #juegosPage .student-identity {
            padding-right: 0;
        }
        #juegosPage .student-options {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        #juegosPage .cj-preview-btn {
            width: 36px;
            height: 36px;
            padding: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            line-height: 1;
            flex-shrink: 0;
        }
        #juegosPage .cj-preview-btn .fa-play {
            font-size: .75rem;
            margin-left: 1px;
        }

        #juegosPage .student-info {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 6px 8px;
        }
        #juegosPage .cj-card-desc {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.35;
            flex: 1 1 100%;
        }
        #juegosPage .cj-card-ruta {
            display: block;
            max-width: 100%;
            font-size: .68rem;
            color: #64748b;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1 1 auto;
            min-width: 0;
        }
        #juegosPage .cj-switch-activo {
            margin-left: auto;
            padding-left: 2.2em;
            flex: 0 0 auto;
        }
        #juegosPage .students-grid--list .student-options {
            flex-direction: row;
        }

        /* Preview catálogo: tablet sin nav de bloques, iframe a pantalla completa */
        #cjPreviewOverlay .vn-screen-nav { display: none !important; }
        #cjPreviewOverlay .vn-tablet-screen {
            position: relative;
        }
        #cjPreviewOverlay .vn-screen-body {
            position: relative;
            flex: 1 1 auto;
            min-height: 0;
            padding: 0;
            overflow: hidden;
            background: #0b1220;
            display: block;
        }
        #cjPreviewOverlay .vn-screen-body::before {
            display: none;
        }
        #cjPreviewFrame {
            width: 100%;
            height: 100%;
            border: 0;
            background: #fff;
            display: block;
        }
        #cjPreviewOverlay .vn-reload-btn {
            right: 56px;
        }
    </style>
@endpush

@section('content')
    <div class="students-page" id="juegosPage"
        data-url-base="{{ route('superadmin.catalogo.juegos') }}"
        data-url-guardar="{{ route('superadmin.catalogo.juegos.guardar') }}"
        data-url-mostrar-template="{{ url('superadmin/catalogo/juegos/__ID__') }}"
        data-url-actualizar-template="{{ url('superadmin/catalogo/juegos/__ID__') }}"
        data-url-estado-template="{{ url('superadmin/catalogo/juegos/__ID__/estado') }}">
        <div class="page-header students-header d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
                <h1 class="mb-1">Juegos</h1>
                <p class="students-subtitle mb-0">
                    Catálogo de paquetes de juegos. Independiente de los motores del constructor de experiencias.
                </p>
            </div>
            <button type="button" class="btn btn-primary" id="btnNuevoJuegoCatalogo">
                <i class="fa-solid fa-plus"></i> Nuevo juego
            </button>
        </div>

        <div id="container-grid">
            @include('superAdmin.catalogo.juegos.partials._grid')
        </div>
    </div>

    @include('superAdmin.catalogo.juegos.modalJuego')

    <script type="application/json" id="cj-perfil-payload">@json($perfilPayload ?? ['perfil_clave' => 'estandar', 'valores' => []])</script>

    {{-- Overlay tablet (mismo chrome que Vista Niño) --}}
    <div class="vn-overlay" id="cjPreviewOverlay" hidden aria-hidden="true">
        <div class="vn-backdrop" data-cj-close></div>
        <div class="vn-shell" role="dialog" aria-modal="true" aria-labelledby="cjPreviewTitle">
            <button type="button" class="vn-close" data-cj-close title="Cerrar vista previa" aria-label="Cerrar">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <button type="button" class="vn-reload-btn" id="cjPreviewReload" title="Recargar juego"
                aria-label="Recargar juego">
                <i class="fa-solid fa-rotate"></i>
            </button>
            <div class="vn-tablet-stage" id="cjTabletStage">
                <div class="vn-tablet" id="cjTablet" data-screen-w="1280" data-screen-h="800">
                    <div class="vn-tablet-bezel">
                        <div class="vn-tablet-camera" aria-hidden="true"></div>
                        <div class="vn-tablet-screen" id="cjTabletScreen">
                            <div class="vn-screen-body" id="cjPreviewBody">
                                <iframe id="cjPreviewFrame" title="Vista previa del juego" allow="autoplay; fullscreen" referrerpolicy="same-origin"></iframe>
                            </div>
                            <footer class="vn-screen-nav" hidden aria-hidden="true"></footer>
                        </div>
                        <div class="vn-tablet-home" aria-hidden="true"></div>
                    </div>
                </div>
            </div>
            <p class="vn-hint">
                Vista previa 1280×800 · <strong id="cjPreviewTitle">Juego</strong>
            </p>
        </div>
    </div>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/juegos/filtros-ui.js') }}"></script>
    <script src="{{ asset('assets/js/superAdmin/catalogo-juegos.js') }}?v={{ @filemtime(public_path('assets/js/superAdmin/catalogo-juegos.js')) }}"></script>
@endpush
