# ZEA STORE

## Estructura
```
app.py                   Controlador: rutas y variables de entorno
productos.py             Datos (luego vendrán de la base de datos)
templates/catalogo.html  Vista HTML (solo estructura)
public/css/catalogo.css  Estilos (comentados por sección)
public/js/catalogo.js    Lógica del navegador (filtros, WhatsApp, tema claro/oscuro)
public/logo.jpg          Logo
public/titulo-catalogo.png  Título del catálogo
```

## Correr en local (VSCode)
```
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py        # http://127.0.0.1:5000
```

## Variables de entorno (Vercel → Settings → Environment Variables)
`WA_NUMBER`, `STORE_ADDRESS`, `STORE_HOURS`
