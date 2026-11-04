# ============================================================================
# BASE DE DATOS · Conexión con Supabase
# Aquí van todas las consultas. Las rutas (carpeta rutas/) solo llaman a
# estas funciones, así el código queda ordenado.
# ============================================================================
import os
import uuid

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


# ----------------------------------------------------------------------------
# Panel: crear, editar, eliminar y ajustar el stock
# ----------------------------------------------------------------------------
def obtener_producto(producto_id):
    """Un producto por su id (o None si no existe)."""
    respuesta = (
        obtener_cliente()
        .table("productos")
        .select("*")
        .eq("id", str(producto_id))
        .limit(1)
        .execute()
    )

    return respuesta.data[0] if respuesta.data else None


def crear_producto(datos):
    respuesta = obtener_cliente().table("productos").insert(datos).execute()
    return respuesta.data[0]


def actualizar_producto(producto_id, datos):
    obtener_cliente().table("productos").update(datos).eq("id", str(producto_id)).execute()


def eliminar_producto(producto_id):
    obtener_cliente().table("productos").delete().eq("id", str(producto_id)).execute()


def ajustar_stock(producto_id, cambio):
    """Suma o resta unidades (nunca baja de 0). Devuelve el stock nuevo y su estado."""
    producto = obtener_producto(producto_id)

    if producto is None:
        return None

    nuevo = max(0, producto["stock"] + cambio)

    actualizar_producto(producto_id, {"stock": nuevo})

    return {
        "stock": nuevo,
        "estado": calcular_estado_stock(nuevo, producto["stock_minimo"]),
    }


# ----------------------------------------------------------------------------
# Fotos (Supabase Storage, carpeta "productos")
# ----------------------------------------------------------------------------
CARPETA_FOTOS = "productos"


def subir_imagen(contenido, tipo_mime, extension):
    """Sube la foto con un nombre único y devuelve su dirección pública."""
    carpeta = obtener_cliente().storage.from_(CARPETA_FOTOS)
    nombre = f"{uuid.uuid4().hex}.{extension}"

    try:
        carpeta.upload(nombre, contenido, {"content-type": tipo_mime})
    except Exception:
        # Algunas versiones de la librería escriben esta opción con guion bajo
        carpeta.upload(nombre, contenido, {"content_type": tipo_mime})

    return carpeta.get_public_url(nombre).rstrip("?")


def borrar_imagen(direccion):
    """Borra una foto a partir de su dirección pública. Si falla, no detiene nada."""
    marca = f"/{CARPETA_FOTOS}/"

    if not direccion or marca not in direccion:
        return

    nombre = direccion.split("?")[0].split(marca, 1)[1]

    try:
        obtener_cliente().storage.from_(CARPETA_FOTOS).remove([nombre])
    except Exception:
        pass
