// Mission Control — envoltura de escritorio (Xentris Tech)
//
// Convierte el panel en una aplicacion de Windows: ventana propia sin nada de
// navegador, icono en la bandeja del reloj, arranque con el sistema y el
// servidor incrustado. No necesita que tengas Chrome ni que abras el .bat.
//
// El servidor es el MISMO server.js de siempre: aqui se hace `require`, no se
// lanza un Node aparte. Asi no hay dos copias que se desincronicen, y cerrar la
// app se lleva el servidor con ella.

const { app, BrowserWindow, Tray, Menu, shell } = require('electron');
const path = require('path');
const http = require('http');

const PUERTO = 7777;
const BASE = 'http://127.0.0.1:' + PUERTO;
const ICONO = path.join(__dirname, 'marca-icon.ico');
const FONDO = '#0d0d0d';           // --bg del manual: evita el flashazo blanco al abrir

let ventana = null;
let bandeja = null;
let saliendo = false;
let avisoBandejaDado = false;

// Una sola instancia. Si ya esta abierta, el segundo lanzamiento (doble clic en
// el icono del escritorio) trae al frente la que hay en vez de duplicarla.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {

app.setAppUserModelId('tech.xentris.missioncontrol');

app.on('second-instance', () => mostrarVentana());

// ---------- servidor ----------

/**
 * ¿Quien tiene el puerto 7777? Devuelve 'libre', 'nuestro' o 'ajeno'.
 *
 * Ojo con la sonda: server.js responde el index.html a CUALQUIER ruta que no
 * reconozca, asi que pedir una ruta inventada siempre da 200 y no prueba nada.
 * Hay que pegarle al endpoint de verdad (/api/sessions) y exigir que conteste
 * JSON; si en el puerto hay otro programa, se ve aqui y no se disfraza.
 */
function sondearPuerto(listo) {
  const pet = http.get({ host: '127.0.0.1', port: PUERTO, path: '/api/sessions', timeout: 1500 }, res => {
    const tipo = String(res.headers['content-type'] || '');
    res.resume();
    listo(res.statusCode === 200 && tipo.indexOf('application/json') !== -1 ? 'nuestro' : 'ajeno');
  });
  pet.on('error', (e) => listo(e.code === 'ECONNREFUSED' ? 'libre' : 'ajeno'));
  pet.on('timeout', () => { pet.destroy(); listo('ajeno'); });
}

function arrancarServidor() {
  // server.js hace `process.exit(0)` si encuentra el puerto ocupado. Eso esta
  // bien para un script de terminal, pero aqui cerraria la aplicacion entera y
  // sin explicar por que. Como el choque solo puede pasar en la ventana de
  // carrera entre yaEscucha() y listen(), se tapa la salida unos segundos.
  const salidaReal = process.exit.bind(process);
  process.exit = () => { /* el puerto se ocupo entremedio: la app se conecta igual */ };
  setTimeout(() => { process.exit = salidaReal; }, 4000);
  require('./server.js');
}

// ---------- ventana ----------

function paginaDeError(detalle) {
  const html = '<meta charset="utf-8"><body style="margin:0;height:100vh;display:flex;'
    + 'align-items:center;justify-content:center;background:' + FONDO + ';color:#f8f7fb;'
    + 'font-family:Segoe UI,system-ui,sans-serif;text-align:center">'
    + '<div><h1 style="font-size:20px;margin:0 0 8px">No se pudo abrir el panel</h1>'
    + '<p style="color:#9187a9;margin:0;font-size:13px">' + detalle + '</p></div></body>';
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}

function cargar(intentosRestantes) {
  ventana.loadURL(BASE + '/').catch(() => {
    if (intentosRestantes > 0) {
      setTimeout(() => cargar(intentosRestantes - 1), 400);
    } else {
      ventana.loadURL(paginaDeError('El servidor no respondio en ' + BASE));
    }
  });
}

function crearVentana(destinoAlterno) {
  ventana = new BrowserWindow({
    width: 1500,
    height: 1000,
    minWidth: 900,
    minHeight: 600,
    title: 'Mission Control',
    icon: ICONO,
    backgroundColor: FONDO,
    autoHideMenuBar: true,
    show: false,                       // no mostrar hasta que haya algo pintado
    webPreferences: {
      nodeIntegration: false,          // el panel es HTML plano con fetch: no necesita Node
      contextIsolation: true,
      sandbox: true,
    },
  });

  ventana.once('ready-to-show', () => ventana.show());

  // Los chips de artefacto apuntan a claude.ai. Dentro de la app eso dejaria al
  // usuario navegando fuera del panel y sin barra para volver: van al navegador.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  ventana.webContents.on('will-navigate', (ev, url) => {
    if (!url.startsWith(BASE)) {
      ev.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  // Sin menu, pero dejando lo util para diagnosticar.
  ventana.webContents.on('before-input-event', (ev, entrada) => {
    if (entrada.type !== 'keyDown') return;
    if (entrada.key === 'F5') { ventana.reload(); ev.preventDefault(); }
    if (entrada.control && entrada.shift && entrada.key.toLowerCase() === 'i') {
      ventana.webContents.toggleDevTools();
      ev.preventDefault();
    }
  });

  // La X esconde a la bandeja: es un monitor, esta pensado para quedarse.
  ventana.on('close', (ev) => {
    if (saliendo) return;
    ev.preventDefault();
    ventana.hide();
    if (!avisoBandejaDado && bandeja) {
      avisoBandejaDado = true;
      try {
        bandeja.displayBalloon({
          title: 'Mission Control sigue vigilando',
          content: 'Quedo aqui abajo, junto al reloj. Clic para volver a abrirlo.',
          icon: ICONO,
        });
      } catch (e) { /* algunas versiones de Windows no muestran globos */ }
    }
  });

  if (destinoAlterno) ventana.loadURL(destinoAlterno);
  else cargar(20);
}

function mostrarVentana() {
  if (!ventana) return crearVentana();
  if (ventana.isMinimized()) ventana.restore();
  ventana.show();
  ventana.focus();
}

// ---------- bandeja ----------

function arrancaConWindows() {
  return app.getLoginItemSettings().openAtLogin;
}

function pintarMenuBandeja() {
  bandeja.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir Mission Control', click: mostrarVentana },
    { type: 'separator' },
    {
      label: 'Iniciar con Windows',
      type: 'checkbox',
      checked: arrancaConWindows(),
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked, path: process.execPath });
        pintarMenuBandeja();
      },
    },
    { type: 'separator' },
    { label: 'Salir', click: () => { saliendo = true; app.quit(); } },
  ]));
}

function crearBandeja() {
  bandeja = new Tray(ICONO);
  bandeja.setToolTip('Mission Control — Xentris Tech');
  bandeja.on('click', mostrarVentana);
  pintarMenuBandeja();
}

// ---------- arranque ----------

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  sondearPuerto((quien) => {
    if (quien === 'libre') arrancarServidor();
    crearVentana(quien === 'ajeno'
      ? paginaDeError('Otro programa ya esta usando el puerto ' + PUERTO + '. '
          + 'Cierralo y vuelve a abrir Mission Control.')
      : null);
    crearBandeja();
  });
});

// En Windows la app vive en la bandeja: cerrar la ventana no la termina.
app.on('window-all-closed', () => { /* a proposito: no se cierra */ });

app.on('before-quit', () => { saliendo = true; });

}
