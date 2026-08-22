# enfocar.ps1 — Mission Control (Xentris Tech)
#
# Trae al frente la ventana de terminal de una sesion de Claude Code que YA esta
# abierta, en vez de abrir una segunda sobre el mismo hilo.
#
# Como la encuentra: Claude Code pone el titulo de la conversacion en la ventana
# de la terminal, y guarda ese mismo texto en el transcript como evento
# `ai-title`. Aqui se compara uno contra otro, ignorando el glifo de estado que
# Claude antepone (checkmark, reloj, etc.).
#
# El titulo llega por la variable de entorno MC_TITULO, NO por argumento: asi no
# hay ninguna cadena que citar y no existe superficie de inyeccion.
#
# Imprime "FOCUS" si enfoco una ventana, "MULTI" si habia varias con ese titulo
# (enfoca la primera) y "NONE" si no encontro ninguna.

$ErrorActionPreference = 'Stop'
$objetivo = $env:MC_TITULO
if ([string]::IsNullOrWhiteSpace($objetivo)) { 'NONE'; exit 0 }

Add-Type @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class McFoco {
  // CharSet.Unicode es obligatorio: sin el, el marshaller lee la cadena ancha
  // como ANSI y cada titulo se corta en su primer caracter.
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int  GetWindowTextW(IntPtr h, StringBuilder s, int c);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern int  GetWindowThreadProcessId(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool AttachThreadInput(int a, int b, bool attach);
  [DllImport("kernel32.dll")] static extern int GetCurrentThreadId();

  delegate bool EnumProc(IntPtr h, IntPtr l);
  const int SW_RESTORE = 9;

  // Claude antepone un glifo de estado al titulo. Quitamos cualquier cosa que no
  // sea letra o digito del principio, para comparar el texto de verdad.
  static string Limpiar(string s) {
    if (s == null) return "";
    int i = 0;
    while (i < s.Length && !char.IsLetterOrDigit(s[i])) i++;
    return s.Substring(i).Trim();
  }

  public static List<IntPtr> Buscar(string objetivo) {
    string meta = Limpiar(objetivo);
    var hallados = new List<IntPtr>();
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h)) return true;
      var sb = new StringBuilder(512);
      GetWindowTextW(h, sb, 512);
      if (sb.Length == 0) return true;
      if (string.Equals(Limpiar(sb.ToString()), meta, StringComparison.OrdinalIgnoreCase))
        hallados.Add(h);
      return true;
    }, IntPtr.Zero);
    return hallados;
  }

  // Windows bloquea SetForegroundWindow desde un proceso que no esta al frente.
  // El camino habitual es engancharse al hilo de entrada de la ventana que si lo
  // esta, pedir el foco, y soltar.
  public static bool Enfocar(IntPtr h) {
    if (IsIconic(h)) ShowWindow(h, SW_RESTORE);
    IntPtr frente = GetForegroundWindow();
    int hiloFrente = GetWindowThreadProcessId(frente, IntPtr.Zero);
    int hiloMio    = GetCurrentThreadId();
    bool enganchado = false;
    if (hiloFrente != 0 && hiloFrente != hiloMio)
      enganchado = AttachThreadInput(hiloMio, hiloFrente, true);
    bool listo = SetForegroundWindow(h);
    if (enganchado) AttachThreadInput(hiloMio, hiloFrente, false);
    return listo;
  }
}
"@

$ventanas = [McFoco]::Buscar($objetivo)
if ($ventanas.Count -eq 0) { 'NONE'; exit 0 }

[void][McFoco]::Enfocar($ventanas[0])
if ($ventanas.Count -gt 1) { 'MULTI' } else { 'FOCUS' }
