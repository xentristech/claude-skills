---
name: xentris-mission-control
description: Buena práctica de agente Xentris Tech. Instala "Mission Control", un panel local (Node, sin dependencias, puerto 7777, solo 127.0.0.1) que lee los transcripts de Claude Code en ~/.claude/projects y muestra en tiempo real qué hace cada sesión/agente — con semáforo de estado (trabajando/esperándote/pausada/inactiva), qué hace ahora en lenguaje humano, y un "modo presentación" para mostrárselo a clientes. Es la "capa visual" (el Windows) para observar agentes. Úsala cuando el usuario pida "mission control", "panel/dashboard de agentes", "ver qué hacen mis agentes", "observabilidad de agentes", "monitor de sesiones de Claude", "un tablero para orquestar agentes", o al montar el mismo panel en otro PC con agentes. Marca Xentris (paleta morada oficial, logo, Montserrat, iconos SVG). El panel funciona en cualquier OS; el launcher/.lnk es solo Windows.
---

# Mission Control — panel de observabilidad de agentes (Xentris Tech)

Mission Control es el **"Windows" de los agentes de IA**: una sola pantalla que muestra, en tiempo real y en lenguaje humano, **qué está haciendo cada sesión de Claude Code**. Resuelve la observabilidad de agentes — el dolor de tener muchas sesiones abiertas sin saber cuál trabaja, cuál terminó y cuál te espera; y de no poder mostrarle a un cliente el trabajo sin que vea "Matrix" en la terminal.

**Cómo funciona:** cada sesión de Claude Code escribe todo lo que hace, en tiempo real, en archivos `.jsonl` dentro de `~/.claude/projects/`. Esa información **ya existe**; Mission Control solo la lee y la pinta. Es un servidor Node **sin dependencias**, que escucha **solo en 127.0.0.1** (nada sale del equipo), en el puerto **7777**, y el dashboard se refresca cada 4 s.

Por cada sesión muestra una tarjeta con: proyecto, **semáforo de estado** (🟢 Trabajando / 🟡 Esperándote / ⏸ Pausada / ⚪ Inactiva), qué hace ahora en una frase, la última instrucción del usuario, una línea de tiempo de acciones, el modelo y si usa subagentes. Trae un botón **"Modo presentación"** que oculta lo técnico para compartir pantalla con un cliente.

## Archivos de referencia (en `reference/`)
- `server.js` — servidor Node puro (lee `~/.claude/projects`, sirve el dashboard, API `/api/sessions`). Portable a cualquier OS.
- `index.html` — dashboard con la marca Xentris (paleta oficial, Montserrat, iconos SVG, accesible, responsive). El logo tiene fallback a texto si falta el PNG.
- `logo.png` — wordmark oficial de Xentris (opcional; si el proyecto tiene su propia marca, reemplázalo).

## Parámetros a definir antes de instalar
1. **MC_DIR**: carpeta donde vivirá el panel. Por defecto `~/mission-control` (en Windows `C:\Users\<usuario>\mission-control`).
2. **PORT**: puerto del panel. Por defecto **7777** (definido en `server.js`).
3. **LOGO**: opcional. Si el usuario tiene un logo de marca (PNG), cópialo como `logo.png`; si no, se usa el de Xentris o el fallback de texto.

## Pasos

### 1. Copiar los archivos del panel
Crea `MC_DIR` y copia los tres archivos de `reference/` (`server.js`, `index.html`, `logo.png`). No hay `npm install`: el servidor usa solo módulos nativos de Node (`http`, `fs`, `path`, `os`).

```powershell
# Windows (PowerShell)
$mc = "$env:USERPROFILE\mission-control"
New-Item -ItemType Directory -Force -Path $mc | Out-Null
Copy-Item "<ruta-al-skill>\reference\server.js" "$mc\server.js" -Force
Copy-Item "<ruta-al-skill>\reference\index.html" "$mc\index.html" -Force
Copy-Item "<ruta-al-skill>\reference\logo.png"  "$mc\logo.png"  -Force
```

```bash
# macOS / Linux
mkdir -p ~/mission-control
cp reference/server.js reference/index.html reference/logo.png ~/mission-control/
```

### 2. Arrancar y verificar
Requiere **Node.js** (cualquier versión moderna; verifícalo con `node --version`).

```powershell
Start-Process node -ArgumentList "$mc\server.js" -WindowStyle Hidden
Start-Sleep -Seconds 2
# Verificar: deben responder 200
(Invoke-WebRequest 'http://127.0.0.1:7777/api/sessions' -UseBasicParsing).StatusCode
Start-Process 'http://localhost:7777'
```

El `server.js` maneja `EADDRINUSE`: si ya hay un panel corriendo en 7777, no duplica — solo avisa.

### 3. (Solo Windows) Launcher + acceso directo en el escritorio
Igual que la skill `xentris-acceso-rapido`: un `.bat` que arranca el servidor y abre el navegador, y un `.lnk` con el ícono de marca. Windows no permite ícono en un `.bat`, por eso se crean los dos.

```powershell
$mc = "$env:USERPROFILE\mission-control"
$bat = "$mc\mission-control.bat"
@"
@echo off
start "Mission Control Server" /min cmd /c "node ""$mc\server.js"""
timeout /t 1 /nobreak >nul
start "" http://localhost:7777
"@ | Set-Content -LiteralPath $bat -Encoding ascii

$desktop = [Environment]::GetFolderPath('Desktop')
$ico = "$env:USERPROFILE\xentris-icon.ico"   # ícono de marca si existe
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut((Join-Path $desktop "Mission Control.lnk"))
$lnk.TargetPath = $bat
$lnk.WorkingDirectory = $mc
$lnk.Description = "Mission Control - Panel de agentes (Xentris Tech)"
if (Test-Path $ico) { $lnk.IconLocation = $ico }
$lnk.Save()
```

En macOS/Linux, en vez del `.lnk`, deja un alias o un `mission-control.sh` con `node ~/mission-control/server.js & open http://localhost:7777`.

### 4. Confirmar al usuario
- Doble clic en **"Mission Control"** (el `.lnk`) abre el panel; si el servidor ya corre, solo abre la pestaña.
- Recuérdale el **modo presentación** (botón arriba a la derecha) para mostrarle el trabajo a un cliente.

## Cómo ajustar (parámetros dentro de `server.js`)
Al inicio del archivo hay constantes fáciles de tocar:
- `PORT` (7777), `MAX_AGE_DAYS` (7 — cuántos días de sesiones mostrar), `MAX_SESSIONS` (30), `WORKING_WINDOW_MS` (120000 — cuánto silencio cuenta como "dejó de trabajar"), `TAIL_BYTES` (cuánto lee del final de cada transcript).
La función `describeTool()` traduce cada herramienta a una frase en español; agrégale casos si aparecen herramientas nuevas.

## Marca (para mantenerlo on-brand Xentris)
El `index.html` usa la **paleta oficial del brandbook**: morado `#8B3BC0`, navy `#1B123F`/`#0D0D0D`, lila `#c9a3ec`; fuente **Montserrat**; **iconos SVG** (nunca emojis en la interfaz); foco visible, `prefers-reduced-motion` y números tabulares. Para otra marca, cambia solo los tokens `:root` y el `logo.png`.

## Buenas prácticas Xentris Tech (contexto)
- **Observabilidad = supervisión humana visible.** Es la última capa de gobernanza de agentes: antes de escalar una automatización con IA, asegúrate de poder **ver y contar** lo que hace. Combínalo con [[xentris-orquestador]] (cuando corras varios agentes en paralelo, este panel te dice el estado de cada uno).
- **Local y privado:** el panel escucha solo en `127.0.0.1`; **nunca** lo expongas a internet ni a `0.0.0.0` sin autenticación — los transcripts pueden contener contenido sensible del trabajo.
- **Sin secretos:** no metas API keys ni rutas privadas en el `.bat` ni en el repo.
- **Continuidad:** guarda la instalación en la memoria del proyecto ([[xentris-memoria-proyecto]]) para retomarla en otro equipo.
