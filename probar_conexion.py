# Archivo temporal para diagnosticar la conexión. Bórralo al terminar.
import os

from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL", "")
key = os.environ.get("SUPABASE_SECRET_KEY", "")

print("URL:", url)
print("La clave empieza con:", key[:10])
print("Largo de la clave:", len(key))
print("Tiene espacios o comillas:", key != key.strip() or '"' in key or "'" in key)


# ----------------------------------------------------------------------------
# Prueba directa contra Supabase (sin Flask ni la librería de Supabase)
# ----------------------------------------------------------------------------
import httpx

print("Termina en:", key[-3:])

respuesta = httpx.get(
    url + "/rest/v1/productos?select=nombre&limit=1",
    headers={"apikey": key},
)

print("Código de respuesta:", respuesta.status_code)
print("Respuesta:", respuesta.text[:150])