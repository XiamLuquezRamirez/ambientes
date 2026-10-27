{{-- Foto + nombre. Multisensorial usa la flor de la lista; las demás aulas, la ficha rectangular. --}}
@php
    $primerNombre = explode(' ', trim((string) $estudiante->nombre))[0] ?? '';
    $primerApellido = explode(' ', trim((string) ($estudiante->apellido ?? '')))[0] ?? '';
    $slugAula = strtolower(trim((string) ($ambiente->slug ?? '')));
    $esFlor = $slugAula === 'multisensorial';
    $florUrl = function (string $archivo) {
        $rel = 'assets/images/selector-aula/multisensorial/'.$archivo;
        $abs = public_path($rel);
        if (! is_file($abs)) {
            return '';
        }

        return asset($rel).'?v='.@filemtime($abs);
    };
@endphp
@if ($esFlor)
    @php
        $florVars = array_filter([
            "--marco: ".($estudiante->color_avatar ?: '#ee6747'),
            ($u = $florUrl('marco_nino.svg')) !== '' ? "--aula-marco: url('{$u}')" : '',
            ($u = $florUrl('marco_nino_resplandor.svg')) !== '' ? "--aula-resplandor: url('{$u}')" : '',
            ($u = $florUrl('marco_nino_hueco.svg')) !== '' ? "--aula-hueco: url('{$u}')" : '',
            ($u = $florUrl('marco_nino_punteado.svg')) !== '' ? "--aula-punteado: url('{$u}')" : '',
        ]);
    @endphp
    <div class="ficha-aula ficha-aula--flor" style="{{ implode('; ', $florVars) }}">
        <span class="ficha-flor">
            <span class="ficha-flor__cuerpo" aria-hidden="true"></span>
            <span class="ficha-flor__foto">
                @if ($estudiante->avatar_url)
                    <img src="{{ $estudiante->avatar_url }}" alt="" class="kiosco-avatar-img">
                @else
                    <span class="ficha-flor__iniciales">{{ $estudiante->iniciales }}</span>
                @endif
            </span>
            <span class="ficha-flor__nombre">
                <span>{{ $primerNombre }}</span>
                @if ($primerApellido !== '')
                    <span>{{ $primerApellido }}</span>
                @endif
            </span>
        </span>
    </div>
@else
    @php
        $silla = \App\Services\PaletaAulaService::sillaPara($estudiante->color_avatar);
    @endphp
    <div class="ficha-aula" style="--marco: {{ $silla['marco'] }}; --tinta: {{ $silla['tinta'] }};">
        <span class="ficha-aula__foto">
            @if ($estudiante->avatar_url)
                <img src="{{ $estudiante->avatar_url }}" alt="" class="kiosco-avatar-img">
            @else
                <span class="ficha-aula__iniciales">{{ $estudiante->iniciales }}</span>
            @endif
        </span>
        <span class="ficha-aula__nombre">
            <span>{{ $primerNombre }}</span>
            @if ($primerApellido !== '')
                <span>{{ $primerApellido }}</span>
            @endif
        </span>
    </div>
@endif
