// ============================================================================
// ZEA STORE · Panel de inventario
// Filtros, agregar / editar / eliminar, botones − y +, y subida de fotos.
// ============================================================================


// ----------------------------------------------------------------------------
// 1. ELEMENTOS DE LA PÁGINA
// ----------------------------------------------------------------------------
const campoBuscar = document.getElementById("buscar");
const campoCategoria = document.getElementById("filtro-categoria");
const botonesEstado = document.querySelectorAll(".chip");
const contador = document.getElementById("contador");
const mensajeVacio = document.getElementById("sin-resultados");
const cuerpoTabla = document.getElementById("cuerpo-tabla");

const ventanaProducto = document.getElementById("dlg-producto");
const ventanaEliminar = document.getElementById("dlg-eliminar");
const formulario = document.getElementById("form-producto");
const botonGuardar = document.getElementById("btn-guardar");
const mensajeForm = document.getElementById("mensaje-form");

const inputFoto = document.getElementById("foto");
const vistaPrevia = document.getElementById("vista-previa");
const textoFoto = document.getElementById("foto-texto");
const zonaFoto = document.querySelector(".zona-foto");
const botonQuitarFoto = document.getElementById("quitar-foto");

// Código de seguridad que el servidor exige en cada acción
const TOKEN_CSRF = document.querySelector('meta[name="csrf-token"]').content;

// Textos de cada estado de stock
const ETIQUETAS_ESTADO = { ok: "Normal", bajo: "Stock bajo", agotado: "Agotado" };

// Filtros que están activos en este momento
const filtros = {
  busqueda: "",
  categoria: "",
  estado: "todos",
};

// Producto que se va a eliminar (lo elige el botón de la papelera)
let filaAEliminar = null;

// Cada fila guarda sus datos en el atributo data-producto: se leen una sola vez
function todasLasFilas() {
  return document.querySelectorAll(".fila");
}

todasLasFilas().forEach(function (fila) {
  fila.datos = JSON.parse(fila.dataset.producto);
});


// ----------------------------------------------------------------------------
// 2. COMUNICACIÓN CON EL SERVIDOR
// ----------------------------------------------------------------------------

// Envía una acción al servidor y devuelve su respuesta (o lanza un error con el mensaje)
async function enviar(url, cuerpo, esJson) {
  const cabeceras = { "X-CSRF-Token": TOKEN_CSRF };

  if (esJson) {
    cabeceras["Content-Type"] = "application/json";
  }

  const respuesta = await fetch(url, {
    method: "POST",
    headers: cabeceras,
    body: esJson ? JSON.stringify(cuerpo) : cuerpo,
  });

  // Si la sesión venció, se vuelve al login
  if (respuesta.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("La sesión expiró.");
  }

  let datos = {};

  try {
    datos = await respuesta.json();
  } catch (error) {
    // La respuesta no era JSON: se usa el mensaje general de abajo
  }

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.error || "No se pudo completar la acción.");
  }

  return datos;
}

// Reduce la foto antes de subirla (máximo 1200 px) para que pese poco y cargue rápido
function comprimirImagen(archivo, ladoMaximo = 1200, calidad = 0.85) {
  return new Promise(function (resolver, rechazar) {
    const imagen = new Image();
    const direccion = URL.createObjectURL(archivo);

    imagen.onload = function () {
      URL.revokeObjectURL(direccion);

      const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
      const lienzo = document.createElement("canvas");
      lienzo.width = Math.round(imagen.width * escala);
      lienzo.height = Math.round(imagen.height * escala);

      // Fondo blanco, para que las fotos PNG con transparencia no queden negras
      const pincel = lienzo.getContext("2d");
      pincel.fillStyle = "#FFFFFF";
      pincel.fillRect(0, 0, lienzo.width, lienzo.height);
      pincel.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

      lienzo.toBlob(function (resultado) {
        if (resultado) {
          resolver(resultado);
        } else {
          rechazar(new Error("No se pudo preparar la foto."));
        }
      }, "image/jpeg", calidad);
    };

    imagen.onerror = function () {
      rechazar(new Error("No se pudo leer la foto. Prueba con otra imagen."));
    };

    imagen.src = direccion;
  });
}


// ----------------------------------------------------------------------------
// 3. FILTROS Y BÚSQUEDA
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

  todasLasFilas().forEach(function (fila) {
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
// 4. TARJETAS DE RESUMEN (se recalculan al cambiar el stock o eliminar)
// ----------------------------------------------------------------------------

function formatoCop(numero) {
  return numero ? "$ " + numero.toLocaleString("es-CO") : "—";
}

function recalcularResumen() {
  let productos = 0;
  let unidades = 0;
  let alertas = 0;
  let costo = 0;

  todasLasFilas().forEach(function (fila) {
    const p = fila.datos;

    productos += 1;
    unidades += p.stock;
    costo += p.precio_compra * p.stock;

    if (p.estado !== "ok") {
      alertas += 1;
    }
  });

  document.getElementById("kpi-productos").textContent = productos;
  document.getElementById("kpi-unidades").textContent = unidades;
  document.getElementById("kpi-alertas").textContent = alertas;
  document.getElementById("kpi-costo").textContent = formatoCop(costo);

  // La tarjeta se pinta de amarillo solo si hay alertas
  document.getElementById("tarjeta-alertas").classList.toggle("dato-alerta", alertas > 0);
}


// ----------------------------------------------------------------------------
// 5. BOTONES − Y + DEL STOCK
// ----------------------------------------------------------------------------

// Actualiza en pantalla el número, la etiqueta de color y los datos de la fila
function pintarStock(fila, stock, estado) {
  fila.datos.stock = stock;
  fila.datos.estado = estado;
  fila.dataset.estado = estado;
  fila.dataset.producto = JSON.stringify(fila.datos);

  fila.querySelector(".stock-valor").textContent = stock;

  const etiqueta = fila.querySelector(".estado");
  etiqueta.className = "estado estado-" + estado;
  etiqueta.textContent = ETIQUETAS_ESTADO[estado];
}

async function cambiarStock(boton) {
  const fila = boton.closest(".fila");
  const botonesFila = fila.querySelectorAll(".paso");

  // Se bloquean los dos botones mientras responde el servidor
  botonesFila.forEach(function (b) { b.disabled = true; });

  try {
    const cambio = Number(boton.dataset.cambio);
    const resultado = await enviar(
      "/admin/api/productos/" + fila.datos.id + "/stock",
      { cambio: cambio },
      true
    );

    pintarStock(fila, resultado.stock, resultado.estado);
    recalcularResumen();
    aplicarFiltros();
  } catch (error) {
    window.alert(error.message);
  } finally {
    botonesFila.forEach(function (b) { b.disabled = false; });
  }
}


// ----------------------------------------------------------------------------
// 6. FOTO DEL PRODUCTO (vista previa, arrastrar y quitar)
// ----------------------------------------------------------------------------

function mostrarVistaPrevia(direccion) {
  vistaPrevia.src = direccion;
  vistaPrevia.hidden = false;
  textoFoto.hidden = true;
  botonQuitarFoto.hidden = false;
}

function ocultarVistaPrevia() {
  vistaPrevia.removeAttribute("src");
  vistaPrevia.hidden = true;
  textoFoto.hidden = false;
  botonQuitarFoto.hidden = true;
}

// Al elegir un archivo, se muestra enseguida (se sube al guardar)
inputFoto.addEventListener("change", function () {
  const archivo = inputFoto.files[0];

  if (archivo) {
    formulario.elements["quitar_foto"].value = "";
    mostrarVistaPrevia(URL.createObjectURL(archivo));
  }
});

// Botón "Quitar foto": al guardar, el producto se queda sin foto
botonQuitarFoto.addEventListener("click", function () {
  inputFoto.value = "";
  formulario.elements["quitar_foto"].value = "1";
  ocultarVistaPrevia();
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
// 7. VENTANA DE AGREGAR / EDITAR
// ----------------------------------------------------------------------------

function mostrarMensaje(texto) {
  mensajeForm.textContent = texto;
  mensajeForm.hidden = !texto;
}

// Abre la ventana: vacía para agregar, o con los datos de un producto para editar
function abrirVentanaProducto(producto) {
  formulario.reset();
  formulario.elements["quitar_foto"].value = "";
  ocultarVistaPrevia();
  mostrarMensaje("");

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

// Guardar: crea el producto (si no tiene id) o actualiza el que se está editando
formulario.addEventListener("submit", async function (e) {
  e.preventDefault();
  mostrarMensaje("");

  const datos = new FormData(formulario);
  const id = datos.get("id");

  // La foto se reduce antes de enviarla
  datos.delete("foto");

  if (inputFoto.files[0]) {
    try {
      datos.append("foto", await comprimirImagen(inputFoto.files[0]), "foto.jpg");
    } catch (error) {
      mostrarMensaje(error.message);
      return;
    }
  }

  botonGuardar.disabled = true;
  botonGuardar.textContent = "Guardando…";

  try {
    await enviar(id ? "/admin/api/productos/" + id : "/admin/api/productos", datos, false);

    // Se recarga la página para ver la lista actualizada desde la base de datos
    window.location.reload();
  } catch (error) {
    mostrarMensaje(error.message);
    botonGuardar.disabled = false;
    botonGuardar.textContent = "Guardar";
  }
});


// ----------------------------------------------------------------------------
// 8. ACCIONES DE LA TABLA (editar, eliminar y stock)
// ----------------------------------------------------------------------------

cuerpoTabla.addEventListener("click", function (e) {
  // Botones − y +
  const botonPaso = e.target.closest("[data-cambio]");

  if (botonPaso) {
    cambiarStock(botonPaso);
    return;
  }

  // Botones de lápiz y papelera
  const botonAccion = e.target.closest("[data-accion]");

  if (!botonAccion) {
    return;
  }

  const fila = botonAccion.closest(".fila");

  if (botonAccion.dataset.accion === "editar") {
    abrirVentanaProducto(fila.datos);
  }

  if (botonAccion.dataset.accion === "eliminar") {
    filaAEliminar = fila;
    document.getElementById("nombre-eliminar").textContent = fila.datos.nombre;
    document.getElementById("mensaje-eliminar").hidden = true;
    ventanaEliminar.showModal();
  }
});

// Confirmar la eliminación
document.getElementById("confirmar-eliminar").addEventListener("click", async function () {
  const botonConfirmar = this;
  const mensaje = document.getElementById("mensaje-eliminar");

  botonConfirmar.disabled = true;

  try {
    await enviar("/admin/api/productos/" + filaAEliminar.datos.id + "/eliminar", {}, true);

    filaAEliminar.remove();
    filaAEliminar = null;
    ventanaEliminar.close();

    recalcularResumen();
    aplicarFiltros();
  } catch (error) {
    mensaje.textContent = error.message;
    mensaje.hidden = false;
  } finally {
    botonConfirmar.disabled = false;
  }
});


// ----------------------------------------------------------------------------
// 9. CERRAR VENTANAS
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
// 10. INICIO
// ----------------------------------------------------------------------------
aplicarFiltros();
