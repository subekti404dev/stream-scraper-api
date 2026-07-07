export async function runPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;
  const n = Math.max(1, Math.min(concurrency, items.length));

  async function runner() {
    while (true) {
      const my = idx++;
      if (my >= items.length) return;
      const r = await fn(items[my]);
      results.push(r);
    }
  }

  await Promise.all(Array.from({ length: n }, () => runner()));
  return results;
}
