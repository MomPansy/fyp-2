export function sampleRows<T>(rows: T[], n = 200): T[] {
  if (rows.length <= n) return rows;
  const step = Math.ceil(rows.length / n);
  return rows.filter((_, index) => index % step === 0).slice(0, n);
}
