---
name: xentris-hostinger-a-vercel
description: Buena práctica de agente Xentris Tech. Apunta un dominio de Hostinger a un sitio en Vercel SIN perder el correo. Úsala cuando el usuario pida "pasar/apuntar el dominio a Vercel", "conectar dominio de Hostinger a Vercel", "poner mi dominio en Vercel", "sin perder los correos", "mudar la web a Vercel", o al publicar una app Next.js en Vercel con dominio propio comprado en Hostinger. Cambia SOLO los registros web (A/CNAME); deja el correo (MX/SPF/DKIM) intacto en Hostinger. Se puede hacer por el MCP de Hostinger DNS.
metadata:
  version: 1.0.0
  author: Xentris Tech
---

# Apuntar un dominio de Hostinger a Vercel (sin perder el correo)

Conecta un dominio registrado en Hostinger a un sitio desplegado en **Vercel**, cambiando **solo los registros web** (`A`/`CNAME`) y **dejando el correo intacto** (`MX`/`SPF`/`DKIM` se quedan en Hostinger).

## Concepto clave (explícaselo al usuario)
Un dominio tiene partes independientes:
- **Web** → registros `A` (raíz `@`) y `CNAME` (`www`). ESTOS se apuntan a Vercel.
- **Correo** → registros `MX`, `SPF` (TXT), `DKIM` (CNAME/TXT). ESTOS **NO se tocan** → el email sigue en Hostinger, gratis.

Regla de oro: **usar método A/CNAME, NO cambiar nameservers.** Cambiar nameservers a Vercel mueve TODO el DNS y obliga a recrear el correo a mano (fácil de romper). Con A/CNAME el DNS sigue en Hostinger y solo la web va a Vercel.

## Valores de Vercel (verificar en el panel, pueden cambiar)
- Raíz `@` → registro **A** a `76.76.21.21`
- `www` → registro **CNAME** a `cname.vercel-dns.com`
- Vercel a veces "recomienda" nameservers: es solo sugerencia, el método A/CNAME está soportado oficialmente y emite HTTPS automático.

---

## Pasos

### 1. El sitio ya debe estar desplegado en Vercel
Con dominio provisional `*.vercel.app` funcionando. (Deploy por `npx vercel --prod --yes` o git integration.)

### 2. Agregar el dominio en Vercel
Proyecto → **Settings → Domains** → escribe el dominio (`ej. neona.tech`) → **Add**.
Vercel mostrará los registros que espera (A para `@`, CNAME para `www`). Elige el método **"A / CNAME record"** (no "Nameservers").

### 3. Auditar el DNS actual en Hostinger (antes de tocar nada)
Por MCP: `DNS_getDNSRecordsV1(domain)`. Anota especialmente:
- El registro de la raíz `@` (en Hostinger suele ser un **ALIAS** a `...cdn.hstgr.net` → hay que reemplazarlo por A a Vercel).
- El `www` (CNAME al cdn de Hostinger → reemplazar por CNAME a Vercel).
- **NO tocar**: `MX`, el `TXT` de SPF (`v=spf1 ...hostinger...`), los CNAME `*._domainkey` (DKIM), el `_dmarc`.

### 4. Cambiar SOLO los 2 registros web
Por MCP `DNS_updateDNSRecordsV1` (o en hPanel → Avanzado → Editor de DNS):
- `@`  → tipo **A**, valor `76.76.21.21` (elimina el ALIAS previo a hstgr).
- `www` → tipo **CNAME**, valor `cname.vercel-dns.com`.
- TTL bajo (300s) para propagación rápida.
- **Deja el resto EXACTAMENTE igual.**

Valida antes de aplicar con `DNS_validateDNSRecordsV1` si está disponible. Considera tomar un snapshot / respaldo del DNS por si acaso.

### 5. Verificar en Vercel
Vuelve a Domains en Vercel → debe pasar a **Valid Configuration** y emitir el **SSL** (puede tardar de minutos a un par de horas por propagación DNS). `www` normalmente se configura para redirigir a la raíz (o al revés) según prefiera el usuario.

### 6. Verificar que el correo sigue vivo
Confirma que los `MX`/`SPF`/`DKIM` siguen intactos (`DNS_getDNSRecordsV1`). Pide al usuario enviar/recibir un correo de prueba a `@dominio`. Debe funcionar igual que antes.

---

## Checklist de comprobación
- [ ] Dominio en Vercel = **Valid** + candado HTTPS.
- [ ] `curl -I https://dominio` responde 200 desde Vercel.
- [ ] Registros `MX`, SPF, DKIM, DMARC **sin cambios**.
- [ ] Correo de prueba entra/sale bien.

## Gotchas
- **Nunca** cambies a nameservers de Vercel si el correo vive en Hostinger.
- El registro raíz en Hostinger suele ser **ALIAS** (no A). Hay que reemplazarlo por **A** hacia Vercel; si Hostinger no deja poner A en la raíz, usar su ALIAS/ANAME apuntando al destino de Vercel, pero lo estándar es A `76.76.21.21`.
- La **propagación DNS** no es instantánea (TTL). Baja el TTL a 300s antes de migrar.
- No borres los `_domainkey` (DKIM) ni el SPF: si se van, el correo puede dejar de firmarse/enviarse.
- Verifica los valores actuales de Vercel en su panel (IP/CNAME pueden actualizarse con el tiempo).

## Seguridad
- Nunca escribas secretos (API keys, tokens) en el DNS ni en el repo.
- El cambio de DNS es reversible: si algo sale mal, restaura los registros web previos (o el snapshot).

## Relacionado
- Deploy de la app a Vercel (CLI `npx vercel --prod`) y variables de entorno (`OPENAI_API_KEY`, etc.) del lado servidor.
- Continuidad del proyecto: `xentris-memoria-proyecto`, `xentris-acceso-rapido`.
