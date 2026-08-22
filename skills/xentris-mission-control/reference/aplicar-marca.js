#!/usr/bin/env node
/**
 * aplicar-marca.js — deja el index.html de Mission Control on-brand Xentris.
 *
 * Fuente de verdad: MANUAL-XENTRIS.pdf p.22-25 (skill `xentris-manual-marca`).
 * El index.html original trae Montserrat por CDN de Google Fonts, y Montserrat
 * NO es la tipografia de Xentris. Este script corrige eso y algo mas:
 *
 *   1. Elimina todo enlace a fonts.googleapis / fonts.gstatic (cero red externa).
 *   2. Incrusta en base64 Mansfield (cuerpo + titulos) y Cropar (la palabra XENTRIS).
 *   3. Corrige los tonos derivados a los del manual (#a95fd6, #c78ce8).
 *   4. Pone los titulos en Mansfield Black Italic (la firma visual de la marca).
 *   5. Anade la barra degradada bajo el titulo (el recurso mas repetido del manual).
 *   6. La palabra XENTRIS del fallback va en Cropar con tracking amplio.
 *
 * Las fuentes NO viajan en el repo (son comerciales y el repo es publico MIT):
 * se leen del paquete de marca local. Uso:
 *
 *   node aplicar-marca.js                          // busca las fuentes solo
 *   node aplicar-marca.js --fuentes "D:/marca/fonts"
 *   XENTRIS_MARCA_FONTS=... node aplicar-marca.js
 *
 * Sale con codigo 1 si algo critico no se aplico, para que no pase por bueno un
 * panel fuera de marca: los reemplazos de texto fallan en silencio.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const SEP = '-'.repeat(64);
const ok = m => console.log('  [ok]    ' + m);
const warn = m => console.log('  [aviso] ' + m);
const bad = m => console.log('  [FALLA] ' + m);

const FUENTES = [
  { fam: 'Mansfield', file: 'Mansfield Medium.ttf',       weight: 500, style: 'normal', fmt: 'truetype', mime: 'font/ttf', rol: 'cuerpo' },
  { fam: 'Mansfield', file: 'Mansfield Bold.ttf',         weight: 700, style: 'normal', fmt: 'truetype', mime: 'font/ttf', rol: 'enfasis' },
  { fam: 'Mansfield', file: 'Mansfield Black Italic.ttf', weight: 900, style: 'italic', fmt: 'truetype', mime: 'font/ttf', rol: 'titulos' },
  { fam: 'Cropar',    file: 'Cropar.otf',                 weight: 400, style: 'normal', fmt: 'opentype', mime: 'font/otf', rol: 'la palabra XENTRIS' },
];

/** Busca el paquete de fuentes de marca sin asumir la ruta de un equipo concreto. */
function localizarFuentes() {
  const i = process.argv.indexOf('--fuentes');
  const home = os.homedir();
  const candidatas = [
    i !== -1 ? process.argv[i + 1] : null,
    process.env.XENTRIS_MARCA_FONTS,
    path.join(__dirname, 'fonts'),
    path.join(home, 'proyectos', 'xentris-empresa', 'marca', 'fonts'),
    path.join(home, 'xentris-empresa', 'marca', 'fonts'),
    path.join(home, 'Documents', 'xentris-empresa', 'marca', 'fonts'),
    path.join(home, 'OneDrive', 'xentris-empresa', 'marca', 'fonts'),
  ].filter(Boolean);

  for (const dir of candidatas) {
    if (!fs.existsSync(dir)) continue;
    const faltan = FUENTES.filter(f => !fs.existsSync(path.join(dir, f.file))).map(f => f.file);
    return { dir, faltan };   // hallada: si esta incompleta hay que avisar, no seguir en silencio
  }
  return { dir: null, faltan: FUENTES.map(f => f.file) };
}

/** Reemplazo que avisa cuando no encuentra a que aplicarse. */
let fallos = 0;
function cambiar(html, buscar, poner, etiqueta, critico) {
  const salida = html.replace(buscar, poner);
  if (salida === html) {
    (critico ? bad : warn)(etiqueta + ' -- patron no encontrado (revisa si cambio index.html)');
    if (critico) fallos++;
  } else {
    ok(etiqueta);
  }
  return salida;
}

console.log(SEP);
console.log('Mission Control -- aplicando el manual de marca Xentris');
console.log(SEP);

// Trabajamos desde el .orig para que el script sea idempotente: se puede correr
// mil veces sin ir incrustando fuentes encima de fuentes.
const ORIG = path.join(__dirname, 'index.html.orig');
const DEST = path.join(__dirname, 'index.html');
if (!fs.existsSync(ORIG)) {
  if (!fs.existsSync(DEST)) {
    console.error('\nNo hay index.html ni index.html.orig en ' + __dirname);
    process.exit(1);
  }
  fs.copyFileSync(DEST, ORIG);
  ok('guardado index.html.orig (copia del original, para poder rehacer esto)');
}
let html = fs.readFileSync(ORIG, 'utf8');

console.log('\n1. Fuentes de marca');
const hallazgo = localizarFuentes();
if (!hallazgo.dir || hallazgo.faltan.length) {
  bad('no se hallo el paquete de fuentes de marca completo');
  if (hallazgo.dir) console.log('          carpeta: ' + hallazgo.dir);
  console.log('          faltan:  ' + hallazgo.faltan.join(', '));
  console.log('\n  Las fuentes son comerciales y no viajan en el repo. Copia la carpeta');
  console.log('  xentris-empresa/marca/fonts a este equipo y vuelve a correr:');
  console.log('      node aplicar-marca.js --fuentes "RUTA/marca/fonts"');
  console.log('\n  Sin ellas el panel usaria la tipografia del sistema: fuera de marca.');
  process.exit(1);
}
ok('paquete hallado en ' + hallazgo.dir);
let faces = '';
for (const f of FUENTES) {
  const b64 = fs.readFileSync(path.join(hallazgo.dir, f.file)).toString('base64');
  faces += "@font-face{font-family:'" + f.fam + "';"
    + 'src:url(data:' + f.mime + ';base64,' + b64 + ") format('" + f.fmt + "');"
    + 'font-weight:' + f.weight + ';font-style:' + f.style + ';font-display:swap}\n';
  ok('incrustada ' + f.file + '  (' + f.rol + ')');
}

console.log('\n2. Quitando dependencias externas');
html = cambiar(html, /^.*fonts\.(googleapis|gstatic)\.com.*$\n?/gm, '',
  'enlaces a Google Fonts eliminados', true);

console.log('\n3. Incrustando la tipografia');
html = cambiar(html, '<style>',
  '<style>\n/* ===== Tipografia oficial Xentris (MANUAL p.22) =====\n'
  + '   Cuerpo: Mansfield Medium | Titulos: Mansfield Black Italic | XENTRIS: Cropar.\n'
  + '   Montserrat NO es la fuente de la marca (venia en el original por CDN). */\n'
  + faces,
  'bloque @font-face insertado en <style>', true);
html = cambiar(html, /'Montserrat'/g, "'Mansfield'",
  'font-family cambiado a Mansfield', true);

console.log('\n4. Paleta (derivados del manual, no violetas inventados)');
html = cambiar(html, /--brand-2:\s*#[0-9a-fA-F]{3,8};[^\n]*/,
  '--brand-2:#a95fd6;   /* derivado --hi (manual) */',
  'tono --brand-2 -> #a95fd6', true);
html = cambiar(html, /--lila:\s*#[0-9a-fA-F]{3,8};[^\n]*/,
  '--lila:#c78ce8;      /* derivado --glow (manual) */',
  'tono --lila -> #c78ce8', true);

console.log('\n5. Titulos en italica black + barra degradada');
html = cambiar(html, /\.title h1\{[^}]*\}/,
  ".title h1{font-family:'Mansfield',serif;font-style:italic;font-weight:900;"
  + 'font-size:18px;letter-spacing:.2px;line-height:1.04;}\n'
  + "  .title h1::after{content:'';display:block;height:4px;width:64px;border-radius:99px;"
  + 'margin-top:5px;background:linear-gradient(90deg,rgba(199,140,232,0),var(--lila) 40%,var(--brand));}',
  'h1 en Mansfield Black Italic con barra degradada', true);

console.log('\n6. Wordmark');
html = cambiar(html, /font-size:20px;letter-spacing:\.5px;color:var\(--lila\)/,
  'font-family:Cropar,sans-serif;font-weight:400;font-size:20px;letter-spacing:7px;color:var(--lila)',
  'fallback de texto XENTRIS en Cropar', false);

fs.writeFileSync(DEST, html);

console.log('\n' + SEP);
const cdn = (html.match(/https?:\/\/(?!127\.0\.0\.1|localhost)/g) || []).length;
// Ojo: contar cuantas veces APARECE la palabra da un falso positivo, porque el
// comentario que insertamos arriba la nombra para explicar por que se quito.
// Lo que importa es que no se USE: ni en un font-family ni en un enlace.
const mont = (html.match(/font-family[^;}\n]*Montserrat/gi) || []).length
           + (html.match(/googleapis[^"'\s]*Montserrat/gi) || []).length;
const caras = (html.match(/@font-face/g) || []).length;
console.log('  index.html            ' + (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB');
console.log('  CDN externos          ' + cdn + '   (debe ser 0)');
console.log('  Montserrat en uso     ' + mont + '   (debe ser 0)');
console.log('  @font-face            ' + caras + '   (debe ser 4)');
console.log(SEP);

if (cdn !== 0 || mont !== 0 || caras !== 4 || fallos !== 0) {
  console.log('\nRESULTADO: el panel NO quedo on-brand. Revisa las lineas [FALLA] de arriba.');
  process.exit(1);
}
console.log('\nRESULTADO: on-brand.');
console.log('Ahora MIRALO, no confies: las fuentes se sustituyen en silencio.');
console.log('  chrome --headless --disable-gpu --window-size=1500,1000 \\');
console.log('    --screenshot=verificacion.png http://127.0.0.1:7777/');
