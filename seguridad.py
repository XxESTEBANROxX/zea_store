# ============================================================================
# SEGURIDAD · Acceso del administrador
# El usuario y la contraseña viven en variables de entorno (.env / Vercel),
# nunca dentro del código.
# ============================================================================
import hmac
import os
import secrets
from functools import wraps

from flask import current_app, jsonify, redirect, request, session, url_for


def acceso_configurado():
    """True solo si existen el usuario, la contraseña y la clave de sesión."""
    return all([
        os.environ.get("ADMIN_USER"),
        os.environ.get("ADMIN_PASSWORD"),
        current_app.secret_key,
    ])


def credenciales_validas(usuario, clave):
    """Compara con tiempo constante, para que no se pueda adivinar letra por letra."""
    if not acceso_configurado():
        return False

    usuario_ok = hmac.compare_digest(usuario.encode(), os.environ["ADMIN_USER"].encode())
    clave_ok = hmac.compare_digest(clave.encode(), os.environ["ADMIN_PASSWORD"].encode())

    return usuario_ok and clave_ok


def admin_requerido(vista):
    """Decorador: si no hay sesión iniciada, manda al login."""
    @wraps(vista)
    def protegida(*args, **kwargs):
        if not session.get("admin"):
            return redirect(url_for("admin.login"))
        return vista(*args, **kwargs)

    return protegida


# ----------------------------------------------------------------------------
# Protección contra envíos falsos (CSRF)
# Cada sesión tiene un código secreto. La página lo manda en cada acción
# (guardar, eliminar...) y el servidor comprueba que coincida.
# ----------------------------------------------------------------------------
def token_csrf():
    """Devuelve el código de la sesión (lo crea la primera vez)."""
    if "csrf" not in session:
        session["csrf"] = secrets.token_hex(16)

    return session["csrf"]


def csrf_valido():
    enviado = request.headers.get("X-CSRF-Token", "")
    esperado = session.get("csrf", "")

    return bool(esperado) and hmac.compare_digest(enviado, esperado)


def api_admin_requerido(vista):
    """Como admin_requerido, pero para acciones que responden JSON."""
    @wraps(vista)
    def protegida(*args, **kwargs):
        if not session.get("admin"):
            return jsonify(ok=False, error="La sesión expiró. Vuelve a iniciar sesión."), 401

        if not csrf_valido():
            return jsonify(ok=False, error="Solicitud no válida. Recarga la página."), 403

        return vista(*args, **kwargs)

    return protegida
