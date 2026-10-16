"""Install the four translation legs used by Isabella's local menu."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGES = Path(os.environ.get("ARGOS_PACKAGES_DIR", ROOT / ".local-translation" / "models"))
PACKAGES.mkdir(parents=True, exist_ok=True)
os.environ["ARGOS_PACKAGES_DIR"] = str(PACKAGES)
os.environ.setdefault("ARGOS_COMPUTE_TYPE", "int8")

import argostranslate.package  # noqa: E402

required = [("es", "en"), ("en", "de"), ("en", "ar"), ("en", "he")]
installed = {(item.from_code, item.to_code) for item in argostranslate.package.get_installed_packages()}
missing = [pair for pair in required if pair not in installed]
if missing:
    print("Consultando paquetes oficiales de Argos Translate...", flush=True)
    argostranslate.package.update_package_index()
    available = argostranslate.package.get_available_packages()
    for source, target in missing:
        package = next((item for item in available if item.from_code == source and item.to_code == target), None)
        if package is None:
            raise SystemExit(f"No se encontro el modelo {source}->{target}.")
        print(f"Descargando e instalando {source}->{target}...", flush=True)
        argostranslate.package.install_from_path(package.download())
print("Modelos es/en/de/ar/he listos.", flush=True)
