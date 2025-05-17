# test2.py

import requests
import time
import os

BASE_URL = "http://localhost:5000/api"

def main():
    try:
        # 1) Verificar métricas del dashboard
        print("1) Verificando métricas del dashboard...")
        metrics = requests.get(f"{BASE_URL}/dashboard/metrics").json()
        print("   ✅ Métricas:", metrics)

        # 2) Crear un startup de prueba
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

        # 3) Recuperar el startup por ID
        print("\n3) Recuperando el startup por ID...")
        r = requests.get(f"{BASE_URL}/startups/{startup['id']}")
        r.raise_for_status()
        print("   ✅ Startup recuperado:", r.json())

        # 4) Subir PDF de prueba y procesarlo
        print("\n4) Subiendo PDF de prueba y procesándolo...")
        pdf_path = "docprueba1.pdf"
        with open(pdf_path, "rb") as f:
            files = {
                "file": (os.path.basename(pdf_path), f, "application/pdf")
            }
            data = {
                "startupId": startup["id"],
                "type": "pitch-deck",
                "name": "Documento Prueba PDF"
            }
            r = requests.post(f"{BASE_URL}/documents/upload", files=files, data=data)
        r.raise_for_status()
        document = r.json()
        print("   ✅ Documento subido:", document)

        # Verificar que la respuesta incluya el mensaje de inicio de procesamiento
        assert "message" in document and "procesamiento iniciará en breve" in document["message"].lower()

        # 5) Verificar lista de documentos y metadata
        print("\n5) Verificando lista de documentos y metadata...")
        r = requests.get(f"{BASE_URL}/startups/{startup['id']}/documents")
        r.raise_for_status()
        docs = r.json()
        print("   ✅ Documentos:", docs)
        assert any(doc["id"] == document["id"] for doc in docs)
        doc_meta = next(doc for doc in docs if doc["id"] == document["id"])["metadata"]
        assert doc_meta.get("originalName") == os.path.basename(pdf_path)
        assert doc_meta.get("size") == os.path.getsize(pdf_path)

        # Esperar procesamiento de chunks
        print("   ⚙️ Esperando 5 segundos para procesamiento de chunks...")
        time.sleep(5)

        # 6) Ejecutar consulta semántica de prueba
        print("\n6) Ejecutando consulta semántica de prueba...")
        ai_payload = {
            "startupId": startup["id"],
            "question": "¿Qué información relevante hay en el documento?",
            "includeSourceDocuments": True
        }
        r = requests.post(f"{BASE_URL}/ai/query", json=ai_payload)
        r.raise_for_status()
        ai_response = r.json()
        print("   ✅ Respuesta AI:", ai_response)
        assert "answer" in ai_response
        assert isinstance(ai_response.get("sources"), list)

        print("\n🎉 Todas las pruebas pasaron correctamente.")

    except requests.HTTPError as http_err:
        print(f"❌ Error HTTP: {http_err.response.status_code} - {http_err.response.text}")
        exit(1)
    except AssertionError as assert_err:
        print("❌ Aserción fallida:", assert_err)
        exit(1)
    except Exception as err:
        print("❌ Error inesperado:", err)
        exit(1)

if __name__ == "__main__":
    main()
