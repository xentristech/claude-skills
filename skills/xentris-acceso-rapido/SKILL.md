---
name: xentris-acceso-rapido
description: Buena práctica de agente Xentris Tech. Crea un acceso rápido en el escritorio de Windows (archivo .bat + acceso directo .lnk con ícono de marca) para reabrir Claude Code en el proyecto y CONTINUAR la conversación si se cierra la ventana. Úsala cuando el usuario pida un "acceso rápido", "launcher", "atajo en el escritorio", "botón para reabrir Claude", "que no pierda la sesión si se cierra", o cuando convenga darle continuidad a un usuario que trabaja largas sesiones (ej. TDAH). Solo Windows.
---

# Acceso rápido para reabrir Claude en el proyecto (Xentris Tech)

Esta skill crea en el **escritorio de Windows** un acceso que reabre Claude Code en la carpeta del proyecto y ejecuta `claude --continue` para **retomar la conversación donde quedó**. Es una buena práctica de continuidad: si al usuario se le cierra la ventana (o se va la luz), no pierde el hilo.

Windows **no permite** ponerle un ícono personalizado a un `.bat`, así que se crean **dos archivos**: el `.bat` (ejecuta) y un **acceso directo `.lnk`** con el ícono de marca (el que el usuario ve y hace doble clic).

## Parámetros a definir antes de crear
1. **PROJECT_DIR**: la carpeta del proyecto donde vive la conversación de Claude. Por defecto, el directorio de trabajo actual de la sesión. (La sesión y la memoria se anclan a esta ruta; `claude --continue` retoma la última conversación de ese directorio.)
2. **LOGO_PATH**: una imagen (PNG/JPG) del logo del proyecto para el ícono. Si no hay, pregunta al usuario o usa un logo existente del repo.
3. **LAUNCHER_NAME**: nombre visible del acceso (ej. "Claude - YOTA Montacargas").

## Pasos

### 1. Generar el ícono `.ico` desde el logo
Guarda el `.ico` en una ubicación estable (ej. la carpeta del proyecto), no en el escritorio, para que el acceso siempre lo encuentre.

```powershell
Add-Type -AssemblyName System.Drawing
$src = "LOGO_PATH"
$icoPath = "PROJECT_DIR\marca-icon.ico"
$img = [System.Drawing.Image]::FromFile($src)
$bmp = New-Object System.Drawing.Bitmap 256,256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img,0,0,256,256)
$g.Dispose(); $img.Dispose()
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms,[System.Drawing.Imaging.ImageFormat]::Png)
$png = $ms.ToArray(); $ms.Dispose(); $bmp.Dispose()
# Empaquetar el PNG dentro del formato ICO (una entrada 256x256)
$out = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($out)
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]1)
$bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0)
$bw.Write([UInt16]1); $bw.Write([UInt16]32)
$bw.Write([UInt32]$png.Length); $bw.Write([UInt32]22)
$bw.Write($png); $bw.Flush()
[IO.File]::WriteAllBytes($icoPath, $out.ToArray()); $out.Dispose()
```

### 2. Crear el `.bat` en el escritorio y el acceso directo `.lnk` con el ícono
Usa `[Environment]::GetFolderPath('Desktop')` para obtener el escritorio real (respeta OneDrive). El `.bat` ejecuta `claude --continue` con `call` (para que retorne bien si `claude` es un `.cmd`).

```powershell
$desktop = [Environment]::GetFolderPath('Desktop')
$proj = "PROJECT_DIR"
$ico  = "$proj\marca-icon.ico"
$bat  = Join-Path $desktop "LAUNCHER_NAME.bat"
$batContent = @"
@echo off
title LAUNCHER_NAME
cd /d "$proj"
echo Reabriendo Claude en el proyecto...
echo.
call claude --continue
echo.
echo (La sesion de Claude termino. Puedes cerrar esta ventana.)
pause >nul
"@
Set-Content -LiteralPath $bat -Value $batContent -Encoding ascii

$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut((Join-Path $desktop "LAUNCHER_NAME.lnk"))
$lnk.TargetPath = $bat
$lnk.WorkingDirectory = $proj
$lnk.IconLocation = "$ico,0"
$lnk.Description = "Reabrir Claude en el proyecto"
$lnk.Save()
```

### 3. Confirmar al usuario
- Dile que haga **doble clic en el acceso con el logo** (el `.lnk`), no en el `.bat`.
- Si el ícono aparece genérico al inicio, es solo el caché de Windows: se corrige con F5 en el escritorio o reiniciando el Explorador.

## Buenas prácticas Xentris Tech (contexto)
- **Continuidad primero:** combina este acceso con guardar **memoria** del proyecto (qué se construyó, estado y siguiente paso). Así, aunque `--continue` falle, al abrir Claude en esa carpeta el agente retoma el contexto.
- **Nunca** escribas secretos (API keys, contraseñas) en el `.bat` ni en el repo; van en variables de entorno / `.env.local` ignorado por git.
- Un acceso por proyecto; nombra el `.lnk` con la marca del cliente para que sea reconocible.
