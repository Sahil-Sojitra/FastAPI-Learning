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

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error(
      "Could not reach the task board API. Check that FastAPI is running.",
    );
  }

  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok || body === null) {
    const detail = body?.detail;
    const validation = Array.isArray(detail)
      ? detail
          .map((issue: { msg?: string }) => issue.msg)
          .filter(Boolean)
          .join(" ")
      : "";
    const fallback =
      body === null
        ? "The API did not respond as expected. Check that FastAPI is running."
        : "The request failed. Please try again.";
    throw new ApiError(
      response.status,
      typeof detail === "string" ? detail : validation || fallback,
    );
  }
  return body as T;
}

export async function loadTasks(token: string, signal: AbortSignal) {
  const tasks: Task[] = [];
  const pageSize = 100;
  while (true) {
    const page = await api<Task[]>(
      `/tasks?limit=${pageSize}&offset=${tasks.length}`,
      { signal },
      token,
    );
    tasks.push(...page);
    if (page.length < pageSize) return tasks.reverse();
  }
}
