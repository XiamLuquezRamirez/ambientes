<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-icon stat-icon--blue">
            <i class="fa-solid fa-gamepad"></i>
        </div>
        <div class="stat-body">
            <h3>{{ $estadisticas['total'] }} Juegos</h3>
            <p>En el catálogo filtrado</p>
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

    <div class="stat-card">
        <div class="stat-icon stat-icon--red">
            <i class="fa-solid fa-ban"></i>
        </div>
        <div class="stat-body">
            <h3>{{ $estadisticas['inactivos'] }} Inactivos</h3>
            <p>Fuera del constructor</p>
        </div>
    </div>

    <div class="stat-card">
        <div class="stat-icon stat-icon--yellow">
            <i class="fa-solid fa-cube"></i>
        </div>
        <div class="stat-body">
            <h3>{{ $estadisticas['modulos'] }} Módulos</h3>
            <p>Con juegos en el filtro</p>
        </div>
    </div>
</div>
