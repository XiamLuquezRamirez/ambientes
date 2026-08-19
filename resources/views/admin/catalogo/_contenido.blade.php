{{-- Contenido AJAX: pestañas DBA MEN + DBA colegio --}}
<div class="c-card">
    <ul class="nav nav-tabs" id="tabsCatalogoDBA" role="tablist">
        <li class="nav-item" role="presentation">
            <a class="nav-link active" id="tab-dba-men" data-bs-toggle="tab" href="#panelDbaMen" role="tab"
                aria-controls="panelDbaMen" aria-selected="true" data-tab="men">
                <i class="fa-solid fa-landmark"></i> DBA del MEN
                <span class="badge badge-men ms-1">MEN</span>
            </a>
        </li>
        <li class="nav-item" role="presentation">
            <a class="nav-link" id="tab-dba-colegio" data-bs-toggle="tab" href="#panelDbaColegio" role="tab"
                aria-controls="panelDbaColegio" aria-selected="false" data-tab="colegio">
                <i class="fa-solid fa-school"></i> DBA del colegio
                <span class="badge badge-colegio ms-1">Del colegio</span>
            </a>
        </li>
    </ul>

    <div class="tab-content" style="padding:20px">
        <div class="tab-pane fade show active" id="panelDbaMen" role="tabpanel" aria-labelledby="tab-dba-men">
            <p class="text-muted small mb-3 catalogo-dba-hint">
                Catálogo oficial del MEN (activos e inactivos). Solo lectura.
            </p>
            <div id="contenedorTablaMen">
                @include('admin.catalogo._tablaMen')
            </div>
        </div>

        <div class="tab-pane fade" id="panelDbaColegio" role="tabpanel" aria-labelledby="tab-dba-colegio">
            <p class="text-muted small mb-3 catalogo-dba-hint">
                DBA personalizados de la institución. Puedes crear, editar y activar/desactivar.
            </p>
            <div id="contenedorTablaColegio">
                @include('admin.catalogo._tablaColegio')
            </div>
        </div>
    </div>
</div>
