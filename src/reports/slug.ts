/** Slug for URL paths — stable, lowercase, ASCII-only. */
export function operatorToSlug(operator: string): string {
  return operator
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'sin-operador';
}

export function uniqueSlugs(operators: string[]): Map<string, string> {
  const used = new Map<string, number>();
  const result = new Map<string, string>();

  for (const operator of operators) {
    let base = operatorToSlug(operator);
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    const slug = count === 0 ? base : `${base}-${count + 1}`;
    result.set(operator, slug);
  }

  return result;
}
