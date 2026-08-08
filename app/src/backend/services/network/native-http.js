function toHeaders(headers) {
  if (!headers) return undefined;
  if (typeof headers.entries === "function") {
    return Object.fromEntries(headers.entries());
  }
  return headers;
}

function toResponse(result) {
  const status = Number(result?.statusCode ?? result?.status);
  const text = String(result?.text ?? result?.body ?? "");
  const responseStatus = status >= 100 && status <= 599 ? status : 200;
  return {
    ok: responseStatus >= 200 && responseStatus < 300,
    status: responseStatus,
    statusText: result?.reason || result?.statusText || "",
    headers: new Headers(result?.headers || {}),
    text: async () => text,
    json: async () => JSON.parse(text),
  };
}

function asHttpResponse(error) {
  const status = Number(error?.statusCode ?? error?.status);
  if (status < 100 || status > 599) throw error;
  return toResponse(error);
}

function abortError() {
  const error = new Error("The request was aborted.");
  error.name = "AbortError";
  return error;
}

function requestWithNeutralino(url, method, options) {
  const net = Neutralino.net;
  if (typeof net.request === "function") {
    return net.request(url, method, options);
  }

  const request = net[method.toLowerCase()] ||
    (method === "DELETE" && (net.delete || net.del));
  return typeof request === "function" ? request.call(net, url, options) : null;
}

export function nativeFetch(input, options = {}) {
  if (typeof Neutralino === "undefined" || !Neutralino.net) {
    return fetch(input, options);
  }

  const signal = options.signal;
  if (signal?.aborted) return Promise.reject(abortError());

  const requestOptions = {};
  const headers = toHeaders(options.headers);
  if (headers) requestOptions.headers = headers;
  if (options.body !== undefined) requestOptions.body = options.body;
  if (options.timeout !== undefined) requestOptions.timeout = options.timeout;

  const method = (options.method || "GET").toUpperCase();
  const nativeRequest = requestWithNeutralino(String(input), method, requestOptions);
  if (!nativeRequest) return fetch(input, options);

  const request = Promise.resolve(nativeRequest)
    .then(toResponse)
    .catch(asHttpResponse);

  if (!signal) return request;

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    request.then(resolve, reject).finally(() =>
      signal.removeEventListener("abort", onAbort),
    );
  });
}
