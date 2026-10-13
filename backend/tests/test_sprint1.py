"""
Sprint 1 (MVP) del Product Backlog Base (Tabla 20) del informe de tesis:
HU001, HU002, HU004, HU005, HU007, HU008.

Un test por historia de usuario (o por sub-comportamiento relevante de esa
historia), como evidencia de trazabilidad Sprint -> HU -> código.
"""

from fastapi.testclient import TestClient

import main
from helpers import FakeBoxes, FakeGcsClient, FakeYoloModel, jpeg_bytes, mock_db_sequence

client = TestClient(main.app)


def test_hu001_registra_la_informacion_del_lote_y_queda_disponible_para_consulta(monkeypatch):
    """HU001: el operario registra un lote (fundo, variedad, campaña, fecha) y puede verlo luego en el listado."""
    fake_cursor = mock_db_sequence(monkeypatch, main, fetchone_side_effect=[{"id": 1}])
    fake_cursor.fetchall.return_value = [{
        "id": 1, "lote_id": "L-2026-099", "fundo": "La Esperanza",
        "variedad": "Timpson", "campana": "2026", "fecha": "2026-09-01",
        "perfil": "operario", "created_at": "2026-09-01T00:00:00",
    }]

    resp_crear = client.post("/lotes", json={
        "lote_id": "L-2026-099", "fundo": "La Esperanza", "variedad": "Timpson",
        "campana": "2026", "fecha": "2026-09-01", "perfil": "operario",
    })
    assert resp_crear.status_code == 201
    assert resp_crear.json()["lote_id"] == "L-2026-099"

    lotes = client.get("/lotes").json()
    assert any(l["lote_id"] == "L-2026-099" and l["fundo"] == "La Esperanza" for l in lotes)


def test_hu002_captura_una_imagen_de_racimo_en_campo_y_el_sistema_la_recibe(monkeypatch):
    """HU002: el operario captura/sube una foto del racimo en campo y el backend la recibe para procesarla."""
    monkeypatch.setattr(main, "YOLO_AVAILABLE", False)
    monkeypatch.setattr(main, "GCS_AVAILABLE", False)

    resp = client.post("/predict", files={"file": ("racimo_campo.jpg", jpeg_bytes(), "image/jpeg")})

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["archivo"] == "racimo_campo.jpg"


def test_hu004_almacena_la_imagen_en_la_nube_y_su_url_queda_vinculada_a_la_clasificacion(monkeypatch):
    """HU004: la imagen capturada se almacena en Cloud Storage y su URL pública queda guardada junto con la clasificación."""
    fake_gcs = FakeGcsClient()
    monkeypatch.setattr(main, "GCS_AVAILABLE", True)
    monkeypatch.setattr(main, "gcs_client", fake_gcs, raising=False)
    monkeypatch.setattr(main, "GCS_BUCKET", "grapevision-test-bucket")
    monkeypatch.setattr(main, "YOLO_AVAILABLE", False)

    resultado = main.clasificar_imagen(jpeg_bytes(), "image/jpeg")

    # Se subió exactamente un archivo al bucket, con el content-type correcto
    assert len(fake_gcs.bucket_obj.blobs) == 1
    blob_subido = next(iter(fake_gcs.bucket_obj.blobs.values()))
    assert blob_subido.content_type == "image/jpeg"
    assert resultado["imagen_url"].startswith(
        "https://storage.googleapis.com/grapevision-test-bucket/clasificaciones/"
    )

    # La URL de la imagen queda persistida junto con la clasificación
    fake_cursor = mock_db_sequence(monkeypatch, main, fetchone_side_effect=[{"id": 10}])
    resp_guardar = client.post("/clasificaciones", params={
        "lote_id": "L-2026-001", "variedad": "Timpson", "categoria": "Categoría 1",
        "confianza": 0.9, "imagen_url": resultado["imagen_url"],
    })
    assert resp_guardar.status_code == 201
    parametros_insert = fake_cursor.execute.call_args_list[-1][0][1]
    assert resultado["imagen_url"] in parametros_insert


def test_hu005_procesa_la_imagen_con_el_modelo_entrenado_y_le_asigna_una_categoria(monkeypatch):
    """HU005: la imagen se procesa con el modelo YOLOv8 entrenado, que determina la categoría a partir de su propia detección."""
    monkeypatch.setattr(main, "YOLO_AVAILABLE", True)
    monkeypatch.setattr(main, "yolo_model", FakeYoloModel(FakeBoxes(conf=[0.91], cls=[0], xyxy=[[0, 0, 40, 40]])))
    monkeypatch.setattr(main, "GCS_AVAILABLE", False)

    resultado = main.clasificar_imagen(jpeg_bytes())

    assert resultado["categoria_key"] == "cat1"
    assert resultado["variedad"] == "Timpson"


def test_hu007_muestra_el_porcentaje_de_confianza_de_la_clasificacion(monkeypatch):
    """HU007: el resultado mostrado al operario incluye el porcentaje de confianza con el que el modelo clasificó la imagen."""
    monkeypatch.setattr(main, "YOLO_AVAILABLE", True)
    monkeypatch.setattr(main, "yolo_model", FakeYoloModel(FakeBoxes(conf=[0.867], cls=[1], xyxy=[[0, 0, 40, 40]])))
    monkeypatch.setattr(main, "GCS_AVAILABLE", False)

    resultado = main.clasificar_imagen(jpeg_bytes())

    assert resultado["confianza"] == 0.867
    assert resultado["confianza_pct"] == "86.7 %"


def test_hu008_reprocesa_la_imagen_cuando_la_deteccion_no_es_confiable(monkeypatch):
    """HU008: si la confianza de la detección es menor al mínimo aceptado, no se fuerza CAT1/CAT2 — queda indeterminada para reprocesarse."""
    monkeypatch.setattr(main, "YOLO_AVAILABLE", True)
    monkeypatch.setattr(main, "yolo_model", FakeYoloModel(FakeBoxes(conf=[0.3], cls=[0], xyxy=[[0, 0, 10, 10]])))

    resultado = main.clasificar_imagen(jpeg_bytes())

    assert resultado["indeterminado"] is True
    assert resultado["categoria_key"] == "indeterminado"
    assert "mensaje" in resultado
