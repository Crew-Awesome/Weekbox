export async function allSettledWithConcurrency(items, concurrency, mapper) {
  const results = Array.from({ length: items.length });
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        try {
          results[index] = {
            status: "fulfilled",
            value: await mapper(items[index], index),
          };
        } catch (reason) {
          results[index] = { status: "rejected", reason };
        }
      }
    }),
  );
  return results;
}

export async function mapWithConcurrency(items, concurrency, mapper) {
  const results = await allSettledWithConcurrency(items, concurrency, mapper);
  const failure = results.find((result) => result.status === "rejected");
  if (failure) throw failure.reason;
  return results.map((result) => result.value);
}

export async function forEachWithConcurrencyUntilError(
  items,
  concurrency,
  mapper,
) {
  let nextIndex = 0;
  let failure = null;
  const workerCount = Math.min(
    Math.max(1, Math.floor(concurrency) || 1),
    items.length,
  );
  const worker = async () => {
    while (nextIndex < items.length && !failure) {
      const index = nextIndex++;
      try {
        await mapper(items[index], index);
      } catch (error) {
        failure ||= error;
      }
    }
  };
  await Promise.all(Array.from({ length: workerCount }, worker));
  if (failure) throw failure;
}

export function createBoundedTaskQueue(concurrency) {
  const limit = Math.max(1, Math.floor(concurrency) || 1);
  const queued = new Map();
  let active = 0;

  const pump = () => {
    while (active < limit && queued.size) {
      const [key, task] = queued.entries().next().value;
      queued.delete(key);
      active += 1;
      Promise.resolve()
        .then(task)
        .catch(() => {})
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  };

  return {
    enqueue(key, task) {
      queued.set(key, task);
      pump();
    },
    cancel(key) {
      queued.delete(key);
    },
    clear() {
      queued.clear();
    },
    get activeCount() {
      return active;
    },
    get queuedCount() {
      return queued.size;
    },
  };
}
