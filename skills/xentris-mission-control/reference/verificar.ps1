# verificar.ps1 - Mission Control (Xentris Tech)
#
# Dice, en un solo vistazo, si este equipo quedo bien despues de instalar o
# actualizar. No cambia nada: solo mira y reporta.
#
#   .\verificar.ps1
#
# Comprueba cinco cosas, en orden de "sin esto no sirve":
#   1. El skill tiene los archivos nuevos (los que la version vieja no traia).
#   2. El SKILL.md se puede parsear: sin CRLF y sin BOM. Si falla, la skill
#      queda muda -- se anuncia solo con el titulo y deja de dispararse sola.
#   3. El panel esta instalado y on-brand (fuentes incrustadas, cero CDN).
#   4. El servidor responde 200 Y application/json (un 200 solo no prueba nada:
#      server.js devuelve index.html para cualquier ruta que no reconozca).
#   5. La aplicacion de Windows esta instalada y el semaforo va en vivo.

param(
  [string]$Skill   = "$env:USERPROFILE\.claude\skills\xentris-mission-control",
  [string]$Destino = "$env:USERPROFILE\mission-control"
)

$fallos = 0
$avisos = 0
function Titulo($t) { ""; $t; "-" * 62 }
function Bien($m)  { "  [ok]    $m" }
function Mal($m)   { $script:fallos++; "  [FALTA] $m" }
function Ojo($m)   { $script:avisos++; "  [aviso] $m" }

"=" * 62
"Mission Control -- verificacion de este equipo"
"=" * 62

# ------------------------------------------------------------ 1. el skill ----
Titulo "1. Skill actualizado"
$ref = Join-Path $Skill 'reference'
if (-not (Test-Path $ref)) {
  Mal "no existe $ref -- el skill no esta instalado"
} else {
  # Estos cinco NO existian en la version anterior: si estan, el skill es nuevo.
  $nuevos = @{
    'actualizar.ps1'      = 'instalar/actualizar desde GitHub'
    'estado-ventanas.ps1' = 'semaforo en vivo'
    'main.js'             = 'aplicacion de escritorio'
    'package.json'        = 'empaquetado Electron'
    'marca-icon.ico'      = 'icono de marca'
  }
  foreach ($n in $nuevos.Keys | Sort-Object) {
    if (Test-Path (Join-Path $ref $n)) { Bien "$n  ($($nuevos[$n]))" }
    else { Mal "$n  -- el skill sigue en la version vieja" }
  }
}

# ------------------------------------------------------- 2. el frontmatter ----
Titulo "2. El SKILL.md se puede leer (trampa del CRLF)"
$md = Join-Path $Skill 'SKILL.md'
if (-not (Test-Path $md)) { Mal "no hay SKILL.md" }
else {
  $bytes = [System.IO.File]::ReadAllBytes($md)
  $cr  = ($bytes | Where-Object { $_ -eq 13 }).Count
  $bom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
  if ($cr -eq 0) { Bien "sin CRLF" } else { Mal "$cr retornos de carro: git lo entrego en formato Windows" }
  if (-not $bom) { Bien "sin BOM" } else { Mal "empieza con BOM" }

  $lineas = [System.IO.File]::ReadAllText($md, [System.Text.Encoding]::UTF8) -split "`n"
  if ($lineas[0].Trim() -eq '---') { Bien "el frontmatter abre bien" } else { Mal "la primera linea no es ---" }
  $desc = ($lineas | Where-Object { $_ -like 'description:*' } | Select-Object -First 1)
  if (-not $desc) { Mal "no hay linea description:" }
  elseif ($desc.Length -gt 900) { Ojo "descripcion de $($desc.Length) caracteres: pasada de ~900 el cargador la ignora" }
  else { Bien "descripcion de $($desc.Length) caracteres" }

  if ($cr -gt 0 -or $bom) {
    Ojo "se arregla solo: .\actualizar.ps1  (normaliza a LF y quita BOM)"
  }
}

# --------------------------------------------------------- 3. panel y marca ----
Titulo "3. Panel instalado y on-brand"
$html = Join-Path $Destino 'index.html'
if (-not (Test-Path (Join-Path $Destino 'server.js'))) { Mal "no hay panel en $Destino" }
else {
  Bien "server.js en $Destino"
  if (Test-Path (Join-Path $Destino 'estado-ventanas.ps1')) { Bien "estado-ventanas.ps1 (semaforo en vivo)" }
  else { Mal "falta estado-ventanas.ps1: el semaforo se calcularia con el archivo y diria 0 trabajando" }

  if (-not (Test-Path $html)) { Mal "no hay index.html" }
  else {
    $t = [System.IO.File]::ReadAllText($html, [System.Text.Encoding]::UTF8)
    $caras = ([regex]::Matches($t, '@font-face')).Count
    $cdn   = ([regex]::Matches($t, 'fonts\.(googleapis|gstatic)\.com')).Count
    $mont  = ([regex]::Matches($t, 'font-family[^;}\n]*Montserrat')).Count
    if ($caras -eq 4) { Bien "4 tipografias incrustadas" } else { Mal "$caras @font-face (deben ser 4): faltaron las fuentes de marca" }
    if ($cdn -eq 0)   { Bien "cero dependencias externas" } else { Mal "$cdn enlaces a Google Fonts" }
    if ($mont -eq 0)  { Bien "sin Montserrat" } else { Mal "Montserrat en uso: el panel quedo fuera de marca" }
  }
}

# ------------------------------------------------------------ 4. responde ----
Titulo "4. El servidor responde de verdad"
try {
  $r = Invoke-WebRequest 'http://127.0.0.1:7777/api/sessions' -UseBasicParsing -TimeoutSec 8
  $tipo = [string]$r.Headers['Content-Type']
  if ($r.StatusCode -eq 200 -and $tipo -like '*application/json*') {
    $j = $r.Content | ConvertFrom-Json
    Bien "200 application/json -- $($j.sessions.Count) sesiones"

    # 5b. semaforo en vivo: alguna sesion decidida por la ventana, no por el archivo
    $envivo = @($j.sessions | Where-Object { $_.fuenteEstado -eq 'ventana' }).Count
    if ($envivo -gt 0) { Bien "semaforo en vivo: $envivo sesiones leidas de la barra de titulos" }
    else { Ojo "ninguna sesion en vivo -- normal si no hay terminales de Claude Code abiertas" }
  } else {
    Mal "responde $($r.StatusCode) $tipo -- se esperaba JSON"
  }
} catch {
  Mal "nadie responde en http://127.0.0.1:7777  ($($_.Exception.Message))"
}

# ----------------------------------------------------------------- 5. app ----
Titulo "5. Aplicacion de Windows"
$exe = "$env:LOCALAPPDATA\Programs\Mission Control\Mission Control.exe"
if (Test-Path $exe) {
  Bien "instalada en $exe"
  $reg = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue |
         Where-Object { $_.DisplayName -like '*Mission Control*' } | Select-Object -First 1
  if ($reg) { Bien "aparece como '$($reg.DisplayName)' con desinstalador" } else { Ojo "no figura en Agregar o quitar programas" }
  $app = "$env:LOCALAPPDATA\Programs\Mission Control\resources\app"
  if (Test-Path (Join-Path $app 'estado-ventanas.ps1')) { Bien "el .exe lleva el semaforo en vivo" }
  else { Mal "el .exe es anterior al semaforo en vivo: corre .\actualizar.ps1 -App" }
  if (Get-Process 'Mission Control' -ErrorAction SilentlyContinue) { Bien "corriendo ahora" } else { Ojo "no esta abierta" }
} else {
  Ojo "no hay aplicacion de escritorio -- se instala con .\actualizar.ps1 -App"
}

# --------------------------------------------------------------- veredicto ----
""; "=" * 62
if ($fallos -eq 0 -and $avisos -eq 0) { "TODO EN ORDEN." }
elseif ($fallos -eq 0)                { "EN ORDEN, con $avisos aviso(s) que puedes ignorar si sabes por que." }
else                                  { "HAY $fallos PROBLEMA(S). Mira las lineas [FALTA] de arriba." }
"=" * 62
if ($fallos -gt 0) { exit 1 }
