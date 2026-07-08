---
name: xentris-memoria-proyecto
description: Buena práctica de agente Xentris Tech. Crea y mantiene una "memoria del proyecto" (notas de continuidad) para que Claude retome el contexto exacto si se cierra la ventana, se corta la sesión o pasa el tiempo. Úsala cuando el usuario pida "crea/actualiza memoria del proyecto", "guarda dónde vamos", "que recuerdes lo que hicimos", "para no perder el hilo si se cierra", "handoff", o cuando convenga dar continuidad a un usuario en sesiones largas (ej. TDAH). Combínala con xentris-acceso-rapido (ícono de escritorio) para continuidad total.
---

# Memoria del proyecto para continuidad (Xentris Tech)

Mantén un conjunto pequeño de notas en la **memoria por proyecto de Claude Code** para que, al volver, el agente sepa **qué se hizo, cómo va y cuál es el próximo paso** sin depender de la memoria del usuario. Es la mitad de "software" de la continuidad; la otra mitad es el acceso rápido del escritorio (skill `xentris-acceso-rapido`).

## Cuándo usarla
- El usuario pide crear/actualizar la memoria, "guardar dónde vamos", "que recuerdes".
- Al **cerrar** un avance importante, o cuando el usuario avisa que se puede cerrar la ventana / irse la luz.
- Usuarios con **TDAH** o sesiones largas: mantener siempre el estado al día.
- **Al inicio de cada sesión**, lee primero `sesion-donde-quedamos.md`.

## Dónde vive
En la carpeta de memoria del proyecto de Claude Code:
`C:\Users\<usuario>\.claude\projects\<slug-del-proyecto>\memory\`
(el `<slug>` es la ruta del proyecto con `\`/`:` reemplazados por `-`). Ahí ya existe/leerse `MEMORY.md` (índice que Claude carga cada sesión: una línea por nota, sin contenido).

## Archivos a mantener (una idea por archivo)
1. **`sesion-donde-quedamos.md`** — LA nota clave (leer PRIMERO). Contiene: **Dónde quedamos** (estado en 2-4 líneas), **Próximo paso concreto**, y **Skills útiles** del proyecto. Se reescribe cada vez que se avanza.
2. **`<proyecto>-estado.md`** — qué se construyó y funciona (features, decisiones no obvias del código).
3. **`<proyecto>-pendientes.md`** — lo que falta (tareas del usuario y próximas mejoras). Fechas en absoluto.
4. **`<proyecto>-gotchas.md`** — trampas resueltas, para no repetirlas.
5. **`<proyecto>-credenciales.md`** — **dónde viven** los secretos (`.env`, servidor) e IDs estables. NUNCA el valor de tokens/contraseñas que rotan.
6. **`usuario-<nombre>.md`** — quién es el usuario y **cómo trabajar con él** (preferencias; si tiene TDAH, recordárselo con notas claras y un paso a la vez).

Enlaza notas entre sí con `[[nombre-de-la-nota]]`. Cada archivo lleva frontmatter:
```markdown
---
name: <slug-kebab>
description: <resumen de una línea — para decidir relevancia al recordar>
metadata:
  type: user | feedback | project | reference
---
<el contenido>
```

## Pasos
1. Identifica el `slug` del proyecto y asegura que exista la carpeta `memory\`.
2. Crea/actualiza `sesion-donde-quedamos.md` con estado + próximo paso + skills. Márcalo en `MEMORY.md` de primero (con ⭐).
3. Crea/actualiza el resto de notas según lo trabajado. **No dupliques** lo que ya está en el código, git o el README; guarda solo lo no obvio y el estado.
4. Añade/actualiza la línea de cada nota en `MEMORY.md` (`- [Título](archivo.md) — gancho`).
5. Confirma al usuario qué guardaste y cómo retomar: abrir el ícono del escritorio y escribir **"dónde quedamos"**.

## Reglas
- Un dato/tema por archivo; conciso.
- Convierte fechas relativas a absolutas.
- Antes de crear, busca si ya existe una nota que cubra el tema y actualízala en vez de duplicar.
- **Nunca** guardes secretos que rotan (API keys, tokens, contraseñas) en la memoria ni en git; guarda solo **dónde encontrarlos**.
- Los secretos van en `.env` (ignorado por git) o el `.env` del servidor.
