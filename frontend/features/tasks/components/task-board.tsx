"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { ApiRequest } from "@/lib/http-client";
import { generateTaskBreakdown } from "@/features/ai/ai-api";
import { AiDialog } from "@/features/ai/components/ai-dialog";
import { statuses, type Status, type Task } from "../task";
import { useBoard } from "../hooks/use-board";
import { useBoardShortcuts } from "../hooks/use-board-shortcuts";
import { useTicketDrag } from "../hooks/use-ticket-drag";
import { TaskSidebar } from "./task-sidebar";
import { TaskBoardHeader } from "./task-board-header";
import { TaskSummary } from "./task-summary";
import { TaskToolbar, type TaskView } from "./task-toolbar";
import { TaskBoardSkeleton } from "./task-board-skeleton";
import { TaskColumn } from "./task-column";
import { CreateTaskDialog } from "./create-task-dialog";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { CommandPalette } from "./command-palette";
import { TicketDetail } from "./ticket-detail";
import { TaskResultHeading, TaskResultsEmpty } from "./task-results";

type Dialog =
  | "create"
  | "command"
  | { kind: "ai"; task?: Task }
  | { kind: "ticket"; id: number }
  | { kind: "delete"; task: Task };

export function TaskBoard({
  request,
  onSignOut,
}: {
  request: ApiRequest;
  onSignOut: () => void;
}) {
  const board = useBoard(request, onSignOut);
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search.trim().toLowerCase());
  const [view, setView] = useState<TaskView>("board");
  const [filter, setFilter] = useState<Status | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const ready = board.firstPage && !board.loading;

  useEffect(() => {
    if (!feedback || feedback.error) return;
    const timeout = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const openCreate = useCallback(() => setDialog("create"), []);
  const openAi = useCallback(() => setDialog({ kind: "ai" }), []);
  const openCommands = useCallback(() => setDialog("command"), []);
  const openTicket = useCallback(
    (task: Task) => setDialog({ kind: "ticket", id: task.id }),
    [],
  );
  useBoardShortcuts({
    blocked: dialog !== null,
    searchInput,
    canSearch: board.firstPage,
    canCreate: ready,
    onCreate: openCreate,
    onCommands: openCommands,
  });

  const { counts, groups } = useMemo(() => {
    const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    const groups: Record<Status, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const task of board.tasks) {
      counts[task.status]++;
      if (!query || `tb-${task.id} ${task.title.toLowerCase()}`.includes(query))
        groups[task.status].push(task);
    }
    return { counts, groups };
  }, [board.tasks, query]);

  const visibleStatuses: readonly Status[] = filter ? [filter] : statuses;
  const shown = visibleStatuses.reduce(
    (total, status) => total + groups[status].length,
    0,
  );
  const matching = query === search.trim().toLowerCase();
  const showNoResults =
    matching && !board.loading && Boolean(filter || query) && shown === 0;

  const moveTask = board.move;
  const move = useCallback(
    async (task: Task, status: Status) => {
      setFeedback(null);
      try {
        await moveTask(task, status);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setFeedback({
          text:
            error instanceof Error ? error.message : "Could not move the task.",
          error: true,
        });
      }
    },
    [moveTask],
  );
  const openDelete = useCallback(
    (task: Task) => setDialog({ kind: "delete", task }),
    [],
  );
  const drag = useTicketDrag(move);
  const closeDialog = () => setDialog(null);
  const activeDialog = typeof dialog === "object" ? dialog : null;
  const detail =
    activeDialog?.kind === "ticket"
      ? board.tasks.find((task) => task.id === activeDialog.id)
      : undefined;

  return (
    <div className="workspace">
      <a className="skip-link" href="#tasks">
        Skip to tasks
      </a>
      <TaskSidebar
        email={board.user?.email}
        disabled={!ready}
        onAi={openAi}
        onSignOut={board.signOut}
      />
      <main className="dashboard" id="tasks" tabIndex={-1}>
        <TaskBoardHeader
          disabled={!ready}
          onAi={openAi}
          onCreate={openCreate}
          onCommands={openCommands}
        />
        <TaskSummary
          counts={counts}
          total={board.tasks.length}
          loaded={board.firstPage}
          hasMore={board.hasMore}
          filter={filter}
          onFilter={setFilter}
        />
        <section className="task-area" aria-label="Tasks">
          <TaskResultHeading
            shown={shown}
            total={board.tasks.length}
            loaded={board.firstPage}
            hasMore={board.hasMore}
            status={filter}
            onClearStatus={() => setFilter(null)}
          />
          <TaskToolbar
            view={view}
            search={search}
            searchInput={searchInput}
            loaded={board.firstPage}
            loading={board.loading}
            hasMore={board.hasMore}
            canRefresh={ready && board.pending.size === 0}
            onView={setView}
            onSearch={setSearch}
            onRefresh={() => {
              setFeedback(null);
              void board.loadPage(true);
            }}
          />
          {feedback && (
            <div className="board-toast">
              <Notice
                tone={feedback.error ? "error" : "success"}
                action={
                  <IconButton
                    icon="close"
                    label="Dismiss message"
                    onClick={() => setFeedback(null)}
                  />
                }
              >
                {feedback.text}
              </Notice>
            </div>
          )}
          {board.loadError && (
            <Notice
              tone="error"
              action={
                !board.firstPage && (
                  <Button onClick={() => void board.loadPage(true)}>
                    Try again
                  </Button>
                )
              }
            >
              {board.loadError}
            </Notice>
          )}
          {!board.firstPage && board.loading && <TaskBoardSkeleton />}
          {board.firstPage && showNoResults && (
            <TaskResultsEmpty
              hasMore={board.hasMore}
              onReset={() => {
                setSearch("");
                setFilter(null);
                searchInput.current?.focus();
              }}
            />
          )}
          {board.firstPage && !showNoResults && (
            <div
              className={`columns${view === "list" ? " list-view" : ""}${filter ? " filtered-view" : ""}`}
              aria-busy={board.loading || !matching}
            >
              {visibleStatuses.map((status) => (
                <TaskColumn
                  key={status}
                  status={status}
                  tasks={groups[status]}
                  query={query}
                  pending={board.pending}
                  loading={board.loading}
                  onCreate={status === "TODO" ? openCreate : undefined}
                  onMove={move}
                  onDelete={openDelete}
                  onOpen={openTicket}
                  drag={view === "board" && !filter ? drag : undefined}
                />
              ))}
            </div>
          )}
          {board.firstPage && board.hasMore && (
            <div className="load-more">
              <p>{board.tasks.length} tasks loaded</p>
              <Button
                busy={board.loading}
                icon="chevron"
                onClick={() => void board.loadPage()}
              >
                {board.loading ? "Loading…" : "Load more tasks"}
              </Button>
            </div>
          )}
        </section>
      </main>
      {dialog === "create" && (
        <CreateTaskDialog
          close={closeDialog}
          add={async (title) => {
            await board.add(title);
            setSearch("");
            setFilter(null);
            setFeedback({ text: "Task added to To do." });
            closeDialog();
          }}
        />
      )}
      {dialog === "command" && (
        <CommandPalette
          tasks={board.tasks}
          ready={ready}
          close={closeDialog}
          onCreate={openCreate}
          onAi={openAi}
          onTicket={openTicket}
        />
      )}
      {detail && (
        <TicketDetail
          task={detail}
          busy={board.pending.has(detail.id) || board.loading}
          close={closeDialog}
          error={feedback?.error ? feedback.text : undefined}
          onMove={move}
          onAi={(task) => setDialog({ kind: "ai", task })}
          onDelete={openDelete}
        />
      )}
      {activeDialog?.kind === "ai" && (
        <AiDialog
          source={activeDialog.task}
          close={closeDialog}
          generate={(description, signal) =>
            generateTaskBreakdown(board.request, description, signal)
          }
          add={async (title) => {
            await board.add(title);
            setSearch("");
            setFilter(null);
          }}
          done={(count) => {
            setFeedback({
              text: `${count} ${count === 1 ? "task" : "tasks"} added to To do.`,
            });
            closeDialog();
          }}
        />
      )}
      {activeDialog?.kind === "delete" && (
        <DeleteTaskDialog
          close={closeDialog}
          task={activeDialog.task}
          remove={async () => {
            await board.remove(activeDialog.task);
            setFeedback({ text: "Task deleted." });
            closeDialog();
          }}
        />
      )}
    </div>
  );
}
