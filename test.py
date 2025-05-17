# test.py

import requests
import time

BASE_URL = "http://localhost:5000/api"

def main():
    try:
        print("1) Verificando métricas del dashboard...")
        metrics = requests.get(f"{BASE_URL}/dashboard/metrics").json()
        print("   ✅ Métricas:", metrics)

        print("\n2) Creando un startup de prueba...")
        startup_payload = {
            "name": "TestCo",
            "vertical": "saas",
            "stage": "seed",
            "location": "Bogotá",
            "amountSought": 500000,
            "currency": "USD",
            "primaryContact": {"email": "test@testco.com"}
        }
        r = requests.post(f"{BASE_URL}/startups", json=startup_payload)
        r.raise_for_status()
        startup = r.json()
        print("   ✅ Startup creado:", startup)

        print("\n3) Recuperando el startup por ID...")
        r = requests.get(f"{BASE_URL}/startups/{startup['id']}")
        r.raise_for_status()
        print("   ✅ Startup recuperado:", r.json())

        print("\n4) Subiendo documento de prueba y procesándolo...")
        files = {
            "file": ("sample.txt", b"Contenido de prueba para chunk embedding.", "text/plain")
        }
        data = {
            "startupId": startup["id"],
            "type": "pitch-deck",
            "name": "Sample Pitch Deck"
        }
        r = requests.post(f"{BASE_URL}/documents/upload", files=files, data=data)
        r.raise_for_status()
        document = r.json()
        print("   ✅ Documento subido:", document)

        print("\n   ⚙️ Esperando 5 segundos para procesamiento de chunks...")
        time.sleep(5)

        print("\n5) Ejecutando consulta semántica de prueba...")
        ai_payload = {
            "startupId": startup["id"],
            "question": "¿Qué información relevante hay en el documento?",
            "includeSourceDocuments": True
        }
        r = requests.post(f"{BASE_URL}/ai/query", json=ai_payload)
        r.raise_for_status()
        print("   ✅ Respuesta AI:", r.json())

        print("\n🎉 Todas las pruebas pasaron correctamente.")

    except requests.HTTPError as http_err:
        print(f"❌ Error HTTP: {http_err.response.status_code} - {http_err.response.text}")
        exit(1)
    except Exception as err:
        print("❌ Error inesperado:", err)
        exit(1)

if __name__ == "__main__":
    main()
