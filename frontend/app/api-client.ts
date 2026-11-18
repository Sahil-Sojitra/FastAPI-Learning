export const statuses = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type Status = (typeof statuses)[number];
export const labels: Record<Status, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};
export type Task = {
  id: number;
  title: string;
  status: Status;
  created_at: string | null;
};
export type User = { id: number; email: string };
export const titleLength = (text: string) => Array.from(text.trim()).length;
export const validTitle = (text: string) =>
  titleLength(text) >= 3 && titleLength(text) <= 100;
export const pageSize = 40;

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
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const deadline = AbortSignal.timeout(
    path.startsWith("/ai/") ? 38_000 : 15_000,
  );
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

export function getTaskPage(
  token: string,
  offset: number,
  signal: AbortSignal,
) {
  return api<Task[]>(
    `/tasks?limit=${pageSize}&offset=${offset}`,
    { signal },
    token,
  );
}
