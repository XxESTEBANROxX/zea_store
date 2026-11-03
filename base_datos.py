# ============================================================================
# BASE DE DATOS · Conexión con Supabase
# Aquí van todas las consultas. Las rutas (carpeta rutas/) solo llaman a
# estas funciones, así el código queda ordenado.
# ============================================================================
import os

from supabase import Client, create_client


# Emoji de respaldo para los productos que todavía no tienen foto
EMOJIS_POR_CATEGORIA = {
    "Celulares": "📱",
    "Fundas": "🛡️",
    "Cargadores": "🔌",
    "Audífonos": "🎧",
    "Cables": "🔗",
    "Protectores": "🪟",
}


# ----------------------------------------------------------------------------
# Conexión (se crea una sola vez y se reutiliza)
# ----------------------------------------------------------------------------
_cliente = None


def obtener_cliente() -> Client:
    global _cliente

    if _cliente is None:
        _cliente = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SECRET_KEY"],
        )

    return _cliente


# ----------------------------------------------------------------------------
# Catálogo público
# ----------------------------------------------------------------------------
def obtener_productos_catalogo():
    """Productos marcados como visibles, con el formato que usa el catálogo."""
    respuesta = (
        obtener_cliente()
        .table("productos")
        .select("nombre, marca, stock, imagenes, categorias(nombre)")
        .eq("visible_catalogo", True)
        .order("nombre")
        .execute()
    )

    productos = []

    for fila in respuesta.data:
        categoria = (fila.get("categorias") or {}).get("nombre", "")
        imagenes = fila.get("imagenes") or []

        productos.append({
            "nombre": fila["nombre"],
            "marca": fila.get("marca") or "",
            "categoria": categoria,
            "emoji": EMOJIS_POR_CATEGORIA.get(categoria, "📦"),
            "imagen": imagenes[0] if imagenes else "",
            "disponible": fila["stock"] > 0,   # Disponible si queda al menos 1
        })

    return productos


# ----------------------------------------------------------------------------
# Panel de administración
# ----------------------------------------------------------------------------
def obtener_categorias():
    """Todas las categorías (para los filtros y el formulario)."""
    respuesta = (
        obtener_cliente()
        .table("categorias")
        .select("id, nombre")
        .order("nombre")
        .execute()
    )

    return respuesta.data


def calcular_estado_stock(stock, stock_minimo):
    """'agotado' si no queda nada, 'bajo' si llegó al mínimo, 'ok' en otro caso."""
    if stock <= 0:
        return "agotado"

    if stock <= stock_minimo:
        return "bajo"

    return "ok"


def obtener_inventario():
    """Todos los productos (visibles u ocultos) con los datos que ve el administrador."""
    respuesta = (
        obtener_cliente()
        .table("productos")
        .select(
            "id, sku, nombre, marca, descripcion, precio_compra, precio_venta, "
            "stock, stock_minimo, imagenes, visible_catalogo, categoria_id, "
            "categorias(nombre)"
        )
        .order("nombre")
        .execute()
    )

    productos = []

    for fila in respuesta.data:
        categoria = (fila.get("categorias") or {}).get("nombre", "")
        imagenes = fila.get("imagenes") or []
        compra = fila["precio_compra"]
        venta = fila["precio_venta"]

        productos.append({
            "id": fila["id"],
            "sku": fila["sku"],
            "nombre": fila["nombre"],
            "marca": fila.get("marca") or "",
            "descripcion": fila.get("descripcion") or "",
            "categoria": categoria,
            "categoria_id": fila.get("categoria_id") or "",
            "emoji": EMOJIS_POR_CATEGORIA.get(categoria, "📦"),
            "imagen": imagenes[0] if imagenes else "",
            "precio_compra": compra,
            "precio_venta": venta,
            "ganancia": (venta - compra) if (compra and venta) else None,
            "stock": fila["stock"],
            "stock_minimo": fila["stock_minimo"],
            "estado": calcular_estado_stock(fila["stock"], fila["stock_minimo"]),
            "visible": fila["visible_catalogo"],
        })

    return productos
