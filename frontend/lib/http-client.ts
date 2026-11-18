export type ApiOptions = RequestInit & { timeoutMs?: number };
export type ApiRequest = <T>(path: string, options?: ApiOptions) => Promise<T>;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  { timeoutMs = 15_000, ...options }: ApiOptions = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const deadline = AbortSignal.timeout(timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, deadline])
    : deadline;

  try {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers,
      signal,
      cache: "no-store",
    });
    if (response.status === 204) return undefined as T;
    const body = await response.json().catch((error) => {
      signal.throwIfAborted();
      if (error instanceof SyntaxError) return null;
      throw error;
    });
    if (!response.ok || body === null) {
      const detail = body?.detail;
      const validation = Array.isArray(detail)
        ? detail
            .map((issue: { msg?: string }) => issue.msg)
            .filter(Boolean)
            .join(" ")
        : "";
      const fallback =
        response.status >= 500 || body === null
          ? "The service is temporarily unavailable. Please try again."
          : "The request failed. Please try again.";
      throw new ApiError(
        response.status,
        typeof detail === "string" ? detail : validation || fallback,
      );
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError || options.signal?.aborted) throw error;
    if (deadline.aborted)
      throw new Error("This is taking longer than expected. Please try again.");
    throw new Error("Could not connect. Check your connection and try again.");
  }
}
