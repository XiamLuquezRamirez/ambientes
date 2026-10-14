<div class="card profile-card">
    <div class="card-body">
        <h5 class="section-title">
            Seguridad
        </h5>

        <div class="security-item">
            <div class="security-label">
                <i class="fa-solid fa-clock-rotate-left text-success"></i>
                <span>Último acceso</span>
            </div>
            <div class="text-end">
                <strong>
                    @if ($ultimoAcceso ?? null)
                        {{ $ultimoAcceso['fecha'] }}
                    @else
                        {{ optional($usuario->ultimoLogin)->fecha?->format('d/m/Y H:i') ?? 'Sin registros' }}
                    @endif
                </strong>
                @if ($ultimoAcceso ?? null)
                    <div class="text-muted small">
                        IP: {{ $ultimoAcceso['ip'] }} · {{ $ultimoAcceso['fecha_relativa'] }}
                    </div>
                @elseif (optional($usuario->ultimoLogin)->fecha)
                    <div class="text-muted small">
                        {{ $usuario->ultimoLogin->fecha->diffForHumans() }}
                    </div>
                @endif
            </div>
        </div>

        <div class="security-item">
            <div class="security-label">
                <i class="fa-solid fa-key text-warning"></i>
                <span>Último cambio de contraseña</span>
            </div>
            <div class="text-end">
                <strong id="perfilUltimoCambioContrasena">
                    {{ optional($usuario->ultimoCambioContrasena)->fecha?->format('d/m/Y H:i') ?? 'Nunca' }}
                </strong>
                <div id="perfilUltimoCambioContrasenaRelativo" class="text-muted small">
                    {{ optional($usuario->ultimoCambioContrasena)->fecha?->diffForHumans() }}
                </div>
            </div>
        </div>

        <hr class="my-4">

        <h6 class="section-subtitle mb-3">
            <i class="fa-solid fa-lock me-2"></i>
            Cambiar contraseña
        </h6>

        <form id="formCambiarContrasenaSeguridad" method="POST" novalidate>
            @csrf
            <input type="hidden" name="_method" value="PUT">
            @include('perfil.partials._campos_cambiar_contrasena', [
                'formId' => 'formCambiarContrasenaSeguridad',
                'prefix' => 'seguridad',
            ])
            <div class="d-flex justify-content-end">
                <button type="submit" id="btnCambiarContrasenaSeguridad" class="btn btn-primary">
                    <i class="fa-solid fa-key me-2"></i>
                    Actualizar contraseña
                </button>
            </div>
        </form>

        @if ($usuario->esDocente() && $usuario->docente)
            <hr class="my-4">

            <h6 class="section-subtitle mb-3">
                <i class="fa-solid fa-universal-access me-2"></i>
                PIN de accesibilidad
            </h6>
            <p class="text-muted small mb-3">
                Los 4 dígitos para abrir la accesibilidad de los juegos. Tiene que ser distinto al de los otros docentes del colegio.
            </p>

            <form id="formPinAccesibilidad" method="POST" novalidate>
                @csrf
                <input type="hidden" name="_method" value="PUT">
                <div class="row g-3">
                    <div class="col-md-4">
                        <div class="mb-3">
                            <strong class="form-label">PIN</strong>
                            <input type="text" id="pin_accesibilidad" name="pin_accesibilidad" class="form-control"
                                inputmode="numeric" maxlength="4" pattern="\d{4}" autocomplete="off"
                                value="{{ $usuario->docente->pin_accesibilidad }}" required>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="mb-3">
                            <strong class="form-label">Contraseña actual</strong>
                            <input type="password" id="pin_password_actual" name="password_actual" class="form-control"
                                placeholder="Tu contraseña actual" autocomplete="off" required>
                        </div>
                    </div>
                </div>
                <div class="d-flex justify-content-end">
                    <button type="submit" id="btnPinAccesibilidad" class="btn btn-primary">
                        <i class="fa-solid fa-check me-2"></i>
                        Guardar PIN
                    </button>
                </div>
            </form>
        @endif
    </div>
</div>

@if ($usuario->esDocente() && $usuario->docente)
    @push('scripts')
        <script>
            (function () {
                const form = document.getElementById('formPinAccesibilidad');
                if (!form || form.dataset.listo === '1') return;
                form.dataset.listo = '1';

                const pin = document.getElementById('pin_accesibilidad');
                const btn = document.getElementById('btnPinAccesibilidad');
                const csrf = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

                pin?.addEventListener('input', function () {
                    pin.value = pin.value.replace(/\D/g, '').slice(0, 4);
                });

                function limpiarErrores() {
                    form.querySelectorAll('.campo-error').forEach(function (el) { el.remove(); });
                    form.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
                }

                function mostrarErrores(errors) {
                    limpiarErrores();
                    Object.entries(errors || {}).forEach(function (par) {
                        const input = form.querySelector('[name="' + par[0] + '"]');
                        if (!input) return;
                        input.classList.add('is-invalid');
                        const div = document.createElement('div');
                        div.className = 'campo-error';
                        div.textContent = Array.isArray(par[1]) ? par[1][0] : par[1];
                        input.insertAdjacentElement('afterend', div);
                    });
                }

                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    limpiarErrores();
                    if (!/^\d{4}$/.test(pin.value)) {
                        mostrarErrores({ pin_accesibilidad: ['El PIN tiene 4 dígitos.'] });
                        return;
                    }
                    btn.disabled = true;
                    fetch(@json(route('panel.perfil.pin-accesibilidad')), {
                        method: 'POST',
                        headers: {
                            'X-CSRF-TOKEN': csrf,
                            'X-Requested-With': 'XMLHttpRequest',
                            'Accept': 'application/json',
                        },
                        body: new FormData(form),
                    })
                    .then(function (res) {
                        return res.json().then(function (data) {
                            return { ok: res.ok, status: res.status, data: data };
                        });
                    })
                    .then(function (resultado) {
                        if (!resultado.ok || !resultado.data.success) {
                            if (resultado.status === 422 && resultado.data.errors) {
                                mostrarErrores(resultado.data.errors);
                            }
                            throw new Error(resultado.data.message || 'No se pudo guardar el PIN.');
                        }
                        if (resultado.data.pin_accesibilidad) pin.value = resultado.data.pin_accesibilidad;
                        document.getElementById('pin_password_actual').value = '';
                        mostrarToast('success', resultado.data.message);
                    })
                    .catch(function (err) {
                        mostrarToast('error', err.message || 'No se pudo guardar el PIN.');
                    })
                    .finally(function () { btn.disabled = false; });
                });
            })();
        </script>
    @endpush
@endif
