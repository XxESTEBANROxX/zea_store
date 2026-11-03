// ============================================================================
// ZEA STORE · Lógica del catálogo público
// Filtros, búsqueda, botones de WhatsApp y cambio de modo claro/oscuro.
// ============================================================================


// ----------------------------------------------------------------------------
// 1. DATOS (los entrega Flask en catalogo.html dentro de window.ZEA)
// ----------------------------------------------------------------------------
const ZEA = window.ZEA || {};

const WA_NUMBER      = ZEA.waNumber;
const CATEGORIAS     = ZEA.categorias || [];
const PRODUCTOS      = ZEA.productos  || [];
const DISPONIBILIDAD = ["Todos", "Disponible", "Agotado"];

// Filtros que la persona tiene activos en este momento
const filtros = {
  categoria:      "Todos",
  disponibilidad: "Todos",
  busqueda:       "",
};


// ----------------------------------------------------------------------------
// 2. FUNCIONES DE APOYO
// ----------------------------------------------------------------------------

// Atajo para buscar un elemento por su id
function $(id) {
  return document.getElementById(id);
}

// Quita tildes y mayúsculas para que "audifonos" encuentre "Audífonos"
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Evita que un texto con símbolos como < > o comillas rompa la página
function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML.replace(/"/g, "&quot;");
}

// ----------------------------------------------------------------------------
// 3. FILTROS (botones de categoría y disponibilidad)
// ----------------------------------------------------------------------------

// Crea una fila de botones dentro de un contenedor.
// - clave: qué filtro controla ("categoria" o "disponibilidad")
// - clase: clase CSS opcional para cada botón
function crearBotones(contenedor, opciones, clave, clase) {
  contenedor.innerHTML = "";

  opciones.forEach(function (opcion) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = opcion;

    if (clase) {
      boton.className = clase;
    }

    // aria-pressed="true" pinta el botón seleccionado (ver catalogo.css)
    boton.setAttribute("aria-pressed", filtros[clave] === opcion);

    boton.onclick = function () {
      filtros[clave] = opcion;
      dibujarCatalogo();
    };

    contenedor.appendChild(boton);
  });
}

// Devuelve solo los productos que cumplen los filtros activos
function filtrarProductos() {
  const busqueda = normalizar(filtros.busqueda);

  return PRODUCTOS.filter(function (producto) {
    const coincideCategoria =
      filtros.categoria === "Todos" || producto.categoria === filtros.categoria;

    const coincideDisponibilidad =
      filtros.disponibilidad === "Todos" ||
      (filtros.disponibilidad === "Disponible") === producto.disponible;

    const textoProducto = normalizar(
      producto.nombre + " " + producto.marca + " " + producto.categoria
    );
    const coincideBusqueda = !busqueda || textoProducto.includes(busqueda);

    return coincideCategoria && coincideDisponibilidad && coincideBusqueda;
  });
}


// ----------------------------------------------------------------------------
// 4. TARJETAS DE PRODUCTOS
// ----------------------------------------------------------------------------

// Arma el enlace que abre WhatsApp con un mensaje sobre el producto
function crearEnlaceWhatsApp(producto) {
  const mensaje = encodeURIComponent(
    "Hola, quiero información sobre: " + producto.nombre + " (" + producto.marca + ")"
  );
  return "https://wa.me/" + WA_NUMBER + "?text=" + mensaje;
}

// Muestra la foto del producto; si no tiene, muestra un emoji de respaldo
function crearImagen(producto) {
  if (producto.imagen) {
    return `<img src="${escaparHtml(producto.imagen)}"
                 alt="${escaparHtml(producto.nombre)}"
                 loading="lazy">`;
  }

  return `<span aria-hidden="true">${producto.emoji}</span>`;
}

// Devuelve el HTML de una tarjeta de producto
function crearTarjeta(producto) {
  const disponible   = producto.disponible;
  const claseEstado  = disponible ? "" : " off";
  const textoEstado  = disponible ? "Disponible" : "Agotado";
  const claseBoton   = disponible ? "" : " alt";
  const textoBoton   = disponible ? "Consultar por WhatsApp" : "Preguntar cuándo llega";

  return `
    <article class="card">

      <div class="tile">${crearImagen(producto)}</div>

      <div class="info">
        <span class="brandn">${escaparHtml(producto.marca)}</span>
        <h2 class="name">${escaparHtml(producto.nombre)}</h2>
        <span class="badge${claseEstado}">${textoEstado}</span>

        <a class="wa${claseBoton}"
           href="${crearEnlaceWhatsApp(producto)}"
           target="_blank" rel="noopener">
          ${textoBoton}
        </a>
      </div>

    </article>
  `;
}

// Dibuja de nuevo los filtros, el contador y las tarjetas
function dibujarCatalogo() {
  crearBotones($("cats"), CATEGORIAS, "categoria", "chip");
  crearBotones($("avail"), DISPONIBILIDAD, "disponibilidad");

  const resultado = filtrarProductos();

  $("count").textContent =
    resultado.length + (resultado.length === 1 ? " producto" : " productos");

  if (resultado.length === 0) {
    $("grid").innerHTML =
      '<p class="empty">No encontramos productos con esos filtros. ' +
      "Prueba otra categoría o escríbenos por WhatsApp.</p>";
    return;
  }

  $("grid").innerHTML = resultado.map(crearTarjeta).join("");
}


// ----------------------------------------------------------------------------
// 5. MODO CLARO / OSCURO
// ----------------------------------------------------------------------------

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
  $("th").textContent = esModoOscuro() ? "☀️" : "🌙";
}

// Cambia de tema y recuerda la elección en este navegador
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


// ----------------------------------------------------------------------------
// 6. INICIO
// ----------------------------------------------------------------------------

// Recupera el tema que la persona eligió en una visita anterior
try {
  const guardado = localStorage.getItem("zea-theme");

  if (guardado) {
    document.documentElement.setAttribute("data-theme", guardado);
  }
} catch (error) {
  // Sin almacenamiento: se usa el tema del dispositivo
}

$("q").oninput = function () {
  filtros.busqueda = this.value;
  dibujarCatalogo();
};

$("th").onclick = cambiarTema;

actualizarIconoTema();
dibujarCatalogo();
