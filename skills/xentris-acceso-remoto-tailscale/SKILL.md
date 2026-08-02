---
name: xentris-acceso-remoto-tailscale
description: Buena práctica de agente Xentris Tech. Configura acceso remoto entrante por Escritorio Remoto (RDP) sobre Tailscale en un equipo Windows y lo deja auto-reparable con el guardián "RemoteGuard" (Tarea Programada como SYSTEM que verifica Tailscale + RDP al arranque, al iniciar sesión y cada 10 min). Úsala cuando el usuario pida "acceso remoto a este PC", "configurar RDP por Tailscale", "conectarme a mi equipo desde otro lado", "que el escritorio remoto no se caiga", "Tailscale se desconecta solo", "RemoteGuard", o para dejar un equipo de trabajo alcanzable 24/7 dentro de la tailnet sin abrir puertos a internet. Solo Windows.
---

# Acceso remoto RDP por Tailscale con auto-reparación (Xentris Tech)

Esta skill deja un equipo Windows **alcanzable por Escritorio Remoto dentro de la tailnet** (sin exponer el puerto 3389 a internet) y lo blinda con **RemoteGuard**: una Tarea Programada que corre como SYSTEM y repara sola cualquier cosa que se caiga (servicio Tailscale, RDP deshabilitado, firewall, modo desatendido).

Nace de una implementación real (julio 2026) donde se descubrieron y resolvieron varias trampas de Tailscale en Windows — están documentadas abajo en **Fallas conocidas**; léelas antes de diagnosticar.

## Requisitos y parámetros
1. **Tailscale instalado** y el equipo logueado en la tailnet del usuario. Binario: `C:\Program Files\Tailscale\tailscale.exe`.
2. **GUARD_DIR**: carpeta donde vivirán los scripts y el log del guardián (ej. `C:\Users\<usuario>\remote-guard`).
3. La cuenta de Windows a la que se conectarán **debe tener contraseña** (RDP no acepta cuentas sin contraseña).
4. Varios pasos requieren **elevación (UAC)**. Si la consola de Claude corre sin elevar, usa `Start-Process powershell -Verb RunAs -ArgumentList ...` o pide al usuario ejecutar con `!`.

## Pasos

### 1. Habilitar RDP entrante (elevado)
```powershell
# Habilitar RDP con NLA (seguridad) y modo de conexión normal
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server" -Name fDenyTSConnections -Value 0
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" -Name UserAuthentication -Value 1
Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server" -Name fReverseConnectMode -Value 0
# Servicio de Escritorio Remoto en Automático y corriendo
Set-Service TermService -StartupType Automatic; Start-Service TermService
# Firewall (grupos en español e inglés — habilita ambos)
Enable-NetFirewallRule -DisplayGroup "Remote Desktop" -ErrorAction SilentlyContinue
Enable-NetFirewallRule -DisplayGroup "Escritorio remoto" -ErrorAction SilentlyContinue
```

**IMPORTANTE:** el listener 3389 muchas veces **no se crea en caliente**. Si tras esto `netstat -an | findstr :3389` no muestra `LISTENING`, se necesita **reiniciar Windows** — avísale al usuario en vez de dar vueltas reiniciando servicios.

### 2. Tailscale en modo desatendido (elevado)
Sin esto, el daemon queda "controlado por GUI": si la app de bandeja no corre (o corre bajo otra cuenta), Tailscale se apaga solo.
```powershell
& "C:\Program Files\Tailscale\tailscale.exe" set --unattended=true
& "C:\Program Files\Tailscale\tailscale.exe" status   # debe salir exit 0 y listar la tailnet
& "C:\Program Files\Tailscale\tailscale.exe" ip -4    # anota la IP 100.x del equipo
```

### 3. Instalar RemoteGuard (el guardián auto-reparador)
Crea en **GUARD_DIR** dos scripts y registra la tarea.

**`ensure-remote-ready.ps1`** (worker — corre como SYSTEM en cada disparo). Verifica y repara, con log en `GUARD_DIR\remote-guard.log` (rotación a 400 líneas si pasa de 1 MB):
1. Servicio `Tailscale` Running + Automatic.
2. `fDenyTSConnections=0` y NLA=1 en el registro.
3. `TermService` Running + Automatic.
4. Reglas de firewall "Remote Desktop"/"Escritorio remoto" habilitadas.
5. `tailscale set --unattended=true`; si `BackendState != Running` → `tailscale up --unattended --timeout=30s` y reporta si quedó en `NeedsLogin` (clave del nodo expirada → re-login manual).
6. Listener 3389 en escucha (si no, avisa que suele requerir reinicio).

Usa como plantilla el script de referencia probado (ajusta solo `$logDir`):

```powershell
$ErrorActionPreference = 'SilentlyContinue'
$ts     = "C:\Program Files\Tailscale\tailscale.exe"
$logDir = "GUARD_DIR"
$log    = Join-Path $logDir "remote-guard.log"
if(-not (Test-Path $logDir)){ New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
if((Test-Path $log) -and ((Get-Item $log).Length -gt 1MB)){
    Get-Content $log -Tail 400 | Set-Content "$log.tmp"; Move-Item "$log.tmp" $log -Force
}
function Log($m){ "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m | Add-Content -Path $log }
Log "========== RemoteGuard run =========="
try {
    $svc = Get-Service Tailscale -ErrorAction Stop
    if($svc.StartType -ne 'Automatic'){ Set-Service Tailscale -StartupType Automatic }
    if($svc.Status -ne 'Running'){ Start-Service Tailscale; Log "[1] Servicio Tailscale estaba $($svc.Status) -> ARRANCADO" }
    else { Log "[1] Servicio Tailscale OK (Running)" }
} catch { Log "[1] ERROR servicio Tailscale: $_" }
try {
    $k = "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server"
    $deny = (Get-ItemProperty -Path $k -Name fDenyTSConnections -ErrorAction Stop).fDenyTSConnections
    if($deny -ne 0){ Set-ItemProperty -Path $k -Name fDenyTSConnections -Value 0; Log "[2] RDP estaba DESHABILITADO -> habilitado" }
    else { Log "[2] RDP habilitado OK (fDenyTSConnections=0)" }
    Set-ItemProperty -Path "$k\WinStations\RDP-Tcp" -Name UserAuthentication -Value 1 -ErrorAction SilentlyContinue
} catch { Log "[2] ERROR RDP registro: $_" }
try {
    Set-Service TermService -StartupType Automatic -ErrorAction SilentlyContinue
    $term = Get-Service TermService -ErrorAction Stop
    if($term.Status -ne 'Running'){ Start-Service TermService; Log "[3] TermService estaba $($term.Status) -> ARRANCADO" }
    else { Log "[3] TermService OK (Running)" }
} catch { Log "[3] ERROR TermService: $_" }
try {
    Enable-NetFirewallRule -DisplayGroup "Remote Desktop" -ErrorAction SilentlyContinue
    Enable-NetFirewallRule -DisplayGroup "Escritorio remoto" -ErrorAction SilentlyContinue
    Log "[4] Firewall Escritorio Remoto habilitado"
} catch { Log "[4] ERROR firewall: $_" }
try {
    & $ts set --unattended=true 2>&1 | Out-Null
    $state = $null
    $json = & $ts status --json 2>$null | Out-String
    if($json){ try { $state = ($json | ConvertFrom-Json).BackendState } catch {} }
    Log "[5] Tailscale BackendState=$state"
    if($state -ne 'Running'){
        Log "[5] Tailscale no esta Running -> ejecutando 'up --unattended'"
        $up = & $ts up --unattended --timeout=30s 2>&1 | Out-String
        if($up.Trim()){ Log "[5] Salida up: $($up.Trim())" }
        Start-Sleep -Seconds 3
        $json2 = & $ts status --json 2>$null | Out-String
        $state2 = $null; if($json2){ try { $state2 = ($json2 | ConvertFrom-Json).BackendState } catch {} }
        Log "[5] Tailscale BackendState tras up=$state2"
        if($state2 -eq 'NeedsLogin'){ Log "[5] AVISO: requiere re-login manual en el navegador (clave del nodo expirada)." }
    }
    $ip = (& $ts ip -4 2>$null | Out-String).Trim()
    if($ip){ Log "[5] Tailscale IP=$ip" }
} catch { Log "[5] ERROR Tailscale: $_" }
try {
    $lis = Get-NetTCPConnection -LocalPort 3389 -State Listen -ErrorAction SilentlyContinue
    if($lis){ Log "[6] Listener 3389 OK (LISTENING)" }
    else { Log "[6] AVISO: listener 3389 NO activo. Suele requerir un reinicio de Windows para crearse." }
} catch { Log "[6] ERROR check 3389: $_" }
Log "========== fin =========="
```

**`install-task.ps1`** (instalador — ejecutar **elevado**). Registra la tarea `RemoteGuard-EnsureRemoteAccess` como **SYSTEM / RunLevel Highest** con tres disparadores: al arranque (`-AtStartup`), al iniciar sesión (`-AtLogOn`) y repetición cada 10 min (`-Once -At (+1 min) -RepetitionInterval 10min -RepetitionDuration 3650 días`). Settings: `-AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit 10min`. La acción es `powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "GUARD_DIR\ensure-remote-ready.ps1"`. Al final ejecuta la tarea una vez (`Start-ScheduledTask`) como prueba y revisa el log.

### 4. Verificar y entregar al usuario
```powershell
schtasks /query /tn RemoteGuard-EnsureRemoteAccess /v      # (elevado) estado de la tarea
Get-Content GUARD_DIR\remote-guard.log -Tail 20            # qué hizo la última corrida
netstat -an | findstr :3389                                 # debe mostrar 0.0.0.0:3389 LISTENING
```
Entrega al usuario la instrucción de conexión desde otro dispositivo de la tailnet:
`mstsc /v:<IP-100.x>` o `mstsc /v:<nombre-del-equipo>`, usuario `<EQUIPO>\<usuario>` (con contraseña).

## Fallas conocidas (lecciones reales — revisa esto ANTES de diagnosticar)

**A. `401 Unauthorized: Tailscale already in use by <EQUIPO>\<otra-cuenta>` + adaptador con IP APIPA 169.254.x.**
Causa: la GUI de Tailscale corre bajo **otra cuenta de Windows** y secuestra el bus de control; el CLI de la cuenta actual no puede tomarlo (ni elevado, y `--operator` NO existe en Windows).
Solución probada: (1) `taskkill /F /IM tailscale-ipn.exe`, (2) `net stop Tailscale` → `net start Tailscale`, (3) lanzar la GUI con el usuario actual: `Start-Process "C:\Program Files\Tailscale\tailscale-ipn.exe"`. Ojo: `tailscale up` solo se queda colgado en `NoState`; hay que lanzar la GUI (o dejar unattended activo).

**B. `tailscale status` atascado en `NoState` / "Tailscale is starting", con servicio Running y perfil intacto.**
Causa (visible en `C:\ProgramData\Tailscale\Logs\*.txt`): daemon en modo controlado-por-GUI — cada frontend que se conecta/desconecta pone `WantRunning=false` y lo apaga. Matar `tailscaled` no sirve (el servicio lo relanza; dos procesos `tailscaled` son normales: padre + subproceso del túnel).
Solución permanente: `tailscale set --unattended=true` (elevado). No requiere reinstalar ni re-login.

**C. Listener 3389 no aparece tras habilitar RDP.** Requiere reinicio de Windows; no pierdas tiempo reiniciando TermService.

## Buenas prácticas Xentris Tech (contexto)
- **Nunca** abras 3389 al internet ni hagas port-forwarding en el router: todo el acceso va por la tailnet (WireGuard cifrado, sin puertos expuestos).
- Deja NLA (`UserAuthentication=1`) siempre activo.
- Guarda **memoria** del equipo configurado: nombre, IP de tailnet, cuenta de conexión, ruta de GUARD_DIR y fallas que aparecieron — es lo que permite dar soporte rápido después.
- Gestión del guardián: reinstalar/editar → correr `install-task.ps1` elevado; desinstalar → `schtasks /delete /tn RemoteGuard-EnsureRemoteAccess /f` (elevado).
