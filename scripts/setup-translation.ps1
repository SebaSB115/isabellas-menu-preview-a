$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $repoRoot '.venv-translation\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) { python -m venv (Join-Path $repoRoot '.venv-translation') }
& $python -m pip install --quiet --disable-pip-version-check argostranslate==1.11.0
if ($LASTEXITCODE -ne 0) { throw 'No se pudo instalar Argos Translate.' }
& $python (Join-Path $PSScriptRoot 'install_argos_models.py')
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar los modelos de traducción.' }
