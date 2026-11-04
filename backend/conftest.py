import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import pytest


@pytest.fixture(autouse=True)
def _default_auth_override():
    """Los endpoints protegidos (HU012/HU013/HU015/HU016) requieren un usuario autenticado.
    Por defecto simulamos un supervisor válido para no tener que loguearse en cada test
    existente; los tests que SÍ quieren probar el rechazo por rol lo sobreescriben ellos mismos."""
    import main
    main.app.dependency_overrides[main.get_current_user] = lambda: {"username": "supervisor_test", "rol": "supervisor"}
    yield
    main.app.dependency_overrides.pop(main.get_current_user, None)
