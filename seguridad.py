# ============================================================================
# SEGURIDAD · Acceso del administrador
# El usuario y la contraseña viven en variables de entorno (.env / Vercel),
# nunca dentro del código.
# ============================================================================
import hmac
import os
from functools import wraps

from flask import current_app, redirect, session, url_for


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
