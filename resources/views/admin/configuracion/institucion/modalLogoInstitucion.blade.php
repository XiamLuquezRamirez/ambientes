{{--
    Modal logo institución (Admin).
    Solo reemplazo: POST admin/configuracion/logo (institución de sesión).
--}}
<div class="modal fade modal-app" id="modalLogoInstitucion" tabindex="-1" aria-labelledby="modalLogoInstitucionLabel"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <h5 class="modal-title" id="modalLogoInstitucionLabel">Logo de la institución</h5>
                    <p class="modal-subtitle mb-0">Sube una imagen JPG o PNG de hasta 2 MB.</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
                <div class="profile-avatar-preview" id="previewLogoInstitucion">
                    <img src="" alt="Previsualización del logo" id="previewLogoInstitucionImagen" class="d-none">
                    <div class="placeholder" id="previewLogoInstitucionPlaceholder">
                        <i class="fa-solid fa-university fa-2x mb-2"></i>
                        <div>Logo</div>
                    </div>
                </div>

                <form id="formLogoInstitucion" enctype="multipart/form-data">
                    @csrf
                    <input type="file" class="form-control" id="inputLogoInstitucion" name="logo"
                        accept=".jpg,.jpeg,.png,image/jpeg,image/png">
                    <div class="form-text">Formatos permitidos: JPG, PNG. Tamaño máximo: 2 MB.</div>

                    <div class="profile-avatar-actions">
                        <button type="submit" class="btn btn-primary" id="btnGuardarLogoInstitucion">
                            <i class="fa-solid fa-floppy-disk"></i> Guardar logo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        (function() {
            const URL_LOGO = @json(route('admin.configuracion.logo'));
            const CSRF = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

            const modalLogo = document.getElementById('modalLogoInstitucion');
            const inputLogo = document.getElementById('inputLogoInstitucion');
            const formLogo = document.getElementById('formLogoInstitucion');
            const previewImg = document.getElementById('previewLogoInstitucionImagen');
            const previewPlaceholder = document.getElementById('previewLogoInstitucionPlaceholder');
            const btnGuardar = document.getElementById('btnGuardarLogoInstitucion');
            const avatarImg = document.getElementById('logoPerfilImagen');
            const avatarIniciales = document.getElementById('logoPerfilIniciales');

            let previewUrl = null;
            let tieneLogoActual = false;
            let logoActualUrl = null;
            let inicialesActuales = 'IE';
            let institucionIdActual = null;

            modalLogo?.addEventListener('hidden.bs.modal', resetModalLogo);

            inputLogo?.addEventListener('change', function() {
                const archivo = this.files?.[0];
                if (!archivo) {
                    mostrarPreviewLogo(tieneLogoActual ? logoActualUrl : null);
                    return;
                }

                const error = validarArchivoLogo(archivo);
                if (error) {
                    mostrarToast('error', error);
                    this.value = '';
                    mostrarPreviewLogo(tieneLogoActual ? logoActualUrl : null);
                    return;
                }

                if (previewUrl) URL.revokeObjectURL(previewUrl);
                previewUrl = URL.createObjectURL(archivo);
                mostrarPreviewLogo(previewUrl);
            });

            formLogo?.addEventListener('submit', async function(event) {
                event.preventDefault();

                const archivo = inputLogo?.files?.[0];
                if (!archivo) {
                    mostrarToast('error', 'Selecciona una imagen antes de guardar.');
                    return;
                }

                const error = validarArchivoLogo(archivo);
                if (error) {
                    mostrarToast('error', error);
                    return;
                }

                if (!institucionIdActual) {
                    mostrarToast('error', 'No se identificó la institución.');
                    return;
                }

                setBtnGuardarLogo('guardando');

                try {
                    const formData = new FormData();
                    formData.append('logo', archivo);

                    const response = await fetch(URL_LOGO, {
                        method: 'POST',
                        headers: {
                            'X-CSRF-TOKEN': CSRF,
                            'Accept': 'application/json',
                        },
                        body: formData,
                    });
                    const data = await response.json();

                    if (!response.ok || !data.success) {
                        throw new Error(data.message || 'No se pudo guardar el logo.');
                    }

                    actualizarAvatarInstitucion(data.logo_url_publica, data.iniciales);
                    logoActualUrl = data.logo_url_publica;
                    tieneLogoActual = true;
                    inicialesActuales = data.iniciales || inicialesActuales;
                    window.logoInstitucionActualUrl = logoActualUrl;
                    window.logoInstitucionIniciales = inicialesActuales;

                    bootstrap.Modal.getInstance(modalLogo)?.hide();
                    mostrarToast('success', data.message || 'Logo guardado correctamente.');
                } catch (err) {
                    mostrarToast('error', err.message || 'No se pudo guardar el logo.');
                } finally {
                    setBtnGuardarLogo('listo');
                }
            });

            window.cambiarLogoInstitucion = function(opts = {}) {
                institucionIdActual = opts.id ?? window.idInstitucionEditando ?? null;
                logoActualUrl = opts.logoUrl ?? window.logoInstitucionActualUrl ?? null;
                inicialesActuales = opts.iniciales ?? window.logoInstitucionIniciales ?? 'IE';
                tieneLogoActual = Boolean(logoActualUrl);

                resetModalLogo();
                mostrarPreviewLogo(tieneLogoActual ? logoActualUrl : null);
                bootstrap.Modal.getOrCreateInstance(modalLogo).show();
            };

            window.cambiarLogoPerfil = function() {
                window.cambiarLogoInstitucion({
                    id: window.idInstitucionEditando || null,
                    logoUrl: window.logoInstitucionActualUrl || null,
                    iniciales: window.logoInstitucionIniciales || 'IE',
                });
            };

            window.setEstadoLogoInstitucion = function({
                id = null,
                logoUrl = null,
                iniciales = 'IE'
            } = {}) {
                window.idInstitucionEditando = id;
                window.logoInstitucionActualUrl = logoUrl;
                window.logoInstitucionIniciales = iniciales;
                institucionIdActual = id;
                logoActualUrl = logoUrl;
                inicialesActuales = iniciales;
                tieneLogoActual = Boolean(logoUrl);
                actualizarAvatarInstitucion(logoUrl, iniciales);
            };

            function validarArchivoLogo(archivo) {
                const tiposValidos = ['image/jpeg', 'image/png', 'image/jpg'];
                if (!tiposValidos.includes(archivo.type)) {
                    return 'Solo se permiten archivos JPG o PNG.';
                }
                if (archivo.size > 2 * 1024 * 1024) {
                    return 'La imagen supera el tamaño máximo de 2 MB.';
                }
                return null;
            }

            function mostrarPreviewLogo(url) {
                if (url && previewImg) {
                    previewImg.src = url;
                    previewImg.classList.remove('d-none');
                    previewPlaceholder?.classList.add('d-none');
                } else {
                    if (previewImg) {
                        previewImg.src = '';
                        previewImg.classList.add('d-none');
                    }
                    previewPlaceholder?.classList.remove('d-none');
                }
            }

            function actualizarAvatarInstitucion(urlPublica, iniciales) {
                if (urlPublica && avatarImg) {
                    avatarImg.src = urlPublica;
                    avatarImg.classList.remove('d-none');
                    avatarIniciales?.classList.add('d-none');
                } else {
                    if (avatarImg) {
                        avatarImg.src = '';
                        avatarImg.classList.add('d-none');
                    }
                    if (avatarIniciales) {
                        avatarIniciales.textContent = iniciales || 'IE';
                        avatarIniciales.classList.remove('d-none');
                    }
                }
            }

            function resetModalLogo() {
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    previewUrl = null;
                }
                if (inputLogo) inputLogo.value = '';
                mostrarPreviewLogo(tieneLogoActual ? logoActualUrl : null);
            }

            function setBtnGuardarLogo(modo) {
                if (!btnGuardar) return;
                if (modo === 'guardando') {
                    btnGuardar.disabled = true;
                    btnGuardar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
                } else {
                    btnGuardar.disabled = false;
                    btnGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar logo';
                }
            }
        })();
    </script>
@endpush
