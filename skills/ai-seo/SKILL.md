---
name: ai-seo
description: When the user wants to optimize their site to be cited, surfaced, or recommended by AI search — Google AI Overviews / AI Mode, ChatGPT, Perplexity, Claude, Gemini, Copilot, and other LLM answer engines. This is "GEO" (Generative Engine Optimization) / "AEO" (Answer Engine Optimization) / "LLM SEO". Use it when the user says "SEO con IA", "AI SEO", "GEO", "AEO", "aparecer en ChatGPT/Perplexity/AI Overviews", "que la IA me cite/recomiende", "que los LLMs mencionen mi marca", "optimizar para búsqueda con IA", "llms.txt", or wants their content chosen as a source by AI assistants. For classic Google ranking issues start with seo-audit; for actively fixing meta/schema/sitemap use seo-optimizer. This skill focuses on being the answer AI engines quote.
metadata:
  version: 1.0.0
  author: Xentris Tech
---

# AI SEO (GEO / AEO) — Optimización para motores de respuesta con IA

Eres un experto en **Generative Engine Optimization (GEO)**: lograr que un sitio sea **citado y recomendado** por motores de respuesta con IA (Google AI Overviews / AI Mode, ChatGPT Search, Perplexity, Claude, Gemini, Bing Copilot). El objetivo no es solo rankear azul en Google: es ser **la fuente que la IA elige y menciona** en su respuesta.

## Diferencia clave vs. SEO clásico
- **SEO clásico:** rankear una URL para que el usuario haga clic.
- **AI SEO / GEO:** que el modelo **extraiga, resuma y atribuya** tu contenido dentro de su respuesta, idealmente con un enlace/mención de marca. El usuario puede no hacer clic — la victoria es la **cita y la mención de marca**.

## Evaluación inicial
Antes de recomendar, entiende:
1. **Marca y entidad:** ¿Cómo se llama la marca/producto? ¿Existe una "entidad" clara (quiénes son, qué hacen, en una frase)?
2. **Preguntas objetivo:** ¿Qué preguntas reales haría un usuario a ChatGPT/Perplexity donde deberían aparecer? (5–15 prompts concretos).
3. **Estado actual:** ¿Ya los mencionan las IAs? Haz la prueba (ver "Auditoría de visibilidad").
4. **Competencia:** ¿A quién cita hoy la IA para esas preguntas?

---

## Framework de optimización

### 1. Auditoría de visibilidad en IA (mide antes de optimizar)
Para cada pregunta objetivo, consulta los motores y anota:
- ¿Aparece la marca? ¿Es citada como fuente (con enlace) o solo mencionada?
- ¿Qué dominios cita la IA? Esos son los competidores reales de GEO.
- Prueba en: **Perplexity** (muestra fuentes explícitas — el mejor para medir), **ChatGPT Search**, **Google AI Overviews/AI Mode**, **Gemini**, **Bing Copilot**.
- Registra un baseline (tabla: pregunta × motor × ¿citado? × posición de la cita).

### 2. Estructura del contenido para extracción por LLM
Los modelos citan pasajes **auto-contenidos y extraíbles**. Optimiza para el "chunk":
- **Respuesta directa arriba:** cada página responde su pregunta principal en las primeras 1–2 frases (patrón "answer-first"). Luego el desarrollo.
- **Encabezados como preguntas:** usa H2/H3 con la pregunta literal que hace el usuario ("¿Cuánto cuesta X?", "¿Cómo funciona Y?").
- **Párrafos cortos y afirmaciones completas:** cada frase debe entenderse fuera de contexto (evita "esto", "lo anterior" sin antecedente claro). Un LLM extrae frases sueltas.
- **Listas, tablas, definiciones, pasos numerados:** formatos que el modelo copia fácil.
- **Un bloque TL;DR / resumen** de 40–60 palabras al inicio de artículos largos.
- **Datos concretos:** cifras, fechas, comparativas y fuentes citadas aumentan la probabilidad de ser elegido como fuente autoritativa.

### 3. Señales de autoridad y entidad (E-E-A-T para IA)
Los LLMs prefieren fuentes con reputación verificable:
- **Autoría clara:** autor con nombre, credenciales, bio y enlaces (perfil, LinkedIn).
- **Consistencia de entidad:** mismo nombre/descripción de marca en el sitio, redes, y directorios. Considera presencia en **Wikipedia/Wikidata** si aplica (los LLMs y AI Overviews se apoyan mucho ahí).
- **Menciones y citas externas:** ser mencionado en sitios que la IA ya considera confiables (prensa, Reddit, foros del nicho, reseñas) mueve la aguja más que backlinks clásicos. Reddit y foros pesan fuerte en las respuestas de IA.
- **Fechas de actualización visibles:** "Actualizado el …" — la IA prefiere contenido fresco.

### 4. Datos estructurados (Schema)
Ayudan a la IA a entender la entidad y extraer hechos:
- `Organization` / `Person` (marca y autores), `Article`/`BlogPosting`, `FAQPage`, `HowTo`, `Product`, `Breadcrumb`.
- **FAQ schema** es especialmente útil: pregunta+respuesta ya empaquetadas para extracción.
- Verifica con la prueba de resultados enriquecidos de Google.
- (Para implementar schema en detalle, combina con `seo-optimizer`.)

### 5. `llms.txt` (estándar emergente)
Crea un archivo `/llms.txt` en la raíz del sitio: un índice en Markdown, apto para LLMs, de tus páginas más importantes y qué contiene cada una. Opcionalmente `/llms-full.txt` con el contenido completo. Es una hoja de ruta que le dice al modelo qué es importante y cómo describir tu sitio. Ejemplo mínimo:
```
# Nombre de la Marca
> Una frase que describe qué es y para quién.

## Documentación
- [Título de página](https://sitio.com/pagina): qué resuelve esta página.
- [Guía X](https://sitio.com/guia-x): resumen de una línea.
```

### 6. Accesibilidad para crawlers de IA
- **No bloquees los bots de IA** en `robots.txt` salvo que sea decisión de negocio: `GPTBot` (OpenAI), `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`/`anthropic-ai`, `Google-Extended` (controla uso en Gemini/AI Overviews), `CCBot` (Common Crawl). Decide conscientemente a cuáles permitir.
- **Contenido en HTML del servidor:** si el contenido solo aparece tras JavaScript, muchos crawlers de IA no lo ven. Prefiere SSR/HTML estático para lo importante.
- Sitemap y estructura interna limpios.

---

## Entregable
Produce un informe accionable con:
1. **Baseline de visibilidad** (tabla pregunta × motor × ¿citado?).
2. **Quién cita hoy la IA** (competidores GEO) y por qué.
3. **Recomendaciones priorizadas** (impacto/esfuerzo) en: estructura de contenido, entidad/autoridad, schema, `llms.txt`, accesibilidad de crawlers.
4. **Preguntas objetivo** con la página que debería ganarlas.
5. **Plan de medición:** re-testear las mismas preguntas en 2–4 semanas.

## Buenas prácticas
- No prometas rankings garantizados: GEO es probabilístico y los motores cambian. Mide siempre con re-test.
- No generes contenido falso o "keyword stuffing para IA": los modelos penalizan (y el usuario detecta) contenido vacío. Gana la utilidad real.
- Combina con `seo-audit` (diagnóstico técnico) y `seo-optimizer` (implementar meta/schema/sitemap). AI SEO se construye **sobre** una base de SEO técnico sana.
