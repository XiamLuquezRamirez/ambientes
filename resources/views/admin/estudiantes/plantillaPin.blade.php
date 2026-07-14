<div class="row p-2 container-configuracion-pin" name="configuracion_pin">
    <div class="col-md-12">
        <div class="form-group">
            <h5 class="mb-4" style="font-weight: 600;">Seleccione 3 figuras para conformar el PIN de acceso del estudiante</h5>
            <div class="pin-container">
                <div class="pin-item" id="pin-item-1">
                </div>
                <div class="pin-item" id="pin-item-2">
                </div>
                <div class="pin-item" id="pin-item-3">
                </div>
            </div>
            <div class="figuras-container">
                @foreach($figuras as $figura)
                    <div class="figura-item" onclick="agregarFigura('{{ $figura['icon'] }}', '{{ $figura['color'] }}')">
                        <i class="{{ $figura['icon'] }}" style="color: {{ $figura['color'] }};"></i>
                    </div>
                @endforeach
                <div class="figura-item-borrar" onclick="borrarFigura()">
                    <i class="fas fa-arrow-left"></i>
                </div>
            </div>
        </div>
    </div>
</div>