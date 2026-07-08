---
name: reconocimiento-seo
description: >-
  Realiza un análisis de reconocimiento SEO técnico completo de cualquier sitio web,
  siguiendo la metodología de la hoja de trabajo "Análisis inicial de reconocimiento SEO".
  Úsalo cuando el usuario pida un SEO técnico, auditoría técnica, reconocimiento SEO,
  análisis on-page, revisar robots.txt / sitemap / indexación / velocidad / móvil / HTTPS,
  identificar competidores e intención de búsqueda, o cuando entregue una URL y diga
  "hazme el SEO técnico de este sitio". Produce un worksheet llenado (Reconocimiento,
  Contenidos, Recomendaciones y Enlaces) listo para entregar al cliente.
metadata:
  author: Farid Enrique Jiménez Campo (plantilla) / adaptado a skill
  version: 1.0.0
---

# Reconocimiento SEO técnico

Replica, para **cualquier sitio web**, la metodología de la plantilla
"Análisis inicial de reconocimiento SEO". El resultado es un worksheet llenado con
hallazgos, estado y documentación de apoyo, dividido en 4 bloques:
**Reconocimiento**, **Contenidos (On-page)**, **Recomendaciones** y **Enlaces**.

## Cuándo usar este skill

- "Hazme un SEO técnico de `https://...`"
- "Analiza el reconocimiento SEO de este sitio"
- "Revisa robots.txt / sitemap / indexación / velocidad / móvil"
- "Quiero optimizar el on-page de esta URL"
- "Identifica competidores e intención de búsqueda"

## Entradas que necesitas del usuario

Antes de empezar, confirma (pregunta solo lo que falte):

1. **URL del sitio** (obligatorio).
2. **Páginas/URLs clave** que importan al negocio (si las tiene).
3. **Datos de herramientas externas** si los tiene a mano: tráfico orgánico,
   total de términos de búsqueda, autoridad del dominio (DA). Si no los tiene,
   márcalos como "Requiere herramienta (Ahrefs/SEMrush/Moz)" y continúa.

## Flujo de trabajo

Ejecuta los 4 bloques en orden. Para cada ítem llena tres columnas:
**Estado** (`Ok` / `Atención` / `Pendiente` / `N/A`), **Detalles del hallazgo**
(qué encontraste, con evidencia) y **Documentación de apoyo** (enlace de referencia).

> Para la lista detallada de cada ítem, sus criterios de evaluación y los enlaces
> de documentación oficiales, lee `references/checklist-reconocimiento.md` y
> `references/seo-onpage-contenidos.md`.

### Bloque 1 — Reconocimiento (técnico + estratégico)

Cabecera: Sitio web · Tráfico orgánico actual · Total términos de búsqueda · Autoridad del dominio.

**Reconocimiento técnico** (verifícalo realmente, no asumas):
1. ¿Existe `robots.txt`? → busca `https://dominio/robots.txt`.
2. ¿Las reglas de `robots.txt` bloquean contenido importante que debería rastrearse?
3. ¿Existe un sitemap XML? → revisa `robots.txt`, `/sitemap.xml`, `/sitemap_index.xml`.
4. ¿El sitio está indexado en Google? → comprobar con `site:dominio`.
5. ¿Hay URLs importantes NO indexables (noindex/canonical/robots) que deberían serlo?
6. ¿Hay URLs importantes con profundidad de navegación mayor a 3 clics?

**Factores críticos para el algoritmo y las personas:**
7. ¿Tiene versión optimizada para móviles?
8. ¿Las páginas principales tienen errores evidentes de usabilidad en móvil?
9. ¿Carga por HTTPS (versión segura)?

**Factores de carga del sitio frente a Google:**
10. ¿Los elementos del sitio cargan para Google (no bloqueados, no errores)?
11. ¿El sitio depende de JavaScript para renderizar el contenido?
12. ¿La velocidad de carga es inferior a 4 segundos?

**Reconocimiento estratégico:**
13. ¿Cuáles son las secciones posicionadas más importantes?
14. ¿Qué tipos de contenido tiene? (editorial, páginas de características, plantillas,
    marca, comparación, integraciones).
15. ¿Qué intención de búsqueda trae más tráfico? (informativa, investigativa,
    comercial, navegacional, transaccional).
16. ¿Quiénes son los principales competidores?
17. ¿Qué ganancias prontas (quick wins) se identifican de los competidores?

### Bloque 2 — Contenidos (SEO On-page por URL)

Para cada URL a crear/optimizar, define: URL · Término de búsqueda principal ·
Términos secundarios · Formato de contenido · Título SEO · Meta descripción ·
H1 · Recomendaciones de estructura. Criterios completos en
`references/seo-onpage-contenidos.md`.

### Bloque 3 — Recomendaciones

Resumen accionable y priorizado de los hallazgos: qué arreglar primero (impacto vs.
esfuerzo), responsable sugerido y enlaces de apoyo.

### Bloque 4 — Enlaces (link building / outreach)

Tabla de prospectos: No. · Keyword · Prospecto (URL) · DA · Medio de contacto ·
Fecha de contacto · Respuesta.

## Cómo investigar cada ítem

- Usa **WebFetch** para leer `robots.txt`, el HTML de las páginas, el sitemap y
  detectar `<meta name="robots">`, `<link rel="canonical">`, `<title>`, meta
  description, H1, y si el contenido depende de JS.
- Usa **WebSearch** para `site:dominio`, identificar competidores y validar
  intención de búsqueda.
- Marca con honestidad lo que **requiere herramienta de pago** (tráfico, DA, volumen
  de keywords): no inventes cifras. Indica la fuente recomendada.

## Salida (entregable)

Genera el worksheet llenado en Markdown usando `templates/worksheet-salida.md`.
Si el usuario quiere el archivo Excel idéntico a la plantilla original, ejecuta
`scripts/generar_worksheet_excel.py` (ver su cabecera para el uso).

Al final, incluye siempre un bloque **"Prioridades / próximos pasos"** con las 3–5
acciones de mayor impacto.
