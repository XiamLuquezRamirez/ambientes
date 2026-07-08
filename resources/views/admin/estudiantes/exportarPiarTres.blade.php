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

        .contenedor-imagen {
           text-align: center;
           padding: 10px;
           width: 100%;
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
        <table style="width:100%; border:0;">
            <tr>
                @foreach ($piar->ajusteRazonable->docentesFirma as $docente)
                    <td style="width:33%; vertical-align:top; border:0; padding:5px;">
                        <table class="table">
                            <tbody>
                                <tr>
                                    <td class="table-th-gris">
                                        Nombre del docente
                                    </td>
                                </tr>
                                <tr>
                                    <td>{{ $docente->docente->user->nombre }}</td>
                                </tr>
                                <tr>
                                    <td class="table-th-gris">
                                        Área
                                    </td>
                                </tr>
                                <tr>
                                    <td>{{ $docente->area }}</td>
                                </tr>
                                <tr>
                                    <td class="table-th-gris">
                                        Firma
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align:center;">
                                        @if ($docente->docente->firma_url)
                                            <img src="{{ public_path('storage/'.$docente->docente->firma_url) }}" style="width:120px; height:100px;">
                                        @else
                                            <div style="width:120px; height:100px; background-color:rgba(255, 255, 255, 0);"></div>
                                        @endif
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
        
                    @if(($loop->iteration % 3) == 0 && !$loop->last)
                        </tr><tr>
                    @endif
                @endforeach
            </tr>
        </table>
        <table style="width:100%; border:0;">
            <tr>
                <td style="width:33%; vertical-align:top; border:0; padding:5px;">
                    <table class="table">
                        <tbody>
                            <tr>
                                <td class="table-th-gris">
                                    Nombre docente orientador
                                </td>
                            </tr>
                            <tr>
                                <td>{{ $piar->ajusteRazonable->docenteOrientador->user->nombre }}</td>
                            </tr>
                            <tr>
                                <td class="table-th-gris">
                                    Área
                                </td>
                            </tr>
                            <tr>
                                <td>{{ $piar->ajusteRazonable->docente_orientador_area }}</td>
                            </tr>
                            <tr>
                                <td class="table-th-gris">
                                    Firma
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align:center;">
                                    @if ($piar->ajusteRazonable->docenteOrientador->firma_url)
                                        <img src="{{ public_path('storage/'.$piar->ajusteRazonable->docenteOrientador->firma_url) }}" style="width:120px; height:100px;">
                                    @else
                                        <div style="width:120px; height:100px; background-color:rgba(255, 255, 255, 0);"></div>
                                    @endif
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
                <td style="width:33%; vertical-align:top; border:0; padding:5px;">
                    <table class="table">
                        <tbody>
                            <tr>
                                <td class="table-th-gris">
                                    Nombre docente apoyo pedagógico
                                </td>
                            </tr>
                            <tr>
                                <td>{{ $piar->ajusteRazonable->docenteApoyoPedagogico->user->nombre }}</td>
                            </tr>
                            <tr>
                                <td class="table-th-gris">
                                    Área
                                </td>
                            </tr>
                            <tr>
                                <td>{{ $piar->ajusteRazonable->docente_apoyo_pedagogico_area }}</td>
                            </tr>
                            <tr>
                                <td class="table-th-gris">
                                    Firma
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align:center;">
                                    @if ($piar->ajusteRazonable->docenteApoyoPedagogico->firma_url)
                                        <img src="{{ public_path('storage/'.$piar->ajusteRazonable->docenteApoyoPedagogico->firma_url) }}" style="width:120px; height:100px;">
                                    @else
                                        <div style="width:120px; height:100px; background-color:rgba(255, 255, 255, 0);"></div>
                                    @endif
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
                <td style="width:33%; vertical-align:top; border:0; padding:5px;">
                    <table class="table">
                        <tbody>
                            <tr>
                                <td class="table-th-gris">
                                    Nombre docente coordinador pedagógico
                                </td>
                            </tr>
                            <tr>
                                <td>{{ $piar->ajusteRazonable->docenteCoordinadorPedagogico->user->nombre }}</td>
                            </tr>
                            <tr>
                                <td class="table-th-gris">
                                    Área
                                </td>
                            </tr>
                            <tr>
                                <td>{{ $piar->ajusteRazonable->docente_coordinador_pedagogico_area }}</td>
                            </tr>
                            <tr>
                                <td class="table-th-gris">
                                    Firma
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align:center;">
                                    @if ($piar->ajusteRazonable->docenteCoordinadorPedagogico->firma_url)
                                        <img src="{{ public_path('storage/'.$piar->ajusteRazonable->docenteCoordinadorPedagogico->firma_url) }}" style="width:120px; height:100px;">
                                    @else
                                        <div style="width:120px; height:100px; background-color:rgba(255, 255, 255, 0);"></div>
                                    @endif
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </table>
    </div>
    <div class="page-break"></div>
    <div class="contenido" style="margin: 10px;"> 
        <table class="table">
            <tbody>
                <tr>
                    <th class="table-th-azul" style="font-size: 15px;" colspan="2">
                        ACTA DE ACUERDO 
                    </th>
                </tr>
                <tr>
                    <td class="table-th-gris" style="width: 50%;">
                        Fecha y lugar de Diligenciamiento
                    </td>
                    <td></td>
                </tr>
                <tr>
                    <td class="table-th-gris" style="width: 50%;">
                        Nombre y rol de la Persona que diligencia
                    </td>
                    <td></td>
                </tr>
                <tr>
                    <td class="table-th-gris" style="width: 50%;">
                        Institución Educativa
                    </td>
                    <td></td>
                </tr>
                <tr>
                    <td class="table-th-gris" style="width: 50%;">
                       Sede
                    </td>
                    <td></td>
                </tr>
            </tbody>
        </table>
        <table class="table" style="margin-top: 20px;">
            <tbody>
                <tr>
                    <td class="table-th-gris">
                        Nombre
                    </td>
                    <td style="width: 35%;"></td>
                    <td class="table-th-gris">
                        Edad
                    </td>
                    <td style="width: 20%;"></td>
                    <td class="table-th-gris">
                        Grado
                    </td>
                    <td style="width: 20%;"></td>
                </tr>
            </tbody>
        </table>
        <br>
        <br>
        <p style="font-size: 12px; text-align: justify;">
            Según el Decreto 1421 de 2017 la educación inclusiva es un proceso permanente que reconoce,
            valora y responde a la diversidad de características, intereses, posibilidades y expectativas de
            los estudiantes para promover su desarrollo, aprendizaje y participación, en un ambiente de
            aprendizaje común, sin discriminación o exclusión.
        </p>
        <p style="font-size: 12px; text-align: justify;">
            La inclusión solo es posible cuando se unen los esfuerzos del colegio, el estudiante, docentes,
            directivos docentes y familias. De ahí la importancia de formalizar con las firmas, la presente
            Acta de Acuerdo.
        </p>
        <p style="font-size: 12px; text-align: justify;">
            <strong>El Establecimiento Educativo</strong> ha realizado la valoración pedagógica y definido los ajustes
            razonables que facilitarán al estudiante su proceso educativo.
        </p>
        <p style="font-size: 12px; text-align: justify;">
            <strong>La Familia se compromete a</strong>  cumplir y firmar los compromisos señalados en el PIAR y en las actas
            de acuerdo, para fortalecer los procesos escolares del estudiante y en particular a: 
        </p>
        <div style="width: 90%; min-height: 200px; background-color: #f2f2f2; padding: 10px; border: 1px solid #000; margin-right: 40px;">
            <p>{{ $piar->actaCompromiso->compromisos }}</p>
        </div>
        <br>
        <p style="font-size: 12px; text-align: justify;">
            Y en casa apoyará con las siguientes actividades:
        </p>
        <table class="table" style="margin-top: 20px;">
            <tbody>
                <tr>
                    <td class="table-th-gris" style="width: 30%; text-align: center;">
                        Actividad
                    </td>
                    <td class="table-th-gris" style="width: 40%; text-align: center;">
                        Descripción de la estrategia
                    </td>
                    <td class="table-th-gris" style="width: 30%; text-align: center;">
                        Frecuencia: D Diaria, S
                        Semanal, P Permanente <br>
                        D __ S__ P__
                    </td>
                </tr>
                @foreach ($piar->actaCompromiso->actividades as $actividad)
                    <tr>
                        <td>{{ $actividad->actividad }}</td>
                        <td>{{ $actividad->descripcion }}</td>
                        <td>{{ $actividad->frecuencia }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    <div class="page-break"></div>
    <div class="contenido" style="margin: 10px;"> 
        <strong style="font-size: 12px;">Firma de los Actores comprometidos: </strong>
        <table class="table">
            <tbody>
                <tr>
                    <td style="width: 50%;">
                        <div style="min-height: 100px; padding: 10px;">
                           
                        </div>
                    </td>
                    <td style="width: 50%;">
                        <div style="min-height: 100px; padding: 10px;">
                           
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="width: 50%;" class="table-th-gris">
                        Estudiante
                    </td>
                    <td style="width: 50%;" class="table-th-gris">
                        Acudiente / familiar
                    </td>
                </tr>
                <tr>
                    <td style="width: 50%;">
                        <div style="min-height: 100px; padding: 10px;">
                           
                        </div>
                    </td>
                    <td style="width: 50%;">
                        <div style="min-height: 100px; padding: 10px;">
                           
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="width: 50%;" class="table-th-gris">
                        Docentes
                    </td>
                    <td style="width: 50%;" class="table-th-gris">
                        Docentes
                    </td>
                </tr>
                <tr>
                    <td style="width: 50%;">
                        <div style="min-height: 100px; padding: 10px;">
                           
                        </div>
                    </td>
                    <td style="width: 50%;">
                        <div style="min-height: 100px; padding: 10px;">
                           
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="width: 50%;" class="table-th-gris">
                        Directivo docente
                    </td>
                    <td style="width: 50%;" class="table-th-gris">
                        Directivo docente
                    </td>
                </tr>
            </tbody>
        </table>
</body>
</html>