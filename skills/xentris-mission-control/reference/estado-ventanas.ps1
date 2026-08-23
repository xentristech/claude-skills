# estado-ventanas.ps1 — Mission Control (Xentris Tech)
#
# Dice, EN TIEMPO REAL, cuales sesiones de Claude Code estan trabajando.
#
# Por que hace falta: el transcript .jsonl NO se escribe mientras un turno esta
# en marcha; su mtime se queda congelado hasta que el turno termina o entra un
# mensaje del usuario. Calcular el semaforo con ese mtime hace que una sesion
# metida en faena se vea "Esperandote" o "Inactiva" — justo al reves.
#
# El titulo de la ventana si es en vivo: Claude Code le antepone un glifo de
# estado. Observado: U+2733 '*' (quieta) y U+25D0 (trabajando). La regla es
# conservadora a proposito: cualquier glifo que NO sea el de quieta cuenta como
# trabajando, para que un cuadro nuevo de animacion no rompa la deteccion.
#
# Imprime JSON escapado a ASCII puro (\uXXXX). Es deliberado: la salida de
# PowerShell hacia otro proceso pasa por el codepage de la consola, y ahi los
# glifos y los acentos se corrompen en silencio. Escapando, da igual el codepage.

$ErrorActionPreference = 'Stop'

Add-Type @"
using System;using System.Text;using System.Collections.Generic;using System.Runtime.InteropServices;
public class McVentanas {
  // CharSet.Unicode obligatorio: sin el, cada titulo se corta en su primer caracter.
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowTextW(IntPtr h, StringBuilder s, int c);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  delegate bool EnumProc(IntPtr h, IntPtr l);
  public static List<string> Todas() {
    var r = new List<string>();
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h)) return true;
      var sb = new StringBuilder(512);
      GetWindowTextW(h, sb, 512);
      if (sb.Length > 0) r.Add(sb.ToString());
      return true;
    }, IntPtr.Zero);
    return r;
  }
}
"@

function Escapar([string]$s) {
  $sb = New-Object System.Text.StringBuilder
  foreach ($ch in $s.ToCharArray()) {
    $c = [int]$ch
    if ($ch -eq '"') { [void]$sb.Append('\"') }
    elseif ($ch -eq '\') { [void]$sb.Append('\\') }
    elseif ($c -lt 32 -or $c -gt 126) { [void]$sb.AppendFormat('\u{0:x4}', $c) }
    else { [void]$sb.Append($ch) }
  }
  $sb.ToString()
}

$partes = @()
foreach ($t in [McVentanas]::Todas()) {
  # Separar el glifo de estado del texto real, igual que hace enfocar.ps1.
  $i = 0
  while ($i -lt $t.Length -and -not [char]::IsLetterOrDigit($t[$i])) { $i++ }
  if ($i -eq 0) { continue }              # sin glifo: no es una ventana de Claude Code
  if ($i -ge $t.Length) { continue }      # titulo sin texto
  $glifo  = $t.Substring(0, $i).Trim()
  $limpio = $t.Substring($i).Trim()
  if ($limpio.Length -eq 0) { continue }
  $partes += '{"glifo":"' + (Escapar $glifo) + '","titulo":"' + (Escapar $limpio) + '"}'
}

'[' + ($partes -join ',') + ']'
