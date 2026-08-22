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

function shorten(s, n) {
  if (!s) return '';
  s = String(s).replace(/\s+/g, ' ').trim();
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
          if (c.type === 'tool_result') lastEventKind = 'tool_result';
        }
      }
    }

    if (ev.type === 'assistant' && msg.role === 'assistant' && Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c.type === 'tool_use') {
          toolCount++;
          lastEventKind = 'tool_use';
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
    cwd,
    model, gitBranch, version,
    status, statusLabel,
    lastModified: stat.mtimeMs,
    idleSeconds: Math.round(idleMs / 1000),
    lastUserPrompt, lastAssistantText,
    nowDoing,
    toolCount,
    subagents: subagentActivity > 0,
    timeline: timeline.slice(-6).reverse(),
    sizeKB: Math.round(stat.size / 1024),
  };
}

function collectSessions() {
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
  results.sort((a, b) => b.mtime - a.mtime);
  const sessions = [];
  for (const r of results.slice(0, MAX_SESSIONS)) {
    const s = analyzeSession(r.full, r.folder);
    if (s) sessions.push(s);
  }
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
