import main
from helpers import FakeBoxes, FakeYoloModel, jpeg_bytes


# ── _build_result / _build_result_indeterminado ────────────────────────────

def test_build_result_cat1_aprobado_para_exportacion():
    """Una clasificación CAT1 queda marcada como apta para exportación."""
    r = main._build_result("Timpson", "cat1", 0.95)
    assert r["categoria"] == "CAT 1"
    assert r["categoria_key"] == "cat1"
    assert r["confianza"] == 0.95
    assert r["aprobado_exportacion"] is True


def test_build_result_cat2_no_aprobado():
    """Una clasificación CAT2 queda marcada como NO apta para exportación."""
    r = main._build_result("Timpson", "cat2", 0.8)
    assert r["categoria"] == "CAT 2"
    assert r["aprobado_exportacion"] is False


def test_build_result_indeterminado_sin_confianza():
    """Sin confianza alguna, el resultado queda marcado como indeterminado."""
    r = main._build_result_indeterminado()
    assert r["indeterminado"] is True
    assert r["categoria_key"] == "indeterminado"
    assert r["confianza"] is None
    assert r["confianza_pct"] == "—"
    assert r["aprobado_exportacion"] is False


def test_build_result_indeterminado_con_confianza_baja():
    """El porcentaje de confianza mostrado al usuario se formatea correctamente."""
    r = main._build_result_indeterminado(0.32)
    assert r["confianza"] == 0.32
    assert r["confianza_pct"] == "32.0 %"


# ── clasificar_imagen: fallback mock (sin YOLO disponible) ─────────────────

def test_clasificar_mock_cat1_por_diferencia_de_color(monkeypatch):
    """Sin YOLO disponible, una imagen con tono rojizo dominante cae en CAT1."""
    monkeypatch.setattr(main, "YOLO_AVAILABLE", False)
    resultado = main.clasificar_imagen(jpeg_bytes(color=(220, 40, 40)))  # |r-g| > 20
    assert resultado["categoria_key"] == "cat1"
    assert resultado["confianza"] >= main.CONFIANZA_MINIMA


def test_clasificar_mock_cat2_cuando_color_es_uniforme(monkeypatch):
    """Sin YOLO disponible, una imagen de color uniforme (gris) cae en CAT2."""
    monkeypatch.setattr(main, "YOLO_AVAILABLE", False)
    resultado = main.clasificar_imagen(jpeg_bytes(color=(150, 150, 150)))  # |r-g| ~ 0
    assert resultado["categoria_key"] == "cat2"


# ── clasificar_imagen: camino real de YOLO (modelo simulado) ───────────────
#
# FakeBoxes/FakeYoloModel (definidos en tests/helpers.py) imitan la forma mínima
# del objeto Results de ultralytics, para no tener que cargar best.pt en los tests.


def test_clasificar_yolo_baja_confianza_es_indeterminado(monkeypatch):
    """Si YOLO detecta algo pero con menos de 50% de confianza, el resultado es indeterminado."""
    monkeypatch.setattr(main, "YOLO_AVAILABLE", True)
    monkeypatch.setattr(main, "yolo_model", FakeYoloModel(FakeBoxes(conf=[0.3], cls=[0], xyxy=[[0, 0, 10, 10]])))
    resultado = main.clasificar_imagen(jpeg_bytes())
    assert resultado["indeterminado"] is True


def test_clasificar_yolo_clase_0_es_cat1(monkeypatch):
    """YOLO detectando la clase 0 con alta confianza se traduce en CAT1 aprobado."""
    monkeypatch.setattr(main, "YOLO_AVAILABLE", True)
    monkeypatch.setattr(main, "yolo_model", FakeYoloModel(FakeBoxes(conf=[0.9], cls=[0], xyxy=[[0, 0, 10, 10]])))
    resultado = main.clasificar_imagen(jpeg_bytes())
    assert resultado["categoria_key"] == "cat1"
    assert resultado["aprobado_exportacion"] is True


def test_clasificar_yolo_clase_1_es_cat2(monkeypatch):
    """YOLO detectando la clase 1 con alta confianza se traduce en CAT2 no aprobado."""
    monkeypatch.setattr(main, "YOLO_AVAILABLE", True)
    monkeypatch.setattr(main, "yolo_model", FakeYoloModel(FakeBoxes(conf=[0.9], cls=[1], xyxy=[[0, 0, 10, 10]])))
    resultado = main.clasificar_imagen(jpeg_bytes())
    assert resultado["categoria_key"] == "cat2"
    assert resultado["aprobado_exportacion"] is False


def test_clasificar_yolo_sin_detecciones_es_indeterminado(monkeypatch):
    """Si YOLO no detecta ninguna uva en la imagen, el resultado es indeterminado."""
    monkeypatch.setattr(main, "YOLO_AVAILABLE", True)
    monkeypatch.setattr(main, "yolo_model", FakeYoloModel(FakeBoxes(conf=[], cls=[], xyxy=[])))
    resultado = main.clasificar_imagen(jpeg_bytes())
    assert resultado["indeterminado"] is True
