# Claude Skills — Xentris Tech

Colección de **Agent Skills** para [Claude Code](https://claude.com/claude-code) creadas por **Eathan (Xentris Tech)**.

Cada skill vive en `skills/<nombre>/SKILL.md` y sigue el formato estándar de Claude Code (frontmatter con `name` y `description` + instrucciones en Markdown).

## Skills incluidos

| Skill | Descripción |
|-------|-------------|
| [`ai-seo`](skills/ai-seo) | Optimización para motores de respuesta con IA (GEO / AEO): lograr que un sitio sea **citado y recomendado** por Google AI Overviews, ChatGPT, Perplexity, Claude, Gemini y Copilot. |
| [`reconocimiento-seo`](skills/reconocimiento-seo) | Análisis de reconocimiento SEO técnico completo de un sitio (robots.txt, sitemap, indexación, velocidad, móvil, HTTPS, competidores). Genera un worksheet listo para entregar al cliente. Incluye scripts y plantillas. |
| [`xentris-acceso-rapido`](skills/xentris-acceso-rapido) | Crea un acceso rápido en el escritorio de Windows (`.bat` + `.lnk` con ícono de marca) para reabrir Claude Code en el proyecto y **continuar la conversación**. |
| [`xentris-memoria-proyecto`](skills/xentris-memoria-proyecto) | Crea y mantiene una "memoria del proyecto" (notas de continuidad) para retomar el contexto exacto si se cierra la sesión. |
| [`xentris-desplegar-vps`](skills/xentris-desplegar-vps) | Despliega una app Python/FastAPI (Docker) en un VPS Ubuntu con HTTPS automático (Caddy), servicio systemd y auto-deploy por GitHub Actions. |
| [`xentris-hostinger-a-vercel`](skills/xentris-hostinger-a-vercel) | Apunta un dominio de Hostinger a un sitio en Vercel **sin perder el correo** (cambia solo registros web A/CNAME). |

## Instalación

Para usar un skill en Claude Code, cópialo a tu carpeta global de skills:

```bash
# macOS / Linux
cp -r skills/ai-seo ~/.claude/skills/

# Windows (PowerShell)
Copy-Item -Recurse skills\ai-seo $env:USERPROFILE\.claude\skills\
```

O clona todo el repo directamente dentro de `~/.claude/skills/`:

```bash
git clone https://github.com/xentristech/claude-skills.git
```

Reinicia Claude Code y el skill quedará disponible. Se activa solo cuando tu petición coincide con su `description`, o puedes invocarlo por su nombre.

## Créditos

- Skills `ai-seo`, `xentris-*`: **Eathan — Xentris Tech**.
- `reconocimiento-seo`: metodología basada en la plantilla de Daniel Bustillos, adaptada a skill por Xentris Tech.

## Licencia

MIT — ver [LICENSE](LICENSE).
