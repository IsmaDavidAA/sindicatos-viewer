import type { SindicatoReportManifestEntry } from './types';

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Internal landing page — links to every sindicato (not linked from sindicato pages). */
export function generateSiteIndex(options: {
  cityName: string;
  displayName: string;
  generatedAt: string;
  manifest: SindicatoReportManifestEntry[];
}): string {
  const { cityName, displayName, generatedAt, manifest } = options;
  const rows = manifest
    .map(
      (e) =>
        `<tr><td><a href="${escapeHtml(e.slug)}/">${escapeHtml(e.operator)}</a></td>` +
        `<td>${e.stats.totalVariants}</td><td>${e.stats.uniqueRefs}</td><td>${e.stats.errors}</td></tr>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Sindicatos — ${escapeHtml(displayName)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #1a1a2e; }
    h1 { font-size: 1.35rem; }
    .meta { color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem; }
    input { width: 100%; padding: 0.6rem; margin-bottom: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; font: inherit; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.5rem 0.65rem; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-size: 0.85rem; }
    a { color: #2563eb; }
    tr.hidden { display: none; }
  </style>
</head>
<body>
  <h1>Validación de rutas — ${escapeHtml(displayName)}</h1>
  <p class="meta">${manifest.length} sindicatos · ${cityName} · ${generatedAt.slice(0, 10)}</p>
  <input type="search" id="q" placeholder="Buscar sindicato…" aria-label="Buscar">
  <table>
    <thead><tr><th>Sindicato</th><th>Relaciones</th><th>Líneas</th><th>Errores</th></tr></thead>
    <tbody id="rows">${rows}</tbody>
  </table>
  <script>
    document.getElementById('q').addEventListener('input', function () {
      var q = this.value.toLowerCase();
      document.querySelectorAll('#rows tr').forEach(function (tr) {
        tr.classList.toggle('hidden', q && tr.textContent.toLowerCase().indexOf(q) < 0);
      });
    });
  </script>
</body>
</html>`;
}
