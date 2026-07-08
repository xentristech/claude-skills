<div align="center">

# 🧩 Claude Skills — Xentris Tech

### Agent Skills para [Claude Code](https://claude.com/claude-code) que automatizan SEO, despliegues y continuidad de trabajo

<br/>

![Claude Code](https://img.shields.io/badge/Claude_Code-Agent_Skills-D97757?style=for-the-badge&logo=anthropic&logoColor=white)
![Skills](https://img.shields.io/badge/Skills-6-2E7D32?style=for-the-badge)
![Made by](https://img.shields.io/badge/Made_by-Xentris_Tech-1A1A1A?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

<br/>

*Skills creados por **Eathan — Xentris Tech** para trabajar más rápido y no perder el hilo.*

</div>

---

## 📑 Tabla de contenidos

- [¿Qué es esto?](#-qué-es-esto)
- [Skills incluidos](#-skills-incluidos)
- [Instalación](#-instalación)
- [Cómo se usan](#-cómo-se-usan)
- [Estructura del repo](#-estructura-del-repo)
- [Créditos](#-créditos)
- [Licencia](#-licencia)

---

## 🚀 ¿Qué es esto?

Una colección de **Agent Skills** para Claude Code. Un *skill* es una carpeta con un archivo `SKILL.md` que le enseña a Claude a hacer una tarea concreta siguiendo **tu** forma de trabajar. Claude los activa **solo** cuando tu petición coincide con la descripción del skill — o puedes invocarlos por su nombre.

Estos son los skills que uso día a día en **Xentris Tech**: van desde posicionar sitios en la era de la IA hasta dejar apps corriendo 24/7 en un servidor, pasando por no perder nunca el contexto de un proyecto.

---

## 🧰 Skills incluidos

### 🔍 SEO

| Skill | Qué hace |
|-------|----------|
| **[`ai-seo`](skills/ai-seo)** | Optimización para motores de respuesta con IA (**GEO / AEO**). Logra que tu sitio sea **citado y recomendado** por Google AI Overviews, ChatGPT, Perplexity, Claude, Gemini y Copilot — no solo rankear azul, sino ser *la fuente que la IA menciona*. |
| **[`reconocimiento-seo`](skills/reconocimiento-seo)** | Análisis de **reconocimiento SEO técnico** completo de un sitio: robots.txt, sitemap, indexación, velocidad, móvil, HTTPS, competidores e intención de búsqueda. Entrega un *worksheet* listo para el cliente. Incluye scripts y plantillas. |

### ☁️ Despliegue e infraestructura

| Skill | Qué hace |
|-------|----------|
| **[`xentris-desplegar-vps`](skills/xentris-desplegar-vps)** | Deja una app **Python/FastAPI** (Docker) corriendo **24/7** en un VPS Ubuntu con **HTTPS automático** (Caddy + Let's Encrypt), servicio **systemd** que arranca solo, y **auto-deploy** por GitHub Actions en cada push. |
| **[`xentris-hostinger-a-vercel`](skills/xentris-hostinger-a-vercel)** | Apunta un dominio de **Hostinger** a un sitio en **Vercel** ✨ *sin perder el correo* ✨ — cambia solo los registros web (A/CNAME) y deja MX/SPF/DKIM intactos. |

### 🧠 Continuidad de trabajo

| Skill | Qué hace |
|-------|----------|
| **[`xentris-memoria-proyecto`](skills/xentris-memoria-proyecto)** | Crea y mantiene una **"memoria del proyecto"** (notas de continuidad) para que Claude retome el contexto exacto — qué se hizo, cómo va y cuál es el próximo paso — si se cierra la sesión. |
| **[`xentris-acceso-rapido`](skills/xentris-acceso-rapido)** | Crea un **acceso en el escritorio de Windows** (`.bat` + `.lnk` con ícono de marca) que reabre Claude Code en el proyecto y **continúa la conversación** donde quedó. |

---

## 📦 Instalación

**Opción A — clonar todo el repo** dentro de tu carpeta de skills:

```bash
# macOS / Linux
git clone https://github.com/xentristech/claude-skills.git ~/claude-skills
cp -r ~/claude-skills/skills/* ~/.claude/skills/
```

```powershell
# Windows (PowerShell)
git clone https://github.com/xentristech/claude-skills.git $env:USERPROFILE\claude-skills
Copy-Item -Recurse $env:USERPROFILE\claude-skills\skills\* $env:USERPROFILE\.claude\skills\
```

**Opción B — instalar un solo skill:**

```bash
cp -r skills/ai-seo ~/.claude/skills/
```

Luego reinicia Claude Code y el skill quedará disponible. ✅

---

## 💡 Cómo se usan

Una vez instalados, **no tienes que hacer nada especial**: Claude activa el skill automáticamente cuando tu mensaje coincide con su propósito. Por ejemplo:

> *"Hazme el SEO técnico de este sitio"* → activa `reconocimiento-seo`
> *"Sube el bot a un VPS que corra 24/7"* → activa `xentris-desplegar-vps`
> *"Apunta mi dominio de Hostinger a Vercel sin perder el correo"* → activa `xentris-hostinger-a-vercel`
> *"Guarda dónde vamos para no perder el hilo"* → activa `xentris-memoria-proyecto`

También puedes invocarlos por su nombre con `/`.

---

## 🗂️ Estructura del repo

```
claude-skills/
├── README.md
├── LICENSE                     # MIT
├── .gitignore
└── skills/
    ├── ai-seo/
    │   └── SKILL.md
    ├── reconocimiento-seo/
    │   ├── SKILL.md
    │   ├── references/         # checklist + guía on-page
    │   ├── scripts/            # generador de worksheet en Excel
    │   └── templates/          # plantilla de salida
    ├── xentris-acceso-rapido/
    ├── xentris-desplegar-vps/
    ├── xentris-hostinger-a-vercel/
    └── xentris-memoria-proyecto/
```

---

## 🙌 Créditos

- Skills `ai-seo` y `xentris-*` — **Eathan · Xentris Tech**.
- `reconocimiento-seo` — metodología basada en la plantilla de **Daniel Bustillos**, adaptada a skill por Xentris Tech.

---

## 📄 Licencia

Distribuido bajo licencia **MIT**. Ver [LICENSE](LICENSE).

<div align="center">
<br/>

**Hecho con ❤️ por [Xentris Tech](https://github.com/xentristech)**

</div>
