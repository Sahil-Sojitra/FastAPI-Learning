import type { ApiRequest } from "@/lib/http-client";
import type { Task, Status } from "./task";

export const pageSize = 40;

export function getTaskPage(request: ApiRequest, offset: number) {
  return request<Task[]>(`/tasks?limit=${pageSize}&offset=${offset}`);
}

export function createTask(request: ApiRequest, title: string) {
  return request<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify({ title: title.trim() }),
  });
}

export function updateTaskStatus(
  request: ApiRequest,
  id: number,
  status: Status,
) {
  return request<Task>("/tasks/" + id, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteTask(request: ApiRequest, id: number) {
  return request<void>("/tasks/" + id, { method: "DELETE" });
}
