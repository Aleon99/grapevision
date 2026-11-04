"""
Sprint 4 del Product Backlog refinado (documento de tesis actualizado, feedback
del asesor): HU011, HU012, HU015, HU016.

Todo este sprint depende de autenticación real (login con roles validados en el
backend), ya que HU012 y HU015 exigen rechazar usuarios no autorizados y
vincular cada observación a un autor — algo que no existía hasta este sprint.

Un test por historia de usuario (o por sub-comportamiento relevante de esa
historia), como evidencia de trazabilidad Sprint -> HU -> código.
"""

from fastapi.testclient import TestClient

import main
from helpers import mock_db_sequence

client = TestClient(main.app)


def test_hu011_dashboard_avanzado_filtra_por_campana_lote_y_periodo(monkeypatch):
    """HU011: el dashboard avanzado calcula la precisión preliminar solo sobre los registros que coinciden con los filtros de campaña, lote y periodo."""
    fake_cursor = mock_db_sequence(monkeypatch, main, fetchone_side_effect=[
        {"total": 8},
        {"validas": 8, "coincidencias": 6, "discrepancias": 2},
    ])
    resp = client.get("/validaciones/stats/avanzado?campana=2026&lote_id=L-2026-001&fecha_desde=2026-10-01&fecha_hasta=2026-10-31")
    assert resp.status_code == 200
    body = resp.json()
    assert body["precision_preliminar_pct"] == 75.0
    assert body["filtros"] == {"campana":"2026","lote_id":"L-2026-001","fecha_desde":"2026-10-01","fecha_hasta":"2026-10-31"}
    where_sql = fake_cursor.execute.call_args_list[-1][0][0]
    assert "SELECT lote_id FROM lotes WHERE campana = %s" in where_sql and "c.lote_id = %s" in where_sql


def test_hu011_dashboard_avanzado_sin_comparaciones_no_muestra_porcentaje_enganoso(monkeypatch):
    """HU011: si el filtro no deja ninguna comparación válida, se informa la ausencia de datos en vez de un 0% falso."""
    mock_db_sequence(monkeypatch, main, fetchone_side_effect=[
        {"total": 3},
        {"validas": 0, "coincidencias": 0, "discrepancias": 0},
    ])
    resp = client.get("/validaciones/stats/avanzado?campana=2025")
    assert resp.status_code == 200
    body = resp.json()
    assert body["tiene_datos"] is False
    assert body["precision_preliminar_pct"] is None
    assert body["pendientes"] == 3


def test_hu012_exportar_respeta_los_filtros_activos_y_escapa_celdas_tipo_formula(monkeypatch):
    """HU012: el CSV exportado contiene solo lo filtrado, y una celda que empieza como fórmula queda escapada de forma segura."""
    mock_db_sequence(monkeypatch, main, fetchall_return=[{
        "id": 1, "lote_id": "=cmd|' /C calc'!A0", "campana": "2026", "variedad": "Timpson",
        "categoria": "Categoría 1", "confianza": 0.95, "fecha_inspeccion": "2026-10-05",
        "validacion_id": 10, "es_correcta": True, "created_at": "2026-10-05T00:00:00",
    }])
    resp = client.get("/clasificaciones/exportar?lote_id=L-2026-001&campana=2026")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    cuerpo = resp.text
    assert "'=cmd|' /C calc'!A0" in cuerpo
    assert "coincidencia" in cuerpo


def test_hu012_exportar_sin_resultados_devuelve_solo_encabezados(monkeypatch):
    """HU012: un filtro sin coincidencias igual devuelve un CSV válido, con encabezados y sin filas ajenas."""
    mock_db_sequence(monkeypatch, main, fetchall_return=[])
    resp = client.get("/clasificaciones/exportar?lote_id=L-9999-999")
    assert resp.status_code == 200
    lineas = resp.text.strip().splitlines()
    assert len(lineas) == 1
    assert lineas[0].startswith("id,lote_id,campana")


def test_hu012_un_usuario_sin_rol_supervisor_no_puede_exportar_y_el_intento_queda_registrado(monkeypatch):
    """HU012: un usuario autenticado pero sin rol de supervisor recibe 403 al intentar exportar, y el intento queda registrado."""
    main.app.dependency_overrides[main.get_current_user] = lambda: {"username": "operario1", "rol": "operario"}
    fake_cursor = mock_db_sequence(monkeypatch, main)
    try:
        resp = client.get("/clasificaciones/exportar")
    finally:
        main.app.dependency_overrides.pop(main.get_current_user, None)
    assert resp.status_code == 403
    insert_sql = fake_cursor.execute.call_args_list[-1][0][0]
    assert "intentos_no_autorizados" in insert_sql


def test_hu015_la_observacion_queda_vinculada_al_autor_que_valido(monkeypatch):
    """HU015: al registrar una validación, la observación queda guardada junto con el autor (usuario autenticado), el lote y la fecha."""
    fake_cursor = mock_db_sequence(monkeypatch, main, fetchone_side_effect=[
        {"categoria": "Categoría 1", "confianza": 0.9, "lote_id": "L-2026-001"},
        None,
        {"id": 60},
    ])
    resp = client.post("/validaciones/feedback", json={
        "clasificacion_id": 5, "es_correcta": True, "observacion": "Confirmado en packing",
    })
    assert resp.status_code == 201
    insert_params = fake_cursor.execute.call_args_list[-1][0][1]
    assert "supervisor_test" in insert_params


def test_hu015_una_observacion_demasiado_larga_es_rechazada(monkeypatch):
    """HU015: un texto fuera del límite permitido (500 caracteres) es rechazado por el servicio antes de llegar a la base de datos."""
    resp = client.post("/validaciones/feedback", json={
        "clasificacion_id": 5, "es_correcta": True, "observacion": "x" * 501,
    })
    assert resp.status_code == 422


def test_hu016_una_version_candidata_mejor_que_la_activa_se_marca_como_mejora(monkeypatch):
    """HU016: registrar una versión candidata la contrasta contra la versión activa, sin ejecutar ningún reentrenamiento real."""
    fake_cursor = mock_db_sequence(monkeypatch, main, fetchone_side_effect=[
        {"map50_95_pct": 87.4},
        {"id": 2},
    ])
    resp = client.post("/modelo/versiones", json={
        "nombre_version": "yolov8n-v2-candidata",
        "dataset_manifiesto": "40 imagenes nuevas con discrepancias del Sprint 3",
        "precision_pct": 90.0, "recall_pct": 99.5, "map50_pct": 99.6, "map50_95_pct": 90.0,
        "notas": "Prueba de regresion pendiente",
    })
    assert resp.status_code == 201
    assert resp.json()["veredicto"] == "mejora"
    insert_sql, insert_params = fake_cursor.execute.call_args_list[-1][0]
    assert "'candidato'" in insert_sql
    assert "mejora" in insert_params


def test_hu016_activar_una_version_anterior_funciona_como_mecanismo_de_reversion(monkeypatch):
    """HU016: activar una versión ya registrada restablece esa versión como activa, sin afectar la API de clasificación (es solo metadata)."""
    fake_cursor = mock_db_sequence(monkeypatch, main, fetchone_side_effect=[{"id": 1}])
    resp = client.post("/modelo/versiones/1/activar")
    assert resp.status_code == 200
    ejecuciones = [c[0][0] for c in fake_cursor.execute.call_args_list]
    assert any("estado='anterior'" in sql for sql in ejecuciones)
    assert any("estado='activo'" in sql for sql in ejecuciones)
