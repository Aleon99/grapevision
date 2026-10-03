from fastapi.testclient import TestClient

import main
from helpers import jpeg_bytes

client = TestClient(main.app)


def test_health_responde_ok():
    """El endpoint de salud confirma que la API y el modelo están operativos."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_predict_rechaza_formato_no_permitido():
    """POST /predict devuelve 400 si el archivo subido no es JPG ni PNG."""
    resp = client.post(
        "/predict",
        files={"file": ("documento.pdf", b"contenido", "application/pdf")},
    )
    assert resp.status_code == 400


def test_predict_acepta_imagen_valida(monkeypatch):
    """POST /predict clasifica una imagen válida y devuelve una categoría definida."""
    monkeypatch.setattr(main, "YOLO_AVAILABLE", False)  # usa el fallback determinístico
    resp = client.post(
        "/predict",
        files={"file": ("uva.jpg", jpeg_bytes(), "image/jpeg")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["resultado"]["categoria_key"] in {"cat1", "cat2"}


def test_clasificaciones_stats_expone_los_campos_esperados(monkeypatch):
    """GET /clasificaciones/stats responde con el contrato que consume el dashboard (HU009)."""
    from unittest.mock import MagicMock

    fake_cursor = MagicMock()
    fake_cursor.fetchone.side_effect = [{"total": 4}, {"cat1": 3}]
    fake_conn = MagicMock()
    fake_conn.cursor.return_value = fake_cursor
    monkeypatch.setattr(main, "get_db", lambda: fake_conn)

    resp = client.get("/clasificaciones/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 4 and body["cat1"] == 3 and body["cat2"] == 1
    assert body["cat1_pct"] == 75.0 and body["cat2_pct"] == 25.0
    assert "defectos" in body
