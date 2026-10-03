"""
Pruebas de aceptación agrupadas por sprint, según el Product Backlog Base
(Tabla 20) del informe de tesis:

    Sprint 1 - HU001, HU002, HU004, HU005, HU007, HU008 (MVP)
    Sprint 2 - HU003, HU006, HU013 (mejora del procesamiento y validación inicial)
    Sprint 3 - HU009, HU010, HU014 (monitoreo y trazabilidad operativa)
    Sprint 4 - HU011, HU012, HU015, HU016 (reportes y mejora continua)

Cada test corresponde a UN sprint y verifica, en un solo caso, las historias
de usuario que ese sprint entregó y que están implementadas en el backend.
Pensado como evidencia de trazabilidad Sprint -> HU -> código para el informe.

Nota: HU012 (exportar resultados) y HU016 (actualizar el modelo con nuevas
imágenes) están en el Sprint 4 del backlog pero AÚN NO están implementadas en
el backend, por lo que el test de Sprint 4 no las cubre.
"""

from unittest.mock import MagicMock

from fastapi.testclient import TestClient

import main
from helpers import FakeBoxes, FakeYoloModel, jpeg_bytes

client = TestClient(main.app)


def _mock_db(monkeypatch, fetchone_side_effect, fetchall_return=None):
    fake_cursor = MagicMock()
    fake_cursor.fetchone.side_effect = fetchone_side_effect
    fake_cursor.fetchall.return_value = fetchall_return or []
    fake_conn = MagicMock()
    fake_conn.cursor.return_value = fake_cursor
    monkeypatch.setattr(main, "get_db", lambda: fake_conn)
    return fake_cursor


def test_sprint_1_mvp_registra_lote_y_clasifica_con_confianza(monkeypatch):
    """Sprint 1 (HU001/HU002/HU004/HU005/HU007/HU008): se registra un lote, se clasifica una imagen con su % de confianza, y una detección poco confiable puede reprocesarse en vez de forzar una categoría."""
    # HU001/HU002: registrar el lote y que quede disponible para capturar la imagen
    fake_cursor = MagicMock()
    fake_cursor.fetchone.return_value = {"id": 1}
    fake_cursor.fetchall.return_value = [{
        "id": 1, "lote_id": "L-2026-099", "fundo": "La Esperanza",
        "variedad": "Timpson", "campana": "2026", "fecha": "2026-09-01",
        "perfil": "operario", "created_at": "2026-09-01T00:00:00",
    }]
    fake_conn = MagicMock()
    fake_conn.cursor.return_value = fake_cursor
    monkeypatch.setattr(main, "get_db", lambda: fake_conn)

    resp_crear = client.post("/lotes", json={
        "lote_id": "L-2026-099", "fundo": "La Esperanza", "variedad": "Timpson",
        "campana": "2026", "fecha": "2026-09-01", "perfil": "operario",
    })
    assert resp_crear.status_code == 201
    assert any(l["lote_id"] == "L-2026-099" for l in client.get("/lotes").json())

    # HU005/HU007: procesar la imagen con el modelo y mostrar el % de confianza
    monkeypatch.setattr(main, "YOLO_AVAILABLE", False)  # fallback determinístico, sin best.pt
    resp_predict = client.post("/predict", files={"file": ("uva.jpg", jpeg_bytes(), "image/jpeg")})
    assert resp_predict.status_code == 200
    resultado = resp_predict.json()["resultado"]
    assert resultado["categoria_key"] in {"cat1", "cat2"}
    assert resultado["confianza_pct"].endswith("%")

    # HU008: reprocesar cuando la detección no es confiable (no se fuerza CAT1/CAT2)
    monkeypatch.setattr(main, "YOLO_AVAILABLE", True)
    monkeypatch.setattr(main, "yolo_model", FakeYoloModel(FakeBoxes(conf=[0.3], cls=[0], xyxy=[[0, 0, 10, 10]])))
    reintento = main.clasificar_imagen(jpeg_bytes())
    assert reintento["indeterminado"] is True


def test_sprint_2_valida_imagenes_y_el_supervisor_contrasta_con_datos_reales(monkeypatch):
    """Sprint 2 (HU003/HU006/HU013): se rechaza una imagen con formato inválido, la categoría asignada queda visible, y el supervisor puede comparar una clasificación del operario con una evaluación real."""
    # HU003: validar formato/calidad de la imagen antes de clasificar
    resp_formato_invalido = client.post(
        "/predict", files={"file": ("documento.pdf", b"contenido", "application/pdf")},
    )
    assert resp_formato_invalido.status_code == 400

    # HU006: la categoría asignada (CAT1/CAT2) queda visible en el resultado
    monkeypatch.setattr(main, "YOLO_AVAILABLE", False)
    resultado = main.clasificar_imagen(jpeg_bytes(color=(220, 40, 40)))
    assert resultado["categoria"] in {"CAT 1", "CAT 2"}

    # HU013: el supervisor compara una clasificación concreta del operario contra una evaluación real
    fake_cursor = MagicMock()
    fake_cursor.fetchone.side_effect = [
        {"categoria": "Categoría 1", "confianza": 0.94, "lote_id": "L-2026-001"},  # lookup de la clasificación
        None,                                                                      # no hay validación previa
        {"id": 50},                                                                # INSERT ... RETURNING id
    ]
    fake_conn = MagicMock()
    fake_conn.cursor.return_value = fake_cursor
    monkeypatch.setattr(main, "get_db", lambda: fake_conn)

    resp_feedback = client.post("/validaciones/feedback", json={
        "clasificacion_id": 7,
        "es_correcta": False,
        "observacion": "El racimo real era Categoría 2",
    })
    assert resp_feedback.status_code == 201


def test_sprint_3_dashboard_filtros_y_precision_preliminar(monkeypatch):
    """Sprint 3 (HU009/HU010/HU014): dashboard de resultados, consulta filtrada por estado de comparación, y precisión preliminar calculada solo sobre comparaciones válidas."""
    # HU009: visualizar resultados de clasificación (distribución CAT1/CAT2)
    _mock_db(monkeypatch, fetchone_side_effect=[{"total": 5}, {"cat1": 4}])
    resp_resultados = client.get("/clasificaciones/stats")
    assert resp_resultados.status_code == 200
    assert resp_resultados.json()["cat1_pct"] == 80.0

    # HU010: consultar clasificaciones filtrando por estado de comparación (pendientes)
    fake_cursor = MagicMock()
    fake_cursor.fetchall.return_value = [{
        "id": 1, "lote_id": "L-2026-001", "variedad": "Timpson", "categoria": "Categoría 1",
        "confianza": 0.97, "imagen_url": "", "fecha_inspeccion": "2026-09-20",
        "created_at": "2026-09-20T00:00:00", "validacion_id": None, "es_correcta": None, "observacion": None,
    }]
    fake_conn = MagicMock()
    fake_conn.cursor.return_value = fake_cursor
    monkeypatch.setattr(main, "get_db", lambda: fake_conn)
    resp_revision = client.get("/clasificaciones/revision?estado=pendiente&lote_id=L-2026-001")
    assert resp_revision.status_code == 200
    fila = resp_revision.json()[0]
    assert fila["lote_id"] == "L-2026-001"
    assert fila["estado"] == "pendiente"

    # HU014: precisión preliminar sobre las comparaciones válidas (excluye pendientes)
    _mock_db(monkeypatch, fetchone_side_effect=[
        {"total": 20},
        {"validas": 20, "coincidencias": 16, "discrepancias": 4},
    ])
    stats = main.stats_validaciones()
    assert stats["precision_preliminar_pct"] == 80.0
    assert stats["tasa_discrepancias_pct"] == 20.0


def test_sprint_4_dashboard_de_metricas_y_observaciones_de_inspeccion(monkeypatch):
    """Sprint 4 (HU011/HU015): el dashboard de métricas expone la precisión del modelo para la toma de decisiones, y el supervisor puede registrar una observación junto con su validación."""
    # HU011: dashboard de métricas de clasificación (precisión preliminar)
    _mock_db(monkeypatch, fetchone_side_effect=[
        {"total": 10},
        {"validas": 10, "coincidencias": 6, "discrepancias": 4},
    ])
    resp_metricas = client.get("/validaciones/stats")
    assert resp_metricas.status_code == 200
    assert resp_metricas.json()["precision_preliminar_pct"] == 60.0

    # HU015: registrar una observación adicional junto con la validación
    fake_cursor = MagicMock()
    fake_cursor.fetchone.side_effect = [
        {"categoria": "Categoría 2", "confianza": 0.81, "lote_id": "L-2026-002"},
        None,
        {"id": 51},
    ]
    fake_conn = MagicMock()
    fake_conn.cursor.return_value = fake_cursor
    monkeypatch.setattr(main, "get_db", lambda: fake_conn)

    resp_feedback = client.post("/validaciones/feedback", json={
        "clasificacion_id": 9,
        "es_correcta": True,
        "observacion": "Racimo con leve deshidratación en el pedicelo",
    })
    assert resp_feedback.status_code == 201
    insert_sql = fake_cursor.execute.call_args_list[-1][0][0]
    assert "observacion" in insert_sql

    # HU012 (exportar resultados) y HU016 (actualizar el modelo) son parte del
    # Sprint 4 en el backlog pero todavía no están implementadas: no se prueban aquí.
