"""
Sprint 3 del Product Backlog Base (Tabla 20) del informe de tesis:
HU009, HU010, HU014.

Un test por historia de usuario (o por sub-comportamiento relevante de esa
historia), como evidencia de trazabilidad Sprint -> HU -> código.
"""

from fastapi.testclient import TestClient

import main
from helpers import mock_db_sequence

client = TestClient(main.app)


def test_hu009_el_dashboard_muestra_la_distribucion_por_categoria_y_por_defecto(monkeypatch):
    """HU009: el dashboard de resultados muestra tanto la distribución CAT1/CAT2 como el conteo de defectos asociados."""
    mock_db_sequence(monkeypatch, main, fetchone_side_effect=[{"total": 5}, {"cat1": 4}])

    resp = client.get("/clasificaciones/stats")

    assert resp.status_code == 200
    body = resp.json()
    assert body["cat1"] == 4 and body["cat2"] == 1
    assert body["cat1_pct"] == 80.0
    assert {d["nombre"] for d in body["defectos"]} == {"Mancha leve", "Variación de color", "Rastro severo"}


def test_hu009_el_dashboard_sin_clasificaciones_no_falla_por_division_entre_cero(monkeypatch):
    """HU009: con cero clasificaciones registradas, el dashboard responde con 0% en vez de lanzar un error."""
    mock_db_sequence(monkeypatch, main, fetchone_side_effect=[{"total": 0}, {"cat1": 0}])

    resp = client.get("/clasificaciones/stats")

    assert resp.status_code == 200
    body = resp.json()
    assert body["cat1_pct"] == 0 and body["cat2_pct"] == 0


def test_hu010_permite_consultar_solo_las_clasificaciones_pendientes_de_un_lote(monkeypatch):
    """HU010: el supervisor puede filtrar el historial por lote y quedarse solo con lo que aún no ha revisado."""
    fake_cursor = mock_db_sequence(monkeypatch, main, fetchall_return=[{
        "id": 1, "lote_id": "L-2026-001", "variedad": "Timpson", "categoria": "Categoría 1",
        "confianza": 0.97, "imagen_url": "", "fecha_inspeccion": "2026-09-20",
        "created_at": "2026-09-20T00:00:00", "validacion_id": None, "es_correcta": None, "observacion": None,
    }])

    resp = client.get("/clasificaciones/revision?estado=pendiente&lote_id=L-2026-001")

    assert resp.status_code == 200
    fila = resp.json()[0]
    assert fila["lote_id"] == "L-2026-001"
    assert fila["estado"] == "pendiente"
    where_sql = fake_cursor.execute.call_args_list[-1][0][0]
    assert "v.id IS NULL" in where_sql and "c.lote_id = %s" in where_sql


def test_hu010_distingue_coincidencia_de_discrepancia_segun_el_veredicto_del_supervisor(monkeypatch):
    """HU010: una vez validada, cada clasificación queda marcada como coincidencia o discrepancia según lo que decidió el supervisor."""
    mock_db_sequence(monkeypatch, main, fetchall_return=[
        {"id": 1, "lote_id": "L-2026-001", "variedad": "Timpson", "categoria": "Categoría 1",
         "confianza": 0.97, "imagen_url": "", "fecha_inspeccion": "2026-09-20",
         "created_at": "2026-09-20T00:00:00", "validacion_id": 10, "es_correcta": True, "observacion": "OK"},
        {"id": 2, "lote_id": "L-2026-001", "variedad": "Timpson", "categoria": "Categoría 2",
         "confianza": 0.80, "imagen_url": "", "fecha_inspeccion": "2026-09-21",
         "created_at": "2026-09-21T00:00:00", "validacion_id": 11, "es_correcta": False, "observacion": "No coincide"},
    ])

    resp = client.get("/clasificaciones/revision?estado=todas")

    assert resp.status_code == 200
    filas = resp.json()
    assert filas[0]["estado"] == "coincidencia"
    assert filas[1]["estado"] == "discrepancia"


def test_hu010_filtra_el_historial_por_rango_de_fechas_de_inspeccion(monkeypatch):
    """HU010: el historial de inspecciones puede acotarse a un rango de fechas."""
    fake_cursor = mock_db_sequence(monkeypatch, main, fetchall_return=[])

    resp = client.get("/clasificaciones/revision?fecha_desde=2026-10-01&fecha_hasta=2026-10-03")

    assert resp.status_code == 200
    where_sql = fake_cursor.execute.call_args_list[-1][0][0]
    assert "c.fecha_inspeccion >= %s" in where_sql and "c.fecha_inspeccion <= %s" in where_sql


def test_hu014_calcula_la_precision_preliminar_solo_sobre_comparaciones_validas(monkeypatch):
    """HU014: la precisión preliminar se calcula sobre comparaciones válidas (coincidencia o discrepancia), excluyendo las pendientes."""
    mock_db_sequence(monkeypatch, main, fetchone_side_effect=[
        {"total": 20},
        {"validas": 20, "coincidencias": 16, "discrepancias": 4},
    ])

    stats = main.stats_validaciones()

    assert stats["pendientes"] == 0
    assert stats["precision_preliminar_pct"] == 80.0
    assert stats["tasa_discrepancias_pct"] == 20.0


def test_hu014_sin_comparaciones_validas_reporta_ausencia_de_datos_en_vez_de_un_porcentaje(monkeypatch):
    """HU014: si todavía no hay ninguna comparación válida, se reporta "sin datos" en lugar de un falso 0%."""
    mock_db_sequence(monkeypatch, main, fetchone_side_effect=[
        {"total": 5},
        {"validas": 0, "coincidencias": 0, "discrepancias": 0},
    ])

    stats = main.stats_validaciones()

    assert stats["tiene_datos"] is False
    assert stats["precision_preliminar_pct"] is None
    assert stats["pendientes"] == 5
