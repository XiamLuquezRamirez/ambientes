{{-- Captura nativa (cámara / mic / video) para vista niño --}}
<script src="{{ asset('assets/js/vn-captura.js') }}?v={{ @filemtime(public_path('assets/js/vn-captura.js')) ?: time() }}"></script>
