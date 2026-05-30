import * as fs from 'fs';
import * as path from 'path';
import type { BuildReportsInput } from './build_report_data';
import { buildSindicatoReports } from './build_report_data';
import { generateSindicatoHtml } from './html_generator';
import { generateSindicatoMarkdown } from './markdown_generator';
import type { SindicatoReportManifestEntry } from './types';

export interface WriteSindicatoReportsOptions extends BuildReportsInput {
  reportsDir: string;
  /** Internal manifest for Trufi team — not linked from sindicato pages */
  writeInternalManifest?: boolean;
}

export interface WriteSindicatoReportsResult {
  reports: ReturnType<typeof buildSindicatoReports>;
  manifest: SindicatoReportManifestEntry[];
}

/**
 * Writes one isolated folder per sindicato:
 *   reports/{slug}/index.html  — interactive validation (GitHub Pages URL)
 *   reports/{slug}/report.md   — markdown inventory with OSM links
 *   reports/{slug}/data.json   — structured data (optional reload / tooling)
 *
 * Sindicato pages contain NO links to other sindicatos.
 */
export function writeSindicatoReports(options: WriteSindicatoReportsOptions): WriteSindicatoReportsResult {
  const { reportsDir, writeInternalManifest = true, ...input } = options;
  const reports = buildSindicatoReports(input);

  if (fs.existsSync(reportsDir)) {
    fs.rmSync(reportsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(reportsDir, { recursive: true });

  const manifest: SindicatoReportManifestEntry[] = [];

  for (const report of reports) {
    const dir = path.join(reportsDir, report.slug);
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(path.join(dir, 'index.html'), generateSindicatoHtml(report), 'utf8');
    fs.writeFileSync(path.join(dir, 'report.md'), generateSindicatoMarkdown(report), 'utf8');
    fs.writeFileSync(
      path.join(dir, 'data.json'),
      JSON.stringify(
        {
          slug: report.slug,
          operator: report.operator,
          cityName: report.cityName,
          generatedAt: report.generatedAt,
          stats: report.stats,
          refGroups: report.refGroups,
        },
        null,
        2,
      ),
      'utf8',
    );

    manifest.push({
      slug: report.slug,
      operator: report.operator,
      urlPath: `${report.slug}/`,
      stats: report.stats,
    });
  }

  if (writeInternalManifest) {
    fs.mkdirSync(path.join(reportsDir, '_internal'), { recursive: true });
    fs.writeFileSync(
      path.join(reportsDir, '_internal', 'manifest.json'),
      JSON.stringify(
        {
          cityName: input.cityName,
          generatedAt: new Date().toISOString(),
          sindicatos: manifest,
        },
        null,
        2,
      ),
      'utf8',
    );
  }

  console.log(`Sindicato reports: ${reports.length} sindicatos → ${reportsDir}`);
  return { reports, manifest };
}

export { buildSindicatoReports } from './build_report_data';
export { generateSindicatoHtml } from './html_generator';
export { generateSindicatoMarkdown } from './markdown_generator';
export { operatorToSlug } from './slug';
