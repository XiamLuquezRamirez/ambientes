<link rel="stylesheet" href="{{ asset('assets/css/autismo.css') }}">
<div class="modal fade modal-info-condicion modal-info-condicion-principal" id="modalInfoCondicionesPrincipal"
    tabindex="-1" aria-labelledby="modalInfoCondicionesPrincipalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl ic-modal-dialog-principal">
        <div class="modal-content ic-modal-shell ic-modal-shell-principal">
            <div class="modal-header ic-modal-header-principal border-0">
                <div class="ic-modal-header-principal-brand">
                    <span class="ic-modal-header-principal-icon" aria-hidden="true">
                        <i class="fa-solid fa-clipboard-list"></i>
                    </span>
                    <div>
                        <h5 class="modal-title fw-bold mb-1" id="modalInfoCondicionesPrincipalLabel">Condiciones</h5>
                        <p class="ic-modal-subtitulo mb-0">Selecciona una condición para ver su información.</p>
                    </div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body ic-modal-body-principal">
                <div class="ic-condiciones-grid ic-condiciones-grid-modal"
                    data-total-condiciones="{{ count($infoCondiciones) }}">
                    @foreach ($infoCondiciones as $item)
                        <button type="button" class="ic-condicion-card"
                            data-abrir-condicion="{{ $item['slug'] }}"
                            style="--ic-card-accent: {{ $item['color_accent'] ?? $item['color'] ?? '#64748B' }}">
                            <span class="ic-condicion-card-accent" aria-hidden="true"></span>
                            <span class="ic-condicion-card-main">
                                @if (!empty($item['icono']))
                                    <span class="ic-condicion-card-icon-wrap">
                                        <img src="{{ asset($item['icono']) }}" alt=""
                                            class="ic-condicion-card-icon-img">
                                    </span>
                                @else
                                    <span class="ic-condicion-card-icon-fallback"
                                        style="background: {{ $item['color_accent'] ?? $item['color'] ?? '#64748B' }};">
                                        {{ strtoupper(substr($item['nombre'], 0, 3)) }}
                                    </span>
                                @endif
                                <span class="ic-condicion-card-texto">
                                    <strong>{{ $item['nombre'] }}</strong>
                                    <small>{{ $item['descripcion_corta'] ?? '' }}</small>
                                </span>
                            </span>
                            <span class="ic-condicion-card-arrow" aria-hidden="true">
                                <i class="fa-solid fa-chevron-right"></i>
                            </span>
                        </button>
                    @endforeach
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade modal-info-condicion modal-info-condicion-detalle" id="modalInfoCondicion" tabindex="-1"
    aria-hidden="true">
    <button type="button" class="ic-btn-volver-exterior ic-btn-volver-principal" aria-label="Volver a condiciones">
        <i class="fa-solid fa-arrow-left"></i> Volver
    </button>
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl"
        style="width: 90vw !important; max-width: 90vw;">
        <div class="modal-content ic-modal-shell">
            <div class="modal-body ic-modal-body-padded">
                @foreach ($infoCondicionesDetalle as $slug => $condicion)
                    @include('info-condiciones.partials.panel-condicion', [
                        'condicion' => $condicion,
                        'condicionActivaSlug' => null,
                        'servicio' => $infoCondicionesServicio,
                    ])
                @endforeach
            </div>
        </div>
    </div>
</div>

<div class="modal fade modal-info-condicion modal-info-condicion-contenido" id="modalInfoCondicionContenido"
    tabindex="-1" aria-labelledby="modalInfoCondicionContenidoTitulo" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <div class="modal-content ic-modal-shell" style="background-color: transparent !important;">
            <div class="modal-header ic-modal-header-contenido border-0">
                <h5 class="modal-title fw-bold" id="modalInfoCondicionContenidoTitulo"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <button type="button" class="btn-close ic-btn-cerrar-seccion" data-bs-dismiss="modal"
                aria-label="Cerrar"></button>
            <div class="modal-body ic-modal-body-padded ic-modal-body-contenido">
                <div id="modalInfoCondicionContenidoBody" class="ic-contenido-html">
                    <div id="ic-contenido-html-dinamico" class="d-none"></div>
                    @php
                        $imgAutismo = 'assets/images/img_autismo';
                    @endphp
                    <div class="autismo-page ic-condicion-pagina" style="display: none;">
                        <section class="autismo-section condicion-seccion" id="apartado-1" style="display: none;">
                            <div class="section-header">
                                <div class="section-number">1</div>
                                <h2>¿Qué es el Trastorno del Espectro Autista (TEA)?</h2>
                            </div>
                            <div class="section-content">
                                <div class="quote">
                                    “Si el niño no aprende por el camino que el maestro le enseña,
                                    el maestro tiene que enseñarle por el camino que el alumno aprende”
                                    (Rita Dunn)
                                </div>
                                <h3>AUTISMO</h3>
                                <h3>¿QUÉ ES EL TRASTORNO DEL ESPECTRO AUTISTA?</h3>
                                <div class="row">
                                    <div class="col-md-9">
                                        <p>
                                            El Trastorno del Espectro Autista (TEA) es una condición del
                                            neurodesarrollo que afecta principalmente la forma en que la persona se
                                            comunica, interactúa con los demás y comprende el entorno. También puede
                                            manifestarse mediante intereses muy específicos, necesidad de mantener
                                            rutinas, comportamientos repetitivos o una respuesta diferente a los
                                            estímulos sensoriales, como sonidos, luces, texturas o movimientos.
                                            Estas características se presentan desde la infancia y pueden variar
                                            ampliamente entre una persona y otra (American Psychiatric Association, 2013)
                                        </p>
                                        <p>
                                            El término “espectro” refleja la amplia variabilidad en la forma en que
                                            se manifiesta: desde niños con grandes habilidades cognitivas y lenguaje
                                            fluido hasta niños con discapacidad intelectual asociada y comunicación no
                                            verbal. Estas características no representan una incapacidad para aprender,
                                            sino una forma diferente de procesar la información y relacionarse con el
                                            entorno. En consecuencia, son los contextos educativos los que deben
                                            adaptarse para garantizar una participación plena y efectiva.
                                        </p>
                                    </div>
                                    <div class="col-md-3">
                                        <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 1_3x.png') }}"
                                            alt="Imagen 1" style="height: 250px;">
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-2" style="text-align: center;">
                                        <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 2_3x.png') }}"
                                            alt="Imagen 1" style="height: 160px;">
                                    </div>
                                    <div class="col-md-10">
                                        <p>
                                            Desde un enfoque de inclusión educativa, el autismo no debe entenderse
                                            como una limitación individual, sino como una condición cuya participación
                                            depende, en gran medida, de la capacidad de la escuela para eliminar
                                            barreras y generar oportunidades de aprendizaje accesibles para todos.
                                            Por ello, garantizar ajustes razonables constituye una obligación legal,
                                            ética y pedagógica que promueve el desarrollo integral, la permanencia
                                            escolar y el ejercicio pleno del derecho a la educación.
                                        </p>
                                    </div>
                                </div>
                                <p class="card-azul">
                                    <img src="{{ asset($imgAutismo . '/Mesa de trabajo 3_3x.png') }}" alt="Imagen 1"
                                        style="height: 80px; float: left; margin-right: 12px;">
                                    El 2 de abril de cada año se celebra el Día Mundial de Concienciación
                                    sobre el Autismo, un evento que fue proclamado por la Asamblea General
                                    de las Naciones Unidas en 2007 con el objetivo de promover una mayor
                                    comprensión, sensibilización y aceptación del trastorno del espectro
                                    autista (TEA). Este día busca visibilizar tanto los desafíos como las
                                    fortalezas asociadas con el autismo.
                                </p>
                            </div>
                        </section>

                        <section class="autismo-section condicion-seccion" id="apartado-2" style="display: none;">
                            <div class="section-header">
                                <div class="section-number">2</div>
                                <h2>Señales de alerta</h2>
                            </div>
                            <div class="section-content">
                                <div class="text-center">
                                    <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 5_3x.png') }}"
                                        alt="Imagen 1" style="height: 400px; margin-bottom: 80px;">
                                    <br>
                                    <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 6_3x.png') }}"
                                        alt="Imagen 1" style="height: 400px;">
                                    <br>
                                    <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 7_3x.png') }}"
                                        alt="Imagen 1" style="height: 400px;">
                                </div>
                                <h3>A partir de los 5 años:</h3>
                                <div class="bocadillo-contenedor">
                                    <div class="bocadillo">
                                        <p>
                                            Comprobar si los síntomas anteriormente descritos están presentes o lo
                                            han estado. En algunos estudiantes con manifestaciones más “leves” del
                                            Trastorno del Espectro Autista (TEA), pueden evidenciarse a)
                                            dificultades para participar de manera espontánea en juegos o
                                            actividades compartidas con sus compañeros. b) es posible que prefieran
                                            permanecer solos durante el recreo u otros espacios de interacción, o
                                            que abandonen rápidamente los juegos grupales al presentar dificultades
                                            para comprender las reglas o el rol que debe desempeñar. c) puede
                                            observarse un interés muy intenso por determinadas actividades o temas,
                                            dedicándoles gran parte de su tiempo y mostrando poca flexibilidad para
                                            cambiar hacia otras propuestas.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section class="autismo-section condicion-seccion" id="apartado-3" style="display: none;">
                            <div class="section-header">
                                <div class="section-number">3</div>
                                <h2>Niveles de apoyo TEA</h2>
                            </div>
                            <div class="section-content">
                                <h3>NIVELES DE APOYO (TEA)</h3>
                                <p style="display: flow-root; width: 100%;">
                                    <img src="{{ asset($imgAutismo . '/Mesa de trabajo 8_3x.png') }}"
                                        alt="Niveles de apoyo TEA"
                                        style="float: right; margin-left: 15px; height: 200px;">
                                    El DSM-5 establece tres niveles de apoyo para el Trastorno del Espectro
                                    Autista. Esta clasificación ayuda a comprender que cada estudiante
                                    presenta necesidades diferentes y que los apoyos educativos deben
                                    ajustarse de manera individual para favorecer su aprendizaje y
                                    participación en el entorno escolar (American Psychiatric Association, 2013).
                                </p>
                                <div class="text-center">
                                    <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 9_3x.png') }}"
                                        alt="Imagen 1" style="height: 600px;">
                                </div>
                                <div class="text-center">
                                    <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 10_3x.png') }}"
                                        alt="Imagen 1" style="height: 600px;">
                                </div>
                                <div class="text-center">
                                    <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 11_3x.png') }}"
                                        alt="Imagen 1" style="height: 600px;">
                                </div>
                                <div class="text-center">
                                    <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 12_3x.png') }}"
                                        alt="Imagen 1" style="height: 600px;">
                                </div>
                            </div>
                        </section>

                        <section class="autismo-section condicion-seccion" id="apartado-4" style="display: none;">
                            <div class="section-header">
                                <div class="section-number">4</div>
                                <h2>Perfil sensorial en primera infancia</h2>
                            </div>
                            <div class="section-content">
                                <h3>PERFIL SENSORIAL DEL TRASTORNO DEL ESPECTRO AUTISTA (TEA)</h3>
                                <div class="d-flex justify-content-center">
                                    <div>
                                        <p>
                                            Los estudiantes con Trastorno del Espectro Autista (TEA) pueden
                                            presentar diferencias en el procesamiento de la información sensorial.
                                            Estas pueden manifestarse como hipersensibilidad, (cuando reaccionan de
                                            manera intensa ante determinados estímulos), o hiposensibilidad,
                                            (cuando requieren estímulos más fuertes para percibir o responder a ellos).
                                            En otras palabras, su umbral sensorial puede ser más bajo o más alto que
                                            el de otras personas.
                                        </p>
                                        <p>
                                            Por ejemplo, algunos estudiantes presentan una alta sensibilidad a los
                                            sonidos, percibiendo ruidos cotidianos con una intensidad que puede
                                            resultar incómoda o incluso dolorosa. Situaciones que para la mayoría
                                            de las personas pasan desapercibidas, como el ruido de un ventilador,
                                            el timbre escolar o varias conversaciones simultáneas, pueden generar
                                            malestar, ansiedad o sobrecarga sensorial.
                                        </p>
                                    </div>
                                    <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 13_3x.png') }}"
                                        alt="Imagen 1" style="height: 300px; margin-left: 20px;">
                                </div>
                                <div class="d-flex justify-content-center">
                                    <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 14_3x.png') }}"
                                        alt="Imagen 1" style="height: 500px; margin-left: 20px;">
                                </div>
                                <h3 class="titulo-seccion" style="text-align: center;">SISTEMA SENSORIAL</h3>
                                <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 15_3x.png') }}"
                                    alt="Imagen 1" style="height: 800px; margin-left: 20px;">
                                <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 16_3x.png') }}"
                                    alt="Imagen 1" style="height: 800px; margin-left: 20px;">
                                <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 17_3x.png') }}"
                                    alt="Imagen 1" style="height: 800px; margin-left: 20px;">
                                <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 18_3x.png') }}"
                                    alt="Imagen 1" style="height: 800px; margin-left: 20px;">
                                <br>
                                <br>
                                <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 19_3x.png') }}"
                                    alt="Imagen 1" style="height: 800px; margin-left: 20px;">
                                <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 20_3x.png') }}"
                                    alt="Imagen 1" style="height: 800px; margin-left: 20px;">
                                <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 21_3x.png') }}"
                                    alt="Imagen 1" style="height: 800px; margin-left: 20px;">
                                <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 22_3x.png') }}"
                                    alt="Imagen 1" style="height: 800px; margin-left: 20px;">
                            </div>
                        </section>

                        <section class="autismo-section condicion-seccion" id="apartado-5" style="display: none;">
                            <div class="section-header">
                                <div class="section-number">5</div>
                                <h2>Estrategias pedagógicas</h2>
                            </div>
                            <div class="section-content">
                                <h3>ESTRATEGIAS PEDAGÓGICAS PARA PRIMERA INFANCIA CON TEA.</h3>
                                <p>
                                    La educación eficaz para promover el aprendizaje y lograr el bienestar
                                    del niño o niña con autismo y su familia, debe apoyarse en la organización
                                    de un contexto natural estable que les permita la comprensión de los
                                    sucesos que tienen lugar. Una estabilidad de condiciones que la persona
                                    pueda reconocer, sobre las que pueda actuar y que pueda transformar.
                                </p>
                                <ul>
                                    <li class="d-flex align-items-center card-azul p-3">
                                        <h3 style="font-size: 24px; font-weight: 100">
                                            <span style="font-weight: bold; color: #1e78ff; font-size: 24px;">Comunicación aumentativa y alternativa:</span>
                                            Usar sistemas de apoyo para la comunicación cuando el lenguaje oral es
                                            limitado: Pictogramas, tableros de comunicación, objetos reales
                                            como apoyo visual.
                                        </h3>
                                        <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 23_3x.png') }}"
                                            alt="Imagen 1" style="height: 200px; margin-left: 20px;">
                                    </li>
                                    <li class="d-flex align-items-center card-azul p-3">
                                        <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 24_3x.png') }}"
                                            alt="Imagen 1" style="height: 200px; margin-right: 20px;">
                                        <h3 style="font-size: 24px; font-weight: 100">
                                            <span style="font-weight: bold; color: #1e78ff; font-size: 24px;">Estructura visual del entorno:</span>
                                            El ambiente predecible reduce la ansiedad y facilita la participación;
                                            es importante que en el aula haya horario visual, marcación del espacio,
                                            zonas claramente diferenciadas, donde el niño o niña saben y conocen las
                                            pautas básicas de comportamiento, tienen seguridad de lo que se espera
                                            de ellos/as, el adulto dirige y organiza las situaciones.
                                        </h3>
                                    </li>
                                    <li class="d-flex align-items-center card-azul p-3">
                                        <h3 style="font-size: 24px; font-weight: 100">
                                            <span style="font-weight: bold; color: #1e78ff; font-size: 24px;">Rutinas predecibles:</span>
                                            Las rutinas fijas reducen la incertidumbre y favorecen la autorregulación;
                                            es importante que haya un mismo orden de actividades y avisos anticipados
                                            ante cambios, que el niño tenga conocimiento de cómo van a suceder las
                                            cosas y qué esperan los adultos de ellos/ellas.
                                        </h3>
                                        <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 25_3x.png') }}"
                                            alt="Imagen 1" style="height: 400px; margin-left: 20px;">
                                    </li>
                                    <li class="d-flex align-items-center card-azul p-3">
                                        <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 26_3x.png') }}"
                                            alt="Imagen 1" style="height: 400px; margin-right: 20px;">
                                        <h3 style="font-size: 24px; font-weight: 100">
                                            <span style="font-weight: bold; color: #1e78ff; font-size: 24px;">Trabajo en entornos de baja estimulación:</span>
                                            Reducir estímulos sensoriales innecesarios para facilitar el foco: Zona de
                                            trabajo tranquila, iluminación adecuada, reducir ruido de fondo.
                                        </h3>
                                    </li>
                                    <li class="d-flex align-items-center card-azul p-3">
                                        <h3 style="font-size: 24px; font-weight: 100">
                                            <span style="font-weight: bold; color: #1e78ff; font-size: 24px;">Intereses del niño como motor de aprendizaje:</span>
                                            El tipo de materiales que se utilice será definitivo en el desarrollo
                                            de las habilidades del niño o niña con autismo, teniendo en cuenta
                                            su tendencia a centrar más la atención en los objetos que en las
                                            personas. Es importante seleccionar objetos que faciliten la
                                            interacción social, prefiriendo aquéllos hacia los cuales se siente
                                            atraído con facilidad; conectar el aprendizaje con los intereses
                                            específicos del niño, ejemplo: Si le gustan los trenes, usar trenes
                                            para enseñar colores, números, etc.
                                        </h3>
                                        <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 27_3x.png') }}"
                                            alt="Imagen 1" style="height: 200px; margin-left: 20px;">
                                    </li>
                                    <li class="d-flex align-items-center card-azul p-3">
                                        <h3 style="font-size: 24px; font-weight: 100">
                                            <span style="font-weight: bold; color: #1e78ff; font-size: 24px;">Anticipación de cambios:</span>
                                            Avisar con tiempo sobre cambios de actividad o rutina. Ejemplo: en 5
                                            minutos terminamos, usar relojes visuales o temporizadores.
                                        </h3>
                                        <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 28_3x.png') }}"
                                            alt="Imagen 1" style="height: 200px; margin-left: 20px;">
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section class="autismo-section condicion-seccion" id="apartado-6" style="display: none;">
                            <div class="section-header">
                                <div class="section-number">6</div>
                                <h2>Ajustes razonables y estrategias de apoyo</h2>
                            </div>
                            <div class="section-content">
                                <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 29_3x.png') }}"
                                    alt="Imagen 1" style="width: 100%; height: auto;">
                                <div class="source">
                                    Fuente: Elaboración propia con base en Glosario de apoyos educativos y
                                    ajustes razonables para garantizar la participación plena de estudiantes
                                    con discapacidad: Documento de información (UNESCO, 2023).
                                </div>
                            </div>
                        </section>

                        <section class="autismo-section condicion-seccion" id="apartado-7" style="display: none;">
                            <div class="section-header">
                                <div class="section-number">7</div>
                                <h2>¿Qué debe evitar el docente?</h2>
                            </div>
                            <div class="section-content">
                                <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 30_3x.png') }}"
                                    alt="Imagen 1" style="width: 100%; height: auto;">
                                <div class="info-box">
                                    No es el estudiante quien debe adaptarse completamente al sistema
                                    educativo; es el entorno educativo el que debe eliminar las barreras
                                    para el aprendizaje y la participación mediante apoyos y ajustes
                                    razonables. Este principio orienta la educación inclusiva en Colombia
                                    y debe guiar todas las decisiones pedagógicas relacionadas con los
                                    estudiantes con autismo.
                                </div>
                            </div>
                        </section>

                        <section class="autismo-section condicion-seccion" id="apartado-8" style="display: none;">
                            <div class="section-header">
                                <div class="section-number">8</div>
                                <h2>Mitos y realidades</h2>
                            </div>
                            <div class="section-content">
                                <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 31_3x.png') }}"
                                    alt="Imagen 1" style="width: 100%; height: auto;">
                            </div>
                        </section>

                        <section class="autismo-section condicion-seccion" id="apartado-9" style="display: none;">
                            <div class="section-header">
                                <div class="section-number">9</div>
                                <h2>¿Qué hacer ante la sospecha de que un niño o niña pueda presentar autismo?</h2>
                            </div>
                            <div class="section-content">
                                <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 32_3x.png') }}"
                                    alt="Imagen 1" style="width: 100%; height: auto;">
                            </div>
                        </section>

                        <section class="autismo-section condicion-seccion" id="apartado-10" style="display: none;">
                            <div class="section-header">
                                <div class="section-number">10</div>
                                <h2>Orientaciones para la familia</h2>
                            </div>
                            <div class="section-content">
                                <h3>ORIENTACIONES PARA LA FAMILIA.</h3>
                                <p>
                                    Con el propósito de fortalecer el trabajo conjunto entre la familia
                                    y la institución educativa, es importante que el docente brinde
                                    orientaciones claras y prácticas a los padres de familia, promoviendo
                                    estrategias que favorezcan el desarrollo integral, la autonomía y la
                                    participación activa del estudiante tanto en el hogar como en el
                                    contexto escolar.
                                </p>
                                <p>A continuación, se presentan algunas recomendaciones.</p>
                                <ul>
                                    <div class="d-flex align-items-center">
                                        <div>
                                            <li>
                                                Explicar a los padres la importancia de establecer rutinas claras
                                                y predecibles en el hogar, ya que estas brindan seguridad y facilitan
                                                la adaptación a las actividades diarias.
                                            </li>
                                            <li>
                                                Orientar a la familia sobre el uso de apoyos visuales (pictogramas,
                                                calendarios, secuencias de actividades o imágenes) para favorecer
                                                la comprensión de instrucciones y anticipar cambios.
                                            </li>
                                            <li>
                                                Recomendar que se fomente la autonomía del niño o niña en actividades
                                                de la vida diaria, permitiéndole realizar tareas acordes con su edad
                                                y nivel de desarrollo.
                                            </li>
                                        </div>
                                        <img class="img-fluid" src="{{ asset($imgAutismo . '/Mesa de trabajo 33_3x.png') }}"
                                            alt="Imagen 1" style="height: 200px; margin-left: 20px;">
                                    </div>
                                    <li>
                                        Invitar a los padres a reforzar positivamente los logros y esfuerzos
                                        del estudiante, utilizando elogios, reconocimiento y motivadores que
                                        favorezcan su participación.
                                    </li>
                                    <li>
                                        Sugerir que las normas y los límites en el hogar sean claros,
                                        consistentes y comunicados de manera sencilla, evitando mensajes
                                        contradictorios.
                                    </li>
                                    <li>
                                        Recomendar que se respeten los intereses, el ritmo de aprendizaje
                                        y las características individuales del estudiante, evitando
                                        comparaciones con otros niños.
                                    </li>
                                    <li>
                                        Orientar a la familia sobre la importancia de anticipar cambios
                                        en las rutinas o eventos especiales para reducir la ansiedad y
                                        facilitar la adaptación.
                                    </li>
                                    <li>
                                        Motivar a los padres a mantener una comunicación constante con los
                                        profesionales de salud y educación que acompañan al estudiante,
                                        favoreciendo un trabajo articulado entre familia, escuela y
                                        especialistas.
                                    </li>
                                    <li>
                                        Recomendar que, ante cambios significativos en el comportamiento,
                                        el desarrollo o las habilidades del estudiante, informen
                                        oportunamente a la institución educativa para definir estrategias
                                        de apoyo de manera conjunta.
                                    </li>
                                    <li>
                                        Fomentar en la familia una visión basada en las capacidades,
                                        intereses y potencialidades del estudiante, promoviendo expectativas
                                        realistas y oportunidades de participación en diferentes contextos.
                                    </li>
                                    <li>
                                        Recordar a los padres que el bienestar emocional del estudiante
                                        se fortalece cuando existe coherencia entre las estrategias
                                        utilizadas en el hogar y las implementadas en la institución
                                        educativa.
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section class="bibliografia condicion-seccion" style="display: none;">
                            <h2>Bibliografía</h2>
                            <p>
                                American Psychiatric Association. (2013). Manual diagnóstico y estadístico
                                de los trastornos mentales (5.ª ed.). Editorial Médica Panamericana.
                            </p>
                            <p>
                                Chile. Ministerio de Educación. División de Educación General. Unidad de
                                Educación Especial. (2008). Necesidades educativas especiales asociadas al
                                autismo (Guía de apoyo técnico-pedagógico: Necesidades educativas especiales
                                en el nivel de Educación Parvularia). Ministerio de Educación de Chile.
                                <br>
                                <a href="https://especial.mineduc.cl/wp-content/uploads/sites/31/2016/08/GuiaAutismo.pdf"
                                    target="_blank">
                                    https://especial.mineduc.cl/wp-content/uploads/sites/31/2016/08/GuiaAutismo.pdf
                                </a>
                            </p>
                            <p>
                                Federación Autismo Castilla y León. (2024). Guía para profesores y educadores
                                de alumnos con autismo (4.ª ed. revisada y mejorada). Federación Autismo
                                Castilla y León.
                                <br>
                                <a href="https://autismocastillayleon.com/wp-content/uploads/2024/01/guia_para_profesores_y_educadores_de_alumnos_con_autismo4.pdf"
                                    target="_blank">
                                    https://autismocastillayleon.com/wp-content/uploads/2024/01/guia_para_profesores_y_educadores_de_alumnos_con_autismo4.pdf
                                </a>
                            </p>
                            <p>
                                Instituto Colombiano de Bienestar Familiar. (2010). Orientaciones
                                pedagógicas para la atención y la promoción de la inclusión de niñas y
                                niños menores de seis años con autismo. Instituto Colombiano de Bienestar
                                Familiar.
                                <br>
                                <a href="https://www.icbf.gov.co/sites/default/files/cartilla-autismo-5.pdf"
                                    target="_blank">
                                    https://www.icbf.gov.co/sites/default/files/cartilla-autismo-5.pdf
                                </a>
                            </p>
                            <p>
                                Martínez-Levy, G. A., et al. (2014). Autismo: mitos y realidades científicas.
                                Revista Médica de la Universidad Veracruzana, 14(1).
                                <br>
                                <a href="https://www.uv.mx/rm/num_anteriores/revmedica_vol14_num1/articulos/autismo.pdf"
                                    target="_blank">
                                    https://www.uv.mx/rm/num_anteriores/revmedica_vol14_num1/articulos/autismo.pdf
                                </a>
                            </p>
                            <p>
                                Ministerio de Educación Nacional. (2006). Orientaciones pedagógicas para
                                la atención educativa a estudiantes con autismo (Guía No. 13). Revolución
                                Educativa Al Tablero.
                                <br>
                                fundacionintegrar.org
                            </p>
                            <p>
                                Moreno, M., 2023, Glosario de apoyos educativos y ajustes razonables para
                                garantizar la participación plena de estudiantes con discapacidad.
                                Documento encargado por la Oficina Regional de Educación para América
                                Latina y el Caribe (OREALC/UNESCO Santiago). UNESCO 2023.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    window.INFO_CONDICIONES_MAP = @json($infoCondicionesMapa);
</script>
