@extends('layouts.admin')
@section('title', 'Diligenciar PIAR')

@push('styles')
<style>
    .piar-wizard {
        max-width: 920px;
        margin: 0 auto;
    }

    .piar-card {
        background: #fff;
        border-radius: 16px;
        border: 1px solid #DBEAFE;
        box-shadow: 0 4px 24px rgba(30, 58, 138, .08);
        overflow: hidden;
    }

    .piar-card-header {
        background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
        padding: 28px 32px;
        color: #fff;
    }

    .piar-card-header h2 {
        font-family: 'Fredoka One', cursive;
        font-size: 1.5rem;
        margin-bottom: 4px;
    }

    .piar-card-header p {
        opacity: .85;
        font-size: .9rem;
        margin: 0;
    }

    /* ── Stepper ── */
    .piar-stepper {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 28px 32px 0;
        position: relative;
    }

    .piar-stepper::before {
        content: '';
        position: absolute;
        top: 44px;
        left: 0px;
        right: 60px;
        height: 3px;
        background: #E2E8F0;
        z-index: 0;
        width: 100%;
    }

    .piar-stepper-progress {
        position: absolute;
        top: 44px;
        left: 0px;
        height: 3px;
        background: linear-gradient(90deg, #2563EB, #7C3AED);
        z-index: 1;
        transition: width .4s ease;
        border-radius: 99px;
    }

    .piar-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        flex: 1;
        position: relative;
        z-index: 2;
        cursor: default;
    }

    .piar-step-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #fff;
        border: 3px solid #E2E8F0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: .85rem;
        color: #94A3B8;
        transition: all .3s ease;
    }

    .piar-step.active .piar-step-circle {
        border-color: #2563EB;
        background: #2563EB;
        color: #fff;
        box-shadow: 0 0 0 4px rgba(37, 99, 235, .2);
    }

    .piar-step.completed .piar-step-circle {
        border-color: #059669;
        background: #059669;
        color: #fff;
    }

    .piar-step-label {
        font-size: .72rem;
        font-weight: 600;
        color: #94A3B8;
        text-align: center;
        max-width: 90px;
        line-height: 1.3;
        transition: color .3s;
    }

    .piar-step.active .piar-step-label,
    .piar-step.completed .piar-step-label {
        color: #1E293B;
    }

    /* ── Body ── */
    .piar-body {
        padding: 32px;
    }

    .piar-pane {
        display: none;
        animation: fadeSlideIn .35s ease;
    }

    .piar-pane.active {
        display: block;
    }

    @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    .piar-pane-title {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
    }

    .piar-pane-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        flex-shrink: 0;
    }

    .piar-pane-title h3 {
        font-size: 1.15rem;
        font-weight: 700;
        color: #1E293B;
        margin: 0;
    }

    .piar-pane-title p {
        font-size: .82rem;
        color: #64748B;
        margin: 0;
    }

    /* ── Info cards ── */
    .piar-info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 14px;
        margin-bottom: 24px;
    }

    .piar-info-item {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 14px 16px;
    }

    .piar-info-item label {
        display: block;
        font-size: .72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .04em;
        color: #94A3B8;
        margin-bottom: 4px;
    }

    .piar-info-item span {
        font-size: .92rem;
        font-weight: 600;
        color: #1E293B;
    }

    /* ── Textareas ── */
    .piar-textarea {
        border: 1px solid #CBD5E1;
        border-radius: 10px;
        padding: 14px 16px;
        font-family: 'Nunito', sans-serif;
        font-size: .9rem;
        resize: vertical;
        min-height: 140px;
        transition: border-color .15s, box-shadow .15s;
        width: 100%;
    }

    .piar-textarea:focus {
        outline: none;
        border-color: #2563EB;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, .12);
    }

    /* ── Checklist cards ── */
    .piar-check-card {
        border: 2px solid #E2E8F0;
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all .2s;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 10px;
    }

    .piar-check-card:hover {
        border-color: #BFDBFE;
        background: #F0F7FF;
    }

    .piar-check-card.selected {
        border-color: #2563EB;
        background: #EFF6FF;
    }

    .piar-check-card input[type="checkbox"] {
        margin-top: 3px;
        accent-color: #2563EB;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
    }

    .piar-check-card strong {
        display: block;
        font-size: .88rem;
        color: #1E293B;
        margin-bottom: 2px;
    }

    .piar-check-card small {
        color: #64748B;
        font-size: .78rem;
    }

    /* ── Upload zone ── */
    .piar-upload {
        border: 2px dashed #CBD5E1;
        border-radius: 12px;
        padding: 32px;
        text-align: center;
        cursor: pointer;
        transition: all .2s;
        background: #F8FAFC;
    }

    .piar-upload:hover,
    .piar-upload.dragover {
        border-color: #2563EB;
        background: #EFF6FF;
    }

    .piar-upload i {
        font-size: 2rem;
        color: #94A3B8;
        margin-bottom: 10px;
    }

    .piar-upload p {
        color: #64748B;
        font-size: .88rem;
        margin: 0;
    }

    .piar-upload strong {
        color: #2563EB;
    }

    /* ── Resumen ── */
    .piar-resumen-block {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-left: 4px solid #2563EB;
        border-radius: 0 10px 10px 0;
        padding: 16px 20px;
        margin-bottom: 14px;
    }

    .piar-resumen-block h6 {
        font-size: .75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .05em;
        color: #64748B;
        margin-bottom: 6px;
    }

    .piar-resumen-block p {
        font-size: .88rem;
        color: #1E293B;
        margin: 0;
        white-space: pre-wrap;
    }

    .piar-resumen-empty {
        color: #94A3B8;
        font-style: italic;
    }

    /* ── Footer nav ── */
    .piar-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 32px;
        border-top: 1px solid #E2E8F0;
        background: #F8FAFC;
    }

    .piar-step-counter {
        font-size: .82rem;
        color: #64748B;
        font-weight: 600;
    }

    .piar-step-counter span {
        color: #2563EB;
    }

    .btn-piar-outline {
        background: #fff;
        color: #475569;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 9px 20px;
        font-weight: 600;
        font-size: .88rem;
        transition: all .15s;
    }

    .btn-piar-outline:hover {
        background: #F1F5F9;
        color: #1E293B;
    }

    .btn-piar-next {
        background: linear-gradient(135deg, #2563EB, #1E40AF);
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 9px 24px;
        font-weight: 700;
        font-size: .88rem;
        transition: all .15s;
        box-shadow: 0 2px 8px rgba(37, 99, 235, .3);
    }

    .btn-piar-next:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(37, 99, 235, .4);
        color: #fff;
    }

    .btn-piar-save {
        background: linear-gradient(135deg, #059669, #047857);
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 9px 24px;
        font-weight: 700;
        font-size: .88rem;
        box-shadow: 0 2px 8px rgba(5, 150, 105, .3);
    }

    .btn-piar-save:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(5, 150, 105, .4);
        color: #fff;
    }

    .piar-alert-info {
        background: #EFF6FF;
        border: 1px solid #BFDBFE;
        border-radius: 10px;
        padding: 14px 18px;
        font-size: .85rem;
        color: #1E40AF;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 20px;
    }

    @media (max-width: 640px) {
        .piar-stepper { padding: 20px 16px 0; }
        .piar-stepper::before,
        .piar-stepper-progress { left: 30px; right: 30px; }
        .piar-step-label { display: none; }
        .piar-body, .piar-footer { padding: 20px 16px; }
        .piar-card-header { padding: 20px 16px; }
    }

    .piar-container {
        background: #fff;
        border-radius: 10px;
        padding: 20px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    .piar-body .card-header {
        background-color:rgb(217, 236, 255) !important;
    }
    

    #div_tratamiento_terapeutico {
        background: #F0FDF4;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 10px;
    }

    #div_atencion_medica {
        background: #F0FDF4;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 10px;
    }

    #div_medicamentos {
        background: #F0FDF4;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 10px;
    }

    label {
        font-weight: 600;
    }

    .card-item {
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 20px;
    }

    .form-select {
        line-height: 1.8 !important;
    }

    .piar-valoracion-table th {
        background: #F1F5F9;
        font-size: .78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .03em;
        color: #475569;
        vertical-align: middle;
    }

    .piar-valoracion-table td {
        font-size: .88rem;
        color: #1E293B;
        vertical-align: middle;
    }

    .piar-valoracion-table .form-select,
    .piar-valoracion-table .form-control {
        font-size: .85rem;
    }

    .piar-intensidad-group {
        display: flex;
        flex-wrap: wrap;
        gap: 12px 20px;
    }

    .piar-intensidad-group .form-check {
        margin: 0;
    }

    .piar-intensidad-group .form-check-label {
        font-size: .85rem;
        font-weight: 500;
    }

    .table-no-border tbody, .table-no-border tr, .table-no-border td {
        border: none !important;
    }

    .table-no-border input[type="radio"] {
        scale: 1.5;
    }


    .no-border-radio {
        border-radius: 0px !important;
    }

    .auto-grow{
        resize: none;
        overflow: hidden;
    }

    #btnAgregarAjuste {
        position: absolute;
        right: 0;
        bottom: 0;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 10px;
    }

    .firma-img {
        width: 220px;
        height: 90px;
        object-fit: contain;
        border-radius: 5px;
        border: 1px solid #E2E8F0;
        padding: 5px;
        background-color: #F1F5F9;
        margin-top: 10px;
    }

    .piar-acta-title {
        background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%) !important;
        color: #fff !important;
        font-size: 1rem;
        letter-spacing: .06em;
        padding: 14px !important;
        text-transform: uppercase;
    }

    .piar-acta-table td:first-child {
        width: 35%;
        font-weight: 600;
        background: #F8FAFC;
    }

    .piar-acta-texto {
        font-size: .9rem;
        line-height: 1.7;
        color: #334155;
        text-align: justify;
    }

    .piar-acta-texto p {
        margin-bottom: 1rem;
    }

    .piar-acta-texto p:last-child {
        margin-bottom: 0;
    }

    .frecuencia-radio input[type="radio"] {
        scale: 1.5;
        margin-right: 5px;
    }

    .frecuencia-radio label {
        font-size: 1.2rem;
    }

    .btn-eliminar-ajuste {
        position: absolute;
        right: -34px;
        bottom: 30%;
    }
</style>
@endpush

@section('content')
<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
    <div>
        <h1>Diligenciar PIAR</h1>
        <p>Plan Individual de Ajustes Razonables</p>
    </div>
    <a href="{{ route('admin.estudiantes') }}" class="btn btn-piar-outline">
        <i class="fas fa-arrow-left me-1"></i> Volver
    </a>
</div>
<div class="piar-container">
    {{-- Stepper --}}
    <div class="piar-stepper" id="piarStepper">
        <div class="piar-stepper-progress" id="piarProgress" style="width:0%"></div>

        <div class="piar-step active" data-step="1">
            <div class="piar-step-circle">1</div>
            <span class="piar-step-label">Información general del estudiante</span>
        </div>
        <div class="piar-step" data-step="2">
            <div class="piar-step-circle">2</div>
            <span class="piar-step-label">Entorno Salud</span>
        </div>
        <div class="piar-step" data-step="3">
            <div class="piar-step-circle">3</div>
            <span class="piar-step-label">Entorno Hogar</span>
        </div>
        <div class="piar-step" data-step="4">
            <div class="piar-step-circle">4</div>
            <span class="piar-step-label">Entorno Educativo</span>
        </div>
        <div class="piar-step" data-step="5">
            <div class="piar-step-circle">5</div>
            <span class="piar-step-label">Valoración Pedagógica</span>
        </div>
        <div class="piar-step" data-step="6">
            <div class="piar-step-circle">6</div>
            <span class="piar-step-label">Ajustes Razonables</span>
        </div>
        <div class="piar-step" data-step="7">
            <div class="piar-step-circle">7</div>
            <span class="piar-step-label">Acta de acuerdo</span>
        </div>
    </div>
        <div class="piar-body">
            {{-- PASO 1: Información General --}}
            <div class="piar-pane card-item" data-pane="1">
                <div class="piar-pane-title">
                    <div class="piar-pane-icon" style="background:#EFF6FF;color:#2563EB">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <div>
                        <h3>Información general del estudiante</h3>
                        <p>Por favor, complete los siguientes datos para el estudiante</p>
                    </div>
                </div>
                <form action="" id="form-paso-1">
                    @csrf
                    <input type="hidden" name="id_estudiante" value="{{ $estudiante?->id }}">
                    <input type="hidden" name="id_docente" value="{{ $docente_diligencia?->id }}">
                    <!-- Datos de diligenciamiento -->
                    <div class="card mb-3">
                        <div class="card-header">
                            Información de diligenciamiento
                        </div>
                        <div class="card-body row g-3">
                            <div class="col-md-4">
                                <label class="form-label">Fecha de diligenciamiento</label>
                                <input readonly type="date" class="form-control" name="fecha_diligenciamiento" value="{{ date('Y-m-d') }}">
                            </div>
                            <div class="col-md-8">
                                <label class="form-label">Nombre y rol de quien diligencia</label>
                                <input type="text" readonly class="form-control" name="persona_diligencia" value="{{ $docente_diligencia?->nombre }} - {{ $docente_diligencia?->rol }}">
                            </div>
                            <div class="col-12">
                                <label class="form-label">Institución Educativa</label>
                                <input type="text" readonly class="form-control" name="institucion" value="{{ config('ambiente.nombre') }}">
                            </div>
                        </div>
                    </div>
                
                    <!-- Información general del estudiante -->
                    <div class="card mb-3">
                        <div class="card-header">
                            Información General del Estudiante
                        </div>
                        <div class="card-body row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Nombres</label>
                                <input readonly type="text" class="form-control" name="nombres" value="{{ $estudiante?->nombre }}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Apellidos</label>
                                <input readonly type="text" class="form-control" name="apellidos" value="{{ $estudiante?->apellido }}">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Tipo identificación</label>
                                <select class="form-select" name="tipo_identificacion" readonly>
                                    <option {{ $estudiante?->tipo_identificacion == '' ? 'selected' : '' }} value="">Seleccione</option>
                                    <option {{ $estudiante?->tipo_identificacion == 'TI' ? 'selected' : '' }} value="TI">TI</option>
                                    <option {{ $estudiante?->tipo_identificacion == 'CC' ? 'selected' : '' }} value="CC">CC</option>
                                    <option {{ $estudiante?->tipo_identificacion == 'RC' ? 'selected' : '' }} value="RC">RC</option>
                                    <option {{ $estudiante?->tipo_identificacion == 'Otro' ? 'selected' : '' }} value="Otro">Otro</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">¿Cuál?</label>
                                <input type="text" readonly value="{{ $estudiante?->otro_tipo_identificacion }}" class="form-control" name="otro_tipo">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Número de identificación</label>
                                <input readonly type="text" class="form-control" name="identificacion" value="{{ $estudiante?->identificacion }}">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Lugar de nacimiento</label>
                                <input type="text" readonly value="{{ $estudiante?->lugar_nacimiento }}" class="form-control" name="lugar_nacimiento">
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">Edad (años)</label>
                                <input type="number" readonly value="{{ $estudiante?->edad }}" class="form-control" name="edad">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Fecha nacimiento</label>
                                <input type="date" readonly value="{{ $estudiante?->fecha_nacimiento }}" class="form-control" name="fecha_nacimiento">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Grado actual</label>
                                <input type="text" readonly value="{{ $estudiante?->grado?->nombre }}" class="form-control" name="grado">
                            </div>     
                            <div class="col-md-6">
                                <label class="form-label">
                                    ¿El año anterior estuvo vinculado al sistema educativo?
                                </label>
        
                                <select class="form-select" name="vinculado" required>
                                    <option value="">Seleccione</option>
                                    <option>Si</option>
                                    <option>No</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Departamento</label>
                                <input readonly type="text" class="form-control" name="departamento" value="{{ $estudiante?->departamento?->descripcion }}">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Municipio</label>
                                <input readonly type="text" class="form-control" name="municipio" value="{{ $estudiante?->municipio?->descripcion }}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Barrio / Vereda</label>
                                <input readonly type="text" class="form-control" name="barrio" value="{{ $estudiante?->barrio_vereda }}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Dirección</label>
                                <input readonly type="text" class="form-control" name="direccion" value="{{ $estudiante?->direccion }}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Teléfono</label>
                                <input readonly type="text" class="form-control" name="telefono" value="{{ $estudiante?->telefono }}">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Correo electrónico</label>
                                <input readonly type="email" class="form-control" name="correo" value="{{ $estudiante?->email }}">
                            </div>                
                            <div class="col-md-6">
                                <label class="form-label">
                                    ¿Se reconoce como víctima del conflicto armado?
                                </label>
                                <select class="form-select" name="victima" required>
                                    <option value="">Seleccione</option>
                                    <option>Si</option>
                                    <option>No</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">
                                    ¿Cuenta con el respectivo registro?
                                </label>
                                <select class="form-select" name="registro_victima" required>
                                    <option value="">Seleccione</option>
                                    <option>Si</option>
                                    <option>No</option>
                                </select>
                            </div>                
                            <div class="col-md-6">
                                <label class="form-label">
                                    ¿Está en algún centro de protección?
                                </label>
                                <select class="form-select" name="centro_proteccion" onchange="colocarRequired('cual_centro_proteccion', this)" required>
                                    <option value="">Seleccione</option>
                                    <option>Si</option>
                                    <option>No</option>
                                </select>
                            </div>    
                            <div class="col-6">
                                <label class="form-label">¿Cuál centro de protección?</label>
                                <input type="text" class="form-control" id="cual_centro_proteccion" name="cual_centro_proteccion">
                            </div>      
                            <div class="col-md-6">
                                <label class="form-label">
                                    ¿Se reconoce o pertenece a un grupo étnico?
                                </label>
                                <select class="form-select" name="grupo_etnico" onchange="colocarRequired('cual_etnico', this)" required>
                                    <option value="">Seleccione</option>
                                    <option>Si</option>
                                    <option>No</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label">¿Cuál grupo étnico?</label>
                                <input type="text" class="form-control" id="cual_etnico" name="cual_etnico">
                            </div>
                        </div>
                    </div>
                    <!-- Descripción general -->
                    <div class="card">
                
                        <div class="card-header">
                            Descripción general del  estudiante con énfasis en sus capacidades, gustos e intereses o  aspectos que le  desagradan,   expectativas del  estudiante y la familia,  acompañamiento familiar y redes de   apoyo con los que se  cuenta.
                        </div>
                        <div class="card-body row g-3">
                            <div class="col-12">
                                <label class="form-label">Capacidades</label>
                                <textarea required class="form-control" rows="3" name="capacidades" required></textarea>
                            </div>
                            <div class="col-12">
                                <label class="form-label">Gustos e intereses</label>
                                <textarea required class="form-control" rows="3" name="gustos" required></textarea>
                            </div>
                            <div class="col-12">
                                <label class="form-label">Expectativas del estudiante</label>
                                <textarea required class="form-control" rows="3" name="expectativas_estudiante" required></textarea>
                            </div>
                            <div class="col-12">
                                <label class="form-label">Expectativas de la familia</label>
                                <textarea required class="form-control" rows="3" name="expectativas_familia" required></textarea>
                            </div>
                            <div class="col-12">
                                <label class="form-label">Redes de apoyo</label>
                                <textarea required class="form-control" rows="3" name="redes_apoyo" required></textarea>
                            </div>
                            <div class="col-12">
                                <label class="form-label">Otras</label>
                                <textarea required class="form-control" rows="3" name="otras" required></textarea>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {{-- PASO 2: Entorno Salud --}}
            <div class="piar-pane card-item" data-pane="2">
                <div class="piar-pane-title">
                    <div class="piar-pane-icon" style="background:#F0FDF4;color:#059669">
                        <i class="fas fa-stethoscope"></i>
                    </div>
                    <div>
                        <h3>Entorno Salud</h3>
                        <p>Por favor, complete los siguientes datos para el entorno salud del estudiante</p>
                    </div>
                </div>
                <div class="card mb-3">
                    <form id="form-paso-2">
                        @csrf
                        <input type="hidden" name="id_estudiante" value="{{ $estudiante?->id }}">
                        <input type="hidden" name="id_docente" value="{{ $docente_diligencia?->id }}">
                        <div class="card-body row g-3">
                            <!-- Afiliación -->
                            <div class="col-md-4">
                                <label class="form-label">Afiliado al sistema de salud</label>
                                <select class="form-select" name="afiliado_salud" required>
                                    <option value="">Seleccione</option>
                                    <option>Si</option>
                                    <option>No</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Régimen</label>
                                <select class="form-select" name="regimen" required>
                                    <option value="">Seleccione</option>
                                    <option>Contributivo</option>
                                    <option>Subsidiado</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">EPS</label>
                                <input type="text" class="form-control" name="eps" required>
                            </div>
                            <!-- Emergencia -->
                            <div class="col-12">
                                <label class="form-label">
                                    Lugar donde le atienden en caso de emergencia
                                </label>
                                <input type="text" class="form-control" name="lugar_emergencia" required>
                            </div>
                            <!-- Diagnóstico -->
                            <div class="col-md-3">
                                <label class="form-label">Cuenta con diagnóstico médico</label>
                                <select class="form-select" name="diagnostico_medico" required>
                                    <option value="">Seleccione</option>
                                    <option>Si</option>
                                    <option>No</option>
                                </select>
                            </div>
                            <div class="col-md-9">
                                <label class="form-label">¿Cuál?</label>
                                <select class="form-select" name="cual_diagnostico" required>
                                    <option value="">Seleccione</option>
                                    @foreach ($condiciones as $condicion)
                                        <option value="{{ $condicion->id }}">{{ $condicion->nombre }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <!-- Atención médica -->
                            <div class="col-md-12">
                                <div class="row m-1 mt-2 p-2" id="div_atencion_medica">
                                    <div class="col-md-4">
                                        <label class="form-label">¿Cuenta con atención médica?</label>
                                        <select class="form-select" onchange="colocarRequiredVariable('atenciones_cuenta', this)" name="atencion_medica" required>
                                            <option value="">Seleccione</option>
                                            <option value="Si">Si</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                    <div class="col-md-7">
                                        <div class="row" id="atenciones_cuenta">
                                            <div class="col-md-12 row">
                                                <div class="col-md-6">
                                                    <label class="form-label">¿Cuál?</label>
                                                    <input type="text" class="form-control" name="atencion[0][cual]">
                                                </div>
                                                <div class="col-md-5">
                                                    <label class="form-label">Frecuencia</label>
                                                    <input type="text" class="form-control" name="atencion[0][frecuencia]">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-1 d-flex justify-content-center align-items-end">
                                        <button type="button" class="btn btn-primary" onclick="agregarAtencionMedica()">+</button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-12">
                                <div class="row m-1 mt-2 p-2" id="div_tratamiento_terapeutico">
                                    <!-- Tratamiento terapéutico -->
                                    <div class="col-md-4">
                                        <label class="form-label">¿Cuenta con intervención o tratamiento terapéutico integral?</label>
                                        <select class="form-select" onchange="colocarRequiredVariable('tratamientos_cuenta', this)" name="tratamiento_integral" required>
                                            <option value="">Seleccione</option>
                                            <option value="Si">Si</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                    <div class="col-md-7">
                                        <div class="row" id="tratamientos_cuenta">
                                            <div class="col-md-12 row pt-4" id="tratamiento_1">
                                                <div class="col-md-6">  
                                                    <label class="form-label">¿Cuál?</label>
                                                    <input type="text" class="form-control" name="tratamiento[0][cual]">
                                                </div>
                                                <div class="col-md-5">
                                                    <label class="form-label">Frecuencia</label>
                                                    <input type="text" class="form-control" name="tratamiento[0][frecuencia]">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-1 d-flex justify-content-center align-items-end">
                                        <button type="button" class="btn btn-primary" onclick="agregarTratamiento()">+</button>
                                    </div>
                                </div>
                            </div>
                            <!-- Medicamentos -->
                            <div class="col-md-12">
                                <div class="row m-1 mt-2 p-2" id="div_medicamentos">
                                    <div class="col-md-3">
                                        <label class="form-label">¿Consume medicamentos?</label>
                                        <select class="form-select" onchange="colocarRequiredVariable('medicamentos_cuenta', this)" name="consume_medicamentos" required>
                                            <option value="">Seleccione</option>
                                            <option value="Si">Si</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                    <div class="col-md-8">
                                        <div class="row" id="medicamentos_cuenta">
                                            <div class="col-md-12 row" id="medicamento_1">
                                                <div class="col-md-4">
                                                    <label class="form-label">¿Cuál?</label>
                                                    <input type="text" class="form-control" name="medicamento[0][cual]">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Frecuencia</label>
                                                    <input type="text" class="form-control" name="medicamento[0][frecuencia]">
                                                </div>
                                                <div class="col-md-3">
                                                    <label class="form-label">Horario</label>
                                                    <input type="text" class="form-control" name="medicamento[0][horario]">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-1 d-flex justify-content-center align-items-end">
                                        <button type="button" class="btn btn-primary" onclick="agregarMedicamento()">+</button>
                                    </div>
                                </div>
                            </div>
                            <!-- Ayudas técnicas -->
                            <div class="col-md-12">
                                <label class="form-label">
                                    ¿Cuenta con apoyos o ayudas técnicas o tecnológicas para favorecer su movilidad, comunicación e independencia?
                                </label>
                                <select class="form-select" onchange="colocarRequired('cuales_ayudas', this)" name="ayudas_tecnicas" required>
                                    <option value="">Seleccione</option>
                                    <option value="Si">Si</option>
                                    <option value="No">No</option>
                                </select>
                            </div>
                            <div class="col-md-12">
                                <label class="form-label">¿Cuáles?</label>
                                <textarea class="form-control" id="cuales_ayudas" rows="3" name="cuales_ayudas" ></textarea>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {{-- PASO 3: Entorno Hogar --}}
            <div class="piar-pane card-item" data-pane="3">
                <div class="piar-pane-title">
                    <div class="piar-pane-icon" style="background:#FFF7ED;color:#EA580C">
                        <i class="fas fa-house"></i>
                    </div>
                    <div>
                        <h3>Entorno Hogar</h3>
                        <p>Por favor, complete los siguientes datos para el entorno hogar del estudiante</p>
                    </div>
                </div>
                <form id="form-paso-3">
                    @csrf
                    <input type="hidden" name="id_estudiante" value="{{ $estudiante?->id }}">
                    <input type="hidden" name="id_docente" value="{{ $docente_diligencia?->id }}">
                    <div class="card mb-3">
                        <div class="card-header">
                            Información de la Madre
                        </div>
                        <div class="card-body row g-3">
                            <div class="col-md-4">
                                <label class="form-label">Nombre de la madre</label>
                                <input required type="text" class="form-control" name="nombre_madre">
                            </div>
                    
                            <div class="col-md-4">
                                <label class="form-label">Ocupación de la madre</label>
                                <input required type="text" class="form-control" name="ocupacion_madre">
                            </div>
                    
                            <div class="col-md-4">
                                <label class="form-label">Nivel educativo alcanzado</label>
                                <select required class="form-select" name="nivel_madre">
                                    <option value="">Seleccione</option>
                                    <option>Primaria</option>
                                    <option>Bachillerato</option>
                                    <option>Técnico</option>
                                    <option>Tecnólogo</option>
                                    <option>Universitario</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="card mb-3">
                        <div class="card-header">
                            Información del Padre
                        </div>
                        <div class="card-body row g-3">
                            <div class="col-md-4">
                                <label class="form-label">Nombre del padre</label>
                                <input required type="text" class="form-control" name="nombre_padre">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Ocupación del padre</label>
                                <input required type="text" class="form-control" name="ocupacion_padre">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Nivel educativo alcanzado</label>
                                <select required class="form-select" name="nivel_padre">
                                    <option value="">Seleccione</option>
                                    <option>Primaria</option>   
                                    <option>Bachillerato</option>
                                    <option>Técnico</option>
                                    <option>Tecnólogo</option>
                                    <option>Universitario</option>
                                </select>
                            </div>
                        </div>
                    </div>  
                    <div class="card mb-3">
                        <div class="card-header">
                            Información del Cuidador
                        </div>
                        <div class="card-body row g-3">
                            <div class="col-md-4">
                                <label class="form-label">Nombre del cuidador</label>
                                <input required type="text" class="form-control" name="nombre_cuidador">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Nivel educativo del cuidador</label>
                                <select required class="form-select" name="nivel_cuidador">
                                    <option value="">Seleccione</option>
                                    <option>Primaria</option>
                                    <option>Bachillerato</option>
                                    <option>Técnico</option>
                                    <option>Tecnólogo</option>
                                    <option>Universitario</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Teléfono</label>
                                <input required type="text" class="form-control" name="telefono_cuidador">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Parentesco con el estudiante</label>
                                <input required type="text" class="form-control" name="parentesco_cuidador">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Correo electrónico</label>
                                <input required type="email" class="form-control" name="correo_cuidador">
                            </div>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-header">
                            Información general 
                        </div>
                        <div class="card-body row g-3">
                            <!-- Hermanos -->
                            <div class="col-md-6">
                                <label class="form-label">Número de hermanos</label>
                                <input required type="number" class="form-control" name="numero_hermanos">
                            </div>
                    
                            <div class="col-md-6">
                                <label class="form-label">Lugar que ocupa</label>
                                <input required type="number" class="form-control" name="lugar_ocupa">
                            </div>
                            <!-- Apoyos -->
                            <div class="col-12">
                                <label class="form-label">
                                    ¿Quiénes apoyan la crianza del estudiante?
                                </label>
                                <textarea required class="form-control" rows="3"
                                    name="apoyo_crianza"></textarea>
                            </div>
                            <div class="col-12">
                                <label class="form-label">
                                    Personas con quien vive
                                </label>
                                <textarea required class="form-control" rows="3"
                                    name="personas_con_quien_vive"></textarea>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {{-- PASO 4: Entorno Educativo --}}
            <div class="piar-pane card-item" data-pane="4">
                <div class="piar-pane-title">
                    <div class="piar-pane-icon" style="background:#F5F3FF;color:#7C3AED">
                        <i class="fas fa-school"></i>
                    </div>
                    <div>
                        <h3>Entorno Educativo</h3>
                        <p>Por favor, complete los siguientes datos para el entorno educativo del estudiante</p>
                    </div>
                </div>
                <form id="form-paso-4">
                    @csrf
                    <input type="hidden" name="id_estudiante" value="{{ $estudiante?->id }}">
                    <input type="hidden" name="id_docente" value="{{ $docente_diligencia?->id }}">
                    <div class="row g-3">
                        <!-- Vinculación previa -->
                        <div class="col-md-12">
                            <label class="form-label">
                                ¿Ha estado vinculado en otra institución educativa, fundación o bajo otra modalidadde educación?
                            </label>
                            <select required onchange="mostrarMotivo(this)" class="form-select" name="vinculado_otra_institucion">
                                <option value="">Seleccione</option>
                                <option>Si</option>
                                <option>No</option>
                            </select>
                        </div>
                
                        <div class="col-md-12" style="display:none" id="div_motivo_si_vinculado">
                            <label class="form-label">¿Cuáles?</label>
                            <input type="text" class="form-control" name="instituciones_anteriores">
                        </div>

                        <div class="col-md-12" style="display:none" id="div_motivo_no_vinculado">
                            <label class="form-label">¿Por qué?</label>
                            <input type="text" class="form-control" name="motivo_no_vinculado">
                        </div>
                
                        <!-- Último grado -->
                        <div class="col-md-6">
                            <label class="form-label">Último grado cursado</label>
                            <select required class="form-select" name="ultimo_grado">
                                <option value="">Seleccione</option>
                                <option value="transicion">Transición</option>
                                <option value="preescolar">Preescolar</option>
                                <option value="primero">Primero</option>
                                <option value="segundo">Segundo</option>
                                <option value="tercero">Tercero</option>
                                <option value="cuarto">Cuarto</option>
                                <option value="quinto">Quinto</option>
                                <option value="sexto">Sexto</option>
                                <option value="septimo">Septimo</option>
                                <option value="octavo">Octavo</option>
                                <option value="noveno">Noveno</option>
                                <option value="decimo">Decimo</option>
                                <option value="once">Once</option>
                            </select>
                        </div>
                
                        <div class="col-md-6">
                            <label class="form-label">Estado del último grado cursado</label>
                
                            <select required class="form-select" name="estado_ultimo_grado">
                                <option value="">Seleccione</option>
                                <option>Aprobado</option>
                                <option>Sin terminar</option>
                            </select>
                        </div>
                
                        <div class="col-md-12">
                            <label class="form-label">Observaciones</label>
                            <textarea required class="form-control" rows="3" name="observaciones_estado" required></textarea>
                        </div>
            
                        <!-- Informe pedagógico -->
                        <div class="col-md-6">
                            <label class="form-label">
                                ¿Se recibe informe pedagógico cualitativo o certificado que describa el proceso de desarrollo
                                y aprendizaje del estudiante y/o PIAR?
                            </label>
                            <select required class="form-select"
                                    name="recibe_informe_pedagogico">
                                <option value="">Seleccione</option>
                                <option>Si</option>
                                <option>No</option>
                            </select>
                        </div>
                
                        <div class="col-md-6 d-flex justify-content-end flex-column">
                            <label class="form-label">
                                ¿De qué institución o modalidad proviene el informe?
                            </label>
                            <input required type="text" class="form-control" name="institucion_informe">
                        </div>
                        <!-- Programas complementarios -->
                        <div class="col-md-4">
                            <label class="form-label">
                                ¿Asiste actualmente a programas complementarios?
                            </label>
                
                            <select onchange="colocarRequired('cuales_programas', this)" required class="form-select" name="programas_complementarios">
                                <option value="">Seleccione</option>
                                <option>Si</option>
                                <option>No</option>
                            </select>
                        </div>
                
                        <div class="col-md-8 d-flex justify-content-end flex-column">
                            <label class="form-label">¿Cuáles?</label>
                            <input  type="text" class="form-control" id="cuales_programas" name="cuales_programas">
                        </div>
                    </div>
                </form>
            </div>

            {{-- PASO 5: Valoración Pedagógica --}}
            <div class="piar-pane card-item" data-pane="5">
                <div class="piar-pane-title">
                    <div class="piar-pane-icon" style="background:#ECFDF5;color:#059669">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div>
                        <h3>Valoración Pedagógica</h3>
                        <p>Por favor, complete los siguientes datos para la valoración pedagógica del estudiante</p>
                    </div>
                </div>

                <div class="piar-alert-info">
                    <i class="fas fa-info-circle mt-1"></i>
                    <span>Marque la respuesta correspondiente para cada aspecto. En la columna «¿Cuál? / Observación» describa los apoyos, ajustes o detalles relevantes cuando aplique.</span>
                </div>

                <form id="form-paso-5">
                    @csrf
                    <input type="hidden" name="id_estudiante" value="{{ $estudiante?->id }}">
                    <input type="hidden" name="id_docente" value="{{ $docente_diligencia?->id }}">
                    {{-- MOVILIDAD --}}
                    <div class="card no-border-radio">
                        <div class="card-header text-center"><strong>MOVILIDAD</strong></div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-bordered piar-valoracion-table mb-0">
                                    <thead>
                                        <tr>
                                            <th style="width:50%">Aspecto</th>
                                            <th class="text-center" style="width:12%">Respuesta</th>
                                            <th>¿Cuál? / Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>¿Requiere sistema y aditamentos de apoyo para la movilidad?</td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_mov_apoyo_sistema" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_mov_apoyo_sistema" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_mov_apoyo_sistema_obs"></td>
                                        </tr>
                                        <tr>
                                            <td>¿Requiere ajustes en el espacio físico y en el ambiente para favorecer su movilidad?</td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_mov_ajustes_espacio" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_mov_ajustes_espacio" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_mov_ajustes_espacio_obs"></td>
                                        </tr>
                                        <tr>
                                            <td>¿Se necesitan ajustes para la movilidad?</td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_mov_ajustes_movilidad" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_mov_ajustes_movilidad" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_mov_ajustes_movilidad_obs"></td>
                                        </tr>
                                        <tr>
                                            <td>¿Requiere apoyos para favorecer su motricidad fina? <small class="text-muted">(no es movilidad)</small></td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_mov_motricidad_fina" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_mov_motricidad_fina" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_mov_motricidad_fina_obs"></td>
                                        </tr>
                                        <tr>
                                            <td>¿Requiere alguna adaptación para agarrar objetos?</td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_mov_adaptacion_agarrar" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_mov_adaptacion_agarrar" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_mov_adaptacion_agarrar_obs"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="p-3 border-top bg-light">
                                <label class="form-label mb-2">Intensidad y duración del apoyo</label>
                                <div class="piar-intensidad-group">
                                    @foreach (['ninguno' => 'Ninguno', 'intermitente' => 'Intermitente', 'extenso' => 'Extenso', 'generalizado' => 'Generalizado', 'no_aplica' => 'No aplica'] as $val => $label)
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="vp_mov_intensidad" id="vp_mov_intensidad_{{ $val }}" value="{{ $val }}" required>
                                            <label class="form-check-label" for="vp_mov_intensidad_{{ $val }}">{{ $label }}</label>
                                        </div>
                                    @endforeach
                                </div>
                            </div>
                        </div>
                    </div>
                    {{-- COMUNICACIÓN --}}
                    <div class="card no-border-radio">
                        <div class="card-header text-center"><strong>COMUNICACIÓN</strong></div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-bordered piar-valoracion-table mb-0">
                                    <thead>
                                        <tr>
                                            <th style="width:50%">Aspecto</th>
                                            <th class="text-center" style="width:12%">Respuesta</th>
                                            <th>¿Cuál? / Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>¿Requiere sistema de apoyo y ajustes para la comunicación?</td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_com_apoyo_sistema" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_com_apoyo_sistema" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_com_apoyo_sistema_obs"></td>
                                        </tr>
                                        <tr>
                                            <td>¿Cuenta con los aditamentos de apoyo a la comunicación?</td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_com_aditamentos" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_com_aditamentos" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_com_aditamentos_obs"></td>
                                        </tr>
                                        <tr>
                                            <td>¿Se necesitan ajustes para garantizar la comunicación?</td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_com_ajustes" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_com_ajustes" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_com_ajustes_obs"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="p-3 border-top bg-light">
                                <label class="form-label mb-2">Intensidad y duración del apoyo</label>
                                <div class="piar-intensidad-group">
                                    @foreach (['ninguno' => 'Ninguno', 'intermitente' => 'Intermitente', 'extenso' => 'Extenso', 'generalizado' => 'Generalizado', 'no_aplica' => 'No aplica'] as $val => $label)
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="vp_com_intensidad" id="vp_com_intensidad_{{ $val }}" value="{{ $val }}" required>
                                            <label class="form-check-label" for="vp_com_intensidad_{{ $val }}">{{ $label }}</label>
                                        </div>
                                    @endforeach
                                </div>
                            </div>
                        </div>
                    </div>
                    {{-- ACCESO A LA INFORMACIÓN --}}
                    <div class="card no-border-radio">
                        <div class="card-header text-center"><strong>DE ACCESO A LA INFORMACIÓN</strong></div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-bordered piar-valoracion-table mb-0">
                                    <thead>
                                        <tr>
                                            <th style="width:50%">Aspecto</th>
                                            <th class="text-center" style="width:12%">Respuesta</th>
                                            <th>¿Cuál? / Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>¿Requiere sistema de apoyo y ajustes para acceder a la información?</td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_info_apoyo_sistema" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_info_apoyo_sistema" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_info_apoyo_sistema_obs"></td>
                                        </tr>
                                        <tr>
                                            <td>¿Se necesitan ajustes para garantizar el acceso a la información?</td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_info_ajustes" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_info_ajustes" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_info_ajustes_obs"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="p-3 border-top bg-light">
                                <label class="form-label mb-2">Intensidad y duración del apoyo</label>
                                <div class="piar-intensidad-group">
                                    @foreach (['ninguno' => 'Ninguno', 'intermitente' => 'Intermitente', 'extenso' => 'Extenso', 'generalizado' => 'Generalizado', 'no_aplica' => 'No aplica'] as $val => $label)
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="vp_info_intensidad" id="vp_info_intensidad_{{ $val }}" value="{{ $val }}" required>
                                            <label class="form-check-label" for="vp_info_intensidad_{{ $val }}">{{ $label }}</label>
                                        </div>
                                    @endforeach
                                </div>
                            </div>
                        </div>
                    </div>
                    {{-- INTERACCIÓN SOCIAL --}}
                    <div class="card no-border-radio">
                        <div class="card-header text-center"><strong>DE INTERACCIÓN SOCIAL</strong></div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-bordered piar-valoracion-table mb-0">
                                    <thead>
                                        <tr>
                                            <th style="width:50%">Aspecto</th>
                                            <th class="text-center" style="width:12%">Respuesta</th>
                                            <th>¿Cuál? / Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>¿Requiere sistema de apoyo y ajustes para la regulación de su comportamiento?</td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_soc_apoyo_regulacion" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_soc_apoyo_regulacion" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_soc_apoyo_regulacion_obs"></td>
                                        </tr>
                                        <tr>
                                            <td>¿Se necesitan ajustes para garantizar la interacción con sus pares y maestros?</td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_soc_ajustes_interaccion" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_soc_ajustes_interaccion" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_soc_ajustes_interaccion_obs"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="p-3 border-top bg-light">
                                <label class="form-label mb-2">Intensidad y duración del apoyo</label>
                                <div class="piar-intensidad-group">
                                    @foreach (['ninguno' => 'Ninguno', 'intermitente' => 'Intermitente', 'extenso' => 'Extenso', 'generalizado' => 'Generalizado', 'no_aplica' => 'No aplica'] as $val => $label)
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="vp_soc_intensidad" id="vp_soc_intensidad_{{ $val }}" value="{{ $val }}" required>
                                            <label class="form-check-label" for="vp_soc_intensidad_{{ $val }}">{{ $label }}</label>
                                        </div>
                                    @endforeach
                                </div>
                            </div>
                        </div>
                    </div>
                    {{-- ACADÉMICO – PEDAGÓGICO --}}
                    <div class="card no-border-radio">
                        <div class="card-header text-center"><strong>ACADÉMICO - PEDAGÓGICO</strong></div>
                        <div class="card-body p-0">
                            <div class="px-3 pt-3">
                                <p class="text-muted small mb-0">
                                    Esta información se recogerá y fortalecerá con base en la observación durante los primeros tres meses del ingreso al establecimiento educativo.
                                </p>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-bordered piar-valoracion-table mb-0">
                                    <thead>
                                        <tr>
                                            <th style="width:50%">Aspecto</th>
                                            <th class="text-center" style="width:12%">Respuesta</th>
                                            <th>¿Cuál? / Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>¿Requiere ajustes en los tiempos de permanencia en establecimiento educativo?</td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_acad_ajustes_permanencia" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_acad_ajustes_permanencia" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_acad_ajustes_permanencia_obs"></td>
                                        </tr>
                                        <tr>
                                            <td>¿Requiere ajustes en los tiempos dedicados a una actividad?</td>
                                            <td>
                                                <table class="table table-no-border piar-valoracion-table mb-0">
                                                    <tr>
                                                        <td><input type="radio" value="Si" class="form-check-input" name="vp_acad_ajustes_tiempos" required> Si</td>
                                                        <td><input type="radio" value="No" class="form-check-input" name="vp_acad_ajustes_tiempos" required> No</td>
                                                    </tr>
                                                </table>
                                            </td>
                                            <td><input type="text" class="form-control form-control-sm" name="vp_acad_ajustes_tiempos_obs"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="p-3 border-top bg-light">
                                <label class="form-label mb-2">Intensidad y duración del apoyo</label>
                                <div class="piar-intensidad-group">
                                    @foreach (['ninguno' => 'Ninguno', 'intermitente' => 'Intermitente', 'extenso' => 'Extenso', 'generalizado' => 'Generalizado', 'no_aplica' => 'No aplica'] as $val => $label)
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="vp_acad_intensidad" id="vp_acad_intensidad_{{ $val }}" value="{{ $val }}" required>
                                            <label class="form-check-label" for="vp_acad_intensidad_{{ $val }}">{{ $label }}</label>
                                        </div>
                                    @endforeach
                                </div>
                            </div>
                        </div>
                    </div>
                    {{-- OBSERVACIONES GENERALES --}}
                    <div class="card no-border-radio">
                        <div class="card-header"><strong>OBSERVACIONES</strong></div>
                        <div class="card-body">
                            <textarea required class="form-control" rows="4" name="vp_observaciones" placeholder="Registre observaciones adicionales sobre la valoración pedagógica"></textarea>
                        </div>
                    </div>

                    @php
                        $competenciasLectoras = [
                            'Se encuentra en etapa de garabateo',
                            'Respeta límites en el coloreado',
                            'Realiza líneas horizontales, verticales, círculos',
                            'Maneja el renglón para escribir sus trazos',
                            'Realiza la escritura de vocales',
                            'Realiza la escritura de consonantes',
                            'Realiza la escritura de palabras (describa si son monosílabas, bisílabas, etc.)',
                            'Realiza la escritura de frases',
                            'Presenta errores de omisión, sustitución, escritura en espejo u otro tipo de errores (describa)',
                            'Toma dictado de palabras, frases, textos (describa cuál)',
                            'Transcribe un texto (describa si solo palabras, frase o texto)',
                            'Produce un texto corto con coherencia',
                            'Lee e identifica las vocales',
                            'Lee e identifica las consonantes',
                            'Lee palabras, frases, texto (describa)',
                            'Comprende la palabra que lee y la asocia a la imagen',
                            'Comprende estructuras de texto más complejas como frase, texto sencillo',
                            'Describa otros factores que pueden involucrar la escritura, lectura y comprensión',
                        ];

                        $competenciasLogicoMatematicas = [
                            'Identifica nociones de cantidad poco-muchos, menos-más',
                            'Identifica nociones de espacio arriba-abajo, adelante-atrás y tiempo día-noche',
                            'Identifica nociones de tamaño',
                            'Identifica colores, formas, figuras',
                            'num_rango',
                            'Cuenta una serie numérica empezando por cualquier número dado',
                            'Puede contar de forma ascendente y descendente',
                            'Identifica el número que va antes y después de un número dado',
                            'Toma dictado de números de una serie numérica dada',
                            'Identifica los signos de operaciones matemáticas',
                            'Realiza operaciones matemáticas (describa cuáles y con cuántos dígitos)',
                            'Ubica espacialmente de manera correcta una operación matemática',
                            'Identifica qué es una unidad, decena, centena (describa hasta dónde)',
                            'Comprende y resuelve problemas matemáticos sencillos o complejos (describa)',
                            'Identifica los sistemas de medición acordes a su edad (describa: centímetros, metros, kilo, etc.)',
                            'Reconoce monedas y billetes',
                            'Hace cálculos mentales sencillos o complejos',
                            'Identifica el reloj y sabe leer la hora',
                            'Describa otras habilidades que no estén en este apartado',
                        ];

                        $memoria = [
                            'Recuerda hechos pasados, por ejemplo situaciones familiares (memoria episódica)',
                            'Recuerda datos u otro tipo de información como la que aprende en colegio (memoria semántica)',
                            'Recuerda habilidades y destrezas que se activan de manera automática, por ejemplo montar bicicleta (memoria procedimental)',
                            'La entrada de información se produce más por el canal auditivo (memoria no verbal)',
                            'La entrada de información se produce más por el canal visual (memoria verbal o visual)',
                            'Tiene la capacidad de retener información en la mente y la va utilizando para desarrollar cierta tarea (memoria a corto plazo)',
                            'Tiene la capacidad de recordar información que necesitamos recuperar a largo plazo (memoria a largo plazo)',
                        ];

                        $atencion = [
                            'Puede atender a un estímulo de principio a fin (atención sostenida)',
                            'Puede escoger el estímulo al cual atender de dos o más estímulos (atención selectiva)',
                            'Puede atender a varios estímulos a la vez (atención dividida)',
                            'ate_tiempo',
                        ];

                        $percepcion = [
                            'Tiene la habilidad para dibujar líneas rectas, curvas con precisión de acuerdo a los límites visuales presentados (coordinación ojo-mano)',
                            'Tiene la habilidad para ver figuras específicas cuando están ocultas por un fondo confuso y complejo (figura-fondo)',
                            'Tiene la habilidad para unir puntos y reproducir patrones presentados visualmente (relación espacial)',
                            'Tiene la habilidad para decir cuándo dos o más sonidos son similares o diferentes',
                            'Tiene la habilidad para reconocer patrones auditivos de duración, frecuencia, intensidad y timbre',
                        ];

                        $funcionesEjecutivas = [
                            'Organiza su tiempo para poder cumplir con las tareas escolares',
                            'Es flexible ante los cambios y los imprevistos',
                            'Planifica sus actividades día tras día y se ajusta a lo que ha programado',
                            'Considera diversas rutas para resolver una tarea y elige la más adecuada',
                            'Contempla diversas posibilidades para enfrentar una actividad y se acomoda a cualquiera, si la que quiere poner en práctica no se puede implementar',
                            'Tiene adecuadas estrategias de monitoreo y seguimiento de sus acciones, y reconoce cuándo debe modificar lo planeado si no está alcanzando la meta propuesta',
                        ];

                        $lenguajeComunicacion = [
                            'Puede comunicarse con otros por vía oral o por otras vías (lengua de señas, tableros de apoyo, etc.)',
                            'Es capaz de seguir el hilo de las conversaciones',
                            'Expresa sus ideas con frases gramaticalmente correctas',
                            'Busca hacerse entender en cuanto a lo que requiere o necesita',
                            'Describe acontecimientos familiares o experiencias cotidianas, relacionados con lo que se está hablando',
                            'Actúa de forma interesada cuando otros le hablan (escucha y responde, deja lo que está haciendo y atiende al otro, se excusa si debe continuar con su trabajo, pero manifiesta estar oyendo lo que le preguntan o plantean, etc.)',
                            'Interpreta adecuadamente dobles sentidos (refranes, frases hechas, dichos populares, metáforas, etc.). Por ejemplo, ante una frase como «no des papaya» o «eres un sapo», el estudiante reconoce el significado que le quieren compartir',
                            'Tiene un sentido del humor apropiado para su edad. Utiliza bromas en las conversaciones y comprende las bromas de otros',
                            'Es recíproco en los intercambios comunicativos con otras personas (espera su turno para dar su opinión, muestra interés en el punto de vista del otro, reconoce los cambios de tema y se acopla a ellos sin dificultad, acompaña sus comentarios de gestos y emociones acordes con lo que dice, reconoce los gestos emocionales de otros, etc.)',
                            'Su estilo de conversación parece extraño (es demasiado formal, utiliza un vocabulario rebuscado, sus frases suenan demasiado elaboradas, no emplea expresiones coloquiales)',
                        ];
                    @endphp

                    {{-- COMPETENCIAS LECTORAS Y ESCRITURALES --}}
                    <div class="card no-border-radio mt-4">
                        <div class="card-header text-center"><strong>COMPETENCIAS LECTORAS Y ESCRITURALES DE 2 A 6 AÑOS</strong></div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-bordered piar-valoracion-table mb-0">
                                    <thead>
                                        <tr>
                                            <th style="width:5%">#</th>
                                            <th style="width:50%">Aspecto</th>
                                            <th class="text-center" style="width:12%">Respuesta</th>
                                            <th>Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach ($competenciasLectoras as $i => $texto)
                                            <tr>
                                                <td class="text-center">{{ $i + 1 }}</td>
                                                <td>{{ $texto }}</td>
                                                <td>
                                                    <table class="table table-no-border piar-valoracion-table mb-0">
                                                        <tr>
                                                            <td><input type="radio" value="Si" class="form-check-input" name="cle_{{ $i + 1 }}" required> Si</td>
                                                            <td><input type="radio" value="No" class="form-check-input" name="cle_{{ $i + 1 }}" required> No</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td><input type="text" class="form-control form-control-sm" name="cle_{{ $i + 1 }}_obs"></td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                            <div class="p-3 border-top">
                                <label class="form-label">Observaciones</label>
                                <textarea class="form-control" rows="3" name="cle_observaciones" required></textarea>
                            </div>
                        </div>
                    </div>
                    {{-- COMPETENCIAS LÓGICO MATEMÁTICAS --}}
                    <div class="card no-border-radio">
                        <div class="card-header text-center"><strong>COMPETENCIAS LÓGICO MATEMÁTICAS DE 2 A 6 AÑOS</strong></div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-bordered piar-valoracion-table mb-0">
                                    <thead>
                                        <tr>
                                            <th style="width:5%">#</th>
                                            <th style="width:50%">Aspecto</th>
                                            <th class="text-center" style="width:12%">Respuesta</th>
                                            <th>Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach ($competenciasLogicoMatematicas as $i => $texto)
                                            <tr>
                                                <td class="text-center">{{ $i + 1 }}</td>
                                                @if ($texto === 'num_rango')
                                                    <td>Identifica los números del <input type="text" class="form-control form-control-sm d-inline-block" style="width:70px" name="clm_5_desde" required> al <input type="text" class="form-control form-control-sm d-inline-block" style="width:70px" name="clm_5_hasta" required></td>
                                                @else
                                                    <td>{{ $texto }}</td>
                                                @endif
                                                <td>
                                                    <table class="table table-no-border piar-valoracion-table mb-0">
                                                        <tr>
                                                            <td><input type="radio" value="Si" class="form-check-input" name="clm_{{ $i + 1 }}" required> Si</td>
                                                            <td><input type="radio" value="No" class="form-check-input" name="clm_{{ $i + 1 }}" required> No</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td><input type="text" class="form-control form-control-sm" name="clm_{{ $i + 1 }}_obs"></td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                            <div class="p-3 border-top">
                                <label class="form-label">Observaciones</label>
                                <textarea class="form-control" rows="3" name="clm_observaciones" required></textarea>
                            </div>
                        </div>
                    </div>
                    {{-- DISPOSITIVOS BÁSICOS DE APRENDIZAJE --}}
                    <div class="card no-border-radio">
                        <div class="card-header text-center"><strong>DISPOSITIVOS BÁSICOS DE APRENDIZAJE</strong></div>
                        <div class="card-body p-0">

                            {{-- Memoria --}}
                            <div class="px-3 py-2 bg-light border-bottom"><strong>MEMORIA</strong></div>
                            <div class="table-responsive">
                                <table class="table table-bordered piar-valoracion-table mb-0">
                                    <thead>
                                        <tr>
                                            <th style="width:5%">#</th>
                                            <th style="width:50%">Aspecto</th>
                                            <th class="text-center" style="width:12%">Respuesta</th>
                                            <th>Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach ($memoria as $i => $texto)
                                            <tr>
                                                <td class="text-center">{{ $i + 1 }}</td>
                                                <td>{{ $texto }}</td>
                                                <td>
                                                    <table class="table table-no-border piar-valoracion-table mb-0">
                                                        <tr>
                                                            <td><input type="radio" value="Si" class="form-check-input" name="dba_mem_{{ $i + 1 }}" required> Si</td>
                                                            <td><input type="radio" value="No" class="form-check-input" name="dba_mem_{{ $i + 1 }}" required> No</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td><input type="text" class="form-control form-control-sm" name="dba_mem_{{ $i + 1 }}_obs"></td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                            {{-- Atención --}}
                            <div class="px-3 py-2 bg-light border-bottom border-top"><strong>ATENCIÓN</strong></div>
                            <div class="table-responsive">
                                <table class="table table-bordered piar-valoracion-table mb-0">
                                    <thead>
                                        <tr>
                                            <th style="width:5%">#</th>
                                            <th style="width:50%">Aspecto</th>
                                            <th class="text-center" style="width:12%">Respuesta</th>
                                            <th>Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach ($atencion as $i => $texto)
                                            <tr>
                                                <td class="text-center">{{ $i + 1 }}</td>
                                                @if ($texto === 'ate_tiempo')
                                                    <td>Sus periodos de atención son de (indicar en tiempo: 5, 10, 15 o más de 20 minutos). Especifique:</td>
                                                @else
                                                    <td>{{ $texto }}</td>
                                                @endif
                                                <td>
                                                    <table class="table table-no-border piar-valoracion-table mb-0">
                                                        <tr>
                                                            <td><input type="radio" value="Si" class="form-check-input" name="dba_ate_{{ $i + 1 }}" required> Si</td>
                                                            <td><input type="radio" value="No" class="form-check-input" name="dba_ate_{{ $i + 1 }}" required> No</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td>
                                                    <input type="text" class="form-control form-control-sm" name="dba_ate_{{ $i + 1 }}_obs"
                                                        @if($texto === 'ate_tiempo') placeholder="Especifique tiempo (5, 10, 15 o más de 20 minutos)" required @endif>
                                                </td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                            {{-- Percepción --}}
                            <div class="px-3 py-2 bg-light border-bottom border-top"><strong>PERCEPCIÓN</strong></div>
                            <div class="table-responsive">
                                <table class="table table-bordered piar-valoracion-table mb-0">
                                    <thead>
                                        <tr>
                                            <th style="width:5%">#</th>
                                            <th style="width:50%">Aspecto</th>
                                            <th class="text-center" style="width:12%">Respuesta</th>
                                            <th>Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach ($percepcion as $i => $texto)
                                            <tr>
                                                <td class="text-center">{{ $i + 1 }}</td>
                                                <td>{{ $texto }}</td>
                                                <td>
                                                    <table class="table table-no-border piar-valoracion-table mb-0">
                                                        <tr>
                                                            <td><input type="radio" value="Si" class="form-check-input" name="dba_per_{{ $i + 1 }}" required> Si</td>
                                                            <td><input type="radio" value="No" class="form-check-input" name="dba_per_{{ $i + 1 }}" required> No</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td><input type="text" class="form-control form-control-sm" name="dba_per_{{ $i + 1 }}_obs"></td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                            {{-- Funciones ejecutivas --}}
                            <div class="px-3 py-2 bg-light border-bottom border-top">
                                <strong>FUNCIONES EJECUTIVAS</strong>
                                <small class="text-muted d-block">(planificación, organización, flexibilidad o cambio de criterio, anticipación, monitoreo y seguimiento)</small>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-bordered piar-valoracion-table mb-0">
                                    <thead>
                                        <tr>
                                            <th style="width:5%">#</th>
                                            <th style="width:50%">Aspecto</th>
                                            <th class="text-center" style="width:12%">Respuesta</th>
                                            <th>Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach ($funcionesEjecutivas as $i => $texto)
                                            <tr>
                                                <td class="text-center">{{ $i + 1 }}</td>
                                                <td>{{ $texto }}</td>
                                                <td>
                                                    <table class="table table-no-border piar-valoracion-table mb-0">
                                                        <tr>
                                                            <td><input type="radio" value="Si" class="form-check-input" name="dba_fe_{{ $i + 1 }}" required> Si</td>
                                                            <td><input type="radio" value="No" class="form-check-input" name="dba_fe_{{ $i + 1 }}" required> No</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td><input type="text" class="form-control form-control-sm" name="dba_fe_{{ $i + 1 }}_obs"></td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                            {{-- Lenguaje y comunicación --}}
                            <div class="px-3 py-2 bg-light border-bottom border-top"><strong>LENGUAJE Y COMUNICACIÓN</strong> <small class="text-muted">— El estudiante:</small></div>
                            <div class="table-responsive">
                                <table class="table table-bordered piar-valoracion-table mb-0">
                                    <thead>
                                        <tr>
                                            <th style="width:5%">#</th>
                                            <th style="width:50%">Aspecto</th>
                                            <th class="text-center" style="width:12%">Respuesta</th>
                                            <th>Observación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach ($lenguajeComunicacion as $i => $texto)
                                            <tr>
                                                <td class="text-center">{{ $i + 1 }}</td>
                                                <td>{{ $texto }}</td>
                                                <td>
                                                    <table class="table table-no-border piar-valoracion-table mb-0">
                                                        <tr>
                                                            <td><input type="radio" value="Si" class="form-check-input" name="dba_lc_{{ $i + 1 }}" required> Si</td>
                                                            <td><input type="radio" value="No" class="form-check-input" name="dba_lc_{{ $i + 1 }}" required> No</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td><input type="text" class="form-control form-control-sm" name="dba_lc_{{ $i + 1 }}_obs"></td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    {{-- DESCRIPCIÓN DE HABILIDADES Y DESTREZAS --}}
                    <div class="card no-border-radio mt-4">
                        <div class="card-header"><strong>DESCRIPCIÓN DE HABILIDADES Y DESTREZAS DEL ESTUDIANTE</strong></div>
                        <div class="card-body">
                            <p class="text-muted small">
                                Este apartado tiene como propósito identificar y describir las habilidades y destrezas que posee el estudiante en las
                                diferentes áreas de desarrollo, resaltando sus fortalezas, capacidades y potencial de aprendizaje. Esta información orienta
                                la implementación de estrategias pedagógicas y apoyos que favorezcan su proceso educativo y participación en el aula.
                            </p>
                            <textarea required class="form-control" rows="6" name="habilidades_destrezas" placeholder="Describa las habilidades y destrezas del estudiante"></textarea>
                        </div>
                    </div>
                    {{-- ESTRATEGIAS Y/O ACCIONES A DESARROLLAR CON EL ESTUDIANTE --}}
                    <div class="card no-border-radio mt-4">
                        <div class="card-header"><strong>ESTRATEGIAS Y/O ACCIONES A DESARROLLAR CON EL ESTUDIANTE</strong></div>
                        <div class="card-body">
                            <p class="text-muted small">
                                En este apartado se registran las estrategias, actividades, ajustes y apoyos que se desarrollarán con el estudiante para
                                fortalecer sus procesos académicos, sociales, comunicativos y comportamentales. Estas acciones buscan responder a sus
                                necesidades educativas y potenciar sus habilidades, favoreciendo su participación activa y aprendizaje significativo.
                            </p>
                            <textarea required class="form-control" rows="6" name="estrategias_acciones" placeholder="Describa las estrategias y acciones a desarrollar con el estudiante"></textarea>
                        </div>
                    </div>
                </form>
            </div>

            {{-- PASO 6: Ajustes Razonables --}}
            <div class="piar-pane active card-item" data-pane="6">
                <div class="piar-pane-title">
                    <div class="piar-pane-icon" style="background:#ECFDF5;color:#059669">
                        <i class="fas fa-cogs"></i>
                    </div>
                    <div>
                        <h3>AJUSTES RAZONABLES</h3>
                        <p>Por favor, complete los siguientes datos para los ajustes razonables del estudiante</p>
                    </div>
                </div>
                <form id="form-paso-6">
                    @csrf
                    <input type="hidden" name="id_estudiante" value="{{ $estudiante?->id }}">
                    <input type="hidden" name="id_docente" value="{{ $docente_diligencia?->id }}">
                    <div style="margin-right: 20px;">
                        <table class="table table-bordered piar-valoracion-table mb-0">
                            <thead>
                                <tr>
                                    <th class="text-center" style="position: relative;" height="50px" colspan="6">
                                        Ajustes Razonables
                                        <div id="btnAgregarAjuste">
                                            <button type="button" class="btn btn-success btn-sm" onclick="agregarAjuste()"><i class="fas fa-plus"></i> Añadir ajuste</button>
                                        </div>
                                    </th>
                                </tr>
                                <tr>
                                    <th class="text-center" style="width:10%">
                                        Área/asignatura/
                                        campo de pensamiento/
                                        área de
                                        desarrollo
                                        /dimensiones/articulación
                                        con la educación media/
                                        /dinámicas de la vida
                                        diaria/convivencia
                                        otra según sea el caso
                                    </th>
                                    <th class="text-center">
                                        Barreras identificadas en
                                        el contexto
                                        Describir <br>
                                        <span class="text-muted small">
                                            Actitudinales, tecnológicas,
                                            comunicativas, metodológicas,
                                            infraestructura, entre otras.
                                        </span> 
                                    </th>
                                    <th class="text-center">
                                        Tipo de ajuste
                                        razonable -
                                        facilitador <br>
                                        <span class="text-muted small">
                                            (Recursos o materiales, didácticas
                                            o de estrategias, tiempo, metas de
                                            aprendizaje, estrategias de
                                            evaluación, infraestructura)
                                        </span>
                                    </th>
                                    <th class="text-center">
                                        Apoyo requerido <br>
                                        <span class="text-muted small">
                                            (Talento humano, técnico,
                                            tecnológico, comunicativo, otro)
                                        </span>
                                    </th>
                                    <th class="text-center">
                                        Descripción de tipo de ajustes
                                        y apoyos <br>
                                        <span class="text-muted small">
                                            Si el ajuste se realiza en la meta de
                                            aprendizaje, escribir la nueva meta que
                                            corresponde para el actual periodo según el
                                            plan de estudios.
                                            Incluir la frecuencia del ajuste y del
                                            apoyo.
                                        </span>
                                    </th>
                                    <th class="text-center">
                                        Seguimiento
                                        <br>
                                        <span class="text-muted small">
                                            En clave de temporalidad, responsable y
                                            medios de seguimiento.
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody id="ajustes_container">
                                <tr id="ajuste_1">
                                    <td>
                                        <input type="text" class="form-control" name="ajuste_razonable[0][area]" required>
                                    </td>
                                    <td>
                                        <textarea rows="3" class="form-control auto-grow" name="ajuste_razonable[0][barrera]" required></textarea>
                                    </td>   
                                    <td>
                                        <textarea rows="3" class="form-control auto-grow" name="ajuste_razonable[0][tipo]" required></textarea>
                                    </td>
                                    <td>
                                        <textarea rows="3" class="form-control auto-grow" name="ajuste_razonable[0][apoyo]" required></textarea>
                                    </td>
                                    <td>
                                        <textarea rows="3" class="form-control auto-grow" name="ajuste_razonable[0][descripcion]" required></textarea>
                                    </td>
                                    <td>
                                        <textarea rows="3" class="form-control auto-grow" style="resize: none; overflow: hidden;" name="ajuste_razonable[0][seguimiento]" required></textarea>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {{-- Docentes --}}
                    <div class="d-flex justify-content-end align-items-end py-3">
                        <button type="button" style="width: 200px;" class="btn btn-success" onclick="agregarFirmaDocente()"><i class="fas fa-plus"></i> Añadir firma docente</button>
                    </div>
                    <div class="row mt-3" id="div_docentes">
                        <div class="col-md-4 pt-3" id="div_docente_1">
                            <table class="table table-bordered piar-valoracion-table mb-0">
                                <thead>
                                    <tr><th>Nombre Docente</th></tr>
                                    <tr><td><input type="text" class="form-control" name="docente_nombre_ar[]"></td></tr>
                                    <tr><th>Área</th></tr>
                                    <tr><td><input type="text" class="form-control" name="docente_area_ar[]"></td></tr>
                                    <tr><th>Firma</th></tr>
                                    <tr>
                                        <td class="d-flex justify-content-between align-items-center gap-2">
                                            <input onchange="previewFirma('input_firma_docente_1', 'img_firma_docente_1')" id="input_firma_docente_1" type="file" style="display: none;" class="form-control" name="docente_firma_ar[]" accept="image/*">
                                            <button type="button" class="btn btn-primary btn-sm" onclick="agregarFirma('input_firma_docente_1')"><i class="fas fa-plus"></i> Añadir firma</button>
                                            <img id="img_firma_docente_1" class="firma-img" src="{{ asset('assets/images/firma.png') }}" alt="Firma" class="img-fluid">
                                        </td>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                    </div>
                    <div class="row mt-3" id="div_docentes_2">
                        <div class="col-md-4 pt-3" id="div_docente_1">
                            <table class="table table-bordered piar-valoracion-table mb-0">
                                <thead>
                                    <tr><th>Nombre docente orientador</th></tr>
                                    <tr><td><input type="text" class="form-control" name="docente_orientador_nombre_ar"></td></tr>
                                    <tr><th>Área</th></tr>
                                    <tr><td><input type="text" class="form-control" name="docente_orientador_area_ar"></td></tr>
                                    <tr><th>Firma</th></tr>
                                    <tr>
                                        <td class="d-flex justify-content-between align-items-center gap-2">
                                            <input onchange="previewFirma('input_firma_docente_orientador', 'img_firma_docente_orientador')" id="input_firma_docente_orientador" type="file" style="display: none;" class="form-control" name="docente_orientador_firma_ar[]" accept="image/*">
                                            <button type="button" class="btn btn-primary btn-sm" onclick="agregarFirma('input_firma_docente_orientador')"><i class="fas fa-plus"></i> Añadir firma</button>
                                            <img id="img_firma_docente_orientador" class="firma-img" src="{{ asset('assets/images/firma.png') }}" alt="Firma" class="img-fluid">
                                        </td>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                        <div class="col-md-4 pt-3" id="div_docente_1">
                            <table class="table table-bordered piar-valoracion-table mb-0">
                                <thead>
                                    <tr><th>Nombre docente de apoyo pedagógico</th></tr>
                                    <tr><td><input type="text" class="form-control" name="docente_apoyo_pedagogico_nombre_ar"></td></tr>
                                    <tr><th>Área</th></tr>
                                    <tr><td><input type="text" class="form-control" name="docente_apoyo_pedagogico_area_ar"></td></tr>
                                    <tr><th>Firma</th></tr>
                                    <tr>
                                        <td class="d-flex justify-content-between align-items-center gap-2">
                                            <input onchange="previewFirma('input_firma_docente_apoyo_pedagogico', 'img_firma_docente_apoyo_pedagogico')" id="input_firma_docente_apoyo_pedagogico" type="file" style="display: none;" class="form-control" name="docente_apoyo_pedagogico_firma_ar[]" accept="image/*">
                                            <button type="button" class="btn btn-primary btn-sm" onclick="agregarFirma('input_firma_docente_apoyo_pedagogico')"><i class="fas fa-plus"></i> Añadir firma</button>
                                            <img id="img_firma_docente_apoyo_pedagogico" class="firma-img" src="{{ asset('assets/images/firma.png') }}" alt="Firma" class="img-fluid">
                                        </td>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                        <div class="col-md-4 pt-3" id="div_docente_1">
                            <table class="table table-bordered piar-valoracion-table mb-0">
                                <thead>
                                    <tr><th>Nombre coordinador pedagógico</th></tr>
                                    <tr><td><input type="text" class="form-control" name="coordinador_pedagogico_nombre_ar"></td></tr>
                                    <tr><th>Área</th></tr>
                                    <tr><td><input type="text" class="form-control" name="coordinador_pedagogico_area_ar"></td></tr>
                                    <tr><th>Firma</th></tr>
                                    <tr>
                                        <td class="d-flex justify-content-between align-items-center gap-2">
                                            <input onchange="previewFirma('input_firma_coordinador_pedagogico', 'img_firma_coordinador_pedagogico')" id="input_firma_coordinador_pedagogico" type="file" style="display: none;" class="form-control" name="coordinador_pedagogico_firma_ar[]" accept="image/*">
                                            <button type="button" class="btn btn-primary btn-sm" onclick="agregarFirma('input_firma_coordinador_pedagogico')"><i class="fas fa-plus"></i> Añadir firma</button>
                                            <img id="img_firma_coordinador_pedagogico" class="firma-img" src="{{ asset('assets/images/firma.png') }}" alt="Firma" class="img-fluid">
                                        </td>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                    </div>
                </form>
            </div>

            {{-- PASO 7: Acta de acuerdo --}}
            <div class="piar-pane card-item" data-pane="7">
                <div class="piar-pane-title">
                    <div class="piar-pane-icon" style="background:#ECFDF5;color:#059669">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div>
                        <h3>ACTA DE ACUERDO</h3>
                        <p>Por favor, complete los siguientes datos para la acta de acuerdo del estudiante</p>
                    </div>
                </div>

                {{-- Datos administrativos --}}
                <div class="card mb-3">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-bordered piar-valoracion-table piar-acta-table mb-0">
                                <thead>
                                    <tr>
                                        <th colspan="2" class="piar-acta-title text-center">Acta de acuerdo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Fecha y lugar de diligenciamiento</td>
                                        <td>
                                            <div class="row g-2">
                                                <div class="col-md-4">
                                                    <input type="date" class="form-control form-control-sm" name="acta_fecha" value="{{ date('Y-m-d') }}">
                                                </div>
                                                <div class="col-md-8">
                                                    <input type="text" class="form-control form-control-sm" name="acta_lugar" placeholder="Lugar de diligenciamiento">
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Nombre y rol de la persona que diligencia</td>
                                        <td><input type="text" class="form-control form-control-sm" name="acta_persona_diligencia"></td>
                                    </tr>
                                    <tr>
                                        <td>Institución educativa</td>
                                        <td><input type="text" class="form-control form-control-sm" name="acta_institucion"></td>
                                    </tr>
                                    <tr>
                                        <td>Sede</td>
                                        <td><input type="text" class="form-control form-control-sm" name="acta_sede"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {{-- Datos del estudiante --}}
                <div class="card mb-3">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-bordered piar-valoracion-table piar-acta-table mb-0">
                                <tbody>
                                    <tr>
                                        <td style="width:12%">Nombre</td>
                                        <td><input type="text" class="form-control form-control-sm" name="acta_estudiante_nombre"></td>
                                        <td style="width:8%">Edad</td>
                                        <td style="width:12%"><input type="number" class="form-control form-control-sm" name="acta_estudiante_edad"></td>
                                        <td style="width:10%">Grado</td>
                                        <td style="width:15%"><input type="text" class="form-control form-control-sm" name="acta_estudiante_grado"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {{-- Texto introductorio --}}
                <div class="piar-acta-texto mb-4">
                    <p>
                        Según el Decreto 1421 de 2017 la educación inclusiva es un proceso permanente que reconoce, valora y responde a la diversidad de características, intereses, posibilidades y expectativas de los estudiantes para promover su desarrollo, aprendizaje y participación, en un ambiente de aprendizaje común, sin discriminación o exclusión.
                    </p>
                    <p>
                        La inclusión solo es posible cuando se unen los esfuerzos del colegio, el estudiante, docentes, directivos docentes y familias. De ahí la importancia de formalizar con las firmas, la presente Acta de Acuerdo.
                    </p>
                    <p>
                        <strong>El Establecimiento Educativo</strong> ha realizado la valoración pedagógica y definido los ajustes razonables que facilitarán al estudiante su proceso educativo.
                    </p>
                    <p>
                        <strong>La Familia se compromete</strong> a cumplir y firmar los compromisos señalados en el PIAR y en las actas de acuerdo, para fortalecer los procesos escolares del estudiante y en particular a:
                    </p>
                </div>

                {{-- Compromisos específicos --}}
                <div class="card">
                    <div class="card-body">
                        <p class="text-muted small mb-2">
                            Incluya aquí los compromisos específicos para implementar en el aula que requieran ampliación o detalle adicional al incluido en el PIAR
                        </p>
                        <textarea class="form-control" rows="8" name="acta_compromisos"></textarea>
                    </div>
                </div>

                <div class="piar-acta-texto mb-4 mt-4">
                    <div class="d-flex justify-content-between py-2 align-items-center gap-2">
                        <p> Y en casa apoyará con las siguientes actividades:</p>
                        <button type="button" class="btn btn-success btn-sm" onclick="agregarActividad()"><i class="fas fa-plus"></i> Añadir actividad</button>
                    </div>
                    <table class="table table-bordered piar-valoracion-table mb-0">
                        <thead>
                            <tr>
                                <th class="text-center">Nombre de la Actividad</th>
                                <th class="text-center">Descripción de la estrategia</th>
                                <th class="text-center">
                                    Frecuencia: D=Diaria, S=Semanal, P=Permanente
                                </th>
                                <th class="text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="actividades_container">
                            <tr id="actividad_1">
                                <td><input type="text" class="form-control" name="actividad_nombre_1"></td>
                                <td><input type="text" class="form-control" name="actividad_descripcion_1"></td>
                                <td style="width: 20%">
                                    <div class="d-flex justify-content-between align-items-center gap-2">
                                        <div class="frecuencia-radio">
                                            <input type="radio" name="actividad_frecuencia_1" value="D">
                                            <label class="form-check-label">D</label>
                                        </div>
                                        <div class="frecuencia-radio">
                                            <input type="radio" name="actividad_frecuencia_1" value="S">
                                            <label class="form-check-label">S</label>
                                        </div>
                                        <div class="frecuencia-radio">
                                            <input type="radio" name="actividad_frecuencia_1" value="P">
                                            <label class="form-check-label">P</label>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {{-- Footer navegación --}}
        <div class="piar-footer">
            <button type="button" class="btn btn-piar-outline" id="btnAnterior" style="visibility:hidden">
                <i class="fas fa-chevron-left me-1"></i> Anterior
            </button>
            <span class="piar-step-counter">Paso <span id="contadorActual">1</span> de 7</span>
            <button type="button" class="btn btn-piar-next" id="btnSiguiente">
                Siguiente <i class="fas fa-chevron-right ms-1"></i>
            </button>
            <button type="submit" class="btn btn-piar-save" id="btnGuardar" style="display:none">
                <i class="fas fa-save me-1"></i> Guardar PIAR
            </button>
        </div>
    </div>
@endsection

@push('scripts')
<script>
    const URL_PIAR = "{{ route('admin.piar') }}";
</script>

<script src="{{ asset('assets/js/estudiantes/piar.js') }}"></script>
@endpush
