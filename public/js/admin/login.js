// ============================================================================
// ZEA STORE · Login · Mostrar u ocultar la contraseña
// ============================================================================

const campoClave = document.getElementById("clave");
const botonOjo = document.getElementById("ver-clave");

botonOjo.addEventListener("click", function () {
  const estaOculta = campoClave.type === "password";

  campoClave.type = estaOculta ? "text" : "password";

  botonOjo.setAttribute("aria-label", estaOculta ? "Ocultar contraseña" : "Mostrar contraseña");
  botonOjo.innerHTML = estaOculta
    ? '<i class="fa-solid fa-eye-slash"></i>'
    : '<i class="fa-solid fa-eye"></i>';
});
