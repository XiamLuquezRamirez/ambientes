@if ($estudiante->avatar_url)
    <img src="{{ $estudiante->avatar_url }}" alt="" class="kiosco-avatar-img">
@else
    {{ $estudiante->iniciales }}
@endif
