{{--
    Modal: foto de perfil (solo docente).

    Flujo:
    1. cambiarFotoPerfil() muestra la foto actual o el placeholder.
    2. Al seleccionar archivo: validación cliente (JPG/PNG, máx. 2 MB) y previsualización.
    3. Guardar → POST panel/perfil/foto → actualiza avatar sin recargar.
    4. Eliminar → DELETE panel/perfil/foto → restaura iniciales.

    Convención URL: foto_url en BD es ruta relativa (docentes/{id}/foto.ext);
    la URL pública siempre es asset('storage/' . foto_url).
--}}
<div class="modal fade modal-app" id="modalFotoPerfil" tabindex="-1" aria-labelledby="modalFotoPerfilLabel"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div>
                    <h5 class="modal-title" id="modalFotoPerfilLabel">Foto de perfil</h5>
                    <p class="modal-subtitle mb-0">Sube una imagen JPG o PNG de hasta 2 MB.</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
                <div class="profile-avatar-preview" id="previewFotoPerfil">
                    <img src="" alt="Previsualización de foto" id="previewFotoPerfilImagen" class="d-none">
                    <div class="placeholder" id="previewFotoPerfilPlaceholder">
                        <i class="fa-solid fa-user-circle fa-2x mb-2"></i>
                        <div>Tu foto</div>
                    </div>
                </div>

                <form id="formFotoPerfil" enctype="multipart/form-data">
                    @csrf
                    <input type="file" class="form-control" id="inputFotoPerfil" name="foto"
                        accept=".jpg,.jpeg,.png,image/jpeg,image/png">
                    <div class="form-text">Formatos permitidos: JPG, PNG. Tamaño máximo: 2 MB.</div>

                    <div class="profile-avatar-actions">
                        <button type="button" class="btn btn-outline-danger" id="btnEliminarFotoPerfil"
                            @if (!$fotoUrlPublica) disabled @endif>
                            <i class="fa-solid fa-trash-can"></i> Eliminar foto
                        </button>
                        <button type="submit" class="btn btn-primary-perfil" id="btnGuardarFotoPerfil">
                            <i class="fa-solid fa-floppy-disk"></i> Guardar foto
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
            const URL_FOTO_PERFIL = @json($rutas['foto'] ?? null);
            const URL_ELIMINAR_FOTO = @json($rutas['foto_eliminar'] ?? null);
            const FOTO_ACTUAL_URL = @json($fotoUrlPublica);
            const INICIALES_PERFIL = @json($iniciales);
            const AVATAR_COLOR = @json($avatarColor ?? '#3155C6');
            const CSRF_FOTO = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

            if (!URL_FOTO_PERFIL) return;

            const modalFotoPerfil = document.getElementById('modalFotoPerfil');
            const inputFotoPerfil = document.getElementById('inputFotoPerfil');
            const formFotoPerfil = document.getElementById('formFotoPerfil');
            const previewFotoPerfilImagen = document.getElementById('previewFotoPerfilImagen');
            const previewFotoPerfilPlaceholder = document.getElementById('previewFotoPerfilPlaceholder');
            const btnEliminarFotoPerfil = document.getElementById('btnEliminarFotoPerfil');
            const btnGuardarFotoPerfil = document.getElementById('btnGuardarFotoPerfil');
            const avatarPerfilPrincipal = document.getElementById('avatarPerfilPrincipal');
            const avatarPerfilImagen = document.getElementById('avatarPerfilImagen');
            const avatarPerfilIniciales = document.getElementById('avatarPerfilIniciales');

            let previewUrl = null;
            let tieneFotoActual = Boolean(FOTO_ACTUAL_URL);
            let fotoActualUrl = FOTO_ACTUAL_URL;

            modalFotoPerfil?.addEventListener('hidden.bs.modal', resetModalFotoPerfil);

            inputFotoPerfil?.addEventListener('change', function() {
                const archivo = this.files?.[0];
                if (!archivo) {
                    mostrarPreviewFoto(tieneFotoActual ? fotoActualUrl : null);
                    return;
                }

                const error = validarArchivoFoto(archivo);
                if (error) {
                    mostrarToast('error', error);
                    this.value = '';
                    mostrarPreviewFoto(tieneFotoActual ? fotoActualUrl : null);
                    return;
                }

                if (previewUrl) URL.revokeObjectURL(previewUrl);
                previewUrl = URL.createObjectURL(archivo);
                mostrarPreviewFoto(previewUrl);
            });

            formFotoPerfil?.addEventListener('submit', async function(event) {
                event.preventDefault();

                const archivo = inputFotoPerfil?.files?.[0];
                if (!archivo) {
                    mostrarToast('error', 'Selecciona una imagen antes de guardar.');
                    return;
                }

                const error = validarArchivoFoto(archivo);
                if (error) {
                    mostrarToast('error', error);
                    return;
                }

                setBtnGuardarFoto('guardando');

                try {
                    const formData = new FormData();
                    formData.append('foto', archivo);

                    const response = await fetch(URL_FOTO_PERFIL, {
                        method: 'POST',
                        headers: { 'X-CSRF-TOKEN': CSRF_FOTO },
                        body: formData,
                    });
                    const data = await response.json();

                    if (!response.ok || !data.success) {
                        throw new Error(data.message || 'No se pudo guardar la foto.');
                    }

                    actualizarAvatarPerfil(data.foto_url_publica, data.iniciales);
                    fotoActualUrl = data.foto_url_publica;
                    tieneFotoActual = true;
                    btnEliminarFotoPerfil.disabled = false;
                    bootstrap.Modal.getInstance(modalFotoPerfil)?.hide();
                    mostrarToast('success', data.message || 'Foto guardada correctamente.');
                } catch (error) {
                    mostrarToast('error', error.message || 'No se pudo guardar la foto.');
                } finally {
                    setBtnGuardarFoto('listo');
                }
            });

            btnEliminarFotoPerfil?.addEventListener('click', async function() {
                if (!tieneFotoActual) return;

                btnEliminarFotoPerfil.disabled = true;
                btnEliminarFotoPerfil.innerHTML =
                    '<i class="fa-solid fa-spinner fa-spin"></i> Eliminando...';

                try {
                    const response = await fetch(URL_ELIMINAR_FOTO, {
                        method: 'DELETE',
                        headers: {
                            'X-CSRF-TOKEN': CSRF_FOTO,
                            'Accept': 'application/json',
                        },
                    });
                    const data = await response.json();

                    if (!response.ok || !data.success) {
                        throw new Error(data.message || 'No se pudo eliminar la foto.');
                    }

                    actualizarAvatarPerfil(null, data.iniciales);
                    fotoActualUrl = null;
                    tieneFotoActual = false;
                    bootstrap.Modal.getInstance(modalFotoPerfil)?.hide();
                    mostrarToast('success', data.message || 'Foto eliminada correctamente.');
                } catch (error) {
                    mostrarToast('error', error.message || 'No se pudo eliminar la foto.');
                } finally {
                    btnEliminarFotoPerfil.disabled = !tieneFotoActual;
                    btnEliminarFotoPerfil.innerHTML =
                        '<i class="fa-solid fa-trash-can"></i> Eliminar foto';
                }
            });

            /** Abre el modal y muestra la foto actual del servidor si existe. */
            window.cambiarFotoPerfil = function() {
                resetModalFotoPerfil();
                mostrarPreviewFoto(tieneFotoActual ? fotoActualUrl : null);
                bootstrap.Modal.getOrCreateInstance(modalFotoPerfil).show();
            };

            function validarArchivoFoto(archivo) {
                const tiposValidos = ['image/jpeg', 'image/png', 'image/jpg'];
                if (!tiposValidos.includes(archivo.type)) {
                    return 'Solo se permiten archivos JPG o PNG.';
                }
                if (archivo.size > 2 * 1024 * 1024) {
                    return 'La imagen supera el tamaño máximo de 2 MB.';
                }
                return null;
            }

            function mostrarPreviewFoto(url) {
                if (url && previewFotoPerfilImagen) {
                    previewFotoPerfilImagen.src = url;
                    previewFotoPerfilImagen.classList.remove('d-none');
                    previewFotoPerfilPlaceholder?.classList.add('d-none');
                } else {
                    if (previewFotoPerfilImagen) {
                        previewFotoPerfilImagen.src = '';
                        previewFotoPerfilImagen.classList.add('d-none');
                    }
                    previewFotoPerfilPlaceholder?.classList.remove('d-none');
                }
            }

            function actualizarAvatarPerfil(urlPublica, iniciales) {
                if (urlPublica && avatarPerfilImagen) {
                    avatarPerfilImagen.src = urlPublica;
                    avatarPerfilImagen.classList.remove('d-none');
                    avatarPerfilIniciales?.classList.add('d-none');
                } else {
                    if (avatarPerfilImagen) {
                        avatarPerfilImagen.src = '';
                        avatarPerfilImagen.classList.add('d-none');
                    }
                    if (avatarPerfilIniciales) {
                        avatarPerfilIniciales.textContent = iniciales || INICIALES_PERFIL;
                        avatarPerfilIniciales.classList.remove('d-none');
                    }
                }

                actualizarAvataresHeaderPanel(urlPublica, iniciales || INICIALES_PERFIL);
            }

            /** Sincroniza chip y dropdown del layout panel con la foto de perfil. */
            function actualizarAvataresHeaderPanel(urlPublica, iniciales) {
                ['headerAvatarImagen', 'dropdownAvatarImagen'].forEach(function(id) {
                    const img = document.getElementById(id);
                    if (!img) return;
                    if (urlPublica) {
                        img.src = urlPublica;
                        img.classList.remove('d-none');
                    } else {
                        img.src = '';
                        img.classList.add('d-none');
                    }
                });

                ['headerAvatarIniciales', 'dropdownAvatarIniciales'].forEach(function(id) {
                    const span = document.getElementById(id);
                    if (!span) return;
                    if (urlPublica) {
                        span.classList.add('d-none');
                    } else {
                        span.textContent = iniciales;
                        span.classList.remove('d-none');
                    }
                });
            }

            window.actualizarAvataresHeaderPanel = actualizarAvataresHeaderPanel;

            function resetModalFotoPerfil() {
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    previewUrl = null;
                }
                if (inputFotoPerfil) inputFotoPerfil.value = '';
                mostrarPreviewFoto(tieneFotoActual ? fotoActualUrl : null);
                btnEliminarFotoPerfil.disabled = !tieneFotoActual;
            }

            function setBtnGuardarFoto(modo) {
                if (!btnGuardarFotoPerfil) return;
                btnGuardarFotoPerfil.disabled = modo === 'guardando';
                btnGuardarFotoPerfil.innerHTML = modo === 'guardando'
                    ? '<span class="me-2"><i class="fa-solid fa-spinner fa-spin"></i></span> Guardando...'
                    : '<i class="fa-solid fa-floppy-disk"></i> Guardar foto';
            }
        })();
    </script>
@endpush
