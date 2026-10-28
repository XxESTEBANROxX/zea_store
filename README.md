# ZEA STORE

Catálogo público (paso 1). Panel de inventario: próximos pasos.

## Correr en local (VSCode)
```
python -m venv .venv
.venv\Scripts\activate        # Windows  (Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
python app.py                 # abre http://127.0.0.1:5000
```

## Número de WhatsApp
Local (Windows PowerShell): `$env:WA_NUMBER="573001234567"; python app.py`
En Vercel: Project → Settings → Environment Variables → `WA_NUMBER`.

## Desplegar en Vercel
Sube el proyecto a GitHub, impórtalo en vercel.com/new y Vercel detecta Flask solo (no necesita vercel.json).
