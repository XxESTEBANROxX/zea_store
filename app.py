import os
from flask import Flask, render_template
from productos import CATEGORIAS, PRODUCTOS

# public/ guarda las imágenes y archivos estáticos (Vercel los sirve desde su CDN)
app = Flask(__name__, static_folder="public", static_url_path="")


@app.route("/")
def catalogo():
    return render_template(
        "catalogo.html",
        categorias=CATEGORIAS,
        productos=PRODUCTOS,
        # Número de WhatsApp con indicativo, sin + ni espacios. Ej: 573001234567
        wa_number=os.environ.get("WA_NUMBER", "57XXXXXXXXXX"),
    )


if __name__ == "__main__":
    app.run(debug=True)
