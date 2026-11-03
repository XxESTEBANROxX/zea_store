// ============================================================================
// ZEA STORE · Panel de inventario
// Filtros, ventanas de agregar/editar/eliminar y vista previa de la foto.
// (Guardar, eliminar y los botones − / + se conectan en el siguiente paso.)
// ============================================================================


// ----------------------------------------------------------------------------
// 1. ELEMENTOS DE LA PÁGINA
// ----------------------------------------------------------------------------
const filas = document.querySelectorAll(".fila");

const campoBuscar = document.getElementById("buscar");
const campoCategoria = document.getElementById("filtro-categoria");
const botonesEstado = document.querySelectorAll(".chip");
const contador = document.getElementById("contador");
const mensajeVacio = document.getElementById("sin-resultados");

const ventanaProducto = document.getElementById("dlg-producto");
const ventanaEliminar = document.getElementById("dlg-eliminar");
const formulario = document.getElementById("form-producto");

const inputFoto = document.getElementById("foto");
const vistaPrevia = document.getElementById("vista-previa");
const textoFoto = document.getElementById("foto-texto");
const zonaFoto = document.querySelector(".zona-foto");

// Filtros que están activos en este momento
const filtros = {
  busqueda: "",
  categoria: "",
  estado: "todos",
};


// ----------------------------------------------------------------------------
// 2. FILTROS Y BÚSQUEDA
// ----------------------------------------------------------------------------

// Quita tildes y mayúsculas para que "audifonos" encuentre "Audífonos"
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Muestra solo las filas que cumplen los tres filtros
function aplicarFiltros() {
  const busqueda = normalizar(filtros.busqueda);
  let visibles = 0;

  filas.forEach(function (fila) {
    const coincideTexto =
      !busqueda || normalizar(fila.dataset.texto).includes(busqueda);

    const coincideCategoria =
      !filtros.categoria || fila.dataset.categoria === filtros.categoria;

    const coincideEstado =
      filtros.estado === "todos" || fila.dataset.estado === filtros.estado;

    const mostrar = coincideTexto && coincideCategoria && coincideEstado;

    fila.hidden = !mostrar;

    if (mostrar) {
      visibles += 1;
    }
  });

  contador.textContent = visibles + (visibles === 1 ? " producto" : " productos");
  mensajeVacio.hidden = visibles !== 0;
}

campoBuscar.addEventListener("input", function () {
  filtros.busqueda = campoBuscar.value;
  aplicarFiltros();
});

campoCategoria.addEventListener("change", function () {
  filtros.categoria = campoCategoria.value;
  aplicarFiltros();
});

botonesEstado.forEach(function (boton) {
  boton.addEventListener("click", function () {
    filtros.estado = boton.dataset.estado;

    botonesEstado.forEach(function (otro) {
      otro.setAttribute("aria-pressed", otro === boton);
    });

    aplicarFiltros();
  });
});


// ----------------------------------------------------------------------------
// 3. VISTA PREVIA DE LA FOTO
// ----------------------------------------------------------------------------

function mostrarVistaPrevia(direccion) {
  vistaPrevia.src = direccion;
  vistaPrevia.hidden = false;
  textoFoto.hidden = true;
}

function ocultarVistaPrevia() {
  vistaPrevia.removeAttribute("src");
  vistaPrevia.hidden = true;
  textoFoto.hidden = false;
}

// Al elegir un archivo, se muestra enseguida (todavía no se sube a ningún lado)
inputFoto.addEventListener("change", function () {
  const archivo = inputFoto.files[0];

  if (archivo) {
    mostrarVistaPrevia(URL.createObjectURL(archivo));
  } else {
    ocultarVistaPrevia();
  }
});

// Arrastrar y soltar una foto sobre la zona
["dragenter", "dragover"].forEach(function (evento) {
  zonaFoto.addEventListener(evento, function (e) {
    e.preventDefault();
    zonaFoto.classList.add("arrastrando");
  });
});

["dragleave", "drop"].forEach(function (evento) {
  zonaFoto.addEventListener(evento, function (e) {
    e.preventDefault();
    zonaFoto.classList.remove("arrastrando");
  });
});

zonaFoto.addEventListener("drop", function (e) {
  if (e.dataTransfer.files.length > 0) {
    inputFoto.files = e.dataTransfer.files;
    inputFoto.dispatchEvent(new Event("change"));
  }
});


// ----------------------------------------------------------------------------
// 4. VENTANA DE AGREGAR / EDITAR
// ----------------------------------------------------------------------------

// Abre la ventana: vacía para agregar, o con los datos de un producto para editar
function abrirVentanaProducto(producto) {
  formulario.reset();
  ocultarVistaPrevia();
  document.getElementById("aviso-guardado").hidden = true;

  if (producto) {
    document.getElementById("titulo-ventana").textContent = "Editar producto";

    formulario.elements["id"].value = producto.id;
    formulario.elements["nombre"].value = producto.nombre;
    formulario.elements["sku"].value = producto.sku;
    formulario.elements["marca"].value = producto.marca;
    formulario.elements["categoria_id"].value = producto.categoria_id;
    formulario.elements["descripcion"].value = producto.descripcion;
    formulario.elements["precio_compra"].value = producto.precio_compra;
    formulario.elements["precio_venta"].value = producto.precio_venta;
    formulario.elements["stock"].value = producto.stock;
    formulario.elements["stock_minimo"].value = producto.stock_minimo;
    formulario.elements["visible_catalogo"].checked = producto.visible;

    if (producto.imagen) {
      mostrarVistaPrevia(producto.imagen);
    }
  } else {
    document.getElementById("titulo-ventana").textContent = "Agregar producto";
  }

  ventanaProducto.showModal();
}

document.getElementById("btn-agregar").addEventListener("click", function () {
  abrirVentanaProducto(null);
});

// Por ahora el formulario no guarda: solo avisa (se conecta en el siguiente paso)
formulario.addEventListener("submit", function (e) {
  e.preventDefault();
  document.getElementById("aviso-guardado").hidden = false;
});


// ----------------------------------------------------------------------------
// 5. EDITAR Y ELIMINAR DESDE LA TABLA
// ----------------------------------------------------------------------------

document.getElementById("cuerpo-tabla").addEventListener("click", function (e) {
  const boton = e.target.closest("[data-accion]");

  if (!boton) {
    return;
  }

  // Cada fila guarda los datos de su producto en el atributo data-producto
  const producto = JSON.parse(boton.closest(".fila").dataset.producto);

  if (boton.dataset.accion === "editar") {
    abrirVentanaProducto(producto);
  }

  if (boton.dataset.accion === "eliminar") {
    document.getElementById("nombre-eliminar").textContent = producto.nombre;
    ventanaEliminar.showModal();
  }
});


// ----------------------------------------------------------------------------
// 6. CERRAR VENTANAS
// ----------------------------------------------------------------------------

// Botones "Cancelar" y "X"
document.querySelectorAll("[data-cerrar]").forEach(function (boton) {
  boton.addEventListener("click", function () {
    boton.closest("dialog").close();
  });
});

// Clic en el fondo oscuro, fuera de la ventana
[ventanaProducto, ventanaEliminar].forEach(function (ventana) {
  ventana.addEventListener("click", function (e) {
    if (e.target === ventana) {
      ventana.close();
    }
  });
});


// ----------------------------------------------------------------------------
// 7. INICIO
// ----------------------------------------------------------------------------
aplicarFiltros();
