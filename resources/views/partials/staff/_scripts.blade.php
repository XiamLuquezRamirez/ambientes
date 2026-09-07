@include('partials.info-condiciones.embed')
<script src="{{ asset('assets/css/bootstrap/js/bootstrap.bundle.min.js') }}"></script>
<script src="{{ asset('assets/js/sidebar-toggle.js') }}"></script>
<script src="{{ asset('assets/js/info-condiciones/index.js') }}"></script>
<script src="{{ asset('assets/js/sweetalert.js') }}"></script>
<script src="{{ asset('assets/js/staff-shell.js') }}"></script>
@if (session('success'))
    <script>
        document.addEventListener('DOMContentLoaded', () => mostrarToast('success', @json(session('success'))));
    </script>
@endif
@if (session('error'))
    <script>
        document.addEventListener('DOMContentLoaded', () => mostrarToast('error', @json(session('error'))));
    </script>
@endif
@if (session('info'))
    <script>
        document.addEventListener('DOMContentLoaded', () => mostrarToast('info', @json(session('info'))));
    </script>
@endif
@stack('scripts')
