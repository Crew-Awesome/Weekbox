export function shouldRetryNewsSource(error, attempt, maxAttempts) {
  const isNotFoundRetry = error?.status === 404 && attempt === 0;
  const isNonRetryableClientError =
    error?.status >= 400 &&
    error.status < 500 &&
    error.status !== 429 &&
    !isNotFoundRetry;
  return (
    error?.name !== "AbortError" &&
    !isNonRetryableClientError &&
    attempt < maxAttempts - 1
  );
}

export function getNewsAbortReason(signal) {
  return signal.reason || new DOMException("Request aborted", "AbortError");
}

export function waitForNewsRetry(signal, delay) {
  if (signal?.aborted) return Promise.reject(getNewsAbortReason(signal));
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      reject(getNewsAbortReason(signal));
    };
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delay);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
