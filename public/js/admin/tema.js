// ============================================================================
// ZEA STORE · Panel · Modo claro / oscuro
// La elección se guarda en este navegador (la misma clave que usa el catálogo).
// ============================================================================

const botonTema = document.getElementById("th");

// ¿Está activo el modo oscuro? (primero lo elegido con el botón, si no, el del dispositivo)
function esModoOscuro() {
  const elegido = document.documentElement.getAttribute("data-theme");

  if (elegido) {
    return elegido === "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Muestra ☀️ cuando está en oscuro (para pasar a claro) y 🌙 cuando está en claro
function actualizarIconoTema() {
  if (botonTema) {
    botonTema.textContent = esModoOscuro() ? "☀️" : "🌙";
  }
}

// Cambia de tema y recuerda la elección
function cambiarTema() {
  const nuevo = esModoOscuro() ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", nuevo);

  try {
    localStorage.setItem("zea-theme", nuevo);
  } catch (error) {
    // Si el navegador no permite guardar, el cambio igual funciona en esta visita
  }

  actualizarIconoTema();
}

// Recupera el tema elegido en una visita anterior
try {
  const guardado = localStorage.getItem("zea-theme");

  if (guardado) {
    document.documentElement.setAttribute("data-theme", guardado);
  }
} catch (error) {
  // Sin almacenamiento: se usa el tema del dispositivo
}

if (botonTema) {
  botonTema.onclick = cambiarTema;
}

actualizarIconoTema();
