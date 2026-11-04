# ============================================================================
# ZEA STORE · Arranque de la aplicación
# Solo configura Flask y registra las secciones (carpeta rutas/).
# ============================================================================
import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify

# Lee el archivo .env cuando corres en tu computador (en Vercel se ignora)
load_dotenv()

from rutas.admin import admin_bp
from rutas.catalogo import catalogo_bp
from seguridad import token_csrf


# public/ guarda CSS, JavaScript e imágenes (Vercel los sirve desde su CDN)
app = Flask(__name__, static_folder="public", static_url_path="")


# ----------------------------------------------------------------------------
# Sesión del administrador
# SECRET_KEY firma la cookie de sesión; sin ella no se puede iniciar sesión.
# ----------------------------------------------------------------------------
app.secret_key = os.environ.get("SECRET_KEY", "")

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,                        # JavaScript no puede leer la cookie
    SESSION_COOKIE_SAMESITE="Lax",                       # protege contra envíos desde otros sitios
    SESSION_COOKIE_SECURE=bool(os.environ.get("VERCEL")),  # en Vercel (https) solo viaja cifrada
    PERMANENT_SESSION_LIFETIME=timedelta(hours=8),       # la sesión dura 8 horas
    MAX_CONTENT_LENGTH=3 * 1024 * 1024,                  # ninguna petición puede pasar de 3 MB
)

# Permite escribir {{ csrf_token() }} en las plantillas del panel
app.jinja_env.globals["csrf_token"] = token_csrf


# Si alguien manda algo demasiado grande (por ejemplo una foto sin reducir)
@app.errorhandler(413)
def archivo_muy_grande(error):
    return jsonify(ok=False, error="La foto es demasiado grande (máximo 2 MB)."), 413


# ----------------------------------------------------------------------------
# Formato de precios: 1234567 → "$ 1.234.567" (y "—" si no hay valor)
# ----------------------------------------------------------------------------
@app.template_filter("cop")
def formato_cop(valor):
    if not valor:
        return "—"

    signo = "-" if valor < 0 else ""
    numero = f"{abs(int(valor)):,}".replace(",", ".")

    return f"{signo}$ {numero}"


# ----------------------------------------------------------------------------
# Secciones de la página
# ----------------------------------------------------------------------------
app.register_blueprint(catalogo_bp)
app.register_blueprint(admin_bp)


# Para correr en local: python app.py
if __name__ == "__main__":
    app.run(debug=True)
