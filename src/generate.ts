import * as fs from 'fs';
import * as path from 'path';
import { loadGtfsBuilderOut } from './load_gtfs_out';
import { writeSindicatoReports } from './reports';

export interface CityConfig {
  cityName: string;
  displayName?: string;
  gtfsOutDir: string;
  siteSubdir: string;
  githubPagesBasePath?: string;
}

function loadCityConfig(cityId: string): CityConfig {
  const configPath = path.join(__dirname, '../config', `${cityId}.json`);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}\nAvailable: list files in config/`);
  }
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as CityConfig;
  if (process.env.GTFS_OUT_DIR) {
    raw.gtfsOutDir = path.resolve(process.env.GTFS_OUT_DIR);
  } else {
    raw.gtfsOutDir = path.resolve(path.join(path.dirname(configPath), raw.gtfsOutDir));
  }
  return raw;
}

export function generateForCity(cityId: string): void {
  const config = loadCityConfig(cityId);
  const siteDir = path.join(__dirname, '../site', config.siteSubdir);

  console.log(`\n📍 ${config.displayName || config.cityName}`);
  console.log(`   Input:  ${config.gtfsOutDir}`);
  console.log(`   Output: ${siteDir}\n`);

  const input = loadGtfsBuilderOut({
    gtfsOutDir: config.gtfsOutDir,
    cityName: config.cityName,
  });

  const result = writeSindicatoReports({
    ...input,
    reportsDir: siteDir,
    displayName: config.displayName,
  });

  const repo = process.env.GITHUB_REPOSITORY || 'USER/REPO';
  const base = config.githubPagesBasePath ?? `/${repo.split('/')[1]}`;
  console.log(`\n✅ ${result.reports.length} reportes generados`);
  console.log(`\nURLs GitHub Pages (ejemplo):`);
  for (const entry of result.manifest.slice(0, 3)) {
    console.log(`  https://TU-USUARIO.github.io/TU-REPO${base}/${entry.slug}/`);
  }
  if (result.manifest.length > 3) {
    console.log(`  … +${result.manifest.length - 3} sindicatos (ver site/${config.siteSubdir}/_internal/manifest.json)`);
  }
}

function main() {
  const cityId = process.argv[2] || 'cochabamba';
  generateForCity(cityId);
}

if (require.main === module) {
  main();
}
