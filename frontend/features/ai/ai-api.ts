import type { ApiRequest } from "@/lib/http-client";

export async function generateTaskBreakdown(
  request: ApiRequest,
  description: string,
  signal: AbortSignal,
) {
  const result = await request<{ suggestions: string[] }>(
    "/ai/task-breakdown",
    {
      method: "POST",
      body: JSON.stringify({ description }),
      signal,
      timeoutMs: 38_000,
    },
  );
  return result.suggestions;
}
