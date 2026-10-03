from unittest.mock import MagicMock

import main


def _mock_db(monkeypatch, fetchone_side_effect):
    fake_cursor = MagicMock()
    fake_cursor.fetchone.side_effect = fetchone_side_effect
    fake_conn = MagicMock()
    fake_conn.cursor.return_value = fake_cursor
    monkeypatch.setattr(main, "get_db", lambda: fake_conn)
    return fake_cursor


# ── /clasificaciones/stats (HU009) ──────────────────────────────────────────

def test_stats_clasificaciones_calcula_porcentajes_y_defectos(monkeypatch):
    """El dashboard del operario recibe el total, el % de CAT1/CAT2 y el conteo de defectos (derivado de CAT2)."""
    _mock_db(monkeypatch, fetchone_side_effect=[{"total": 10}, {"cat1": 7}])
    resultado = main.stats_clasificaciones()
    assert resultado["total"] == 10
    assert resultado["cat1_pct"] == 70.0
    assert resultado["cat2_pct"] == 30.0
    assert resultado["defectos"][0]["detectados"] == 3  # cat2 = 10 - 7


def test_stats_clasificaciones_sin_datos_no_divide_entre_cero(monkeypatch):
    """Con la tabla vacía, los porcentajes son 0 en lugar de fallar por división entre cero."""
    _mock_db(monkeypatch, fetchone_side_effect=[{"total": 0}, {"cat1": 0}])
    resultado = main.stats_clasificaciones()
    assert resultado["cat1_pct"] == 0
    assert resultado["cat2_pct"] == 0


# ── /validaciones/stats: precisión preliminar (HU014) ───────────────────────

def test_stats_validaciones_calcula_precision_preliminar(monkeypatch):
    """La precisión preliminar y la tasa de discrepancias se calculan solo sobre comparaciones válidas."""
    _mock_db(monkeypatch, fetchone_side_effect=[
        {"total": 20},
        {"validas": 20, "coincidencias": 16, "discrepancias": 4},
    ])
    resultado = main.stats_validaciones()
    assert resultado["pendientes"] == 0
    assert resultado["precision_preliminar_pct"] == 80.0
    assert resultado["tasa_discrepancias_pct"] == 20.0
    assert resultado["tiene_datos"] is True


def test_stats_validaciones_excluye_pendientes_del_calculo(monkeypatch):
    """Las clasificaciones sin validación todavía (pendientes) no distorsionan el porcentaje."""
    # 20 clasificaciones en total, pero solo 20 tienen comparación válida (el resto, 5, están pendientes)
    _mock_db(monkeypatch, fetchone_side_effect=[
        {"total": 25},
        {"validas": 20, "coincidencias": 16, "discrepancias": 4},
    ])
    resultado = main.stats_validaciones()
    assert resultado["pendientes"] == 5
    assert resultado["precision_preliminar_pct"] == 80.0  # no se diluye con los 5 pendientes


def test_stats_validaciones_sin_comparaciones_no_reporta_porcentaje(monkeypatch):
    """Sin ninguna comparación válida (n=0), se reporta ausencia de datos, nunca un 0%."""
    _mock_db(monkeypatch, fetchone_side_effect=[
        {"total": 0},
        {"validas": 0, "coincidencias": 0, "discrepancias": 0},
    ])
    resultado = main.stats_validaciones()
    assert resultado["tiene_datos"] is False
    assert resultado["precision_preliminar_pct"] is None
    assert resultado["tasa_discrepancias_pct"] is None
