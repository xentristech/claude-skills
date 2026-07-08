---
name: xentris-desplegar-vps
description: Buena práctica de agente Xentris Tech. Despliega una app Python/FastAPI (o similar en Docker) en un VPS Ubuntu (Oracle Cloud, Hetzner, etc.) con HTTPS automático (Caddy), servicio systemd que arranca solo, y auto-deploy por GitHub Actions en cada push. Úsala cuando el usuario pida "desplegar", "poner en producción", "subir el bot/app a un servidor", "que corra 24/7", "VPS", "Docker + HTTPS", o dar continuidad de producción a un proyecto. Solo Linux/VPS.
---

# Desplegar una app en un VPS con HTTPS y auto-deploy (Xentris Tech)

Deja una app (contenedor Docker) corriendo **24/7** detrás de **Caddy** (HTTPS automático con Let's Encrypt), gestionada por **systemd** (arranca sola al reiniciar), y con **auto-deploy** por GitHub Actions en cada push a `main`.

## Cuándo usarla
El usuario quiere que su bot/API deje de depender de su PC o de túneles temporales y quede en producción estable con dominio y HTTPS.

## Requisitos
- Un `Dockerfile` que corra la app (ej. `uvicorn app:app --host 0.0.0.0 --port $PORT`) y un volumen para datos si usa SQLite.
- Un VPS Ubuntu con acceso SSH (llave privada) y su IP pública.
- Un dominio/subdominio apuntando a la IP (registro A). Si el DNS pelea (parking, IPv6 fantasma), usar **sslip.io**: `1-2-3-4.sslip.io` resuelve directo a `1.2.3.4`.

## Pasos
1. **Preparar el repo:** `Dockerfile`, `.dockerignore` (excluir `.env`, `venv/`, datos), y un `deploy_oracle.sh` que instale Docker + Caddy, abra el firewall del SO, construya la imagen y registre el servicio systemd. El `.env` NUNCA va a git.
2. **Clonar y configurar en el VPS:** `git clone`, crear el `.env` con los secretos, `bash deploy_oracle.sh <dominio>`.
3. **Servicio systemd** (arranque automático): el script escribe `/etc/systemd/system/<app>.service` que hace `docker run` del contenedor (`Restart=always`), y `systemctl enable --now <app>`.
4. **Caddy** (HTTPS): `/etc/caddy/Caddyfile` con `dominio { reverse_proxy localhost:PUERTO }`; `systemctl restart caddy`. Caddy saca el certificado solo.
5. **Auto-deploy:** `.github/workflows/deploy.yml` con `appleboy/ssh-action`: en cada push a `main` hace SSH al VPS, `git pull`, `docker build`, `systemctl restart`. Secrets en GitHub: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.
6. **Apuntar webhooks/servicios** (Meta, Mercado Pago, etc.) a `https://<dominio>/...`.

## Gotchas (aprendidos a los golpes)
- **Dos firewalls.** El del SO (iptables, lo abre el script) Y el **firewall de la nube** (Security List de Oracle / NSG). Hay que abrir **80 y 443 en ambos** o no entra tráfico. En Oracle: VCN → Subnet → Security List → Add Ingress Rules (TCP 80 y 443, source `0.0.0.0/0`, no stateless).
- **Oracle Ubuntu trae nginx en :80** por defecto → Caddy falla ("address already in use"). `systemctl stop nginx && systemctl disable nginx`.
- **Instalar Caddy:** NO instalar `debian-keyring` (paquete de 29 MB que se cuelga en algunos mirrors); no lo necesita.
- **DNS parking / IPv6 fantasma:** algunos registradores (Hostinger) sirven un comodín que secuestra subdominios con IPv6 → Let's Encrypt falla porque intenta por IPv6 a un servidor ajeno. Workaround inmediato: **sslip.io**.
- **`claude`/`docker` como .cmd/sudo:** en el `.bat` usar `call`; en el VPS el usuario suele tener sudo sin contraseña.
- **HTTPS válido es obligatorio** para webhooks de Meta y Mercado Pago; Caddy lo da automático una vez el dominio resuelve y 80/443 están abiertos.

## Operación
- `systemctl status <app>` · `docker logs -f <app>` · `bash redeploy.sh` (pull+build+restart a mano).
- Combínala con **xentris-memoria-proyecto** (guardar estado/pendientes) y **xentris-acceso-rapido** (ícono para retomar).
