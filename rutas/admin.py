# ============================================================================
# RUTAS DEL PANEL DE ADMINISTRACIÓN (todas empiezan por /admin)
# ============================================================================
import time

from flask import (Blueprint, current_app, redirect, render_template,
                   request, session, url_for)

from base_datos import obtener_categorias, obtener_inventario
from seguridad import acceso_configurado, admin_requerido, credenciales_validas


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
