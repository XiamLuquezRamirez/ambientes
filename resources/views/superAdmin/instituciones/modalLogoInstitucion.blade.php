{{--
    Modal: logo de institución (Super Admin).

    Flujo (misma idea que perfil/_modal_foto_perfil):
    1. cambiarLogoInstitucion() muestra el logo actual o iniciales.
    2. Al seleccionar archivo: validación cliente (JPG/PNG, máx. 2 MB) y previsualización.
    3. Guardar → POST superadmin/instituciones/{id}/logo → actualiza avatar sin recargar.
    4. Eliminar → DELETE superadmin/instituciones/{id}/logo → restaura iniciales.

    Convención URL: logo en BD es ruta relativa (instituciones/{id}/logo.ext);
    la URL pública siempre es asset('storage/' . logo).

    En modo "crear" (aún sin id): solo previsualiza y deja el File en #inputLogoPendiente
    para enviarlo junto con FormData al crear la institución.
--}}
<div class="modal fade modal-app" id="modalLogoInstitucion" tabindex="-1" aria-labelledby="modalLogoInstitucionLabel"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <h5 class="modal-title" id="modalLogoInstitucionLabel">Logo de la institución</h5>
                    <p class="modal-subtitle mb-0">Sube una imagen JPG o PNG de hasta 2 MB. El logo es obligatorio.</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
                <div class="profile-avatar-preview" id="previewLogoInstitucion">
                    <img src="" alt="Previsualización del logo" id="previewLogoInstitucionImagen"
                        class="d-none">
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

{{-- File oculto: en alta nueva el logo viaja con el FormData del formulario principal --}}
<input type="file" id="inputLogoPendiente" name="logo" form="formAgregarInstitucion" class="d-none"
    accept=".jpg,.jpeg,.png,image/jpeg,image/png">

@push('scripts')
    <script>
        (function() {
            const URL_LOGO_BASE = @json(url('superadmin/instituciones'));
            const CSRF = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

            const modalLogo = document.getElementById('modalLogoInstitucion');
            const inputLogo = document.getElementById('inputLogoInstitucion');
            const inputLogoPendiente = document.getElementById('inputLogoPendiente');
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
            let institucionIdActual = null; // null = modo crear

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

                // Modo crear: no hay id aún → deja el archivo pendiente para el FormData del alta.
                if (!institucionIdActual) {
                    transferirArchivoAPendiente(archivo);
                    actualizarAvatarInstitucion(previewUrl, inicialesActuales);
                    tieneLogoActual = true;
                    logoActualUrl = previewUrl;
                    bootstrap.Modal.getInstance(modalLogo)?.hide();
                    mostrarToast('success', 'Logo listo. Se guardará al crear la institución.');
                    return;
                }

                setBtnGuardarLogo('guardando');

                try {
                    const formData = new FormData();
                    formData.append('logo', archivo);

                    const response = await fetch(`${URL_LOGO_BASE}/${institucionIdActual}/logo`, {
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

                    // Limpia pendiente: el logo ya está en servidor.
                    if (inputLogoPendiente) inputLogoPendiente.value = '';

                    actualizarLogoEnTarjeta(institucionIdActual, data.logo_url_publica, data.iniciales);

                    bootstrap.Modal.getInstance(modalLogo)?.hide();
                    mostrarToast('success', data.message || 'Logo guardado correctamente.');
                } catch (err) {
                    mostrarToast('error', err.message || 'No se pudo guardar el logo.');
                } finally {
                    setBtnGuardarLogo('listo');
                }
            });



            /**
             * Abre el modal de logo.
             * opts: { id, logoUrl, iniciales } — id null = modo crear (logo pendiente).
             */
            window.cambiarLogoInstitucion = function(opts = {}) {
                institucionIdActual = opts.id ?? window.idInstitucionEditando ?? null;
                logoActualUrl = opts.logoUrl ?? window.logoInstitucionActualUrl ?? null;
                inicialesActuales = opts.iniciales ?? window.logoInstitucionIniciales ?? 'IE';
                tieneLogoActual = Boolean(logoActualUrl);

                resetModalLogo();
                mostrarPreviewLogo(tieneLogoActual ? logoActualUrl : null);
                // En edición no se elimina (solo reemplazo); en crear sí se puede quitar la selección.
                bootstrap.Modal.getOrCreateInstance(modalLogo).show();
            };

            /** Alias pedido desde el overlay del avatar (misma idea que cambiarFotoPerfil). */
            window.cambiarLogoPerfil = function() {
                window.cambiarLogoInstitucion({
                    id: window.idInstitucionEditando || null,
                    logoUrl: window.logoInstitucionActualUrl || null,
                    iniciales: window.logoInstitucionIniciales || 'IE',
                });
            };

            /** Sincroniza estado del logo cuando se carga una institución en edición. */
            window.setEstadoLogoInstitucion = function({
                id = null,
                logoUrl = null,
                iniciales = 'IE'
            } = {}) {
                window.idInstitucionEditando = id;
                window.logoInstitucionActualUrl = logoUrl;
                window.logoInstitucionIniciales = iniciales;
                if (inputLogoPendiente) inputLogoPendiente.value = '';
                actualizarAvatarInstitucion(logoUrl, iniciales);
            };

            /** Limpia estado de logo (alta nueva). */
            window.resetEstadoLogoInstitucion = function() {
                window.idInstitucionEditando = null;
                window.logoInstitucionActualUrl = null;
                window.logoInstitucionIniciales = 'IE';
                if (inputLogoPendiente) inputLogoPendiente.value = '';
                actualizarAvatarInstitucion(null, 'IE');
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

            /** Actualiza el logo en la tarjeta del grid sin recargar. */
            function actualizarLogoEnTarjeta(id, urlPublica, iniciales) {
                const card = document.getElementById(`tarjeta-amb-${id}`);
                if (!card) return;

                const img = card.querySelector('.card-logo-img');
                const fallback = card.querySelector('.card-logo-fallback');

                if (urlPublica && img) {
                    img.src = urlPublica;
                    img.classList.remove('d-none');
                    fallback?.classList.add('d-none');
                } else {
                    img?.classList.add('d-none');
                    if (fallback) {
                        fallback.textContent = iniciales || 'IE';
                        fallback.classList.remove('d-none');
                    }
                }
            }

            /**
             * Copia el File seleccionado al input oculto ligado al form de alta
             * (DataTransfer es necesario porque no se puede asignar files directamente).
             */
            function transferirArchivoAPendiente(archivo) {
                if (!inputLogoPendiente) return;
                const dt = new DataTransfer();
                dt.items.add(archivo);
                inputLogoPendiente.files = dt.files;
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
                btnGuardar.disabled = modo === 'guardando';
                btnGuardar.innerHTML = modo === 'guardando' ?
                    '<span class="me-2"><i class="fa-solid fa-spinner fa-spin"></i></span> Guardando...' :
                    '<i class="fa-solid fa-floppy-disk"></i> Guardar logo';
            }
        })();
    </script>
@endpush
