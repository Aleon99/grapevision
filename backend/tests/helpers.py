import io

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
