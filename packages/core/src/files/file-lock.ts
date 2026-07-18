const queues = new Map<string, Promise<void>>();

// Serializes read-modify-write cycles keyed by file path — concurrent
// requests (e.g. a notes autosave racing an inspector save) would other-
// wise both read the same original and the second write would clobber
// the first.
export async function withFileLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const run = prev.then(fn);
  const tail = run.then(
    () => undefined,
    () => undefined,
  );
  queues.set(key, tail);
  void tail.then(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });
  return run;
}
