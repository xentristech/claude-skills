---
name: xentris-herramienta-interna
description: Buena práctica de agente Xentris Tech. El método para convertir una idea en una herramienta interna terminada y reproducible en otro equipo: dato que ya existe → servidor local → marca aplicada por script → uso real → aplicación de Windows → skill publicado en GitHub. Úsala cuando el usuario diga "quiero una herramienta para…", "hazme un panel de…", "necesito ver/monitorear…", "levantar esto en mi otro PC", o cuando una tarea manual y repetitiva se pueda automatizar. Caso de referencia completo: Mission Control (skill `xentris-mission-control`).
metadata:
  version: 1.0.0
  author: Xentris Tech
---

# De idea a herramienta instalada — método Xentris

Así se construyó **Mission Control** en dos días: de "sería bueno ver qué hacen mis agentes"
a una aplicación de Windows instalada, con su skill publicado para que otro equipo la levante
en minutos. Este documento es la receta, no la anécdota.

**La regla que gobierna todo lo demás:** la herramienta no está terminada cuando funciona en
tu máquina. Está terminada cuando **otro equipo la instala sin ti**.

---

## 1. Buscar el dato que ya existe

La pregunta que abre la puerta no es *"¿qué habría que medir?"* sino **"¿qué información ya
está escrita en disco que nadie está mirando?"**.

Mission Control no inventó telemetría ni instrumentó nada: cada sesión de Claude Code ya
escribía todo lo que hacía en `~/.claude/projects/*.jsonl`. El trabajo fue **leer y pintar**,
no capturar. Por eso el servidor son ~500 líneas sin dependencias y no hubo que tocar nada
del sistema observado.

Antes de escribir una línea, gasta diez minutos buscando: logs, `.jsonl`, historiales,
carpetas de caché, respuestas de API que ya guardas. **Si hay que instrumentar el origen, el
proyecto acaba de multiplicarse por cinco** — dilo en voz alta antes de empezar.

## 2. Servidor local, sin dependencias, solo `127.0.0.1`

El molde por defecto de una herramienta interna Xentris:

- **Node puro**, módulos nativos (`http`, `fs`, `path`, `os`). Cero `npm install`.
- Escucha en **`127.0.0.1`**, nunca en `0.0.0.0`. Estos datos son de trabajo real: pueden
  llevar rutas de clientes, nombres de proyectos y fragmentos de conversación.
- Un puerto fijo y anotado (Mission Control: **7777**).
- Refresco por *polling* corto (4 s). No hace falta WebSocket para un panel interno.

Sin dependencias no es purismo: es que dentro de un año siga arrancando sin que un
`npm install` se rompa, y que instalarlo en otro equipo sea copiar archivos.

## 3. Traducir a lenguaje humano

Un volcado de datos no es una herramienta. El valor de Mission Control no fue mostrar el JSON
del transcript, fue:

- un **semáforo** (🟢 Trabajando / 🟡 Esperándote / ⏸ Pausada / ⚪ Inactiva),
- una frase de **"qué hace ahora"** en español corriente,
- y un **modo presentación** que esconde lo técnico para compartir pantalla con un cliente.

Regla: por cada campo que muestres, pregúntate *"¿esto se lo puedo enseñar a alguien que no
programa?"*. Si la respuesta es no, o lo traduces o lo escondes tras el modo técnico.

## 4. La marca no se recuerda: se aplica con un script que falla

Nadie mantiene una marca "acordándose". Se mantiene con un script que **sale con código 1**
cuando algo quedó fuera de marca. Ver [[xentris-manual-marca]].

`aplicar-marca.js` de Mission Control trabaja siempre desde un `index.html.orig` (por eso es
idempotente), hace cada reemplazo reportando `[ok]` / `[FALLA]`, y al final cuenta:

```
  CDN externos          0   (debe ser 0)
  Montserrat en uso     0   (debe ser 0)
  @font-face            4   (debe ser 4)
```

Tres cosas que aprendimos ahí:

- **Los `.replace` de cadena exacta fallan en silencio.** Si el HTML cambia de versión, el
  reemplazo no ocurre y nadie se entera. Cada reemplazo tiene que avisar si no encontró nada.
- **Mide el uso, no las menciones.** La primera versión contaba cuántas veces aparecía la
  palabra "Montserrat" y se marcaba a sí misma como fallo: la contaba dentro del comentario
  que explicaba por qué se había quitado. Cuenta `font-family[^;}\n]*Montserrat`, no la palabra.
- **Las fuentes comerciales no viajan en un repo público.** El script las busca en rutas
  locales conocidas y, si no están, falla con instrucciones y un flag `--fuentes "RUTA"`.
  Nunca las metas en el repo para "que sea más fácil".

## 5. Verificar mirando, no confiando

Esta sección existe porque cada una de estas trampas costó tiempo de verdad:

| Trampa | Cómo se ve | Qué hacer |
|---|---|---|
| Un `200` no prueba nada | El servidor responde `index.html` a **cualquier ruta desconocida**, así que pedir `/api/sesiones` (mal escrito) daba 200 alegremente | Pega al endpoint real **y exige el `Content-Type`** |
| Captura antes de tiempo | El screenshot headless salía con "Cargando…" porque se tomó antes del `fetch` | `--virtual-time-budget=8000`, y contrasta con `--dump-dom` |
| Sustitución silenciosa de fuentes | El navegador cambia la tipografía sin avisar | **Renderiza y mira la imagen**, no confíes en el conteo |
| Mojibake en `file://` | "sesiÃ³n" al abrir el HTML local | Es Chrome asumiendo Latin-1 en archivos locales, no un defecto: sírvelo por HTTP |
| Instalador "exitoso" y vacío | `npm install` termina en 0 pero deja `node_modules/electron` sin binario | npm bloquea el postinstall: `node node_modules\electron\install.js` |

La consigna corta: **si no lo viste renderizado, no está verificado.**

## 6. Soltarlo y dejar que el uso lo corrija

Las tres mejores funciones de Mission Control no estaban en el diseño. Salieron de usarlo:

1. La tarjeta se titula con el **nombre de la conversación**, no con la carpeta.
2. El clic **enfoca la ventana que la sesión ya tiene abierta** en vez de abrir otra.
3. Al pasar el mouse por el proyecto sale su **resumen**, y abajo los **artefactos publicados**.

La segunda merece una nota, porque es una lección sobre cómo trabajar: estaba descartada por
frágil y así quedó escrito en el skill. El usuario la pidió después de usar la herramienta a
diario, y al buscar de nuevo apareció el puente que faltaba — el evento **`ai-title`** del
transcript, que guarda el mismo texto que Claude Code pone en el título de la ventana (el
transcript **no registra PID**: es el único enlace posible).

**Cuando quien usa la herramienta todos los días insiste en algo que descartaste, vuelve a
buscar el puente técnico.** La primera negativa suele ser falta de un dato, no un límite real.

## 7. Empaquetar solo cuando ya se usa

Primero navegador. **Cuando ya es parte de la rutina**, y solo entonces, se empaqueta.
Empaquetar de entrada es gastar un día en instaladores de algo que quizá nadie abre.

Mission Control pasó a aplicación de Windows con Electron: ventana propia, ícono en la bandeja,
arranque con el sistema y el servidor **adentro** (`main.js` hace `require('./server.js')`, no
lanza un Node aparte — una sola copia del servidor, jamás dos). El detalle completo, con sus
cuatro trampas, está en el skill `xentris-mission-control`.

Dos decisiones que se repiten en cualquier envoltorio de este tipo:

- **La X esconde, no cierra.** Un monitor está para quedarse; el ícono de bandeja lo hace visible.
- **Los enlaces externos van al navegador de verdad.** Dentro de la app dejarían al usuario
  navegando fuera del panel y sin barra para volver.

## 8. Convertirlo en skill y publicarlo

Una herramienta que solo vive en un PC es un rehén. El cierre del trabajo es:

1. `SKILL.md` + carpeta `reference/` con los archivos reales que se copian.
2. **Descripción corta.** Pasada de ~900 caracteres, el cargador la ignora y muestra solo el
   H1. Mission Control quedó en ~750. Mídela, no la calcules a ojo.
3. Pasos ejecutables (PowerShell y bash), con la verificación dentro del paso.
4. **Una sección de trampas.** Es la parte más valiosa del documento: el éxito se reproduce
   solo, las trampas no.
5. Publicar en `xentristech/claude-skills` y **listarlo en el README** — si no está en la tabla,
   en el otro equipo no existe.
6. Guardar en memoria (ver [[xentris-memoria-proyecto]]) lo que **no** se deduce del código:
   dónde quedó instalado, qué decisión se tomó y por qué.
7. Si sirve para enseñársela a alguien, una **página explicativa como artefacto**, republicada
   siempre sobre la misma URL.

---

## Levantarlo en otro equipo

El caso normal: la herramienta ya existe en un PC y hay que reproducirla en otro, que puede
tener otras rutas, otro servidor y hasta otro sistema operativo.

```powershell
git clone https://github.com/xentristech/claude-skills.git $env:USERPROFILE\claude-skills
Copy-Item -Recurse -Force $env:USERPROFILE\claude-skills\skills\* $env:USERPROFILE\.claude\skills\
```

Luego reinicia Claude Code y pídele la herramienta por su nombre. Lo que **sí** cambia de una
máquina a otra, y por eso nunca debe ir escrito a fuego en el código:

- **Rutas del usuario.** Siempre `os.homedir()` / `$env:USERPROFILE`, nunca `C:\Users\xentr\…`.
- **Fuentes de marca.** No están en el repo: el script las busca en varias rutas y acepta
  `--fuentes "RUTA"`. En un equipo nuevo es lo primero que falla, y falla con instrucciones.
- **El puerto.** Si ese equipo ya tiene algo escuchando ahí, la herramienta tiene que **decirlo**,
  no adivinar. Distingue "libre", "es mío" y "es de otro programa".
- **El sistema operativo.** El servidor es portable; lo que no lo es son los envoltorios
  (`enfocar.ps1`, el `.lnk`, el instalador). Deja el camino de Windows y el de macOS/Linux
  escritos por separado, y que la ausencia del envoltorio **degrade**, no rompa.

Si el otro equipo va a correr el servidor **de forma permanente**, no lo dejes en un `.bat`:
usa el skill `xentris-desplegar-vps` para servicio con arranque automático, y mantén la regla
de que un panel con datos de trabajo **no se expone a internet sin autenticación**.

## Seguridad: el molde que se copia

Si la herramienta expone un endpoint que *hace* algo (abrir, borrar, ejecutar), el molde es el
de `POST /api/abrir` de Mission Control:

- **Nada ejecutable viaja en la petición.** Se manda un `id`, nunca una ruta ni un comando.
- El `id` se valida con expresión regular **y** se busca contra lo que hay en disco. Si no
  corresponde a algo real, 400.
- El cuerpo se corta por tamaño (`if (cuerpo.length > 4096) req.destroy()`).
- **CSRF por cabecera obligatoria** (`x-mission-control: 1`): fuerza un preflight que una página
  cualquiera del navegador no puede saltarse. Sin ella, 403.
- El `Origin` se acepta solo si es `127.0.0.1` o `localhost`.
- Los argumentos peligrosos (un título de ventana) van por **variable de entorno**, no como
  argumento de línea de comandos: no hay comillas que escapar ni inyección posible.

Pruébalo de verdad antes de cerrar: sin la cabecera debe dar **403**, y con un `id` inventado, **400**.

## Checklist de cierre

- [ ] Arranca en una máquina limpia siguiendo solo el `SKILL.md`
- [ ] Ninguna ruta de usuario está escrita a fuego
- [ ] La verificación del arranque comprueba contenido, no solo el código 200
- [ ] Lo miraste renderizado, con la marca puesta
- [ ] Escucha solo en `127.0.0.1`
- [ ] El skill está en el repo **y** en la tabla del README
- [ ] La memoria dice dónde quedó instalado y qué decisión no es obvia
- [ ] Las trampas están escritas — sobre todo las que costaron una hora
