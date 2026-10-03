import pytest
from fastapi import HTTPException

import main
from helpers import jpeg_bytes


def test_rechaza_formato_no_permitido():
    """Rechaza un archivo cuyo content-type no es JPG ni PNG (ej. PDF)."""
    with pytest.raises(HTTPException) as exc:
        main.validar_imagen(b"contenido", "application/pdf")
    assert exc.value.status_code == 400


def test_rechaza_content_type_vacio():
    """Rechaza el archivo si el navegador no envía un content-type reconocible."""
    with pytest.raises(HTTPException) as exc:
        main.validar_imagen(b"contenido", "")
    assert exc.value.status_code == 400


def test_rechaza_imagen_que_supera_tamano_maximo():
    """Rechaza una imagen que supera el límite de 10 MB configurado."""
    contenido = b"0" * (main.TAMANO_MAXIMO_MB * 1024 * 1024 + 1)
    with pytest.raises(HTTPException) as exc:
        main.validar_imagen(contenido, "image/jpeg")
    assert exc.value.status_code == 400


def test_rechaza_archivo_corrupto():
    """Rechaza un archivo con content-type válido pero que no es una imagen real."""
    with pytest.raises(HTTPException) as exc:
        main.validar_imagen(b"esto no es una imagen", "image/jpeg")
    assert exc.value.status_code == 400


def test_acepta_imagen_jpeg_valida():
    """Acepta sin errores una imagen JPEG íntegra y dentro del límite de tamaño."""
    main.validar_imagen(jpeg_bytes(), "image/jpeg")


def test_acepta_imagen_png_valida():
    """Acepta sin errores una imagen PNG íntegra y dentro del límite de tamaño."""
    import io
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (50, 50), (10, 10, 10)).save(buf, format="PNG")
    main.validar_imagen(buf.getvalue(), "image/png")
