<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">

    <style>
        @page {
            margin: 100px 40px 60px 40px;
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
            height: 100px;
        }

        footer {
            position: fixed;
            bottom: -60px;
            left: 0;
            right: 0;
            height: 80px;
        }

        header img,
        footer img {
            width: 100%;
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
    </style>
</head>
<body>

    <header>
        <img src="{{ public_path('assets/images/encabezado.png') }}">
    </header>

    <footer>
        <img src="{{ public_path('assets/images/pie.png') }}">
    </footer>

    <div class="contenido" style="margin: 10px; margin-top: 30px;">
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
    <div class="contenido" style="margin: 10px; margin-top: 30px;">
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
    <div class="contenido" style="margin: 10px; margin-top: 30px;">
        <label><strong>3. Entorno hogar</strong></label>
    </div>
</body>
</html>