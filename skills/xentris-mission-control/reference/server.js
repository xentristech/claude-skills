// Mission Control — Xentris Tech
// Dashboard local que observa las sesiones de Claude Code en ~/.claude/projects
// Sin dependencias: Node.js puro. Puerto 7777.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const PORT = 7777;
const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const TAIL_BYTES = 384 * 1024;      // cuánto leer del final de cada transcript
const MAX_SESSIONS = 30;
const MAX_AGE_DAYS = 7;             // sesiones más viejas no se muestran
const WORKING_WINDOW_MS = 120 * 1000; // modificado hace <2 min = trabajando
const GLIFO_QUIETA = '✳';        // el que Claude pone cuando NO esta trabajando
const VENTANAS_TTL_MS = 3000;         // cada cuanto se vuelve a mirar la barra de titulos

// ---------- utilidades ----------

function tailFile(file, bytes) {
  try {
    const stat = fs.statSync(file);
    const start = Math.max(0, stat.size - bytes);
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(stat.size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    let text = buf.toString('utf8');
    if (start > 0) {
      const nl = text.indexOf('\n');
      if (nl >= 0) text = text.slice(nl + 1); // descartar línea partida
    }
    return text.split('\n').filter(l => l.trim().length > 0);
  } catch (e) {
    return [];
  }
}

function parseLines(lines) {
  const out = [];
  for (const l of lines) {
    try { out.push(JSON.parse(l)); } catch (e) { /* línea corrupta, ignorar */ }
  }
  return out;
}

function basename(p) {
  if (!p) return '';
  return String(p).split(/[\\/]/).pop();
}

// El texto sale de mensajes escritos en markdown. Los asteriscos, almohadillas
// y comillas invertidas no aportan nada leidos de un vistazo y se comen la
// mitad de una ficha compacta, asi que se quitan las MARCAS, no el contenido.
function limpiarMarcado(s) {
  return String(s)
    .replace(/```[\s\S]*?```/g, ' ')      // bloques de codigo enteros: no se leen de un vistazo
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/(^|\s)[*_]{1,2}(\S)/g, '$1$2')
    .replace(/(\S)[*_]{1,2}(\s|$)/g, '$1$2')
    .replace(/(^|\s)#{1,6}\s+/g, '$1')
    .replace(/(^|\s)[-–—]{3,}(\s|$)/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');  // enlaces: se queda el texto
}

function shorten(s, n) {
  if (!s) return '';
  s = limpiarMarcado(s).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// Traduce un tool_use a una frase humana en español
function describeTool(name, input) {
  input = input || {};
  if (input.description) return shorten(input.description, 90);
  switch (name) {
    case 'Read':       return 'Leyendo ' + basename(input.file_path);
    case 'Edit':       return 'Editando ' + basename(input.file_path);
    case 'Write':      return 'Escribiendo ' + basename(input.file_path);
    case 'NotebookEdit': return 'Editando notebook ' + basename(input.notebook_path);
    case 'Grep':       return 'Buscando "' + shorten(input.pattern, 30) + '" en el código';
    case 'Glob':       return 'Buscando archivos ' + shorten(input.pattern, 30);
    case 'Bash':
    case 'PowerShell': return 'Ejecutando: ' + shorten(input.command, 70);
    case 'Agent':      return 'Subagente: ' + shorten(input.description || input.prompt, 70);
    case 'Workflow':   return 'Orquestando workflow de agentes';
    case 'WebFetch':   return 'Consultando ' + shorten(input.url, 60);
    case 'WebSearch':  return 'Buscando en la web: ' + shorten(input.query, 60);
    case 'Skill':      return 'Usando skill ' + (input.skill || '');
    case 'Artifact':   return 'Publicando artifact';
    case 'SendUserFile': return 'Enviando archivo al usuario';
    case 'AskUserQuestion': return 'Preguntándole algo al usuario';
    case 'TaskCreate': case 'TaskUpdate': return 'Gestionando lista de tareas';
  }
  if (name && name.startsWith('mcp__')) {
    const parts = name.split('__');
    return 'Usando ' + (parts[1] || 'MCP') + ' → ' + (parts[2] || '');
  }
  return name || 'Trabajando';
}

// ---------- resumen del proyecto ----------
//
// Para la pastilla que sale al pasar el mouse por el nombre del proyecto. Se lee
// del propio repo, por orden de preferencia, y se cachea por carpeta (mirando la
// fecha del archivo) para no releer en disco cada 4 segundos.

const CANDIDATOS_RESUMEN = ['.claude/RESUMEN.md', 'README.md', 'CLAUDE.md', 'docs/README.md'];
const cacheResumen = new Map();   // cwd -> { mtime, resumen }

/** Primer párrafo de verdad: sin títulos, insignias, comentarios ni frontmatter. */
function primerParrafo(texto) {
  const lineas = texto.split(/\r?\n/);
  let i = 0;
  if (lineas[0] && lineas[0].trim() === '---') {          // saltar frontmatter YAML
    i = 1;
    while (i < lineas.length && lineas[i].trim() !== '---') i++;
    i++;
  }
  const partes = [];
  for (; i < lineas.length; i++) {
    const l = lineas[i].trim();
    if (partes.length && !l) break;                       // fin del párrafo
    if (!l) continue;
    if (/^(#{1,6}\s|<!--|<img|<p|<div|!\[|\[!\[|---|===|\||```)/.test(l)) continue;
    if (/^[-*+]\s/.test(l) && !partes.length) continue;   // lista antes del texto
    partes.push(l);
    if (partes.join(' ').length > 320) break;
  }
  let s = partes.join(' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')              // enlaces markdown
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > 300) s = s.slice(0, 299) + '…';
  return s;
}

function resumenProyecto(cwd) {
  if (!cwd) return null;
  try {
    for (const rel of CANDIDATOS_RESUMEN) {
      const f = path.join(cwd, rel);
      let st;
      try { st = fs.statSync(f); } catch (e) { continue; }
      const cache = cacheResumen.get(cwd);
      if (cache && cache.mtime === st.mtimeMs && cache.fuente === rel) return cache.resumen;
      const texto = primerParrafo(fs.readFileSync(f, 'utf8'));
      const resumen = texto ? { texto, fuente: rel } : null;
      cacheResumen.set(cwd, { mtime: st.mtimeMs, fuente: rel, resumen });
      if (resumen) return resumen;
    }
  } catch (e) { /* si el proyecto no se deja leer, la pastilla simplemente no aparece */ }
  return null;
}

// Analiza los eventos del final del transcript y arma el estado de la sesión
function analyzeSession(file, projectFolder) {
  const stat = fs.statSync(file);
  const events = parseLines(tailFile(file, TAIL_BYTES));
  if (events.length === 0) return null;

  let cwd = null, slug = null, model = null, gitBranch = null, version = null;
  // Claude Code pone el titulo de la conversacion en la ventana de la terminal y
  // lo guarda aqui como evento `ai-title`. Es el unico puente fiable entre una
  // sesion y su ventana abierta: con el podemos enfocar la que ya existe en vez
  // de abrir una segunda sobre el mismo hilo.
  let aiTitle = null;
  let lastUserPrompt = null, lastUserPromptTs = null;
  let lastAssistantText = null, lastAssistantTs = null;
  let lastEventKind = null; // 'tool_use' | 'tool_result' | 'assistant_text' | 'user_prompt'
  let firstTs = null, lastTs = null;
  let toolCount = 0, subagentActivity = 0;
  const timeline = []; // últimas acciones humanizadas
  // Artefactos que esta sesión publicó. La llamada trae la descripción y el
  // resultado trae la URL ("Published <archivo> at <url>"), así que hay que
  // emparejar tool_use con su tool_result por id.
  const artefactosPendientes = new Map();
  const artefactos = new Map();   // url -> { url, descripcion, favicon }

  for (const ev of events) {
    if (ev.cwd) cwd = ev.cwd;
    if (ev.slug) slug = ev.slug;
    if (ev.type === 'ai-title' && ev.aiTitle) aiTitle = ev.aiTitle;
    if (ev.gitBranch) gitBranch = ev.gitBranch;
    if (ev.version) version = ev.version;
    if (ev.timestamp) {
      if (!firstTs) firstTs = ev.timestamp;
      lastTs = ev.timestamp;
    }
    if (ev.isSidechain) { subagentActivity++; }

    const msg = ev.message;
    if (!msg || ev.isSidechain) continue;

    if (msg.model) model = msg.model;

    if (ev.type === 'user' && msg.role === 'user') {
      const content = msg.content;
      if (typeof content === 'string') {
        if (!content.startsWith('<') && content.trim()) {
          lastUserPrompt = shorten(content, 140);
          lastUserPromptTs = ev.timestamp;
          lastEventKind = 'user_prompt';
        }
      } else if (Array.isArray(content)) {
        for (const c of content) {
          if (c.type === 'text' && c.text && !c.text.startsWith('<')) {
            lastUserPrompt = shorten(c.text, 140);
            lastUserPromptTs = ev.timestamp;
            lastEventKind = 'user_prompt';
          }
          if (c.type === 'tool_result') {
            lastEventKind = 'tool_result';
            const pend = artefactosPendientes.get(c.tool_use_id);
            if (pend) {
              artefactosPendientes.delete(c.tool_use_id);
              let texto = c.content;
              if (Array.isArray(texto)) {
                texto = texto.map(x => (x && x.text) || '').join(' ');
              }
              const m = String(texto || '').match(/https:\/\/claude\.ai\/code\/artifact\/[A-Za-z0-9-]+/);
              const url = pend.url || (m && m[0]);
              // Un artefacto republicado vuelve a aparecer: nos quedamos con la
              // descripción más reciente, no con la primera.
              if (url) artefactos.set(url, { url, descripcion: pend.descripcion, favicon: pend.favicon });
            }
          }
        }
      }
    }

    if (ev.type === 'assistant' && msg.role === 'assistant' && Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c.type === 'tool_use') {
          toolCount++;
          lastEventKind = 'tool_use';
          if (c.name === 'Artifact') {
            const inp = c.input || {};
            // 'publish' es la acción por defecto; las demás (read, comments…) no crean nada.
            if (!inp.action || inp.action === 'publish') {
              artefactosPendientes.set(c.id, {
                url: inp.url || null,
                descripcion: shorten(inp.description || inp.title || inp.label, 110),
                favicon: (inp.favicon || '').slice(0, 4),
              });
            }
          }
          timeline.push({ ts: ev.timestamp, text: describeTool(c.name, c.input), tool: c.name });
          if (timeline.length > 12) timeline.shift();
        }
        if (c.type === 'text' && c.text && c.text.trim()) {
          lastAssistantText = shorten(c.text, 200);
          lastAssistantTs = ev.timestamp;
          lastEventKind = 'assistant_text';
        }
      }
    }
  }

  const now = Date.now();
  const idleMs = now - stat.mtimeMs;

  // Estado
  let status, statusLabel;
  if (idleMs < WORKING_WINDOW_MS) {
    if (lastEventKind === 'assistant_text') { status = 'waiting'; statusLabel = 'Esperándote'; }
    else { status = 'working'; statusLabel = 'Trabajando'; }
  } else if (idleMs < 30 * 60 * 1000) {
    if (lastEventKind === 'tool_use') { status = 'paused'; statusLabel = 'Pausada (¿permiso pendiente?)'; }
    else { status = 'waiting'; statusLabel = 'Esperándote'; }
  } else {
    status = 'idle'; statusLabel = 'Inactiva';
  }

  // La barra de titulos manda sobre el archivo: es la unica senal en vivo.
  let fuenteEstado = 'archivo';
  const porVentana = estadoPorVentana(aiTitle);
  if (porVentana === 'trabajando') {
    status = 'working'; statusLabel = 'Trabajando'; fuenteEstado = 'ventana';
  } else if (porVentana === 'quieta') {
    fuenteEstado = 'ventana';
    if (status === 'working') { status = 'waiting'; statusLabel = 'Esperandote'; }
  }

  // Ruta legible para la linea de debajo del titulo: la carpeta del usuario se
  // reemplaza por ~ para que no ocupe media tarjeta ni exponga el usuario.
  // Solo las dos ultimas partes: la ruta completa se recorta a "~/pr..." en una
  // tarjeta estrecha y deja de decir nada. Con la carpeta madre basta para
  // ubicarlo (jose/sitemio no es lo mismo que clientes/sitemio).
  let cwdCorto = '';
  if (cwd) {
    const partes = cwd.split(/[\\/]+/).filter(Boolean);
    const cola = partes.slice(-2);
    cwdCorto = (partes.length > 2 ? '…/' : '') + cola.join('/');
  }

  // Nombre de proyecto legible
  let projectName = cwd ? basename(cwd) || cwd : projectFolder;
  if (projectName.toLowerCase() === 'user') projectName = 'Carpeta personal (~)';

  // "Ahora": la mejor frase de qué está pasando
  let nowDoing;
  if (status === 'working' && timeline.length) nowDoing = timeline[timeline.length - 1].text;
  else if (lastAssistantText) nowDoing = lastAssistantText;
  else if (timeline.length) nowDoing = timeline[timeline.length - 1].text;
  else nowDoing = 'Sesión iniciada';

  return {
    id: basename(file).replace('.jsonl', ''),
    slug: slug || null,
    aiTitle,
    projectName,
    cwd, cwdCorto,
    model, gitBranch, version,
    status, statusLabel, fuenteEstado,
    lastModified: stat.mtimeMs,
    idleSeconds: Math.round(idleMs / 1000),
    lastUserPrompt, lastAssistantText,
    nowDoing,
    toolCount,
    subagents: subagentActivity > 0,
    timeline: timeline.slice(-6).reverse(),
    sizeKB: Math.round(stat.size / 1024),
    resumen: resumenProyecto(cwd),
    artefactos: Array.from(artefactos.values()).slice(-3).reverse(),
  };
}

/* ---------- estado en vivo por la barra de titulos ----------
 *
 * El transcript .jsonl NO se escribe mientras un turno esta en marcha: su mtime
 * se queda congelado hasta que el turno termina o entra un mensaje del usuario.
 * Medido: 27 minutos de trabajo continuo sin que el archivo cambiara. Con eso,
 * un semaforo calculado solo con el mtime marca "Esperandote" o "Inactiva"
 * justo a las sesiones que estan trabajando — lo contrario de su proposito.
 *
 * El titulo de la ventana si va en vivo, porque Claude Code le antepone un
 * glifo de estado. Se lee cada VENTANAS_TTL_MS, en segundo plano: la respuesta
 * usa la ultima foto disponible y nunca espera a PowerShell.
 */

let ventanasFoto = { cuando: 0, mapa: new Map() };
let ventanasEnVuelo = false;

function claveTitulo(s) { return String(s || '').trim().toLowerCase(); }

function refrescarVentanas() {
  if (process.platform !== 'win32' || ventanasEnVuelo) return;
  if (Date.now() - ventanasFoto.cuando < VENTANAS_TTL_MS) return;
  const script = path.join(__dirname, 'estado-ventanas.ps1');
  if (!fs.existsSync(script)) return;   // sin el script se degrada al mtime, no se rompe

  ventanasEnVuelo = true;
  const ps = spawn('powershell',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script],
    { windowsHide: true });

  let salida = '';
  ps.stdout.on('data', (d) => { salida += d; if (salida.length > 262144) ps.kill(); });
  ps.on('error', () => { ventanasEnVuelo = false; });

  const corte = setTimeout(() => ps.kill(), 6000);
  ps.on('close', () => {
    clearTimeout(corte);
    ventanasEnVuelo = false;
    try {
      const mapa = new Map();
      for (const v of JSON.parse(salida)) mapa.set(claveTitulo(v.titulo), v.glifo);
      ventanasFoto = { cuando: Date.now(), mapa };
    } catch (e) {
      ventanasFoto.cuando = Date.now();   // reintentar al proximo ciclo, sin perder la foto vieja
    }
  });
}

/** 'trabajando' | 'quieta' | null si esa sesion no tiene ventana abierta. */
function estadoPorVentana(aiTitle) {
  if (!aiTitle) return null;
  const glifo = ventanasFoto.mapa.get(claveTitulo(aiTitle));
  if (glifo === undefined) return null;
  // Conservador: cualquier glifo distinto al de quieta cuenta como trabajando,
  // para que un cuadro nuevo de animacion no apague la deteccion.
  return glifo === GLIFO_QUIETA ? 'quieta' : 'trabajando';
}

function collectSessions() {
  refrescarVentanas();   // en segundo plano; esta respuesta usa la foto anterior
  const results = [];
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 3600 * 1000;
  let folders = [];
  try { folders = fs.readdirSync(PROJECTS_DIR); } catch (e) { return results; }

  for (const folder of folders) {
    const dir = path.join(PROJECTS_DIR, folder);
    let files = [];
    try { files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')); } catch (e) { continue; }
    for (const f of files) {
      const full = path.join(dir, f);
      try {
        const st = fs.statSync(full);
        if (st.mtimeMs < cutoff || st.size < 2000) continue;
        results.push({ full, folder, mtime: st.mtimeMs });
      } catch (e) { /* ignorar */ }
    }
  }
  // Este orden es para ELEGIR las MAX_SESSIONS mas recientes, no para mostrar:
  // aqui todavia no se analizo nada y el mtime es lo unico que hay.
  results.sort((a, b) => b.mtime - a.mtime);
  const sessions = [];
  for (const r of results.slice(0, MAX_SESSIONS)) {
    const s = analyzeSession(r.full, r.folder);
    if (s) sessions.push(s);
  }

  // Orden de presentacion: primero lo que te reclama a TI.
  //   Pausada  -> esta detenida esperando que le des permiso: cuesta minutos.
  //   Esperandote -> te toca a ti.
  //   Trabajando  -> va sola, no necesita nada.
  //   Inactiva    -> al final.
  // Ordenar por mtime seria enganoso: se congela mientras la sesion trabaja,
  // asi que dejaria abajo justo a las que estan en marcha.
  const PRIORIDAD = { paused: 0, waiting: 1, working: 2, idle: 3 };
  sessions.sort((a, b) => {
    const pa = PRIORIDAD[a.status], pb = PRIORIDAD[b.status];
    const d = (pa === undefined ? 9 : pa) - (pb === undefined ? 9 : pb);
    return d !== 0 ? d : b.lastModified - a.lastModified;
  });
  return sessions;
}

// ---------- abrir una sesión en su propia ventana ----------
//
// Al hacer clic en una tarjeta se abre una terminal en la carpeta de esa sesión
// y se retoma la conversación con `claude --resume <id>`.
//
// Seguridad: NO se ejecuta nada que venga en la petición. Del cuerpo solo se lee
// un id, se valida su forma y se busca entre las sesiones reales del disco; la
// carpeta sale del transcript, nunca del cliente. Ademas se exige la cabecera
// X-Mission-Control, que obliga a preflight CORS y deja fuera a cualquier web
// que intente golpear este puerto desde el navegador.

const ID_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/;

function comandoTerminal(cwd, id, titulo) {
  if (process.platform === 'win32') {
    // Un .bat temporal evita el infierno de comillas de `start` + `cmd /k`.
    const bat = path.join(os.tmpdir(), 'mc-abrir-' + id + '.bat');
    fs.writeFileSync(bat,
      '@echo off\r\n'
      + 'title ' + titulo.replace(/[\r\n%&|<>^]/g, ' ') + '\r\n'
      + 'cd /d "' + cwd + '"\r\n'
      + 'claude --resume ' + id + '\r\n', 'ascii');
    return { cmd: 'cmd', args: ['/c', 'start', titulo, bat] };
  }
  const linea = 'cd ' + JSON.stringify(cwd) + ' && claude --resume ' + id;
  if (process.platform === 'darwin') {
    return { cmd: 'osascript', args: ['-e', 'tell application "Terminal" to do script ' + JSON.stringify(linea)] };
  }
  return { cmd: 'x-terminal-emulator', args: ['-e', 'sh', '-c', linea + '; exec $SHELL'] };
}

/**
 * Intenta traer al frente la ventana que YA tiene abierta esa sesión.
 * Devuelve 'FOCUS' | 'MULTI' | 'NONE'  (y 'NONE' ante cualquier problema:
 * no encontrar la ventana nunca debe impedir abrir una nueva).
 */
function enfocarVentana(aiTitle, listo) {
  if (process.platform !== 'win32' || !aiTitle) return listo('NONE');
  const script = path.join(__dirname, 'enfocar.ps1');
  if (!fs.existsSync(script)) return listo('NONE');
  // El título va por variable de entorno, no por argumento: cero comillas que
  // escapar y ninguna superficie de inyección.
  const ps = spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script], {
    env: Object.assign({}, process.env, { MC_TITULO: aiTitle }),
    windowsHide: true,
  });
  let salida = '';
  ps.stdout.on('data', d => { salida += d; });
  ps.on('error', () => listo('NONE'));
  ps.on('close', () => {
    const r = salida.trim().split(/\s+/).pop();
    listo(r === 'FOCUS' || r === 'MULTI' ? r : 'NONE');
  });
  setTimeout(() => { try { ps.kill(); } catch (e) {} }, 6000);  // que nunca cuelgue el clic
}

function abrirVentanaNueva(sesion, id) {
  const titulo = 'Claude - ' + sesion.projectName;
  const { cmd, args } = comandoTerminal(sesion.cwd, id, titulo);
  const hijo = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: false });
  hijo.on('error', e => console.log('No se pudo abrir la terminal: ' + e.message));
  hijo.unref();
}

/**
 * Abrir = primero enfocar lo que ya existe; solo si no hay ventana, crear una.
 * `soloEnfocar` permite al panel preguntar antes de duplicar un hilo activo.
 */
function abrirSesion(id, soloEnfocar, listo) {
  if (!ID_VALIDO.test(id)) return listo({ ok: false, error: 'Identificador de sesión inválido.' });
  const sesion = collectSessions().find(s => s.id === id);
  if (!sesion) return listo({ ok: false, error: 'Esa sesión ya no aparece en el disco.' });
  if (!sesion.cwd || !fs.existsSync(sesion.cwd)) {
    return listo({ ok: false, error: 'La sesión no registra una carpeta de trabajo accesible.' });
  }

  enfocarVentana(sesion.aiTitle, resultado => {
    if (resultado !== 'NONE') {
      console.log('Enfocando la ventana de "' + sesion.aiTitle + '"');
      return listo({
        ok: true, accion: 'enfocada', varias: resultado === 'MULTI',
        project: sesion.projectName, cwd: sesion.cwd,
      });
    }
    if (soloEnfocar) {
      return listo({ ok: true, accion: 'ninguna', project: sesion.projectName });
    }
    try {
      abrirVentanaNueva(sesion, id);
      console.log('Abriendo sesión ' + id + ' en ' + sesion.cwd);
      listo({ ok: true, accion: 'abierta', project: sesion.projectName, cwd: sesion.cwd });
    } catch (e) {
      listo({ ok: false, error: 'No se pudo abrir la terminal: ' + String(e.message || e) });
    }
  });
}

// ---------- servidor ----------

const server = http.createServer((req, res) => {
  // Abrir la ventana de un agente
  if (req.url === '/api/abrir' && req.method === 'POST') {
    const origen = req.headers.origin;
    const permitido = !origen || /^http:\/\/(127\.0\.0\.1|localhost):/.test(origen);
    if (req.headers['x-mission-control'] !== '1' || !permitido) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Petición no autorizada.' }));
      return;
    }
    let cuerpo = '';
    req.on('data', c => {
      cuerpo += c;
      if (cuerpo.length > 4096) req.destroy();   // no aceptamos cuerpos grandes
    });
    req.on('end', () => {
      let datos;
      try { datos = JSON.parse(cuerpo) || {}; }
      catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Petición mal formada.' }));
        return;
      }
      abrirSesion(String(datos.id || ''), datos.soloEnfocar === true, out => {
        res.writeHead(out.ok ? 200 : 400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(out));
      });
    });
    return;
  }

  if (req.url.startsWith('/api/sessions')) {
    let payload;
    try {
      payload = JSON.stringify({ ok: true, generatedAt: Date.now(), sessions: collectSessions() });
    } catch (e) {
      payload = JSON.stringify({ ok: false, error: String(e) });
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(payload);
    return;
  }
  // logo de marca
  if (req.url === '/logo.png') {
    fs.readFile(path.join(__dirname, 'logo.png'), (err, data) => {
      if (err) { res.writeHead(404); res.end('no logo'); return; }
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=3600' });
      res.end(data);
    });
    return;
  }
  // dashboard
  const htmlPath = path.join(__dirname, 'index.html');
  fs.readFile(htmlPath, (err, data) => {
    if (err) { res.writeHead(500); res.end('No se encontró index.html'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log('Mission Control ya está corriendo en http://localhost:' + PORT);
    process.exit(0);
  }
  throw e;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('🚀 Mission Control — http://localhost:' + PORT);
  console.log('Observando: ' + PROJECTS_DIR);
});
