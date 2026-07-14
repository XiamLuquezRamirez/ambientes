<div class="stats-grid">

    <div class="stat-card">
        <div class="stat-icon stat-icon--blue">
            <i class="fa-solid fa-users"></i>
        </div>
        <div class="stat-body">
            <h3>{{ $estadisticas['total'] }} Estudiantes</h3>
            <p>Total en el ambiente</p>
        </div>
    </div>

    <div class="stat-card">
        <div class="stat-icon stat-icon--yellow">
            <i class="fa-solid fa-clipboard-list"></i>
        </div>
        <div class="stat-body">
            <h3>{{ $estadisticas['piar'] }} Con PIAR</h3>
            <p>{{ $estadisticas['piar_pct'] }}% del total</p>
        </div>
    </div>

    <div class="stat-card">
        <div class="stat-icon stat-icon--red">
            <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div class="stat-body">
            <h3>{{ $estadisticas['sin_pin'] }} Sin PIN</h3>
            <p>Requieren atención</p>
        </div>
    </div>

    <div class="stat-card">
        <div class="stat-icon stat-icon--green">
            <i class="fa-solid fa-circle-check"></i>
        </div>
        <div class="stat-body">
            <h3>{{ $estadisticas['activos'] }} Activos</h3>
            <p>{{ $estadisticas['activos_pct'] }}% del total</p>
        </div>
    </div>

</div>
