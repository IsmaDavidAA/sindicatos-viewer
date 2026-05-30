import type { SindicatoReport } from './types';
import { escapeMdCell } from './build_report_data';

function directionBadge(label: string): string {
  if (label === 'ida') return '→ Ida';
  if (label === 'vuelta') return '← Vuelta';
  return '↔ Único';
}

export function generateSindicatoMarkdown(report: SindicatoReport): string {
  const { operator, cityName, generatedAt, stats, refGroups } = report;
  const date = generatedAt.slice(0, 10);

  let md = `# Reporte de rutas — ${operator}\n\n`;
  md += `**Ciudad:** ${cityName}  \n`;
  md += `**Generado:** ${date}  \n`;
  md += `**Relaciones OSM:** ${stats.totalVariants} · **Líneas (ref):** ${stats.uniqueRefs} · **Errores:** ${stats.errors}\n\n`;
  md += `> Use la versión HTML interactiva para validar rutas en mapa y registrar observaciones.\n\n`;

  md += `## Resumen por línea (ref)\n\n`;
  md += `| Ref | Variantes | GTFS route_id | Color |\n`;
  md += `| --- | --------- | ------------- | ----- |\n`;
  for (const group of refGroups) {
    md += `| ${escapeMdCell(group.ref)} | ${group.variants.length} | ${group.gtfsRouteId} | #${group.routeColor} |\n`;
  }

  md += `\n## Detalle de rutas\n\n`;

  for (const group of refGroups) {
    md += `### Línea ${group.ref}\n\n`;
    if (group.routeLongName) md += `*${group.routeLongName}*\n\n`;

    md += `| OSM ID | Dir. | Nombre | Origen | Destino | Variante | Paradas | Estado | OSM |\n`;
    md += `| ------ | ---- | ------ | ------ | ------- | -------- | ------- | ------ | --- |\n`;

    for (const v of group.variants) {
      const status = v.status === 'ok' ? '✅' : `❌ ${escapeMdCell(v.errorMessage)}`;
      md += `| ${v.osmId} | ${directionBadge(v.directionLabel)} | ${escapeMdCell(v.name)} | ${escapeMdCell(v.from)} | ${escapeMdCell(v.to)} | ${escapeMdCell(v.description || v.tripHeadsign)} | ${v.stopCount} | ${status} | [Ver](${v.osmUrl}) |\n`;
    }

    md += `\n`;
  }

  md += `## Validación\n\n`;
  md += `Para cada relación OSM, confirme:\n\n`;
  md += `- [ ] La ruta existe y pertenece a este sindicato\n`;
  md += `- [ ] El recorrido (geometría) es correcto\n`;
  md += `- [ ] Origen y destino son correctos\n`;
  md += `- [ ] Las variantes listadas corresponden a la operación real\n\n`;
  md += `---\n*Generado por [Trufi Association](https://www.trufi-association.org/) · sindicatos-routes*\n`;

  return md;
}
