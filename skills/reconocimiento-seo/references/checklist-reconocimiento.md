# Checklist de Reconocimiento (Bloque 1)

Cada ítem se evalúa con **Estado** (`Ok` / `Atención` / `Pendiente` / `N/A`),
**Detalles del hallazgo** y **Documentación de apoyo**.

## Cabecera del análisis

| Campo | Cómo obtenerlo |
|---|---|
| Sitio web | URL raíz del dominio |
| Tráfico orgánico actual | Ahrefs / SEMrush / GSC. Si no hay acceso → "Requiere herramienta" |
| Total términos de búsqueda | Ahrefs / SEMrush (keywords posicionadas) |
| Autoridad del dominio (DA) | Moz DA / Ahrefs DR. Si no hay acceso → "Requiere herramienta" |

## Reconocimiento técnico

### 1. El sitio web cuenta con un archivo Robots.txt
- Verificar: `https://dominio/robots.txt` responde 200.
- Doc: https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt?hl=es

### 2. Las reglas del Robots.txt impiden rastrear contenido importante
- Revisar `Disallow:` que bloqueen secciones de valor (blog, productos, categorías).
- Doc: https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers

### 3. El sitio web tiene un Sitemap en formato XML
- Buscar en `robots.txt` la línea `Sitemap:`, o probar `/sitemap.xml`, `/sitemap_index.xml`.
- Doc: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview?hl=es

### 4. El sitio web está indexado en Google
- Comprobar `site:dominio` en Google. Comparar nº de resultados vs. nº de páginas reales.

### 5. URLs importantes NO indexables que deberían ser indexables
- Detectar `<meta name="robots" content="noindex">`, `X-Robots-Tag`, canónicas mal puestas.
- Doc: https://developers.google.com/search/docs/crawling-indexing/block-indexing?hl=es

### 6. URLs importantes con profundidad de navegación mayor a 3
- Contar clics desde la home hasta la URL clave. >3 = riesgo de menor rastreo/autoridad.

## Factores críticos para el algoritmo y las personas

### 7. Versión optimizada para móviles
- Comprobar viewport responsive, diseño adaptable.
- Doc: https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing?hl=es

### 8. Errores evidentes de usabilidad en móvil
- Texto ilegible, botones muy juntos, contenido más ancho que la pantalla.
- Doc: https://support.google.com/webmasters/answer/9063469

### 9. El sitio carga por HTTPS (versión segura)
- Verificar candado / redirección http→https / certificado válido.
- Doc: https://developers.google.com/search/blog/2014/08/https-as-ranking-signal?hl=es

## Factores de carga del sitio frente a Google

### 10. Los elementos del sitio cargan para Google
- Recursos (CSS/JS/imágenes) no bloqueados por robots, sin errores 4xx/5xx.

### 11. El sitio carga por JavaScript
- Detectar si el contenido principal solo aparece tras ejecutar JS (riesgo de rastreo).

### 12. Velocidad de carga inferior a 4 segundos
- Usar PageSpeed Insights / Core Web Vitals (LCP, INP, CLS).

## Reconocimiento estratégico

### 13. Secciones posicionadas más importantes
- Qué rutas/secciones concentran el tráfico orgánico.

### 14. Tipos de contenido del sitio
- Opciones: contenido editorial · páginas de características · plantillas · marca ·
  contenidos de comparación · contenidos de integraciones.

### 15. Tipos de intención que traen más tráfico
- Opciones: informativa · investigativa · comercial · navegacional · transaccional.

### 16. Principales competidores
- Identificar 3–5 competidores que pelean por las mismas keywords.

### 17. Ganancias prontas (quick wins) de los competidores
- Keywords/temas donde el competidor gana fácil y el sitio puede replicar rápido.
