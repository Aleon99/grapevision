"""
Sprint 2 del Product Backlog Base (Tabla 20) del informe de tesis:
HU003, HU006, HU013.

Un test por historia de usuario (o por sub-comportamiento relevante de esa
historia), como evidencia de trazabilidad Sprint -> HU -> código.
"""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

import main
from helpers import jpeg_bytes, mock_db_sequence

client = TestClient(main.app)


def test_hu003_rechaza_un_archivo_con_formato_no_permitido():
    """HU003: solo se aceptan imágenes JPG o PNG; cualquier otro formato (ej. un PDF) se rechaza antes de clasificar."""
    resp = client.post("/predict", files={"file": ("documento.pdf", b"contenido", "application/pdf")})

    assert resp.status_code == 400
    assert "Formato no permitido" in resp.json()["detail"]


def test_hu003_rechaza_una_imagen_corrupta_aunque_declare_un_formato_valido():
    """HU003: si el archivo dice ser JPG/PNG pero no puede abrirse como imagen real, también se rechaza."""
    with pytest.raises(HTTPException) as exc_info:
        main.validar_imagen(b"esto no es una imagen real", "image/jpeg")

    assert exc_info.value.status_code == 400
    assert "corrupto" in exc_info.value.detail.lower()


def test_hu003_rechaza_una_imagen_que_supera_el_tamano_maximo_permitido():
    """HU003: una imagen que supera el límite de tamaño configurado se rechaza antes de intentar procesarla."""
    contenido_sobredimensionado = b"0" * (main.TAMANO_MAXIMO_MB * 1024 * 1024 + 1)

    with pytest.raises(HTTPException) as exc_info:
        main.validar_imagen(contenido_sobredimensionado, "image/jpeg")

    assert exc_info.value.status_code == 400
    assert "tamaño máximo" in exc_info.value.detail


def test_hu006_clasifica_el_racimo_en_categoria_1_o_categoria_2(monkeypatch):
    """HU006: toda imagen procesada queda clasificada visiblemente como Categoría 1 o Categoría 2, nunca de forma ambigua."""
    monkeypatch.setattr(main, "YOLO_AVAILABLE", False)
    monkeypatch.setattr(main, "GCS_AVAILABLE", False)

    resultado = main.clasificar_imagen(jpeg_bytes(color=(220, 40, 40)))

    assert resultado["categoria"] in {"CAT 1", "CAT 2"}
    assert resultado["categoria_label"] in {"Categoría 1", "Categoría 2"}


def test_hu013_el_supervisor_registra_si_la_clasificacion_del_operario_coincide_con_la_realidad(monkeypatch):
    """HU013: el supervisor contrasta una clasificación concreta del operario contra lo observado realmente en packing."""
    fake_cursor = mock_db_sequence(monkeypatch, main, fetchone_side_effect=[
        {"categoria": "Categoría 1", "confianza": 0.94, "lote_id": "L-2026-001"},  # lookup de la clasificación
        None,                                                                      # no hay validación previa
        {"id": 50},                                                                # INSERT ... RETURNING id
    ])

    resp = client.post("/validaciones/feedback", json={
        "clasificacion_id": 7, "es_correcta": False,
        "observacion": "El racimo real era Categoría 2",
    })

    assert resp.status_code == 201
    insert_sql = fake_cursor.execute.call_args_list[-1][0][0]
    assert "INSERT INTO validaciones" in insert_sql


def test_hu013_si_el_supervisor_ya_habia_validado_esa_clasificacion_se_actualiza_en_vez_de_duplicar(monkeypatch):
    """HU013: validar dos veces la misma clasificación actualiza el veredicto existente en lugar de crear un registro duplicado."""
    fake_cursor = mock_db_sequence(monkeypatch, main, fetchone_side_effect=[
        {"categoria": "Categoría 1", "confianza": 0.9, "lote_id": "L-2026-001"},  # lookup de la clasificación
        {"id": 12},                                                               # ya existía una validación
        {"id": 12},                                                               # UPDATE ... RETURNING id
    ])

    resp = client.post("/validaciones/feedback", json={
        "clasificacion_id": 7, "es_correcta": True,
        "observacion": "Confirmado en segunda revisión",
    })

    assert resp.status_code == 201
    update_sql = fake_cursor.execute.call_args_list[-1][0][0]
    assert "UPDATE validaciones" in update_sql


def test_hu013_no_se_puede_validar_una_clasificacion_que_no_existe(monkeypatch):
    """HU013: si el id de clasificación indicado no existe, el supervisor recibe un 404 en vez de crear una validación huérfana."""
    mock_db_sequence(monkeypatch, main, fetchone_side_effect=[None])

    resp = client.post("/validaciones/feedback", json={
        "clasificacion_id": 999, "es_correcta": True, "observacion": "",
    })

    assert resp.status_code == 404
