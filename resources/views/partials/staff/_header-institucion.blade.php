{{--
    Params:
      - $institucion
      - $logoUrl
      - $inicialesInstitucion
      - $lugarInstitucion
      - $clickUrl (opcional): si se pasa, el bloque es clickeable
--}}
@if ($institucion)
    <div class="header-institucion" title="{{ $institucion->nombre }}"
        @if (!empty($clickUrl)) onclick="window.location.href='{{ $clickUrl }}'" style="cursor: pointer;" @endif>
        <div class="header-institucion-logo" aria-hidden="true">
            <img src="{{ $logoUrl ?? '' }}" alt=""
                class="header-institucion-img {{ $logoUrl ? '' : 'd-none' }}"
                onerror="this.classList.add('d-none');var f=this.nextElementSibling;if(f)f.classList.remove('d-none');">
            <span class="header-institucion-fallback {{ $logoUrl ? 'd-none' : '' }}">
                {{ $inicialesInstitucion }}
            </span>
        </div>
        <div class="header-institucion-meta">
            <span class="header-institucion-nombre">{{ $institucion->nombre }}</span>
            @if (($lugarInstitucion ?? '') !== '')
                <span class="header-institucion-lugar">{{ $lugarInstitucion }}</span>
            @endif
        </div>
    </div>
@endif
