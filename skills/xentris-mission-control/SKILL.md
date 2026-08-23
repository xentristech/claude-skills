---
name: xentris-mission-control
description: Buena práctica de agente Xentris Tech. Instala "Mission Control", un panel local (Node sin dependencias, puerto 7777, solo 127.0.0.1) que lee los transcripts de Claude Code en ~/.claude/projects y muestra en tiempo real qué hace cada sesión: semáforo de estado, qué hace ahora en lenguaje humano, y modo presentación para clientes. Un clic en la tarjeta trae al frente la ventana que esa sesión ya tiene abierta. Aplica el manual de marca Xentris (Mansfield/Cropar incrustadas, sin CDN) y opcionalmente se empaqueta como aplicacion de escritorio con Electron. Úsala cuando pidan "mission control", "panel/dashboard de agentes", "ver qué hacen mis agentes", "observabilidad de agentes", "monitor de sesiones de Claude", o al montarlo en otro PC.
---

# Mission Control — panel de observabilidad de agentes (Xentris Tech)

Mission Control es el **"Windows" de los agentes de IA**: una sola pantalla que muestra, en tiempo real y en lenguaje humano, **qué está haciendo cada sesión de Claude Code**. Resuelve la observabilidad de agentes — el dolor de tener muchas sesiones abiertas sin saber cuál trabaja, cuál terminó y cuál te espera; y de no poder mostrarle a un cliente el trabajo sin que vea "Matrix" en la terminal.

**Cómo funciona:** cada sesión de Claude Code escribe todo lo que hace, en tiempo real, en archivos `.jsonl` dentro de `~/.claude/projects/`. Esa información **ya existe**; Mission Control solo la lee y la pinta. Es un servidor Node **sin dependencias**, que escucha **solo en 127.0.0.1** (nada sale del equipo), en el puerto **7777**, y el dashboard se refresca cada 4 s.

Por cada sesión muestra una tarjeta encabezada por el **nombre de la conversación** (el mismo que lleva la ventana de la terminal), con la carpeta del proyecto debajo, **semáforo de estado** (🟢 Trabajando / 🟡 Esperándote / ⏸ Pausada / ⚪ Inactiva), qué hace ahora en una frase, la última instrucción del usuario, una línea de tiempo de acciones, el modelo y si usa subagentes. Trae un botón **"Modo presentación"** que oculta lo técnico para compartir pantalla con un cliente.

**Un clic en cualquier tarjeta abre esa sesión en su propia ventana**, retomando la conversación donde iba (ver más abajo).

## Archivos de referencia (en `reference/`)
- `server.js` — servidor Node puro (lee `~/.claude/projects`, sirve el dashboard, API `/api/sessions` y `POST /api/abrir` para abrir una sesión). Portable a cualquier OS.
- `index.html` — dashboard base, accesible y responsive; el logo tiene fallback a texto si falta el PNG.
  ⚠️ **Viene con Montserrat por CDN, que NO es la tipografia de Xentris.** No lo instales tal cual: pasalo siempre por `aplicar-marca.js` (paso 1.5).
- `logo.png` — wordmark oficial de Xentris (opcional; si el proyecto tiene su propia marca, reemplázalo).
- `estado-ventanas.ps1` — lee el glifo de estado del título de cada ventana: es la **única señal en vivo** de qué sesión está trabajando (el `.jsonl` no se escribe durante el turno). Ver *El semáforo*.
- `enfocar.ps1` — trae al frente la ventana que una sesión ya tiene abierta (solo Windows). Si falta, el panel simplemente abre una ventana nueva cada vez.
- `main.js` + `package.json` — **opcional**: envuelven el panel en una **aplicación de Windows** (Electron) con ventana propia, bandeja y servidor incrustado. Ver la sección *Aplicación de escritorio*.
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
# Verificar: 200 Y ADEMAS JSON. Ojo: server.js responde index.html a cualquier ruta
# que no reconozca, asi que un 200 por si solo no prueba que la API este viva.
$r = Invoke-WebRequest 'http://127.0.0.1:7777/api/sessions' -UseBasicParsing
"$($r.StatusCode) $($r.Headers['Content-Type'])"   # -> 200 application/json; charset=utf-8
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
- Si prefiere una **aplicación de Windows** en vez del navegador, ofrécele empaquetarla: ver *Aplicación de escritorio* más abajo.

## El semáforo: por qué el archivo no basta

**Medido el 2026-08-23: el transcript `.jsonl` no se escribe mientras un turno está en
marcha.** Su `mtime` se queda congelado hasta que el turno termina o entra un mensaje del
usuario — se comprobó con 27 minutos de trabajo continuo sin que el archivo cambiara, y
barriendo `~/.claude` entero sin encontrar ningún otro archivo tocado en 10 minutos.

Consecuencia: un semáforo calculado solo con `mtime` marca **"Esperándote" o "Inactiva"
justo a las sesiones que están trabajando**. El panel llegó a mostrar *0 trabajando* con
siete terminales abiertas.

La señal que sí va en vivo es el **título de la ventana**: Claude Code le antepone un glifo
de estado.

| Glifo | Significado |
|---|---|
| `✳` (U+2733) | la sesión está quieta |
| `◐` (U+25D0) | trabajando |

`estado-ventanas.ps1` enumera las ventanas visibles y devuelve `{glifo, título}`. `server.js`
lo llama **en segundo plano** cada 3 s y la respuesta usa la última foto: nunca espera a
PowerShell. Cada sesión trae un campo `fuenteEstado` — `ventana` (en vivo) o `archivo` (no
hay ventana abierta y se cae al `mtime`).

Tres decisiones que conviene no deshacer:

- **Cualquier glifo distinto de `✳` cuenta como trabajando.** Si Claude añade cuadros de
  animación, la detección sigue en pie; al revés, se apagaría en silencio.
- **La salida del script es JSON escapado a ASCII (`\uXXXX`).** Lo que PowerShell entrega a
  otro proceso cruza el codepage de la consola, y ahí los glifos y los acentos se corrompen
  sin avisar.
- **Si falta el script, se degrada al `mtime`**, no se rompe. En macOS/Linux no hay
  equivalente todavía: allí el semáforo sigue siendo el del archivo.

**"Qué hace ahora" va con retraso, y es inevitable:** esa frase sale del transcript, que no
se escribe hasta que el turno cierra. El semáforo es en vivo; la frase, no.

## Clic en una tarjeta → abre esa sesión

Cada tarjeta es un botón: al hacer clic (o Enter/Espacio, que también funcionan) se abre una
terminal en la carpeta de esa sesión y se retoma la conversación con `claude --resume <id>`.
Es la diferencia entre *ver* que un agente te espera y *poder atenderlo* sin buscar la ventana.

**Cómo está resuelto y por qué así:**

- **Primero enfoca la ventana que ya existe.** Solo si no encuentra ninguna abre una nueva.
  Esto era lo que faltaba: sin ello, hacer clic en una sesión ya abierta creaba una segunda
  ventana sobre el mismo hilo.
- **Cómo la encuentra** (esta es la parte no obvia): Claude Code pone el nombre de la
  conversación en el título de la ventana de la terminal, y guarda ese mismo texto en el
  transcript como evento `ai-title`. Comparar uno con otro da un puente fiable entre sesión y
  ventana — no hay PID en el transcript, así que este es el único enlace disponible.
  `enfocar.ps1` enumera las ventanas, ignora el glifo de estado que Claude antepone y trae la
  coincidencia al frente.
- **Si la sesión está `working` y no se halló su ventana**, el panel pregunta antes de abrir:
  duplicar un hilo activo solo lo enreda. Si sí la halló, la enfoca sin preguntar nada.
- **En modo presentación el clic queda inhabilitado.** Nadie quiere que se abran terminales
  mientras le comparte pantalla a un cliente.

**Dos trampas de Windows que ya están resueltas en `enfocar.ps1`:**

1. `GetWindowTextW` **necesita `CharSet=CharSet.Unicode`** en el `DllImport`. Sin eso el
   marshaller lee la cadena ancha como ANSI y **cada título se corta en su primer carácter**
   — sin error, solo resultados vacíos que parecen "no hay ventanas".
2. Windows **bloquea `SetForegroundWindow`** desde un proceso que no está al frente. Hay que
   engancharse con `AttachThreadInput` al hilo de la ventana que sí lo está, pedir el foco y
   soltar.

**Seguridad del endpoint `POST /api/abrir`** (importante: es el único que ejecuta algo):

- Del cuerpo solo se lee un **id**, que se valida con una expresión regular y se busca entre
  las sesiones reales del disco. **La carpeta y el título salen del transcript, nunca de la
  petición** — así no hay forma de inyectar una ruta ni un comando.
- El título va a PowerShell por **variable de entorno**, no por argumento: cero comillas que
  escapar y ninguna superficie de inyección.
- Exige la cabecera `X-Mission-Control: 1`, lo que obliga a preflight CORS y deja fuera a
  cualquier web que intente golpear el puerto 7777 desde el navegador del usuario. Además se
  valida el `Origin` y se corta el cuerpo a 4 KB.
- El servidor sigue escuchando **solo en 127.0.0.1**. No lo expongas: ahora, además de leer
  transcripts, abre procesos.

En Windows la ventana nueva sale de un `.bat` temporal (evita el infierno de comillas de
`start` + `cmd /k`); en macOS usa `osascript` con Terminal y en Linux `x-terminal-emulator`.
El enfoque de ventanas es solo Windows; en otros sistemas siempre abre una nueva.

## Resumen del proyecto y artefactos publicados

Dos datos más que el panel saca sin que nadie los mantenga a mano.

**Pastilla de resumen.** Al pasar el mouse (o tabular) sobre el nombre del proyecto sale una
pastilla que dice de qué va ese proyecto, y **de qué archivo lo sacó**. El servidor busca por
orden `.claude/RESUMEN.md`, `README.md`, `CLAUDE.md`, `docs/README.md`, toma el primer párrafo
de verdad — saltándose frontmatter, títulos, insignias y bloques HTML — y lo recorta a 300
caracteres. Se cachea por carpeta contra la fecha del archivo, así que no se relee en disco en
cada refresco. Si el proyecto no tiene ninguno de esos archivos, simplemente no hay pastilla:
el nombre se queda como estaba.

Para escribir un resumen a medida sin tocar el README, crea `.claude/RESUMEN.md` en el
proyecto: tiene prioridad sobre todo lo demás.

**Chips de artefacto.** Si la sesión publicó artefactos, aparecen como enlaces al pie de la
tarjeta con su emoji y su descripción. Salen de emparejar cada llamada al `Artifact` con su
resultado: la llamada trae la descripción y el favicon, y el resultado trae la URL en el texto
`Published <archivo> at <url>`. Un artefacto republicado se queda con su descripción más
reciente, no con la primera, y solo cuentan las publicaciones (no las lecturas ni los
comentarios). Se muestran los tres últimos.

Un clic en un chip abre el artefacto, **no** la sesión: el manejador de la tarjeta ignora los
clics que caen sobre un enlace.

---

## Aplicación de escritorio (opcional, Windows)

El panel se puede envolver en una **aplicación de Windows** para que no dependa del
navegador: ventana propia sin barra de direcciones, ícono en la bandeja del reloj,
arranque con el sistema y **el servidor adentro** — no hay que abrir el `.bat`.

Dos archivos de `reference/` lo hacen:

- `main.js` — proceso principal de Electron: ventana, bandeja, enlaces externos y arranque
  del servidor.
- `package.json` — dependencias y la configuración de empaquetado (electron-builder).

**No duplica nada.** `main.js` hace `require('./server.js')`: es el mismo servidor, en el
mismo proceso. Por eso los dos archivos van **dentro de la carpeta del panel**, junto a
`server.js`, `index.html`, `logo.png` y `enfocar.ps1`, no en una carpeta aparte.

```powershell
$mc = "$env:USERPROFILE\mission-control"
Copy-Item "<ruta-al-skill>\reference\main.js"      "$mc\main.js"      -Force
Copy-Item "<ruta-al-skill>\reference\package.json" "$mc\package.json" -Force
cd $mc
npm install --save-dev electron@latest electron-builder@latest
node node_modules\electron\install.js    # ver trampa 1
npm run dist                              # -> dist\Mission Control Setup 1.0.0.exe
```

El instalador crea el acceso en el escritorio y en el menú inicio, con el ícono de marca.
Se instala **por usuario**, sin pedir administrador.

### Cómo se comporta

- **La X no cierra la app**, la esconde en la bandeja: es un monitor, está para quedarse.
  La primera vez avisa con un globo. Para cerrarla de verdad: clic derecho en la bandeja →
  *Salir*.
- **Una sola instancia.** Volver a abrir el ícono trae al frente la ventana que ya está.
- **Si ya hay un servidor corriendo** (el `.bat` de siempre), la app se conecta a ese en vez
  de levantar otro. Si el puerto lo tiene un programa ajeno, lo dice en pantalla en vez de
  fingir que todo va bien.
- **Los chips de artefacto abren el navegador de verdad.** Dentro de la app dejarían al
  usuario navegando fuera del panel y sin barra para volver.
- `F5` recarga y `Ctrl+Shift+I` abre las herramientas de desarrollo. No hay menú.

### Cuatro trampas ya resueltas

1. **npm bloquea el script que baja Electron.** `npm install` termina con código 0 y deja
   `node_modules/electron` **sin el binario**: al arrancar da "Electron failed to install
   correctly". Es la política `allow-scripts` de npm. Solución: `node
   node_modules\electron\install.js` a mano, o aprobar los scripts.
2. **`asar` tiene que ir en `false`.** El panel enfoca ventanas lanzando
   `powershell -File enfocar.ps1`, y PowerShell **no puede leer dentro de `app.asar`**.
   Empaquetado en asar, el clic en la tarjeta abriría siempre una ventana nueva.
3. **La sonda del puerto tiene que pegarle a `/api/sessions`.** `server.js` responde
   `index.html` a cualquier ruta que no reconozca, así que una ruta inventada siempre da
   200 y no prueba nada. Hay que exigir además que el `Content-Type` sea JSON.
4. **El `.ico` necesita un tamaño de 256×256** o electron-builder falla. El
   `marca-icon.ico` que genera el paso 1 ya los trae todos (16 a 256).

### Si no quieres compilar nada

Alternativa en un minuto, sin instalar Electron: un acceso directo a Chrome en modo app.

```
chrome.exe --app=http://127.0.0.1:7777 --window-size=1500,1000
```

Da ventana propia sin barra de direcciones, pero necesita Chrome instalado y que el
servidor lo levante el `.bat`.

---

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
