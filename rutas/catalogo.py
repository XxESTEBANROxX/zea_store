# ============================================================================
# RUTAS DEL CATÁLOGO PÚBLICO
# ============================================================================
import os

from flask import Blueprint, current_app, render_template

from base_datos import obtener_productos_catalogo


catalogo_bp = Blueprint("catalogo", __name__)


@catalogo_bp.route("/")
def catalogo():
    # Si la base de datos falla, el catálogo carga vacío en vez de romperse
    try:
        productos = obtener_productos_catalogo()
    except Exception:
        current_app.logger.exception("No se pudo leer el catálogo de la base de datos")
        productos = []

    # Solo se muestran las categorías que tienen productos
    categorias = ["Todos"] + sorted({p["categoria"] for p in productos if p["categoria"]})

    return render_template(
        "catalogo.html",
        categorias=categorias,
        productos=productos,

        # Se configuran en Vercel → Settings → Environment Variables
        wa_number=os.environ.get("WA_NUMBER", "57XXXXXXXXXX"),
        direccion=os.environ.get("STORE_ADDRESS", ""),
        horario=os.environ.get("STORE_HOURS", ""),
    )