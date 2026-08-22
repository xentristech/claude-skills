<div align="center">

# 🧩 Claude Skills — Xentris Tech

### Agent Skills para [Claude Code](https://claude.com/claude-code) que automatizan SEO, despliegues, observabilidad de agentes y continuidad de trabajo

<br/>

![Claude Code](https://img.shields.io/badge/Claude_Code-Agent_Skills-D97757?style=for-the-badge&logo=anthropic&logoColor=white)
![Skills](https://img.shields.io/badge/Skills-10-2E7D32?style=for-the-badge)
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
| **[`xentris-acceso-remoto-tailscale`](skills/xentris-acceso-remoto-tailscale)** | Configura **Escritorio Remoto (RDP) por Tailscale** en Windows — sin abrir puertos a internet — y lo blinda con **RemoteGuard**: una Tarea Programada (SYSTEM) que **auto-repara** Tailscale + RDP al arranque, al iniciar sesión y cada 10 min. Incluye las fallas conocidas de Tailscale en Windows y sus soluciones probadas. |

### 🧠 Continuidad de trabajo

| Skill | Qué hace |
|-------|----------|
| **[`xentris-memoria-proyecto`](skills/xentris-memoria-proyecto)** | Crea y mantiene una **"memoria del proyecto"** (notas de continuidad) para que Claude retome el contexto exacto — qué se hizo, cómo va y cuál es el próximo paso — si se cierra la sesión. |
| **[`xentris-acceso-rapido`](skills/xentris-acceso-rapido)** | Crea un **acceso en el escritorio de Windows** (`.bat` + `.lnk` con ícono de marca) que reabre Claude Code en el proyecto y **continúa la conversación** donde quedó. |

### 🛰️ Observabilidad de agentes

| Skill | Qué hace |
|-------|----------|
| **[`xentris-mission-control`](skills/xentris-mission-control)** | Instala **Mission Control**, el *"Windows" de los agentes de IA*: un panel local (Node sin dependencias, `127.0.0.1:7777`) que lee los transcripts de Claude Code y muestra **en tiempo real y en lenguaje humano** qué hace cada sesión — semáforo de estado, resumen del proyecto al pasar el mouse, artefactos publicados y **modo presentación** para clientes. Un clic en la tarjeta **trae al frente la ventana** que esa sesión ya tiene abierta, en vez de abrir otra. Sale on-brand: tipografía propia incrustada, cero CDN. |

### 📄 Documentos y marca personal

| Skill | Qué hace |
|-------|----------|
| **[`xentris-hoja-de-vida`](skills/xentris-hoja-de-vida)** | Crea una **hoja de vida (CV / resume)** profesional en **HTML imprimible a PDF** (A4, dos columnas) con un **asistente de IA integrado** que invita al reclutador a *preguntar y evaluar* al candidato — chat offline por palabras clave que **se oculta al imprimir**. Recopila datos del portafolio, LinkedIn, GitHub y proyectos. Español e inglés. |
| **[`xentris-perfil-github`](skills/xentris-perfil-github)** | Crea o rehace el **README de perfil de GitHub** (el repo especial `usuario/usuario`) con banner SVG propio, secciones colapsables, un asistente de IA que responde preguntas por Issues y estructura pensada para que ChatGPT y Perplexity **citen** el perfil. Incluye las trampas verificadas que rompen la mayoría de perfiles. |

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
> *"Hazme una hoja de vida con IA"* → activa `xentris-hoja-de-vida`
> *"Quiero conectarme a este PC desde otro lado por Tailscale"* → activa `xentris-acceso-remoto-tailscale`
> *"Quiero ver qué están haciendo mis agentes"* → activa `xentris-mission-control`
> *"Haz que mi perfil de GitHub se vea profesional"* → activa `xentris-perfil-github`

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
    ├── xentris-acceso-remoto-tailscale/
    ├── xentris-desplegar-vps/
    ├── xentris-hoja-de-vida/
    │   ├── SKILL.md
    │   └── assets/             # plantilla-cv.html (diseño A4 + chat de IA)
    ├── xentris-hostinger-a-vercel/
    ├── xentris-memoria-proyecto/
    ├── xentris-mission-control/
    │   ├── SKILL.md
    │   └── reference/          # server.js, index.html, aplicar-marca.js, enfocar.ps1
    └── xentris-perfil-github/
```

---

## 🙌 Créditos

- Skills `ai-seo` y `xentris-*` — **Eathan · Xentris Tech**.
- `reconocimiento-seo` — metodología basada en la plantilla de **Farid Enrique Jiménez Campo**, adaptada a skill por Xentris Tech.

---

## 📄 Licencia

Distribuido bajo licencia **MIT**. Ver [LICENSE](LICENSE).

<div align="center">
<br/>

**Hecho con ❤️ por [Xentris Tech](https://github.com/xentristech)**

</div>
