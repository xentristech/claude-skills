---
name: xentris-hoja-de-vida
description: Buena práctica de agente Xentris Tech. Crea una hoja de vida (CV / currículum / resume) profesional en HTML imprimible a PDF (A4), con diseño de dos columnas y un asistente de IA integrado que invita al reclutador a "preguntar y evaluar" al candidato (chat offline por palabras clave, se oculta automáticamente al imprimir). Recopila datos del portafolio, LinkedIn, GitHub, redes y sitios/proyectos del candidato. Úsala cuando el usuario pida "crea/hazme una hoja de vida", "CV", "currículum", "resume", "hoja de vida con IA", o pase el perfil de una persona. Puede generar versión en español y/o inglés. Solo se necesita un navegador para verla e imprimirla. Solo Windows para las rutas de escritorio.
---

# Hoja de vida con asistente de IA integrado (Xentris Tech)

Genera una hoja de vida que **se ve como un CV premium** y además trae algo que ningún CV tradicional tiene: un **asistente de IA embebido** que responde preguntas del reclutador sobre el candidato ("evalúame en vivo"). Es la firma Xentris: el propio entregable demuestra capacidad técnica. El chat funciona **sin conexión ni API** (coincidencia por palabras clave) y **desaparece al imprimir**, así el PDF sale limpio y profesional.

La plantilla base está en `assets/plantilla-cv.html` (diseño A4 de dos columnas + widget de chat listo). El trabajo del agente es **recopilar datos, llenar la plantilla y personalizar el asistente**.

## Cuándo usarla
- El usuario pide "hoja de vida", "CV", "currículum", "resume", o "hoja de vida con IA".
- Entrega el perfil de una persona (portafolio, LinkedIn, sitios donde trabaja, proyectos).
- Quiere un CV que "tenga algo innovador" o que invite a "preguntar / evaluar".

## Paso 1 — Recopilar información (no inventar)
Reúne datos reales del candidato con las fuentes que dé el usuario:
- **Portafolio personal** (ej. `nombre.com.co`) con `WebFetch` → suele ser la mejor fuente.
- **Sitios de empresas y proyectos** donde trabaja (con `WebFetch`) → rol, stack, sector.
- **GitHub** (con `WebFetch`) → proyectos y tecnologías.
- **Redes** (Facebook, etc.) → cursos/certificaciones o logros extra.
- **WebSearch** para completar.
- **LinkedIn casi siempre bloquea** el acceso automático (HTTP 999). No insistas: infórmalo al usuario y **pídele lo que falte** (fechas y cargos exactos, educación formal, foto).

Regla de oro: **no inventes** experiencia, fechas ni títulos. Si el usuario pide destacar algo que no está en las fuentes (ej. un interés), inclúyelo pero **avísale** que lo agregaste por petición suya.

## Paso 2 — Confirmar preferencias
Con `AskUserQuestion` (salvo que el usuario ya lo haya dicho):
1. **Formato** → por defecto **HTML imprimible a PDF** (es el fuerte de esta skill).
2. **Enfoque / rol principal** a destacar (ej. AI Engineer, Full Stack, Data Scientist…).
3. **Idioma** → Español, Inglés o **ambos** (genera dos archivos).

## Paso 3 — Generar el/los archivo(s)
1. Copia `assets/plantilla-cv.html` a `Desktop\CV-<Nombre>\`:
   - Español: `hoja-de-vida-<nombre>.html`
   - Inglés: `resume-<nombre>-EN.html`
   Usa `[Environment]::GetFolderPath('Desktop')` para respetar OneDrive.
2. **Rellena el contenido** (marcado con `{{...}}` y comentarios `<!-- ... -->` en la plantilla): nombre, alias, rol, contacto, chips de skills por categoría, perfil, experiencia (una entrada por empresa), proyectos, especialización, certificaciones, idiomas, intereses.
3. Las iniciales del avatar salen del nombre (ej. "Farid Jiménez" → `FJ`). Si el usuario da una **foto**, reemplaza el `<div class="avatar">` por `<img>` con la imagen embebida en base64.
4. Deja el CSS y el `<script>` del chat **tal cual**; solo cambia el contenido y el bloque `KB`.

## Paso 4 — Personalizar el asistente de IA (lo distintivo)
En el `<script>`, edita el arreglo `KB` (base de conocimiento) con datos reales del candidato. Cada entrada es `{k:[palabras clave], a:'respuesta en HTML'}`. Cubre como mínimo:
- **perfil / en qué se especializa**, **experiencia / empresas**, **proyectos**, **skills / stack**,
- **IA / agentes**, **por qué contratarlo**, **contacto**, **educación / certificaciones**,
- **ubicación / remoto**, **idiomas**, y saludos/gracias.

Ajusta también `SUGS` (preguntas sugeridas) y los textos del encabezado del chat al idioma. La respuesta por defecto debe invitar a escribir al correo real del candidato.

## Paso 5 — Entregar
1. Envía el/los archivo(s) con `SendUserFile` (`display:"render"`).
2. Dile **dónde están** (`C:\Users\<usuario>\Desktop\CV-<Nombre>\`) y cómo abrirlos (doble clic → Chrome).
3. Explica el **PDF**: abrir en Chrome → **Ctrl+P** → Destino **Guardar como PDF** → Márgenes **Ninguno** → activar **Gráficos de fondo** (para conservar colores).
4. Aclara que el **botón 🤖 del chat funciona al abrir el archivo en el navegador** (la vista previa a veces no ejecuta el JS).

## Reglas y buenas prácticas Xentris Tech
- **Datos reales**, nunca inventados; marca lo asumido y pide confirmación de fechas/cargos/educación/foto.
- El chat es **offline por diseño** (sin API key). Si el usuario quiere **IA real (LLM abierta)**, se publica en la web (ej. Vercel, ver `xentris-hostinger-a-vercel`) con la API key protegida en un **backend**, nunca en el HTML del cliente.
- **Print-friendly A4**: el chat, el badge y el botón flotante se ocultan con `@media print`. Verifica que el PDF salga a 1–2 páginas limpias.
- Un `CV-<Nombre>\` por candidato; nombres de archivo con el nombre para que sean reconocibles.
- Ofrece al final: foto real, fechas exactas, o versión en el otro idioma.
