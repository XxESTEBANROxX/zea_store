import os
from flask import Flask, render_template
from productos import CATEGORIAS, PRODUCTOS

# CONTROLADOR: define las rutas y entrega los datos a las vistas (templates/).
# public/ guarda CSS, JS e imágenes (Vercel los sirve desde su CDN)
app = Flask(__name__, static_folder="public", static_url_path="")


@app.route("/")
def catalogo():
    return render_template(
        "catalogo.html",
        categorias=CATEGORIAS,
        productos=PRODUCTOS,
        # Número de WhatsApp con indicativo, sin + ni espacios. Ej: 573001234567
        wa_number=os.environ.get("WA_NUMBER", "57XXXXXXXXXX"),
        direccion=os.environ.get("STORE_ADDRESS", ""),
        horario=os.environ.get("STORE_HOURS", ""),
    )


if __name__ == "__main__":
    app.run(debug=True)
