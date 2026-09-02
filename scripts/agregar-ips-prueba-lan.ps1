# ⚠️ NO RECOMENDADO: agregar IPs alias puede cortar el internet si esas IPs
# ya las usa el router u otro dispositivo (conflicto ARP en la red).
#
# En su lugar, en local usa la tablet con:
#   http://192.168.1.12:8000/?nodo_ip=192.168.1.14
# (simula Multisensorial sin tocar la red)
#
# Solo usar este script en una red aislada de pruebas, sin otros equipos.
#
# Uso:
#   .\scripts\agregar-ips-prueba-lan.ps1 -Quitar   # quitar alias si los agregaste
#   .\scripts\agregar-ips-prueba-lan.ps1           # agregar (riesgo de perder internet)

param(
    [switch]$Quitar,
    [string]$Interfaz = "Wi-Fi",
    [string[]]$Ips = @("192.168.1.11", "192.168.1.13", "192.168.1.14", "192.168.1.15")
)

$ErrorActionPreference = "Stop"

function Test-Admin {
    $current = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    return $current.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    Write-Host "Ejecuta PowerShell como Administrador." -ForegroundColor Red
    exit 1
}

if (-not $Quitar) {
    Write-Host "ADVERTENCIA: esto puede desconectar el internet si hay conflicto de IPs." -ForegroundColor Yellow
    Write-Host "Mejor usa: http://TU-IP:8000/?nodo_ip=192.168.1.14" -ForegroundColor Cyan
    $confirm = Read-Host "¿Continuar igual? (s/N)"
    if ($confirm -ne 's' -and $confirm -ne 'S') {
        exit 0
    }
}

foreach ($ip in $Ips) {
    if ($Quitar) {
        Write-Host "Quitando $ip de $Interfaz..."
        netsh interface ip delete address name="$Interfaz" addr=$ip 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  (no estaba asignada o ya se quitó)" -ForegroundColor DarkYellow
        }
    } else {
        Write-Host "Agregando $ip a $Interfaz..."
        netsh interface ip add address name="$Interfaz" $ip 255.255.255.0
    }
}

Write-Host ""
if ($Quitar) {
    Write-Host "IPs alias eliminadas. Reinicia Wi-Fi si el internet sigue fallando."
} else {
    Write-Host "Alias agregados. Si pierdes internet, ejecuta: .\scripts\agregar-ips-prueba-lan.ps1 -Quitar"
}
