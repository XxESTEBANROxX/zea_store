# ============================================================================
# RUTAS DEL PANEL DE ADMINISTRACIÓN (todas empiezan por /admin)
# ============================================================================
import time
import uuid

from flask import (Blueprint, current_app, jsonify, redirect, render_template,
                   request, session, url_for)

from base_datos import (actualizar_producto, ajustar_stock, borrar_imagen,
                        crear_producto, eliminar_producto, obtener_categorias,
                        obtener_inventario, obtener_producto, subir_imagen)
from seguridad import (acceso_configurado, admin_requerido,
                       api_admin_requerido, credenciales_validas)


admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


# ----------------------------------------------------------------------------
# Todas las páginas del panel: sin caché y fuera de Google
# ----------------------------------------------------------------------------
@admin_bp.after_request
def proteger_respuesta(respuesta):
    respuesta.headers["Cache-Control"] = "no-store"
    respuesta.headers["X-Robots-Tag"] = "noindex, nofollow"
    return respuesta


@admin_bp.route("/")
def inicio():
    return redirect(url_for("admin.inventario"))


# ----------------------------------------------------------------------------
# Login y cierre de sesión
# ----------------------------------------------------------------------------
@admin_bp.route("/login", methods=["GET", "POST"])
def login():
    if session.get("admin"):
        return redirect(url_for("admin.inventario"))

    error = ""

    if request.method == "POST":
        usuario = request.form.get("usuario", "").strip()
        clave = request.form.get("clave", "")

        if not acceso_configurado():
            error = "El acceso todavía no está configurado en el servidor."

        elif credenciales_validas(usuario, clave):
            session.clear()
            session["admin"] = True
            session.permanent = True      # dura el tiempo definido en app.py
            return redirect(url_for("admin.inventario"))

        else:
            time.sleep(1)                 # frena a quien prueba contraseñas sin parar
            error = "Usuario o contraseña incorrectos."

    return render_template("admin/login.html", error=error)


@admin_bp.route("/salir", methods=["POST"])
def salir():
    session.clear()
    return redirect(url_for("admin.login"))


# ----------------------------------------------------------------------------
# Inventario
# ----------------------------------------------------------------------------
def calcular_resumen(productos):
    """Números de las tarjetas de arriba."""
    return {
        "referencias": len(productos),
        "unidades": sum(p["stock"] for p in productos),
        "bajos": sum(1 for p in productos if p["estado"] == "bajo"),
        "agotados": sum(1 for p in productos if p["estado"] == "agotado"),
        "costo": sum(p["precio_compra"] * p["stock"] for p in productos),
    }


@admin_bp.route("/inventario")
@admin_requerido
def inventario():
    error_bd = False

    try:
        productos = obtener_inventario()
        categorias = obtener_categorias()
    except Exception:
        current_app.logger.exception("No se pudo leer el inventario")
        productos, categorias, error_bd = [], [], True

    return render_template(
        "admin/inventario.html",
        productos=productos,
        categorias=categorias,
        resumen=calcular_resumen(productos),
        error_bd=error_bd,
    )


# ============================================================================
# ACCIONES DEL INVENTARIO (las llama el JavaScript y responden JSON)
# ============================================================================

# ----------------------------------------------------------------------------
# Validación de lo que llega del formulario
# ----------------------------------------------------------------------------
def leer_entero(texto, nombre_campo, maximo=2_000_000_000):
    """Convierte a número entero entre 0 y un máximo. Devuelve (numero, error)."""
    try:
        numero = int(str(texto or "0").strip() or "0")
    except ValueError:
        return None, f"{nombre_campo} debe ser un número entero."

    if numero < 0 or numero > maximo:
        return None, f"{nombre_campo} no es un valor válido."

    return numero, None


def leer_datos_producto(form):
    """Limpia y revisa los campos. Devuelve (datos, mensaje_de_error)."""
    nombre = form.get("nombre", "").strip()
    sku = form.get("sku", "").strip().upper()

    if not nombre:
        return None, "El nombre es obligatorio."

    if not sku:
        return None, "El SKU es obligatorio."

    if len(nombre) > 150 or len(sku) > 60:
        return None, "El nombre o el SKU son demasiado largos."

    categoria_id = form.get("categoria_id", "").strip()

    if categoria_id:
        try:
            categoria_id = str(uuid.UUID(categoria_id))
        except ValueError:
            return None, "La categoría no es válida."
    else:
        categoria_id = None

    campos_numericos = {}

    for campo, titulo in [
        ("precio_compra", "El precio de compra"),
        ("precio_venta", "El precio de venta"),
        ("stock", "El stock"),
        ("stock_minimo", "El stock mínimo"),
    ]:
        valor, error = leer_entero(form.get(campo), titulo)

        if error:
            return None, error

        campos_numericos[campo] = valor

    datos = {
        "nombre": nombre,
        "sku": sku,
        "marca": form.get("marca", "").strip()[:80] or None,
        "descripcion": form.get("descripcion", "").strip()[:2000] or None,
        "categoria_id": categoria_id,
        "visible_catalogo": form.get("visible_catalogo") == "on",
        **campos_numericos,
    }

    return datos, None


def leer_foto():
    """Revisa la foto enviada. Devuelve ((bytes, tipo, extensión), error) o (None, None) si no hay."""
    archivo = request.files.get("foto")

    if not archivo or not archivo.filename:
        return None, None

    contenido = archivo.read()

    if len(contenido) > 2 * 1024 * 1024:
        return None, "La foto es demasiado grande (máximo 2 MB)."

    # Se identifica el formato por el contenido real, no por el nombre del archivo
    if contenido.startswith(b"\xff\xd8\xff"):
        return (contenido, "image/jpeg", "jpg"), None

    if contenido.startswith(b"\x89PNG\r\n\x1a\n"):
        return (contenido, "image/png", "png"), None

    if contenido[:4] == b"RIFF" and contenido[8:12] == b"WEBP":
        return (contenido, "image/webp", "webp"), None

    return None, "La foto debe ser JPG, PNG o WEBP."


def respuesta_de_error(error):
    """Traduce un fallo de la base de datos a un mensaje claro."""
    if getattr(error, "code", None) == "23505" or "duplicate key" in str(error):
        return jsonify(ok=False, error="Ya existe un producto con ese SKU."), 409

    current_app.logger.exception("Falló una acción del inventario")
    return jsonify(ok=False, error="No se pudo guardar. Intenta de nuevo."), 500


# ----------------------------------------------------------------------------
# Crear
# ----------------------------------------------------------------------------
@admin_bp.route("/api/productos", methods=["POST"])
@api_admin_requerido
def api_crear_producto():
    datos, error = leer_datos_producto(request.form)

    if error:
        return jsonify(ok=False, error=error), 400

    foto, error = leer_foto()

    if error:
        return jsonify(ok=False, error=error), 400

    direccion_foto = None

    try:
        if foto:
            direccion_foto = subir_imagen(*foto)
            datos["imagenes"] = [direccion_foto]

        producto = crear_producto(datos)

    except Exception as fallo:
        borrar_imagen(direccion_foto)        # no dejar fotos sueltas en Storage
        return respuesta_de_error(fallo)

    return jsonify(ok=True, id=producto["id"])


# ----------------------------------------------------------------------------
# Editar
# ----------------------------------------------------------------------------
@admin_bp.route("/api/productos/<uuid:producto_id>", methods=["POST"])
@api_admin_requerido
def api_editar_producto(producto_id):
    actual = obtener_producto(producto_id)

    if actual is None:
        return jsonify(ok=False, error="El producto ya no existe."), 404

    datos, error = leer_datos_producto(request.form)

    if error:
        return jsonify(ok=False, error=error), 400

    foto, error = leer_foto()

    if error:
        return jsonify(ok=False, error=error), 400

    fotos_anteriores = actual.get("imagenes") or []
    direccion_nueva = None

    try:
        if foto:
            direccion_nueva = subir_imagen(*foto)
            datos["imagenes"] = [direccion_nueva]

        elif request.form.get("quitar_foto") == "1":
            datos["imagenes"] = []

        actualizar_producto(producto_id, datos)

    except Exception as fallo:
        borrar_imagen(direccion_nueva)
        return respuesta_de_error(fallo)

    # Si la foto cambió o se quitó, la anterior ya no sirve
    if "imagenes" in datos:
        for direccion in fotos_anteriores:
            borrar_imagen(direccion)

    return jsonify(ok=True)


# ----------------------------------------------------------------------------
# Eliminar
# ----------------------------------------------------------------------------
@admin_bp.route("/api/productos/<uuid:producto_id>/eliminar", methods=["POST"])
@api_admin_requerido
def api_eliminar_producto(producto_id):
    actual = obtener_producto(producto_id)

    if actual is None:
        return jsonify(ok=True)              # ya no existe: el resultado es el mismo

    try:
        eliminar_producto(producto_id)
    except Exception as fallo:
        return respuesta_de_error(fallo)

    for direccion in actual.get("imagenes") or []:
        borrar_imagen(direccion)

    return jsonify(ok=True)


# ----------------------------------------------------------------------------
# Botones − y + del stock
# ----------------------------------------------------------------------------
@admin_bp.route("/api/productos/<uuid:producto_id>/stock", methods=["POST"])
@api_admin_requerido
def api_ajustar_stock(producto_id):
    cambio = (request.get_json(silent=True) or {}).get("cambio")

    if cambio not in (1, -1):
        return jsonify(ok=False, error="Cambio de stock no válido."), 400

    try:
        resultado = ajustar_stock(producto_id, cambio)
    except Exception as fallo:
        return respuesta_de_error(fallo)

    if resultado is None:
        return jsonify(ok=False, error="El producto ya no existe."), 404

    return jsonify(ok=True, **resultado)
