<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 100px 40px 40px 40px;
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
            text-align: left;
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
            width: 60% !important;
            height: auto !important;
        }

        footer img {
            width: 60% !important;
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

        .texto_gris {
            color:rgb(110, 110, 110);
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
        <table class="table" style="margin-top: 10px;">
            <tbody>
                <tr>
                    <th class="table-th-azul" style="font-size: 15px;" colspan="6">
                        AJUSTES RAZONABLES
                    </th>
                </tr>
                <tr>
                    <td class="table-th-gris" style="text-align: center;">
                        Área/asignatura/
                        campo de pensamiento/
                        área de
                        desarrollo
                        /dimensiones/articulación
                        con la educación media/
                        /dinámicas de la vida
                        diaria/convivencia
                        otra según sea el caso
                    </td>
                    <td class="table-th-gris" style="text-align: center;">
                        Barreras identificadas en
                        el contexto
                        Describir. <br>
                        <span class="texto_gris">
                            Actitudinales, tecnológicas,
                            comunicativas, metodológicas,
                            infraestructura, entre otras.
                        </span>
                    </td>
                    <td class="table-th-gris" style="text-align: center;">
                        Tipo de ajuste
                        razonable -
                        facilitador <br>
                        <span class="texto_gris">
                            (Recursos o materiales, didácticas
                            o de estrategias, tiempo, metas de
                            aprendizaje, estrategias de
                            evaluación, infraestructura)
                        </span>
                    </td>
                    <td class="table-th-gris" style="text-align: center;">
                        Apoyo requerido
                        <br>
                        <span class="texto_gris">
                            (Talento humano, técnico, tecnológico, comunicativo, otro)
                        </span>
                    </td>
                    <td class="table-th-gris" style="text-align: center;">
                        Descripción de tipo de ajustes y apoyos
                        <br>
                        <span class="texto_gris">
                            Si el ajuste se realiza en la meta de
                            aprendizaje, escribir la nueva meta que
                            corresponde para el actual periodo según el
                            plan de estudios.
                            Incluir la frecuencia del ajuste y del
                            apoyo.
                        </span>
                    </td>
                    <td class="table-th-gris" style="text-align: center; width: 15%;">
                        Seguimiento
                        <br>
                        <span class="texto_gris">
                            En clave de temporalidad, responsable y
                            medios.
                        </span>
                    </td>
                </tr>
                @foreach ($piar->ajusteRazonable->items as $item)
                    <tr>
                        <td>{{ $item->area }}</td>
                        <td>{{ $item->barrera }}</td>
                        <td>{{ $item->tipo }}</td>
                        <td>{{ $item->apoyo }}</td>
                        <td>{{ $item->descripcion }}</td>
                        <td>{{ $item->seguimiento }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
</body>
</html>