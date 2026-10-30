{{--
  Laboratorio: Phaser 4.2.1 (vendor canónico) + GSAP (licencia estándar).
  En paquetes del catálogo cargar solo phaser.min.js; GSAP solo si el HUD lo necesita.
--}}
<script src="{{ asset('assets/vendor/gsap/gsap.min.js') }}"></script>
@isset($gsapPlugins)
    @foreach ((array) $gsapPlugins as $plugin)
        @php
            $file = str_ends_with($plugin, '.js') ? $plugin : ($plugin . '.min.js');
        @endphp
        <script src="{{ asset('assets/vendor/gsap/' . $file) }}"></script>
    @endforeach
@endisset
@php
    $phaserLab = $phaserLabBuild ?? 'phaser.min.js';
@endphp
<script src="{{ asset('assets/vendor/phaser/' . $phaserLab) }}"></script>
