"""Renderiza la investigación editable a un HTML listo para imprimir."""

from pathlib import Path

from markdown_it import MarkdownIt


directory = Path(__file__).resolve().parent
public_directory = directory.parent / "docs" / "investigacion"
stem = "investigacion-propuesta-comercial-isabella-hero-a-wordpress-2026-10-16"
source = directory / f"{stem}.md"
target = public_directory / "index.html"

body = MarkdownIt("commonmark").enable("table").render(source.read_text(encoding="utf-8"))

document = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Isabella’s · investigación Hero A y central WordPress</title>
<style>
  :root { --ink: #291d1b; --wine: #552c2b; --bronze: #986b47; --cream: #fbf7ef; --line: #d7c5b4; }
  * { box-sizing: border-box; }
  html { background: #ded5cc; }
  body { max-width: 880px; margin: 28px auto; padding: 48px 57px 55px; color: var(--ink); background: var(--cream); font: 15px/1.52 Georgia, 'Times New Roman', serif; box-shadow: 0 16px 50px #281b1720; }
  h1, h2, h3 { color: var(--wine); line-height: 1.15; break-after: avoid; }
  h1 { font-size: 37px; letter-spacing: -.025em; margin: 0 0 11px; padding-bottom: 16px; border-bottom: 3px solid var(--bronze); }
  h2 { font-size: 22px; margin: 28px 0 10px; border-bottom: 1px solid var(--line); padding-bottom: 7px; }
  h3 { font-size: 17px; margin: 21px 0 8px; }
  p, li { margin: 0 0 9px; }
  p + p { margin-top: 6px; }
  strong { color: #3c2622; }
  a { color: #7b482d; text-underline-offset: 2px; overflow-wrap: anywhere; }
  blockquote { margin: 18px 0; padding: 12px 17px; border-left: 4px solid var(--bronze); background: #f3e9da; }
  blockquote p { margin: 0; }
  table { width: 100%; border-collapse: collapse; margin: 13px 0 20px; font-size: 13px; line-height: 1.38; table-layout: fixed; }
  th { background: var(--wine); color: #fffaf3; text-align: left; font: bold 12px/1.3 Arial, sans-serif; letter-spacing: .02em; }
  td, th { border: 1px solid var(--line); padding: 9px 10px; vertical-align: top; overflow-wrap: anywhere; }
  tr:nth-child(even) td { background: #f5eee4; }
  tr { break-inside: avoid; }
  ol, ul { margin: 10px 0 18px; padding-left: 25px; }
  li { padding-left: 2px; }
  li::marker { color: var(--bronze); font-weight: bold; }
  code { font-size: .9em; }
  .document-nav { display:flex; flex-wrap:wrap; align-items:center; gap:8px 18px; margin:-10px 0 28px; padding:0 0 17px; border-bottom:1px solid var(--line); font:12px/1.3 Arial,sans-serif; }
  .document-nav strong { margin-right:auto; color:var(--wine); letter-spacing:.12em; text-transform:uppercase; }
  .document-nav a { white-space:nowrap; }
  .footer { margin-top: 30px; padding-top: 11px; border-top: 1px solid var(--line); color: #775f52; font: 11px/1.4 Arial, sans-serif; }
  @page { size: A4; margin: 12mm 13mm 13mm; }
  @media print {
    html { background: white; }
    body { max-width: none; margin: 0; padding: 0; box-shadow: none; font-size: 9.2pt; line-height: 1.38; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    h1 { font-size: 25pt; }
    h2 { font-size: 15pt; margin-top: 14pt; }
    h3 { font-size: 12pt; }
    table { font-size: 8.2pt; }
    th { font-size: 8pt; }
    td, th { padding: 4pt 6pt; }
    p, li { margin-bottom: 4pt; }
    ol, ul { margin-top: 5pt; margin-bottom: 8pt; }
    a { color: var(--wine); }
    blockquote { margin: 10pt 0; padding: 8pt 10pt; }
    .document-nav { display:none; }
  }
</style>
</head>
<body>
<nav class="document-nav" aria-label="Documentos y vistas del proyecto">
  <strong>Isabella’s · investigación</strong>
  <a href="../">Ver Hero A</a>
  <a href="../admin/">Ver central demo</a>
  <a href="./informe.pdf">Descargar PDF</a>
  <a href="https://github.com/SebaSB115/isabellas-menu-preview-a/blob/main/notes/investigacion-propuesta-comercial-isabella-hero-a-wordpress-2026-10-16.md">Fuente editable</a>
</nav>
""" + body + """
<div class="footer">Documento de investigación para revisión comercial · Isabella’s · 16/10/2026</div>
</body>
</html>
"""

public_directory.mkdir(parents=True, exist_ok=True)
target.write_text(document, encoding="utf-8")
print(f"Creado: {target} ({len(document)} caracteres)")
