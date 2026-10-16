"""Translate Spanish menu strings from one JSON request on stdin."""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("ARGOS_PACKAGES_DIR", str(ROOT / ".local-translation" / "models"))
os.environ.setdefault("ARGOS_COMPUTE_TYPE", "int8")
os.environ.setdefault("ARGOS_INTRA_THREADS", "2")

import argostranslate.translate  # noqa: E402


def main():
    values = json.load(sys.stdin)
    if not isinstance(values, list) or len(values) > 500 or any(not isinstance(value, str) for value in values):
        raise ValueError("Solicitud de traducción inválida")
    languages = {lang.code: lang for lang in argostranslate.translate.get_installed_languages()}
    translators = {}
    for source, target in [("es", "en"), ("en", "de"), ("en", "ar"), ("en", "he")]:
        if source not in languages or target not in languages:
            raise RuntimeError(f"Falta el modelo {source}->{target}; ejecuta npm.cmd run translate:setup")
        translators[target] = languages[source].get_translation(languages[target])
    result = []
    for value in values:
        english = translators["en"].translate(value).strip() if value.strip() else ""
        result.append({
            "en": english,
            "de": translators["de"].translate(english).strip() if english else "",
            "ar": translators["ar"].translate(english).strip() if english else "",
            "he": translators["he"].translate(english).strip() if english else "",
        })
    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Traducción local fallida: {exc}", file=sys.stderr)
        sys.exit(1)
