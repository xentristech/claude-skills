# actualizar.ps1 - Mission Control (Xentris Tech)
#
# Instala Mission Control, o ACTUALIZA una instalacion que ya existe, desde los
# archivos del skill. Con -DesdeGitHub se trae primero la ultima version del
# repo publico, asi que en otro equipo basta este comando.
#
# Por que hace falta un script y no un Copy-Item: actualizar tiene tres cosas
# que a mano se olvidan y dejan el panel roto o fuera de marca.
#
#   1. index.html NO se copia encima. El que corre es el que genera
#      aplicar-marca.js con las fuentes incrustadas (~380 KB). El del skill es
#      la base: va a index.html.orig, y despues se REGENERA. Copiarlo directo
#      deja el panel con Montserrat por CDN.
#   2. Hay que parar la app o el servidor antes de sobrescribir: si no, Windows
#      bloquea los archivos y la copia falla a medias.
#   3. logo.png puede estar personalizado en ese equipo. Solo se copia si falta.
#
# Uso:
#   .\actualizar.ps1                       # actualiza desde el skill instalado
#   .\actualizar.ps1 -DesdeGitHub          # git pull + actualiza (otro equipo)
#   .\actualizar.ps1 -Fuentes "D:\marca\fonts"

param(
  [switch]$DesdeGitHub,
  [string]$Skill   = "$env:USERPROFILE\.claude\skills\xentris-mission-control",
  [string]$Destino = "$env:USERPROFILE\mission-control",
  [string]$Fuentes = "",
  [string]$Repo    = "https://github.com/xentristech/claude-skills.git",
  [string]$Clon    = "$env:USERPROFILE\claude-skills"
)

$ErrorActionPreference = 'Stop'
function Titulo($t) { ""; "=" * 64; $t; "=" * 64 }
function Ok($m)     { "  [ok]    $m" }
function Aviso($m)  { "  [aviso] $m" }
function Falla($m)  { "  [FALLA] $m" }

# ---------------------------------------------------------------- GitHub ----
if ($DesdeGitHub) {
  Titulo "1. Trayendo la ultima version desde GitHub"
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Falla "git no esta instalado en este equipo."; exit 1
  }
  if (Test-Path (Join-Path $Clon '.git')) {
    Push-Location $Clon
    git pull --quiet
    Pop-Location
    Ok "actualizado el clon en $Clon"
  } else {
    git clone --quiet $Repo $Clon
    Ok "clonado en $Clon"
  }

  $skillsDestino = "$env:USERPROFILE\.claude\skills"
  New-Item -ItemType Directory -Force -Path $skillsDestino | Out-Null
  # -Force a proposito: sin el, una copia vieja del skill se queda como esta.
  Copy-Item -Recurse -Force (Join-Path $Clon 'skills\*') $skillsDestino
  Ok "skills copiados a $skillsDestino (pisando lo viejo)"
}

$ref = Join-Path $Skill 'reference'
if (-not (Test-Path $ref)) { Falla "no encuentro $ref"; exit 1 }

# ------------------------------------------------------------- inventario ----
$nuevaInstalacion = -not (Test-Path (Join-Path $Destino 'server.js'))
Titulo $(if ($nuevaInstalacion) { "2. Instalando en $Destino" } else { "2. Actualizando $Destino" })
New-Item -ItemType Directory -Force -Path $Destino | Out-Null

# Archivos que siempre se pisan con lo del skill.
$copiar = @('server.js', 'enfocar.ps1', 'estado-ventanas.ps1', 'aplicar-marca.js', 'main.js', 'package.json')

function Distinto($a, $b) {
  if (-not (Test-Path $b)) { return $true }
  (Get-FileHash $a).Hash -ne (Get-FileHash $b).Hash
}

$cambios = @()
foreach ($f in $copiar) {
  $origen = Join-Path $ref $f
  if (-not (Test-Path $origen)) { Aviso "$f no esta en el skill (version antigua del repo)"; continue }
  if (Distinto $origen (Join-Path $Destino $f)) { $cambios += $f }
}
# index.html del skill es la BASE: se compara contra index.html.orig, no contra index.html.
$baseNueva = Distinto (Join-Path $ref 'index.html') (Join-Path $Destino 'index.html.orig')
if ($baseNueva) { $cambios += 'index.html (base)' }

if ($cambios.Count -eq 0 -and -not $nuevaInstalacion) {
  Ok "ya esta al dia: ningun archivo cambio"
  ""; "Nada que hacer."; exit 0
}
"  cambian: $($cambios -join ', ')"

# ------------------------------------------------------------------ parar ----
Titulo "3. Parando lo que este corriendo"
$appViva = [bool](Get-Process 'Mission Control' -ErrorAction SilentlyContinue)
Get-Process 'Mission Control' -ErrorAction SilentlyContinue | Stop-Process -Force
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like "*$([regex]::Escape($Destino))*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Sleep -Milliseconds 800
Ok $(if ($appViva) { "app cerrada (se vuelve a abrir al final)" } else { "nada corriendo" })

# ----------------------------------------------------------------- copiar ----
Titulo "4. Copiando archivos"
foreach ($f in $copiar) {
  $origen = Join-Path $ref $f
  if (Test-Path $origen) { Copy-Item $origen (Join-Path $Destino $f) -Force; Ok $f }
}
Copy-Item (Join-Path $ref 'index.html') (Join-Path $Destino 'index.html.orig') -Force
Ok "index.html -> index.html.orig (base para la marca)"

$logo = Join-Path $Destino 'logo.png'
if (Test-Path $logo) { Aviso "logo.png se deja como esta (puede estar personalizado)" }
else { Copy-Item (Join-Path $ref 'logo.png') $logo -Force; Ok "logo.png" }

# ------------------------------------------------------------------ marca ----
Titulo "5. Aplicando el manual de marca"
$argumentos = @((Join-Path $Destino 'aplicar-marca.js'))
if ($Fuentes) { $argumentos += @('--fuentes', $Fuentes) }
& node @argumentos
if ($LASTEXITCODE -ne 0) {
  ""; Falla "el panel quedaria FUERA DE MARCA. No se reinicia nada."
  "  Copia las fuentes a este equipo y repite con:"
  "      .\actualizar.ps1 -Fuentes ""RUTA\marca\fonts"""
  exit 1
}

# ---------------------------------------------------------------- Electron ----
if (Test-Path (Join-Path $Destino 'node_modules')) {
  Titulo "6. Aplicacion de escritorio"
  Push-Location $Destino
  npm install --no-fund --no-audit --silent
  Pop-Location
  Aviso "para rehacer el .exe con estos cambios: cd $Destino ; npm run dist"
  Aviso "y despues instalar dist\Mission Control Setup <version>.exe"
}

# --------------------------------------------------------------- arrancar ----
Titulo "7. Arrancando y verificando"
$exeApp = "$env:LOCALAPPDATA\Programs\Mission Control\Mission Control.exe"
if (Test-Path $exeApp) {
  Aviso "hay app instalada: sigue con la version anterior hasta que hagas npm run dist"
  Start-Process $exeApp
  Ok "app abierta"
} else {
  Start-Process node -ArgumentList (Join-Path $Destino 'server.js') -WindowStyle Hidden
  Ok "servidor arrancado"
}

Start-Sleep -Seconds 3
try {
  $r = Invoke-WebRequest 'http://127.0.0.1:7777/api/sessions' -UseBasicParsing -TimeoutSec 8
  $tipo = [string]$r.Headers['Content-Type']
  # Un 200 solo no prueba nada: server.js responde index.html a cualquier ruta
  # que no reconozca. Hay que exigir JSON.
  if ($r.StatusCode -eq 200 -and $tipo -like '*application/json*') {
    $n = (($r.Content | ConvertFrom-Json).sessions).Count
    Ok "responde 200 application/json - $n sesiones"
  } else {
    Falla "responde $($r.StatusCode) $tipo (se esperaba JSON)"; exit 1
  }
} catch {
  Falla "el panel no respondio: $($_.Exception.Message)"; exit 1
}

""; "=" * 64
"LISTO. http://localhost:7777"
"Ahora MIRALO: las fuentes se sustituyen en silencio."
