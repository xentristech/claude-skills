---
name: xentris-mission-control
description: Buena práctica de agente Xentris Tech. Instala "Mission Control", un panel local (Node sin dependencias, puerto 7777, solo 127.0.0.1) que lee los transcripts de Claude Code en ~/.claude/projects y muestra en tiempo real qué hace cada sesión: semáforo de estado, qué hace ahora en lenguaje humano, y modo presentación para clientes. Cada tarjeta abre su sesión en una ventana nueva. Aplica el manual de marca Xentris (Mansfield/Cropar incrustadas, sin CDN). Úsala cuando pidan "mission control", "panel/dashboard de agentes", "ver qué hacen mis agentes", "observabilidad de agentes", "monitor de sesiones de Claude", o al montarlo en otro PC.
---

# Mission Control — panel de observabilidad de agentes (Xentris Tech)

Mission Control es el **"Windows" de los agentes de IA**: una sola pantalla que muestra, en tiempo real y en lenguaje humano, **qué está haciendo cada sesión de Claude Code**. Resuelve la observabilidad de agentes — el dolor de tener muchas sesiones abiertas sin saber cuál trabaja, cuál terminó y cuál te espera; y de no poder mostrarle a un cliente el trabajo sin que vea "Matrix" en la terminal.

**Cómo funciona:** cada sesión de Claude Code escribe todo lo que hace, en tiempo real, en archivos `.jsonl` dentro de `~/.claude/projects/`. Esa información **ya existe**; Mission Control solo la lee y la pinta. Es un servidor Node **sin dependencias**, que escucha **solo en 127.0.0.1** (nada sale del equipo), en el puerto **7777**, y el dashboard se refresca cada 4 s.

Por cada sesión muestra una tarjeta con: proyecto, **semáforo de estado** (🟢 Trabajando / 🟡 Esperándote / ⏸ Pausada / ⚪ Inactiva), qué hace ahora en una frase, la última instrucción del usuario, una línea de tiempo de acciones, el modelo y si usa subagentes. Trae un botón **"Modo presentación"** que oculta lo técnico para compartir pantalla con un cliente.

**Un clic en cualquier tarjeta abre esa sesión en su propia ventana**, retomando la conversación donde iba (ver más abajo).

## Archivos de referencia (en `reference/`)
- `server.js` — servidor Node puro (lee `~/.claude/projects`, sirve el dashboard, API `/api/sessions` y `POST /api/abrir` para abrir una sesión). Portable a cualquier OS.
- `index.html` — dashboard base, accesible y responsive; el logo tiene fallback a texto si falta el PNG.
  ⚠️ **Viene con Montserrat por CDN, que NO es la tipografia de Xentris.** No lo instales tal cual: pasalo siempre por `aplicar-marca.js` (paso 1.5).
- `logo.png` — wordmark oficial de Xentris (opcional; si el proyecto tiene su propia marca, reemplázalo).
- `aplicar-marca.js` — **obligatorio**: transforma `index.html` para cumplir el manual (quita el CDN de Google Fonts, incrusta Mansfield + Cropar en base64, corrige los tonos derivados, pone los títulos en itálica black y añade la barra degradada).

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

### 1.5. Aplicar el manual de marca (obligatorio)
El `index.html` original trae Montserrat por CDN. Renómbralo a `index.html.orig`, copia
`aplicar-marca.js` y ejecútalo: genera el `index.html` definitivo con las fuentes de marca
incrustadas. Requiere el paquete de fuentes en
`C:\Users\xentr\proyectos\xentris-empresa\marca\fonts` (ajusta `FONTS_DIR` en otro equipo).

```powershell
Move-Item "$mc\index.html" "$mc\index.html.orig" -Force
Copy-Item "<ruta-al-skill>\reference\aplicar-marca.js" "$mc\aplicar-marca.js" -Force
node "$mc\aplicar-marca.js"   # debe reportar: 0 CDN externos, 0 Montserrat, 4 @font-face
```

**Verifica mirando, no confiando:** los `.replace` de cadena exacta fallan en silencio si el
HTML cambia de versión, y las fuentes se sustituyen sin avisar. Renderiza y revisa la captura:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --disable-gpu `
  --window-size=1500,1000 --screenshot="$mc\verificacion.png" "http://127.0.0.1:7777/"
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
$ico = "$mc\marca-icon.ico"   # generar con PIL desde marca\isotipo-violeta.png
# OJO (manual): logo-x.png NO tiene transparencia y deja recuadro blanco. Usar isotipo-violeta.png.
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

## Clic en una tarjeta → abre esa sesión

Cada tarjeta es un botón: al hacer clic (o Enter/Espacio, que también funcionan) se abre una
terminal en la carpeta de esa sesión y se retoma la conversación con `claude --resume <id>`.
Es la diferencia entre *ver* que un agente te espera y *poder atenderlo* sin buscar la ventana.

**Cómo está resuelto y por qué así:**

- **No se intenta enfocar la ventana existente.** Mapear una sesión a una ventana de Windows
  obliga a adivinar por el título de la terminal, y eso se rompe con cada cambio de shell.
  Retomar la conversación es determinista y deja el hilo intacto.
- **Si la sesión está `working`, el panel pide confirmación** antes de abrir: retomar un hilo
  que ya corre en otra ventana abriría una segunda vista sobre la misma conversación.
- **En modo presentación el clic queda inhabilitado.** Nadie quiere que se abran terminales
  mientras le comparte pantalla a un cliente.

**Seguridad del endpoint `POST /api/abrir`** (importante: es el único que ejecuta algo):

- Del cuerpo solo se lee un **id**, que se valida con una expresión regular y se busca entre
  las sesiones reales del disco. **La carpeta sale del transcript, nunca de la petición** —
  así no hay forma de inyectar una ruta ni un comando.
- Exige la cabecera `X-Mission-Control: 1`, lo que obliga a preflight CORS y deja fuera a
  cualquier web que intente golpear el puerto 7777 desde el navegador del usuario. Además se
  valida el `Origin` y se corta el cuerpo a 4 KB.
- El servidor sigue escuchando **solo en 127.0.0.1**. No lo expongas: ahora, además de leer
  transcripts, abre procesos.

En Windows abre un `.bat` temporal (evita el infierno de comillas de `start` + `cmd /k`); en
macOS usa `osascript` con Terminal y en Linux `x-terminal-emulator`.

## Cómo ajustar (parámetros dentro de `server.js`)
Al inicio del archivo hay constantes fáciles de tocar:
- `PORT` (7777), `MAX_AGE_DAYS` (7 — cuántos días de sesiones mostrar), `MAX_SESSIONS` (30), `WORKING_WINDOW_MS` (120000 — cuánto silencio cuenta como "dejó de trabajar"), `TAIL_BYTES` (cuánto lee del final de cada transcript).
La función `describeTool()` traduce cada herramienta a una frase en español; agrégale casos si aparecen herramientas nuevas.

## Marca (para mantenerlo on-brand Xentris)
El `index.html` de `reference/` viene con **Montserrat y un CDN de Google Fonts** — eso **no es la marca**:
el manual (`xentris-manual-marca`, MANUAL p.22) dice que el cuerpo va en **Mansfield Medium**, los
títulos en **Mansfield Black Italic** y la palabra XENTRIS **siempre en Cropar**. Por eso el paso 1.5
ejecuta `aplicar-marca.js`, que deja:

- Paleta oficial: negro `#0D0D0D`, índigo `#1B123F`, púrpura `#331659`, violeta `#8B3BC0`, blanco `#FFFFFF`;
  derivados **del manual** (`--hi:#a95fd6`, `--glow:#c78ce8`) — no `#c9a3ec` ni violetas inventados.
- Fuentes **incrustadas en base64** (cero peticiones externas; el panel funciona sin internet).
- **Barra degradada** bajo el título — el recurso gráfico más repetido del manual.
- **Iconos SVG** (nunca emojis en la interfaz), foco visible, `prefers-reduced-motion`, números tabulares.

Para otra marca, cambia los tokens `:root`, el `logo.png` y las rutas de fuentes en `aplicar-marca.js`.

## Buenas prácticas Xentris Tech (contexto)
- **Observabilidad = supervisión humana visible.** Es la última capa de gobernanza de agentes: antes de escalar una automatización con IA, asegúrate de poder **ver y contar** lo que hace. Combínalo con [[xentris-orquestador]] (cuando corras varios agentes en paralelo, este panel te dice el estado de cada uno).
- **Local y privado:** el panel escucha solo en `127.0.0.1`; **nunca** lo expongas a internet ni a `0.0.0.0` sin autenticación — los transcripts pueden contener contenido sensible del trabajo.
- **Sin secretos:** no metas API keys ni rutas privadas en el `.bat` ni en el repo.
- **Continuidad:** guarda la instalación en la memoria del proyecto ([[xentris-memoria-proyecto]]) para retomarla en otro equipo.
