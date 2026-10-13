import io
from unittest.mock import MagicMock

import numpy as np
from PIL import Image


def jpeg_bytes(size=(50, 50), color=(200, 50, 50)):
    """Genera bytes de una imagen JPEG válida en memoria, sin tocar disco."""
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="JPEG")
    return buf.getvalue()


# ── Dobles de prueba para simular una predicción de YOLOv8 sin cargar el modelo real ──

class FakeTensor:
    def __init__(self, arr):
        self._arr = np.array(arr)

    def cpu(self):
        return self

    def numpy(self):
        return self._arr

    def argmax(self):
        return self._arr.argmax()

    def __getitem__(self, i):
        return self._arr[i]

    def __len__(self):
        return len(self._arr)


class FakeBoxes:
    def __init__(self, conf, cls, xyxy):
        self.conf = FakeTensor(conf)
        self.cls = FakeTensor(cls)
        self.xyxy = FakeTensor(xyxy)

    def __len__(self):
        return len(self.conf)


class FakeYoloResult:
    def __init__(self, boxes):
        self.boxes = boxes


class FakeYoloModel:
    def __init__(self, boxes):
        self._boxes = boxes

    def predict(self, *args, **kwargs):
        return [FakeYoloResult(self._boxes)]


def mock_db_sequence(monkeypatch, main, fetchone_side_effect=None, fetchall_return=None):
    """Reemplaza main.get_db() por una conexión falsa que devuelve los valores indicados, y permite inspeccionar las sentencias SQL ejecutadas."""
    fake_cursor = MagicMock()
    if fetchone_side_effect is not None:
        fake_cursor.fetchone.side_effect = fetchone_side_effect
    fake_cursor.fetchall.return_value = fetchall_return or []
    fake_conn = MagicMock()
    fake_conn.cursor.return_value = fake_cursor
    monkeypatch.setattr(main, "get_db", lambda: fake_conn)
    return fake_cursor


# ── Dobles de prueba para simular Cloud Storage sin credenciales reales ──

class FakeGcsBlob:
    def __init__(self):
        self.uploaded_bytes = None
        self.content_type = None

    def upload_from_string(self, data, content_type):
        self.uploaded_bytes = data
        self.content_type = content_type


class FakeGcsBucket:
    def __init__(self):
        self.blobs = {}

    def blob(self, name):
        blob = FakeGcsBlob()
        self.blobs[name] = blob
        return blob


class FakeGcsClient:
    def __init__(self):
        self.bucket_obj = FakeGcsBucket()

    def bucket(self, name):
        return self.bucket_obj
