export function cleanText(value: string): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function canonicalize(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_+#.]+/g, '');
}

export function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = cleanText(value);
    const key = canonicalize(cleaned);
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
