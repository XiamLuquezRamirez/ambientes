<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 130px 40px 40px 40px;
        }

        .contenido {
            margin-top: 20px !important;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
        }

        header {
            position: fixed;
            top: -100px;
            left: 0;
            right: 0;
            height: 80px !important;
            text-align: center;
            padding-top: 10px;
        }

        footer {
            position: fixed;
            bottom: -20px;
            left: 0;
            right: 0;
            text-align: center;
        }

        header img {
            width: 80% !important;
            height: auto !important;
        }

        footer img {
            width: 80% !important;
            height: auto !important;
        }

        .contenido {
            width: 100%;
        }

        .page-break {
            page-break-after: always;
        }

        .table-th-azul {
            background-color: #1f4e79;
            color: #fff;
        }

        .table-th-gris {
            background-color: #f2f2f2;
            color: #3c3c3c;
            font-weight: bold;
        }

        .border-top-none td {
            border-top: none !important;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
        }

        .table tbody tr td, .table thead tr th {
            border: 1px solid #000;
            padding: 1px;
            padding-left: 5px;
            padding-right: 5px;
        }
        
        .p_subrayado {
            text-decoration: underline;
        }

        .texto-pequeno {
            font-size: 8px !important;
        }

        .capitalize {
            text-transform: capitalize !important;
        }

        .table {
            width: 100%;
            max-width: 100%;
        }

        td, th {
            white-space: normal;
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-word;
        }

        .index-bajo {
            z-index: -1;
        }

        .index-alto {
            z-index: 1000;
            font-size: 27px;
            position: absolute;
            width: 100%;
            height: 100%;
            left: 0px;
            top: -12px;
            display: flex;
            justify-content: center;
            align-items: center;
            color:rgb(94, 94, 94);
        }

        .casilla {
            position: relative;
            width: 30px;
            height: 30px;
            text-align: center;
            vertical-align: middle;
            font-size: 12px;
        }

    </style>
</head>
<body>
    <header>
        <img src="{{ public_path('assets/images/encabezado.png') }}">
    </header>

    <footer>
        <img src="{{ public_path('assets/images/pie.png') }}">
    </footer>

    <div class="contenido" style="margin: 10px;">
        <table class="table">
            <thead>
                <tr>
                    <th class="table-th-azul" colspan="2" style="font-size: 15px;">PLAN INDIVIDUAL DE AJUSTES RAZONABLES</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="table-th-gris" style="width: 50%;">
                        <strong>Fecha y lugar de Diligenciamiento</strong>
                    </td>
                    <td style="width: 50%;">
                        
                    </td>
                </tr>
                <tr>
                    <td class="table-th-gris" style="width: 50%;">
                        <strong>Nombre y rol de la persona que diligencia</strong>
                    </td>
                    <td style="width: 50%;">
                        
                    </td>
                </tr>
                <tr>
                    <td class="table-th-gris" style="width: 50%;">
                        <strong>Institución Educativa</strong>
                    </td>
                    <td style="width: 50%;">
                        
                    </td>
                </tr>
            </tbody>
        </table>
        <div class="container" style="margin-top: 20px; width: 100%;">
            <label><strong>1. Información general del estudiante</strong></label>
            <table class="table" style="margin-top: 10px;">
                <tbody>
                    <tr>
                        <td class="table-th-gris">
                            Nombres
                        </td>
                        <td class="table-th-gris">
                            Apellidos
                        </td>
                        <td class="table-th-gris">
                            Tipo Identificación
                        </td>
                        <td class="table-th-gris">
                            No. de identificación
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label class="capitalize">{{ $piar->estudiante->nombre }}</label>
                        </td>
                        <td>
                            <label class="capitalize">{{ $piar->estudiante->apellido }}</label>
                        </td>
                        <td>
                            TI. {!! $piar->estudiante->tipo_identificacion == 'TI' ? '<span class="p_subrayado">X</span>' : '__' !!} C.C. {!! $piar->estudiante->tipo_identificacion == 'C.C.' ? '<span class="p_subrayado">X</span>' : '__' !!} C.E. {!! $piar->estudiante->tipo_identificacion == 'C.E.' ? '<span class="p_subrayado">X</span>' : '__' !!} R.C. {!! $piar->estudiante->tipo_identificacion == 'R.C.' ? '<span class="p_subrayado">X</span>' : '__' !!} P.A. {!! $piar->estudiante->tipo_identificacion == 'P.A.' ? '<span class="p_subrayado">X</span>' : '__' !!}
                        </td>
                        <td>
                            {{ $piar->estudiante->identificacion }}
                        </td>
                    </tr>
            </table>
            <table class="table border-top-none">
                <tbody>
                    <tr>
                        <td class="table-th-gris">
                            Lugar de nacimiento
                        </td>
                        <td class="table-th-gris">
                           Edad
                        </td>
                        <td class="table-th-gris">
                            Fecha de nacimiento
                        </td>
                        <td class="table-th-gris">
                            Grado actual o al que ingresa
                        </td>
                        <td class="table-th-gris texto-pequeno">
                            El año anterior estuvo vinculado(a) al Sistema Educativo
                        </td>
                    </tr>
                    <tr>
                        <td style="width: 120px;">
                            <label class="capitalize">{{ $piar->estudiante->lugar_nacimiento }}</label>
                        </td>
                        <td style="width: 100px;">
                            <label class="capitalize">{{ $piar->estudiante->edad }} años</label>
                        </td>
                        <td style="width: 150px;">
                            <label class="capitalize">{{ $piar->estudiante->fecha_nacimiento }}</label>
                        </td>
                        <td style="width: 150px;">
                            <label class="capitalize">{{ $piar->estudiante->grado->nombre }}</label>
                        </td>
                        <td>
                            Si  {!! $piar->datosGenerales->vinculado == 'Si' ? '<span class="p_subrayado">X</span>' : '__' !!} No {!! $piar->datosGenerales->vinculado == 'No' ? '<span class="p_subrayado">X</span>' : '__' !!}
                        </td>
                    </tr>
                </tbody>
            </table>
            <table class="table border-top-none">
                <tbody>
                    <tr>
                        <td class="table-th-gris" style="width: 16.66%;">
                            Departamento donde vive
                        </td>
                        <td style="width: 16.66%;">
                           <label class="capitalize">{{ $piar->estudiante->departamento->descripcion }}</label>
                        </td>
                        <td class="table-th-gris" style="width: 16.66%;">
                            Municipio
                        </td>
                        <td style="width: 16.66%;">
                            <label class="capitalize">{{ $piar->estudiante->municipio->descripcion }}</label>
                        </td>
                        <td class="table-th-gris" style="width: 16.66%;">
                            Barrio / <br> Vereda
                        </td>
                        <td style="width: 16.66%;">
                            <label class="capitalize">{{ $piar->estudiante->barrio_vereda }}</label>
                        </td>
                    </tr>
                </tbody>
            </table>
            <table class="table border-top-none">
                <tbody>
                    <tr>
                        <td class="table-th-gris" style="width: 16.66%;">
                            Dirección de vivienda
                        </td>
                        <td style="width: 16.66%;">
                            <label class="capitalize">{{ $piar->estudiante->direccion }}</label>
                        </td>
                        <td class="table-th-gris" style="width: 16.66%;">
                            Teléfono
                        </td>
                        <td style="width: 16.66%;">
                            <label class="capitalize">{{ $piar->estudiante->telefono }}</label>
                        </td>
                        <td class="table-th-gris" style="width: 16.66%;">
                            Correo <br>electrónico
                        </td>
                        <td style="width: 16.66%;">
                            <label>{{ $piar->estudiante->email }}</label>
                        </td>
                    </tr>
                </tbody>
            </table>
            <table class="table border-top-none">
                <tbody>
                    <tr>
                        <td class="table-th-gris" rowspan="2">
                            ¿Se reconoce como víctima <br> del conflicto armado?
                        </td>
                        <td rowspan="2">
                            Si  {!! $piar->datosGenerales->victima == 'Si' ? '<span class="p_subrayado">X</span>' : '__' !!} No {!! $piar->datosGenerales->victima == 'No' ? '<span class="p_subrayado">X</span>' : '__' !!}
                            <br>
                            (¿Cuenta con el respectivo registro? Si {!! $piar->datosGenerales->registro_victima == 'Si' ? '<span class="p_subrayado">X</span>' : '__' !!} No {!! $piar->datosGenerales->registro_victima == 'No' ? '<span class="p_subrayado">X</span>' : '__' !!})
                        </td>
                        <td class="table-th-gris">
                            ¿Está en algún Centro de Protección?
                        </td>
                        <td class="table-th-gris">
                            ¿Se reconoce o pertenece a un grupo étnico? 
                        </td>  
                    </tr>
                    <tr>
                        <td>
                            Si  {!! $piar->datosGenerales->centro_proteccion == 'Si' ? '<span class="p_subrayado">X</span>' : '__' !!} No {!! $piar->datosGenerales->centro_proteccion == 'No' ? '<span class="p_subrayado">X</span>' : '__' !!} ¿Cuál?
                            <br>
                            @if($piar->datosGenerales->centro_proteccion == 'Si')
                                <label class="capitalize">{{ $piar->datosGenerales->cual_centro_proteccion }}</label>
                            @endif
                        </td>
                        <td>
                            Si  {!! $piar->datosGenerales->grupo_etnico == 'Si' ? '<span class="p_subrayado">X</span>' : '__' !!} No {!! $piar->datosGenerales->grupo_etnico == 'No' ? '<span class="p_subrayado">X</span>' : '__' !!} ¿Cuál?
                            <br>
                            @if($piar->datosGenerales->grupo_etnico == 'Si')
                                <label class="capitalize">{{ $piar->datosGenerales->cual_etnico }}</label>
                            @endif
                        </td>
                    </tr>
                </tbody>
            </table>
            <table class="table border-top-none">
                <tbody>
                    <tr>
                        <td class="table-th-gris" rowspan="12" style="width: 20%;">
                            Descripción general del
                            estudiante con énfasis
                            en sus capacidades,
                            gustos e intereses o
                            aspectos que le
                            desagradan,
                            expectativas del
                            estudiante y la familia,
                            acompañamiento
                            familiar y redes de
                            apoyo con los que se
                            cuenta.
                        </td>
                        <td class="table-th-gris">Capacidades</td>
                    </tr>
                    <tr>
                        <td><p>{{ $piar->datosGenerales->capacidades }}</p></td>
                    </tr>
                    <tr>
                        <td class="table-th-gris">
                            Gustos e intereses
                        </td>
                    </tr>
                    <tr>
                        <td><p>{{ $piar->datosGenerales->gustos }}</p></td>
                    </tr>
                    <tr>
                        <td class="table-th-gris"> Expectativas del estudiante</td>
                    </tr>
                    <tr>
                        <td><p>{{ $piar->datosGenerales->expectativas_estudiante }}</p></td>
                    </tr>
                    <tr>
                        <td class="table-th-gris">Expectativas de la familia</td>
                    </tr>
                    <tr>
                        <td><p>{{ $piar->datosGenerales->expectativas_familia }}</p></td>
                    </tr>
                    <tr>
                        <td class="table-th-gris">Redes de apoyo</td>
                    </tr>
                    <tr>
                        <td><p>{{ $piar->datosGenerales->redes_apoyo }}</p></td>
                    </tr>
                    <tr>
                        <td class="table-th-gris">Otras </td>
                    </tr>
                    <tr>
                        <td><p>{{ $piar->datosGenerales->otras }}</p></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    <div class="page-break"></div>
    <div class="contenido" style="margin: 10px;">
        <label><strong>2. Entorno salud</strong></label>
        <table class="table" style="margin-top: 10px;">
            <tbody>
                <tr>
                    <td class="table-th-gris">
                        Afiliación al sistema de salud 
                    </td>
                    <td>
                        @if($piar->entornoSalud->afililiacion_salud == 'Si')
                            Si <span class="p_subrayado">X</span> No __
                        @else
                            Si __ No <span class="p_subrayado">X</span>
                        @endif
                    </td>
                    <td class="table-th-gris">
                        Contributivo
                    </td>
                    <td>
                        @if($piar->entornoSalud->regimen == 'Contributivo')
                            X
                        @endif
                    </td>
                    <td class="table-th-gris">
                        Subsidiado
                    </td>
                    <td>
                        @if($piar->entornoSalud->regimen == 'Subsidiado')
                            X
                        @endif
                    </td>
                    <td class="table-th-gris">
                        Cuál
                    </td>
                    <td>
                        <label class="capitalize">{{ $piar->entornoSalud->eps }}</label>
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                <tr>
                    <td class="table-th-gris" style="width: 40%;">
                        Lugar donde le atienden en caso de emergencia
                    </td>
                    <td>
                        <label class="capitalize">{{ $piar->entornoSalud->lugar_emergencia }}</label>
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                <tr>
                    <td class="table-th-gris" style="width: 30%;">
                        Cuenta con diagnóstico médico
                    </td>
                    <td style="width: 10%;">
                        @if($piar->entornoSalud->diagnostico_medico == 'Si')
                            Si <span class="p_subrayado">X</span> No __
                        @else
                            Si __ No <span class="p_subrayado">X</span>
                        @endif
                    </td>
                    <td class="table-th-gris" style="width: 10%;">
                        ¿Cuál?
                    </td>
                    <td>
                        <label class="capitalize">{{ $piar->entornoSalud->cual_diagnostico }}</label>
                    </td>
                </tr>
           </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                @if($piar->entornoSalud->atencionesMedicas->isEmpty())
                    <tr>
                        <td class="table-th-gris" style="width: 30%;">
                            Cuenta con atención médica
                        </td>
                        <td style="width: 10%;">
                           @if($piar->entornoSalud->atencion_medica == 'Si')
                            Si <span class="p_subrayado">X</span> No __
                           @else
                            Si __ No <span class="p_subrayado">X</span>
                           @endif
                        </td>
                        <td class="table-th-gris">¿Cuál?</td>
                        <td><label class="text-muted"></label></td>
                        <td class="table-th-gris">Frecuencia</td>
                        <td><label class="text-muted"></label></td>
                    </tr>
                @else
                    @foreach($piar->entornoSalud->atencionesMedicas as $index => $atencion)
                        <tr>
                            @if($index === 0)
                                <td class="table-th-gris" style="width: 30%;" rowspan="{{ $piar->entornoSalud->atencionesMedicas->count() }}">
                                    Cuenta con atención médica
                                </td>
                                <td style="width: 10%;" rowspan="{{ $piar->entornoSalud->atencionesMedicas->count() }}">
                                    @if($piar->entornoSalud->atencion_medica == 'Si')
                                        Si <span class="p_subrayado">X</span> No __
                                    @else
                                        Si __ No <span class="p_subrayado">X</span>
                                    @endif
                                </td>
                            @endif
                            <td class="table-th-gris">¿Cuál?</td>
                            <td>
                                <label class="capitalize">{{ $atencion->cual }}</label>
                            </td>
                            <td class="table-th-gris">Frecuencia</td>
                            <td>
                                <label class="capitalize">{{ $atencion->frecuencia }}</label>
                            </td>
                        </tr>
                    @endforeach
                @endif
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                @if($piar->entornoSalud->tratamientos->isEmpty())
                    <tr>
                        <td class="table-th-gris" style="width: 30%;">
                            Cuenta con intervención o
                            tratamiento terapéutico
                            integral
                        </td>
                        <td style="width: 10%;">
                           @if($piar->entornoSalud->tratamiento_integral == 'Si')
                            Si <span class="p_subrayado">X</span> No __
                           @else
                            Si __ No <span class="p_subrayado">X</span>
                           @endif
                        </td>
                        <td class="table-th-gris">¿Cuál?</td>
                        <td><label class="text-muted"></label></td>
                        <td class="table-th-gris">Frecuencia</td>
                        <td><label class="text-muted"></label></td>
                    </tr>
                @else
                    {{-- Caso 2: Sí tiene atenciones médicas registradas --}}
                    @foreach($piar->entornoSalud->tratamientos as $index => $tratamiento)
                        <tr>
                            {{-- Estas celdas principales solo se muestran una vez y abarcan todas las filas --}}
                            @if($index === 0)
                                <td class="table-th-gris" style="width: 30%;" rowspan="{{ $piar->entornoSalud->atencionesMedicas->count() }}">
                                    Cuenta con intervención o
                                    tratamiento terapéutico
                                    integral
                                </td>
                                <td style="width: 10%;" rowspan="{{ $piar->entornoSalud->tratamientos->count() }}">
                                    @if($piar->entornoSalud->tratamiento_integral == 'Si')
                                        Si <span class="p_subrayado">X</span> No __
                                    @else
                                        Si __ No <span class="p_subrayado">X</span>
                                    @endif
                                </td>
                            @endif
                            {{-- Datos dinámicos que se repiten por cada atención --}}
                            <td class="table-th-gris">¿Cuál?</td>
                            <td>
                                <label class="capitalize">{{ $tratamiento->cual }}</label>
                            </td>
                            <td class="table-th-gris">Frecuencia</td>
                            <td>
                                <label class="capitalize">{{ $tratamiento->frecuencia }}</label>
                            </td>
                        </tr>
                    @endforeach
                @endif
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                @if($piar->entornoSalud->medicamentos->isEmpty())
                    <tr>
                        <td class="table-th-gris" style="width: 25%;">
                            ¿Consume medicamentos?
                        </td>
                        <td style="width: 10%;">
                           @if($piar->entornoSalud->consume_medicamentos == 'Si')
                            Si <span class="p_subrayado">X</span> No __
                           @else
                            Si __ No <span class="p_subrayado">X</span>
                           @endif
                        </td>
                        <td class="table-th-gris">¿Cuál?</td>
                        <td><label class="text-muted"></label></td>
                        <td class="table-th-gris">Frecuencia</td>
                        <td><label class="text-muted"></label></td>
                        <td class="table-th-gris">Horario</td>
                        <td><label class="text-muted"></label></td>
                    </tr>
                @else
                    {{-- Caso 2: Sí tiene atenciones médicas registradas --}}
                    @foreach($piar->entornoSalud->medicamentos as $index => $medicamento)
                        <tr>
                            {{-- Estas celdas principales solo se muestran una vez y abarcan todas las filas --}}
                            @if($index === 0)
                                <td class="table-th-gris" style="width: 25%;" rowspan="{{ $piar->entornoSalud->medicamentos->count() }}">
                                    ¿Consume medicamentos?
                                </td>
                                <td style="width: 10%;" rowspan="{{ $piar->entornoSalud->medicamentos->count() }}">
                                    @if($piar->entornoSalud->consume_medicamentos == 'Si')
                                        Si <span class="p_subrayado">X</span> No __
                                    @else
                                        Si __ No <span class="p_subrayado">X</span>
                                    @endif
                                </td>
                            @endif
                            {{-- Datos dinámicos que se repiten por cada atención --}}
                            <td class="table-th-gris">¿Cuál?</td>
                            <td>
                                <label class="capitalize">{{ $medicamento->cual }}</label>
                            </td>
                            <td class="table-th-gris">Frecuencia</td>
                            <td>
                                <label class="capitalize">{{ $medicamento->frecuencia }}</label>
                            </td>
                            <td class="table-th-gris">Horario</td>
                            <td>
                                <label class="capitalize">{{ $medicamento->horario }}</label>
                            </td>
                        </tr>
                    @endforeach
                @endif
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                <tr>
                    <td class="table-th-gris" style="width: 40%;">
                        ¿Cuenta con apoyos o ayudas técnicas o
                        tecnológicas para favorecer su movilidad,
                        comunicación e independencia? 
                    </td>
                    <td>
                        @if($piar->entornoSalud->ayudas_tecnicas == 'Si')
                            Si <span class="p_subrayado">X</span> No __
                        @else
                            Si __ No <span class="p_subrayado">X</span>
                        @endif
                    </td>
                    <td class="table-th-gris" style="width: 20%;">¿Cuál?</td>
                    <td>
                        <label class="capitalize">{{ $piar->entornoSalud->cuales_ayudas }}</label>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    <div class="page-break"></div>
    <div class="contenido" style="margin: 10px;">
        <label><strong>3. Entorno hogar</strong></label>
        <table class="table" style="margin-top: 10px;">
            <tbody>
                <tr>
                    <td class="table-th-gris">
                        Nombre de la madre
                    </td>
                    <td>
                        <label class="capitalize">{{ $piar->entornoHogar->nombre_madre }}</label>
                    </td>
                    <td class="table-th-gris">
                        Nombre del padre
                    </td>
                    <td colspan="3">
                        <label class="capitalize">{{ $piar->entornoHogar->nombre_padre }}</label>
                    </td>
                </tr>
                <tr>
                    <td class="table-th-gris">
                        Ocupación de la madre
                    </td>
                    <td>
                        <label class="capitalize">{{ $piar->entornoHogar->ocupacion_madre }}</label>
                    </td>
                    <td class="table-th-gris">
                        Ocupación del padre
                    </td>
                    <td colspan="3">
                        <label class="capitalize">{{ $piar->entornoHogar->ocupacion_padre }}</label>
                    </td>
                </tr>
                <tr>
                    <td class="table-th-gris">
                        Nivel educativo alcanzado por la madre
                    </td>
                    <td>
                        <label class="capitalize">{{ $piar->entornoHogar->nivel_madre }}</label>
                    </td>
                    <td class="table-th-gris">
                        Nivel educativo alcanzado por el padre
                    </td>
                    <td colspan="3">
                        <label class="capitalize">{{ $piar->entornoHogar->nivel_padre }}</label>
                    </td>
                </tr>
                <tr>
                    <td class="table-th-gris">
                        Nombre del cuidador
                    </td>
                    <td>
                        <label class="capitalize">{{ $piar->entornoHogar->nombre_cuidador }}</label>
                    </td>
                    <td class="table-th-gris">
                        Nivel educativo alcanzado por el cuidador
                    </td>
                    <td style="width: 15%;">
                        <label class="capitalize">{{ $piar->entornoHogar->nivel_cuidador }}</label>
                    </td>
                    <td class="table-th-gris" style="width: 10%;">
                        Telefonó
                    </td>
                    <td>
                        <label class="capitalize">{{ $piar->entornoHogar->telefono_cuidador }}</label>
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                <tr>
                    <td class="table-th-gris" rowspan="2" style="width:18%;">
                        No. Hermanos
                    </td>
                    <td rowspan="2" style="width:7%;">
                        <label>{{ $piar->entornoHogar->numero_hermanos }}</label>
                    </td>
        
                    <td class="table-th-gris" rowspan="2" style="width:14%;">
                        Lugar que ocupa
                    </td>
                    <td rowspan="2" style="width:5%;">
                        <label>{{ $piar->entornoHogar->lugar_ocupa }}</label>
                    </td>
        
                    <td class="table-th-gris" style="width:28%;">
                        ¿Quiénes apoyan la crianza del estudiante?
                    </td>
        
                    <td class="table-th-gris" style="width:28%;">
                        Personas con quien vive
                    </td>
                </tr>
        
                <tr>
                    <td>
                        <label class="capitalize">
                            {{ $piar->entornoHogar->apoyo_crianza }}
                        </label>
                    </td>
        
                    <td>
                        <label class="capitalize">
                            {{ $piar->entornoHogar->personas_con_quien_vive }}
                        </label>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    <div class="page-break"></div>
    <div class="contenido" style="margin: 10px;">
        <label><strong>4. Entorno educativo</strong></label>
        <table class="table" style="margin-top: 10px;">
            <tbody>
                <tr>
                    <td class="table-th-gris" style="width: 40%;">
                        ¿Ha estado vinculado en otra institución
                        educativa, fundación o bajo otra modalidad
                        de educación?
                    </td>
                    <td>
                        @if($piar->entornoEducativo->vinculado_otra_institucion == 'No')
                            No <span class="p_subrayado">X</span> ¿Por qué? <br>
                            <label class="capitalize">{{ $piar->entornoEducativo->motivo_no_vinculado }}</label>
                        @else
                            No __ ¿Por qué?
                        @endif
                    </td>
                    <td>
                        @if($piar->entornoEducativo->vinculado_otra_institucion == 'Si')
                            Si <span class="p_subrayado">X</span> ¿Cuáles? <br>
                            <label class="capitalize">{{ $piar->entornoEducativo->instituciones_anteriores }}</label>
                        @else
                            Si __ ¿Cuáles?
                        @endif
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                <tr>
                    <td class="table-th-gris" rowspan="2">
                        Ultimo grado cursado
                    </td>
                    <td rowspan="2">
                        <label class="capitalize">{{ $piar->entornoEducativo->ultimo_grado }}</label>
                    </td>
                    <td class="table-th-gris">
                        Estado
                    </td>
                    <td rowspan="2">
                        Observaciones: <br>
                        <label class="capitalize">{{ $piar->entornoEducativo->observaciones_estado }}</label>
                    </td>
                </tr>
                <tr>
                    <td>
                        @if($piar->entornoEducativo->estado_ultimo_grado == 'Aprobado')
                            Aprobado <span class="p_subrayado">X</span>
                            <br>
                            Sin terminar __
                        @else
                            Aprobado __ 
                            <br>
                            Sin terminar <span class="p_subrayado">X</span>
                        @endif
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                <tr>
                    <td class="table-th-gris" style="width: 70%;">
                        ¿Se recibe informe pedagógico cualitativo o certificado que describa el proceso de desarrollo y aprendizaje del estudiante y/o PIAR?
                    </td>
                    <td>
                        @if($piar->entornoEducativo->recibe_informe_pedagogico == 'Si')
                            Si <span class="p_subrayado">X</span> No __
                        @else
                            Si __ No <span class="p_subrayado">X</span>
                        @endif
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                <tr>
                    <td class="table-th-gris" rowspan="2">
                        ¿De qué institución o modalidad proviene el informe?
                    </td>
                    <td rowspan="2" style="width: 30%;">
                        <label class="capitalize">{{ $piar->entornoEducativo->institucion_informe }}</label>
                    </td>
                    <td class="table-th-gris">
                        ¿Está asistiendo en la actualidad a programas complementarios?
                    </td>
                </tr>
                <tr>
                    <td>
                        @if($piar->entornoEducativo->programas_complementarios == 'Si')
                            Si <span class="p_subrayado">X</span> No __
                        @else
                            Si __ No <span class="p_subrayado">X</span>
                        @endif
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    <div class="page-break"></div>
    <div class="contenido" style="margin: 10px;">
        <table class="table" style="margin-top: 10px;">
            <tbody>
                <tr>
                    <th class="table-th-azul" style="font-size: 15px;">
                        VALORACIÓN PEDAGÓGICA
                    </th>
                </tr>
            </tbody>
        </table>
        <table class="table" style="margin-top: 10px;">
            <tbody>
                <tr>
                    <td class="table-th-gris">
                        ASPECTO
                    </td>
                    <td class="table-th-gris" colspan="2" style="text-align: center;">
                        MARQUE <br>
                        "X"
                    </td>
                    <td class="table-th-gris">
                        ¿CUÁL? / OBSERVACIÓN
                    </td>
                </tr>
                <tr>
                    <td colspan="4" style="text-align: center;" class="table-th-gris">
                        MOVILIDAD
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Requiere sistema y aditamentos de apoyo para la movilidad?</td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_mov_apoyo_sistema == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_mov_apoyo_sistema == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_mov_apoyo_sistema_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Requiere ajustes en el espacio físico para su movilidad?</td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_mov_ajustes_espacio == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_mov_ajustes_espacio == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_mov_ajustes_espacio_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Se necesitan ajustes para la movilidad?</td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_mov_ajustes_movilidad == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_mov_ajustes_movilidad == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_mov_ajustes_movilidad_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Requiere apoyos para favorecer su motricidad fina? <small class="text-muted">(no es movilidad)</small></td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_mov_motricidad_fina == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_mov_motricidad_fina == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_mov_motricidad_fina_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Requiere alguna adaptación para agarrar objetos?</td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_mov_adaptacion_agarrar == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_mov_adaptacion_agarrar == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_mov_adaptacion_agarrar_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td colspan="4" style="font-size: 13px;">
                        Intensidad y duración del apoyo:
                        {!! getIntensidadDuracion($piar->valoracionPedagogica->vp_mov_intensidad) !!}
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                <tr>
                    <td colspan="4" style="text-align: center;" class="table-th-gris">
                        COMUNICACIÓN
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Requiere sistema de apoyo y ajustes para la comunicación?</td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_com_apoyo_sistema == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_com_apoyo_sistema == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_com_apoyo_sistema_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Cuenta con los aditamentos de apoyo a la comunicación?</td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_com_aditamentos == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_com_aditamentos == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_com_aditamentos_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Se necesitan ajustes para garantizar la comunicación?</td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_com_ajustes == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_com_ajustes == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_com_ajustes_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td colspan="4" style="font-size: 13px;">
                        Intensidad y duración del apoyo:
                        {!! getIntensidadDuracion($piar->valoracionPedagogica->vp_com_intensidad) !!}
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                <tr>
                    <td colspan="4" style="text-align: center;" class="table-th-gris">
                        DE ACCESO A LA INFORMACIÓN
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Requiere sistema de apoyo y ajustes para acceder a la información?</td>
                    <td class="casilla" >
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_info_apoyo_sistema == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_info_apoyo_sistema == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_info_apoyo_sistema_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Se necesitan ajustes para garantizar el acceso a la información?</td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_info_ajustes == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_info_ajustes == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_info_ajustes_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td colspan="4" style="font-size: 13px;">
                        Intensidad y duración del apoyo:
                        {!! getIntensidadDuracion($piar->valoracionPedagogica->vp_info_intensidad) !!}
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                <tr>
                    <td colspan="4" style="text-align: center;" class="table-th-gris">
                        DE INTERACCIÓN SOCIAL
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Requiere sistema de apoyo y ajustes para la regulación de su comportamiento?</td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_soc_apoyo_regulacion == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_soc_apoyo_regulacion == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_soc_apoyo_regulacion_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Se necesitan ajustes para garantizar la interacción con sus pares y maestros?</td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_soc_ajustes_interaccion == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_soc_ajustes_interaccion == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_soc_ajustes_interaccion_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td colspan="4" style="font-size: 13px;">
                        Intensidad y duración del apoyo:
                        {!! getIntensidadDuracion($piar->valoracionPedagogica->vp_soc_intensidad) !!}
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                <tr>
                    <td colspan="4" style="text-align: center;" class="table-th-gris">
                        ACADÉMICO - PEDAGÓGICO <br>
                        <small class="text-muted">Esta información se recogerá y fortalecerá con base en la observación durante los primeros tres meses del ingreso al establecimiento educativo.</small>
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Requiere ajustes en los tiempos de permanencia en establecimiento educativo?</td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_acad_ajustes_permanencia == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_acad_ajustes_permanencia == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_acad_ajustes_permanencia_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td style="width: 40%;">¿Requiere ajustes en los tiempos dedicados a una actividad?</td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">SI</label>
                            @if($piar->valoracionPedagogica->vp_acad_ajustes_tiempos == 'Si')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td class="casilla">
                        <div style="position: relative;">
                            <label class="index-bajo">NO</label>
                            @if($piar->valoracionPedagogica->vp_acad_ajustes_tiempos == 'No')
                                <div class="index-alto">X</div>
                            @endif
                        </div>
                    </td>
                    <td style="width: 40%;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_acad_ajustes_tiempos_obs }}</label>
                    </td>
                </tr>
                <tr>
                    <td colspan="4" style="font-size: 13px;">
                        Intensidad y duración del apoyo:
                        {!! getIntensidadDuracion($piar->valoracionPedagogica->vp_acad_intensidad) !!}
                    </td>
                </tr>
                <tr>    
                    <td colspan="4" class="table-th-gris" style="font-size: 13px; text-align: left;">
                        OBSERVACIONES: <br>
                    </td>
                </tr>
                <tr>
                    <td colspan="4" style="text-align: left;">
                        <label class="capitalize">{{ $piar->valoracionPedagogica->vp_observaciones }}</label>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    <div class="page-break"></div>
    <div class="contenido" style="margin: 10px;">
        <table class="table">
            <tbody>
                <tr>
                    <td colspan="4" style="text-align: center;" class="table-th-gris">
                        COMPETENCIAS LECTORAS Y ESCRITURALES 2 a 6 años
                    </td>
                </tr>
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

                    $indice = 1;
                @endphp
                @foreach($competenciasLectoras as $competencia)
                    <tr>
                        <td style="width: 40%;">{{ $competencia }}</td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">SI</label>
                                @if($piar->valoracionPedagogica['cle_'.$indice] == 'Si')
                                    <div class="index-alto">X</div>
                                @endif
                            </div>
                        </td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">NO</label>
                                @if($piar->valoracionPedagogica['cle_'.$indice] == 'No')
                                    <div class="index-alto">X</div>
                                @endif
                            </div>
                        </td>
                        <td style="width: 40%;">
                            <label class="capitalize">{{ $piar->valoracionPedagogica['cle_'.$indice.'_obs'] }}</label>
                        </td>
                    </tr>
                    @php
                        $indice++;
                    @endphp
                @endforeach
                <tr>
                    <td colspan="4" style="text-align: left;">
                        <strong>Observaciones:</strong> <br>
                        <label class="capitalize">{{ $piar->valoracionPedagogica->cle_observaciones }}</label>
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="table border-top-none">
            <tbody>
                <tr>
                    <td colspan="4" style="text-align: center;" class="table-th-gris">
                        COMPETENCIAS LOGICO-MATEMÁTICAS 2 a 6 años
                    </td>
                </tr>
                @php
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

                    $indice = 1;
                @endphp
                @foreach($competenciasLogicoMatematicas as $competencia)
                    <tr>
                        <td style="width: 40%;">
                            @if($competencia == 'num_rango')
                                Identifica los números desde <strong class="p_subrayado">{{ $piar->valoracionPedagogica->clm_5_desde }}</strong> hasta <strong class="p_subrayado">{{ $piar->valoracionPedagogica->clm_5_hasta }}</strong>
                            @else
                                {{ $competencia }}
                            @endif
                        </td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">SI</label>
                                @if($piar->valoracionPedagogica['clm_'.$indice] == 'Si')
                                    <div class="index-alto">X</div>
                                @endif
                            </div>
                        </td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">NO</label>
                                @if($piar->valoracionPedagogica['clm_'.$indice] == 'No')
                                    <div class="index-alto">X</div>
                                @endif
                            </div>
                        </td>
                        <td style="width: 40%;">
                            <label class="capitalize">{{ $piar->valoracionPedagogica['clm_'.$indice.'_obs'] }}</label>
                        </td>
                    </tr>
                    @php
                        $indice++;
                    @endphp
                @endforeach
                <tr>
                    <td colspan="4" style="text-align: left;">
                        <strong>Observaciones:</strong> <br>
                        <label class="capitalize">{{ $piar->valoracionPedagogica->clm_observaciones }}</label>
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="table border-top-none">   
            <tbody>
                <tr>
                    <td colspan="4" style="text-align: center;" class="table-th-gris">
                        DISPOSITIVOS BÁSICOS DE APRENDIZAJE
                    </td>
                </tr>
                <tr>
                    <td style="text-align: center;" class="table-th-gris">
                        MEMORIA
                    </td>
                    <td class="table-th-gris casilla">
                        Si
                    </td>
                    <td class="table-th-gris casilla">
                        No
                    </td>
                    <td style="width: 40%; text-align: center;" class="table-th-gris">
                        OBSERVACIONES
                    </td>
                </tr>
                @php

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

                    $indice = 1;
                @endphp
                @foreach($memoria as $item)
                    <tr>
                        <td style="width: 40%;">{{ $item }}</td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">SI</label>
                                @if($piar->valoracionPedagogica['dba_mem_'.$indice] == 'Si')
                                    <div class="index-alto">X</div>
                                @endif
                            </div>
                        </td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">NO</label>
                                @if($piar->valoracionPedagogica['dba_mem_'.$indice] == 'No')
                                    <div class="index-alto">X</div>
                                @endif
                            </div>
                        </td>
                        <td style="width: 40%;">
                            <label class="capitalize">{{ $piar->valoracionPedagogica['dba_mem_'.$indice.'_obs'] }}</label>
                        </td>
                    </tr>
                    @php
                        $indice++;
                    @endphp
                @endforeach
                <tr>
                    <td style="text-align: center;" class="table-th-gris">
                        ATENCIÓN
                    </td>
                    <td class="table-th-gris casilla">
                        Si
                    </td>
                    <td class="table-th-gris casilla">
                        No
                    </td>
                    <td style="width: 40%; text-align: center;" class="table-th-gris">
                        OBSERVACIONES
                    </td>
                </tr>
                @php
                    $indice = 1;
                @endphp
                @foreach($atencion as $item)
                    <tr>
                        <td style="width: 40%;">
                            @if($item == 'ate_tiempo')
                                Sus periodos de atención son de <strong class="p_subrayado">{{ $piar->valoracionPedagogica->dba_ate_4_tiempo }}</strong> minutos
                            @else
                                {{ $item }}
                            @endif
                        </td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">SI</label>
                                @if($piar->valoracionPedagogica['dba_ate_'.$indice] == 'Si')
                                    <div class="index-alto">X</div>
                                @endif
                            </div>
                        </td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">NO</label>
                                @if($piar->valoracionPedagogica['dba_ate_'.$indice] == 'No')
                                    <div class="index-alto">X</div>
                                @endif
                            </div>
                        </td>
                        <td style="width: 40%;">
                            <label class="capitalize">{{ $piar->valoracionPedagogica['dba_ate_'.$indice.'_obs'] }}</label>
                        </td>
                    </tr>
                    @php
                        $indice++;
                    @endphp
                @endforeach
                <tr>
                    <td  style="text-align: center;" class="table-th-gris">
                        PERCEPCIÓN
                    </td>
                    <td class="table-th-gris casilla">
                        Si
                    </td>
                    <td class="table-th-gris casilla">
                        No
                    </td>
                    <td style="width: 40%; text-align: center;" class="table-th-gris">
                        OBSERVACIONES
                    </td>
                </tr>
                @php
                    $indice = 1;
                @endphp
                @foreach($percepcion as $item)
                    <tr>
                        <td style="width: 40%;">{{ $item }}</td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">SI</label>
                                @if($piar->valoracionPedagogica['dba_per_'.$indice] == 'Si')
                                    <div class="index-alto">X</div>
                                @endif
                            </div>
                        </td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">NO</label>
                                @if($piar->valoracionPedagogica['dba_per_'.$indice] == 'No')
                                    <div class="index-alto">X</div>
                                @endif
                            </div>
                        </td>
                        <td style="width: 40%;">
                            <label class="capitalize">{{ $piar->valoracionPedagogica['dba_per_'.$indice.'_obs'] }}</label>
                        </td>
                    </tr>
                    @php    
                        $indice++;
                    @endphp
                @endforeach
                <tr>
                    <td  style="text-align: center;" class="table-th-gris">
                        FUNCIONES EJECUTIVAS <br>
                        <p class="small">(planificación, organización, flexibilidad o cambio de criterio, anticipación, monitoreo y seguimiento) </p>
                    </td>
                    <td class="table-th-gris casilla">
                        Si
                    </td>
                    <td class="table-th-gris casilla">
                        No
                    </td>
                    <td style="width: 40%; text-align: center;" class="table-th-gris">
                        OBSERVACIONES
                    </td>
                </tr>
                @php
                    $indice = 1;
                @endphp
                @foreach($funcionesEjecutivas as $item)
                    <tr>
                        <td style="width: 40%;">{{ $item }}</td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">SI</label>
                                @if($piar->valoracionPedagogica['dba_fe_'.$indice] == 'Si')
                                    <div class="index-alto">X</div>
                                @endif
                            </div>
                        </td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">NO</label>
                                @if($piar->valoracionPedagogica['dba_fe_'.$indice] == 'No')
                                    <div class="index-alto">X</div>
                                @endif
                            </div>
                        </td>
                        <td style="width: 40%;">
                            <label class="capitalize">{{ $piar->valoracionPedagogica['dba_fe_'.$indice.'_obs'] }}</label>
                        </td>
                    </tr>
                    @php
                        $indice++;
                    @endphp
                @endforeach
                <tr>
                    <td style="text-align: center;" class="table-th-gris">
                        LENGUAJE Y COMUNICACIÓN
                    </td>
                    <td class="table-th-gris casilla">
                        Si
                    </td>
                    <td class="table-th-gris casilla">
                        No
                    </td>
                    <td style="width: 40%; text-align: center;" class="table-th-gris">
                        OBSERVACIONES
                    </td>
                </tr>
                @php
                    $indice = 1;
                @endphp
                @foreach($lenguajeComunicacion as $item)
                    <tr>
                        <td style="width: 40%;">{{ $item }}</td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">SI</label>
                                @if($piar->valoracionPedagogica['dba_lc_'.$indice] == 'Si')
                                    <div class="index-alto">X</div>
                                @endif
                            </div>
                        </td>
                        <td class="casilla">
                            <div style="position: relative;">
                                <label class="index-bajo">NO</label>
                                @if($piar->valoracionPedagogica['dba_lc_'.$indice] == 'No')
                                    <div class="index-alto" style="width: 100%; height: 100%;">X</div>
                                @endif
                            </div>
                        </td>
                        <td style="width: 40%;">
                            <label class="capitalize">{{ $piar->valoracionPedagogica['dba_lc_'.$indice.'_obs'] }}</label>
                        </td>
                    </tr>
                    @php
                        $indice++;
                    @endphp
                @endforeach
            </tbody>
        </table>
    </div>
    <div class="page-break"></div>
    <div class="contenido">
        <table class="table">
            <tbody>
                <tr class="table-th-gris" style="text-align: center;">
                    <td>
                        <strong>DESCRIPCIÓN DE HABILIDADES Y DESTREZAS DEL ESTUDIANTE</strong> <br>
                        <i style="font-weight: 100; font-size: 11px;">
                            (Este apartado tiene como propósito identificar y describir las habilidades y destrezas que posee el estudiante en las
                            diferentes áreas de desarrollo, resaltando sus fortalezas, capacidades y potencial de aprendizaje. Esta información orienta
                            la implementación de estrategias pedagógicas y apoyos que favorezcan su proceso educativo y participación en el aula.) 
                        </i>
                    </td>
                </tr>
                <tr>
                    <td style="text-align: justify;">
                        <div style="min-height: 600px;">
                            <label class="capitalize">{{ $piar->valoracionPedagogica->habilidades_destrezas }}</label>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    <div class="page-break"></div>
    <div class="contenido">
        <table class="table">
            <tbody>
                <tr>
                    <td style="text-align: center;">
                        <strong>ESTRATEGIAS Y/O ACCIONES A DESARROLLAR CON EL ESTUDIANTE</strong> <br>
                        <i style="font-weight: 100; font-size: 11px;">(En este apartado se registran las estrategias, actividades, ajustes y apoyos que se desarrollarán con el estudiante para
                            fortalecer sus procesos académicos, sociales, comunicativos y comportamentales. Estas acciones buscan responder a sus
                            necesidades educativas y potenciar sus habilidades, favoreciendo su participación activa y aprendizaje significativo.)
                        </i>
                    </td>
                </tr>
                <tr>
                    <td style="text-align: justify;">
                        <div style="min-height: 600px;">
                            <label class="capitalize">{{ $piar->valoracionPedagogica->estrategias_acciones }}</label>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        <table class="table" style="margin-top: 20px;">
            <tbody>
                <tr>
                    <td class="table-th-gris">
                        Nombre y firma de quien diligencia
                    </td>
                    <td class="table-th-gris">
                        Nombre y firma acudiente
                    </td>
                </tr>
                <tr>
                    <td>
                        <div style="min-height: 100px;">
                        </div>
                    </td>
                    <td>
                        <div style="min-height: 100px;">
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        <div style="margin-top: 20px;">
            <p style="font-size: 11px;">
                <strong>Fecha sugerida de próxima revisión y actualización:</strong>
                <span style="color:rgb(117, 117, 117);">DD/MM/AAAA (anualmente en el proceso ordinario pero si se requiere por modificaciones en el estudiante o en su contexto se deberá actualizar)</span>
            </p>
        </div>
    </div>
</body>
</html>

@php 
    function getIntensidadDuracion($intensidad) {
        switch($intensidad) {
            case 'ninguno':
                return 'Ninguno <span class="p_subrayado"> X </span> Intermitente ___ Extenso ___ Generalizado ___ No aplica ___';
            case 'intermitente':
                return 'Ninguno ___ Intermitente <span class="p_subrayado"> X </span> Extenso ___ Generalizado ___ No aplica ___';
            case 'extenso':
                return 'Ninguno ___ Intermitente ___ Extenso <span class="p_subrayado"> X </span> Generalizado ___ No aplica ___';
            case 'generalizado':
                return 'Ninguno ___ Intermitente ___ Extenso ___ Generalizado <span class="p_subrayado"> X </span> No aplica ___';
            case 'no_aplica':
                return 'Ninguno ___ Intermitente ___ Extenso ___ Generalizado ___ No aplica <span class="p_subrayado"> X </span>';
            default:
                return '';
        }
    }
@endphp