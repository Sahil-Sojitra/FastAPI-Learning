"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  getTaskPage,
  pageSize,
  type Status,
  type Task,
  type User,
} from "./api-client";

export function useBoard(
  token: string,
  onSignOut: (expired?: boolean) => void,
) {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [firstPage, setFirstPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pending, setPending] = useState<ReadonlySet<number>>(new Set());
  const lifetime = useRef<AbortController | null>(null);
  const seen = useRef(new Set<number>());
  const paging = useRef(false);
  const deleting = useRef(false);
  const moving = useRef(new Set<number>());

  const signOut = useCallback(
    (expired = false) => {
      lifetime.current?.abort();
      onSignOut(expired);
    },
    [onSignOut],
  );

  const request = useCallback(
    async <T>(path: string, options: RequestInit = {}) => {
      const scope = lifetime.current;
      if (!scope || scope.signal.aborted)
        throw new DOMException("Session ended", "AbortError");
      const signal = options.signal
        ? AbortSignal.any([scope.signal, options.signal])
        : scope.signal;
      try {
        const result = await api<T>(path, { ...options, signal }, token);
        signal.throwIfAborted();
        return result;
      } catch (error) {
        if (
          !scope.signal.aborted &&
          error instanceof ApiError &&
          error.status === 401
        )
          signOut(true);
        throw error;
      }
    },
    [token, signOut],
  );

  const loadPage = useCallback(
    async (reset = false) => {
      const scope = lifetime.current;
      if (
        !scope ||
        paging.current ||
        deleting.current ||
        (reset && moving.current.size)
      )
        return;
      paging.current = true;
      setLoading(true);
      setLoadError("");
      try {
        const page = await getTaskPage(
          token,
          reset ? 0 : seen.current.size,
          scope.signal,
        );
        if (scope.signal.aborted) return;

        if (reset) {
          seen.current = new Set(page.map((task) => task.id));
          setTasks([...page].reverse());
        } else {
          const newTasks = page.filter((task) => !seen.current.has(task.id));
          page.forEach((task) => seen.current.add(task.id));
          setTasks((current) => {
            const ids = new Set(current.map((task) => task.id));
            return [
              ...current,
              ...newTasks.filter((task) => !ids.has(task.id)),
            ].sort((a, b) => b.id - a.id);
          });
        }
        setHasMore(page.length === pageSize);
        setFirstPage(true);
      } catch (error) {
        if (scope.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) signOut(true);
        else
          setLoadError(
            error instanceof Error ? error.message : "Could not load tasks.",
          );
      } finally {
        if (!scope.signal.aborted) {
          paging.current = false;
          setLoading(false);
        }
      }
    },
    [token, signOut],
  );

  useEffect(() => {
    const scope = new AbortController();
    lifetime.current = scope;
    paging.current = false;

    void request<User>("/auth/me")
      .then(setUser)
      .catch(() => {
        // A 401 ends the session. A temporary profile error leaves the board usable.
      });
    void loadPage(true);
    return () => scope.abort();
  }, [loadPage, request]);

  async function add(title: string) {
    const task = await request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify({ title: title.trim() }),
    });
    setTasks((current) =>
      current.some((item) => item.id === task.id)
        ? current
        : [task, ...current].sort((a, b) => b.id - a.id),
    );
  }

  const move = useCallback(
    async (task: Task, status: Status) => {
      if (moving.current.has(task.id) || task.status === status) return;
      moving.current.add(task.id);
      setPending(new Set(moving.current));
      const replace = (next: Task) =>
        setTasks((current) =>
          current.map((item) => (item.id === next.id ? next : item)),
        );
      replace({ ...task, status });
      try {
        const updated = await request<Task>(`/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        replace(updated);
      } catch (error) {
        if (!lifetime.current?.signal.aborted) replace(task);
        throw error;
      } finally {
        moving.current.delete(task.id);
        if (!lifetime.current?.signal.aborted)
          setPending(new Set(moving.current));
      }
    },
    [request],
  );

  async function remove(task: Task) {
    if (paging.current || deleting.current)
      throw new Error("Wait for tasks to finish loading, then try again.");
    deleting.current = true;
    try {
      await request<void>(`/tasks/${task.id}`, { method: "DELETE" });
      seen.current.delete(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
    } finally {
      deleting.current = false;
    }
  }

  return {
    user,
    tasks,
    firstPage,
    loading,
    hasMore,
    loadError,
    pending,
    loadPage,
    signOut,
    request,
    add,
    move,
    remove,
  };
}
